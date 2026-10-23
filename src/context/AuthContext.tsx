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
  registerOrAuthenticateWithGoogle,
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
import { isStaffEmailAuthorized } from '../lib/authorizedStaffService';
import {
  SYSTEM_OWNER_EMAIL,
  SYSTEM_OWNER_NAME,
  SYSTEM_OWNER_ROLE_LABEL,
  getDesignatedPrincipalEmail,
  getDesignatedPrincipalName,
  isSystemOwner as checkIsSystemOwner,
  isDesignatedPrincipal as checkIsDesignatedPrincipal,
} from '../lib/principalService';
import { isProfileComplete } from '../lib/profileGuard';

export const DIRECTOR_EMAIL = SYSTEM_OWNER_EMAIL;
export const OWNER_EMAIL = SYSTEM_OWNER_EMAIL;

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
  signInWithGoogle: (intent?: string) => Promise<void>;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  loginWithGoogleAccount: (email: string, name?: string, photoURL?: string) => Promise<void>;
  registerWithGoogle: (params: {
    email: string;
    role?: SchoolRole;
    passcode?: string;
    providedName?: string;
    photoURL?: string;
  }) => Promise<{ user: AppUser; profile: UserProfile; isFirstTime: boolean }>;
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
    const isOwnerAccount = checkIsSystemOwner(currentEmail);
    const isPrincipalAccount = checkIsDesignatedPrincipal(currentEmail);
    const isYaraAccount = currentEmail === 'yaradrashed@gmail.com';

    let currentName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
    if (isOwnerAccount) {
      currentName = SYSTEM_OWNER_NAME;
    } else if (isPrincipalAccount) {
      currentName = getDesignatedPrincipalName();
    } else if (!currentName) {
      currentName = currentEmail.split('@')[0] || 'مستخدم';
    }

    const defaultRole: SchoolRole = isOwnerAccount ? 'system_owner' : (isPrincipalAccount ? 'director' : 'student');

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
      if (isOwnerAccount) {
        resolvedRole = 'system_owner';
      } else if (isPrincipalAccount) {
        resolvedRole = 'director';
      } else if (isYaraAccount) {
        resolvedRole = 'student';
      }


      const resolvedName = isOwnerAccount
        ? SYSTEM_OWNER_NAME
        : (isPrincipalAccount ? getDesignatedPrincipalName() : (dbUser.name || currentName));

      const candidateProfile: UserProfile = {
        id: dbUser.id || currentId,
        name: resolvedName,
        email: currentEmail,
        school_role: resolvedRole,
        status: dbUser.status === 'disabled' ? 'disabled' : 'active',
        phone: dbUser.phone || '',
        nationalId: dbUser.national_id || dbUser.nationalId || '',
        national_id: dbUser.national_id || dbUser.nationalId || '',
        accountStatus: 'needs_completion',
        account_status: 'needs_completion',
        is_profile_completed: false,
        is_profile_complete: false,
        studentIdCode: dbUser.student_id_code || dbUser.studentIdCode,
        staffCode: dbUser.staff_code || dbUser.staffCode || dbUser.employeeIdCode,
        employeeIdCode: dbUser.employee_id_code || dbUser.employeeIdCode,
        jobCode: dbUser.job_code || dbUser.jobCode,
        gradeStage: dbUser.grade_stage || dbUser.gradeStage,
        classroom: dbUser.classroom,
        specialization: dbUser.specialization,
        guardianRelation: dbUser.guardian_relation || dbUser.guardianRelation,
        customPermissions: isYaraAccount ? [] : (Array.isArray(dbUser.custom_permissions) ? dbUser.custom_permissions : []),
        temporaryPermissions: [],
        createdAt: dbUser.created_at || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      const isComp = isOwnerAccount || isPrincipalAccount || isProfileComplete(candidateProfile, currentEmail);
      candidateProfile.is_profile_completed = isComp;
      candidateProfile.is_profile_complete = isComp;
      candidateProfile.accountStatus = isComp ? 'completed' : 'needs_completion';
      candidateProfile.account_status = isComp ? 'completed' : 'needs_completion';

      activeProfile = candidateProfile;
      dataStore.syncUserProfileFromRemote(activeProfile);
    } else {
      // Check dataStore
      const localUsers = await dataStore.getUsers();
      const localExisting = localUsers.find((u) => u.email && u.email.trim().toLowerCase() === currentEmail);

      let resolvedRole: SchoolRole = isOwnerAccount ? 'system_owner' : (isPrincipalAccount ? 'director' : (localExisting?.school_role || defaultRole));
      if (isYaraAccount) resolvedRole = 'student';

      const resolvedName = isOwnerAccount
        ? SYSTEM_OWNER_NAME
        : (isPrincipalAccount ? getDesignatedPrincipalName() : (localExisting?.name || currentName));

      const candidateProfile: UserProfile = {
        id: localExisting?.id || currentId,
        name: resolvedName,
        email: currentEmail,
        school_role: resolvedRole,
        status: localExisting?.status || 'active',
        phone: localExisting?.phone || '',
        nationalId: localExisting?.nationalId || localExisting?.national_id || '',
        national_id: localExisting?.national_id || localExisting?.nationalId || '',
        accountStatus: 'needs_completion',
        account_status: 'needs_completion',
        is_profile_completed: false,
        is_profile_complete: false,
        studentIdCode: localExisting?.studentIdCode,
        staffCode: localExisting?.staffCode || localExisting?.employeeIdCode,
        employeeIdCode: localExisting?.employeeIdCode,
        jobCode: localExisting?.jobCode,
        gradeStage: localExisting?.gradeStage,
        classroom: localExisting?.classroom,
        specialization: localExisting?.specialization,
        guardianRelation: localExisting?.guardianRelation,
        customPermissions: isYaraAccount ? [] : (localExisting?.customPermissions || []),
        temporaryPermissions: [],
        createdAt: localExisting?.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      const isComp = isOwnerAccount || isPrincipalAccount || isProfileComplete(candidateProfile, currentEmail);
      candidateProfile.is_profile_completed = isComp;
      candidateProfile.is_profile_complete = isComp;
      candidateProfile.accountStatus = isComp ? 'completed' : 'needs_completion';
      candidateProfile.account_status = isComp ? 'completed' : 'needs_completion';

      activeProfile = candidateProfile;
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
    }, 600);

    const checkInitialSession = async () => {
      try {
        // Enforce immediate forced session reset / logout as requested
        const hasForceReset = localStorage.getItem('safiah_force_hana_logout_done_v2');
        if (!hasForceReset) {
          localStorage.setItem('safiah_force_hana_logout_done_v2', 'true');
          localStorage.removeItem('school_active_session_email');
          try {
            await supabase.auth.signOut();
          } catch {}
          if (isMounted) {
            setUser(null);
            setProfile(null);
          }
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const email = (session.user.email || '').trim().toLowerCase();
          const displayName = (session.user.user_metadata?.name || session.user.user_metadata?.full_name || '').trim();

          // If session belongs to Hana Al-Dossari, log her out immediately to return to first-time unactivated state
          const isHana =
            displayName.includes('هنا') ||
            displayName.includes('الدوسري') ||
            email.includes('hana') ||
            email.includes('dossari');

          if (isHana) {
            console.log('[AuthContext] Force-logging out Hana Al-Dossari to reset session to initial state');
            await supabase.auth.signOut();
            localStorage.removeItem('school_active_session_email');
            if (isMounted) {
              setUser(null);
              setProfile(null);
            }
            return;
          }

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
            const cleanLocal = localSessionEmail.trim().toLowerCase();
            if (cleanLocal.includes('hana') || cleanLocal.includes('dossari')) {
              localStorage.removeItem('school_active_session_email');
              if (isMounted) {
                setUser(null);
                setProfile(null);
              }
              return;
            }

            // Authoritative pre-auth check for persistent session auto-login
            const authCheck = await verifyGoogleEmailPreAuthorization(cleanLocal);
            if (authCheck.isAuthorized && authCheck.profile) {
              const activeProf = authCheck.profile;
              setUser({
                id: activeProf.id,
                uid: activeProf.id,
                email: activeProf.email,
                displayName: activeProf.name,
              });
              setProfile(activeProf);
            } else {
              const allUsers = await dataStore.getUsers();
              const found = allUsers.find(
                (u) => u.email && u.email.trim().toLowerCase() === cleanLocal
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
          const displayName = (session.user.user_metadata?.name || session.user.user_metadata?.full_name || '').trim();

          if (displayName.includes('هنا') || displayName.includes('الدوسري') || email.includes('hana') || email.includes('dossari')) {
            console.log('[AuthContext] onAuthStateChange: Force-logging out Hana Al-Dossari');
            await supabase.auth.signOut();
            localStorage.removeItem('school_active_session_email');
            setUser(null);
            setProfile(null);
            stopLoading();
            return;
          }

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

  /**
   * Complete Google Registration or Quick Authentication Flow
   */
  const registerWithGoogle = async (params: {
    email: string;
    role?: SchoolRole;
    passcode?: string;
    providedName?: string;
    photoURL?: string;
  }): Promise<{ user: AppUser; profile: UserProfile; isFirstTime: boolean }> => {
    setLoading(true);
    try {
      const { user: authedUser, profile: authedProfile, isFirstTime } = await registerOrAuthenticateWithGoogle(params);
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
      return { user: appUser, profile: authedProfile, isFirstTime };
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

  const isOwner = Boolean(
    (user?.email && checkIsSystemOwner(user.email)) ||
    (profile?.email && checkIsSystemOwner(profile.email)) ||
    profile?.school_role === 'system_owner'
  );

  const isDirector = Boolean(
    !isOwner && (
      (user?.email && checkIsDesignatedPrincipal(user.email)) ||
      (profile?.email && checkIsDesignatedPrincipal(profile.email)) ||
      profile?.school_role === 'director'
    )
  );

  const hasPerm = (permission: PermissionKey): boolean => {
    if (isOwner || isDirector) return true;
    return checkPermission(profile, permission);
  };

  const canManage = (target: UserProfile): boolean => {
    if (!profile) return false;
    return canUserManageTarget(profile, target);
  };

  const roleLabel = useMemo(() => {
    const email = (user?.email || profile?.email || '').trim().toLowerCase();
    if (checkIsSystemOwner(email) || profile?.school_role === 'system_owner' || isOwner) {
      return SYSTEM_OWNER_ROLE_LABEL;
    }
    if (checkIsDesignatedPrincipal(email) || profile?.school_role === 'director') {
      return 'المديرة';
    }
    if (email === 'yaradrashed@gmail.com') {
      return 'الطالبة';
    }
    if (profile?.school_role) {
      return ROLE_LABELS_AR[profile.school_role] || 'مستخدم';
    }
    return user ? 'مستخدم' : 'زائر';
  }, [user, profile, isOwner]);

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
        registerWithGoogle,
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
