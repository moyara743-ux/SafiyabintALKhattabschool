-- =========================================================================
-- جدول المستخدمين والرتب وسياسات الأمان والمزامنة الشاملة في Supabase
-- تطبيق مدرسة صفية بنت عمر الابتدائية
-- =========================================================================

-- 1. إنشاء جدول المستخدمين (users) إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    school_role TEXT DEFAULT 'student' CHECK (school_role IN ('owner', 'director', 'supervisor', 'administrator', 'counselor', 'teacher', 'parent', 'student')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- تحديث قيد التحقق لدعم رتبة ولي أمر (parent) في حال كان الجدول منشأ مسبقاً
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_school_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_school_role_check 
  CHECK (school_role IN ('owner', 'director', 'supervisor', 'administrator', 'counselor', 'teacher', 'parent', 'student'));

-- 2. تفعيل سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. سياسة القراءة (SELECT): متاحة للجميع لعرض أسماء ورتب المستخدمين في القائمة
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy"
ON public.users
FOR SELECT
USING (true);

-- 4. سياسة الإضافة (INSERT): متاحة للجميع لتسجيل الحسابات ومزامنة المستخدمين
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
CREATE POLICY "users_insert_policy"
ON public.users
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- 5. سياسة التعديل (UPDATE): مفتوحة لتحديث الرتب والصلاحيات دون حجب RLS صامت
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;
DROP POLICY IF EXISTS "Enable update for users" ON public.users;

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

-- 7. معالجة وتصحيح التكرار: حذف أي صف مكرر بـ ID وهمي لحساب المالك، والاحتفاظ بصف واحد فقط
DELETE FROM public.users
WHERE LOWER(email) = 'moyara743@gmail.com'
  AND (id = '00000000-0000-0000-0000-000000000001'::uuid OR id NOT IN (
    SELECT id FROM auth.users WHERE LOWER(email) = 'moyara743@gmail.com'
  ));

-- 8. مزامنة ونقل جميع مستخدمي Auth المسجلين فعلياً إلى جدول public.users (بما في ذلك منال علي والمالك)
-- مزامنة حساب المالك من auth.users:
INSERT INTO public.users (id, name, email, school_role, status)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'name', 'بارا محمد راشد - مالك النظام'),
  LOWER(email),
  'owner',
  'active'
FROM auth.users
WHERE LOWER(email) = 'moyara743@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  school_role = 'owner',
  status = 'active',
  updated_at = NOW();

-- مزامنة حساب منال علي (yaradrashed@gmail.com) من auth.users بدور student:
INSERT INTO public.users (id, name, email, school_role, status)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'name', 'منال علي'),
  LOWER(email),
  'student',
  'active'
FROM auth.users
WHERE LOWER(email) = 'yaradrashed@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  name = COALESCE(EXCLUDED.name, 'منال علي'),
  school_role = 'student',
  status = 'active',
  updated_at = NOW();

-- مزامنة أي مستخدمين آخرين موجودين في auth.users:
INSERT INTO public.users (id, name, email, school_role, status)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
  LOWER(email),
  CASE WHEN LOWER(email) = 'moyara743@gmail.com' THEN 'owner' ELSE 'student' END,
  'active'
FROM auth.users
ON CONFLICT (email) DO UPDATE SET
  id = EXCLUDED.id,
  updated_at = NOW();

-- 9. مشغل تلقائي (Trigger) لمزامنة أي حساب جديد ينشأ في auth.users مستقبلاً إلى public.users فوراً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, school_role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    LOWER(NEW.email),
    CASE WHEN LOWER(NEW.email) = 'moyara743@gmail.com' THEN 'owner' ELSE 'student' END,
    'active'
  )
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    name = COALESCE(EXCLUDED.name, public.users.name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
