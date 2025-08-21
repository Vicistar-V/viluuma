// Centralized TypeScript interfaces for the onboarding system

export interface DailyBudget {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

export interface CommitmentData {
  type: "daily" | "weekly";
  dailyBudget: DailyBudget;
  totalHoursPerWeek: number;
}

export interface Intel {
  title: string;
  modality: "project" | "checklist";
  deadline?: string | null;
  context: string;
}

export interface UserConstraints {
  deadline: string | null;
  hoursPerWeek: number;
  dailyBudget?: DailyBudget;
}

export interface ChatMessageType {
  role: "user" | "assistant";
  content: string;
}

// Helper function to create default daily budget
export const createDefaultDailyBudget = (hoursPerDay: number = 2): DailyBudget => ({
  mon: hoursPerDay,
  tue: hoursPerDay,
  wed: hoursPerDay,
  thu: hoursPerDay,
  fri: hoursPerDay,
  sat: 0,
  sun: 0
});

// Helper function to calculate total weekly hours from daily budget
export const calculateWeeklyHours = (dailyBudget: DailyBudget): number => {
  return Object.values(dailyBudget).reduce((sum, hours) => sum + hours, 0);
};

// Helper function to extract deadline from conversation
export const extractDeadlineFromConversation = (messages: ChatMessageType[]): string | null => {
  const conversationText = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  // Look for date patterns in conversation
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/g, // MM/DD/YYYY
    /(\d{4}-\d{1,2}-\d{1,2})/g,   // YYYY-MM-DD
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi,
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}/gi,
    /in\s+(\d+)\s+(week|month|day)s?/gi,
    /by\s+(january|february|march|april|may|june|july|august|september|october|november|december)/gi
  ];

  for (const pattern of datePatterns) {
    const matches = conversationText.match(pattern);
    if (matches && matches.length > 0) {
      // Try to parse the first match into a valid date
      try {
        const dateStr = matches[0];
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }

  return null;
};

// Helper function to extract goal title from conversation
export const extractGoalFromConversation = (messages: ChatMessageType[]): { title: string; context: string } => {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
  const fullContext = userMessages.join(' ');
  
  // Use the first substantial user message as the title, truncated if needed
  const firstMessage = userMessages[0] || 'My Goal';
  const title = firstMessage.length > 100 ? firstMessage.substring(0, 97) + '...' : firstMessage;
  
  return {
    title: title || 'My Goal',
    context: fullContext
  };
};

// Helper function to determine modality from conversation
export const determineModalityFromConversation = (messages: ChatMessageType[]): "project" | "checklist" => {
  const conversationText = messages
    .map(m => m.content)
    .join(' ')
    .toLowerCase();

  // Project indicators
  const projectKeywords = [
    'deadline', 'by ', 'until', 'before', 'finish by', 'complete by',
    'launch', 'release', 'deliver', 'due', 'target date', 'timeline'
  ];

  // Checklist indicators  
  const checklistKeywords = [
    'habit', 'routine', 'daily', 'regular', 'ongoing', 'practice',
    'maintain', 'keep', 'continue', 'build habit', 'develop routine'
  ];

  const projectScore = projectKeywords.reduce((score, keyword) => 
    conversationText.includes(keyword) ? score + 1 : score, 0);
  
  const checklistScore = checklistKeywords.reduce((score, keyword) => 
    conversationText.includes(keyword) ? score + 1 : score, 0);

  // Default to project if unclear, as most goals benefit from deadlines
  return projectScore >= checklistScore ? 'project' : 'checklist';
};