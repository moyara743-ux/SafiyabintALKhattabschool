import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { dataStore } from '../lib/dataStore';
import { UserProfile, SchoolRole, PermissionKey } from '../types';
import {
  ROLE_LABELS_AR,
  computeEffectivePermissions,
  hasPermission as checkPermission,
  canUserManageTarget,
} from '../lib/permissions';
import { logActivity } from '../lib/activityLogger';
import {
  handleGoogleCredential,
  authenticateGoogleAccountDirectly,
  initiateGoogleOAuthLogin,
} from '../lib/googleAuth';
import {
  checkLoginSecurityStatus,
  recordFailedLoginAttempt,
  resetLoginSecurityAttempts,
  validateEmailFormat,
  verifyStaffCredential,
  verifyGoogleEmailPreAuthorization,
} from '../lib/authSecurity';
import { authenticateStudentByNameAndSecret } from '../lib/studentService';

export const DIRECTOR_EMAIL = 'moyara743@gmail.com';
export const OWNER_EMAIL = DIRECTOR_EMAIL;

export interface AppUser {
  id: string;
  uid: string; // alias for id for backwards compatibility
  email?: string;
  displayName?: string;
  user_metadata?: Record<string, any>;
}

interface AuthContextType {
  user: AppUser | null;
  profile: UserProfile | null;
  loading: boolean;
  effectivePermissions: Set<PermissionKey>;
  hasPerm: (permission: PermissionKey) => boolean;
  canManage: (target: UserProfile) => boolean;
  isOwner: boolean;
  isDirector: boolean;
  roleLabel: string;
  login: (email: string, pass: string) => Promise<void>;
  loginStudent: (name: string, secret: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  loginWithGoogleAccount: (email: string, name?: string, photoURL?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to ensure current session user exists in dataStore & sync with Supabase
  const ensureUserSynced = async (authUser: { id: string; email?: string; user_metadata?: any }): Promise<UserProfile> => {
    const currentId = authUser.id;
    const currentEmail = (authUser.email || '').trim().toLowerCase();
    const isDirectorEmail = currentEmail === OWNER_EMAIL.toLowerCase();
    const isYaraAccount = currentEmail === 'yaradrashed@gmail.com';
    const currentName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      (isDirectorEmail ? 'يارا محمد راشد - مديرة المدرسة' : currentEmail.split('@')[0] || 'مستخدم');
    const defaultRole: SchoolRole = isDirectorEmail ? 'director' : 'student';

    // 1. FRESH FETCH DIRECTLY FROM SUPABASE public.users TABLE
    let dbUser: any = null;
    try {
      const isValidUuid = Boolean(currentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentId));

      if (isValidUuid) {
        const { data, error } = await supabase.from('users').select('*').eq('id', currentId).maybeSingle();
        if (!error && data) {
          dbUser = data;
        }
      }

      if (!dbUser && currentEmail) {
        const { data, error } = await supabase.from('users').select('*').eq('email', currentEmail).maybeSingle();
        if (!error && data) {
          dbUser = data;
        }
      }
    } catch (e) {
      console.warn('[AuthContext] Fresh fetch from Supabase users error:', e);
    }

    let activeProfile: UserProfile;

    if (dbUser) {
      let resolvedRole: SchoolRole = (dbUser.school_role as SchoolRole) || defaultRole;
      if (isDirectorEmail) {
        resolvedRole = 'director';
      } else if (isYaraAccount) {
        resolvedRole = 'student';
      }

      activeProfile = {
        id: dbUser.id || currentId,
        name: dbUser.name || currentName,
        email: currentEmail,
        school_role: resolvedRole,
        status: dbUser.status === 'disabled' ? 'disabled' : 'active',
        customPermissions: isYaraAccount ? [] : (Array.isArray(dbUser.custom_permissions) ? dbUser.custom_permissions : []),
        temporaryPermissions: [],
        createdAt: dbUser.created_at || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      dataStore.syncUserProfileFromRemote(activeProfile);
    } else {
      // Check dataStore
      const localUsers = await dataStore.getUsers();
      const localExisting = localUsers.find((u) => u.email && u.email.trim().toLowerCase() === currentEmail);

      let resolvedRole: SchoolRole = isDirectorEmail ? 'director' : (localExisting?.school_role || defaultRole);
      if (isYaraAccount) resolvedRole = 'student';

      activeProfile = {
        id: localExisting?.id || currentId,
        name: localExisting?.name || currentName,
        email: currentEmail,
        school_role: resolvedRole,
        status: localExisting?.status || 'active',
        customPermissions: isYaraAccount ? [] : (localExisting?.customPermissions || []),
        temporaryPermissions: [],
        createdAt: localExisting?.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      dataStore.syncUserProfileFromRemote(activeProfile);
    }

    return activeProfile;
  };

  // Auth state listener
  useEffect(() => {
    let isMounted = true;
    let subscription: any = null;

    const stopLoading = () => {
      if (isMounted) setLoading(false);
    };

    const authTimeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2500);

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const email = (session.user.email || '').trim().toLowerCase();

          // Authoritative check if user is allowed to access
          const authCheck = await verifyGoogleEmailPreAuthorization(email);
          if (!authCheck.isAuthorized) {
            console.warn('[AuthContext] Session user not pre-authorized:', email);
            await supabase.auth.signOut();
            if (isMounted) {
              setUser(null);
              setProfile(null);
            }
            return;
          }

          const appUser: AppUser = {
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.name,
            user_metadata: session.user.user_metadata,
          };
          setUser(appUser);
          const prof = await ensureUserSynced(session.user);
          if (isMounted) setProfile(prof);
        } else {
          // Check local stored session fallback
          const localSessionEmail = localStorage.getItem('school_active_session_email');
          if (localSessionEmail && isMounted) {
            const allUsers = await dataStore.getUsers();
            const found = allUsers.find(
              (u) => u.email && u.email.trim().toLowerCase() === localSessionEmail.trim().toLowerCase()
            );
            if (found && found.status !== 'disabled') {
              setUser({
                id: found.id,
                uid: found.id,
                email: found.email,
                displayName: found.name,
              });
              setProfile(found);
            }
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Session init error:', err);
      } finally {
        stopLoading();
      }
    };

    checkInitialSession();

    try {
      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          const email = (session.user.email || '').trim().toLowerCase();
          const authCheck = await verifyGoogleEmailPreAuthorization(email);

          if (!authCheck.isAuthorized) {
            console.warn('[AuthContext] Auto-signout unauthorized user:', email);
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            stopLoading();
            return;
          }

          const appUser: AppUser = {
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.name,
            user_metadata: session.user.user_metadata,
          };
          setUser(appUser);
          const prof = await ensureUserSynced(session.user);
          if (isMounted) setProfile(prof);
        } else {
          const localSessionEmail = localStorage.getItem('school_active_session_email');
          if (!localSessionEmail) {
            setUser(null);
            setProfile(null);
          }
        }
        stopLoading();
      });
      subscription = data?.subscription;
    } catch (listenerErr) {
      console.warn('[AuthContext] Error attaching onAuthStateChange listener:', listenerErr);
      stopLoading();
    }

    return () => {
      isMounted = false;
      if (authTimeoutId) clearTimeout(authTimeoutId);
      subscription?.unsubscribe?.();
    };
  }, []);

  /**
   * Staff & Parents Email/Password Login
   * - Rate-limited with lockout after 5 consecutive failed attempts
   * - Validates email format
   * - Rejects disabled accounts
   */
  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Email format validation
    if (!validateEmailFormat(cleanEmail)) {
      throw new Error('يرجى إدخال عنوان بريد إلكتروني صحيح.');
    }

    // 2. Brute Force Security Lockout Check
    const secStatus = checkLoginSecurityStatus(cleanEmail);
    if (secStatus.isLocked) {
      throw new Error(
        `تم قفل الحساب مؤقتاً بسبب تكرار المحاولات الفاشلة. يرجى المحاولة بعد ${secStatus.remainingMinutes} دقيقة أو مراجعة إدارة المدرسة.`
      );
    }

    let authUser: any = null;
    let authError: any = null;

    // Attempt 1: Supabase Auth Password Login
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });
      if (!error && data?.user) {
        authUser = data.user;
      } else {
        authError = error;
      }
    } catch (e: any) {
      authError = e;
    }

    // Attempt 2: If Supabase fails, verify local staff credentials (for admin-provisioned staff accounts)
    if (!authUser) {
      const isStaffMatch = await verifyStaffCredential(cleanEmail, pass);
      if (isStaffMatch) {
        const allUsers = await dataStore.getUsers();
        const staff = allUsers.find((u) => u.email && u.email.trim().toLowerCase() === cleanEmail);
        if (staff) {
          authUser = {
            id: staff.id,
            email: cleanEmail,
            user_metadata: { name: staff.name },
          };
          authError = null;
        }
      }
    }

    // Failed Login Handling
    if (!authUser) {
      const { isLocked, remainingMinutes, attemptsLeft } = await recordFailedLoginAttempt(
        cleanEmail,
        '(محاولة دخول بالبريد وكلمة المرور)'
      );

      if (isLocked) {
        throw new Error(
          `تم تجاوز الحد الأقصى للمحاولات الفاشلة (5 محاولات). تم قفل الحساب مؤقتاً لمدة ${remainingMinutes} دقيقة لدواعي الأمان المدرسية.`
        );
      }

      throw new Error(
        `بيانات الدخول غير صحيحة. متبقي لديكِ ${attemptsLeft} محاولات قبل قفل الحساب مؤقتاً.`
      );
    }

    // Reset Failed Attempts Counter on Success
    resetLoginSecurityAttempts(cleanEmail);

    const appUser: AppUser = {
      id: authUser.id,
      uid: authUser.id,
      email: authUser.email,
      displayName: authUser.user_metadata?.name,
      user_metadata: authUser.user_metadata,
    };
    setUser(appUser);

    const userProf = await ensureUserSynced(authUser);

    if (userProf.status === 'disabled') {
      await supabase.auth.signOut();
      localStorage.removeItem('school_active_session_email');
      setUser(null);
      setProfile(null);
      throw new Error('تم تعطيل هذا الحساب من قِبل إدارة المدرسة. يرجى التواصل مع الإدارة.');
    }

    setProfile(userProf);
    localStorage.setItem('school_active_session_email', cleanEmail);

    // Audit log
    await logActivity({
      actorId: authUser.id,
      actorName: userProf.name,
      actorEmail: cleanEmail,
      action: 'LOGIN',
      entity: 'users',
      entityId: authUser.id,
      details: `تسجيل دخول ناجح للمستخدم (${ROLE_LABELS_AR[userProf.school_role]})`,
    });
  };

  /**
   * Student Login using Name and Secret Code
   * - Confirms Name and Secret belong to the SAME student
   * - Rate-limited with lockout after 5 failed attempts
   */
  const loginStudent = async (name: string, secret: string) => {
    const cleanName = name.trim();

    if (!cleanName || !secret.trim()) {
      throw new Error('يرجى كتابة اسم الطالبة والرمز المخصص لها.');
    }

    // Security check on student name/secret identifier
    const secStatus = checkLoginSecurityStatus(cleanName);
    if (secStatus.isLocked) {
      throw new Error(
        `تم قفل تسجيل الدخول مؤقتاً لهذا الاسم بسبب تكرار المحاولات الفاشلة. يرجى الانتظار لمدة ${secStatus.remainingMinutes} دقيقة أو مراجعة إدارة المدرسة.`
      );
    }

    try {
      const { student, profile: studentProfile } = await authenticateStudentByNameAndSecret(
        cleanName,
        secret
      );

      resetLoginSecurityAttempts(cleanName);

      const appUser: AppUser = {
        id: studentProfile.id,
        uid: studentProfile.id,
        email: studentProfile.email,
        displayName: student.name,
      };

      setUser(appUser);
      setProfile(studentProfile);
      localStorage.setItem('school_active_session_email', studentProfile.email);
    } catch (err: any) {
      const { isLocked, remainingMinutes, attemptsLeft } = await recordFailedLoginAttempt(
        cleanName,
        '(محاولة دخول طالبة بالاسم والرمز)'
      );

      if (isLocked) {
        throw new Error(
          `تم قفل الدخول مؤقتاً لمدة ${remainingMinutes} دقيقة بعد 5 محاولات فاشلة. يرجى مراجعة إدارة المدرسة لاستلام الرمز المخصص.`
        );
      }

      throw new Error(
        err?.message || `بيانات الدخول غير صحيحة. متبقي ${attemptsLeft} محاولات قبل القفل المؤقت.`
      );
    }
  };

  /**
   * Initiates official Google Sign-In redirect
   */
  const signInWithGoogle = async () => {
    await initiateGoogleOAuthLogin();
  };

  /**
   * Processes Google Credential from Google One Tap / GIS Button
   */
  const loginWithGoogleCredential = async (credential: string) => {
    setLoading(true);
    try {
      const { user: authedUser, profile: authedProfile } = await handleGoogleCredential(credential);
      const appUser: AppUser = {
        id: authedUser.id,
        uid: authedUser.id,
        email: authedUser.email,
        displayName: authedProfile.name,
        user_metadata: authedUser.user_metadata,
      };
      setUser(appUser);
      setProfile(authedProfile);
      localStorage.setItem('school_active_session_email', authedUser.email || '');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Direct Google Account Verification Login (Strict pre-authorization check)
   */
  const loginWithGoogleAccount = async (email: string, name?: string, photoURL?: string) => {
    setLoading(true);
    try {
      const { user: authedUser, profile: authedProfile } = await authenticateGoogleAccountDirectly(
        email,
        name,
        photoURL
      );
      const appUser: AppUser = {
        id: authedUser.id,
        uid: authedUser.id,
        email: authedUser.email,
        displayName: authedProfile.name,
        user_metadata: authedUser.user_metadata,
      };
      setUser(appUser);
      setProfile(authedProfile);
      localStorage.setItem('school_active_session_email', authedUser.email || '');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user && profile) {
      await logActivity({
        actorId: user.id,
        actorName: profile.name,
        actorEmail: profile.email,
        action: 'LOGOUT',
        entity: 'users',
        entityId: user.id,
        details: 'تسجيل خروج من المنصة',
      });
    }
    localStorage.removeItem('school_active_session_email');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmailFormat(cleanEmail)) {
      throw new Error('يرجى إدخال بريد إلكتروني صحيح.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) {
      throw error;
    }
  };

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    if (!user || !profile) return;
    await supabase.auth.updateUser({
      data: { name: displayName, photoURL },
    });
    await supabase
      .from('users')
      .update({
        name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setProfile((prev) => (prev ? { ...prev, name: displayName, photoURL } : null));
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    const userProf = await ensureUserSynced(user);
    setProfile(userProf);
    return userProf;
  };

  const effectivePermissions = useMemo(() => {
    return computeEffectivePermissions(profile);
  }, [profile]);

  const isDirector = Boolean(
    (user?.email && user.email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase()) ||
    profile?.school_role === 'director'
  );

  const hasPerm = (permission: PermissionKey): boolean => {
    if (isDirector) return true;
    return checkPermission(profile, permission);
  };

  const canManage = (target: UserProfile): boolean => {
    if (!profile) return false;
    return canUserManageTarget(profile, target);
  };

  // Backwards compatibility alias for isOwner -> resolves to isDirector
  const isOwner = isDirector;

  const roleLabel = useMemo(() => {
    const email = (user?.email || profile?.email || '').trim().toLowerCase();
    if (email === OWNER_EMAIL.toLowerCase() || profile?.school_role === 'director') {
      return 'المديرة';
    }
    if (email === 'yaradrashed@gmail.com') {
      return 'الطالبة';
    }
    if (profile?.school_role) {
      return ROLE_LABELS_AR[profile.school_role] || 'مستخدم';
    }
    return user ? 'مستخدم' : 'زائر';
  }, [user, profile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        effectivePermissions,
        hasPerm,
        canManage,
        isOwner,
        isDirector,
        roleLabel,
        login,
        loginStudent,
        signInWithGoogle,
        loginWithGoogleCredential,
        loginWithGoogleAccount,
        logout,
        resetPassword,
        updateUserProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
