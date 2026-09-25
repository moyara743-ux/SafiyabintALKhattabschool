# Security Specification & Threat Model
## تطبيق مدرسة صفية بنت عمر الابتدائية

### 1. Data Invariants (ثوابت البيانات)
1. **Protected Owner**: المستخدم `moyara743@gmail.com` هو مالك النظام الأساسي برتبة `owner`. لا يمكن لأي مستخدم آخر ترقية نفسه لرتبة `owner`، ولا يمكن لأي مستخدم تعديل بيانات أو رتبة المالك أو حذف حسابه.
2. **Hierarchy & Least Privilege**: الرتب تخضع للتدرج الهرمي الصارم (`owner: 100`, `director: 90`, `supervisor: 70`, `administrator: 60`, `counselor: 50`, `teacher: 40`, `student: 10`). لا يمكن لأي مستخدم تعيين رتبة أعلى من أو مساوية لرتبته الخاصة.
3. **Immutable Audit Trail**: سجل العمليات `activityLogs` غير قابل للتعديل أو الحذف إطلاقاً (`allow update, delete: if false;`).
4. **Account Disablement (Kill Switch)**: أي مستخدم بحالة `disabled` يفقد كافة صلاحيات القراءة الخاصة والكتابة على الفور.
5. **Time-bounded Delegations**: الصلاحيات المؤقتة (`temporaryPermissions`) محكومة بتواريخ بداية ونهاية `startDate` و `endDate` وتتحقق منها المنصة فورياً.
6. **Strict Field Whitelisting**: عمليات تعديل المنشورات من المستخدمين العاديين تقتصر فقط على مفاتيح الإعجاب `['likesCount', 'likedBy']`.

---

### 2. Multi-Role RBAC Matrix

| Role | Hierarchy | Announcements | Posts & News | Events | Achievements | Gallery & Photos | Users & Roles | Settings | Activity Logs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **owner** | 100 | CRUD | CRUD | CRUD | CRUD | CRUD | Full (All) | Manage | View (All) |
| **director** | 90 | CRUD | CRUD | CRUD | CRUD | CRUD | Manage < 90 | Manage | View |
| **supervisor** | 70 | CRU | CRU | CRU | CRU | CRU | No | Read | View |
| **administrator** | 60 | CRU | CRU | CRU | CRU | CRU | No | Read | Read |
| **counselor** | 50 | CR | CR | CR | R | R | No | Read | No |
| **teacher** | 40 | R | R | R | R | R | No | Read | No |
| **student** | 10 | R | R (Like) | R | R | R | No | Read | No |
| **public** | 0 | R | R | R | R | R | No | Read | No |

---

### 3. Dirty Dozen Attack Payloads (سيناريوهات الاختبار الأمني)

1. **Privilege Escalation via Profile Edit**:
   - *Attack*: مستخدم برتبة `teacher` يحاول إرسال طلب `updateDoc` على وثيقة حسابه في `users/{uid}` لتغيير `school_role: 'owner'`.
   - *Expected Outcome*: Rejected by Firestore rules (`request.resource.data.school_role == resource.data.school_role`).

2. **Tampering with Owner Profile**:
   - *Attack*: مستخدم برتبة `director` يحاول تعديل أو حذف حساب `owner` (`moyara743@gmail.com`).
   - *Expected Outcome*: Rejected by Firestore rules (`resource.data.school_role != 'owner' && resource.data.email != 'moyara743@gmail.com'`).

3. **Status Hijacking**:
   - *Attack*: مستخدم معطل `status: 'disabled'` يحاول إعادة تفعيل حسابه `status: 'active'`.
   - *Expected Outcome*: Rejected by Firestore rules (`request.resource.data.status == resource.data.status`).

4. **Disabled Account Write Attempt**:
   - *Attack*: مستخدم بحالة `disabled` يحاول إنشاء إعلان أو منشور في `posts`.
   - *Expected Outcome*: Rejected by Firestore rules (`isActive()` returns false).

5. **Audit Log Modification**:
   - *Attack*: مستخدم يحاول تعديل أو مسح سجل نشاط `activityLogs/{logId}` لإخفاء أثر عملية.
   - *Expected Outcome*: Rejected by Firestore rules (`allow update, delete: if false;`).

6. **Post Content Tampering via Like Action**:
   - *Attack*: طالب أو زائر يحاول استغلال ميزة الإعجاب لتعديل حقل `title` أو `content` في منشور.
   - *Expected Outcome*: Rejected by Firestore rules (`request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likesCount', 'likedBy'])`).

7. **Site Settings Vandalism**:
   - *Attack*: مستخدم غير مصرح له (معلم أو طالب) يحاول تغيير اسم المدرسة أو بيانات التواصل في `settings/general`.
   - *Expected Outcome*: Rejected by Firestore rules (`allow write: if isOwner() || ... role == 'director'`).

8. **Temporary Permission Expiry Bypass**:
   - *Attack*: محاولة استدعاء عملية بصلاحية مؤقتة انتهت صلاحيتها (`endDate < today`).
   - *Expected Outcome*: Rejected by client RBAC engine `computeEffectivePermissions` and verified on server-side rules.

9. **ID Spoofing on Post Creation**:
   - *Attack*: محاولة إرسال `authorId` منسوب للمديرة العامة بينما المرسل طالب.
   - *Expected Outcome*: Verified against `request.auth.uid`.

10. **Arbitrary Collection Insertion**:
    - *Attack*: محاولة الكتابة في مسارات غير معرفة في قواعد الأمان.
    - *Expected Outcome*: Denied by default rule set.

---

### 4. Verification & Testing
- تطبيق جميع القواعد عبر أداة `deploy_firebase`.
- تفعيل القراءة المزدوجة وإعادة التحقق الفوري (Re-read verification) لجميع عمليات الكتابة والتحديث.
- توثيق كافة العمليات الإدارية في سجل العمليات `activityLogs`.
