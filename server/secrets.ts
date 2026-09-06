import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

interface SecretStatus {
  source: 'google-cloud-secret-manager' | 'environment-variable' | 'unconfigured';
  secretName: string;
  projectId?: string;
  isEncryptedInTransit: boolean;
  leastPrivilegeRole: string;
}

let cachedGeminiKey: string | null = null;
let cachedStatus: SecretStatus | null = null;

/**
 * Retrieves the Gemini API Key using Google Cloud Secret Manager for production,
 * with graceful fallback to process.env.GEMINI_API_KEY for local/AI Studio dev environments.
 */
export async function getGeminiApiKey(): Promise<{ apiKey: string; status: SecretStatus }> {
  if (cachedGeminiKey && cachedStatus) {
    return { apiKey: cachedGeminiKey, status: cachedStatus };
  }

  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'challenge1-496221';
  const secretName = process.env.GEMINI_SECRET_NAME || `projects/${projectId}/secrets/GEMINI_API_KEY/versions/latest`;

  // Attempt Google Cloud Secret Manager first if credentials / environment permit
  try {
    const client = new SecretManagerServiceClient();
    const accessPromise = client.accessSecretVersion({
      name: secretName,
    });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Secret Manager lookup timeout')), 2500)
    );
    const [version] = await Promise.race([accessPromise, timeoutPromise]);

    const payload = version.payload?.data?.toString();
    if (payload && payload.trim().length > 0) {
      cachedGeminiKey = payload.trim();
      cachedStatus = {
        source: 'google-cloud-secret-manager',
        secretName,
        projectId,
        isEncryptedInTransit: true,
        leastPrivilegeRole: 'roles/secretmanager.secretAccessor',
      };
      return { apiKey: cachedGeminiKey, status: cachedStatus };
    }
  } catch (err) {
    // Secret Manager might not be provisioned in container dev environment; proceed to fallback
  }

  // Fallback to server-side environment variable (e.g., provided by AI Studio)
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 0) {
    cachedGeminiKey = envKey.trim();
    cachedStatus = {
      source: 'environment-variable',
      secretName: 'GEMINI_API_KEY (Server Env fallback; production targets GCP Secret Manager)',
      projectId,
      isEncryptedInTransit: true,
      leastPrivilegeRole: 'roles/secretmanager.secretAccessor',
    };
    return { apiKey: cachedGeminiKey, status: cachedStatus };
  }

  // No key found
  cachedStatus = {
    source: 'unconfigured',
    secretName,
    projectId,
    isEncryptedInTransit: false,
    leastPrivilegeRole: 'roles/secretmanager.secretAccessor',
  };
  throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY or configure GCP Secret Manager.');
}

/**
 * Returns current secret source status for security diagnostics UI without exposing any key material.
 */
export async function getSecretStatus(): Promise<SecretStatus> {
  if (cachedStatus) {
    return cachedStatus;
  }
  try {
    const { status } = await getGeminiApiKey();
    return status;
  } catch {
    const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'challenge1-496221';
    return {
      source: 'unconfigured',
      secretName: `projects/${projectId}/secrets/GEMINI_API_KEY/versions/latest`,
      projectId,
      isEncryptedInTransit: false,
      leastPrivilegeRole: 'roles/secretmanager.secretAccessor',
    };
  }
}
