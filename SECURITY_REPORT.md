# GEMINI JOURNAL — SECURITY AUDIT & THREAT MODEL REPORT

**Application**: Gemini Journal (Private AI Thinking Space)  
**Target Platform**: Cloud Run / Node.js Express + React / Firebase Firestore / Google Cloud Secret Manager  
**Project ID**: challenge1-496221  
**Audit Date**: September 2026  
**Status**: PASSED ALL 10 PRODUCTION CERTIFICATION CRITERIA  

---

## 1. Executive Summary

Gemini Journal is architected around a strict **zero-trust boundary** between the browser and backend services. Recognizing that personal journaling requires uncompromising confidentiality, user data is protected through multi-layered cryptographic isolation:
1. **No Client-Side Secrets**: Neither the Gemini API key nor service account credentials ever enter the browser DOM or JavaScript bundles.
2. **Deterministic Identity Derivation**: User identities are derived strictly from cryptographically verified Firebase ID tokens; client-supplied identifiers in query params or request bodies are ignored.
3. **Defense-in-Depth Firestore Rules**: The database enforces user isolation at the root level using deny-by-default rules requiring `request.auth.uid == userId`.
4. **Least-Privilege Secret Management**: Production credentials reside in Google Cloud Secret Manager, accessible only to the backend runtime via `roles/secretmanager.secretAccessor`.

---

## 2. Threat Model Analysis

### Threat Vector 1: Insecure Direct Object Reference (IDOR)
* **Risk**: Attacker modifies a document ID or user ID in an HTTP request to inspect another user's journal or messages.
* **Mitigation**:
  * **Backend**: The `requireAuth` middleware validates the JWT bearer token against Google's public key infrastructure and attaches `req.user.userId`. API routes use this trusted property exclusively.
  * **Firestore**: Path-level security rules enforce `request.auth.uid == userId` for all subcollections under `/users/{userId}`.

### Threat Vector 2: AI Credential Harvesting
* **Risk**: Malicious user reverse-engineers client JavaScript or intercepts network traffic to steal the Gemini API key.
* **Mitigation**:
  * Gemini API operations (`@google/genai`) are executed 100% server-side in `server/gemini.ts`.
  * The frontend communicates with `/api/chat`, `/api/journal/summary`, and `/api/journal/insights` through internal endpoints using session tokens.
  * The Gemini API key is loaded into backend memory from Google Cloud Secret Manager (`GEMINI_API_KEY`).

### Threat Vector 3: Cross-Site Scripting (XSS) via Model Output
* **Risk**: Gemini output contains malicious `<script>` tags, event handlers (`onload`), or `javascript:` URLs.
* **Mitigation**:
  * The application completely avoids `dangerouslySetInnerHTML`.
  * `SafeMarkdown.tsx` utilizes custom React node parsing to transform Markdown formatting into native, escaped React elements (`<p>`, `<strong>`, `<em>`, `<code>`), rendering injected scripts inert as harmless text.

### Threat Vector 4: Prompt Injection & System Jailbreaks
* **Risk**: Adversarial user submits input designed to coerce the model into leaking system instructions, internal secrets, or other users' data.
* **Mitigation**:
  * System instructions explicitly mandate that the model operates as a private journaling companion and strictly forbid disclosing system instructions, backend configuration, or secrets.
  * Conversations are strictly sandboxed: the backend only passes the current user's authenticated conversation history to the model.

### Threat Vector 5: API Abuse & Denial of Service
* **Risk**: Scripted attacks send thousands of rapid generation requests, exhausting quotas or driving up cloud costs.
* **Mitigation**:
  * A sliding-window rate limiter limits requests to 30 requests per minute per authenticated UID.
  * Express payload caps (512 KB) and per-message length caps (4,000 characters) prevent memory exhaustion.

---

## 3. Test Scenarios and Results (Section 29 Verification)

| Test ID | Test Scenario | Expected Outcome | Actual Result |
| :--- | :--- | :--- | :---: |
| **TEST 1** | Unauthenticated user accesses protected API routes (`/api/chat`, `/api/journal/*`) | HTTP 401 Unauthorized | **PASS** |
| **TEST 2** | User A supplies User B's UID in request payload | Server ignores body UID, binds operation to User A's token UID | **PASS** |
| **TEST 3** | User A attempts to read User B's Firestore documents directly | Firestore Security Rules reject read (`PERMANENT_PERMISSION_DENIED`) | **PASS** |
| **TEST 4** | User A modifies conversation ID to target another user's session | Access denied; path checks isolate to `users/{uid}` | **PASS** |
| **TEST 5** | Audit frontend bundle and network requests for Gemini secret key | No API keys found in bundle, headers, or client-side storage | **PASS** |
| **TEST 6** | Gemini response contains `<script>` or raw HTML tags | Safely rendered as escaped text via `SafeMarkdown.tsx` | **PASS** |
| **TEST 7** | Gemini returns malformed or non-JSON summarization response | Server-side validation rejects corrupted output and falls back cleanly | **PASS** |
| **TEST 8** | User attempts unauthorized deletion of another user's documents | Firestore rule enforces `request.auth.uid == userId`, request fails | **PASS** |
| **TEST 9** | User submits an payload exceeding length or size limits (>4,000 chars) | Request rejected with HTTP 400 Validation Error | **PASS** |
| **TEST 10**| Adversarial prompt injection asking to disclose secrets and instructions | Model deflects prompt injection, maintaining persona boundaries | **PASS** |

---

## 4. Conclusion

Gemini Journal satisfies all security, architectural, and data governance requirements outlined in the specification. The system is production-hardened and ready for deployment.
