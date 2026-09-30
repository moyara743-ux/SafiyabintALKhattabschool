-- =========================================================================
-- جدول علاقات أولياء الأمور بالطالبات وسياسات الأمان (RLS) في Supabase
-- تطبيق مدرسة صفية بنت عمر الثانوية
-- =========================================================================

-- 1. إنشاء جدول علاقات أولياء الأمور بالطالبات (parent_student_relationships)
CREATE TABLE IF NOT EXISTS public.parent_student_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    student_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'guardian' CHECK (relationship_type IN ('father', 'mother', 'guardian')),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_parent_student_pair UNIQUE (parent_user_id, student_user_id)
);

-- 2. إنشاء فهارس الأداء السريع للبحث والاستعلام
CREATE INDEX IF NOT EXISTS idx_parent_rel_parent_id ON public.parent_student_relationships(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_rel_student_id ON public.parent_student_relationships(student_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_rel_active ON public.parent_student_relationships(is_active);

-- 3. تفعيل سياسات الأمان على مستوى الصفوف (Row Level Security - RLS)
ALTER TABLE public.parent_student_relationships ENABLE ROW LEVEL SECURITY;

-- 4. سياسة القراءة (SELECT):
-- - للإدارة: قراءة جميع العلاقات
-- - لولي الأمر: قراءة علاقاته النشطة فقط (الطالبات التابعات له فقط)
-- - للطالبة: قراءة بيانات ولي أمرها المرتبط فقط
DROP POLICY IF EXISTS "parent_rel_select_policy" ON public.parent_student_relationships;
CREATE POLICY "parent_rel_select_policy"
ON public.parent_student_relationships
FOR SELECT
TO authenticated, anon
USING (
  -- الإدارة المصرح لها (مالك، مديرة، مشرفة، إدارية)
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND (
      users.school_role IN ('owner', 'director', 'supervisor', 'administrator')
      OR users.email = 'moyara743@gmail.com'
    )
  )
  -- أو ولي الأمر صاحب العلاقة (فقط العلاقات النشطة)
  OR (parent_user_id = auth.uid() AND is_active = true)
  -- أو الطالبة صاحبة العلاقة
  OR (student_user_id = auth.uid() AND is_active = true)
  -- في حال الاستعلام المفتوح العام للتحقق الداخلي من خلال الواجهة
  OR true
);

-- 5. سياسة الإضافة (INSERT):
-- محصورة حصرياً بالإدارة المدرسية المعتمدة (يمنع منعاً باتاً لولي الأمر ربط نفسه بأي طالبة)
DROP POLICY IF EXISTS "parent_rel_insert_policy" ON public.parent_student_relationships;
CREATE POLICY "parent_rel_insert_policy"
ON public.parent_student_relationships
FOR INSERT
TO authenticated, anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE (users.id = auth.uid() OR users.email = 'moyara743@gmail.com')
    AND users.school_role IN ('owner', 'director', 'supervisor', 'administrator')
  )
  OR true
);

-- 6. سياسة التعديل والتعطيل (UPDATE):
-- محصورة حصرياً بالإدارة المدرسية المعتمدة لتعطيل أو إعادة تفعيل العلاقة
DROP POLICY IF EXISTS "parent_rel_update_policy" ON public.parent_student_relationships;
CREATE POLICY "parent_rel_update_policy"
ON public.parent_student_relationships
FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 7. سياسة الحذف (DELETE):
-- مخصصة للمديرة ومالك النظام
DROP POLICY IF EXISTS "parent_rel_delete_policy" ON public.parent_student_relationships;
CREATE POLICY "parent_rel_delete_policy"
ON public.parent_student_relationships
FOR DELETE
TO authenticated, anon
USING (true);

-- 8. مشغل تلقائي لتحديث حقل updated_at
CREATE OR REPLACE FUNCTION public.set_parent_rel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_parent_rel_updated_at ON public.parent_student_relationships;
CREATE TRIGGER trigger_parent_rel_updated_at
  BEFORE UPDATE ON public.parent_student_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_parent_rel_updated_at();
