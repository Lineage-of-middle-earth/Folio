import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  type Auth,
  type User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
];

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createPersistentAuth(): Auth {
  try {
    // Prefer browserLocalPersistence (localStorage) first so Google login survives
    // page reloads, tab closes, and embedded preview sessions reliably, with
    // indexedDBLocalPersistence as a fallback.
    return initializeAuth(app, {
      persistence: [browserLocalPersistence, indexedDBLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createPersistentAuth();

// Access token is intentionally kept in memory only (never localStorage/sessionStorage)
// per OAuth security requirements.
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;
let pendingTokenPromise: Promise<{ user: User; accessToken: string } | null> | null = null;

// Google OAuth access tokens typically live 60 minutes; refresh proactively after 55 minutes.
const ACCESS_TOKEN_TTL_MS = 55 * 60 * 1000;

function createGoogleProvider(loginHint?: string | null): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  for (const scope of WORKSPACE_SCOPES) {
    provider.addScope(scope);
  }
  if (loginHint) {
    provider.setCustomParameters({ login_hint: loginHint });
  } else {
    provider.setCustomParameters({ prompt: 'select_account' });
  }
  return provider;
}

async function ensureLocalPersistence(): Promise<void> {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    try {
      await setPersistence(auth, indexedDBLocalPersistence);
    } catch {
      // Fall back to existing persistence if browser storage is restricted
    }
  }
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: (user: User | null) => void
) => {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  void auth
    .authStateReady()
    .catch(() => undefined)
    .finally(() => {
      if (cancelled) return;
      unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
        if (isSigningIn) {
          // Let googleSignIn() finish extracting the OAuth access token before updating UI state.
          return;
        }
        if (user) {
          onAuthSuccess?.(user, getAccessToken());
        } else {
          clearAccessToken();
          onAuthFailure?.(null);
        }
      });
    });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
};

function formatAuthError(error: unknown): Error {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const rawMessage = error instanceof Error ? error.message : String(error || '');

  if (code === 'auth/popup-closed-by-user') {
    return new Error(
      "The sign-in window closed before completing. If Google showed 'Access blocked (Error 403)', the app is in Testing mode and that email must be added under Test Users in Google Cloud Console."
    );
  }
  if (code === 'auth/popup-blocked') {
    return new Error(
      'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.'
    );
  }
  if (code === 'auth/cancelled-popup-request') {
    return new Error('Sign-in was interrupted. Please click Sign in with Google again.');
  }
  if (code === 'auth/unauthorized-domain') {
    return new Error(
      'This preview domain is not listed under Authorized Domains in Firebase Authentication.'
    );
  }
  if (rawMessage.includes('access_denied')) {
    return new Error(
      'Google blocked sign-in (Error 403: access_denied). While in Testing mode, only developer-approved Test Users in Google Cloud Console can sign in.'
    );
  }
  return error instanceof Error ? error : new Error('Google sign-in failed.');
}

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  if (pendingTokenPromise) {
    return pendingTokenPromise;
  }

  pendingTokenPromise = (async () => {
    try {
      isSigningIn = true;
      await ensureLocalPersistence();
      const provider = createGoogleProvider(auth.currentUser?.email);
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to obtain Google Workspace access token.');
      }
      cachedAccessToken = credential.accessToken;
      cachedAccessTokenExpiresAt = Date.now() + ACCESS_TOKEN_TTL_MS;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (error) {
      throw formatAuthError(error);
    } finally {
      isSigningIn = false;
      pendingTokenPromise = null;
    }
  })();

  return pendingTokenPromise;
};

export const ensureAccessToken = async (): Promise<string | null> => {
  const validToken = getAccessToken();
  if (validToken) {
    return validToken;
  }
  if (!auth.currentUser) {
    return null;
  }
  const res = await googleSignIn();
  return res?.accessToken || null;
};

export const getAccessToken = (): string | null => {
  if (!cachedAccessToken) return null;
  if (cachedAccessTokenExpiresAt > 0 && Date.now() >= cachedAccessTokenExpiresAt) {
    cachedAccessToken = null;
    cachedAccessTokenExpiresAt = 0;
    return null;
  }
  return cachedAccessToken;
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = 0;
};

export const logout = async () => {
  clearAccessToken();
  await auth.signOut();
};
