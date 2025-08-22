import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
// OAuth2 Configuration
const OAUTH_CLIENT_ID = "681255809395-oo8ft2oprdrnp9e3aqf6av3hmdib135j.apps.googleusercontent.com";
const OAUTH_CLIENT_SECRET = "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";
const OAUTH_REDIRECT_URI = "http://localhost:45289";
// Code Assist API Configuration
const CODE_ASSIST_ENDPOINT = "https://cloudcode-pa.googleapis.com";
const CODE_ASSIST_API_VERSION = "v1internal";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Initialize Supabase client with service role key
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
// Load OAuth credentials from database
async function loadOAuthCredentials() {
  try {
    console.log("Loading OAuth credentials from database...");
    const { data, error } = await supabase.from('oauth_credentials').select('*').eq('service', 'gemini').single();
    if (error || !data) {
      console.error("Failed to load OAuth credentials:", error);
      throw new Error("OAuth credentials not found in database");
    }
    console.log("Loaded OAuth credentials successfully from database");
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expiry_date: data.expiry_date
    };
  } catch (error) {
    console.error("Failed to load OAuth credentials:", error);
    throw new Error("OAuth credentials not found");
  }
}
// Refresh OAuth token if expired
async function refreshAccessToken(credentials) {
  console.log("Refreshing access token...");
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const body = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    client_secret: OAUTH_CLIENT_SECRET,
    refresh_token: credentials.refresh_token,
    grant_type: "refresh_token"
  });
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }
  const tokenData = await response.json();
  return {
    access_token: tokenData.access_token,
    refresh_token: credentials.refresh_token,
    token_type: tokenData.token_type || "Bearer",
    expiry_date: Date.now() + tokenData.expires_in * 1000
  };
}
// Ensure we have a valid access token
async function ensureValidToken() {
  let credentials = await loadOAuthCredentials();
  // Check if token needs refresh (refresh 5 minutes before expiry)
  if (credentials.expiry_date < Date.now() + 300000) {
    console.log("Token expired, refreshing...");
    credentials = await refreshAccessToken(credentials);
    // Save refreshed credentials back to database
    try {
      const { error } = await supabase.from('oauth_credentials').update({
        access_token: credentials.access_token,
        token_type: credentials.token_type,
        expiry_date: credentials.expiry_date
      }).eq('service', 'gemini');
      if (error) {
        console.warn("Failed to save refreshed credentials:", error);
      } else {
        console.log("Saved refreshed credentials to database");
      }
    } catch (error) {
      console.warn("Failed to save refreshed credentials:", error);
    }
  }
  return credentials.access_token;
}
// Discover or retrieve the project ID for Code Assist API
async function discoverProjectId(accessToken) {
  console.log("Discovering project ID...");
  // Start with a default project ID (can be anything for personal OAuth)
  const initialProjectId = "default";
  // Prepare client metadata
  const clientMetadata = {
    ideType: "IDE_UNSPECIFIED",
    platform: "PLATFORM_UNSPECIFIED",
    pluginType: "GEMINI",
    duetProject: initialProjectId
  };
  try {
    // Call loadCodeAssist to discover the actual project ID
    const loadRequest = {
      cloudaicompanionProject: initialProjectId,
      metadata: clientMetadata
    };
    console.log("Calling loadCodeAssist...");
    const loadResponse = await makeAuthenticatedRequest(`${CODE_ASSIST_ENDPOINT}/${CODE_ASSIST_API_VERSION}:loadCodeAssist`, {
      method: "POST",
      body: JSON.stringify(loadRequest)
    }, accessToken);
    if (!loadResponse.ok) {
      const errorData = await loadResponse.json();
      console.error("loadCodeAssist failed:", errorData);
    } else {
      const loadData = await loadResponse.json();
      console.log("loadCodeAssist response:", loadData);
      // Check if we already have a project ID from the response
      if (loadData.cloudaicompanionProject) {
        console.log("Found existing project ID:", loadData.cloudaicompanionProject);
        return loadData.cloudaicompanionProject;
      }
      // If no existing project, we need to onboard
      const defaultTier = loadData.allowedTiers?.find((tier)=>tier.isDefault);
      const tierId = defaultTier?.id || "free-tier";
      console.log("Need to onboard user with tier:", tierId);
      const onboardRequest = {
        tierId: tierId,
        cloudaicompanionProject: initialProjectId,
        metadata: clientMetadata
      };
      let lroResponse = await makeAuthenticatedRequest(`${CODE_ASSIST_ENDPOINT}/${CODE_ASSIST_API_VERSION}:onboardUser`, {
        method: "POST",
        body: JSON.stringify(onboardRequest)
      }, accessToken);
      if (!lroResponse.ok) {
        const errorData = await lroResponse.json();
        console.error("onboardUser failed:", errorData);
        throw new Error("Failed to onboard user");
      }
      let lroData = await lroResponse.json();
      console.log("Initial onboard response:", lroData);
      // Poll until operation is complete with timeout protection
      const MAX_RETRIES = 15; // Maximum number of retries (30 seconds total)
      let retryCount = 0;
      while(!lroData.done && retryCount < MAX_RETRIES){
        console.log(`Waiting for onboarding completion... (${retryCount + 1}/${MAX_RETRIES})`);
        await new Promise((resolve)=>setTimeout(resolve, 2000));
        lroResponse = await makeAuthenticatedRequest(`${CODE_ASSIST_ENDPOINT}/${CODE_ASSIST_API_VERSION}:onboardUser`, {
          method: "POST",
          body: JSON.stringify(onboardRequest)
        }, accessToken);
        if (lroResponse.ok) {
          lroData = await lroResponse.json();
          console.log(`Onboard retry ${retryCount + 1} response:`, lroData);
        }
        retryCount++;
      }
      if (!lroData.done) {
        console.error("Onboarding timeout after", MAX_RETRIES, "retries");
        throw new Error("Onboarding timeout");
      }
      const discoveredProjectId = lroData.response?.cloudaicompanionProject?.id || initialProjectId;
      console.log("Discovered project ID:", discoveredProjectId);
      return discoveredProjectId;
    }
  } catch (error) {
    console.error("Failed to discover project ID:", error);
    throw new Error("Project discovery failed: " + error.message);
  }
  return initialProjectId;
}
// Extract JSON from text that may contain markdown code blocks or other formatting
function extractJSONFromText(text) {
  const debugInfo = {
    originalText: text,
    textLength: text.length,
    attempts: []
  };
  console.log("=== JSON EXTRACTION DEBUG ===");
  console.log("Full original text:", text);
  console.log("Text length:", text.length);
  console.log("Text preview:", text.substring(0, 300));
  // Method 1: Extract from markdown code blocks (```json ... ```)
  console.log("\n--- Method 1: Markdown code blocks ---");
  const markdownJsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (markdownJsonMatch) {
    const jsonText = markdownJsonMatch[1].trim();
    const attempt = {
      method: "markdown",
      found: true,
      extractedText: jsonText,
      extractedLength: jsonText.length
    };
    console.log("Found markdown JSON block:");
    console.log("Raw extracted:", jsonText);
    console.log("Length:", jsonText.length);
    try {
      const parsed = JSON.parse(jsonText);
      attempt.success = true;
      attempt.parsed = parsed;
      debugInfo.attempts.push(attempt);
      console.log("Successfully parsed JSON from markdown:", parsed);
      return parsed;
    } catch (e) {
      attempt.success = false;
      attempt.error = e.message;
      debugInfo.attempts.push(attempt);
      console.error("Markdown JSON parse error:", e.message);
      console.log("Problematic JSON text:", jsonText);
    }
  } else {
    debugInfo.attempts.push({
      method: "markdown",
      found: false
    });
    console.log("No markdown code blocks found");
  }
  // Method 2: Extract JSON object using balanced brace matching
  console.log("\n--- Method 2: Balanced brace matching ---");
  const jsonStart = text.indexOf('{');
  if (jsonStart !== -1) {
    console.log("Found opening brace at position:", jsonStart);
    let braceCount = 0;
    let jsonEnd = jsonStart;
    let inString = false;
    let escapeNext = false;
    for(let i = jsonStart; i < text.length; i++){
      const char = text[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i;
            break;
          }
        }
      }
    }
    const attempt = {
      method: "balanced_braces",
      found: true,
      startPos: jsonStart,
      endPos: jsonEnd,
      finalBraceCount: braceCount
    };
    console.log("Brace matching result:");
    console.log("Start position:", jsonStart);
    console.log("End position:", jsonEnd);
    console.log("Final brace count:", braceCount);
    if (braceCount === 0) {
      const jsonText = text.substring(jsonStart, jsonEnd + 1);
      attempt.extractedText = jsonText;
      attempt.extractedLength = jsonText.length;
      console.log("Extracted balanced JSON:");
      console.log("Raw text:", jsonText);
      console.log("Length:", jsonText.length);
      try {
        const parsed = JSON.parse(jsonText);
        attempt.success = true;
        attempt.parsed = parsed;
        debugInfo.attempts.push(attempt);
        console.log("Successfully parsed JSON from balanced braces:", parsed);
        return parsed;
      } catch (e) {
        attempt.success = false;
        attempt.error = e.message;
        debugInfo.attempts.push(attempt);
        console.error("Balanced brace JSON parse error:", e.message);
        console.log("Problematic JSON text:", jsonText);
      }
    } else {
      attempt.success = false;
      attempt.error = "Unmatched braces";
      debugInfo.attempts.push(attempt);
      console.log("Unmatched braces, cannot extract");
    }
  } else {
    debugInfo.attempts.push({
      method: "balanced_braces",
      found: false
    });
    console.log("No opening brace found");
  }
  // Method 3: Simple regex fallback
  console.log("\n--- Method 3: Simple regex fallback ---");
  const simpleJsonMatch = text.match(/\{[\s\S]*\}/);
  if (simpleJsonMatch) {
    const jsonText = simpleJsonMatch[0];
    const attempt = {
      method: "simple_regex",
      found: true,
      extractedText: jsonText,
      extractedLength: jsonText.length
    };
    console.log("Found JSON with simple regex:");
    console.log("Raw text:", jsonText);
    console.log("Length:", jsonText.length);
    try {
      const parsed = JSON.parse(jsonText);
      attempt.success = true;
      attempt.parsed = parsed;
      debugInfo.attempts.push(attempt);
      console.log("Successfully parsed JSON from simple regex:", parsed);
      return parsed;
    } catch (e) {
      attempt.success = false;
      attempt.error = e.message;
      debugInfo.attempts.push(attempt);
      console.error("Simple regex JSON parse error:", e.message);
      console.log("Problematic JSON text:", jsonText);
    }
  } else {
    debugInfo.attempts.push({
      method: "simple_regex",
      found: false
    });
    console.log("No JSON pattern found with simple regex");
  }
  console.log("\n=== EXTRACTION FAILED ===");
  console.log("Debug summary:", JSON.stringify(debugInfo, null, 2));
  console.log("All attempts failed. Returning null.");
  return null;
}
async function makeAuthenticatedRequest(url, options, accessToken) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Content-Type", "application/json");
  return fetch(url, {
    ...options,
    headers
  });
}
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    console.log("Processing Gemini chat request...");
    const { userMessage, conversationHistory, currentData, availableCategories, currentDateTime } = await req.json();
    console.log("Request data:", {
      userMessage: userMessage?.substring(0, 50) + "...",
      conversationHistoryLength: conversationHistory?.length || 0,
      currentData
    });
    if (!userMessage) {
      throw new Error("User message is required");
    }
    // Get valid access token
    const accessToken = await ensureValidToken();
    // Discover the actual project ID
    const projectId = await discoverProjectId(accessToken);
    console.log("Using project ID:", projectId);
    // Build conversation context
    const systemPrompt = `You are Viluuma, an enthusiastic and helpful AI assistant that helps users create and plan their goals through natural conversation. 

You have an energetic, casual, and slightly edgy personality. You use modern slang and speak like a supportive friend who's genuinely excited to help users achieve their goals.

Current conversation context:
- Available categories: ${JSON.stringify(availableCategories)}
- Current extracted data: ${JSON.stringify(currentData)}
- Current date/time: ${currentDateTime}

CRITICAL: You must gather ALL required information before marking isComplete as true:

For ONE-TIME goals, you need:
- Title, description, category, goalType
- Timeline type: either "deadline" (specific date) or "timeframe" (descriptive text)
- If deadline: specific date, If timeframe: descriptive text like "within 2 weeks"

For RECURRING goals, you need:
- Title, description, category, goalType  
- Recurrence pattern: daily/weekly/monthly
- Recurrence interval: how often (every 1 day, 2 weeks, etc.)
- End condition: never/after_count/by_date
- End value: count number or end date if applicable

Your job is to:
1. Extract goal information from the user's message
2. Ask follow-up questions to gather missing information
3. Be encouraging and use casual, modern language
4. Keep responses concise and conversational
5. Only mark isComplete=true when ALL required info is gathered

Respond with a JSON object containing:
{
  "message": "Your conversational response to the user",
  "extractedData": {
    "title": "extracted goal title or null",
    "description": "extracted description or null", 
    "category": "matched category from available list or null",
    "goalType": "one_time or recurring or null",
    "timelineType": "deadline or timeframe or null (for one-time goals)",
    "deadline": "extracted deadline date or null",
    "timeframe": "extracted timeframe text or null",
    "recurrencePattern": {
      "type": "daily or weekly or monthly or null",
      "interval": number or null,
      "daysOfWeek": [0,1,2,3,4,5,6] array or null,
      "endCondition": {
        "type": "never or after_count or by_date or null",
        "value": number or date string or null
      }
    } or null,
    "isComplete": boolean indicating if ALL required info is gathered
  }
}`;
    // Format conversation history for Gemini
    const contents = [];
    // Add system instruction as first user message
    contents.push({
      role: "user",
      parts: [
        {
          text: systemPrompt
        }
      ]
    });
    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory){
        contents.push({
          role: msg.type === "user" ? "user" : "model",
          parts: [
            {
              text: msg.content
            }
          ]
        });
      }
    }
    // Add current user message
    contents.push({
      role: "user",
      parts: [
        {
          text: userMessage
        }
      ]
    });
    const requestBody = {
      model: "gemini-2.5-flash",
      project: projectId,
      request: {
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Your conversational response to the user"
              },
              extractedData: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "extracted goal title or null"
                  },
                  description: {
                    type: "string",
                    description: "extracted description or null"
                  },
                  category: {
                    type: "string",
                    description: "matched category from available list or null"
                  },
                  goalType: {
                    type: "string",
                    enum: [
                      "one_time",
                      "recurring"
                    ],
                    description: "one_time or recurring or null"
                  },
                  timelineType: {
                    type: "string",
                    enum: [
                      "deadline",
                      "timeframe"
                    ],
                    description: "deadline or timeframe for one-time goals"
                  },
                  deadline: {
                    type: "string",
                    description: "extracted deadline date or null"
                  },
                  timeframe: {
                    type: "string",
                    description: "extracted timeframe text or null"
                  },
                  recurrencePattern: {
                    type: "object",
                    properties: {
                      type: {
                        type: "string",
                        enum: [
                          "daily",
                          "weekly",
                          "monthly"
                        ],
                        description: "recurrence type"
                      },
                      interval: {
                        type: "number",
                        description: "recurrence interval"
                      },
                      daysOfWeek: {
                        type: "array",
                        items: {
                          type: "number"
                        },
                        description: "days of week for weekly recurrence"
                      },
                      endCondition: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            enum: [
                              "never",
                              "after_count",
                              "by_date"
                            ]
                          },
                          value: {
                            description: "end count or date"
                          }
                        }
                      }
                    }
                  },
                  isComplete: {
                    type: "boolean",
                    description: "boolean indicating if ALL required info is gathered"
                  }
                },
                required: [
                  "title",
                  "description",
                  "category",
                  "goalType",
                  "timelineType",
                  "deadline",
                  "timeframe",
                  "recurrencePattern",
                  "isComplete"
                ]
              }
            },
            required: [
              "message",
              "extractedData"
            ]
          }
        }
      }
    };
    console.log("Making request to Gemini API with model: gemini-2.5-flash");
    console.log("Request structure:", JSON.stringify({
      model: requestBody.model,
      project: requestBody.project,
      contentsLength: requestBody.request.contents.length
    }));
    const response = await makeAuthenticatedRequest(`${CODE_ASSIST_ENDPOINT}/${CODE_ASSIST_API_VERSION}:generateContent`, {
      method: "POST",
      body: JSON.stringify(requestBody)
    }, accessToken);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    const responseData = await response.json();
    console.log("Gemini API response:", JSON.stringify(responseData, null, 2));
    // Extract the generated text - handle both old and new response structures
    let generatedText = "";
    let candidates = null;
    // Check for new response structure first (responseData.response.candidates)
    if (responseData.response && responseData.response.candidates) {
      console.log("Found candidates in responseData.response.candidates");
      candidates = responseData.response.candidates;
    } else if (responseData.candidates) {
      console.log("Found candidates in responseData.candidates");
      candidates = responseData.candidates;
    }
    if (candidates && candidates.length > 0) {
      const candidate = candidates[0];
      console.log("Processing candidate:", JSON.stringify(candidate, null, 2));
      if (candidate.content && candidate.content.parts) {
        generatedText = candidate.content.parts.filter((part)=>part.text).map((part)=>part.text).join("");
        console.log("Extracted text length:", generatedText.length);
      } else {
        console.error("Candidate missing content or parts:", candidate);
      }
    } else {
      console.error("No candidates found in response structure");
      console.error("Response structure keys:", Object.keys(responseData));
      if (responseData.response) {
        console.error("Response.response keys:", Object.keys(responseData.response));
      }
    }
    if (!generatedText) {
      console.error("Failed to extract any text from Gemini response");
      throw new Error("No response generated from Gemini");
    }
    console.log("Successfully extracted text:", generatedText.substring(0, 200) + "...");
    // With structured output, the response should be valid JSON directly
    let parsedResponse;
    try {
      console.log("Raw generated text from Gemini:", generatedText);
      // Try to parse the response directly as JSON first (structured output)
      try {
        parsedResponse = JSON.parse(generatedText);
        console.log("Successfully parsed structured JSON response:", JSON.stringify(parsedResponse, null, 2));
      } catch (directParseError) {
        console.log("Direct JSON parse failed, trying extraction methods:", directParseError);
        // Fallback to extraction methods if direct parsing fails
        parsedResponse = extractJSONFromText(generatedText);
        console.log("Extracted parsed response:", JSON.stringify(parsedResponse, null, 2));
      }
      if (!parsedResponse) {
        console.error("No valid JSON found in response");
        throw new Error("No valid JSON found");
      }
      // Normalize null string values to actual null values
      if (parsedResponse.extractedData) {
        Object.keys(parsedResponse.extractedData).forEach((key)=>{
          if (parsedResponse.extractedData[key] === "null") {
            parsedResponse.extractedData[key] = null;
          }
        });
      }
      console.log("Normalized response:", JSON.stringify(parsedResponse, null, 2));
    } catch (parseError) {
      console.error("JSON parsing failed with error:", parseError);
      console.log("Using fallback response with original text:", generatedText.substring(0, 200));
      parsedResponse = {
        message: generatedText,
        extractedData: currentData
      };
    }
    return new Response(JSON.stringify({
      success: true,
      data: parsedResponse
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Gemini chat error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
