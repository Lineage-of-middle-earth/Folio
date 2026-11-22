import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
for (const scope of WORKSPACE_SCOPES) {
  provider.addScope(scope);
}
provider.setCustomParameters({
  prompt: 'consent',
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: (user: User | null) => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthFailure?.(user);
      }
    } else {
      cachedAccessToken = null;
      onAuthFailure?.(null);
    }
  });
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
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Workspace access token.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    throw formatAuthError(error);
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
};

export const logout = async () => {
  cachedAccessToken = null;
  await auth.signOut();
};
