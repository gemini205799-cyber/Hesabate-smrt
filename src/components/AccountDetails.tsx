import React, { useState } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  LogOut, 
  LogIn, 
  ChevronRight, 
  ChevronLeft,
  Calendar, 
  Database, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { type User, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { firebaseService } from '../services/firebaseService';

interface AccountDetailsProps {
  user: User | null;
  language: string;
  t: (key: any) => string;
  lastSync: string | null;
  setLastSync: (s: string | null) => void;
  onBack: () => void;
}

export const AccountDetails: React.FC<AccountDetailsProps> = ({
  user,
  language,
  t,
  lastSync,
  setLastSync,
  onBack
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const isAr = language === 'ar';

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      alert(isAr ? 'فشل تسجيل الدخول بواسطة Google' : 'Google sign-in failed');
    }
  };

  const handleLogout = async () => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من تسجيل الخروج؟' : 'Are you sure you want to sign out?')) return;
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackup = async () => {
    if (!user) {
      alert(isAr ? 'يرجى تسجيل الدخول أولاً للنسخ السحابي' : 'Please sign in first');
      return;
    }
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const syncTime = await firebaseService.backupData();
      if (syncTime) {
        setLastSync(syncTime);
        setSyncStatusMsg(isAr ? 'تم النسخ الاحتياطي السحابي بنجاح!' : 'Cloud backup completed successfully!');
      }
    } catch (err) {
      console.error(err);
      alert(isAr ? 'فشل النسخ الاحتياطي' : 'Backup failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!user) {
      alert(isAr ? 'يرجى تسجيل الدخول أولاً لاستعادة البيانات' : 'Please sign in first');
      return;
    }
    if (!window.confirm(isAr ? 'تنبيه: هذا الإجراء سيستبدل البيانات المحلية بالبيانات المحفوظة سحابياً. هل تريد المتابعة؟' : 'This will replace local data with cloud data. Continue?')) return;
    
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const syncTime = await firebaseService.restoreData();
      if (syncTime) {
        setLastSync(syncTime);
        alert(isAr ? 'تمت استعادة البيانات بنجاح!' : 'Data restored successfully!');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert(isAr ? 'فشلت عملية الاستعادة' : 'Restore failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header bar with Back button */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white transition-colors"
            title={isAr ? 'رجوع' : 'Back'}
          >
            {isAr ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
          </button>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {isAr ? 'تفاصيل الحساب' : 'Account Details'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'إدارة ملف المستخدم والمزامنة السحابية' : 'Manage profile & cloud sync'}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card p-6 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-700 shadow-md object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border-2 border-blue-500/30">
                <UserIcon size={38} />
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center ${user ? 'bg-emerald-500' : 'bg-amber-500'}`}>
              {user ? <CheckCircle2 size={14} className="text-white" /> : <AlertCircle size={14} className="text-white" />}
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1 text-center sm:text-right">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {user ? (user.displayName || (isAr ? 'مستخدم حساباتي' : 'Hesabati User')) : (isAr ? 'حساب غير متصل' : 'Not Connected')}
              </h3>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${user ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'}`}>
                {user ? (isAr ? 'حساب Google نشط' : 'Google Connected') : (isAr ? 'بيانات محلية فقط' : 'Local Only')}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mb-3 flex items-center justify-center sm:justify-start gap-1">
              <Mail size={13} className="opacity-70" />
              <span>{user ? user.email : (isAr ? 'لا يوجد بريد إلكتروني مرتبط' : 'No email linked')}</span>
            </p>

            {/* Login or Logout Action */}
            {user ? (
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black transition-all border border-rose-200 dark:border-rose-800 active:scale-95"
              >
                <LogOut size={15} />
                <span>{isAr ? 'تسجيل الخروج من هذا الحساب' : 'Sign Out'}</span>
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-500/20 active:scale-95"
              >
                <LogIn size={15} />
                <span>{isAr ? 'تسجيل الدخول بحساب Google' : 'Sign In with Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cloud Database Connection Info */}
      <div className="card p-5 space-y-4">
        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
          <Database size={16} className="text-blue-600" />
          <span>{isAr ? 'اتصال قاعدة البيانات السحابية' : 'Cloud Database Connection'}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block mb-0.5 font-bold">{isAr ? 'مشروع فايربيس' : 'Firebase Project'}</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">wesam-10492</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block mb-0.5 font-bold">{isAr ? 'قاعدة بيانات Firestore' : 'Database ID'}</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">ai-studio-07e6c0e6-5984-45ec-914e-6416bd7e353c</span>
          </div>
        </div>

        {/* Sync Times */}
        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
              {isAr ? 'آخر مزامنة سحابية:' : 'Last Cloud Sync:'}
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
            {lastSync ? new Date(lastSync).toLocaleString(isAr ? 'ar-IQ' : 'en-US') : (isAr ? 'لم تتم المزامنة بعد' : 'Never')}
          </span>
        </div>

        {syncStatusMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-black text-center">
            {syncStatusMsg}
          </div>
        )}

        {/* Sync Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleBackup}
            disabled={isSyncing || !user}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
          >
            <CloudUpload size={16} />
            <span>{isSyncing ? (isAr ? 'جاري المزامنة...' : 'Syncing...') : (isAr ? 'نسخ سحابي الآن' : 'Backup Now')}</span>
          </button>

          <button
            onClick={handleRestore}
            disabled={isSyncing || !user}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
          >
            <CloudDownload size={16} />
            <span>{isSyncing ? (isAr ? 'جاري المزامنة...' : 'Syncing...') : (isAr ? 'استعادة البيانات' : 'Restore Now')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
