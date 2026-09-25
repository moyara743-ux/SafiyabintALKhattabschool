import { SiteSettings, Post, SchoolEvent, SchoolPhoto } from '../types';

export const OWNER_EMAIL = 'moyara743@gmail.com';

export const DEFAULT_SETTINGS: SiteSettings = {
  schoolName: 'مدرسة صفية بنت عمر الابتدائية',
  motto: 'صرح تعليمي رائد يصنع جيل المستقبل برؤية طموحة',
  aboutText:
    'مدرسة صفية بنت عمر صرح تعليمي رائد يهدف إلى تقديم بيئة تعليمية محفزة ومبتكرة تضمن التفوق الأكاديمي وصقل المهارات الشخصية والقيادية لبناء جيل واعٍ ومبدع يساهم في نهضة وطنه ومجتمعه.',
  phone: '011-2345678',
  email: 'info@safiah-school.edu.sa',
  address: 'المملكة العربية السعودية - الرياض',
  principalName: 'أ. هدى الغامدي',
};

export const INITIAL_POSTS: Omit<Post, 'id'>[] = [
  {
    title: 'انطلاق فعاليات أسبوع الموهبة والابتكار في المدرسة',
    content:
      'شهدت مدرسة صفية بنت عمر اليوم انطلاق أسبوع الموهبة والابتكار تحت شعار "عقول تبني المستقبل"، بمشاركة واسعة من الطالبات في مختلف المجالات العلمية والفنية والتقنية. تضمن الافتتاح معرضاً تفاعلياً لمشاريع الروبوت والذكاء الاصطناعي والأعمال الابتكارية، بحضور المشرفات التربويات وأولياء الأمور.',
    date: new Date().toISOString().split('T')[0],
    category: 'الأنشطة والابتكار',
    type: 'news',
    images: [
      'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80',
    ],
    authorId: 'system_admin',
    authorName: 'إدارة المدرسة',
    authorRole: 'owner',
    status: 'published',
    isPinned: true,
    likesCount: 24,
    likedBy: [],
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    title: 'ملخص فعاليات اليوم المدرسي: إنجازات وتكريم متميز',
    content:
      'افتتح اليوم بالطابور الصباحي والإذاعة المدرسية المتميزة حول "أهمية القراءة وتنمية المدارك". تلا ذلك تكريم الطالبات المتفوقات في مسابقة الرياضيات الذهنية والعلوم، مع تنفيذ ورشة عمل تطبيقية في معمل الحاسب الآلي.',
    date: new Date().toISOString().split('T')[0],
    category: 'يوميات المدرسة',
    type: 'today_summary',
    images: [
      'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80',
    ],
    authorId: 'system_admin',
    authorName: 'المرشدة الطلابية',
    authorRole: 'counselor',
    status: 'published',
    isPinned: false,
    likesCount: 18,
    likedBy: [],
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_EVENTS: Omit<SchoolEvent, 'id'>[] = [
  {
    title: 'معرض العلوم والتقنية السنوي',
    date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    time: '08:30 ص',
    location: 'الصالة المغلقة - مبنى ب',
    description:
      'عرض أكثر من 40 مشروعاً علمياً وبحثياً أعدته طالبات المدرسة بإشراف قسم العلوم ومعلمات الموهوبات.',
    image:
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    status: 'upcoming',
    category: 'علمي وتقني',
    authorId: 'system_admin',
    authorName: 'قسم العلوم',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_GALLERY: Omit<SchoolPhoto, 'id'>[] = [
  {
    title: 'الإذاعة المدرسية والطابور الصباحي',
    date: new Date().toISOString().split('T')[0],
    albumName: 'فعاليات المدرسة',
    imageUrl:
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
    description: 'فقرات إذاعية متنوعة وعروض مسرحية صباحية من إعداد طالبات المدرسة.',
    authorId: 'system_admin',
    authorName: 'إدارة المدرسة',
    createdAt: new Date().toISOString(),
  },
];
