import { supabase } from '../supabaseClient';
import { UserProfile, SchoolRole } from '../types';
import { dataStore } from './dataStore';
import { verifyGoogleEmailPreAuthorization } from './authSecurity';
import { logActivity } from './activityLogger';
import { verifyStaffRolePasscode } from './passcodeService';

export const DIRECTOR_EMAIL = 'moyara743@gmail.com';
export const OWNER_EMAIL = DIRECTOR_EMAIL;

/**
 * Returns Google OAuth client ID from environment
 */
export function getGoogleClientId(): string {
  const envClientId = (((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) || '').trim();
  return envClientId;
}

/**
 * Initiates official Google OAuth Redirect Flow via Supabase Auth.
 * When user returns, their email is strictly verified against pre-existing school accounts.
 */
export async function initiateGoogleOAuthLogin(): Promise<void> {
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('[GoogleAuth] signInWithOAuth error:', error);
    throw new Error(error.message || 'تعذر بدء عملية تسجيل الدخول عبر Google');
  }
}

/**
 * Decodes a JWT token without external libraries
 */
export function decodeJwt(token: string): {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
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
      authCheck.reason ||
        'هذا البريد الإلكتروني غير مرتبط بحساب مصرح به في المدرسة. يرجى التواصل مع إدارة المدرسة.'
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
  const finalProfile: UserProfile = {
    ...preExistingProfile,
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
      authCheck.reason ||
        'هذا البريد الإلكتروني غير مرتبط بحساب مصرح به في المدرسة. يرجى التواصل مع إدارة المدرسة.'
    );
  }

  const authorizedProfile = authCheck.profile;
  const updatedProfile: UserProfile = {
    ...authorizedProfile,
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
 * Register or Authenticate a User with Google:
 * Implements the complete multi-tier flow required:
 * - Quick Sign-In: If already exists and completed, enters instantly in 1 second.
 * - If not completed: blocks and directs to complete profile.
 * - Staff registration: requires pre-registered email + role passcode.
 * - Student/Parent registration: creates account in 'needs_completion' status.
 * - Principal: moyara743@gmail.com enters directly with full authority.
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

  // 1. Principal (المديرة)
  if (cleanEmail === DIRECTOR_EMAIL.toLowerCase()) {
    const authRes = await authenticateGoogleAccountDirectly(cleanEmail, params.providedName, params.photoURL);
    return {
      user: authRes.user,
      profile: authRes.profile,
      isFirstTime: authRes.profile.accountStatus !== 'completed',
    };
  }

  // 2. Quick Sign-In (When no specific role is specified)
  if (!params.role) {
    const authCheck = await verifyGoogleEmailPreAuthorization(cleanEmail);
    if (!authCheck.isAuthorized || !authCheck.profile) {
      throw new Error(
        'هذا البريد الإلكتروني غير مسجل بعد في المنصة المدرسية. يرجى استخدام قسم «التسجيل لأول مرة» لاختيار فئتك وإكمال بياناتك.'
      );
    }

    const authRes = await authenticateGoogleAccountDirectly(cleanEmail, params.providedName, params.photoURL);
    const isCompleted = authRes.profile.accountStatus === 'completed';
    return {
      user: authRes.user,
      profile: authRes.profile,
      isFirstTime: !isCompleted,
    };
  }

  // 3. Registration: Staff (المعلمة، المشرفة، الإدارية، المرشدة الطلابية)
  if (['teacher', 'supervisor', 'administrator', 'counselor'].includes(params.role)) {
    const staffRole = params.role as 'teacher' | 'supervisor' | 'administrator' | 'counselor';

    // Condition 1: Must enter correct Role Security Passcode
    const passcodeValidation = verifyStaffRolePasscode(staffRole, params.passcode || '');
    if (!passcodeValidation.isValid) {
      throw new Error(
        passcodeValidation.message ||
          'رمز الأمان الوظيفي المدخل غير صحيح. يرجى الحصول على الرمز المعتمد من إدارة المدرسة.'
      );
    }

    // Condition 2: Email must be pre-registered by administration in database
    const authCheck = await verifyGoogleEmailPreAuthorization(cleanEmail);
    if (!authCheck.isAuthorized || !authCheck.profile) {
      throw new Error(
        'هذا البريد الإلكتروني غير مضاف في قاعدة بيانات منسوبات المدرسة من قبل الإدارة. يرجى مراجعة إدارة المدرسة لإضافة بريدكِ أولاً.'
      );
    }

    // Authorized staff member with valid passcode
    const profile = authCheck.profile;
    profile.school_role = staffRole;
    dataStore.syncUserProfileFromRemote(profile);

    return {
      user: {
        id: profile.id,
        email: cleanEmail,
        displayName: profile.name,
      },
      profile,
      isFirstTime: profile.accountStatus !== 'completed',
    };
  }

  // 4. Registration: Student (الطالبة)
  if (params.role === 'student') {
    const existing = await verifyGoogleEmailPreAuthorization(cleanEmail);
    if (existing.isAuthorized && existing.profile) {
      return {
        user: { id: existing.profile.id, email: cleanEmail, displayName: existing.profile.name },
        profile: existing.profile,
        isFirstTime: existing.profile.accountStatus !== 'completed',
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

