// Cloudflare Worker for OpenRouter API proxy
// Deploy this to Cloudflare Workers and set your OPENROUTER_API_KEY in environment variables

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    try {
      if (url.pathname === '/onboard-goal') {
        return await handleOnboardGoal(request, env);
      } else if (url.pathname === '/generate-plan') {
        return await handleGeneratePlan(request, env);
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleOnboardGoal(request, env) {
  const { messages } = await request.json();
  
  // Extract goal analysis logic
  const analyzeConversationState = (messages) => {
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    const lastMessage = userMessages[userMessages.length - 1] || '';
    
    // Detect modality
    const projectKeywords = ['build', 'create', 'develop', 'make', 'project', 'app', 'website', 'feature'];
    const checklistKeywords = ['learn', 'study', 'habit', 'routine', 'steps', 'checklist', 'tasks'];
    
    let modality = null;
    if (projectKeywords.some(keyword => lastMessage.toLowerCase().includes(keyword))) {
      modality = 'project';
    } else if (checklistKeywords.some(keyword => lastMessage.toLowerCase().includes(keyword))) {
      modality = 'checklist';
    }
    
    // Extract title (simple heuristic)
    let title = null;
    const titleMatch = lastMessage.match(/(?:want to|need to|plan to|goal is to)\s+(.+?)(?:\.|$)/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else if (lastMessage.length < 100) {
      title = lastMessage;
    }
    
    return { title, modality, deadline: null, hoursPerWeek: null, context: userMessages.join(' ') };
  };

  const state = analyzeConversationState(messages);
  const missingInfo = [];
  
  if (!state.title) missingInfo.push('goal title');
  if (!state.modality) missingInfo.push('type (project or learning goal)');
  if (!state.deadline) missingInfo.push('deadline');
  if (!state.hoursPerWeek) missingInfo.push('weekly time commitment');
  
  if (missingInfo.length === 0) {
    return new Response(JSON.stringify({
      status: 'ready_to_generate',
      intel: state
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Generate AI response for missing info
  const systemPrompt = `You are an AI goal-setting assistant. Ask for missing information: ${missingInfo.join(', ')}. Be conversational and helpful. Ask one question at a time.`;
  
  const aiResponse = await callOpenRouter([
    { role: 'system', content: systemPrompt },
    ...messages
  ], env.OPENROUTER_API_KEY);

  return new Response(JSON.stringify({
    status: 'continue',
    message: aiResponse
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleGeneratePlan(request, env) {
  const { intel, compression_requested = false, extension_requested = false } = await request.json();
  
  const prompt = `Generate a detailed ${intel.modality} plan for: "${intel.title}"
  
Context: ${intel.context || 'No additional context'}
Deadline: ${intel.deadline || 'No specific deadline'}
Weekly commitment: ${intel.hoursPerWeek || 'Flexible'} hours

${compression_requested ? 'Make this plan more compressed and focused.' : ''}
${extension_requested ? 'Extend the timeline and add more detailed steps.' : ''}

Return a JSON object with this structure:
{
  "status": "success",
  "plan": {
    "title": "${intel.title}",
    "milestones": [
      {
        "title": "Milestone Name",
        "description": "What this milestone achieves",
        "scheduledTasks": [
          {
            "title": "Task name",
            "description": "Task details",
            "estimatedHours": 2,
            "daysFromStart": 1
          }
        ]
      }
    ],
    "hoursPerWeek": ${intel.hoursPerWeek || 5},
    "dailyBudget": ${Math.round((intel.hoursPerWeek || 5) / 7 * 10) / 10}
  }
}`;

  const response = await callOpenRouter([
    { role: 'system', content: 'You are an expert project planner. Always respond with valid JSON.' },
    { role: 'user', content: prompt }
  ], env.OPENROUTER_API_KEY);

  try {
    const parsed = JSON.parse(response);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    // Fallback if JSON parsing fails
    return new Response(JSON.stringify({
      status: 'success',
      plan: {
        title: intel.title,
        milestones: [{
          title: 'Getting Started',
          description: 'Initial setup and planning',
          scheduledTasks: [{
            title: 'Begin work on ' + intel.title,
            description: response,
            estimatedHours: 2,
            daysFromStart: 1
          }]
        }],
        hoursPerWeek: intel.hoursPerWeek || 5,
        dailyBudget: Math.round((intel.hoursPerWeek || 5) / 7 * 10) / 10
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function callOpenRouter(messages, apiKey) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: messages,
      temperature: 0.7,
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}