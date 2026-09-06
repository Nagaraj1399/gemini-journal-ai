import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  Upload,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Tag,
  HelpCircle,
  ListTodo,
  ArrowRight,
} from 'lucide-react';
import { requestImageReflection } from '../services/api';
import { createConversation, updateConversationSummary, saveSmartAction, addMessage } from '../services/firestoreService';

interface ImageJournalViewProps {
  userId: string;
  token: string;
  onOpenJournalDetail: (id: string) => void;
}

export const ImageJournalView: React.FC<ImageJournalViewProps> = ({
  userId,
  token,
  onOpenJournalDetail,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Analysis result
  const [analysisResult, setAnalysisResult] = useState<{
    title: string;
    description: string;
    reflectionNotes: string;
    suggestedThemes: string[];
    provocativeQuestions: string[];
    potentialActions: string[];
  } | null>(null);

  // Editable fields before saving
  const [editableTitle, setEditableTitle] = useState('');
  const [editableNotes, setEditableNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedJournalId, setSavedJournalId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelection = (file: File) => {
    setErrorMsg(null);
    setAnalysisResult(null);
    setSavedJournalId(null);

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Invalid file format. Please upload JPEG, PNG, or WebP images.');
      return;
    }

    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreviewUrl(dataUrl);
      // Extract pure base64
      const base64Str = dataUrl.split(',')[1];
      setBase64Data(base64Str);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!base64Data || !selectedFile) return;

    try {
      setIsAnalyzing(true);
      setErrorMsg(null);

      const result = await requestImageReflection(token, {
        imageBase64: base64Data,
        mimeType: selectedFile.type,
        prompt: userPrompt.trim() || undefined,
      });

      setAnalysisResult(result);
      setEditableTitle(result.title);
      setEditableNotes(result.reflectionNotes);
    } catch (err: any) {
      console.error('Image reflection error:', err);
      setErrorMsg(err.message || 'Failed to analyze image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToJournal = async () => {
    if (!analysisResult || isSaving) return;

    try {
      setIsSaving(true);
      const journalTitle = (editableTitle || analysisResult.title || 'Multimodal Image Journal').trim();
      const journalNotes = (editableNotes || analysisResult.reflectionNotes || '').trim();

      const convId = await createConversation(userId, journalTitle);

      // Add user message with image preview if available
      await addMessage(userId, convId, {
        role: 'user',
        content: userPrompt.trim()
          ? `[Multimodal Photo Upload] ${userPrompt.trim()}`
          : `[Multimodal Photo Upload] Captured and reflected on image for "${journalTitle}"`,
        imageUrl: previewUrl || undefined,
      });

      // Add model reflection response
      await addMessage(userId, convId, {
        role: 'model',
        content: journalNotes,
      });

      await updateConversationSummary(userId, convId, {
        title: journalTitle,
        summary: journalNotes,
        themes: analysisResult.suggestedThemes || [],
        goals: analysisResult.potentialActions || [],
        openQuestions: analysisResult.provocativeQuestions || [],
      });

      // Save any potential actions to Smart Actions
      if (Array.isArray(analysisResult.potentialActions) && analysisResult.potentialActions.length > 0) {
        for (const act of analysisResult.potentialActions.slice(0, 3)) {
          if (act && act.trim()) {
            try {
              await saveSmartAction(userId, {
                title: act.trim(),
                category: 'Personal',
                urgency: 'medium',
                status: 'pending',
                sourceType: 'journal',
                sourceId: convId,
              });
            } catch (actionErr) {
              console.warn('Could not auto-create smart action:', actionErr);
            }
          }
        }
      }

      setSavedJournalId(convId);
    } catch (err: any) {
      console.error('Failed to save image journal:', err);
      setErrorMsg(err?.message || 'Failed to save to journal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6" id="image-journal-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-white/5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              Multimodal Journaling
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Image Journal</h1>
          <p className="text-sm text-slate-400">
            Upload whiteboard notes, sketches, handwritten journals, or moments to generate private multimodal reflections.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3 rounded-xl bg-rose-950/70 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Upload Stage */}
        <div className="lg:col-span-5 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[260px] ${
              previewUrl
                ? 'border-cyan-500/40 bg-slate-900/60'
                : 'border-white/10 hover:border-cyan-500/30 bg-slate-950/40 hover:bg-slate-900/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelection(e.target.files[0]);
                }
              }}
            />

            {previewUrl ? (
              <div className="relative w-full">
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="w-full max-h-56 object-contain rounded-xl shadow-md"
                  referrerPolicy="no-referrer"
                />
                <span className="block mt-2 text-xs text-slate-400">Click or drop to replace image</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  Drop an image here or browse
                </p>
                <p className="text-xs text-slate-500">
                  Supports JPEG, PNG, WebP up to 5MB
                </p>
              </div>
            )}
          </div>

          {previewUrl && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-white/5">
              <label className="block text-xs font-semibold text-slate-300">
                Optional Reflection Focus / Notes:
              </label>
              <textarea
                rows={2}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g., What should I focus on based on this whiteboard sketch?"
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
                id="analyze-image-btn"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Reflecting with Gemini 3.8 Flash...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Analyze & Generate Reflection
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Analysis Output & Saving */}
        <div className="lg:col-span-7">
          {analysisResult ? (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Multimodal Reflection
                </span>
                {savedJournalId && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Archived in Journal
                  </span>
                )}
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Title:
                </label>
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Reflection Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  AI Reflection Notes:
                </label>
                <textarea
                  rows={4}
                  value={editableNotes}
                  onChange={(e) => setEditableNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Themes & Questions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-[11px] text-cyan-400 font-semibold flex items-center gap-1 mb-1.5">
                    <Tag className="w-3 h-3" />
                    Identified Themes
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {analysisResult.suggestedThemes.map((t, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5">
                  <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 mb-1.5">
                    <HelpCircle className="w-3 h-3" />
                    Provocative Questions
                  </span>
                  <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                    {analysisResult.provocativeQuestions.slice(0, 2).map((q, idx) => (
                      <li key={idx} className="italic truncate">{q}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                {savedJournalId ? (
                  <button
                    onClick={() => onOpenJournalDetail(savedJournalId)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    View Saved Journal Entry
                  </button>
                ) : (
                  <button
                    onClick={handleSaveToJournal}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5" />
                    )}
                    Confirm & Save to Private Journal
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full rounded-2xl bg-slate-900/40 border border-white/5 p-8 flex flex-col items-center justify-center text-center text-slate-500 min-h-[300px]">
              <ImageIcon className="w-10 h-10 mb-2 opacity-30 text-cyan-400" />
              <p className="text-sm font-medium text-slate-300 mb-1">Multimodal Intelligence</p>
              <p className="text-xs max-w-sm">
                Select or drag a photo on the left. Gemini will process visual cues, extract themes, and structure reflection notes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
