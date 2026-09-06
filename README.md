# GEMINI JOURNAL
### *Your Private AI Thinking Space*
> **"AI that thinks with you, while keeping your thoughts private."**

An ideathon full-stack web application designed for private journaling, brainstorming, reflection, and decision-making powered by the Google Gemini API, Firebase Authentication, Cloud Firestore, and Google Cloud Secret Manager.

---

## 1. Project Overview

Gemini Journal is a private digital notebook enhanced by Gemini. Unlike generic chatbots, it operates under a strict **Zero-Trust, User-Scoped Privacy Boundary**:
1. **Multi-Turn Journaling Companion**: Engage in thoughtful, guided multi-turn conversations with Gemini designed to unpack decisions, reflect on experiences, and formulate goals.
2. **Automatic Journal Summarization**: At the end of a session, click *"Save as Journal Entry"* to trigger server-side synthesis into structured JSON records (`title`, `summary`, `themes`, `goals`, `openQuestions`).
3. **Personal Insight Timeline (Primary Ideathon Feature)**: Analyzes *only* the authenticated user's historical journal entries to detect recurring themes over time (e.g. noticing recurring thoughts about cloud certifications), tracking active goals, and offering proactive reflection prompts.
4. **Privacy & AI Memory Consent**: Explicit user toggles control whether long-term goals are remembered or used for reflections. Defaults strictly favor privacy.
5. **Permanent Data Lifecycle**: Users can delete individual journal entries, delete individual insights, or purge all account data permanently from Firestore.

---

## 2. Architecture & Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER (React)                   │
│  - Firebase Auth SDK (Google Sign-In)                       │
│  - Firestore Client SDK (Scoped directly to /users/{uid}/*) │
│  - Zero API Key exposure (NO AI keys in client bundles)     │
│  - Safe Markdown parser (No dangerouslySetInnerHTML, no XSS)│
└──────────────────────────────┬──────────────────────────────┘
                               │
               Bearer ID Token │ HTTPS /api/*
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXPRESS BACKEND PROXY                      │
│  - requireAuth Middleware (Cryptographic JWT verification)  │
│  - Identity Derivation (UID derived from verified token)    │
│  - Input Validation (Size caps, length bounds, type checks) │
│  - Per-UID Sliding Window Rate Limiter (30 req/min)         │
│  - Prompt Injection Armor in System Prompts                 │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌───────────────────────────────┐ ┌───────────────────────────┐
│     CLOUD SECRET MANAGER      │ │      GEMINI 2.5 API       │
│  - Production Credential Store│ │  - Server-side invocation │
│  - Secret: GEMINI_API_KEY     │ │  - Multi-turn thinking    │
│  - Least-privilege IAM:       │ │  - Structured JSON schema │
│    roles/secretmanager.       │ │  - No training on user data
│    secretAccessor             │ │                           │
└───────────────────────────────┘ └───────────────────────────┘
```

---

## 3. Technology Stack

* **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
* **Backend**: Node.js, Express, TypeScript (`tsx` in dev, `esbuild` bundled CJS in production).
* **Authentication**: Firebase Authentication with Google Sign-In (`GoogleAuthProvider`).
* **Database**: Cloud Firestore (User-scoped document model with strict security rules).
* **AI Intelligence**: `@google/genai` (Gemini 2.5 Flash).
* **Production Secret Management**: Google Cloud Secret Manager (`@google-cloud/secret-manager`) with fallback to server-side environment variables during local testing.

---

## 4. Firestore Data Model

All user data is strictly partitioned beneath the user's authenticated UID:

```
users/{uid}                                    # Root user record
users/{uid}/conversations/{conversationId}     # Conversation / Journal metadata
users/{uid}/conversations/{id}/messages/{msgId}# Individual turn messages
users/{uid}/insights/{insightId}               # Generated personal insights & themes
users/{uid}/settings/preferences               # User AI memory consent preferences
```

### Document Schemas:

#### Conversation Document (`users/{uid}/conversations/{conversationId}`):
```json
{
  "id": "conv_abc123",
  "title": "Exploring Distributed Systems",
  "summary": "Reflected on shifting technical focus toward high-scale backend design.",
  "themes": ["Career", "Systems Architecture", "Learning"],
  "goals": ["Build a prototype distributed consensus node in Go"],
  "openQuestions": ["Should I focus on Raft or Paxos first?"],
  "createdAt": 1757088000000,
  "updatedAt": 1757088500000
}
```

#### Message Document (`users/{uid}/conversations/{conversationId}/messages/{messageId}`):
```json
{
  "id": "msg_001",
  "role": "user",
  "content": "I want to transition from frontend to distributed systems.",
  "createdAt": 1757088010000
}
```

#### Insight Document (`users/{uid}/insights/{insightId}`):
```json
{
  "id": "ins_xyz999",
  "type": "recurring_theme",
  "title": "Recurring Focus: Systems Architecture",
  "description": "You have explored systems architecture across 3 journal sessions.",
  "frequency": 3,
  "relatedThemes": ["Backend", "Career", "Learning"],
  "reflectionPrompt": "You've returned to systems architecture several times. Would you like to build a 90-day learning plan?",
  "suggestedAction": "Start a focused conversation on milestone planning.",
  "createdAt": 1757089000000
}
```

---

## 5. Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all by default
    match /{document=**} {
      allow read, write: if false;
    }

    // User data is strictly isolated to their own authenticated UID
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /conversations/{conversationId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      match /insights/{insightId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /settings/{settingId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 6. Google Cloud Secret Manager Setup & Least-Privilege IAM

In production, the Gemini API key is stored in Google Cloud Secret Manager:

1. **Create the Secret**:
   ```bash
   gcloud secrets create GEMINI_API_KEY \
     --replication-policy="automatic" \
     --project="challenge1-496221"

   echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY \
     --data-file=- \
     --project="challenge1-496221"
   ```

2. **Grant Least-Privilege Role**:
   Grant the Cloud Run or backend service account *only* the Secret Accessor role:
   ```bash
   gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
     --member="serviceAccount:YOUR_SERVICE_ACCOUNT@challenge1-496221.iam.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor" \
     --project="challenge1-496221"
   ```

---

## 7. Security Testing & Threat Model Analysis

The built-in Security Diagnostics Suite in **Settings → Privacy** programmatically verifies the following 10 threat scenarios:

| Test ID | Scenario | Result | Verification & Defense Mechanism |
| :--- | :--- | :---: | :--- |
| **TEST-1** | Unauthenticated request to private API | **PASS** | `requireAuth` returns HTTP 401 Unauthorized. |
| **TEST-2** | Cross-User IDOR (injected `uid` in body) | **PASS** | Server rejects client-supplied UID; derives identity strictly from verified token. |
| **TEST-3** | Unauthorized Firestore collection access | **PASS** | `firestore.rules` enforces `request.auth.uid == userId` with deny-by-default. |
| **TEST-4** | Client-side credential leakage | **PASS** | `@google/genai` is invoked exclusively on backend. Zero keys bundled in frontend. |
| **TEST-5** | Oversized payload or buffer overflow | **PASS** | Express body limit (512kb) and per-message length cap (4,000 chars) enforced. |
| **TEST-6** | Malicious AI output / HTML injection | **PASS** | Structured JSON schema validation on backend + React element rendering (no raw HTML). |
| **TEST-7** | Prompt injection attacks | **PASS** | Rigid system instruction directives command model never to leak prompts or keys. |
| **TEST-8** | API burst abuse | **PASS** | In-memory sliding-window rate limiter (30 requests/minute per UID). |
| **TEST-9** | Error information leakage | **PASS** | Stack traces and internal file paths are masked; only friendly error strings returned. |
| **TEST-10**| Production secret management | **PASS** | Native GCP Secret Manager client integration with `roles/secretmanager.secretAccessor`. |

---

## 8. Known Limitations & Future Enhancements

* **Client-Side Search**: Journal search currently executes across the authenticated user's loaded entries in memory. For journals with >1,000 entries, server-side indexed full-text search could be introduced.
* **Offline PWA Sync**: Full offline queueing with Service Workers can be added to allow drafting journal thoughts when disconnected from the internet.
