import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile as fbUpdateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  getDocs,
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole, UserPermissions } from '../types';
import { OWNER_EMAIL, DEFAULT_SETTINGS, INITIAL_POSTS, INITIAL_EVENTS, INITIAL_GALLERY } from '../data/initialData';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  canPublish: boolean;
  canManageEvents: boolean;
  canUploadPhotos: boolean;
  canPostToday: boolean;
  canManageAnnouncements: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, UserPermissions> = {
  owner: {
    canPublishNews: true,
    canManageEvents: true,
    canUploadPhotos: true,
    canPostTodaySummary: true,
    canManageAnnouncements: true,
    requiresReview: false,
  },
  admin: {
    canPublishNews: true,
    canManageEvents: true,
    canUploadPhotos: true,
    canPostTodaySummary: true,
    canManageAnnouncements: true,
    requiresReview: false,
  },
  teacher: {
    canPublishNews: true,
    canManageEvents: true,
    canUploadPhotos: true,
    canPostTodaySummary: true,
    canManageAnnouncements: false,
    requiresReview: false,
  },
  editor: {
    canPublishNews: true,
    canManageEvents: false,
    canUploadPhotos: true,
    canPostTodaySummary: true,
    canManageAnnouncements: false,
    requiresReview: true,
  },
  user: {
    canPublishNews: false,
    canManageEvents: false,
    canUploadPhotos: false,
    canPostTodaySummary: false,
    canManageAnnouncements: false,
    requiresReview: false,
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize seed data if collections are empty
  const initializeSeedDataIfNeeded = async () => {
    try {
      const postsSnap = await getDocs(query(collection(db, 'posts')));
      if (postsSnap.empty) {
        for (const post of INITIAL_POSTS) {
          await addDoc(collection(db, 'posts'), post);
        }
      }

      const eventsSnap = await getDocs(query(collection(db, 'events')));
      if (eventsSnap.empty) {
        for (const ev of INITIAL_EVENTS) {
          await addDoc(collection(db, 'events'), ev);
        }
      }

      const gallerySnap = await getDocs(query(collection(db, 'gallery')));
      if (gallerySnap.empty) {
        for (const pic of INITIAL_GALLERY) {
          await addDoc(collection(db, 'gallery'), pic);
        }
      }

      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      if (!settingsDoc.exists()) {
        await setDoc(doc(db, 'settings', 'general'), DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.warn('Seed initialization check handled:', err);
    }
  };

  useEffect(() => {
    initializeSeedDataIfNeeded();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);
          
          const isOwnerUser = fbUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            // Ensure owner role is preserved if email matches owner
            if (isOwnerUser && data.role !== 'owner') {
              await updateDoc(userDocRef, {
                role: 'owner',
                permissions: DEFAULT_PERMISSIONS_BY_ROLE.owner,
                status: 'active'
              });
              data.role = 'owner';
              data.permissions = DEFAULT_PERMISSIONS_BY_ROLE.owner;
            }
            // Update last login
            await updateDoc(userDocRef, {
              lastLoginAt: new Date().toISOString()
            }).catch(() => {});

            setProfile({ ...data, id: fbUser.uid });
          } else {
            // Create user profile on first login
            const role: UserRole = isOwnerUser ? 'owner' : 'user';
            const newProfile: UserProfile = {
              id: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || (isOwnerUser ? 'المديرة العامة' : fbUser.email?.split('@')[0] || 'مستخدم'),
              photoURL: fbUser.photoURL || undefined,
              role,
              status: 'active',
              permissions: DEFAULT_PERMISSIONS_BY_ROLE[role],
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Fallback profile if Firestore read is blocked momentarily
          const isOwnerUser = fbUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
          setProfile({
            id: fbUser.uid,
            email: fbUser.email || '',
            displayName: fbUser.displayName || (isOwnerUser ? 'المديرة العامة' : 'مستخدم'),
            role: isOwnerUser ? 'owner' : 'user',
            status: 'active',
            permissions: isOwnerUser ? DEFAULT_PERMISSIONS_BY_ROLE.owner : DEFAULT_PERMISSIONS_BY_ROLE.user,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfile;
      if (data.status === 'suspended') {
        await fbSignOut(auth);
        throw new Error('تم إيقاف هذا الحساب من قبل إدارة المدرسة. يرجى التواصل مع الإدارة.');
      }
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await fbUpdateProfile(cred.user, { displayName: name });
    
    const isOwnerUser = email.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const role: UserRole = isOwnerUser ? 'owner' : 'user';

    const newProfile: UserProfile = {
      id: cred.user.uid,
      email: email.toLowerCase(),
      displayName: name,
      role,
      status: 'active',
      permissions: DEFAULT_PERMISSIONS_BY_ROLE[role],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', cred.user.uid), newProfile);
    setProfile(newProfile);

    // Record audit log
    try {
      await addDoc(collection(db, 'activityLogs'), {
        action: 'تسجيل حساب جديد',
        details: `قام المستخدم ${name} (${email}) بإنشاء حساب جديد`,
        userId: cred.user.uid,
        userName: name,
        userEmail: email,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit log creation skipped', e);
    }
  };

  const logout = async () => {
    await fbSignOut(auth);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    if (!auth.currentUser) return;
    await fbUpdateProfile(auth.currentUser, { displayName, photoURL });
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      displayName,
      photoURL: photoURL || null,
    });
    setProfile((prev) => prev ? { ...prev, displayName, photoURL } : null);
  };

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (snap.exists()) {
      setProfile({ ...(snap.data() as UserProfile), id: auth.currentUser.uid });
    }
  };

  const isOwner = profile?.role === 'owner' || user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isAdmin = isOwner || profile?.role === 'admin';
  const isModerator = isAdmin || profile?.role === 'teacher' || profile?.role === 'editor';

  const canPublish = isOwner || (profile?.permissions?.canPublishNews ?? false);
  const canManageEvents = isOwner || (profile?.permissions?.canManageEvents ?? false);
  const canUploadPhotos = isOwner || (profile?.permissions?.canUploadPhotos ?? false);
  const canPostToday = isOwner || (profile?.permissions?.canPostTodaySummary ?? false);
  const canManageAnnouncements = isOwner || (profile?.permissions?.canManageAnnouncements ?? false);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isOwner,
        isAdmin,
        isModerator,
        canPublish,
        canManageEvents,
        canUploadPhotos,
        canPostToday,
        canManageAnnouncements,
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
