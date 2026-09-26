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
    const isOwnerEmail = authUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const initialRole: SchoolRole = isOwnerEmail ? 'owner' : 'student';
    const initialName =
      authUser.user_metadata?.name ||
      (isOwnerEmail ? 'مالك النظام' : authUser.email?.split('@')[0] || 'مستخدم');

    return {
      id: authUser.id,
      name: initialName,
      email: authUser.email || '',
      photoURL: authUser.user_metadata?.avatar_url || undefined,
      school_role: initialRole,
      customPermissions: [],
      temporaryPermissions: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
  };

  // Helper to fetch user profile strictly from Supabase users table with safe fallback
  const fetchUserProfileFromDB = async (authUser: { id: string; email?: string; user_metadata?: any }): Promise<UserProfile> => {
    const isOwnerEmail = authUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

    try {
      // Query Supabase users table with 3s timeout
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('User DB query timed out') }), 3000)
      );

      const { data: dbUser, error } = (await Promise.race([queryPromise, timeoutPromise])) as any;

      if (error) {
        console.warn('[AuthContext] Notice fetching user from Supabase users table:', error.message);
      }

      if (dbUser) {
        let currentSchoolRole: SchoolRole = (dbUser.school_role as SchoolRole) || 'student';

        // Ensure Owner role is protected and locked to Owner email
        if (isOwnerEmail && currentSchoolRole !== 'owner') {
          currentSchoolRole = 'owner';
          supabase
            .from('users')
            .update({
              school_role: 'owner',
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', authUser.id)
            .then(
              () => {},
              () => {}
            );
        }

        const userProfile: UserProfile = {
          id: authUser.id,
          name: dbUser.name || (isOwnerEmail ? 'مالك النظام' : authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'مستخدم'),
          email: dbUser.email || authUser.email || '',
          photoURL: authUser.user_metadata?.avatar_url || undefined,
          school_role: currentSchoolRole,
          customPermissions: dbUser.custom_permissions || [],
          temporaryPermissions: [],
          status: dbUser.status === 'disabled' ? 'disabled' : 'active',
          createdAt: dbUser.created_at || new Date().toISOString(),
          updatedAt: dbUser.updated_at || undefined,
          lastLoginAt: new Date().toISOString(),
        };

        return userProfile;
      }
    } catch (err) {
      console.warn('[AuthContext] Exception in fetchUserProfileFromDB:', err);
    }

    // Check dataStore for newly registered user profile before default fallback
    const localUser = dataStore.getUserById(authUser.id);
    if (localUser) {
      return localUser;
    }

    // Return instant fallback profile if row does not exist or query timed out
    return createFallbackProfile(authUser);
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
    // If Supabase does not respond within 5s (due to network delay, cold start, or iframe sandbox restrictions),
    // immediately stop loading and proceed so the user is NEVER trapped on the loading screen!
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
          const u: AppUser = {
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.name,
            user_metadata: session.user.user_metadata,
          };
          setUser(u);

          // Set fallback profile immediately so UI can render right away
          const fallbackProf = createFallbackProfile(session.user);
          setProfile(fallbackProf);

          // Try to enrich from database in background without blocking
          fetchUserProfileFromDB(session.user)
            .then((prof) => {
              if (isMounted && prof) {
                setProfile(prof);
              }
            })
            .catch((e) => {
              console.warn('[AuthContext] Error enriching profile from DB:', e);
            });
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
        // GUARANTEED: loading becomes false in all circumstances
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
          const u: AppUser = {
            id: session.user.id,
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.name,
            user_metadata: session.user.user_metadata,
          };
          setUser(u);

          // Use fallback profile immediately, then update from DB
          setProfile((prev) => prev || createFallbackProfile(session.user));

          fetchUserProfileFromDB(session.user)
            .then((prof) => {
              if (isMounted && prof) {
                setProfile(prof);
              }
            })
            .catch((e) => {
              console.warn('[AuthContext] Profile update notice:', e);
            });
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

    const userProf = await fetchUserProfileFromDB(data.user);

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
    const userProf = await fetchUserProfileFromDB(user);
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

  const isOwner = profile?.school_role === 'owner' || user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isDirector = isOwner || profile?.school_role === 'director';
  const roleLabel = profile ? ROLE_LABELS_AR[profile.school_role] || 'مستخدم' : 'زائر';

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
