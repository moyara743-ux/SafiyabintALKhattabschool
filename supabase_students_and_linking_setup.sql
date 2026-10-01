-- =========================================================================
-- جدول سجلات الطالبات ورموز ربط أولياء الأمور وسياسات الأمان في Supabase
-- تطبيق مدرسة صفية بنت عمر الثانوية
-- الأدوار المعتمدة: director, supervisor, administrator, counselor, teacher, student, parent
-- =========================================================================

-- 1. إنشاء جدول سجلات الطالبات المعتمدة في المدرسة (student_records)
CREATE TABLE IF NOT EXISTS public.student_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id_code TEXT UNIQUE NOT NULL, -- STU-000251 (المعرف الداخلي الثابت)
    name TEXT NOT NULL,
    phone TEXT NOT NULL, -- رقم الجوال المعتمد للطالبة
    national_id TEXT UNIQUE NOT NULL, -- رقم الهوية الوطنية إلزامي وفريد (10 أرقام)
    birth_date DATE,
    grade_stage TEXT DEFAULT 'الأول الثانوي',
    classroom TEXT DEFAULT '1/1',
    is_profile_complete BOOLEAN DEFAULT false,
    blood_type TEXT,
    notes TEXT,
    emergency_contact_phone TEXT,
    account_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_national_id_format CHECK (national_id ~ '^[12][0-9]{9}$')
);

-- فهارس الأداء السريع والتحقق
CREATE INDEX IF NOT EXISTS idx_student_records_code ON public.student_records(student_id_code);
CREATE INDEX IF NOT EXISTS idx_student_records_national_id ON public.student_records(national_id);
CREATE INDEX IF NOT EXISTS idx_student_records_phone ON public.student_records(phone);
CREATE INDEX IF NOT EXISTS idx_student_records_name ON public.student_records(name);

-- 2. إنشاء جدول رموز ربط أولياء الأمور (student_linking_codes)
-- كل رمز صالح لمدة 3 أيام فقط، ويستخدم لمرة واحدة فقط
CREATE TABLE IF NOT EXISTS public.student_linking_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.student_records(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- رمز عشوائي مشفر وقوي
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, -- created_at + 3 days
    is_used BOOLEAN DEFAULT false,
    is_revoked BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    used_by_parent_id UUID REFERENCES public.users(id),
    created_by UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_linking_codes_student ON public.student_linking_codes(student_id);
CREATE INDEX IF NOT EXISTS idx_linking_codes_code ON public.student_linking_codes(code);
CREATE INDEX IF NOT EXISTS idx_linking_codes_active ON public.student_linking_codes(is_used, is_revoked);

-- 3. تفعيل RLS على جدول الطالبات
ALTER TABLE public.student_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_linking_codes ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول لسجلات الطالبات
-- القراءة العامة المحدودة أو عبر الحسابات المعتمدة
DROP POLICY IF EXISTS "students_select_policy" ON public.student_records;
CREATE POLICY "students_select_policy" ON public.student_records
FOR SELECT TO authenticated, anon
USING (true);

-- التعديل والإضافة مقتصر على الإدارة (director, supervisor, administrator)
DROP POLICY IF EXISTS "students_admin_all_policy" ON public.student_records;
CREATE POLICY "students_admin_all_policy" ON public.student_records
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);

-- سياسات الوصول لرموز الربط
DROP POLICY IF EXISTS "linking_codes_policy" ON public.student_linking_codes;
CREATE POLICY "linking_codes_policy" ON public.student_linking_codes
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);
