import React from 'react';
import { SiteSettings } from '../types';
import { Info, Phone, Mail, MapPin, Award, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';

interface AboutAndContactViewProps {
  mode: 'about' | 'contact';
  settings: SiteSettings;
}

export const AboutAndContactView: React.FC<AboutAndContactViewProps> = ({ mode, settings }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16" dir="rtl">
      {/* Dynamic Header */}
      <div className="bg-gradient-to-l from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-serif">
          {mode === 'about' ? 'عن مدرسة صفية بنت عمر' : 'تواصل مع إدارة المدرسة'}
        </h1>
        <p className="text-xs sm:text-sm text-emerald-200 font-light max-w-xl mx-auto">
          {settings.motto}
        </p>
      </div>

      {mode === 'about' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">الرؤية والرسالة التعليمية</h2>
            <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
              {settings.aboutText}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="p-5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
              <ShieldCheck className="w-6 h-6 text-emerald-700 mb-2" />
              <h3 className="text-xs font-bold text-slate-900 mb-1">البيئة الآمنة والمحفزة</h3>
              <p className="text-[11px] text-slate-600">
                توفير بيئة تعليمية تضمن الراحة النفسية والأمان لجميع الطالبات ومنسوبات المدرسة.
              </p>
            </div>

            <div className="p-5 bg-amber-50/60 border border-amber-100 rounded-2xl">
              <Award className="w-6 h-6 text-amber-700 mb-2" />
              <h3 className="text-xs font-bold text-slate-900 mb-1">صقل المواهب والقدرات</h3>
              <p className="text-[11px] text-slate-600">
                برامج متقدمة في رعاية الموهوبات، الابتكار، والأنشطة الإثرائية المتنوعة.
              </p>
            </div>

            <div className="p-5 bg-teal-50/60 border border-teal-100 rounded-2xl">
              <Heart className="w-6 h-6 text-teal-700 mb-2" />
              <h3 className="text-xs font-bold text-slate-900 mb-1">القيم والأصالة</h3>
              <p className="text-[11px] text-slate-600">
                غرس القيم الإسلامية والوطنية وتنمية روح المبادرة والمسؤولية المجتمعية.
              </p>
            </div>
          </div>
        </div>
      )}

      {mode === 'contact' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900">بيانات التواصل الرسمية</h3>

            <div className="space-y-4 text-xs">
              {settings.phone ? (
                <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl">
                  <Phone className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 block">الهاتف المباشر</span>
                    <span className="text-slate-600 font-mono mt-0.5 block">{settings.phone}</span>
                  </div>
                </div>
              ) : null}

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl">
                <MapPin className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block">المقر والعنوان</span>
                  <span className="text-slate-600 mt-0.5 block">{settings.address}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">إرسال استفسار أو مقترح</h3>
            <form onSubmit={(e) => { e.preventDefault(); alert('شكراً لتواصلك، تم استلام رسالتك وسيتم الرد قريباً.'); }} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكريم</label>
                <input type="text" required placeholder="الاسم" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الجوال للتواصل</label>
                <input type="tel" required placeholder="05xxxxxxxx" className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نص الرسالة أو الاستفسار</label>
                <textarea rows={3} required placeholder="اكتب رسالتك هنا..." className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition-colors">
                إرسال الرسالة
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
