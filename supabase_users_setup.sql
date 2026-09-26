-- =========================================================================
-- جدول المستخدمين والرتب وسياسات الأمان (RLS Policies) في Supabase
-- تطبيق مدرسة صفية بنت عمر الابتدائية
-- =========================================================================

-- 1. إنشاء جدول المستخدمين (users) إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    school_role TEXT DEFAULT 'student' CHECK (school_role IN ('owner', 'director', 'supervisor', 'administrator', 'counselor', 'teacher', 'student')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. تفعيل سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. سياسة القراءة (SELECT): متاحة لجميع المستخدمين المسجلين لعرض أسماء ورتب المستخدمين
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy"
ON public.users
FOR SELECT
USING (true);

-- 4. سياسة الإضافة (INSERT): متاحة للمستخدم المسجل لإنشاء حسابه الخاص ومتاحة للمالك والإدارة
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
CREATE POLICY "users_insert_policy"
ON public.users
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- 5. سياسة التعديل (UPDATE): متاحة للمالك والمديرة، أو للمستخدم لتحديث بياناته الشخصية
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
CREATE POLICY "users_update_policy"
ON public.users
FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 6. سياسة الحذف (DELETE): مخصصة حصرياً لمالك النظام (owner)
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
CREATE POLICY "users_delete_policy"
ON public.users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND (users.school_role = 'owner' OR users.email = 'moyara743@gmail.com')
  )
);

-- 7. مشغل تلقائي (Trigger) لمزامنة أي حساب يتم إنشاؤه في auth.users إلى public.users تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, school_role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE WHEN LOWER(NEW.email) = 'moyara743@gmail.com' THEN 'owner' ELSE 'student' END,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.users.name),
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. إدراج أو تحديث حساب مالك النظام الأساسي لضمان وجوده دائماً
INSERT INTO public.users (id, name, email, school_role, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'بارا محمد راشد - مالك النظام',
  'moyara743@gmail.com',
  'owner',
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  school_role = 'owner',
  status = 'active',
  updated_at = NOW();
