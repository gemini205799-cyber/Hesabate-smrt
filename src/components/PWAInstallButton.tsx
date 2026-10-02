import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  language?: string;
  variant?: 'banner' | 'button' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  language = 'ar',
  variant = 'button'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const isAr = language === 'ar';

  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={20} className="shrink-0" />
          <span className="text-xs font-black">
            {isAr ? 'التطبيق مثبت ويعمل كبرنامج أندرويد مستقل' : 'App is installed and running in standalone mode'}
          </span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'banner' ? (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-3.5 rounded-2xl shadow-lg border border-blue-400/40 flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
              <Smartphone size={22} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white">
                {isAr ? 'تثبيت تطبيق حساباتي على أندرويد' : 'Install Hesabati on Android'}
              </p>
              <p className="text-[11px] text-blue-100 font-bold opacity-90">
                {isAr ? 'يعمل بدون متصفح ويدعم العمل بدون إنترنت' : 'Fast standalone app with offline support'}
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="shrink-0 bg-white text-blue-900 font-black px-4 py-2 rounded-xl text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>{isAr ? 'تثبيت الآن' : 'Install'}</span>
          </button>
        </div>
      ) : variant === 'settings' ? (
        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Smartphone size={22} />
            </div>
            <div>
              <p className="font-black text-slate-900 dark:text-white text-sm">
                {isAr ? 'تثبيت التطبيق على جهازك' : 'Install Application'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {isAr ? 'استخدم حساباتي كتطبيق أندرويد مستقل على الشاشة الرئيسية' : 'Run Hesabati as a native Android app'}
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-500/20"
          >
            <Download size={16} />
            <span>{isAr ? 'تثبيت على الهاتف' : 'Install App'}</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm transition-transform active:scale-95"
          title={isAr ? 'تثبيت التطبيق' : 'Install App'}
        >
          <Download size={14} />
          <span>{isAr ? 'تثبيت التطبيق' : 'Install'}</span>
        </button>
      )}

      {/* Guide modal if direct prompt is deferred or on iOS/manual */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
              <Smartphone size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-950 dark:text-white mb-2">
              {isAr ? 'طريقة تثبيت التطبيق على هاتفك' : 'How to install on your phone'}
            </h3>
            {isIOS ? (
              <div className="text-sm text-slate-700 dark:text-slate-200 space-y-2 mb-6 leading-relaxed">
                <p>1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح سفاري بالأسفل.</p>
                <p>2. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</p>
                <p>3. اضغط على <strong>إضافة (Add)</strong> وسيظهر التطبيق بين تطبيقاتك.</p>
              </div>
            ) : (
              <div className="text-sm text-slate-700 dark:text-slate-200 space-y-2 mb-6 leading-relaxed">
                <p>1. اضغط على قائمة المتصفح (نقاط القائمة <strong>⋮</strong> أعلى يمين أو يسار شاشة كروم).</p>
                <p>2. اختر <strong>تثبيت التطبيق (Install App)</strong> أو <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</p>
                <p>3. سيتم تثبيت التطبيق كبرنامج مستقل على هاتفك فوراً!</p>
              </div>
            )}
            <button
              onClick={() => setShowGuide(false)}
              className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-black text-white hover:bg-blue-700 active:scale-95 transition-all"
            >
              {isAr ? 'حسناً، فهمت' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
