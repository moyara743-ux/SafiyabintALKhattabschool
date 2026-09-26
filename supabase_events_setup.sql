-- =========================================================================
-- جدول الفعاليات المدرسية وسياسات الأمان (RLS Policies) في Supabase
-- تطبيق مدرسة صفية بنت عمر الابتدائية
-- =========================================================================

-- 1. إنشاء جدول الفعاليات المدرسية (events) إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    location TEXT,
    image TEXT,
    category TEXT DEFAULT 'أنشطة عامة',
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
    author_id TEXT,
    author_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. تفعيل سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 3. سياسة القراءة (SELECT): متاحة للجميع (عامة) لعرض الفعاليات المدرسية
DROP POLICY IF EXISTS "events_public_select_policy" ON public.events;
CREATE POLICY "events_public_select_policy"
ON public.events
FOR SELECT
USING (true);

-- 4. سياسة الإضافة (INSERT): متاحة للمستخدمين المصرح لهم (مالك النظام، المديرة، المشرفة، الإدارية)
DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
CREATE POLICY "events_insert_policy"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND (
      users.school_role IN ('owner', 'director', 'supervisor', 'administrator')
      OR users.email = 'moyara743@gmail.com'
    )
  )
);

-- 5. سياسة التعديل (UPDATE): متاحة لمالك النظام والمديرة والمشرفة
DROP POLICY IF EXISTS "events_update_policy" ON public.events;
CREATE POLICY "events_update_policy"
ON public.events
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND (
      users.school_role IN ('owner', 'director', 'supervisor')
      OR users.email = 'moyara743@gmail.com'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND (
      users.school_role IN ('owner', 'director', 'supervisor')
      OR users.email = 'moyara743@gmail.com'
    )
  )
);

-- 6. سياسة الحذف (DELETE): مخصصة ومحصورة حصرياً بـ "مالك النظام" (owner) والمديرة
DROP POLICY IF EXISTS "events_delete_policy" ON public.events;
CREATE POLICY "events_delete_policy"
ON public.events
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND (
      users.school_role IN ('owner', 'director')
      OR users.email = 'moyara743@gmail.com'
    )
  )
);
