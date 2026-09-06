export interface Message {
  id: string;
  role: 'user' | 'model' | 'assistant';
  content: string;
  createdAt: number;
  imageUrl?: string;
}

export interface Conversation {
  id: string;
  title: string;
  summary?: string;
  themes?: string[];
  goals?: string[];
  openQuestions?: string[];
  createdAt: number;
  updatedAt: number;
  messageCount?: number;
  imageUrl?: string;
}

export interface JournalSummary {
  title: string;
  summary: string;
  themes: string[];
  goals: string[];
  openQuestions: string[];
}

export interface Insight {
  id: string;
  type: 'recurring_theme' | 'goal_evolution' | 'open_question' | 'reflection';
  title: string;
  description: string;
  frequency?: number;
  relatedThemes?: string[];
  reflectionPrompt?: string;
  suggestedAction?: string;
  createdAt: number;
}

export type GeminiAvatarState =
  | 'idle'
  | 'thinking'
  | 'listening'
  | 'speaking'
  | 'processing'
  | 'success'
  | 'error';

export type AppView =
  | 'dashboard'
  | 'voice-agent'
  | 'conversation'
  | 'history'
  | 'detail'
  | 'insights'
  | 'smart-actions'
  | 'actions'
  | 'future-me'
  | 'thought-graph'
  | 'image-journal'
  | 'ask'
  | 'ask-journal'
  | 'goals'
  | 'weekly'
  | 'weekly-reflection'
  | 'email'
  | 'email-assistant'
  | 'calendar'
  | 'calendar-assistant'
  | 'memory'
  | 'ai-memory'
  | 'privacy'
  | 'security'
  | 'voice-mode'
  | 'settings';

export interface GoalTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline?: string;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  tasks: GoalTask[];
  sourceJournalId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SmartAction {
  id: string;
  title: string;
  description?: string;
  category: 'Work' | 'Personal' | 'Communication' | 'Wellness' | 'Learning';
  urgency: 'high' | 'medium' | 'low';
  status: 'pending' | 'done' | 'converted_to_goal';
  sourceType: 'journal' | 'voice' | 'email' | 'manual';
  sourceId?: string;
  deadline?: string;
  reminderApproved?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AIMemory {
  id: string;
  content: string;
  category: 'goal' | 'preference' | 'habit' | 'boundary' | 'project';
  sourceJournalId?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface VoiceTranscriptTurn {
  role: 'user' | 'gemini';
  text: string;
  timestamp: number;
}

export interface VoiceSession {
  id: string;
  transcript: VoiceTranscriptTurn[];
  durationSeconds: number;
  summary?: string;
  journalConverted?: boolean;
  convertedJournalId?: string;
  createdAt: number;
}

export interface FutureMeProjections {
  currentlyWorkingToward: string[];
  strugglesAndBlockers: string[];
  nextFocusAreas: string[];
  futureSelfQuestions: string[];
  next7DaysPriorities: string[];
  next30DaysPriorities: string[];
  disclaimer: string;
  generatedAt: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'topic' | 'goal' | 'theme' | 'question' | 'project' | 'insight';
  count?: number;
  journalIds?: string[];
}

export interface GraphLink {
  source: string;
  target: string;
  relationship: string;
  weight?: number;
}

export interface ThoughtGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export type DailyApproach =
  | 'Reflect'
  | 'Plan'
  | 'Brainstorm'
  | 'Unload'
  | 'Set Goals'
  | 'Talk to Voice Agent';

export interface DailyCheckInResult {
  approach: DailyApproach;
  starterPrompt: string;
  reflectionQuestions: string[];
}

export interface WeeklyReflection {
  id: string;
  weekLabel: string;
  focusAreas: string[];
  accomplishments: string[];
  unfinishedItems: string[];
  recurringThemes: string[];
  openQuestions: string[];
  goalsNeedingAttention: string[];
  suggestedNextSteps: string[];
  startNextWeekWith: string;
  onePowerfulQuestion?: string;
  createdAt: number;
}

export interface EmailItem {
  id: string;
  threadId?: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  category: 'IMPORTANT' | 'REPLY NEEDED' | 'DEADLINE' | 'MEETING' | 'INFORMATIONAL';
  actionRequired?: string;
  deadline?: string;
}

export interface EmailDigest {
  totalScanned: number;
  actionItemsCount: number;
  digestSummary: string;
  emails: EmailItem[];
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  isImportant?: boolean;
  reflectionPrompt?: string;
}

export interface AskJournalResponse {
  answer: string;
  citedEntries: { id: string; title: string; date: string }[];
  detectedPatterns: string[];
  suggestedFollowUps: string[];
}

export interface UserSettings {
  rememberLongTermGoals: boolean;
  useSummariesForReflection: boolean;
  generatePersonalInsights: boolean;
  allowEmailReflection: boolean;
  enableAIMemory?: boolean;
  customMemories?: string[];
  updatedAt?: number;
}

export interface SecurityTestResult {
  testId: string;
  title: string;
  scenario: string;
  result: 'PASS' | 'NEEDS CONFIGURATION';
  details: string;
}

export interface SecurityStatusData {
  authentication: {
    provider: string;
    tokenVerification: string;
    isolation: string;
  };
  database: {
    type: string;
    isolationModel: string;
    securityRulesEnforced: boolean;
    denyByDefault: boolean;
  };
  secretManagement: {
    source: string;
    secretName: string;
    leastPrivilegeRole: string;
    isEncryptedInTransit: boolean;
    credentialsExposedToBrowser: boolean;
  };
  defenseInDepth: {
    rateLimiting: string;
    inputValidation: string;
    outputSanitization: string;
    promptInjectionProtection: string;
  };
}
