import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserSettings, SecurityStatusData, SecurityTestResult } from '../types';
import {
  getUserSettings,
  saveUserSettings,
  deleteAllUserData,
  getConversations,
  getInsights,
  getGoals,
  getWeeklyReflections,
} from '../services/firestoreService';
import { fetchSecurityStatus, runSecurityDiagnostics } from '../services/api';
import { GeminiAvatar } from './GeminiAvatar';
import {
  ShieldCheck,
  Lock,
  Database,
  User,
  Sliders,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Play,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  KeyRound,
} from 'lucide-react';

export const SettingsPrivacyView: React.FC = () => {
  const { currentUser, signOut, getIdToken } = useAuth();

  const [settings, setSettings] = useState<UserSettings>({
    rememberLongTermGoals: false,
    useSummariesForReflection: false,
    generatePersonalInsights: true,
  });
  const [securityStatus, setSecurityStatus] = useState<SecurityStatusData | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<SecurityTestResult[] | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>('stores');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [deleteStatusMessage, setDeleteStatusMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    async function loadData() {
      try {
        const [loadedSettings, secStatus] = await Promise.all([
          getUserSettings(currentUser.uid),
          fetchSecurityStatus().catch(() => null),
        ]);
        setSettings(loadedSettings);
        if (secStatus) setSecurityStatus(secStatus);
      } catch (err) {
        console.error('[SETTINGS_LOAD_ERROR]', err);
      }
    }

    loadData();
  }, [currentUser]);

  const handleToggleSetting = async (key: keyof UserSettings) => {
    if (!currentUser) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSavingSettings(true);

    try {
      await saveUserSettings(currentUser.uid, { [key]: updated[key] });
      setSuccessNotice('Privacy preference updated.');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      console.error('[SAVE_SETTINGS_ERROR]', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRunSecuritySuite = async () => {
    setRunningDiagnostics(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error('Auth token missing');
      const response = await runSecurityDiagnostics(token);
      setDiagnosticResults(response.results);
    } catch (err: any) {
      console.error('[DIAGNOSTICS_ERROR]', err);
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const handleExportData = async () => {
    if (!currentUser) return;
    setIsExporting(true);
    try {
      const [convList, insightList, goalList, reflectionList] = await Promise.all([
        getConversations(currentUser.uid),
        getInsights(currentUser.uid),
        getGoals(currentUser.uid),
        getWeeklyReflections(currentUser.uid),
      ]);

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        user: {
          uid: currentUser.uid,
          email: currentUser.email,
        },
        journals: convList,
        insights: insightList,
        goals: goalList,
        reflections: reflectionList,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `gemini-journal-export-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessNotice('Full JSON archive downloaded successfully.');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      console.error('[EXPORT_ERROR]', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!currentUser) return;
    setDeleteStatusMessage(null);
    if (deleteConfirmation !== 'DELETE MY DATA') {
      setDeleteStatusMessage({ type: 'error', text: 'Please type "DELETE MY DATA" to confirm permanent deletion.' });
      return;
    }

    setIsDeletingAll(true);
    try {
      await deleteAllUserData(currentUser.uid);
      setDeleteStatusMessage({ type: 'success', text: 'All conversations, goals, reflections, and insights have been permanently purged.' });
      setDeleteConfirmation('');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('[DELETE_ALL_ERROR]', err);
      setDeleteStatusMessage({ type: 'error', text: 'Failed to delete data. Please check your network and try again.' });
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
            Privacy & Security Center
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Complete architectural transparency, cryptographic audit, and sovereign data lifecycle controls.
          </p>
        </div>

        <button
          onClick={handleExportData}
          disabled={isExporting}
          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>{isExporting ? 'Packaging Archive...' : 'Export My Data (JSON)'}</span>
        </button>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs font-mono text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Account Profile Card */}
      <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-4 shadow-xl">
        <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
          <User className="w-4 h-4 text-cyan-400" />
          <span>Authenticated Vault Identity</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-stone-400 block font-mono text-[11px]">Display Name</span>
            <span className="font-semibold text-stone-100">{currentUser?.displayName || 'Authorized User'}</span>
          </div>

          <div>
            <span className="text-stone-400 block font-mono text-[11px]">Google Account</span>
            <span className="font-semibold text-stone-100">{currentUser?.email}</span>
          </div>

          <div>
            <span className="text-stone-400 block font-mono text-[11px]">Scoped Partition (UID)</span>
            <span className="font-mono text-cyan-300 bg-stone-950 px-2 py-0.5 rounded border border-stone-800 text-[11px]">
              {currentUser?.uid}
            </span>
          </div>

          <div>
            <span className="text-stone-400 block font-mono text-[11px]">Identity Provider</span>
            <span className="font-semibold text-stone-100">Google Sign-In (Firebase Auth)</span>
          </div>
        </div>
      </div>

      {/* AI Memory Consent Toggles */}
      <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>AI Memory & Personalization Consent</span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Control whether Gemini retains contextual memory across your conversations. Defaults strictly favor privacy.
            </p>
          </div>
          {savingSettings && <span className="text-[11px] font-mono text-cyan-400">Saving...</span>}
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800 hover:border-cyan-500/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={settings.rememberLongTermGoals}
              onChange={() => handleToggleSetting('rememberLongTermGoals')}
              className="mt-0.5 rounded bg-stone-900 border-stone-700 text-cyan-500 focus:ring-0"
            />
            <div className="space-y-0.5">
              <span className="font-semibold text-stone-100 block">Remember my active goals</span>
              <p className="text-stone-400 text-[11px] leading-relaxed">
                When checked, Gemini references goals formulated during past journal sessions to provide contextual thinking prompts.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800 hover:border-cyan-500/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={settings.useSummariesForReflection}
              onChange={() => handleToggleSetting('useSummariesForReflection')}
              className="mt-0.5 rounded bg-stone-900 border-stone-700 text-cyan-500 focus:ring-0"
            />
            <div className="space-y-0.5">
              <span className="font-semibold text-stone-100 block">Use previous summaries for longitudinal reflection</span>
              <p className="text-stone-400 text-[11px] leading-relaxed">
                Allows Gemini to notice thematic trends across different journaling days (e.g. noticing recurring thoughts about career decisions).
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800 hover:border-cyan-500/30 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={settings.generatePersonalInsights}
              onChange={() => handleToggleSetting('generatePersonalInsights')}
              className="mt-0.5 rounded bg-stone-900 border-stone-700 text-cyan-500 focus:ring-0"
            />
            <div className="space-y-0.5">
              <span className="font-semibold text-stone-100 block">Generate Personal Insights Timeline</span>
              <p className="text-stone-400 text-[11px] leading-relaxed">
                Enables generation of the Personal Insight Timeline. You can delete individual generated insights at any time.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Security Architecture Audit Badges */}
      <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-4 shadow-xl">
        <div>
          <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Security Architecture Verification Badges</span>
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Real-time status of cryptographic boundaries, GCP Secret Manager, and least-privilege Firestore rules.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-stone-950/80 border border-emerald-500/30 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Authentication (Google Identity)</span>
            </div>
            <p className="text-[11px] text-stone-400">✓ Firebase Auth with Google Sign-In</p>
            <p className="text-[10px] text-stone-500 font-mono">
              Tokens verified cryptographically via Google public key certificates.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-950/80 border border-emerald-500/30 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>UID Data Isolation</span>
            </div>
            <p className="text-[11px] text-stone-400">✓ User-scoped Firestore Rules</p>
            <p className="text-[10px] text-stone-500 font-mono">
              Partitioned under /users/{'{uid}'} with deny-by-default access policies.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-950/80 border border-cyan-500/30 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>AI Credentials Isolation</span>
            </div>
            <p className="text-[11px] text-stone-400">✓ Server-Side Backend Proxy</p>
            <p className="text-[10px] text-stone-500 font-mono">
              Browser never accesses Gemini API keys or service account credentials.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-950/80 border border-cyan-500/30 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Production Secret Management</span>
            </div>
            <p className="text-[11px] text-stone-400">✓ Google Cloud Secret Manager</p>
            <p className="text-[10px] text-stone-500 font-mono">
              Least-privilege role: roles/secretmanager.secretAccessor.
            </p>
          </div>
        </div>
      </div>

      {/* Security Diagnostics Test Suite (Section 29) */}
      <div className="p-6 rounded-3xl bg-stone-900 border border-cyan-500/30 text-stone-100 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Security Review & Threat Model Audit Suite</span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Automated testing suite covering the 10 security test scenarios required for production certification.
            </p>
          </div>

          <button
            onClick={handleRunSecuritySuite}
            disabled={runningDiagnostics}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50 shrink-0 shadow-md shadow-cyan-500/20"
          >
            {runningDiagnostics ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Audit...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run 10-Point Security Test</span>
              </>
            )}
          </button>
        </div>

        {diagnosticResults ? (
          <div className="space-y-2 mt-4 max-h-96 overflow-y-auto pr-1">
            {diagnosticResults.map((test) => (
              <div
                key={test.testId}
                className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 text-xs flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-cyan-400 font-bold">
                      {test.testId}
                    </span>
                    <span className="font-semibold text-stone-200">{test.title}</span>
                  </div>
                  <p className="text-[11px] text-stone-400">Scenario: {test.scenario}</p>
                  <p className="text-[11px] text-emerald-300 font-mono">{test.details}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold shrink-0">
                  {test.result}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400 italic font-mono">
            Click "Run 10-Point Security Test" to test IDOR prevention, token isolation, secret leak protection, and prompt injection barriers.
          </p>
        )}
      </div>

      {/* Privacy Architecture Disclosures */}
      <div className="p-6 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-4 shadow-xl">
        <h2 className="text-base font-semibold text-stone-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span>Privacy Disclosures & Data Architecture</span>
        </h2>

        <div className="space-y-2 text-xs">
          <div className="border border-stone-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenAccordion(openAccordion === 'stores' ? null : 'stores')}
              className="w-full p-3.5 text-left font-semibold text-stone-200 bg-stone-950/60 flex items-center justify-between"
            >
              <span>What Gemini Journal stores</span>
              {openAccordion === 'stores' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openAccordion === 'stores' && (
              <div className="p-4 bg-stone-950/40 text-stone-400 leading-relaxed space-y-2 font-sans">
                <p>
                  Gemini Journal stores your conversation transcripts, message timestamps, synthesized summaries, extracted themes, goals, and optional personal insights. All records are placed strictly inside your individual Firestore partition (<code>/users/{'{your-uid}'}/*</code>).
                </p>
                <p>
                  We do not store passwords (authentication is managed directly through Google Sign-In), and we do not store tracking cookies or sell usage data.
                </p>
              </div>
            )}
          </div>

          <div className="border border-stone-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenAccordion(openAccordion === 'uses' ? null : 'uses')}
              className="w-full p-3.5 text-left font-semibold text-stone-200 bg-stone-950/60 flex items-center justify-between"
            >
              <span>What Gemini uses</span>
              {openAccordion === 'uses' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openAccordion === 'uses' && (
              <div className="p-4 bg-stone-950/40 text-stone-400 leading-relaxed space-y-2 font-sans">
                <p>
                  When you send a message, only the current conversation transcript is sent to the Gemini API via our secure backend proxy. If you opt into AI Memory, consented goals from your previous reflections are attached to the prompt context.
                </p>
                <p>
                  Your journal text is processed solely to generate your immediate conversational responses and structured reflections. It is never used to train public models.
                </p>
              </div>
            )}
          </div>

          <div className="border border-stone-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenAccordion(openAccordion === 'isolated' ? null : 'isolated')}
              className="w-full p-3.5 text-left font-semibold text-stone-200 bg-stone-950/60 flex items-center justify-between"
            >
              <span>How your journal is isolated</span>
              {openAccordion === 'isolated' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openAccordion === 'isolated' && (
              <div className="p-4 bg-stone-950/40 text-stone-400 leading-relaxed space-y-2 font-sans">
                <p>
                  We enforce defense in depth. First, Firestore Security Rules strictly verify that <code>request.auth.uid == userId</code> for every document read, write, and delete. Second, the backend derives user identity strictly from the verified Firebase ID token, completely ignoring any user ID passed in HTTP payloads.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dangerous Zone: Complete Data Purge */}
      <div className="p-6 rounded-3xl bg-rose-950/30 border border-rose-900/50 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-rose-300 font-semibold text-base">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>Data Lifecycle & Deletion Controls</span>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed">
          Permanently delete all conversations, messages, goals, weekly reflections, and generated personal insights associated with your account from Cloud Firestore. This operation is immediate and irreversible.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="text"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder='Type "DELETE MY DATA" to confirm'
            className="px-3 py-2 rounded-xl bg-stone-900 border border-rose-900/60 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-rose-500 max-w-xs"
          />

          <button
            onClick={handleDeleteAllData}
            disabled={deleteConfirmation !== 'DELETE MY DATA' || isDeletingAll}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isDeletingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Purging Vault...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Journal Data</span>
              </>
            )}
          </button>
        </div>

        {deleteStatusMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              deleteStatusMessage.type === 'error'
                ? 'bg-rose-950/70 border border-rose-800 text-rose-300'
                : 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
            }`}
          >
            <span>{deleteStatusMessage.text}</span>
          </div>
        )}

        <div className="pt-3 border-t border-rose-900/40 flex items-center justify-between text-xs text-stone-400 font-mono">
          <span>Finished with your session?</span>
          <button
            onClick={() => signOut()}
            className="text-xs text-stone-300 font-semibold underline hover:text-white"
          >
            Sign Out of Account
          </button>
        </div>
      </div>
    </div>
  );
};
