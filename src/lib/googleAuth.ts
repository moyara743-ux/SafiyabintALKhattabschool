import { supabase } from '../supabaseClient';
import { OWNER_EMAIL } from '../data/initialData';
import { dataStore } from './dataStore';
import { UserProfile, SchoolRole } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string; select_by?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            itp_support?: boolean;
            context?: string;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
            }
          ) => void;
          prompt: (momentNotification?: (notification: any) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const STORAGE_KEY_CLIENT_ID = 'school_google_client_id';

/**
 * Retrieves the Google Client ID configured via Vite environment or localStorage.
 */
export function getGoogleClientId(): string {
  const envId = ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string) || '';
  if (envId.trim()) return envId.trim();

  const saved = localStorage.getItem(STORAGE_KEY_CLIENT_ID) || '';
  return saved.trim();
}

/**
 * Persists custom Google Client ID to localStorage.
 */
export function setGoogleClientId(id: string): void {
  if (id.trim()) {
    localStorage.setItem(STORAGE_KEY_CLIENT_ID, id.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_CLIENT_ID);
  }
}

/**
 * Safely decodes a Google JWT ID Token without external dependencies.
 */
export function decodeJwt(token: string): {
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
  email_verified?: boolean;
  [key: string]: any;
} {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return {};
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('[GoogleAuth] Failed to parse JWT token:', e);
    return {};
  }
}

/**
 * Processes Google Credential from Google One Tap or Google Sign-In SDK,
 * authenticates with Supabase using signInWithIdToken, and immediately stores
 * the user record in the Supabase `users` table.
 */
export async function handleGoogleCredential(credential: string): Promise<{
  user: any;
  profile: UserProfile;
}> {
  const decoded = decodeJwt(credential);
  console.log('[GoogleAuth] Decoded Google token payload:', decoded);

  const cleanEmail = (decoded.email || '').trim().toLowerCase();
  const displayName = decoded.name || cleanEmail.split('@')[0] || 'مستخدم Google';
  const photoURL = decoded.picture || undefined;

  const isOwner = cleanEmail === OWNER_EMAIL.toLowerCase();
  const isYaraAccount = cleanEmail === 'yaradrashed@gmail.com';
  const targetRole: SchoolRole = isOwner ? 'owner' : 'student';

  // 1. Authenticate with Supabase Auth using the Google ID Token
  let authUser: any = null;
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential,
    });

    if (authError) {
      console.warn('[GoogleAuth] signInWithIdToken error:', authError.message);
      // Fallback: If Supabase project doesn't have Google provider ID token enabled,
      // we still register/sync the user directly in Supabase DB
    } else if (authData?.user) {
      authUser = authData.user;
    }
  } catch (err) {
    console.warn('[GoogleAuth] Exception during signInWithIdToken:', err);
  }

  const userId = authUser?.id || `g_${decoded.sub || Math.random().toString(36).substring(2, 10)}`;

  // 2. Immediately store and sync in Supabase public.users table
  try {
    const upsertPayload: Record<string, any> = {
      name: isOwner ? 'يارا محمد راشد - مالك النظام' : isYaraAccount ? 'منال علي' : displayName,
      email: cleanEmail,
      school_role: targetRole,
      status: 'active',
      custom_permissions: [],
      updated_at: new Date().toISOString(),
    };

    // Only supply ID if it is a valid UUID
    const isValidUuid = Boolean(authUser?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUser.id));
    if (isValidUuid) {
      upsertPayload.id = authUser.id;
    }

    const { data: dbData, error: dbError } = await supabase
      .from('users')
      .upsert(upsertPayload, { onConflict: 'email' })
      .select();

    if (dbError) {
      console.warn('[GoogleAuth] Notice storing user in Supabase users table:', dbError.message);
    } else {
      console.log('[GoogleAuth] Successfully stored user in Supabase table:', dbData);
    }
  } catch (dbErr) {
    console.warn('[GoogleAuth] Exception writing user to Supabase:', dbErr);
  }

  // 3. Sync to local dataStore for immediate offline availability
  const userProfile: UserProfile = {
    id: userId,
    name: isOwner ? 'يارا محمد راشد - مالك النظام' : isYaraAccount ? 'منال علي' : displayName,
    email: cleanEmail,
    photoURL,
    school_role: targetRole,
    customPermissions: [],
    temporaryPermissions: [],
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  dataStore.syncUserProfileFromRemote(userProfile);

  return {
    user: authUser || {
      id: userId,
      email: cleanEmail,
      displayName,
      user_metadata: { name: displayName, avatar_url: photoURL },
    },
    profile: userProfile,
  };
}
