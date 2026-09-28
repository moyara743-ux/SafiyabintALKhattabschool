import { supabase } from '../supabaseClient';
import {
  Post,
  Announcement,
  SchoolEvent,
  Achievement,
  SchoolPhoto,
  SchoolAlbum,
  DailyMessage,
  SiteSettings,
  UserProfile,
  ActivityLog,
} from '../types';
import {
  DEFAULT_SETTINGS,
  INITIAL_POSTS,
  INITIAL_EVENTS,
  INITIAL_GALLERY,
  INITIAL_USERS,
  OWNER_EMAIL,
} from '../data/initialData';

// Listener callback types
type Listener<T> = (items: T) => void;

class LocalDataStore {
  private listeners: Map<string, Set<Listener<any>>> = new Map();
  private memoryStore: Map<string, any> = new Map();

  private getStorage<T>(key: string, defaultValue: T): T {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(`safiah_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.memoryStore.set(key, parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`Error reading localStorage for ${key}`, e);
    }
    if (this.memoryStore.has(key)) {
      return this.memoryStore.get(key);
    }
    return defaultValue;
  }

  private setStorage<T>(key: string, value: T): void {
    this.memoryStore.set(key, value);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`safiah_${key}`, JSON.stringify(value));
      }
    } catch (e) {
      console.warn(`Error writing localStorage for ${key}`, e);
    }
    this.notify(key, value);
  }

  private notify(key: string, data: any) {
    const subs = this.listeners.get(key);
    if (subs) {
      subs.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in listener for ${key}:`, err);
        }
      });
    }
  }

  public subscribe<T>(key: string, callback: Listener<T>): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Initial trigger
    const initialData = this.getCollection<T>(key);
    callback(initialData);

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  private getCollection<T>(key: string): T {
    switch (key) {
      case 'posts':
        return this.getStorage<Post[]>('posts', this.seedPosts()) as unknown as T;
      case 'events':
        return this.getStorage<SchoolEvent[]>('events', this.seedEvents()) as unknown as T;
      case 'achievements':
        return this.getStorage<Achievement[]>('achievements', []) as unknown as T;
      case 'photos':
        return this.getStorage<SchoolPhoto[]>('photos', this.seedPhotos()) as unknown as T;
      case 'albums':
        return this.getStorage<SchoolAlbum[]>('albums', [
          {
            id: 'album_1',
            name: 'فعاليات المدرسة',
            coverImage: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80',
            date: new Date().toISOString().split('T')[0],
            authorId: 'system',
            authorName: 'إدارة المدرسة',
            createdAt: new Date().toISOString(),
          },
        ]) as unknown as T;
      case 'dailyMessages':
        return this.getStorage<DailyMessage[]>('dailyMessages', [
          {
            id: 'daily_msg_1',
            content: 'مرحباً بكم في منصة مدرسة صفية بنت عمر، نسأل الله لطالباتنا التوفيق والنجاح الدائم.',
            date: new Date().toISOString().split('T')[0],
            authorName: 'إدارة المدرسة',
            authorId: 'system',
            createdAt: new Date().toISOString(),
            isActive: true,
          },
        ]) as unknown as T;
      case 'announcements':
        return this.getStorage<Announcement[]>('announcements', [
          {
            id: 'ann_initial',
            title: 'إعلان تجريبي',
            content: 'هذا أول إعلان حقيقي بموقع مدرسة صفية بنت عمر.',
            date: new Date().toISOString().split('T')[0],
            isImportant: true,
            authorId: 'system',
            authorName: 'إدارة المدرسة',
            createdAt: new Date().toISOString(),
          },
        ]) as unknown as T;
      case 'settings':
        return this.getStorage<SiteSettings>('settings', DEFAULT_SETTINGS) as unknown as T;
      case 'users':
        return this.getStorage<UserProfile[]>('users', this.seedUsers()) as unknown as T;
      default:
        return this.getStorage<any>(key, []) as unknown as T;
    }
  }

  private seedUsers(): UserProfile[] {
    return [...INITIAL_USERS];
  }

  private seedPosts(): Post[] {
    return INITIAL_POSTS.map((p, idx) => ({
      ...p,
      id: `post_seed_${idx + 1}`,
    })) as Post[];
  }

  private seedEvents(): SchoolEvent[] {
    return INITIAL_EVENTS.map((e, idx) => ({
      ...e,
      id: `event_seed_${idx + 1}`,
    })) as SchoolEvent[];
  }

  private seedPhotos(): SchoolPhoto[] {
    return INITIAL_GALLERY.map((g, idx) => ({
      ...g,
      id: `photo_seed_${idx + 1}`,
    })) as SchoolPhoto[];
  }

  // --- CRUD METHODS ---

  // Posts
  public getPosts(): Post[] {
    return this.getCollection<Post[]>('posts');
  }

  public async addPost(post: Omit<Post, 'id'>): Promise<Post> {
    const list = this.getPosts();
    const newPost: Post = {
      ...post,
      id: 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: post.createdAt || new Date().toISOString(),
    };
    const updated = [newPost, ...list];
    this.setStorage('posts', updated);
    return newPost;
  }

  public async updatePost(id: string, updates: Partial<Post>): Promise<void> {
    const list = this.getPosts();
    const updated = list.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
    );
    this.setStorage('posts', updated);
  }

  public async deletePost(id: string): Promise<void> {
    const list = this.getPosts();
    const updated = list.filter((item) => item.id !== id);
    this.setStorage('posts', updated);
  }

  // Announcements (Integrated with Supabase announcements table)
  public async getAnnouncements(): Promise<Announcement[]> {
    try {
      const fetchPromise = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('announcements query timeout') }), 3000)
      );

      const { data, error } = (await Promise.race([fetchPromise, timeoutPromise])) as any;

      if (!error && data && data.length > 0) {
        const mapped: Announcement[] = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          content: d.content,
          date: d.created_at ? d.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          image: d.image_url || undefined,
          isImportant: true,
          authorId: d.owner_id || 'system',
          authorName: 'إدارة المدرسة',
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at,
        }));
        this.setStorage('announcements', mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('Failed to fetch announcements from Supabase, using cache:', e);
    }

    return this.getStorage<Announcement[]>('announcements', [
      {
        id: 'ann_initial',
        title: 'إعلان تجريبي',
        content: 'هذا أول إعلان حقيقي بموقع مدرسة صفية بنت عمر.',
        date: new Date().toISOString().split('T')[0],
        isImportant: true,
        authorId: 'system',
        authorName: 'إدارة المدرسة',
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  public async addAnnouncement(ann: Omit<Announcement, 'id'>): Promise<Announcement> {
    const newId = 'ann_' + Date.now();
    let createdItem: Announcement = {
      ...ann,
      id: newId,
      createdAt: ann.createdAt || new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('announcements')
        .insert([
          {
            title: ann.title,
            content: ann.content,
            image_url: ann.image || null,
            owner_id: ann.authorId || null,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        createdItem = {
          ...ann,
          id: data.id,
          createdAt: data.created_at,
        };
      }
    } catch (e) {
      console.warn('Supabase announcement insert failed, saved to local cache:', e);
    }

    const current = this.getStorage<Announcement[]>('announcements', []);
    const updated = [createdItem, ...current];
    this.setStorage('announcements', updated);
    return createdItem;
  }

  public async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<void> {
    try {
      const payload: any = {
        title: updates.title,
        content: updates.content,
        updated_at: new Date().toISOString(),
      };
      if (updates.image !== undefined) {
        payload.image_url = updates.image || null;
      }

      await supabase
        .from('announcements')
        .update(payload)
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase announcement update failed:', e);
    }

    const current = this.getStorage<Announcement[]>('announcements', []);
    const updated = current.map((a) => (a.id === id ? { ...a, ...updates } : a));
    this.setStorage('announcements', updated);
  }

  public async deleteAnnouncement(id: string): Promise<void> {
    try {
      await supabase.from('announcements').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase announcement delete failed:', e);
    }

    const current = this.getStorage<Announcement[]>('announcements', []);
    const updated = current.filter((a) => a.id !== id);
    this.setStorage('announcements', updated);
  }

  // Events
  public getEvents(): SchoolEvent[] {
    return this.getCollection<SchoolEvent[]>('events');
  }

  public async addEvent(event: Omit<SchoolEvent, 'id'>): Promise<SchoolEvent> {
    const list = this.getEvents();
    let newEvent: SchoolEvent = {
      ...event,
      id: 'event_' + Date.now(),
      createdAt: event.createdAt || new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('events')
        .insert([
          {
            title: event.title,
            description: event.description,
            date: event.date,
            time: event.time || null,
            location: event.location || null,
            image: event.image || null,
            category: event.category || null,
            status: event.status || 'upcoming',
            author_id: event.authorId || null,
            author_name: event.authorName || null,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        newEvent.id = data.id;
        newEvent.createdAt = data.created_at || newEvent.createdAt;
      }
    } catch (e) {
      console.warn('Supabase event insert notice:', e);
    }

    const updated = [...list, newEvent].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    this.setStorage('events', updated);
    return newEvent;
  }

  public async updateEvent(id: string, updates: Partial<SchoolEvent>): Promise<void> {
    try {
      await supabase
        .from('events')
        .update({
          title: updates.title,
          description: updates.description,
          date: updates.date,
          time: updates.time,
          location: updates.location,
          image: updates.image,
          category: updates.category,
          status: updates.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase event update notice:', e);
    }

    const list = this.getEvents();
    const updated = list.map((e) => (e.id === id ? { ...e, ...updates } : e));
    this.setStorage('events', updated);
  }

  public async deleteEvent(id: string): Promise<{ success: boolean; error?: any }> {
    let supabaseErr: any = null;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) {
        supabaseErr = error;
        console.warn('Supabase event delete notice:', error);
      }
    } catch (e) {
      supabaseErr = e;
      console.warn('Supabase event delete exception:', e);
    }

    const list = this.getEvents();
    const updated = list.filter((e) => e.id !== id);
    this.setStorage('events', updated);

    return { success: !supabaseErr, error: supabaseErr };
  }

  // Achievements
  public getAchievements(): Achievement[] {
    return this.getCollection<Achievement[]>('achievements');
  }

  public async addAchievement(item: Omit<Achievement, 'id'>): Promise<Achievement> {
    const list = this.getAchievements();
    const newItem: Achievement = {
      ...item,
      id: 'ach_' + Date.now(),
      createdAt: item.createdAt || new Date().toISOString(),
    };
    const updated = [newItem, ...list];
    this.setStorage('achievements', updated);
    return newItem;
  }

  public async updateAchievement(id: string, updates: Partial<Achievement>): Promise<void> {
    const list = this.getAchievements();
    const updated = list.map((a) => (a.id === id ? { ...a, ...updates } : a));
    this.setStorage('achievements', updated);
  }

  public async deleteAchievement(id: string): Promise<void> {
    const list = this.getAchievements();
    const updated = list.filter((a) => a.id !== id);
    this.setStorage('achievements', updated);
  }

  // Photos
  public getPhotos(): SchoolPhoto[] {
    return this.getCollection<SchoolPhoto[]>('photos');
  }

  public async addPhoto(photo: Omit<SchoolPhoto, 'id'>): Promise<SchoolPhoto> {
    const list = this.getPhotos();
    const newPhoto: SchoolPhoto = {
      ...photo,
      id: 'photo_' + Date.now(),
      createdAt: photo.createdAt || new Date().toISOString(),
    };
    const updated = [newPhoto, ...list];
    this.setStorage('photos', updated);
    return newPhoto;
  }

  public async updatePhoto(id: string, updates: Partial<SchoolPhoto>): Promise<void> {
    const list = this.getPhotos();
    const updated = list.map((p) => (p.id === id ? { ...p, ...updates } : p));
    this.setStorage('photos', updated);
  }

  public async deletePhoto(id: string): Promise<void> {
    const list = this.getPhotos();
    const updated = list.filter((p) => p.id !== id);
    this.setStorage('photos', updated);
  }

  // Albums
  public getAlbums(): SchoolAlbum[] {
    return this.getCollection<SchoolAlbum[]>('albums');
  }

  public async addAlbum(album: Omit<SchoolAlbum, 'id'>): Promise<SchoolAlbum> {
    const list = this.getAlbums();
    const newAlbum: SchoolAlbum = {
      ...album,
      id: 'album_' + Date.now(),
      createdAt: album.createdAt || new Date().toISOString(),
    };
    const updated = [newAlbum, ...list];
    this.setStorage('albums', updated);
    return newAlbum;
  }

  public async updateAlbum(id: string, updates: Partial<SchoolAlbum>): Promise<void> {
    const list = this.getAlbums();
    const updated = list.map((a) => (a.id === id ? { ...a, ...updates } : a));
    this.setStorage('albums', updated);
  }

  public async deleteAlbum(id: string): Promise<void> {
    const list = this.getAlbums();
    const updated = list.filter((a) => a.id !== id);
    this.setStorage('albums', updated);
  }

  // Daily Message
  public getDailyMessages(): DailyMessage[] {
    return this.getCollection<DailyMessage[]>('dailyMessages');
  }

  public async addDailyMessage(msg: Omit<DailyMessage, 'id'>): Promise<DailyMessage> {
    const list = this.getDailyMessages();
    const newMsg: DailyMessage = {
      ...msg,
      id: 'msg_' + Date.now(),
      createdAt: msg.createdAt || new Date().toISOString(),
    };
    const updated = [newMsg, ...list];
    this.setStorage('dailyMessages', updated);
    return newMsg;
  }

  public async updateDailyMessage(id: string, updates: Partial<DailyMessage>): Promise<void> {
    const list = this.getDailyMessages();
    const updated = list.map((m) => (m.id === id ? { ...m, ...updates } : m));
    this.setStorage('dailyMessages', updated);
  }

  public async deleteDailyMessage(id: string): Promise<void> {
    const list = this.getDailyMessages();
    const updated = list.filter((m) => m.id !== id);
    this.setStorage('dailyMessages', updated);
  }

  // Settings
  public getSettings(): SiteSettings {
    const raw = this.getCollection<SiteSettings>('settings');
    if (raw && (raw.phone === '011-2345678' || raw.email === 'info@safiah-school.edu.sa')) {
      const clean = {
        ...raw,
        phone: raw.phone === '011-2345678' ? '' : raw.phone,
        email: raw.email === 'info@safiah-school.edu.sa' ? '' : raw.email,
      };
      this.setStorage('settings', clean);
      return clean;
    }
    return raw;
  }

  public async updateSettings(settings: SiteSettings): Promise<void> {
    this.setStorage('settings', { ...settings, updatedAt: new Date().toISOString() });
  }

  // Users management (Real-time Supabase integration with high-availability sync)
  public async getUsers(): Promise<UserProfile[]> {
    const localUsers = this.getCollection<UserProfile[]>('users');
    let remoteUsers: UserProfile[] = [];

    try {
      // Direct real-time fetch from Supabase users table with timeout protection
      const fetchPromise = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('users query timeout') }), 2500)
      );

      const { data, error } = (await Promise.race([fetchPromise, timeoutPromise])) as any;

      if (!error && Array.isArray(data) && data.length > 0) {
        remoteUsers = data.map((d: any) => ({
          id: d.id,
          name: d.name || 'مستخدم',
          email: d.email || '',
          school_role: d.school_role || 'student',
          status: d.status || 'active',
          customPermissions: d.custom_permissions || [],
          temporaryPermissions: [],
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at,
        }));
      }
    } catch (e) {
      console.warn('Real-time Supabase users query notice:', e);
    }

    // STRICT UNIQUE DEDUPLICATION BY EMAIL:
    // Ensures exactly 1 record per email address, eliminating any duplicate owner or member accounts.
    const userMap = new Map<string, UserProfile>();

    const mergeUser = (u: UserProfile) => {
      if (!u || !u.email) return;
      const key = u.email.trim().toLowerCase();
      const isOwner = key === OWNER_EMAIL.toLowerCase();
      const existing = userMap.get(key);

      if (!existing) {
        userMap.set(key, {
          ...u,
          email: key,
          school_role: isOwner ? 'owner' : (u.school_role || 'student'),
          status: u.status || 'active',
        });
      } else {
        // Resolve ID: If one has a real UUID (from Auth), prefer that over placeholder ('owner_user_main', '00000000...', etc.)
        const isNewRealUuid = u.id && u.id.includes('-') && u.id.length > 20 && !u.id.startsWith('00000000');
        const isExistingDummy = !existing.id || existing.id.startsWith('owner_') || existing.id.startsWith('user_') || existing.id.startsWith('00000000');
        const resolvedId = (isNewRealUuid || isExistingDummy) ? u.id : existing.id;

        const resolvedName = (u.name && u.name !== 'مستخدم') ? u.name : existing.name;
        const resolvedRole = isOwner ? 'owner' : (u.school_role || existing.school_role || 'student');
        const resolvedStatus = u.status === 'disabled' || existing.status === 'disabled' ? 'disabled' : 'active';

        userMap.set(key, {
          ...existing,
          ...u,
          id: resolvedId,
          email: key,
          name: resolvedName,
          school_role: resolvedRole,
          status: resolvedStatus,
          customPermissions: u.customPermissions?.length ? u.customPermissions : existing.customPermissions,
          updatedAt: u.updatedAt || existing.updatedAt || new Date().toISOString(),
        });
      }
    };

    // 1. Seed known users first (owner and yaradrashed)
    for (const u of INITIAL_USERS) mergeUser(u);
    // 2. Merge local storage users
    for (const u of localUsers) mergeUser(u);
    // 3. Merge remote users from database
    for (const u of remoteUsers) mergeUser(u);

    const merged = Array.from(userMap.values());
    this.setStorage('users', merged);
    return merged;
  }

  public async addUser(user: UserProfile): Promise<UserProfile> {
    const cleanEmail = (user.email || '').trim().toLowerCase();
    const isOwner = cleanEmail === OWNER_EMAIL.toLowerCase();
    const cleanUser: UserProfile = {
      ...user,
      email: cleanEmail || user.email,
      school_role: isOwner ? 'owner' : (user.school_role || 'student'),
      status: user.status || 'active',
    };

    const list = this.getCollection<UserProfile[]>('users');
    // Filter out ANY previous entry with the same ID OR the same email to guarantee zero duplicates
    const filtered = list.filter(
      (u) => u.id !== cleanUser.id && (!cleanEmail || !u.email || u.email.trim().toLowerCase() !== cleanEmail)
    );
    const updated = [cleanUser, ...filtered];
    this.setStorage('users', updated);

    // Sync with Supabase users table
    try {
      const payload = {
        id: cleanUser.id,
        name: cleanUser.name,
        email: cleanEmail,
        school_role: cleanUser.school_role,
        status: cleanUser.status || 'active',
        custom_permissions: cleanUser.customPermissions || [],
      };
      const { error } = await supabase.from('users').upsert([payload]);
      if (error) {
        console.warn('Supabase users upsert notice:', error.message);
      }
    } catch (err) {
      console.warn('Supabase users upsert exception:', err);
    }

    return cleanUser;
  }

  public getUserById(id: string): UserProfile | null {
    const list = this.getCollection<UserProfile[]>('users');
    return list.find((u) => u.id === id) || null;
  }

  public getUserByEmail(email: string): UserProfile | null {
    if (!email) return null;
    const clean = email.trim().toLowerCase();
    const list = this.getCollection<UserProfile[]>('users');
    return list.find((u) => u.email && u.email.trim().toLowerCase() === clean) || null;
  }

  public syncUserProfileFromRemote(profile: UserProfile): void {
    const list = this.getCollection<UserProfile[]>('users');
    const cleanEmail = (profile.email || '').trim().toLowerCase();
    
    // Filter out previous version of this user
    const filtered = list.filter(
      (u) => u.id !== profile.id && (!cleanEmail || !u.email || u.email.trim().toLowerCase() !== cleanEmail)
    );
    const updated = [profile, ...filtered];
    this.setStorage('users', updated);
  }

  public async updateUser(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const list = this.getCollection<UserProfile[]>('users');
    const existing =
      list.find((u) => u.id === id) ||
      (updates.email ? list.find((u) => u.email?.trim().toLowerCase() === updates.email?.trim().toLowerCase()) : null);

    const targetEmail = (updates.email || existing?.email || '').trim().toLowerCase();
    const isOwner = targetEmail === OWNER_EMAIL.toLowerCase();

    // Prepare payload for Supabase public.users table
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.school_role) payload.school_role = isOwner ? 'owner' : updates.school_role;
    if (updates.status) payload.status = updates.status;
    if (updates.name) payload.name = updates.name;
    if (updates.customPermissions) payload.custom_permissions = updates.customPermissions;

    // Check if id is a valid PostgreSQL UUID
    const isValidUuid = Boolean(
      id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) &&
      !id.startsWith('00000000')
    );

    let dbSuccess = false;
    let dbErrorMsg: string | null = null;
    let finalId = id;

    console.log(`[dataStore.updateUser] Initiating Supabase update for ID: "${id}", Email: "${targetEmail}"`, payload);

    try {
      let updateRes: any = null;

      // 1. Try update by UUID if valid
      if (isValidUuid) {
        console.log(`[dataStore.updateUser] Executing update by ID: ${id}`);
        updateRes = await supabase.from('users').update(payload).eq('id', id).select();
      }

      // 2. If update by ID was not possible or returned 0 rows, try update by UNIQUE email
      if ((!updateRes || (Array.isArray(updateRes.data) && updateRes.data.length === 0)) && targetEmail) {
        console.log(`[dataStore.updateUser] Executing update by email: ${targetEmail}`);
        updateRes = await supabase.from('users').update(payload).eq('email', targetEmail).select();
      }

      // Inspect response from Supabase update
      if (updateRes?.error) {
        const err = updateRes.error;
        console.error('[dataStore.updateUser] Supabase UPDATE returned error:', err);
        if (err.code === '42501') {
          dbErrorMsg = `رفضت قاعدة البيانات التحديث بسبب سياسة الأمان (RLS Error 42501). يرجى التأكد من تنفيذ ملف SQL في Supabase.`;
        } else if (err.code === '22P02') {
          dbErrorMsg = `صيغة المعرف غير متوافقة مع قاعدة البيانات (UUID Syntax 22P02).`;
        } else {
          dbErrorMsg = `خطأ أثناء تحديث قاعدة البيانات (${err.code || 'Error'}): ${err.message}`;
        }
      } else if (updateRes && Array.isArray(updateRes.data) && updateRes.data.length > 0) {
        // Genuine update confirmed by Supabase returning updated row
        dbSuccess = true;
        const updatedRow = updateRes.data[0];
        console.log('[dataStore.updateUser] Supabase UPDATE succeeded! Updated row:', updatedRow);
        if (updatedRow.id) {
          finalId = updatedRow.id;
        }
      } else {
        // 0 rows updated and no error. The row does not exist in public.users yet -> attempt UPSERT
        console.warn('[dataStore.updateUser] 0 rows matched for UPDATE. Attempting UPSERT in public.users...');
        if (targetEmail) {
          const upsertPayload: Record<string, any> = {
            name: updates.name || existing?.name || targetEmail.split('@')[0],
            email: targetEmail,
            school_role: payload.school_role || existing?.school_role || 'student',
            status: payload.status || existing?.status || 'active',
            custom_permissions: payload.custom_permissions || existing?.customPermissions || [],
            updated_at: new Date().toISOString(),
          };
          if (isValidUuid) {
            upsertPayload.id = id;
          }

          const upsertRes = await supabase.from('users').upsert(upsertPayload, { onConflict: 'email' }).select();
          if (upsertRes.error) {
            console.error('[dataStore.updateUser] Supabase UPSERT returned error:', upsertRes.error);
            if (upsertRes.error.code === '42501') {
              dbErrorMsg = `رفضت قاعدة البيانات إدراج المستخدم بسبب سياسة الأمان (RLS Error 42501). يرجى تنفيذ ملف SQL في Supabase.`;
            } else {
              dbErrorMsg = `فشل إدراج المستخدم في قاعدة البيانات: ${upsertRes.error.message}`;
            }
          } else if (upsertRes.data && Array.isArray(upsertRes.data) && upsertRes.data.length > 0) {
            dbSuccess = true;
            console.log('[dataStore.updateUser] Supabase UPSERT succeeded! Row:', upsertRes.data[0]);
            if (upsertRes.data[0].id) {
              finalId = upsertRes.data[0].id;
            }
          } else {
            dbErrorMsg = 'لم يتم حفظ السجل في قاعدة بيانات Supabase (النتيجة فارغة 0 صفوف). قد يكون ذلك بسبب سياسة RLS تمنع التحديث بصمت.';
          }
        } else {
          dbErrorMsg = 'لم يتم العثور على المستخدم في قاعدة البيانات ولا يتوفر بريد إلكتروني لإنشائه.';
        }
      }
    } catch (e: any) {
      console.error('[dataStore.updateUser] Network or unexpected exception during Supabase update:', e);
      dbErrorMsg = e?.message || 'تعذر الاتصال بقاعدة البيانات';
    }

    // STRICT CHECK: If the database operation did not succeed in updating/returning rows, THROW ERROR!
    // Never allow a false success toast when Supabase has not been modified.
    if (!dbSuccess) {
      const finalMsg = dbErrorMsg || 'لم يتم تحديث أي صف في قاعدة البيانات Supabase (النتيجة 0 صفوف). يرجى فحص سياسات الأمان RLS.';
      console.error('[dataStore.updateUser] Aborting local update because DB update failed:', finalMsg);
      throw new Error(finalMsg);
    }

    // Update local storage ONLY AFTER successful DB confirmation
    const updated = list.map((u) => {
      if (u.id === id || (targetEmail && u.email?.trim().toLowerCase() === targetEmail)) {
        return {
          ...u,
          ...updates,
          id: finalId,
          school_role: payload.school_role || u.school_role,
          status: payload.status || u.status,
          name: payload.name || u.name,
          customPermissions: payload.custom_permissions || u.customPermissions,
          updatedAt: new Date().toISOString(),
        };
      }
      return u;
    });
    this.setStorage('users', updated);

    const savedUser = updated.find((u) => u.id === finalId || (targetEmail && u.email?.trim().toLowerCase() === targetEmail));
    return savedUser || existing!;
  }
}

export const dataStore = new LocalDataStore();
