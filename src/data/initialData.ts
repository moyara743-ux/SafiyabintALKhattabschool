import { SchoolSettings, Post, SchoolEvent, GalleryPhoto } from '../types';

export const OWNER_EMAIL = 'moyara743@gmail.com';

export const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'مدرسة صفية بنت عمر',
  motto: 'نصنع المعرفة... ونوثق الإنجاز',
  aboutText: 'مدرسة صفية بنت عمر صرح تعليمي رائد يهدف إلى تقديم بيئة تعليمية محفزة ومبتكرة تضمن التفوق الأكاديمي وصقل المهارات الشخصية والقيادية لبناء جيل واعٍ ومبدع يساهم في نهضة وطنه ومجتمعه.',
  phone: '',
  email: '',
  address: 'المملكة العربية السعودية - الرياض',
  principalName: 'مديرة المدرسة',
  enableModerationWorkflow: false,
};

export const INITIAL_POSTS: Omit<Post, 'id'>[] = [
  {
    title: 'انطلاق فعاليات أسبوع الموهبة والابتكار في المدرسة',
    content: 'شهدت مدرسة صفية بنت عمر اليوم انطلاق أسبوع الموهبة والابتكار تحت شعار "عقول تبني المستقبل"، بمشاركة واسعة من الطالبات في مختلف المجالات العلمية والفنية والتقنية. تضمن الافتتاح معرضاً تفاعلياً لمشاريع الروبوت والذكاء الاصطناعي والأعمال الابتكارية، بحضور المشرفات التربويات وأولياء الأمور.',
    category: 'الأنشطة والابتكار',
    type: 'news',
    images: [
      'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80'
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
    content: 'افتتح اليوم بالطابور الصباحي والإذاعة المدرسية المتميزة حول "أهمية القراءة وتنمية المدارك". تلا ذلك تكريم الطالبات المتفوقات في مسابقة الرياضيات الذهنية والعلوم، مع تنفيذ ورشة عمل تطبيقية في معمل الحاسب الآلي.',
    category: 'يوميات المدرسة',
    type: 'today_summary',
    images: [
      'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80'
    ],
    authorId: 'system_admin',
    authorName: 'المرشدة الطلابية',
    authorRole: 'teacher',
    status: 'published',
    isPinned: false,
    likesCount: 18,
    likedBy: [],
    createdAt: new Date().toISOString(),
  },
  {
    title: 'تنبيه هام بشأن مواعيد الحضور للاختبارات الشهرية',
    content: 'نود تذكير جميع الطالبات وأولياء الأمور الكرام بأن موعد بدء الاختبارات الشهرية سيكون في تمام الساعة 7:30 صباحاً، مع ضرورة الالتزام بالزي المدرسي وإحضار الأدوات المدرسية كاملة.',
    category: 'إعلانات وتنبيهات',
    type: 'announcement',
    images: [],
    authorId: 'system_admin',
    authorName: 'شؤون الطالبات',
    authorRole: 'admin',
    status: 'published',
    isPinned: false,
    likesCount: 12,
    likedBy: [],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  }
];

export const INITIAL_EVENTS: Omit<SchoolEvent, 'id'>[] = [
  {
    title: 'معرض العلوم والتقنية السنوي',
    date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    time: '08:30 ص',
    location: 'الصالة المغلقة - مبنى ب',
    description: 'عرض أكثر من 40 مشروعاً علمياً وبحثياً أعدته طالبات المدرسة بإشراف قسم العلوم ومعلمات الموهوبات.',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    status: 'upcoming',
    category: 'علمي وتقني',
    authorId: 'system_admin',
    authorName: 'قسم العلوم',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'اليوم العالمي للغة العربية',
    date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
    time: '09:00 ص',
    location: 'مسرح المدرسة الرئيسي',
    description: 'فعالية احتفالية غنية بالقصائد والمسرحيات الهادفة ومعرض للخط العربي الأصيل بمشاركة نخبة من المعلمات والطالبات.',
    image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
    status: 'upcoming',
    category: 'ثقافي ولغوي',
    authorId: 'system_admin',
    authorName: 'قسم اللغة العربية',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'المؤتمر الطلابي السنوي للقيادة والإبداع',
    date: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0],
    time: '10:00 ص',
    location: 'قاعة المحاضرات الكبرى',
    description: 'جلسات حوارية تناولت مهارات التفكير النقدي، القيادة المدرسية، والعمل الجماعي.',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',
    status: 'completed',
    category: 'قيادي ومهاري',
    authorId: 'system_admin',
    authorName: 'الإرشاد الطلابي',
    createdAt: new Date().toISOString(),
  }
];

export const INITIAL_GALLERY: Omit<GalleryPhoto, 'id'>[] = [
  {
    title: 'الإذاعة المدرسية والطابور الصباحي',
    album: 'فعاليات المدرسة',
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1200&q=80',
    description: 'فقرات إذاعية متنوعة وعروض مسرحية صباحية من إعداد طالبات المدرسة.',
    authorId: 'system_admin',
    authorName: 'إدارة المدرسة',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'تجارب معمل الكيمياء والأحياء',
    album: 'الأنشطة الطلابية',
    imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
    description: 'تطبيق عملي وتجارب مخبرية مشوقة في المعمل المدرسي.',
    authorId: 'system_admin',
    authorName: 'قسم العلوم',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'معرض الفنون التشكيلية والخط',
    album: 'مناسبات المدرسة',
    imageUrl: 'https://images.unsplash.com/photo-1460518451282-474b15028898?auto=format&fit=crop&w=1200&q=80',
    description: 'لوحات فنية وأعمال يدوية أبدعتها طالبات مدرسة صفية بنت عمر.',
    authorId: 'system_admin',
    authorName: 'معلمات التربية الفنية',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'مكتبة المدرسة وحلقات القراءة',
    album: 'الأنشطة الطلابية',
    imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80',
    description: 'جلسات قراءة حوارية في مركز مصادر التعلم والمكتبة المدرسية.',
    authorId: 'system_admin',
    authorName: 'أمينة مصادر التعلم',
    createdAt: new Date().toISOString(),
  }
];
