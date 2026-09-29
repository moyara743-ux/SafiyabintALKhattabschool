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
import { handleGoogleCredential } from '../lib/googleAuth';

export const OWNER_EMAIL = 'moyara743@gmail.com';

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
  register: (name: string, email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
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

  // Create instant fallback profile from auth user metadata to avoid blocking on DB queries
  const createFallbackProfile = (authUser: { id: string; email?: string; user_metadata?: any }): UserProfile => {
    const cleanEmail = (authUser.email || '').trim().toLowerCase();
    const isOwnerEmail = cleanEmail === OWNER_EMAIL.toLowerCase();
    const isYaraAccount = cleanEmail === 'yaradrashed@gmail.com';

    // Strict rule: Only OWNER_EMAIL can ever be owner. yaradrashed@gmail.com is strictly student.
    const initialRole: SchoolRole = isOwnerEmail ? 'owner' : 'student';
    const initialName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      (isOwnerEmail ? 'يارا محمد راشد - مالك النظام' : isYaraAccount ? 'منال علي' : authUser.email?.split('@')[0] || 'مستخدم');

    return {
      id: authUser.id,
      name: initialName,
      email: cleanEmail,
      photoURL: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || undefined,
      school_role: initialRole,
      customPermissions: [],
      temporaryPermissions: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
  };

  // Helper to ensure current session user exists in dataStore & sync with Supabase
  const ensureUserSynced = async (authUser: { id: string; email?: string; user_metadata?: any }): Promise<UserProfile> => {
    const currentId = authUser.id;
    const currentEmail = (authUser.email || '').trim().toLowerCase();
    const isOwner = currentEmail === OWNER_EMAIL.toLowerCase();
    const isYaraAccount = currentEmail === 'yaradrashed@gmail.com';
    const currentName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      (isOwner ? 'يارا محمد راشد - مالك النظام' : isYaraAccount ? 'منال علي' : currentEmail.split('@')[0] || 'مستخدم');
    const defaultRole: SchoolRole = isOwner ? 'owner' : 'student';

    // 1. FRESH FETCH DIRECTLY FROM SUPABASE public.users TABLE (PRIMARY SOURCE OF TRUTH)
    let dbUser: any = null;
    try {
      const isValidUuid = Boolean(currentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentId));

      // Attempt 1: Fetch by Auth UUID
      if (isValidUuid) {
        const { data, error } = await supabase.from('users').select('*').eq('id', currentId).maybeSingle();
        if (!error && data) {
          dbUser = data;
        }
      }

      // Attempt 2: Fetch by exact lowercase email if not found by UUID
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
      // The row exists in Supabase: USE EXACT DATABASE VALUES AS SOLE SOURCE OF TRUTH
      console.log('[AuthContext] Synced fresh authoritative user profile from Supabase:', dbUser);
      let resolvedRole: SchoolRole = (dbUser.school_role as SchoolRole) || defaultRole;
      if (isOwner) {
        resolvedRole = 'owner';
      } else if (resolvedRole === 'owner' || isYaraAccount) {
        // Enforce restriction: No non-owner account can have 'owner', and yaradrashed@gmail.com is strictly student
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
      
      // Update local storage to match the database (WITHOUT overwriting Supabase!)
      dataStore.syncUserProfileFromRemote(activeProfile);
    } else {
      // User row not found in Supabase yet -> Use local store or defaults, then insert into Supabase
      const localExisting = dataStore.getUserByEmail(currentEmail) || dataStore.getUserById(currentId);
      let resolvedRole: SchoolRole = isOwner ? 'owner' : (localExisting?.school_role || defaultRole);
      if (!isOwner && resolvedRole === 'owner') resolvedRole = 'student';
      if (isYaraAccount) resolvedRole = 'student';

      activeProfile = {
        id: currentId,
        name: localExisting?.name || currentName,
        email: currentEmail,
        school_role: resolvedRole,
        customPermissions: isYaraAccount ? [] : (localExisting?.customPermissions || []),
        temporaryPermissions: isYaraAccount ? [] : (localExisting?.temporaryPermissions || []),
        status: localExisting?.status || 'active',
        createdAt: localExisting?.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      // Attempt to insert/upsert new row in Supabase users table
      try {
        const isValidUuid = Boolean(currentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentId));
        const upsertPayload: Record<string, any> = {
          name: activeProfile.name,
          email: currentEmail,
          school_role: activeProfile.school_role,
          status: activeProfile.status,
          custom_permissions: activeProfile.customPermissions,
        };
        if (isValidUuid) {
          upsertPayload.id = currentId;
        }
        const insRes = await supabase.from('users').upsert(upsertPayload, { onConflict: 'email' }).select();
        if (insRes.data && insRes.data[0]) {
          const row = insRes.data[0];
          activeProfile.id = row.id || activeProfile.id;
          let roleAfterInsert: SchoolRole = (row.school_role as SchoolRole) || activeProfile.school_role;
          if (isOwner) roleAfterInsert = 'owner';
          else if (roleAfterInsert === 'owner' || isYaraAccount) roleAfterInsert = 'student';
          activeProfile.school_role = roleAfterInsert;
        }
      } catch (upsertErr) {
        console.warn('[AuthContext] Notice in DB upsert for new user:', upsertErr);
      }

      dataStore.syncUserProfileFromRemote(activeProfile);
    }

    return activeProfile;
  };

  useEffect(() => {
    let isMounted = true;
    let authTimeoutId: any = null;

    const stopLoading = () => {
      if (isMounted) {
        setLoading(false);
      }
    };

    // 1. HARD TIMEOUT: Maximum 5 seconds for session verification.
    authTimeoutId = setTimeout(() => {
      console.warn('[AuthContext] Auth session check reached 5s timeout. Releasing loading state.');
      stopLoading();
    }, 5000);

    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Checking Supabase session...');
        // Wrap getSession in a promise race with 4.5s internal limit
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: new Error('getSession timed out') }), 4500)
        );

        const { data, error } = (await Promise.race([sessionPromise, timeoutPromise])) as any;

        if (error) {
          console.warn('[AuthContext] getSession result:', error.message);
        }

        const session = data?.session;
        if (session?.user && isMounted) {
          const authUser = session.user;
          const u: AppUser = {
            id: authUser.id,
            uid: authUser.id,
            email: authUser.email,
            displayName: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
            user_metadata: authUser.user_metadata,
          };
          setUser(u);

          // Fast initial profile display to unblock UI without delay
          const fastProfile = dataStore.getUserByEmail(authUser.email || '') || createFallbackProfile(authUser);
          setProfile(fastProfile);

          // Fetch fresh authoritative profile from Supabase
          try {
            const prof = await ensureUserSynced(authUser);
            if (isMounted && prof) {
              setProfile(prof);
            }
          } catch (e) {
            console.warn('[AuthContext] Error in ensureUserSynced:', e);
          }
        } else if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('[AuthContext] Unexpected error checking session:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (authTimeoutId) {
          clearTimeout(authTimeoutId);
        }
        stopLoading();
      }
    };

    initializeAuth();

    // 2. Listen to Supabase Auth state changes
    let subscription: any = null;
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[AuthContext] onAuthStateChange event:', event);
        if (!isMounted) return;

        if (session?.user) {
          const authUser = session.user;
          const u: AppUser = {
            id: authUser.id,
            uid: authUser.id,
            email: authUser.email,
            displayName: authUser.user_metadata?.full_name || authUser.user_metadata?.name,
            user_metadata: authUser.user_metadata,
          };
          setUser(u);

          // Fast profile
          const fastProfile = dataStore.getUserByEmail(authUser.email || '') || createFallbackProfile(authUser);
          setProfile(fastProfile);

          try {
            const prof = await ensureUserSynced(authUser);
            if (isMounted && prof) {
              setProfile(prof);
            }
          } catch (e) {
            console.warn('[AuthContext] Profile sync notice:', e);
          }
        } else {
          setUser(null);
          setProfile(null);
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

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('تعذر إتمام تسجيل الدخول');
    }

    const appUser: AppUser = {
      id: data.user.id,
      uid: data.user.id,
      email: data.user.email,
      displayName: data.user.user_metadata?.name,
      user_metadata: data.user.user_metadata,
    };
    setUser(appUser);

    const userProf = await ensureUserSynced(data.user);

    if (userProf.status === 'disabled') {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      throw new Error('تم تعطيل هذا الحساب من قبل إدارة المدرسة. يرجى التواصل مع الإدارة.');
    }

    setProfile(userProf);

    // Audit log
    await logActivity({
      actorId: data.user.id,
      actorName: userProf.name,
      actorEmail: data.user.email || '',
      action: 'LOGIN',
      entity: 'users',
      entityId: data.user.id,
      details: `تسجيل دخول ناجح للمستخدم (${ROLE_LABELS_AR[userProf.school_role]})`,
    });
  };

  const register = async (name: string, email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 1. Supabase Auth sign up
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: {
          name: cleanName,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('لم يتم إنشاء المستخدم بنجاح');
    }

    const isOwnerEmail = cleanEmail === OWNER_EMAIL.toLowerCase();
    const initialRole: SchoolRole = isOwnerEmail ? 'owner' : 'student';

    const newProfile: UserProfile = {
      id: data.user.id,
      name: cleanName,
      email: cleanEmail,
      school_role: initialRole,
      customPermissions: [],
      temporaryPermissions: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    // 2. Persist user into dataStore immediately to guarantee zero delay & zero lost users
    await dataStore.addUser(newProfile);

    // 3. Insert row into Supabase users table
    try {
      const newRow = {
        id: data.user.id,
        name: cleanName,
        email: cleanEmail,
        school_role: initialRole,
        status: 'active',
      };

      const { error: insertErr } = await supabase.from('users').insert([newRow]);
      if (insertErr) {
        console.warn('[AuthContext] Supabase users table insert notice:', insertErr.message);
      }
    } catch (dbErr) {
      console.warn('[AuthContext] Supabase users table insert exception:', dbErr);
    }

    const appUser: AppUser = {
      id: data.user.id,
      uid: data.user.id,
      email: data.user.email,
      displayName: cleanName,
      user_metadata: data.user.user_metadata,
    };

    setUser(appUser);
    setProfile(newProfile);

    // Audit log
    await logActivity({
      actorId: data.user.id,
      actorName: cleanName,
      actorEmail: cleanEmail,
      action: 'CREATE',
      entity: 'users',
      entityId: data.user.id,
      details: `إنشاء حساب جديد بالدور (${ROLE_LABELS_AR[initialRole]})`,
    });
  };

  const signInWithGoogle = async () => {
    // Rely exclusively on Google Identity Services (GIS) prompt to avoid provider is not enabled error
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

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

      await logActivity({
        actorId: authedUser.id,
        actorName: authedProfile.name,
        actorEmail: authedUser.email || '',
        action: 'LOGIN',
        entity: 'users',
        entityId: authedUser.id,
        details: `تسجيل دخول ناجح عبر Google Auth SDK (${ROLE_LABELS_AR[authedProfile.school_role]})`,
      });
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
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
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

  const hasPerm = (permission: PermissionKey): boolean => {
    if (isOwner) return true;
    return checkPermission(profile, permission);
  };

  const canManage = (target: UserProfile): boolean => {
    if (!profile) return false;
    return canUserManageTarget(profile, target);
  };

  const isOwner = Boolean(
    (user?.email && user.email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase()) ||
    (profile?.email && profile.email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase())
  );
  const isDirector = isOwner || profile?.school_role === 'director';
  
  const roleLabel = useMemo(() => {
    const email = (user?.email || profile?.email || '').trim().toLowerCase();
    if (email === OWNER_EMAIL.toLowerCase()) {
      return 'مالك النظام';
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
        register,
        signInWithGoogle,
        loginWithGoogleCredential,
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
