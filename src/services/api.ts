import {
  JournalSummary,
  Insight,
  SecurityStatusData,
  SecurityTestResult,
  AskJournalResponse,
  WeeklyReflection,
  GoalTask,
  FutureMeProjections,
  DailyCheckInResult,
} from '../types';

interface ChatRequestPayload {
  messages: Array<{ role: 'user' | 'model' | 'assistant'; content: string }>;
  aiMemoryContext?: {
    rememberGoals?: boolean;
    userGoals?: string[];
    memories?: string[];
  };
}

export async function sendChatMessage(
  token: string,
  payload: ChatRequestPayload
): Promise<string> {
  const response = await fetch('/api/journal/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  const data = await response.json();
  return data.reply;
}

export async function requestJournalSummary(
  token: string,
  messages: Array<{ role: 'user' | 'model' | 'assistant'; content: string }>
): Promise<JournalSummary> {
  const response = await fetch('/api/journal/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to summarize session (status ${response.status})`);
  }

  return response.json();
}

export async function requestPersonalInsights(
  token: string,
  journals: Array<{
    title: string;
    summary: string;
    themes: string[];
    goals: string[];
    openQuestions: string[];
    date: string;
  }>
): Promise<Insight[]> {
  const response = await fetch('/api/journal/insights', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ journals }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate insights (status ${response.status})`);
  }

  const data = await response.json();
  return data.insights || [];
}

export async function queryAskMyJournal(
  token: string,
  question: string,
  journals: Array<{
    id: string;
    title: string;
    summary: string;
    themes: string[];
    goals: string[];
    openQuestions: string[];
    date: string;
  }>
): Promise<AskJournalResponse> {
  const response = await fetch('/api/journal/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, journals }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to query journal history');
  }

  return response.json();
}

export async function requestWeeklyReview(
  token: string,
  weekLabel: string,
  journals: Array<{
    title: string;
    summary: string;
    themes: string[];
    goals: string[];
    openQuestions: string[];
    date: string;
  }>
): Promise<WeeklyReflection> {
  const response = await fetch('/api/journal/weekly-reflection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ weekLabel, journals }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate weekly review');
  }

  return response.json();
}

export async function requestGoalMilestones(
  token: string,
  goal: { title: string; description?: string; category?: string }
): Promise<GoalTask[]> {
  const response = await fetch('/api/goals/breakdown', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(goal),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to breakdown goal milestones');
  }

  const data = await response.json();
  return data.tasks || [];
}

export async function requestEmailReflectionPrompts(
  token: string,
  email: { from: string; subject: string; snippet: string; date: string }
): Promise<{
  journalStarter: string;
  reflectionQuestions: string[];
  suggestedActions: string[];
}> {
  const response = await fetch('/api/journal/email-reflection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate email reflection');
  }

  return response.json();
}

export async function sendVoiceTurn(
  token: string,
  payload: {
    latestUserSpeech: string;
    transcriptHistory: Array<{ role: 'user' | 'gemini'; text: string }>;
    userContext?: {
      recentJournals?: Array<{ title: string; summary: string; themes: string[]; date: string }>;
      activeGoals?: Array<{ title: string; progress: number }>;
      memories?: string[];
    };
  }
): Promise<{
  spokenReply: string;
  shouldOfferJournalConversion: boolean;
  suggestedJournalDraft?: {
    title: string;
    summary: string;
    themes: string[];
    goals: string[];
    openQuestions: string[];
  };
  detectedActions: Array<{
    title: string;
    category: 'Work' | 'Personal' | 'Communication' | 'Wellness' | 'Learning';
    urgency: 'high' | 'medium' | 'low';
  }>;
}> {
  const response = await fetch('/api/voice/turn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Voice server error');
  }

  return response.json();
}

export async function extractSmartActions(
  token: string,
  text: string
): Promise<Array<{
  title: string;
  category: 'Work' | 'Personal' | 'Communication' | 'Wellness' | 'Learning';
  urgency: 'high' | 'medium' | 'low';
  contextSnippet?: string;
  suggestedDeadline?: string;
}>> {
  const response = await fetch('/api/actions/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to extract smart actions');
  }

  const data = await response.json();
  return data.actions || [];
}

export async function requestFutureMe(
  token: string,
  payload: {
    journals: Array<{ title: string; summary: string; themes: string[]; goals: string[]; openQuestions: string[]; date: string }>;
    goals: Array<{ title: string; progress: number; category: string }>;
    memories?: string[];
  }
): Promise<FutureMeProjections> {
  const response = await fetch('/api/future-me', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate Future Me projections');
  }

  return response.json();
}

export async function requestImageReflection(
  token: string,
  payload: {
    imageBase64: string;
    mimeType: string;
    prompt?: string;
  }
): Promise<{
  title: string;
  description: string;
  reflectionNotes: string;
  suggestedThemes: string[];
  provocativeQuestions: string[];
  potentialActions: string[];
}> {
  const response = await fetch('/api/journal/image-reflection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to analyze image for journal');
  }

  return response.json();
}

export async function requestDailyCheckIn(
  token: string,
  payload: {
    approach: string;
    recentThemes?: string[];
    activeGoals?: string[];
  }
): Promise<DailyCheckInResult> {
  const response = await fetch('/api/journal/daily-checkin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to get daily check-in prompt');
  }

  return response.json();
}

export async function fetchSecurityStatus(): Promise<SecurityStatusData> {
  const response = await fetch('/api/security/status');
  if (!response.ok) {
    throw new Error('Failed to load security status');
  }
  return response.json();
}

export async function runSecurityDiagnostics(
  token: string
): Promise<{ status: string; timestamp: string; results: SecurityTestResult[] }> {
  const response = await fetch('/api/security/test-suite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to run security diagnostics');
  }

  return response.json();
}
