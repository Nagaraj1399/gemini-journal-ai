import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Conversation,
  Message,
  Insight,
  UserSettings,
  JournalSummary,
  Goal,
  WeeklyReflection,
  SmartAction,
  AIMemory,
  VoiceSession,
} from '../types';

/**
 * Ensures user path is strictly scoped to the authenticated UID
 */
function getUserCollection(userId: string, subcollection: string) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Security Error: Invalid or missing authenticated user ID.');
  }
  return collection(db, 'users', userId, subcollection);
}

/**
 * Recursively removes undefined fields from an object/array so Firestore setDoc/updateDoc
 * does not throw "Unsupported field value: undefined".
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(cleanForFirestore) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// -------------------------------------------------------------
// Conversations
// -------------------------------------------------------------

export async function createConversation(
  userId: string,
  title: string
): Promise<string> {
  const convCol = getUserCollection(userId, 'conversations');
  const newDocRef = doc(convCol);
  const now = Date.now();

  const conversationData: Conversation = {
    id: newDocRef.id,
    title: title.slice(0, 100),
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };

  await setDoc(newDocRef, cleanForFirestore(conversationData));
  return newDocRef.id;
}

export async function updateConversationSummary(
  userId: string,
  conversationId: string,
  summaryData: JournalSummary
): Promise<void> {
  const convRef = doc(db, 'users', userId, 'conversations', conversationId);
  const data = cleanForFirestore({
    title: summaryData.title,
    summary: summaryData.summary,
    themes: summaryData.themes || [],
    goals: summaryData.goals || [],
    openQuestions: summaryData.openQuestions || [],
    updatedAt: Date.now(),
  });
  await setDoc(convRef, data, { merge: true });
}

export const updateConversationWithSummary = updateConversationSummary;

export async function getConversation(
  userId: string,
  conversationId: string
): Promise<Conversation | null> {
  const convRef = doc(db, 'users', userId, 'conversations', conversationId);
  const snapshot = await getDoc(convRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Conversation;
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const convCol = getUserCollection(userId, 'conversations');
  const q = query(convCol, orderBy('updatedAt', 'desc'), limit(100));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Conversation, 'id'>),
  }));
}

export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<void> {
  // First delete nested messages in batch / loop
  const messagesCol = collection(
    db,
    'users',
    userId,
    'conversations',
    conversationId,
    'messages'
  );
  const msgSnapshot = await getDocs(messagesCol);
  const deletePromises = msgSnapshot.docs.map((m) => deleteDoc(m.ref));
  await Promise.all(deletePromises);

  // Then delete conversation doc
  const convRef = doc(db, 'users', userId, 'conversations', conversationId);
  await deleteDoc(convRef);
}

// -------------------------------------------------------------
// Messages
// -------------------------------------------------------------

export async function addMessage(
  userId: string,
  conversationId: string,
  message: { role: 'user' | 'model' | 'assistant'; content: string; imageUrl?: string }
): Promise<Message> {
  const messagesCol = collection(
    db,
    'users',
    userId,
    'conversations',
    conversationId,
    'messages'
  );
  const newDocRef = doc(messagesCol);
  const now = Date.now();

  const messageData: Message = cleanForFirestore({
    id: newDocRef.id,
    role: message.role,
    content: message.content,
    createdAt: now,
    ...(message.imageUrl ? { imageUrl: message.imageUrl } : {}),
  });

  await setDoc(newDocRef, messageData);

  // Update conversation updatedAt timestamp & increment message count
  const convRef = doc(db, 'users', userId, 'conversations', conversationId);
  const convSnap = await getDoc(convRef);
  const currentCount = convSnap.exists() ? (convSnap.data().messageCount || 0) : 0;
  await setDoc(
    convRef,
    cleanForFirestore({
      updatedAt: now,
      messageCount: currentCount + 1,
    }),
    { merge: true }
  );

  return messageData;
}

export async function getMessages(
  userId: string,
  conversationId: string
): Promise<Message[]> {
  const messagesCol = collection(
    db,
    'users',
    userId,
    'conversations',
    conversationId,
    'messages'
  );
  const q = query(messagesCol, orderBy('createdAt', 'asc'), limit(200));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Message, 'id'>),
  }));
}

// -------------------------------------------------------------
// Personal Insights
// -------------------------------------------------------------

export async function saveInsights(
  userId: string,
  insights: Omit<Insight, 'id' | 'createdAt'>[]
): Promise<Insight[]> {
  const insightsCol = getUserCollection(userId, 'insights');
  const saved: Insight[] = [];
  const now = Date.now();

  for (const item of insights) {
    const docRef = doc(insightsCol);
    const insightData: Insight = cleanForFirestore({
      id: docRef.id,
      type: item.type,
      title: item.title,
      description: item.description,
      frequency: item.frequency,
      relatedThemes: item.relatedThemes || [],
      reflectionPrompt: item.reflectionPrompt,
      suggestedAction: item.suggestedAction,
      createdAt: now,
    });
    await setDoc(docRef, insightData);
    saved.push(insightData);
  }

  return saved;
}

export async function getInsights(userId: string): Promise<Insight[]> {
  const insightsCol = getUserCollection(userId, 'insights');
  const q = query(insightsCol, orderBy('createdAt', 'desc'), limit(50));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Insight, 'id'>),
  }));
}

export async function deleteInsight(userId: string, insightId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'insights', insightId);
  await deleteDoc(ref);
}

// -------------------------------------------------------------
// Goals
// -------------------------------------------------------------

export async function saveGoal(
  userId: string,
  goal: Partial<Omit<Goal, 'id'>> & { title: string; id?: string }
): Promise<Goal> {
  const goalsCol = getUserCollection(userId, 'goals');
  const docRef = goal.id ? doc(goalsCol, goal.id) : doc(goalsCol);
  const now = Date.now();
  const goalData: Goal = cleanForFirestore({
    id: docRef.id,
    title: goal.title,
    description: goal.description || '',
    category: goal.category || 'General',
    deadline: goal.deadline,
    progress: typeof goal.progress === 'number' ? goal.progress : 0,
    status: goal.status || 'Not Started',
    tasks: Array.isArray(goal.tasks) ? goal.tasks : [],
    sourceJournalId: goal.sourceJournalId,
    createdAt: goal.createdAt || now,
    updatedAt: now,
  });
  await setDoc(docRef, goalData, { merge: true });
  return goalData;
}

export async function getGoals(userId: string): Promise<Goal[]> {
  const goalsCol = getUserCollection(userId, 'goals');
  const q = query(goalsCol, orderBy('updatedAt', 'desc'), limit(50));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Goal, 'id'>),
  }));
}

export async function updateGoal(
  userId: string,
  goalId: string,
  updates: Partial<Goal>
): Promise<void> {
  const goalRef = doc(db, 'users', userId, 'goals', goalId);
  await setDoc(goalRef, cleanForFirestore({ ...updates, updatedAt: Date.now() }), { merge: true });
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const goalRef = doc(db, 'users', userId, 'goals', goalId);
  await deleteDoc(goalRef);
}

// -------------------------------------------------------------
// Smart Actions
// -------------------------------------------------------------

export async function saveSmartAction(
  userId: string,
  action: Partial<Omit<SmartAction, 'id'>> & { title: string; id?: string }
): Promise<SmartAction> {
  const actionsCol = getUserCollection(userId, 'actions');
  const docRef = action.id ? doc(actionsCol, action.id) : doc(actionsCol);
  const now = Date.now();
  const data: SmartAction = cleanForFirestore({
    id: docRef.id,
    title: action.title,
    description: action.description || '',
    category: action.category || 'Personal',
    urgency: action.urgency || 'medium',
    status: action.status || 'pending',
    sourceType: action.sourceType || 'journal',
    sourceId: action.sourceId,
    deadline: action.deadline,
    reminderApproved: !!action.reminderApproved,
    createdAt: action.createdAt || now,
    updatedAt: now,
  });
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function getSmartActions(userId: string): Promise<SmartAction[]> {
  const actionsCol = getUserCollection(userId, 'actions');
  const q = query(actionsCol, orderBy('createdAt', 'desc'), limit(100));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<SmartAction, 'id'>),
  }));
}

export async function updateSmartAction(
  userId: string,
  actionId: string,
  updates: Partial<SmartAction>
): Promise<void> {
  const actionRef = doc(db, 'users', userId, 'actions', actionId);
  await setDoc(actionRef, cleanForFirestore({ ...updates, updatedAt: Date.now() }), { merge: true });
}

export async function deleteSmartAction(userId: string, actionId: string): Promise<void> {
  const actionRef = doc(db, 'users', userId, 'actions', actionId);
  await deleteDoc(actionRef);
}

// -------------------------------------------------------------
// AI Memories
// -------------------------------------------------------------

export async function saveAIMemory(
  userId: string,
  memory: Partial<Omit<AIMemory, 'id'>> & { content: string; id?: string }
): Promise<AIMemory> {
  const memCol = getUserCollection(userId, 'memories');
  const docRef = memory.id ? doc(memCol, memory.id) : doc(memCol);
  const now = Date.now();
  const data: AIMemory = cleanForFirestore({
    id: docRef.id,
    content: memory.content,
    category: memory.category || 'preference',
    sourceJournalId: memory.sourceJournalId,
    isActive: memory.isActive !== false,
    createdAt: memory.createdAt || now,
    updatedAt: now,
  });
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function getAIMemories(userId: string): Promise<AIMemory[]> {
  const memCol = getUserCollection(userId, 'memories');
  const q = query(memCol, orderBy('createdAt', 'desc'), limit(50));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AIMemory, 'id'>),
  }));
}

export async function updateAIMemory(
  userId: string,
  memoryId: string,
  updates: Partial<AIMemory>
): Promise<void> {
  const memRef = doc(db, 'users', userId, 'memories', memoryId);
  await setDoc(memRef, cleanForFirestore({ ...updates, updatedAt: Date.now() }), { merge: true });
}

export async function deleteAIMemory(userId: string, memoryId: string): Promise<void> {
  const memRef = doc(db, 'users', userId, 'memories', memoryId);
  await deleteDoc(memRef);
}

export async function clearAllAIMemories(userId: string): Promise<void> {
  const mems = await getAIMemories(userId);
  await Promise.all(mems.map((m) => deleteAIMemory(userId, m.id)));
}

export const clearAllMemories = clearAllAIMemories;

// -------------------------------------------------------------
// Voice Sessions
// -------------------------------------------------------------

export async function saveVoiceSession(
  userId: string,
  session: Partial<Omit<VoiceSession, 'id'>> & { transcript: VoiceSession['transcript']; id?: string }
): Promise<VoiceSession> {
  const sessCol = getUserCollection(userId, 'voiceSessions');
  const docRef = session.id ? doc(sessCol, session.id) : doc(sessCol);
  const now = Date.now();
  const data: VoiceSession = cleanForFirestore({
    id: docRef.id,
    transcript: session.transcript,
    durationSeconds: session.durationSeconds || 0,
    summary: session.summary,
    journalConverted: !!session.journalConverted,
    convertedJournalId: session.convertedJournalId,
    createdAt: session.createdAt || now,
  });
  await setDoc(docRef, data, { merge: true });
  return data;
}

export async function getVoiceSessions(userId: string): Promise<VoiceSession[]> {
  const sessCol = getUserCollection(userId, 'voiceSessions');
  const q = query(sessCol, orderBy('createdAt', 'desc'), limit(30));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<VoiceSession, 'id'>),
  }));
}

export async function deleteVoiceSession(userId: string, sessionId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'voiceSessions', sessionId);
  await deleteDoc(ref);
}

// -------------------------------------------------------------
// Weekly Reflections
// -------------------------------------------------------------

export async function saveWeeklyReflection(
  userId: string,
  reflection: Partial<Omit<WeeklyReflection, 'id'>> & { weekLabel: string; id?: string }
): Promise<WeeklyReflection> {
  const refCol = getUserCollection(userId, 'reflections');
  const docRef = reflection.id ? doc(refCol, reflection.id) : doc(refCol);
  const data: WeeklyReflection = cleanForFirestore({
    id: docRef.id,
    weekLabel: reflection.weekLabel,
    focusAreas: reflection.focusAreas || [],
    accomplishments: reflection.accomplishments || [],
    unfinishedItems: reflection.unfinishedItems || [],
    recurringThemes: reflection.recurringThemes || [],
    openQuestions: reflection.openQuestions || [],
    goalsNeedingAttention: reflection.goalsNeedingAttention || [],
    suggestedNextSteps: reflection.suggestedNextSteps || [],
    startNextWeekWith: reflection.startNextWeekWith || '',
    onePowerfulQuestion: reflection.onePowerfulQuestion,
    createdAt: reflection.createdAt || Date.now(),
  });
  await setDoc(docRef, data);
  return data;
}

export async function getWeeklyReflections(userId: string): Promise<WeeklyReflection[]> {
  const refCol = getUserCollection(userId, 'reflections');
  const q = query(refCol, orderBy('createdAt', 'desc'), limit(20));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<WeeklyReflection, 'id'>),
  }));
}

export async function deleteWeeklyReflection(userId: string, reflectionId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'reflections', reflectionId);
  await deleteDoc(ref);
}

// -------------------------------------------------------------
// User Settings / AI Memory Preferences
// -------------------------------------------------------------

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
  const snapshot = await getDoc(settingsRef);

  if (snapshot.exists()) {
    return snapshot.data() as UserSettings;
  }

  const defaultSettings: UserSettings = {
    rememberLongTermGoals: false,
    useSummariesForReflection: false,
    generatePersonalInsights: true,
    allowEmailReflection: false,
    enableAIMemory: true,
    customMemories: [],
  };

  await setDoc(settingsRef, cleanForFirestore(defaultSettings));
  return defaultSettings;
}

export async function saveUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
  await setDoc(settingsRef, cleanForFirestore({ ...settings, updatedAt: Date.now() }), { merge: true });
}

// -------------------------------------------------------------
// Privacy & Sovereign Account Data Deletion
// -------------------------------------------------------------

export async function deleteAllUserData(userId: string): Promise<void> {
  // 1. Delete all conversations and nested messages
  const convs = await getConversations(userId);
  for (const conv of convs) {
    await deleteConversation(userId, conv.id);
  }

  // 2. Delete all insights
  const insights = await getInsights(userId);
  for (const ins of insights) {
    await deleteInsight(userId, ins.id);
  }

  // 3. Delete all goals
  const goals = await getGoals(userId);
  for (const g of goals) {
    await deleteGoal(userId, g.id);
  }

  // 4. Delete all smart actions
  const actions = await getSmartActions(userId);
  for (const a of actions) {
    await deleteSmartAction(userId, a.id);
  }

  // 5. Delete all AI memories
  await clearAllAIMemories(userId);

  // 6. Delete all voice sessions
  const sessions = await getVoiceSessions(userId);
  for (const s of sessions) {
    await deleteVoiceSession(userId, s.id);
  }

  // 7. Delete all weekly reflections
  const reflections = await getWeeklyReflections(userId);
  for (const r of reflections) {
    await deleteWeeklyReflection(userId, r.id);
  }

  // 8. Delete settings
  const settingsRef = doc(db, 'users', userId, 'settings', 'preferences');
  await deleteDoc(settingsRef);

  // 9. Delete user root doc
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef).catch(() => {});
}
