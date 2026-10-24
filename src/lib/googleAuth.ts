import { supabase } from '../supabaseClient';
import { UserProfile, SchoolRole } from '../types';
import { dataStore } from './dataStore';
import { verifyGoogleEmailPreAuthorization } from './authSecurity';
import { logActivity } from './activityLogger';
import { verifyStaffRolePasscode } from './passcodeService';
import { activateStaffEmail, getSystemOfficialName } from './authorizedStaffService';
import { ROLE_LABELS_AR } from './permissions';
import {
  SYSTEM_OWNER_EMAIL,
  getDesignatedPrincipalEmail,
  getDesignatedPrincipalName,
  isSystemOwner,
  isDesignatedPrincipal,
} from './principalService';
import { isProfileComplete } from './profileGuard';

export const DIRECTOR_EMAIL = SYSTEM_OWNER_EMAIL;
export const OWNER_EMAIL = SYSTEM_OWNER_EMAIL;

/**
 * Returns Google OAuth client ID from environment
 */
export function getGoogleClientId(): string {
  const envClientId = (((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) || '').trim();
  return envClientId || '414952150687-c0u0tcl7sjdci5u3383m9pnl0288q85j.apps.googleusercontent.com';
}

/**
 * Constructs the official external Google OAuth 2.0 authorization URL
 */
export function buildGoogleOAuthUrl(intent: string = 'quick_login'): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const redirectUri = `${origin}/auth/callback`;
  const clientId = getGoogleClientId();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token id_token',
    scope: 'openid email profile',
    prompt: 'select_account',
    nonce: Math.random().toString(36).substring(2),
    state: intent,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Checks whether a genuine, active Google Cloud Console OAuth Client ID is available.
 */
export function isRealGoogleClientIdAvailable(): boolean {
  const envClientId = getGoogleClientId();
  return Boolean(envClientId && envClientId.endsWith('.apps.googleusercontent.com'));
}

/**
 * Detects whether the current execution is within development, preview, or cloud editor environment.
 */
export function isPreviewOrDevEnvironment(): boolean {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('run.app') ||
    hostname.includes('aistudio') ||
    Boolean(window.top && window.top !== window)
  );
}

/**
 * Real official Google OAuth is always enabled with genuine VITE_GOOGLE_CLIENT_ID
 */
export function shouldUseExternalGoogleOAuth(): boolean {
  return true;
}

/**
 * Clears all previous tokens, session markers, and cache in localStorage and sessionStorage
 * before redirecting to Google OAuth, preventing account mixing/bleed across sessions.
 */
export function clearAuthStorageForNewOAuth(intent: string = 'quick_login'): void {
  if (typeof window === 'undefined') return;
  try {
    // 1. Remove active session emails and cache
    localStorage.removeItem('school_active_session_email');
    localStorage.removeItem('safiah_oauth_event');
    localStorage.removeItem('safiah_cached_callback');
    localStorage.removeItem('safiah_last_oauth_payload');
    sessionStorage.removeItem('safiah_cached_callback');
    sessionStorage.removeItem('safiah_last_oauth_payload');

    // 2. Remove all Supabase auth and stale OAuth tokens from storage
    const localKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token') || key.includes('safiah_oauth_'))) {
        if (key !== 'safiah_oauth_intent') {
          localKeysToRemove.push(key);
        }
      }
    }
    localKeysToRemove.forEach((k) => localStorage.removeItem(k));

    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token') || key.includes('safiah_oauth_'))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));

    // 3. Set fresh intent
    localStorage.setItem('safiah_oauth_intent', intent);
  } catch (err) {
    console.warn('[GoogleAuth] Error clearing auth storage:', err);
  }
}

/**
 * Redirects user directly to official external Google OAuth page (accounts.google.com)
 */
export function redirectToGoogleOAuth(
  intent: string = 'quick_login'
): Window | null {
  if (typeof window === 'undefined') return null;

  // Clear all previous sessions and tokens before initiating Google login
  clearAuthStorageForNewOAuth(intent);

  const googleAuthUrl = buildGoogleOAuthUrl(intent);
  const isIframe = typeof window !== 'undefined' && window.top !== window.self;

  // In embedded preview iframe, opening in a new tab avoids Google's X-Frame-Options 403 block
  if (isIframe) {
    try {
      const opened = window.open(googleAuthUrl, '_blank');
      if (opened) return opened;
    } catch (err) {
      console.warn('[Google OAuth] window.open blocked, redirecting window:', err);
    }
  }

  // Official browser window redirect
  window.location.href = googleAuthUrl;
  return null;
}

/**
 * Initiates official Google OAuth login with Preview/Production auto-detection
 */
export async function initiateGoogleOAuthLogin(intent?: string): Promise<Window | null> {
  return redirectToGoogleOAuth(intent || 'quick_login');
}

/**
 * Decodes a JWT token without external libraries, handling URL-safe base64 and missing padding
 */
export function decodeJwt(token: string): {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
} {
  try {
    if (!token || typeof token !== 'string') return {};
    const parts = token.split('.');
    const base64Url = parts.length >= 2 ? parts[1] : parts[0];
    if (!base64Url) return {};
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
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
 * Processes Google Credential from Google One Tap or Google Sign-In SDK.
 * STRICT ENFORCEMENT:
 * - Checks whether the Google email exists in the school database.
 * - If not authorized: login is rejected, user is signed out, NO NEW ACCOUNT IS CREATED.
 * - If authorized: user enters directly with their registered school role & permissions.
 */
export async function handleGoogleCredential(credential: string): Promise<{
  user: any;
  profile: UserProfile;
}> {
  const decoded = decodeJwt(credential);
  console.log('[GoogleAuth] Decoded Google token payload for verification:', decoded.email);

  const cleanEmail = (decoded.email || '').trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('تعذر قراءة عنوان البريد الإلكتروني من حساب Google.');
  }

  // 1. Authoritative Pre-Authorization Check
  const authCheck = await verifyGoogleEmailPreAuthorization(cleanEmail);
  if (!authCheck.isAuthorized || !authCheck.profile) {
    // Attempt signout from Supabase to prevent unauthorized dangling session
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }

    await logActivity({
      actorId: 'google_oauth_gate',
      actorName: decoded.name || 'مستخدم غير مصرح',
      actorEmail: cleanEmail,
      action: 'UNAUTHORIZED_LOGIN_ATTEMPT',
      entity: 'auth',
      entityId: cleanEmail,
      details: `رفض محاولة دخول عبر Google لبريد غير مصرح به (${cleanEmail})`,
    });

    throw new Error(
      authCheck.reason || 'هذا البريد غير مسجل لدى المدرسة.'
    );
  }

  // 2. Sign In to Supabase Auth using the Google ID Token if supported
  let authUser: any = null;
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential,
    });

    if (!authError && authData?.user) {
      authUser = authData.user;
    }
  } catch (err) {
    console.warn('[GoogleAuth] Notice during signInWithIdToken:', err);
  }

  const preExistingProfile = authCheck.profile;
  const officialName = getSystemOfficialName(cleanEmail, preExistingProfile.name);
  const finalProfile: UserProfile = {
    ...preExistingProfile,
    name: officialName,
    photoURL: decoded.picture || preExistingProfile.photoURL,
    lastLoginAt: new Date().toISOString(),
  };

  // Sync with local store
  dataStore.syncUserProfileFromRemote(finalProfile);

  // Success audit log
  await logActivity({
    actorId: finalProfile.id,
    actorName: finalProfile.name,
    actorEmail: finalProfile.email,
    action: 'LOGIN',
    entity: 'users',
    entityId: finalProfile.id,
    details: `تسجيل دخول ناجح عبر Google بحساب معتمد (${finalProfile.name}) - الدور: (${finalProfile.school_role})`,
  });

  return {
    user: authUser || {
      id: finalProfile.id,
      email: cleanEmail,
      displayName: finalProfile.name,
      user_metadata: { name: finalProfile.name, avatar_url: finalProfile.photoURL },
    },
    profile: finalProfile,
  };
}

/**
 * Direct Google Email Verification Login:
 * Authenticates user by their Google Email ONLY IF PRE-AUTHORIZED in school database.
 * Never creates new unapproved accounts.
 */
export async function authenticateGoogleAccountDirectly(
  email: string,
  providedName?: string,
  photoURL?: string
): Promise<{ user: any; profile: UserProfile }> {
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Authoritative Pre-Authorization Check
  const authCheck = await verifyGoogleEmailPreAuthorization(cleanEmail);
  if (!authCheck.isAuthorized || !authCheck.profile) {
    await logActivity({
      actorId: 'google_direct_gate',
      actorName: providedName || 'مستخدم غير مصرح',
      actorEmail: cleanEmail,
      action: 'UNAUTHORIZED_LOGIN_ATTEMPT',
      entity: 'auth',
      entityId: cleanEmail,
      details: `رفض محاولة دخول بالبريد (${cleanEmail}) لعدم وجود حساب مدرسي مسبق`,
    });

    throw new Error(
      authCheck.reason || 'هذا البريد غير مسجل لدى المدرسة.'
    );
  }

  const authorizedProfile = authCheck.profile;
  const officialName = getSystemOfficialName(cleanEmail, authorizedProfile.name);
  const updatedProfile: UserProfile = {
    ...authorizedProfile,
    name: officialName,
    photoURL: photoURL || authorizedProfile.photoURL,
    lastLoginAt: new Date().toISOString(),
  };

  dataStore.syncUserProfileFromRemote(updatedProfile);

  await logActivity({
    actorId: updatedProfile.id,
    actorName: updatedProfile.name,
    actorEmail: updatedProfile.email,
    action: 'LOGIN',
    entity: 'users',
    entityId: updatedProfile.id,
    details: `تسجيل دخول ناجح بحساب Google المعتمد (${updatedProfile.name}) - الدور: (${updatedProfile.school_role})`,
  });

  return {
    user: {
      id: updatedProfile.id,
      email: cleanEmail,
      displayName: updatedProfile.name,
      user_metadata: { name: updatedProfile.name, avatar_url: updatedProfile.photoURL },
    },
    profile: updatedProfile,
  };
}

/**
 * Helper to check whether a user profile is fully completed according to school security rules.
 * For students: Requires valid 10-digit National ID AND 10-digit Saudi mobile phone AND completed status.
 */
export function isUserProfileCompleted(profile: UserProfile): boolean {
  return isProfileComplete(profile, profile.email);
}

/**
 * Register or Authenticate a User with Google:
 * Implements the complete multi-tier flow required:
 * - Quick Sign-In: If already exists and completed, enters instantly in 1 second.
 * - If not completed: blocks and directs to complete profile.
 * - Staff registration: requires pre-registered email + role passcode.
 * - Student/Parent registration: creates account in 'needs_completion' status.
 * - System Owner / Principal: enter directly with full authority, exempt from profile completion.
 */
export async function registerOrAuthenticateWithGoogle(params: {
  email: string;
  role?: SchoolRole;
  passcode?: string;
  providedName?: string;
  photoURL?: string;
}): Promise<{ user: any; profile: UserProfile; isFirstTime: boolean }> {
  const cleanEmail = (params.email || '').trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('يرجى إدخال عنوان بريد Google صحيح.');
  }

  // Strictly block self-registration as Director
  if (params.role === 'director' && !isSystemOwner(cleanEmail)) {
    throw new Error('يمنع منعاً باتاً إنشاء حساب مديرة ثانٍ أو التسجيل الذاتي لرتبة المديرة. حساب المديرة يُعين حصراً عبر مالك النظام.');
  }

  // 1. System Owner (مالك النظام) or Designated Principal (المديرة)
  if (isSystemOwner(cleanEmail) || isDesignatedPrincipal(cleanEmail)) {
    const authRes = await authenticateGoogleAccountDirectly(cleanEmail, params.providedName, params.photoURL);
    return {
      user: authRes.user,
      profile: authRes.profile,
      isFirstTime: false,
    };
  }

  // 2. Quick Sign-In (When no specific role is specified)
  if (!params.role) {
    const authCheck = await verifyGoogleEmailPreAuthorization(cleanEmail);
    if (!authCheck.isAuthorized || !authCheck.profile) {
      throw new Error(
        'هذا البريد غير مسجل لدى المدرسة.'
      );
    }

    const authRes = await authenticateGoogleAccountDirectly(cleanEmail, params.providedName, params.photoURL);
    const isCompleted = isUserProfileCompleted(authRes.profile);
    return {
      user: authRes.user,
      profile: authRes.profile,
      isFirstTime: !isCompleted,
    };
  }

  // 3. Registration / First-Time Activation: Staff (المعلمة، المشرفة، الإدارية، المرشدة الطلابية)
  if (['teacher', 'supervisor', 'administrator', 'counselor'].includes(params.role)) {
    const staffRole = params.role as 'teacher' | 'supervisor' | 'administrator' | 'counselor';

    // Condition 1: Must enter correct Role Security Passcode matching THIS EXACT ROLE
    const passcodeValidation = verifyStaffRolePasscode(staffRole, params.passcode || '');
    if (!passcodeValidation.isValid) {
      throw new Error(
        passcodeValidation.message ||
          'تعذر التفعيل، يرجى التأكد من البيانات المدخلة والمحاولة مرة أخرى.'
      );
    }

    // Condition 2: Email must be pre-authorized by administration in database
    const authCheck = await verifyGoogleEmailPreAuthorization(cleanEmail);
    if (!authCheck.isAuthorized || !authCheck.profile) {
      throw new Error(
        'هذا البريد الإلكتروني غير مضاف في قائمة منسوبات المدرسة المصرح لهن من قبل الإدارة. يرجى التواصل مع إدارة المدرسة لإضافة بريدكِ أولاً.'
      );
    }

    // Authorized staff member with valid passcode -> ACTIVATE ACCOUNT IMMEDIATELY!
    const profile = authCheck.profile;
    const resolvedName = getSystemOfficialName(cleanEmail, profile.name);

    profile.school_role = staffRole;
    profile.name = resolvedName;
    const isCompleted = isProfileComplete(profile, cleanEmail);
    profile.accountStatus = isCompleted ? 'completed' : 'needs_completion';
    profile.account_status = isCompleted ? 'completed' : 'needs_completion';
    profile.is_profile_completed = isCompleted;
    profile.is_profile_complete = isCompleted;
    profile.status = 'active';

    // Mark as activated in authorizedStaffService
    try {
      await activateStaffEmail({
        email: cleanEmail,
        role: staffRole,
        name: resolvedName,
      });
    } catch (e) {
      console.warn('[googleAuth] activateStaffEmail notice:', e);
    }

    // Sync to Supabase
    try {
      await supabase.from('users').upsert({
        id: profile.id,
        email: cleanEmail,
        name: resolvedName,
        school_role: staffRole,
        account_status: profile.accountStatus,
        status: 'active',
        is_profile_completed: isCompleted,
        is_profile_complete: isCompleted,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[googleAuth] Supabase upsert notice:', e);
    }

    // Sync to local dataStore
    dataStore.syncUserProfileFromRemote(profile);

    // Audit Log
    await logActivity({
      actorId: profile.id,
      actorName: resolvedName,
      actorEmail: cleanEmail,
      action: 'UPDATE_ROLE',
      entity: 'users',
      entityId: profile.id,
      details: `تم تفعيل حساب المنسوبة (${resolvedName}) بنجاح لأول مرة برتبة (${ROLE_LABELS_AR[staffRole]}) بعد التحقق التام من رمز الأمان الوظيفي ومطابقته لقاعدة البيانات`,
    });

    return {
      user: {
        id: profile.id,
        email: cleanEmail,
        displayName: resolvedName,
      },
      profile,
      isFirstTime: !isCompleted,
    };
  }

  // 4. Registration: Student (الطالبة)
  if (params.role === 'student') {
    const existing = await verifyGoogleEmailPreAuthorization(cleanEmail);
    if (existing.isAuthorized && existing.profile) {
      return {
        user: { id: existing.profile.id, email: cleanEmail, displayName: existing.profile.name },
        profile: existing.profile,
        isFirstTime: !isUserProfileCompleted(existing.profile),
      };
    }

    // New student profile initialized in 'needs_completion'
    const newStudentProfile: UserProfile = {
      id: `stu_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
      name: params.providedName || cleanEmail.split('@')[0],
      email: cleanEmail,
      school_role: 'student',
      status: 'active',
      accountStatus: 'needs_completion',
      account_status: 'needs_completion',
      is_profile_completed: false,
      is_profile_complete: false,
      phone: '',
      nationalId: '',
      customPermissions: [],
      temporaryPermissions: [],
      createdAt: new Date().toISOString(),
    };

    dataStore.syncUserProfileFromRemote(newStudentProfile);

    return {
      user: {
        id: newStudentProfile.id,
        email: cleanEmail,
        displayName: newStudentProfile.name,
      },
      profile: newStudentProfile,
      isFirstTime: true,
    };
  }

  // 5. Registration: Parent (ولي الأمر)
  if (params.role === 'parent') {
    const existing = await verifyGoogleEmailPreAuthorization(cleanEmail);
    if (existing.isAuthorized && existing.profile) {
      return {
        user: { id: existing.profile.id, email: cleanEmail, displayName: existing.profile.name },
        profile: existing.profile,
        isFirstTime: existing.profile.accountStatus !== 'completed',
      };
    }

    // New parent profile initialized in 'needs_completion'
    const newParentProfile: UserProfile = {
      id: `parent_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
      name: params.providedName || 'ولي أمر',
      email: cleanEmail,
      school_role: 'parent',
      status: 'active',
      accountStatus: 'needs_completion',
      customPermissions: [],
      temporaryPermissions: [],
      createdAt: new Date().toISOString(),
    };

    dataStore.syncUserProfileFromRemote(newParentProfile);

    return {
      user: {
        id: newParentProfile.id,
        email: cleanEmail,
        displayName: newParentProfile.name,
      },
      profile: newParentProfile,
      isFirstTime: true,
    };
  }

  throw new Error('نوع الحساب المحدد غير مدعوم.');
}

