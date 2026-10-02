import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  HandCoins, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  TrendingDown, 
  TrendingUp,
  Receipt,
  Settings as SettingsIcon,
  CircleDot,
  Calculator,
  CheckCircle2,
  Edit,
  Trash2,
  ChevronLeft,
  Heart,
  Info,
  LogOut,
  Cloud,
  CloudDownload,
  CloudUpload,
  User as UserIcon,
  MessageCircle,
  Phone,
  Pencil,
  Sun,
  Moon,
  Check,
  Sparkles,
  Landmark,
  FileText,
  FileSpreadsheet,
  Calendar,
  PieChart,
  ChevronDown,
  ChevronUp,
  Clock,
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Income, type Expense, type Sula, type Debt } from './db';
import { 
  auth, 
  googleProvider 
} from './lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  type User
} from 'firebase/auth';
import { firebaseService } from './services/firebaseService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import confetti from 'canvas-confetti';
import { PWAInstallButton } from './components/PWAInstallButton';
import { MenuDropdown } from './components/MenuDropdown';
import { AccountDetails } from './components/AccountDetails';
import { ExcelExportModal } from './components/ExcelExportModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const SummaryCard = ({ title, amount, type, icon: Icon, currency, isHidden }: { title: string, amount: string, type: 'income' | 'expense' | 'neutral', icon: any, currency: string, isHidden?: boolean }) => (
  <div className={cn(
    "summary-card",
    type === 'income' ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/40 text-slate-900 dark:text-white shadow-sm" : 
    type === 'expense' ? "bg-rose-50 dark:bg-rose-950/20 border-rose-500/40 text-slate-900 dark:text-white shadow-sm" : 
    "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 shadow-sm"
  )}>
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm font-black text-slate-700 dark:text-slate-200">{title}</p>
      <Icon size={20} className={type === 'income' ? "text-emerald-600 dark:text-emerald-400" : type === 'expense' ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"} />
    </div>
      <p className="text-2xl font-black font-mono text-slate-950 dark:text-white">
        {isHidden ? '****' : amount} 
        <span className="text-xs font-sans font-black opacity-70 ml-1">{currency}</span>
      </p>
  </div>
);

const NavButton = ({ active, onClick, icon: Icon, label, neonClass }: { active: boolean, onClick: () => void, icon: any, label: string, neonClass?: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 flex-1 py-2 transition-all duration-300",
      neonClass,
      active 
        ? "font-black " + neonClass?.replace('neon-', 'neon-pulse-') 
        : "opacity-60 saturate-[0.8]"
    )}
  >
    <Icon size={22} fill={active ? "currentColor" : "none"} className={cn("transition-transform duration-300", active && "scale-110")} />
    <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
  </button>
);

// --- Modules ---

const Dashboard = ({ t, language, privacyMode, togglePrivacy, widgets, formatAmount, getCurrencyLabel, setActiveTab, requestDelete }: { t: any, language: string, privacyMode: boolean, togglePrivacy: () => void, widgets: any, formatAmount: (n: number) => string, getCurrencyLabel: () => string, setActiveTab: (tab: any) => void, requestDelete: (id: number, type: 'income' | 'expense' | 'sula' | 'debt', cb?: () => void) => void }) => {
  const incomes = useLiveQuery(() => db.incomes.toArray());
  const expenses = useLiveQuery(() => db.expenses.toArray());
  const debts = useLiveQuery(() => db.debts.toArray());
  const sulas = useLiveQuery(() => db.sulas.where('status').equals('active').toArray());

  const totalIncome = incomes?.reduce((n, i) => n + i.amount, 0) || 0;
  const totalExpense = expenses?.reduce((n, e) => n + e.amount, 0) || 0;
  const totalIOWe = debts?.filter(d => d.type === 'owe').reduce((n, d) => n + d.remainingAmount, 0) || 0;
  const totalHeOwesMe = debts?.filter(d => d.type === 'owed').reduce((n, d) => n + d.remainingAmount, 0) || 0;
  const balance = totalIncome - totalExpense;

  const fixedExpenses = expenses?.filter(e => e.type === 'fixed').reduce((n, e) => n + e.amount, 0) || 0;
  const variableExpenses = expenses?.filter(e => e.type === 'variable').reduce((n, e) => n + e.amount, 0) || 0;
  
  const activeLoans = sulas?.filter(s => s.type === 'loan').length || 0;
  const activeSulas = sulas?.filter(s => s.type === 'sula' || !s.type).length || 0;

  // Current calendar month calculations (الشهر الميلادي الحالي)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyIncomes = incomes?.filter(i => {
    if (!i.date) return false;
    const d = new Date(i.date);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }) || [];
  const monthlyIncomeTotal = monthlyIncomes.reduce((n, i) => n + (i.amount || 0), 0);

  const monthlyExpenses = expenses?.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }) || [];
  const monthlyExpenseTotal = monthlyExpenses.reduce((n, e) => n + (e.amount || 0), 0);

  const monthlyNet = monthlyIncomeTotal - monthlyExpenseTotal;
  const monthlySpentPercent = monthlyIncomeTotal > 0 
    ? Math.round((monthlyExpenseTotal / monthlyIncomeTotal) * 100) 
    : (monthlyExpenseTotal > 0 ? 100 : 0);
  const progressBarWidth = Math.min(100, Math.max(0, monthlySpentPercent));

  const currentMonthName = now.toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-US', { 
    month: 'long', 
    year: 'numeric' 
  });

  const generateReport = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(t('reportTitle'), 20, 20);
    
    doc.setFontSize(14);
    doc.text(`Total Income: ${totalIncome.toLocaleString('en-US')} IQD`, 20, 40);
    doc.text(`Total Expense: ${totalExpense.toLocaleString('en-US')} IQD`, 20, 50);
    doc.text(`Current Balance: ${balance.toLocaleString('en-US')} IQD`, 20, 60);

    doc.save('hesabati-report.pdf');
    alert(t('reportSuccess'));
  };

  const [showAddIncome, setShowAddIncome] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const addIncome = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Math.round(Number(formData.get('amount')));
    const category = formData.get('category') as string;

    if (editingIncome?.id) {
      await db.incomes.update(editingIncome.id, {
        amount,
        category,
        date: editingIncome.date // keep original date or use current? Let's keep original
      });
      setEditingIncome(null);
    } else {
      await db.incomes.add({
        amount,
        category,
        date: new Date(),
        currency: 'IQD'
      });
    }
    setShowAddIncome(false);
  };

  const startEdit = (income: Income) => {
    setEditingIncome(income);
    setShowAddIncome(true);
  };

  const deleteIncome = (id: number) => {
    requestDelete(id, 'income');
  };

  const deleteExpense = (id: number) => {
    requestDelete(id, 'expense');
  };

  return (
    <div className="space-y-6">
      <PWAInstallButton language={language} variant="banner" />
      <div className="bg-gradient-to-br from-[#0a192f] via-[#112240] to-blue-900 p-8 rounded-b-[48px] -mx-4 -mt-4 text-white shadow-xl border-b-4 border-slate-950 dark:border-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="flex justify-between items-start relative z-10">
          <div className="cursor-pointer" onClick={togglePrivacy}>
            <p className="text-blue-100/60 text-sm mb-1 font-black tracking-widest flex items-center gap-2">
              {t('availableBalance')}
              {privacyMode ? <CheckCircle2 size={12} className="opacity-50" /> : <CircleDot size={12} className="opacity-50" />}
            </p>
            <h2 className="text-4xl font-black font-mono tracking-tighter text-blue-50">
              {privacyMode ? '****' : formatAmount(balance)} 
              {!privacyMode && <span className="text-base font-sans font-black opacity-60 ml-2">{getCurrencyLabel()}</span>}
            </h2>
          </div>
          <button 
            onClick={() => { setEditingIncome(null); setShowAddIncome(true); }}
            className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-slate-950 dark:border-white shadow-xl"
          >
            <Plus size={28} />
          </button>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-md border border-slate-950 dark:border-white cursor-pointer group" onClick={togglePrivacy}>
            <p className="text-[10px] text-blue-200/60 mb-1 flex items-center gap-1 font-black uppercase tracking-widest"><ArrowUpCircle size={14} className="text-emerald-400"/> {t('totalIncome')}</p>
            <p className="text-xl font-black font-mono text-white group-hover:scale-105 transition-transform">{privacyMode ? '****' : formatAmount(totalIncome)}</p>
          </div>
          <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-md border border-slate-950 dark:border-white cursor-pointer group" onClick={togglePrivacy}>
            <p className="text-[10px] text-blue-200/60 mb-1 flex items-center gap-1 font-black uppercase tracking-widest"><ArrowDownCircle size={14} className="text-rose-400"/> {t('totalExpenses')}</p>
            <p className="text-xl font-black font-mono text-white group-hover:scale-105 transition-transform">{privacyMode ? '****' : formatAmount(totalExpense)}</p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAddIncome && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card border-slate-950 dark:border-white p-6 bg-white dark:bg-slate-800">
            <form onSubmit={addIncome} className="space-y-4">
              <h4 className="font-bold text-xl flex items-center gap-2 text-slate-900 dark:text-white">
                {editingIncome ? <Pencil size={20} className="text-blue-500" /> : <Plus size={20} className="text-blue-500" />}
                {editingIncome ? t('editIncome') : t('addIncome')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-widest">{t('amount')}</label>
                  <input 
                    name="amount" 
                    type="number" 
                    defaultValue={editingIncome?.amount || ''}
                    placeholder="0" 
                    className="input-field text-xl font-mono" 
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-widest">{t('incomeSource')}</label>
                  <input 
                    name="category" 
                    defaultValue={editingIncome?.category || ''}
                    placeholder={t('incomeSourcePlaceholder') || 'Salary, Gift...'} 
                    className="input-field" 
                    required 
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 btn-primary py-4 rounded-2xl text-lg">{t('save')}</button>
                <button type="button" onClick={() => { setShowAddIncome(false); setEditingIncome(null); }} className="px-8 py-4 border-2 border-slate-950 dark:border-white rounded-2xl font-black text-slate-950 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-all">{t('cancel')}</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Monthly Summary Card (الملخص الشهري للتقويم الحالي) */}
      <div className="card p-5 bg-white dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-400/5 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-900/60 shadow-sm shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {language === 'ar' ? 'الملخص الشهري' : 'Monthly Summary'}
                </h3>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  {currentMonthName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                {language === 'ar' ? 'مقارنة المصروفات مقابل الدخل للشهر الميلادي الحالي' : 'Total spent vs. total income for current calendar month'}
              </p>
            </div>
          </div>

          {/* Health Status Badge */}
          <div className={cn(
            "px-2.5 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 shadow-sm",
            monthlyIncomeTotal === 0 && monthlyExpenseTotal === 0
              ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
              : monthlySpentPercent <= 70
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : monthlySpentPercent <= 90
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full",
              monthlyIncomeTotal === 0 && monthlyExpenseTotal === 0
                ? "bg-slate-400"
                : monthlySpentPercent <= 70
                  ? "bg-emerald-500"
                  : monthlySpentPercent <= 90
                    ? "bg-amber-500"
                    : "bg-rose-500 animate-pulse"
            )} />
            <span>
              {monthlyIncomeTotal === 0 && monthlyExpenseTotal === 0
                ? (language === 'ar' ? 'لا توجد بيانات' : 'No Data')
                : monthlySpentPercent <= 70
                  ? (language === 'ar' ? 'وضع مالي آمن' : 'Healthy')
                  : monthlySpentPercent <= 90
                    ? (language === 'ar' ? 'اقتراب من الحد' : 'Caution')
                    : monthlySpentPercent > 100
                      ? (language === 'ar' ? `تجاوز الدخل (+${monthlySpentPercent - 100}%)` : `Over Budget (+${monthlySpentPercent - 100}%)`)
                      : (language === 'ar' ? 'استهلاك مرتفع' : 'High Spending')
              }
            </span>
          </div>
        </div>

        {/* 3 Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 relative z-10">
          {/* 1. Monthly Income */}
          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <ArrowUpCircle size={14} />
                <span>{language === 'ar' ? 'دخل الشهر' : 'Monthly Income'}</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600/80 dark:text-emerald-400/80 font-bold">
                {monthlyIncomes.length} {language === 'ar' ? 'عملية' : 'tx'}
              </span>
            </div>
            <p className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400">
              {privacyMode ? '****' : `+${formatAmount(monthlyIncomeTotal)}`}
              {!privacyMode && <span className="text-xs font-sans font-bold text-emerald-700/70 dark:text-emerald-300/70 ml-1">{getCurrencyLabel()}</span>}
            </p>
          </div>

          {/* 2. Monthly Spent */}
          <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 rounded-2xl border border-rose-200/80 dark:border-rose-900/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <ArrowDownCircle size={14} />
                <span>{language === 'ar' ? 'مصروفات الشهر' : 'Total Spent'}</span>
              </span>
              <span className="text-[10px] font-mono text-rose-600/80 dark:text-rose-400/80 font-bold">
                {monthlyExpenses.length} {language === 'ar' ? 'بند' : 'tx'}
              </span>
            </div>
            <p className="font-mono font-black text-lg text-rose-600 dark:text-rose-400">
              {privacyMode ? '****' : `-${formatAmount(monthlyExpenseTotal)}`}
              {!privacyMode && <span className="text-xs font-sans font-bold text-rose-700/70 dark:text-rose-300/70 ml-1">{getCurrencyLabel()}</span>}
            </p>
          </div>

          {/* 3. Monthly Net Savings / Remaining */}
          <div className={cn(
            "p-3 rounded-2xl border",
            monthlyNet >= 0 
              ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40" 
              : "bg-red-50/60 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40"
          )}>
            <div className="flex items-center justify-between mb-1">
              <span className={cn(
                "text-[11px] font-bold flex items-center gap-1",
                monthlyNet >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"
              )}>
                <Wallet size={14} />
                <span>{monthlyNet >= 0 ? (language === 'ar' ? 'فائض الشهر' : 'Net Surplus') : (language === 'ar' ? 'عجز الشهر' : 'Net Deficit')}</span>
              </span>
            </div>
            <p className={cn(
              "font-mono font-black text-lg",
              monthlyNet >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
            )}>
              {privacyMode ? '****' : `${monthlyNet >= 0 ? '+' : ''}${formatAmount(monthlyNet)}`}
              {!privacyMode && <span className="text-xs font-sans font-bold ml-1 opacity-80">{getCurrencyLabel()}</span>}
            </p>
          </div>
        </div>

        {/* Visual Progress Bar Section */}
        <div className="space-y-2 relative z-10 pt-1">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>{language === 'ar' ? 'نسبة الصرف من دخل الشهر:' : 'Spent of Monthly Income:'}</span>
              <span className={cn(
                "font-mono font-black text-sm",
                monthlySpentPercent <= 70 
                  ? "text-emerald-600 dark:text-emerald-400" 
                  : monthlySpentPercent <= 90 
                    ? "text-amber-600 dark:text-amber-400" 
                    : "text-rose-600 dark:text-rose-400"
              )}>
                {monthlySpentPercent}%
              </span>
            </span>

            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              {privacyMode ? '****' : (
                monthlyIncomeTotal > 0 
                  ? (monthlyNet >= 0 
                      ? `${language === 'ar' ? 'المتبقي للتوفير: ' : 'Remaining: '}${formatAmount(monthlyNet)} ${getCurrencyLabel()}`
                      : `${language === 'ar' ? 'تجاوزت بمقدار: ' : 'Over by: '}${formatAmount(Math.abs(monthlyNet))} ${getCurrencyLabel()}`)
                  : ''
              )}
            </span>
          </div>

          {/* The Progress Bar */}
          <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-700/70 rounded-full p-0.5 overflow-hidden border border-slate-200 dark:border-slate-600 shadow-inner">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                monthlySpentPercent <= 70 
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/30" 
                  : monthlySpentPercent <= 90 
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 shadow-sm shadow-amber-500/30" 
                    : "bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 shadow-sm shadow-rose-500/30"
              )}
              style={{ width: `${progressBarWidth}%` }}
            />
          </div>

          {/* Scale Legend */}
          <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold px-1">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100% {monthlySpentPercent > 100 ? `(الفعلي: ${monthlySpentPercent}%)` : ''}</span>
          </div>
        </div>

        {/* Contextual Insight Note */}
        <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Sparkles size={14} className={cn(
            "shrink-0",
            monthlySpentPercent <= 70 ? "text-emerald-500" : monthlySpentPercent <= 90 ? "text-amber-500" : "text-rose-500"
          )} />
          <span className="text-[11px] leading-relaxed">
            {monthlyIncomeTotal === 0 && monthlyExpenseTotal === 0
              ? (language === 'ar' ? 'لم يتم تسجيل أي دخل أو مصروفات للشهر الحالي حتى الآن.' : 'No income or expenses recorded for this month yet.')
              : monthlySpentPercent <= 70
                ? (language === 'ar' ? 'ممتاز! نفقاتك ضمن الحدود الآمنة وتوفر فائضاً مالياً مريحاً هذا الشهر.' : 'Great! Spending is within safe limits with a comfortable surplus this month.')
                : monthlySpentPercent <= 90
                  ? (language === 'ar' ? 'تنبيه: اقتربت المصروفات من سقف دخل الشهر الحالي، يُنصح بالتحكم في الصرفيات المتغيرة.' : 'Notice: Expenses are approaching this month\'s income limit. Consider slowing down variable spending.')
                  : monthlySpentPercent > 100
                    ? (language === 'ar' ? `تحذير: تجاوزت مصروفات هذا الشهر الدخل الإجمالي بمقدار ${formatAmount(Math.abs(monthlyNet))} ${getCurrencyLabel()}.` : `Warning: Monthly expenses exceeded income by ${formatAmount(Math.abs(monthlyNet))} ${getCurrencyLabel()}.`)
                    : (language === 'ar' ? 'حذر: تم استهلاك أكثر من 90% من دخل الشهر الحالي تقريباً.' : 'Caution: Over 90% of this month\'s income has been spent.')
            }
          </span>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setActiveTab('planner')} 
        className="mx-2 p-5 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border border-slate-950 dark:border-white rounded-[32px] cursor-pointer hover:shadow-lg hover:shadow-indigo-500/5 transition-all group overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:rotate-12 transition-transform">
               <Calculator size={24} />
             </div>
             <div>
               <p className="font-black text-sm uppercase tracking-tighter text-indigo-700 dark:text-indigo-400">{t('smartPlanner')}</p>
               <p className="text-[10px] font-black text-slate-950 dark:text-white line-clamp-1">{t('plannerDesc')}</p>
             </div>
          </div>
          <div className={cn("w-9 h-9 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all", language === 'ar' && "rotate-180")}>
            <ChevronLeft size={20} className={cn(language === 'ar' ? "" : "rotate-180")} />
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="font-bold text-xl flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
            {t('incomeHistory') || (language === 'ar' ? 'سجل الدخل' : 'Income History')}
          </h3>
          {!privacyMode && incomes && incomes.length > 0 && (
            <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-full uppercase tracking-tighter">
              {incomes.length} {t('entries')}
            </span>
          )}
        </div>

        <div className="space-y-3 px-2">
          {incomes?.slice().reverse().slice(0, 5).map((income) => (
            <div key={income.id} className="card p-3 bg-white dark:bg-slate-800 border-slate-950 dark:border-white shadow-sm flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <ArrowUpCircle size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white leading-none">{income.category}</p>
                  <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold mt-1 uppercase tracking-tighter">{new Date(income.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-mono font-black text-emerald-600">
                  {privacyMode ? '****' : formatAmount(income.amount)}
                </p>
                <div className="flex gap-1">
                  <button 
                    onClick={() => startEdit(income)}
                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                    title={language === 'ar' ? 'تعديل' : 'Edit'}
                  >
                    <Pencil size={15} />
                  </button>
                  <button 
                    onClick={() => income.id && deleteIncome(income.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                    title={language === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {(!incomes || incomes.length === 0) && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-300 font-medium italic text-sm">
              {language === 'ar' ? 'لا يوجد سجل للدخل بعد' : 'No income history yet'}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center px-2">
        <h3 className="font-bold text-xl flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
          {t('overview')}
        </h3>
        <button onClick={generateReport} className="text-blue-500 text-sm font-bold flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-950 dark:border-white px-4 py-1.5 rounded-xl hover:bg-slate-200 transition-colors">
          <Receipt size={14} /> {t('downloadReport')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div onClick={() => togglePrivacy()} className="cursor-pointer">
          <SummaryCard 
            title={t('availableBalance')} 
            amount={formatAmount(balance)} 
            type="neutral" 
            icon={Wallet} 
            currency={getCurrencyLabel()} 
            isHidden={privacyMode}
          />
        </div>
        
        <div onClick={() => setActiveTab('expenses')} className="cursor-pointer">
          <SummaryCard 
            title={t('totalIncome')} 
            amount={formatAmount(totalIncome)} 
            type="income" 
            icon={ArrowUpCircle} 
            currency={getCurrencyLabel()} 
            isHidden={privacyMode}
          />
        </div>

        <div onClick={() => setActiveTab('expenses')} className="cursor-pointer">
          <SummaryCard 
            title={t('totalExpenses')} 
            amount={formatAmount(totalExpense)} 
            type="expense" 
            icon={ArrowDownCircle} 
            currency={getCurrencyLabel()} 
            isHidden={privacyMode}
          />
        </div>

        <div onClick={() => setActiveTab('debts')} className="cursor-pointer">
          <SummaryCard 
            title={t('debtsIowe')} 
            amount={formatAmount(totalIOWe)} 
            type="expense" 
            icon={TrendingDown} 
            currency={getCurrencyLabel()}
            isHidden={privacyMode}
          />
        </div>

        <div onClick={() => setActiveTab('debts')} className="cursor-pointer">
          <SummaryCard 
            title={t('owedToMe')} 
            amount={formatAmount(totalHeOwesMe)} 
            type="income" 
            icon={HandCoins} 
            currency={getCurrencyLabel()}
            isHidden={privacyMode}
          />
        </div>

        <div onClick={() => setActiveTab('expenses')} className="cursor-pointer">
          <SummaryCard 
            title={language === 'ar' ? 'صرفيات ثابتة' : 'Fixed Expenses'} 
            amount={formatAmount(fixedExpenses)} 
            type="expense" 
            icon={Receipt} 
            currency={getCurrencyLabel()}
            isHidden={privacyMode}
          />
        </div>

        <div onClick={() => setActiveTab('expenses')} className="cursor-pointer">
          <SummaryCard 
            title={language === 'ar' ? 'صرفيات متغيرة' : 'Variable Expenses'} 
            amount={formatAmount(variableExpenses)} 
            type="expense" 
            icon={ArrowDownCircle} 
            currency={getCurrencyLabel()}
            isHidden={privacyMode}
          />
        </div>

        <div onClick={() => setActiveTab('loans')} className="cursor-pointer">
          <SummaryCard 
            title={language === 'ar' ? 'القروض' : 'Loans'} 
            amount={activeLoans.toString()} 
            type="neutral" 
            icon={TrendingUp} 
            currency={language === 'ar' ? 'قرض' : 'Loan'}
          />
        </div>

        <div onClick={() => setActiveTab('sulas')} className="cursor-pointer">
          <SummaryCard 
            title={t('activeSulas')} 
            amount={activeSulas.toString()} 
            type="neutral" 
            icon={CircleDot} 
            currency={language === 'ar' ? 'سلفة' : 'Sula'}
          />
        </div>
      </div>
    </div>
  );
};

const SulaManager = ({ t, language, widgets, updateWidget, formatAmount, getCurrencyLabel, requestDelete }: { t: any, language: string, widgets?: any, updateWidget?: any, formatAmount: (n: number) => string, getCurrencyLabel: () => string, requestDelete: (id: number, type: 'income' | 'expense' | 'sula' | 'debt', cb?: () => void) => void }) => {
  const sulas = useLiveQuery(() => db.sulas.toArray());
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'sula' | 'loan'>('sula');
  const [sulaFilterRole, setSulaFilterRole] = useState<'member' | 'organizer'>('member');
  
  // Sula-specific states
  const [role, setRole] = useState<'organizer' | 'member'>('member');
  const [turnType, setTurnType] = useState<'fixed' | 'lottery'>('fixed');
  const [frequency, setFrequency] = useState<'monthly' | 'biweekly' | 'custom'>('monthly');
  const [customDays, setCustomDays] = useState(30);

  // Loan-specific states for interactive form
  const [bankNameInput, setBankNameInput] = useState('');
  const [loanAmountInput, setLoanAmountInput] = useState('');
  const [totalToRepayInput, setTotalToRepayInput] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState('0');

  // Modals for loan payments
  const [payingLoan, setPayingLoan] = useState<Sula | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentDateInput, setPaymentDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNoteInput, setPaymentNoteInput] = useState('');
  const [showExcelModal, setShowExcelModal] = useState(false);

  const [viewHistoryLoan, setViewHistoryLoan] = useState<Sula | null>(null);

  const popularBanks = [
    'مصرف الرافدين',
    'مصرف الرشيد',
    'المصرف العراقي للتجارة (TBI)',
    'مصرف بغداد',
    'مصرف الأهلي العراقي',
    'مصرف الشرق الأوسط',
    'مصرف المنصور',
    'مصرف إسلامي'
  ];

  const filteredItems = sulas?.filter(s => {
    if ((s.type || 'sula') !== activeSubTab) return false;
    if (activeSubTab === 'sula') {
      return (s.role || 'member') === sulaFilterRole;
    }
    return true;
  }) || [];

  const openAddForm = () => {
    setEditingId(null);
    if (activeSubTab === 'loan') {
      setBankNameInput('');
      setLoanAmountInput('');
      setTotalToRepayInput('');
      setPaidAmountInput('0');
    } else {
      setRole('member');
      setTurnType('fixed');
      setFrequency('monthly');
      setCustomDays(30);
    }
    setShowAdd(true);
  };

  const handleEdit = (item: Sula) => {
    setEditingId(item.id!);
    setActiveSubTab(item.type || 'sula');
    if (item.type === 'loan') {
      setBankNameInput(item.bank || '');
      setLoanAmountInput((item.loanAmount ?? item.totalAmount ?? '').toString());
      setTotalToRepayInput((item.totalToRepay ?? item.totalAmount ?? '').toString());
      const currentPaid = (item.loanPayments && item.loanPayments.length > 0)
        ? item.loanPayments.reduce((acc, p) => acc + p.amount, 0)
        : (item.paidAmount || 0);
      setPaidAmountInput(currentPaid.toString());
    } else {
      setRole(item.role || 'member');
      setTurnType(item.turnType || 'fixed');
      setFrequency(item.frequency || 'monthly');
      setCustomDays(item.frequencyDays || 30);
    }
    setShowAdd(true);
  };

  const closeForm = () => {
    setShowAdd(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (activeSubTab === 'loan') {
      const name = (formData.get('name') as string || '').trim();
      const bank = (formData.get('bank') as string || bankNameInput || '').trim();
      const loanAmount = Math.round(Number(formData.get('loanAmount') || loanAmountInput || 0));
      const totalToRepay = Math.round(Number(formData.get('totalToRepay') || totalToRepayInput || loanAmount));
      const monthlyInstallment = Math.round(Number(formData.get('installment') || 0));
      const initialPaid = Math.round(Number(formData.get('paidAmount') || paidAmountInput || 0));
      const startDateStr = (formData.get('startDate') as string) || new Date().toISOString().split('T')[0];
      const endDateStr = (formData.get('endDate') as string) || '';

      const oldLoan = editingId ? sulas?.find(s => s.id === editingId) : null;
      let existingPayments = oldLoan?.loanPayments || [];

      // If initial paid was provided without prior payment receipts, create initial receipt
      if (existingPayments.length === 0 && initialPaid > 0) {
        existingPayments = [{
          id: Date.now().toString(),
          amount: initialPaid,
          date: startDateStr,
          note: language === 'ar' ? 'رصيد مسدد سابقاً' : 'Initial Paid Balance'
        }];
      }

      const computedPaid = existingPayments.length > 0
        ? existingPayments.reduce((sum, p) => sum + p.amount, 0)
        : initialPaid;
      // المعادلة: المبلغ المتبقي = مبلغ القرض - المبلغ الواصل للمصرف
      const remainingPrincipal = Math.max(0, loanAmount - computedPaid);
      const remainingAmount = Math.max(0, totalToRepay - computedPaid);

      const loanData: any = {
        name,
        bank,
        loanAmount,
        totalToRepay,
        totalAmount: totalToRepay,
        monthlyInstallment: monthlyInstallment || (totalToRepay > 0 ? Math.round(totalToRepay / 12) : 0),
        paidAmount: computedPaid,
        remainingPrincipal,
        remainingAmount,
        loanPayments: existingPayments,
        startDate: startDateStr,
        endDate: endDateStr,
        myTurn: 1,
        status: remainingAmount <= 0 ? 'completed' : 'active',
        type: 'loan',
        role: 'member',
        participantsCount: 1,
        frequency: 'monthly',
        frequencyDays: 30,
        turnType: 'fixed',
        paidMonths: monthlyInstallment > 0 ? Math.floor(computedPaid / monthlyInstallment) : 0
      };

      if (editingId) {
        await db.sulas.update(editingId, loanData);
      } else {
        await db.sulas.add(loanData);
      }
      setShowAdd(false);
      setEditingId(null);
      return;
    }

    // Sula saving logic
    const totalAmount = Math.round(Number(formData.get('totalAmount')));
    const monthlyInstallment = Math.round(Number(formData.get('installment')));
    const count = Number(formData.get('participantsCount')) || (monthlyInstallment > 0 ? Math.ceil(totalAmount / monthlyInstallment) : 1);
    const startDateStr = formData.get('startDate') as string;
    const startDate = new Date(startDateStr);
    const freqDays = frequency === 'monthly' ? 30 : frequency === 'biweekly' ? 15 : customDays;
    const daysToAdd = (count - 1) * freqDays;
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysToAdd);

    const rawNames = formData.get('participantsNames') as string;
    const names = role === 'organizer' && rawNames ? rawNames.split('\n').filter(n => n.trim()) : [];
    const payments: { [name: string]: number } = {};
    if (role === 'organizer') {
      names.forEach(name => {
        if (editingId) {
          const oldSula = sulas?.find(s => s.id === editingId);
          if (oldSula?.participantPayments && oldSula.participantPayments[name] !== undefined) {
            payments[name] = oldSula.participantPayments[name];
            return;
          }
        }
        payments[name] = 0;
      });
    }

    const turnValue = formData.get('turn');
    const myTurn = turnType === 'fixed' ? Math.round(Number(turnValue)) : 'lottery';

    const sulaData: any = {
      name: formData.get('name') as string,
      totalAmount,
      monthlyInstallment,
      startDate: startDateStr,
      endDate: endDate.toISOString().split('T')[0],
      myTurn,
      status: 'active',
      type: 'sula',
      role,
      participantsCount: count,
      frequency,
      frequencyDays: freqDays,
      turnType,
      participantNames: names,
      participantPayments: role === 'organizer' ? payments : undefined
    };

    if (editingId) {
      await db.sulas.update(editingId, sulaData);
    } else {
      await db.sulas.add({ ...sulaData, paidMonths: 0 });
    }
    setShowAdd(false);
    setEditingId(null);
  };

  // Record a payment to a loan
  const handleSaveLoanPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingLoan || !payingLoan.id) return;
    const payAmt = Math.round(Number(paymentAmountInput));
    if (payAmt <= 0) return;

    const currentPayments = payingLoan.loanPayments || [];
    const newPayment = {
      id: Date.now().toString(),
      amount: payAmt,
      date: paymentDateInput || new Date().toISOString().split('T')[0],
      note: paymentNoteInput.trim()
    };
    const updatedPayments = [...currentPayments, newPayment];
    // المبلغ الواصل = يجب أن تجمع جميع المبالغ المدفوعة
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const baseRepay = payingLoan.totalToRepay || payingLoan.loanAmount || payingLoan.totalAmount;
    const basePrincipal = payingLoan.loanAmount || payingLoan.totalAmount;
    const newRemainingPrincipal = Math.max(0, basePrincipal - totalPaid);
    const newRemaining = Math.max(0, baseRepay - totalPaid);

    await db.sulas.update(payingLoan.id, {
      loanPayments: updatedPayments,
      paidAmount: totalPaid,
      remainingPrincipal: newRemainingPrincipal,
      remainingAmount: newRemaining,
      status: newRemaining <= 0 ? 'completed' : 'active'
    });

    setPayingLoan(null);
    setPaymentAmountInput('');
    setPaymentNoteInput('');
  };

  // Delete a recorded loan payment
  const handleDeleteLoanPayment = async (loan: Sula, paymentId: string) => {
    if (!loan.id) return;
    const updatedPayments = (loan.loanPayments || []).filter(p => p.id !== paymentId);
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const baseRepay = loan.totalToRepay || loan.loanAmount || loan.totalAmount;
    const basePrincipal = loan.loanAmount || loan.totalAmount;
    const newRemainingPrincipal = Math.max(0, basePrincipal - totalPaid);
    const newRemaining = Math.max(0, baseRepay - totalPaid);

    await db.sulas.update(loan.id, {
      loanPayments: updatedPayments,
      paidAmount: totalPaid,
      remainingPrincipal: newRemainingPrincipal,
      remainingAmount: newRemaining,
      status: newRemaining <= 0 ? 'completed' : 'active'
    });

    setViewHistoryLoan(prev => prev && prev.id === loan.id ? {
      ...prev,
      loanPayments: updatedPayments,
      paidAmount: totalPaid,
      remainingPrincipal: newRemainingPrincipal,
      remainingAmount: newRemaining
    } : prev);
  };

  // Interactive calculations for loan form
  const parsedLoanAmount = Math.max(0, Number(loanAmountInput) || 0);
  const parsedTotalToRepay = Math.max(0, Number(totalToRepayInput) || parsedLoanAmount);
  const parsedPaid = Math.max(0, Number(paidAmountInput) || 0);
  // المعادلة المطلوبة: المبلغ المتبقي = مبلغ القرض - المبلغ الواصل للمصرف
  const calculatedRemainingFromLoan = Math.max(0, parsedLoanAmount - parsedPaid);
  const calculatedRemainingTotal = Math.max(0, parsedTotalToRepay - parsedPaid);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <h2 className={cn("text-2xl font-black", activeSubTab === 'sula' ? "neon-emerald" : "neon-blue")}>
            {activeSubTab === 'sula' ? t('sulas') : (language === 'ar' ? 'القروض المصرفية' : 'Bank Loans')}
          </h2>
          {widgets && updateWidget && (
            <button 
              onClick={() => updateWidget('sulas', !widgets.sulas)}
              className={cn(
                "p-1.5 rounded-lg border transition-colors",
                widgets.sulas 
                  ? "bg-primary/10 border-blue-600 text-primary dark:border-blue-400" 
                  : "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
              )}
              title={t('showOnDashboard')}
            >
              <LayoutDashboard size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowExcelModal(!showExcelModal)}
            className={cn(
              "p-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm",
              showExcelModal 
                ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/30" 
                : "border-emerald-500/30 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-600/40 dark:text-emerald-300"
            )}
            title={language === 'ar' ? 'تبويب تصدير بيانات السلف والقروض إلى إكسل' : 'Export to Excel'}
          >
            <FileSpreadsheet size={16} />
            <span className="hidden sm:inline">{language === 'ar' ? 'تصدير إكسل' : 'Export Excel'}</span>
          </button>
          {!showExcelModal && (
            <button onClick={openAddForm} className="btn-primary flex items-center gap-2">
              <Plus size={20} />
              <span>{activeSubTab === 'sula' ? t('addSula') : (language === 'ar' ? 'إضافة قرض' : 'Add Loan')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Subtabs Switcher: السلف | القروض | تصدير إكسل */}
      <div className="grid grid-cols-3 gap-2 bg-slate-200/80 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-300 dark:border-slate-700">
        <button 
          type="button"
          onClick={() => { setActiveSubTab('sula'); setShowAdd(false); setEditingId(null); setShowExcelModal(false); }}
          className={cn(
            "py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2",
            activeSubTab === 'sula' && !showExcelModal
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.01]" 
              : "text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700"
          )}
        >
          <TrendingUp size={16} />
          <span>{t('sulasSub')}</span>
        </button>
        <button 
          type="button"
          onClick={() => { setActiveSubTab('loan'); setShowAdd(false); setEditingId(null); setShowExcelModal(false); }}
          className={cn(
            "py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2",
            activeSubTab === 'loan' && !showExcelModal
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.01]" 
              : "text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700"
          )}
        >
          <Landmark size={16} />
          <span>{t('loansSub')}</span>
        </button>
        <button 
          type="button"
          onClick={() => { setShowExcelModal(!showExcelModal); setShowAdd(false); setEditingId(null); }}
          className={cn(
            "py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2",
            showExcelModal
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.01]" 
              : "text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700"
          )}
        >
          <FileSpreadsheet size={16} />
          <span>{language === 'ar' ? 'تصدير إكسل' : 'Excel Export'}</span>
        </button>
      </div>

      {/* Inline Excel Export Tab (ضمن الصفحة المفتوحة حالياً) */}
      <AnimatePresence>
        {showExcelModal && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <ExcelExportModal
              isOpen={showExcelModal}
              inline={true}
              onClose={() => setShowExcelModal(false)}
              language={language as any}
              formatAmount={formatAmount}
              getCurrencyLabel={getCurrencyLabel}
              initialTab={activeSubTab === 'loan' ? 'loans' : 'sulas'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sula Role Sub-filter */}
      {activeSubTab === 'sula' && (
        <div className="flex gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
          <button 
            onClick={() => setSulaFilterRole('member')}
            className={cn(
              "flex-1 py-3 px-4 rounded-2xl border-2 transition-all group relative overflow-hidden",
              sulaFilterRole === 'member' 
                ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500" 
                : "border-slate-200 bg-white text-slate-800 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700"
            )}
          >
            <div className="flex flex-col items-center gap-1 relative z-10">
              <UserIcon size={18} className={cn(sulaFilterRole === 'member' ? "text-emerald-600" : "text-slate-600 dark:text-slate-400")} />
              <span className="text-[11px] font-black uppercase tracking-tighter">{t('joinedSulas')}</span>
            </div>
          </button>

          <button 
            onClick={() => setSulaFilterRole('organizer')}
            className={cn(
              "flex-1 py-3 px-4 rounded-2xl border-2 transition-all group relative overflow-hidden",
              sulaFilterRole === 'organizer' 
                ? "border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500" 
                : "border-slate-200 bg-white text-slate-800 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700"
            )}
          >
            <div className="flex flex-col items-center gap-1 relative z-10">
              <LayoutDashboard size={18} className={cn(sulaFilterRole === 'organizer' ? "text-amber-600" : "text-slate-600 dark:text-slate-400")} />
              <span className="text-[11px] font-black uppercase tracking-tighter">{t('managedSulas')}</span>
            </div>
          </button>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="card bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 overflow-hidden shadow-xl"
          >
            <form onSubmit={handleSave} className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  {activeSubTab === 'loan' ? <Landmark size={20} className="text-blue-600" /> : <TrendingUp size={20} className="text-emerald-600" />}
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    {activeSubTab === 'loan'
                      ? (editingId ? (language === 'ar' ? 'تعديل بيانات القرض' : 'Edit Loan Details') : (language === 'ar' ? 'إضافة قرض جديد' : 'Add New Loan'))
                      : (editingId ? (language === 'ar' ? 'تعديل بيانات السلفة' : 'Edit Sula Details') : t('addSula'))
                    }
                  </h3>
                </div>
                <button type="button" onClick={closeForm} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  ✕
                </button>
              </div>

              {/* LOAN FORM */}
              {activeSubTab === 'loan' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* اسم القرض */}
                    <div>
                      <label className="text-xs font-black text-slate-900 dark:text-white block mb-1 uppercase tracking-wider">
                        {t('loanName')} *
                      </label>
                      <input 
                        name="name" 
                        defaultValue={editingId ? sulas?.find(s => s.id === editingId)?.name : ''} 
                        className="input-field" 
                        placeholder={language === 'ar' ? "مثلاً: قرض سيارة، قرض بناء، قرض شخصي" : "e.g. Car Loan, Building Loan"} 
                        required 
                      />
                    </div>

                    {/* المصرف */}
                    <div>
                      <label className="text-xs font-black text-slate-900 dark:text-white block mb-1 uppercase tracking-wider">
                        {t('bankName')} *
                      </label>
                      <input 
                        name="bank" 
                        value={bankNameInput}
                        onChange={(e) => setBankNameInput(e.target.value)}
                        className="input-field" 
                        placeholder={language === 'ar' ? "مثلاً: مصرف الرافدين، مصرف الرشيد، TBI" : "e.g. Rafidain Bank, Rasheed Bank"} 
                        required 
                      />
                    </div>
                  </div>

                  {/* Popular Bank Chips */}
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                      <Landmark size={12} />
                      <span>{language === 'ar' ? 'اختر المصرف بسرعة:' : 'Quick Select Bank:'}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {popularBanks.map((bName) => (
                        <button
                          key={bName}
                          type="button"
                          onClick={() => setBankNameInput(bName)}
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-xs font-bold transition-all border",
                            bankNameInput === bName
                              ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600"
                          )}
                        >
                          {bName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Loan Amounts Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* مبلغ القرض */}
                    <div>
                      <label className="text-xs font-black text-slate-900 dark:text-white block mb-1 uppercase tracking-wider">
                        {language === 'ar' ? 'مبلغ القرض (الأصل)' : 'Loan Principal'} *
                      </label>
                      <input 
                        name="loanAmount" 
                        type="number"
                        value={loanAmountInput}
                        onChange={(e) => {
                          setLoanAmountInput(e.target.value);
                          if (!totalToRepayInput || totalToRepayInput === loanAmountInput) {
                            setTotalToRepayInput(e.target.value);
                          }
                        }}
                        className="input-field font-mono font-bold" 
                        placeholder="10,000,000" 
                        required 
                      />
                    </div>

                    {/* المبلغ الذي يجب سداده */}
                    <div>
                      <label className="text-xs font-black text-slate-900 dark:text-white block mb-1 uppercase tracking-wider">
                        {language === 'ar' ? 'المبلغ الذي يجب سداده' : 'Total to Repay'} *
                      </label>
                      <input 
                        name="totalToRepay" 
                        type="number"
                        value={totalToRepayInput}
                        onChange={(e) => setTotalToRepayInput(e.target.value)}
                        className="input-field font-mono font-bold" 
                        placeholder="11,500,000" 
                        required 
                      />
                    </div>

                    {/* المبلغ الواصل للمصرف */}
                    <div>
                      <label className="text-xs font-black text-slate-900 dark:text-white block mb-1 uppercase tracking-wider">
                        {language === 'ar' ? 'المبلغ الواصل للمصرف' : 'Paid Amount'}
                      </label>
                      <input 
                        name="paidAmount" 
                        type="number"
                        value={paidAmountInput}
                        onChange={(e) => setPaidAmountInput(e.target.value)}
                        className="input-field font-mono font-bold text-emerald-600" 
                        placeholder="0" 
                      />
                    </div>
                  </div>

                  {/* Real-time Calculation Card (المعادلة المطلوبة بالظبط) */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900/60 dark:to-blue-950/40 border-2 border-blue-200 dark:border-blue-800 space-y-2.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>{language === 'ar' ? 'مبلغ القرض (الأصل):' : 'Loan Principal:'}</span>
                      <span className="font-mono text-slate-950 dark:text-white font-black">{formatAmount(parsedLoanAmount)} {getCurrencyLabel()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>{language === 'ar' ? 'المبلغ الذي يجب سداده للمصرف:' : 'Total To Repay:'}</span>
                      <span className="font-mono text-blue-700 dark:text-blue-300 font-black">{formatAmount(parsedTotalToRepay)} {getCurrencyLabel()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>{language === 'ar' ? 'المبلغ الواصل للمصرف (مجموع الدفعات):' : 'Amount Paid To Bank:'}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{formatAmount(parsedPaid)} {getCurrencyLabel()}</span>
                    </div>
                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800/80 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                          <span>{language === 'ar' ? 'المبلغ المتبقي = مبلغ القرض - الواصل:' : 'Remaining Balance:'}</span>
                        </span>
                        <span className="font-mono text-lg font-black text-rose-600 dark:text-rose-400">
                          {formatAmount(calculatedRemainingFromLoan)} {getCurrencyLabel()}
                        </span>
                      </div>
                      {parsedTotalToRepay > parsedLoanAmount && (
                        <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                          <span>{language === 'ar' ? 'المتبقي الكلي المطلوب سداده (مع الفائدة):' : 'Total to Repay Remaining:'}</span>
                          <span className="font-mono font-black text-slate-900 dark:text-white">{formatAmount(calculatedRemainingTotal)} {getCurrencyLabel()}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center font-bold">
                      {language === 'ar' 
                        ? 'المعادلة: المبلغ المتبقي = مبلغ القرض - المبلغ الواصل للمصرف' 
                        : 'Formula: Remaining = Loan Amount - Amount Paid to Bank'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-black text-slate-900 dark:text-white block mb-1 uppercase tracking-wider">
                        {t('monthlyInstallment')} ({language === 'ar' ? 'اختياري' : 'Optional'})
                      </label>
                      <input 
                        name="installment" 
                        type="number" 
                        defaultValue={editingId ? sulas?.find(s => s.id === editingId)?.monthlyInstallment : ''} 
                        className="input-field font-mono" 
                        placeholder="250,000" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-900 dark:text-white block mb-1 uppercase tracking-wider">
                        {t('startDate')}
                      </label>
                      <input 
                        name="startDate" 
                        type="date" 
                        defaultValue={editingId ? sulas?.find(s => s.id === editingId)?.startDate : new Date().toISOString().split('T')[0]} 
                        className="input-field font-bold" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-900 dark:text-white block mb-1 uppercase tracking-wider">
                        {t('endDate')} ({language === 'ar' ? 'تاريخ الانتهاء' : 'End Date'})
                      </label>
                      <input 
                        name="endDate" 
                        type="date" 
                        defaultValue={editingId ? sulas?.find(s => s.id === editingId)?.endDate : ''} 
                        className="input-field font-bold" 
                      />
                    </div>
                  </div>

                  {/* Form Action Buttons: Save & Cancel */}
                  <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button 
                      type="submit" 
                      className="btn-primary flex-1 py-3.5 text-base flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                    >
                      <Check size={20} />
                      <span>{editingId ? (language === 'ar' ? 'تحديث بيانات القرض' : 'Update Loan') : (language === 'ar' ? 'حفظ القرض' : 'Save Loan')}</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={closeForm} 
                      className="px-6 py-3.5 border-2 border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                /* SULA FORM */
                <div className="space-y-5">
                  <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">{t('iAm')}</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setRole('member')}
                          className={cn("flex-1 py-3 rounded-xl border-2 transition-all font-bold text-sm", role === 'member' ? "border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500" : "border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300")}
                        >
                          {t('member')}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setRole('organizer')}
                          className={cn("flex-1 py-3 rounded-xl border-2 transition-all font-bold text-sm", role === 'organizer' ? "border-amber-600 bg-amber-500/10 text-amber-600 dark:border-amber-500" : "border-transparent bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-300")}
                        >
                          {t('organizer')}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('sulaName')}</label>
                      <input name="name" defaultValue={editingId ? sulas?.find(s => s.id === editingId)?.name : ''} className="input-field" placeholder={language === 'ar' ? "مثلاً: سلفة الموظفين، سلفة الأقارب" : "e.g. Employee Sula"} required />
                    </div>
                    
                    <div>
                      <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('totalAmount')}</label>
                      <input name="totalAmount" type="number" defaultValue={editingId ? sulas?.find(s => s.id === editingId)?.totalAmount : ''} className="input-field font-mono" placeholder="1,000,000" required />
                    </div>
                    <div>
                      <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('monthlyInstallment')}</label>
                      <input name="installment" type="number" defaultValue={editingId ? sulas?.find(s => s.id === editingId)?.monthlyInstallment : ''} className="input-field font-mono" placeholder="100,000" required />
                    </div>

                    <div>
                      <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('participantsCount')}</label>
                      <input name="participantsCount" type="number" defaultValue={editingId ? sulas?.find(s => s.id === editingId)?.participantsCount : ''} className="input-field font-mono" placeholder="10" required min="1" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('frequency')}</label>
                      <select 
                        className="input-field" 
                        value={frequency} 
                        onChange={(e) => setFrequency(e.target.value as any)}
                        name="frequency"
                      >
                        <option value="monthly">{t('monthlyFreq')}</option>
                        <option value="biweekly">{t('biweekly')}</option>
                        <option value="custom">{t('customDays')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('turnType')}</label>
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setTurnType('fixed')}
                          className={cn(
                            "flex-1 py-3 text-xs font-black border-2 rounded-xl transition-all",
                            turnType === 'fixed' 
                              ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" 
                              : "border-transparent bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                          )}
                        >
                          {t('fixedTurn')}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setTurnType('lottery')}
                          className={cn(
                            "flex-1 py-3 text-xs font-black border-2 rounded-xl transition-all",
                            turnType === 'lottery' 
                              ? "border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" 
                              : "border-transparent bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                          )}
                        >
                          {t('lottery')}
                        </button>
                      </div>
                    </div>

                    {turnType === 'fixed' && (
                      <div>
                        <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('yourTurn')}</label>
                        <input name="turn" type="number" defaultValue={(editingId && sulas?.find(s => s.id === editingId)?.myTurn !== 'lottery') ? sulas?.find(s => s.id === editingId)?.myTurn : ''} className="input-field font-mono" placeholder="1" required min="1" />
                      </div>
                    )}

                    <div className={turnType === 'lottery' ? "md:col-span-2" : ""}>
                      <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('startDate')}</label>
                      <input name="startDate" type="date" defaultValue={editingId ? sulas?.find(s => s.id === editingId)?.startDate : new Date().toISOString().split('T')[0]} className="input-field font-black" required />
                    </div>
                  </div>

                  {role === 'organizer' && (
                    <div className="p-5 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center gap-2">
                        <UserIcon size={18} className="text-amber-600" />
                        <div>
                          <label className="text-sm font-black text-slate-950 dark:text-white block uppercase tracking-tight">{t('participantsNames')}</label>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{language === 'ar' ? 'أضف أسماء المشتركين (كل اسم في سطر منفصل)' : 'Add participant names (one per line)'}</p>
                        </div>
                      </div>
                      <textarea 
                        name="participantsNames" 
                        defaultValue={editingId ? sulas?.find(s => s.id === editingId)?.participantNames?.join('\n') : ''}
                        className="input-field min-h-[120px] py-3 bg-white dark:bg-slate-800 font-bold" 
                        placeholder={language === 'ar' ? "مثال:\nمحمد العلي\nأحمد جاسم\nحسين كمال" : "Example:\nAhmed Ali\nJohn Doe"}
                        required={role === 'organizer'}
                      />
                    </div>
                  )}

                  {/* Form Action Buttons: Save & Cancel */}
                  <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button 
                      type="submit" 
                      className="btn-primary flex-1 py-3.5 text-base flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-700 shadow-emerald-600/20"
                    >
                      <Check size={20} />
                      <span>{editingId ? (language === 'ar' ? 'تحديث بيانات السلفة' : 'Update Sula') : t('saveSula')}</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={closeForm} 
                      className="px-6 py-3.5 border-2 border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ITEMS LIST */}
      <div className="space-y-4">
        {/* LOANS LISTING */}
        {activeSubTab === 'loan' ? (
          filteredItems.map(loan => {
            const loanPrincipal = loan.loanAmount || loan.totalAmount;
            const totalToRepay = loan.totalToRepay || loan.totalAmount;
            // المبلغ الواصل = يجب أن تجمع جميع المبالغ المدفوعة
            const paymentsTotal = (loan.loanPayments || []).reduce((sum, p) => sum + p.amount, 0);
            const currentPaid = (loan.loanPayments && loan.loanPayments.length > 0) ? paymentsTotal : (loan.paidAmount || 0);
            // المبلغ المتبقي = مبلغ القرض - المبلغ الواصل للمصرف
            const currentRemainingPrincipal = Math.max(0, loanPrincipal - currentPaid);
            const currentRemainingTotal = Math.max(0, totalToRepay - currentPaid);
            const progressPercent = Math.min(100, Math.round((currentPaid / (totalToRepay || loanPrincipal || 1)) * 100));
            const isCompleted = currentRemainingTotal <= 0 || currentRemainingPrincipal <= 0;

            return (
              <div 
                key={loan.id} 
                className="card p-5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden transition-all hover:shadow-md"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-black text-xl text-slate-900 dark:text-white">{loan.name}</h3>
                      {loan.bank && (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-bold border border-blue-200 dark:border-blue-700">
                          <Landmark size={12} />
                          <span>{loan.bank}</span>
                        </span>
                      )}
                      {isCompleted ? (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-black uppercase">
                          {language === 'ar' ? 'مكتمل السداد' : 'Fully Paid'}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-black uppercase">
                          {language === 'ar' ? 'قيد السداد' : 'Active'}
                        </span>
                      )}
                    </div>
                    {loan.startDate && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                        {t('startDate')}: {loan.startDate} {loan.endDate ? `| ${t('endDate')}: ${loan.endDate}` : ''}
                      </p>
                    )}
                  </div>

                  {/* Top quick actions: Edit & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => handleEdit(loan)}
                      className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-colors"
                      title={language === 'ar' ? 'تعديل بيانات القرض' : 'Edit Loan'}
                    >
                      <Pencil size={15} />
                    </button>
                    <button 
                      onClick={() => loan.id && requestDelete(loan.id, 'sula')}
                      className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition-colors"
                      title={language === 'ar' ? 'حذف القرض' : 'Delete Loan'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* 4 Key Metrics Grid (التفاصيل المطلوبة) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
                  {/* 1. مبلغ القرض */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-center">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">
                      {language === 'ar' ? 'مبلغ القرض (الأصل)' : 'Loan Principal'}
                    </p>
                    <p className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {formatAmount(loanPrincipal)}
                    </p>
                  </div>

                  {/* 2. المبلغ المطلوب سداده */}
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/40 text-center">
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">
                      {language === 'ar' ? 'المبلغ الذي يجب سداده' : 'Total to Repay'}
                    </p>
                    <p className="font-mono font-black text-sm text-blue-700 dark:text-blue-300">
                      {formatAmount(totalToRepay)}
                    </p>
                  </div>

                  {/* 3. المبلغ الواصل للمصرف */}
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
                      {language === 'ar' ? 'المبلغ الواصل (المجموع)' : 'Paid to Bank'}
                    </p>
                    <p className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {formatAmount(currentPaid)}
                    </p>
                  </div>

                  {/* 4. المبلغ المتبقي = مبلغ القرض - المبلغ الواصل للمصرف */}
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-800 text-center">
                    <p className="text-[10px] text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider mb-1">
                      {language === 'ar' ? 'المبلغ المتبقي' : 'Remaining'}
                    </p>
                    <p className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                      {formatAmount(currentRemainingPrincipal)}
                    </p>
                  </div>
                </div>

                {/* Optional Interest Difference Indicator */}
                {totalToRepay > loanPrincipal && (
                  <div className="flex justify-between items-center px-3 py-1.5 mb-3 text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span>{language === 'ar' ? 'المتبقي من أصل القرض (مبلغ القرض - الواصل):' : 'Remaining Principal:'} <span className="font-mono font-black text-rose-600 dark:text-rose-400">{formatAmount(currentRemainingPrincipal)}</span></span>
                    <span>{language === 'ar' ? 'المتبقي الكلي المطلوب سداده:' : 'Total to Repay:'} <span className="font-mono font-black text-slate-900 dark:text-white">{formatAmount(currentRemainingTotal)}</span></span>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span>{language === 'ar' ? 'نسبة الواصل للمصرف:' : 'Repaid to Bank:'}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{progressPercent}%</span>
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                      {formatAmount(currentPaid)} / {formatAmount(totalToRepay)} {getCurrencyLabel()}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>
                </div>

                {/* Footer Actions: Record Payment & Receipts & Details */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Record Payment Button */}
                    <button
                      onClick={() => {
                        setPayingLoan(loan);
                        setPaymentAmountInput(loan.monthlyInstallment ? loan.monthlyInstallment.toString() : '');
                        setPaymentDateInput(new Date().toISOString().split('T')[0]);
                        setPaymentNoteInput('');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                      <Plus size={16} />
                      <span>{language === 'ar' ? 'تسديد دفعة للمصرف' : 'Record Payment'}</span>
                    </button>

                    {/* View Receipts / Payment History Button */}
                    <button
                      onClick={() => setViewHistoryLoan(loan)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
                      title={language === 'ar' ? 'عرض سجل إيصالات ودفعات السداد' : 'View Payment Receipts'}
                    >
                      <FileText size={15} />
                      <span>{language === 'ar' ? 'سجل المبالغ الواصلة' : 'Receipts'} ({loan.loanPayments?.length || 0})</span>
                    </button>
                  </div>

                  {loan.monthlyInstallment > 0 && (
                    <div className="text-right text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>{t('monthlyInstallment')}: </span>
                      <span className="font-mono font-black text-slate-900 dark:text-white">{formatAmount(loan.monthlyInstallment)} {getCurrencyLabel()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          /* SULAS LISTING */
          filteredItems.map(sula => (
            <div key={sula.id} className="card p-5 bg-white dark:bg-slate-800 border-r-4 border-r-emerald-500 border-2 border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-black text-xl text-slate-900 dark:text-white">{sula.name}</h3>
                    {sula.role === 'organizer' && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-black uppercase">
                        {t('organizer')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                    {t('startDate')}: {sula.startDate} | {t('endDate')}: {sula.endDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs px-3 py-1 rounded-full font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    {t('turn')}: {sula.myTurn === 'lottery' ? t('lottery') : sula.myTurn}
                  </div>
                  <button 
                    onClick={() => handleEdit(sula)}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                    title={language === 'ar' ? 'تعديل السلفة' : 'Edit Sula'}
                  >
                    <Pencil size={15} />
                  </button>
                  <button 
                    onClick={() => sula.id && requestDelete(sula.id, 'sula')}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors"
                    title={language === 'ar' ? 'حذف السلفة' : 'Delete Sula'}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-black mb-1">
                  <span className="text-slate-900 dark:text-white">
                    {t('paidMonths')}: {sula.paidMonths} / {sula.participantsCount || (sula.totalAmount / sula.monthlyInstallment)}
                  </span>
                  <span className="text-emerald-500 font-mono">
                    {Math.round((sula.paidMonths / (sula.participantsCount || (sula.totalAmount / sula.monthlyInstallment))) * 100)}%
                  </span>
                </div>
                
                {/* Payment Period Grid */}
                <div className="flex flex-wrap gap-2 py-2">
                  {Array.from({ length: sula.participantsCount || (sula.totalAmount / sula.monthlyInstallment) }).map((_, idx) => {
                    const periodNum = idx + 1;
                    const isPaid = periodNum <= sula.paidMonths;
                    const startDate = new Date(sula.startDate);
                    const freqDays = sula.frequencyDays || (sula.frequency === 'monthly' ? 30 : sula.frequency === 'biweekly' ? 15 : 30);
                    const installmentDate = new Date(startDate);
                    installmentDate.setDate(startDate.getDate() + (idx * freqDays));
                    
                    let monthName = '';
                    if (language === 'ar') {
                      const arMonths = [
                        'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
                        'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
                      ];
                      monthName = arMonths[installmentDate.getMonth()];
                    } else {
                      monthName = installmentDate.toLocaleDateString('en-US', { month: 'short' });
                    }
                    const yearNum = installmentDate.getFullYear().toLocaleString('en-US', {useGrouping: false});

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          db.sulas.update(sula.id!, { 
                            paidMonths: isPaid ? periodNum - 1 : periodNum 
                          });
                        }}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all border-2",
                            isPaid 
                              ? "bg-emerald-600 border-emerald-700 text-white shadow-sm" 
                              : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 group-hover:border-emerald-500"
                          )}
                        >
                          {isPaid ? <Check size={14} /> : periodNum}
                        </div>
                        <div className="text-[8px] font-black text-slate-700 dark:text-slate-300 uppercase text-center leading-tight">
                          {monthName}<br/>{yearNum}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="progress-bar-bg h-2">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                    style={{ width: `${(sula.paidMonths / (sula.participantsCount || (sula.totalAmount / sula.monthlyInstallment))) * 100}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span>{language === 'ar' ? 'إجمالي المدفوع بالسلفة:' : 'Total Paid:'}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {formatAmount(sula.paidMonths * sula.monthlyInstallment)} {getCurrencyLabel()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider">{t('totalAmount')}</p>
                  <p className="font-bold font-mono text-sm text-slate-900 dark:text-white">{formatAmount(sula.totalAmount)}</p>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase tracking-wider">{t('monthlyInstallment')}</p>
                  <p className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                    {formatAmount(sula.monthlyInstallment)}
                  </p>
                </div>
              </div>

              {sula.role === 'organizer' && sula.participantNames && sula.participantNames.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-700" />
                    <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('participantsNames')}</p>
                    <div className="h-[1px] flex-1 bg-slate-200 dark:bg-slate-700" />
                  </div>
                  
                  <div className="space-y-2">
                    {sula.participantNames.map((name, i) => {
                      const monthsPaid = sula.participantPayments?.[name] || 0;
                      const totalTerms = sula.participantsCount || (sula.totalAmount / sula.monthlyInstallment);
                      const progress = (monthsPaid / totalTerms) * 100;
                      
                      return (
                        <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-all">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                                {i + 1}
                              </span>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{name}</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-emerald-600">
                              {monthsPaid} / {totalTerms} ({Math.round(progress)}%)
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {Array.from({ length: totalTerms }).map((_, idx) => {
                              const pNum = idx + 1;
                              const isP = pNum <= monthsPaid;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    const updatedPayments = { ...(sula.participantPayments || {}) };
                                    updatedPayments[name] = isP ? pNum - 1 : pNum;
                                    db.sulas.update(sula.id!, { participantPayments: updatedPayments });
                                  }}
                                  className={cn(
                                    "w-6 h-6 rounded text-[10px] font-black flex items-center justify-center border transition-all",
                                    isP 
                                      ? "bg-emerald-600 text-white border-emerald-700" 
                                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
                                  )}
                                >
                                  {isP ? '✓' : pNum}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Empty State */}
        {filteredItems.length === 0 && !showAdd && (
          <div className="text-center py-16 px-6 card bg-white dark:bg-slate-800 border-dashed border-2 border-slate-300 dark:border-slate-700">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-200 dark:border-blue-800">
              {activeSubTab === 'loan' ? <Landmark size={28} /> : <TrendingUp size={28} />}
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              {activeSubTab === 'loan' 
                ? (language === 'ar' ? 'لا توجد قروض مسجلة حالياً' : 'No loans recorded yet') 
                : (language === 'ar' ? 'لا توجد سلف مضافة حالياً' : 'No sulas added yet')}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              {activeSubTab === 'loan'
                ? (language === 'ar' ? 'سجّل قروضك المصرفية، وتابع المبالغ الواصلة والمتبقية وسدد الدفعات بسهولة.' : 'Record your bank loans, track paid and remaining amounts easily.')
                : (language === 'ar' ? 'نظم سلفك المالية مع أصدقائك أو زملائك وتابع أدوار السداد بكل دقة.' : 'Track group rotating savings with colleagues and friends.')}
            </p>
            <button 
              onClick={openAddForm} 
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={18} />
              <span>{activeSubTab === 'loan' ? (language === 'ar' ? 'إضافة قرض جديد' : 'Add New Loan') : t('addSula')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: تسديد دفعة جديدة للمصرف */}
      <AnimatePresence>
        {payingLoan && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {language === 'ar' ? 'تسديد دفعة للمصرف' : 'Record Payment to Bank'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bold">{payingLoan.name} • {payingLoan.bank || ''}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPayingLoan(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveLoanPayment} className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white block mb-1 uppercase tracking-wider">
                    {language === 'ar' ? 'مبلغ الدفعة المسددة' : 'Payment Amount'} *
                  </label>
                  <input 
                    type="number"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    className="input-field font-mono font-bold text-lg text-emerald-600"
                    placeholder="250,000"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white block mb-1 uppercase tracking-wider">
                    {language === 'ar' ? 'تاريخ السداد' : 'Payment Date'} *
                  </label>
                  <input 
                    type="date"
                    value={paymentDateInput}
                    onChange={(e) => setPaymentDateInput(e.target.value)}
                    className="input-field font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white block mb-1 uppercase tracking-wider">
                    {language === 'ar' ? 'رقم الوصل أو ملاحظة' : 'Receipt # / Note'} ({language === 'ar' ? 'اختياري' : 'Optional'})
                  </label>
                  <input 
                    type="text"
                    value={paymentNoteInput}
                    onChange={(e) => setPaymentNoteInput(e.target.value)}
                    className="input-field"
                    placeholder={language === 'ar' ? "مثلاً: وصل سداد رقم 938201 أو قسط شهر نيسان" : "e.g. Receipt #1234"}
                  />
                </div>

                {/* Impact Preview */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs font-bold space-y-1.5">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{language === 'ar' ? 'الواصل الحالي:' : 'Current Paid:'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{formatAmount(payingLoan.paidAmount || 0)} {getCurrencyLabel()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-black">
                    <span>{language === 'ar' ? 'الواصل بعد التسديد:' : 'New Total Paid:'}</span>
                    <span className="font-mono">
                      {formatAmount((payingLoan.paidAmount || 0) + (Number(paymentAmountInput) || 0))} {getCurrencyLabel()}
                    </span>
                  </div>
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-black pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>{language === 'ar' ? 'المتبقي بعد التسديد:' : 'Remaining Balance:'}</span>
                    <span className="font-mono">
                      {formatAmount(Math.max(0, (payingLoan.totalToRepay || payingLoan.loanAmount || 0) - ((payingLoan.paidAmount || 0) + (Number(paymentAmountInput) || 0))))} {getCurrencyLabel()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit" 
                    className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  >
                    <Check size={18} />
                    <span>{language === 'ar' ? 'تأكيد السداد وحفظ الدفعة' : 'Confirm Payment'}</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setPayingLoan(null)}
                    className="px-4 py-3 border-2 border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: عرض سجل المبالغ الواصلة والإيصالات */}
      <AnimatePresence>
        {viewHistoryLoan && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {language === 'ar' ? 'سجل المبالغ الواصلة للمصرف' : 'Bank Payment Receipts'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-bold">{viewHistoryLoan.name} • {viewHistoryLoan.bank || ''}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewHistoryLoan(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              {/* Total Stats summary */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-500 font-bold">{language === 'ar' ? 'إجمالي الواصل:' : 'Total Paid:'}</span>
                  <p className="font-mono font-black text-emerald-600 text-sm">
                    {formatAmount((viewHistoryLoan.loanPayments || []).reduce((s, p) => s + p.amount, 0))} {getCurrencyLabel()}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">{language === 'ar' ? 'المبلغ المتبقي:' : 'Remaining:'}</span>
                  <p className="font-mono font-black text-rose-600 text-sm">
                    {formatAmount(Math.max(0, (viewHistoryLoan.totalToRepay || viewHistoryLoan.loanAmount || 0) - (viewHistoryLoan.loanPayments || []).reduce((s, p) => s + p.amount, 0)))} {getCurrencyLabel()}
                  </p>
                </div>
              </div>

              {/* Receipts List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {(!viewHistoryLoan.loanPayments || viewHistoryLoan.loanPayments.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 font-bold text-xs italic">
                    {language === 'ar' 
                      ? 'لا توجد دفعات مسجلة بعد. استخدم زر "تسديد دفعة للمصرف" لإضافة وصل تسديد.' 
                      : 'No payments recorded yet. Use the Record Payment button to add one.'}
                  </div>
                ) : (
                  viewHistoryLoan.loanPayments.map((p, idx) => (
                    <div 
                      key={p.id || idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-mono font-black text-sm text-slate-900 dark:text-white">
                            {formatAmount(p.amount)} {getCurrencyLabel()}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                            {p.date} {p.note ? `• ${p.note}` : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteLoanPayment(viewHistoryLoan, p.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title={language === 'ar' ? 'حذف هذه الدفعة' : 'Delete Payment'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewHistoryLoan(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Smart Planner ---
const SmartPlanner = ({ t, language, formatAmount, getCurrencyLabel }: { t: any, language: string, formatAmount: (n: number) => string, getCurrencyLabel: () => string }) => {
  const incomes = useLiveQuery(() => db.incomes.toArray());
  const expenses = useLiveQuery(() => db.expenses.where('type').equals('fixed').toArray());
  const debts = useLiveQuery(() => db.debts.where('type').equals('owe').toArray());
  
  const totalIncome = incomes?.reduce((n, i) => n + i.amount, 0) || 0;
  const totalFixed = expenses?.reduce((n, e) => n + e.amount, 0) || 0;
  const totalDueDebts = debts?.reduce((n, d) => n + d.remainingAmount, 0) || 0;
  
  const totalNeeds = totalFixed + totalDueDebts;
  const balance = totalIncome - totalNeeds;
  
  const remainingAfterFixed = Math.max(0, totalIncome - totalFixed);
  const debtCoverage = totalDueDebts > 0 ? Math.min(100, (remainingAfterFixed / (totalDueDebts || 1)) * 100) : 100;
  
  return (
    <div className="space-y-6">
       <div className="bg-gradient-to-br from-[#0a192f] via-[#112240] to-blue-900 p-8 rounded-b-[48px] -mx-4 -mt-4 text-white shadow-xl border-b-4 border-slate-950 dark:border-white">
         <h2 className="text-3xl font-black italic mb-2 tracking-tighter flex items-center gap-3">
           <Calculator className="text-emerald-400" size={32} />
           {t('smartPlanner')}
         </h2>
         <p className="text-blue-200/60 text-xs font-medium leading-relaxed max-w-xs">{t('plannerDesc')}</p>
       </div>

       <div className="grid grid-cols-1 gap-4 mt-6">
         <div className="card border-l-4 border-l-emerald-500 bg-white dark:bg-slate-800 p-6 shadow-sm overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
           <div className="flex justify-between items-center mb-4 relative z-10">
              <h4 className="font-black text-slate-950 dark:text-white uppercase text-[10px] tracking-widest">{t('priorityFixed')}</h4>
              <div className={cn(
                "text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1",
                totalIncome >= totalFixed ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {totalIncome >= totalFixed ? <Check size={10}/> : <Info size={10}/>}
                {totalIncome >= totalFixed ? 'SAFE' : 'ACTION NEEDED'}
              </div>
           </div>
           <div className="flex items-end gap-2 relative z-10">
             <p className="text-3xl font-black font-mono tracking-tighter">{formatAmount(totalFixed)}</p>
             <span className="text-xs text-slate-950 dark:text-white mb-1 font-black">{getCurrencyLabel()}</span>
           </div>
           <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-2 rounded-full mt-6 overflow-hidden relative z-10">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${Math.min(100, (totalIncome / (totalFixed || 1)) * 100)}%` }}
               transition={{ duration: 1, ease: 'easeOut' }}
               className="bg-emerald-500 h-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
             />
           </div>
           <p className="text-[10px] text-slate-950 dark:text-white mt-2 font-black relative z-10">{totalIncome >= totalFixed ? t('surplus') : t('deficit')}: {formatAmount(Math.abs(totalIncome - totalFixed))} {getCurrencyLabel()}</p>
         </div>

         <div className="card border-l-4 border-l-amber-500 bg-white dark:bg-slate-800 p-6 shadow-sm overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
           <div className="flex justify-between items-center mb-4 relative z-10">
              <h4 className="font-black text-slate-950 dark:text-white uppercase text-[10px] tracking-widest">{t('priorityDebts')}</h4>
              <div className={cn(
                "text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1",
                debtCoverage === 100 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {debtCoverage === 100 ? <Check size={10}/> : <Info size={10}/>}
                {debtCoverage === 100 ? 'STABLE' : 'RISK'}
              </div>
           </div>
           <div className="flex items-end gap-2 relative z-10">
             <p className="text-3xl font-black font-mono tracking-tighter">{formatAmount(totalDueDebts)}</p>
             <span className="text-xs text-slate-950 dark:text-white mb-1 font-black">{getCurrencyLabel()}</span>
           </div>
           <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-2 rounded-full mt-6 overflow-hidden relative z-10">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${debtCoverage}%` }}
               transition={{ duration: 1, ease: 'easeOut' }}
               className="bg-amber-500 h-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
             />
           </div>
           <p className="text-[10px] text-slate-950 dark:text-white mt-2 font-black relative z-10">{t('remainingAfterFixed')}: {formatAmount(remainingAfterFixed)} {getCurrencyLabel()}</p>
         </div>

         <motion.div 
           initial={{ scale: 0.95, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className={cn(
             "card p-10 text-center border-t-4 shadow-xl",
             balance >= 0 ? "border-t-emerald-500 bg-white dark:bg-slate-800" : "border-t-rose-500 bg-white dark:bg-slate-800"
           )}
         >
           <h3 className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-950 dark:text-white">{balance >= 0 ? t('surplus') : t('deficit')}</h3>
           <p className={cn(
             "text-5xl font-black font-mono tracking-tighter mb-4",
             balance >= 0 ? "text-emerald-500" : "text-rose-500"
           )}>
             {formatAmount(Math.abs(balance))}
           </p>
           <p className="text-xs text-slate-950 dark:text-white font-black uppercase tracking-widest">{t('totalNeeds')}: {formatAmount(totalNeeds)} {getCurrencyLabel()}</p>
         </motion.div>

         <div className="space-y-4">
           <h3 className="font-black text-xs uppercase tracking-widest px-2 text-slate-950 dark:text-white flex items-center gap-2">
             <TrendingUp size={14} />
             {language === 'ar' ? 'التسلسل الهرمي للمدفوعات' : 'Payment Hierarchy'}
           </h3>
           
           <div className="card p-0 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
             <div className="p-4 flex items-center gap-4 bg-emerald-500/15">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">1</div>
                <div>
                  <p className="font-bold text-sm text-slate-950 dark:text-white">{t('priorityFixed')}</p>
                      <p className="text-[10px] text-slate-950 dark:text-white font-black uppercase tracking-tighter mb-1">{language === 'ar' ? 'يجب دفعها فور استلام الراتب لتجنب المشاكل' : 'Must pay immediately upon receiving salary'}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-black text-sm text-slate-950 dark:text-white">{formatAmount(totalFixed)}</p>
                </div>
             </div>

             <div className="p-4 flex items-center gap-4 bg-amber-500/15">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-black">2</div>
                <div>
                  <p className="font-bold text-sm text-slate-950 dark:text-white">{t('priorityDebts')}</p>
                      <p className="text-[10px] text-slate-950 dark:text-white font-black uppercase tracking-tighter mb-1">{language === 'ar' ? 'الالتزام تجاه الآخرين يعزز الثقة المالية' : 'Honoring commitments builds trust'}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-black text-sm text-slate-950 dark:text-white">{formatAmount(totalDueDebts)}</p>
                </div>
             </div>

             <div className="p-4 flex items-center gap-4 bg-blue-500/15">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-black">3</div>
                <div>
                  <p className="font-bold text-sm text-slate-950 dark:text-white">{t('priorityVariable')}</p>
                  <p className="text-[10px] text-slate-950 dark:text-white font-black">{language === 'ar' ? 'المصاريف اليومية، تحكم بها لزيادة الادخار' : 'Daily expenses, control to save more'}</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-black text-sm text-slate-950 dark:text-white">---</p>
                </div>
             </div>
           </div>

           <div className="mx-2 p-6 bg-slate-100 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-950 dark:border-white">
             <p className="text-xs font-black text-slate-950 dark:text-white leading-relaxed italic">
               "{language === 'ar' 
                 ? 'البدء بالمصاريف الثابتة يقلل من القلق المالي ويسمح لك برؤية المبلغ الحقيقي المتاح للتصرف.' 
                 : 'Starting with fixed expenses reduces financial anxiety and shows you the true amount available for use.'}"
             </p>
           </div>
         </div>
       </div>
    </div>
  );
};

const ExpenseManager = ({ t, language, widgets, updateWidget, formatAmount, getCurrencyLabel, requestDelete }: { t: any, language: string, widgets?: any, updateWidget?: any, formatAmount: (n: number) => string, getCurrencyLabel: () => string, requestDelete: (id: number, type: 'income' | 'expense' | 'sula' | 'debt', cb?: () => void) => void }) => {
  const expenses = useLiveQuery(() => db.expenses.reverse().toArray());
  const [showAdd, setShowAdd] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [currentStatus, setCurrentStatus] = useState<'paid' | 'partially_paid' | 'unpaid'>('unpaid');
  const [inputAmount, setInputAmount] = useState<string>("");
  const [inputPaidAmount, setInputPaidAmount] = useState<string>("");
  const [showExpenseExcel, setShowExpenseExcel] = useState(false);

  const totalExpense = expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const fixedExpenseTotal = expenses?.filter(e => e.type === 'fixed').reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const variableExpenseTotal = expenses?.filter(e => e.type === 'variable').reduce((acc, curr) => acc + curr.amount, 0) || 0;

  const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Math.round(Number(formData.get('amount')));
    const status = formData.get('status') as 'paid' | 'partially_paid' | 'unpaid';
    const paidAmount = status === 'partially_paid' ? Math.round(Number(formData.get('paidAmount'))) : (status === 'paid' ? amount : 0);

    const expenseData = {
      amount,
      category: formData.get('category') as string,
      date: new Date(formData.get('date') as string),
      currency: 'IQD' as const,
      type: formData.get('type') as 'fixed' | 'variable',
      note: formData.get('note') as string,
      status,
      paidAmount
    };

    if (editingExpense) {
      await db.expenses.update(editingExpense.id!, expenseData);
      setEditingExpense(null);
    } else {
      await db.expenses.add(expenseData as Expense);
    }
    setShowAdd(false);
    setCurrentStatus('unpaid');
    setInputAmount("");
    setInputPaidAmount("");
  };

  const startEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setCurrentStatus(expense.status || 'unpaid');
    setInputAmount(expense.amount.toString());
    setInputPaidAmount(expense.paidAmount?.toString() || "");
    setShowAdd(true);
  };

  const remainingInForm = (Number(inputAmount) || 0) - (Number(inputPaidAmount) || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold neon-pink">{t('expenses')}</h2>
          <div className="bg-danger/10 text-danger border border-danger/20 px-3 py-1 rounded-xl text-sm font-bold font-mono">
            {formatAmount(totalExpense)} {getCurrencyLabel()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowExpenseExcel(!showExpenseExcel)}
            className={cn(
              "p-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm",
              showExpenseExcel 
                ? "bg-rose-600 text-white border-rose-600 shadow-rose-600/30" 
                : "border-rose-500/30 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:border-rose-600/40 dark:text-rose-300"
            )}
            title={language === 'ar' ? 'تبويب تصدير سجل المصروفات إلى إكسل' : 'Export Expenses to Excel'}
          >
            <FileSpreadsheet size={16} />
            <span className="hidden sm:inline">{language === 'ar' ? 'تصدير إكسل' : 'Excel Export'}</span>
          </button>
          {!showExpenseExcel && (
            <button 
              onClick={() => {
                setEditingExpense(null);
                setCurrentStatus('unpaid');
                setInputAmount("");
                setInputPaidAmount("");
                setShowAdd(true);
              }} 
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} /> {t('addExpense')}
            </button>
          )}
        </div>
      </div>

      {/* Inline Excel Export Tab (ضمن صفحة المصروفات) */}
      <AnimatePresence>
        {showExpenseExcel && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <ExcelExportModal
              isOpen={showExpenseExcel}
              inline={true}
              onClose={() => setShowExpenseExcel(false)}
              language={language as any}
              formatAmount={formatAmount}
              getCurrencyLabel={getCurrencyLabel}
              initialTab="expenses"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-100 dark:bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-950 dark:border-white shadow-sm border-r-4 border-r-blue-600">
          <p className="text-[10px] text-slate-950 dark:text-white uppercase tracking-wider mb-1 font-black">{t('fixedExpenses')}</p>
          <p className="text-lg font-bold font-mono text-blue-600 leading-none">{formatAmount(fixedExpenseTotal)}</p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800/50 backdrop-blur-md p-4 rounded-2xl border border-slate-950 dark:border-white shadow-sm border-r-4 border-r-amber-500">
          <p className="text-[10px] text-slate-950 dark:text-white uppercase tracking-wider mb-1 font-black">{t('variableExpenses')}</p>
          <p className="text-lg font-bold font-mono text-orange-600 leading-none">{formatAmount(variableExpenseTotal)}</p>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, height: 0 }}
            animate={{ opacity: 1, scale: 1, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.95, height: 0 }}
            className="card bg-white dark:bg-slate-800 border-primary/20 overflow-hidden"
          >
            <h3 className="font-bold mb-4 flex items-center gap-2">
              {editingExpense ? <Edit size={18} className="text-primary"/> : <Plus size={18} className="text-primary"/>}
              {editingExpense ? t('updateExpense') : t('addExpense')}
            </h3>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('amount')}</label>
                  <input 
                    name="amount" 
                    type="number" 
                    step="1" 
                    className="input-field text-xl font-black font-mono text-slate-950 dark:text-white bg-slate-200" 
                    placeholder="0" 
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('category')}</label>
                    <select name="category" className="input-field text-slate-950 dark:text-white bg-slate-200" defaultValue={editingExpense?.category || "طعام"} required>
                      <option value="طعام" className="text-slate-950">{language === 'ar' ? 'طعام' : 'Food'}</option>
                      <option value="إيجار" className="text-slate-950">{language === 'ar' ? 'إيجار' : 'Rent'}</option>
                      <option value="إنترنت" className="text-slate-950">{language === 'ar' ? 'إنترنت' : 'Internet'}</option>
                      <option value="مولدة" className="text-slate-950">{language === 'ar' ? 'مولدة' : 'Generator'}</option>
                      <option value="تسوق" className="text-slate-950">{language === 'ar' ? 'تسوق' : 'Shopping'}</option>
                      <option value="طبية" className="text-slate-950">{language === 'ar' ? 'طبية' : 'Medical'}</option>
                      <option value="Other" className="text-slate-950">{language === 'ar' ? 'أخرى (اكتب في التفاصيل)' : 'Other (Type in details)'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('expenseType')}</label>
                    <select name="type" className="input-field text-slate-950 dark:text-white bg-slate-200" defaultValue={editingExpense?.type || "variable"} required>
                      <option value="variable" className="text-slate-950">{t('variable')}</option>
                      <option value="fixed" className="text-slate-950">{t('fixed')}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('status')}</label>
                    <select 
                      name="status" 
                      className="input-field text-slate-950 dark:text-white bg-slate-200" 
                      value={currentStatus}
                      onChange={(e) => setCurrentStatus(e.target.value as any)}
                      required
                    >
                      <option value="paid" className="text-slate-950">{t('paid')}</option>
                      <option value="partially_paid" className="text-slate-950">{t('partiallyPaid')}</option>
                      <option value="unpaid" className="text-slate-950">{t('unpaid')}</option>
                    </select>
                  </div>
                  {currentStatus === 'partially_paid' && (
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('paidAmountLabel')}</label>
                        <input 
                          name="paidAmount" 
                          type="number" 
                          className="input-field text-slate-950 dark:text-white bg-slate-200" 
                          placeholder="0" 
                          value={inputPaidAmount}
                          onChange={(e) => setInputPaidAmount(e.target.value)}
                          required 
                        />
                      </div>
                      <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        <p className="text-[10px] text-amber-600 font-black uppercase">{t('remainingAmountLabel')}</p>
                        <p className="text-sm font-mono font-black text-amber-600">{formatAmount(remainingInForm)}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('date')}</label>
                  <input name="date" type="date" className="input-field font-black text-slate-950 dark:text-white" defaultValue={editingExpense ? new Date(editingExpense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} required />
                </div>
                <div>
                  <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('notePlaceholder')}</label>
                  <input name="note" type="text" className="input-field font-black text-slate-950 dark:text-white" placeholder={language === 'ar' ? 'اكتب هنا (مثلاً: صرف علاج، تصليح اجهزة...)' : 'Type here (e.g. Medicine, Repair...)'} defaultValue={editingExpense?.note} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">{editingExpense ? t('save') : t('save')}</button>
                <button type="button" onClick={() => { setShowAdd(false); setEditingExpense(null); }} className="px-4 py-2 border border-slate-950 dark:border-white rounded-xl">{t('cancel')}</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {expenses?.map(e => (
          <div key={e.id} className="card py-4 px-4 relative overflow-hidden group">
            <div className={cn(
              "absolute right-0 top-0 bottom-0 w-1.5",
              e.status === 'paid' ? "bg-success" : e.status === 'partially_paid' ? "bg-warning" : "bg-danger"
            )} />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center",
                  e.type === 'fixed' ? "bg-primary/5 text-primary" : "bg-warning/5 text-orange-500"
                )}>
                  {e.type === 'fixed' ? <Wallet size={20} /> : <Receipt size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm">
                      {e.category === 'Other' ? (e.note || (language === 'ar' ? 'أخرى' : 'Other')) : (language === 'ar' && translations.ar[e.category] ? t(e.category) : e.category)}
                    </p>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-md font-medium",
                      e.type === 'fixed' ? "bg-primary/10 text-primary" : "bg-slate-100 dark:bg-slate-700 text-slate-700"
                    )}>
                      {e.type === 'fixed' ? t('fixed') : t('variable')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] text-slate-950 dark:text-white font-black">{new Date(e.date).toLocaleDateString('en-US')}</p>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                      e.status === 'paid' ? "bg-success/10 text-success" : 
                      e.status === 'partially_paid' ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"
                    )}>
                      {t(e.status || 'unpaid')}
                    </span>
                  </div>
                </div>
              </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className="font-bold font-mono text-lg text-danger">-{formatAmount(e.amount)}</p>
                    {e.status === 'partially_paid' && e.paidAmount !== undefined && (
                      <p className="text-[10px] text-warning font-bold">
                        {t('remaining')}: {formatAmount(e.amount - e.paidAmount)}
                      </p>
                    )}
                  </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => startEdit(e)}
                    className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-slate-600 hover:text-primary transition-colors"
                    title={language === 'ar' ? 'تعديل' : 'Edit'}
                  >
                    <Edit size={14} />
                  </button>
                  <button 
                    onClick={async (ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (e.id) {
                        requestDelete(e.id, 'expense');
                      }
                    }}
                    className="p-2 bg-danger/5 hover:bg-danger/10 rounded-lg text-danger transition-colors border border-danger/10"
                    title={t('delete')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            {e.note && e.category !== 'Other' && (
              <div className="mt-3 text-[10px] text-slate-900 dark:text-slate-100 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg italic font-black">
                {e.note}
              </div>
            )}
            {e.status === 'partially_paid' && (
              <div className="mt-2 w-full bg-slate-100 dark:bg-slate-700/50 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-warning h-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, ((e.paidAmount || 0) / e.amount) * 100)}%` }} 
                />
              </div>
            )}
          </div>
        ))}
        {expenses?.length === 0 && (
          <div className="text-center py-20 text-slate-950 dark:text-white font-black">
            <Receipt size={48} className="mx-auto opacity-40 mb-4" />
            <p className="text-sm">{t('noOperations')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const DebtManager = ({ t, language, isHidden, widgets, updateWidget, formatAmount, getCurrencyLabel, requestDelete }: { t: any, language: string, isHidden?: boolean, widgets?: any, updateWidget?: any, formatAmount: (n: number) => string, getCurrencyLabel: () => string, requestDelete: (id: number, type: 'income' | 'expense' | 'sula' | 'debt', cb?: () => void) => void }) => {
  const debts = useLiveQuery(() => db.debts.toArray());
  const [showAdd, setShowAdd] = useState(false);
  const [viewDebt, setViewDebt] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [repaymentMethod, setRepaymentMethod] = useState<'one-time' | 'installments' | 'two-payments'>('one-time');
  const [installmentCount, setInstallmentCount] = useState(1);
  const [debtSubTab, setDebtSubTab] = useState<'owe' | 'owed'>('owe');
  const [showDebtExcel, setShowDebtExcel] = useState(false);

  // Partial Payment Modal States
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [partialAmountInput, setPartialAmountInput] = useState('');
  const [partialDateInput, setPartialDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [partialNoteInput, setPartialNoteInput] = useState('');

  const debtsIOwe = debts?.filter(d => d.type === 'owe') || [];
  const debtsOwedToMe = debts?.filter(d => d.type === 'owed') || [];
  const totalIOwe = debtsIOwe.reduce((sum, d) => sum + (d.remainingAmount ?? d.amount), 0);
  const totalHeOwesMe = debtsOwedToMe.reduce((sum, d) => sum + (d.remainingAmount ?? d.amount), 0);
  const currentDebts = debtSubTab === 'owe' ? debtsIOwe : debtsOwedToMe;

  useEffect(() => {
    if (!showAdd) {
      setEditingId(null);
      setRepaymentMethod('one-time');
      setInstallmentCount(1);
    }
  }, [showAdd]);

  // Date display helper
  const formatDateDisplay = (dateVal: string | Date | undefined) => {
    if (!dateVal) return language === 'ar' ? 'غير محدد' : 'Not specified';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString(language === 'ar' ? 'ar-IQ' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper to check if a debt is overdue
  const isDebtOverdue = (dueDateStr?: string, remaining?: number) => {
    if (!dueDateStr || (remaining !== undefined && remaining <= 0)) return false;
    const due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  // Add / Edit Debt
  const addDebt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Math.round(Number(formData.get('amount')));
    const method = formData.get('repaymentMethod') as 'one-time' | 'installments' | 'two-payments';
    const countInput = formData.get('installmentCount');
    const count = method === 'installments' ? (countInput ? Number(countInput) : 12) : (method === 'two-payments' ? 2 : 1);
    
    const oldDebt = editingId ? debts?.find(d => d.id === editingId) : null;
    const existingPayments = oldDebt?.payments || [];
    const totalPaidSoFar = existingPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const remainingAmount = Math.max(0, amount - totalPaidSoFar);

    const startDateInput = formData.get('startDate') as string;
    const dueDateInput = formData.get('dueDate') as string;
    const phoneInput = formData.get('phone') as string;
    const noteInput = formData.get('note') as string;

    const data: any = {
      personName: (formData.get('personName') as string).trim(),
      amount: amount,
      remainingAmount: remainingAmount,
      type: formData.get('type') as 'owe' | 'owed',
      startDate: startDateInput || (oldDebt?.startDate ? oldDebt.startDate : new Date().toISOString().split('T')[0]),
      dueDate: dueDateInput || undefined,
      phone: phoneInput ? phoneInput.trim() : undefined,
      note: noteInput ? noteInput.trim() : undefined,
      createdAt: editingId ? (oldDebt?.createdAt || new Date()) : new Date(),
      payments: existingPayments,
      repaymentMethod: method,
      installmentCount: count,
      monthlyAmount: Math.round(amount / count),
      paidInstallments: editingId ? (oldDebt?.paidInstallments || 0) : 0
    };

    if (editingId) {
      await db.debts.update(editingId, data);
    } else {
      await db.debts.add(data);
    }
    setShowAdd(false);
  };

  // Open Partial Payment Modal
  const openPayPartModal = (debt: Debt) => {
    setPayingDebt(debt);
    setPartialAmountInput('');
    setPartialDateInput(new Date().toISOString().split('T')[0]);
    setPartialNoteInput('');
  };

  // Save Partial Payment
  const handleSavePartialPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt || !payingDebt.id) return;
    const payAmount = Math.round(Number(partialAmountInput));
    if (!payAmount || payAmount <= 0) return;

    const currentPayments = payingDebt.payments || [];
    const paymentItem = {
      id: Date.now().toString(),
      amount: payAmount,
      date: partialDateInput || new Date().toISOString().split('T')[0],
      note: partialNoteInput.trim() || undefined
    };

    const updatedPayments = [...currentPayments, paymentItem];
    const totalPaid = updatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const newRemaining = Math.max(0, payingDebt.amount - totalPaid);

    let newPaidInstallments = payingDebt.paidInstallments || 0;
    if (payingDebt.repaymentMethod === 'installments' && payingDebt.installmentCount) {
      const monthly = payingDebt.monthlyAmount || Math.round(payingDebt.amount / payingDebt.installmentCount);
      newPaidInstallments = Math.min(payingDebt.installmentCount, Math.floor(totalPaid / (monthly || 1)));
    }

    await db.debts.update(payingDebt.id, {
      payments: updatedPayments,
      remainingAmount: newRemaining,
      paidInstallments: newPaidInstallments
    });

    setPayingDebt(null);
    setPartialAmountInput('');
    setPartialNoteInput('');
  };

  // Delete a payment and recalculate
  const handleDeletePayment = async (debt: Debt, paymentIdOrIndex: string | number) => {
    const isAr = language === 'ar';
    if (!window.confirm(t('deletePaymentWarning') || (isAr ? 'هل تريد بالتأكيد حذف هذه الدفعة وإعادة احتساب المبلغ المتبقي؟' : 'Are you sure you want to delete this payment?'))) return;
    
    const currentPayments = debt.payments || [];
    const updatedPayments = currentPayments.filter((p, idx) => {
      if (typeof paymentIdOrIndex === 'string' && p.id) {
        return p.id !== paymentIdOrIndex;
      }
      return idx !== paymentIdOrIndex;
    });

    const totalPaid = updatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const newRemaining = Math.max(0, debt.amount - totalPaid);

    let newPaidInstallments = debt.paidInstallments || 0;
    if (debt.repaymentMethod === 'installments' && debt.installmentCount) {
      const monthly = debt.monthlyAmount || Math.round(debt.amount / debt.installmentCount);
      newPaidInstallments = Math.min(debt.installmentCount, Math.floor(totalPaid / (monthly || 1)));
    }

    await db.debts.update(debt.id!, {
      payments: updatedPayments,
      remainingAmount: newRemaining,
      paidInstallments: newPaidInstallments
    });
  };

  // Quick Settle in Full
  const handleSettleFullRemaining = async (debt: Debt) => {
    const isAr = language === 'ar';
    if (debt.remainingAmount <= 0) return;
    if (!window.confirm(isAr ? `هل تريد تسديد كامل المبلغ المتبقي (${formatAmount(debt.remainingAmount)} ${getCurrencyLabel()})؟` : `Settle remaining ${formatAmount(debt.remainingAmount)} in full?`)) return;

    const paymentItem = {
      id: Date.now().toString(),
      amount: debt.remainingAmount,
      date: new Date().toISOString().split('T')[0],
      note: isAr ? 'تسديد كامل المبلغ المتبقي' : 'Full settlement'
    };

    const currentPayments = debt.payments || [];
    const updatedPayments = [...currentPayments, paymentItem];

    await db.debts.update(debt.id!, {
      payments: updatedPayments,
      remainingAmount: 0,
      paidInstallments: debt.installmentCount || 1
    });
  };

  // Toggle Installments
  const toggleInstallment = async (debt: Debt, idx: number) => {
    const isPaid = idx < (debt.paidInstallments || 0);
    const newPaidCount = isPaid ? idx : idx + 1;
    const monthlyAmt = debt.monthlyAmount || Math.round(debt.amount / (debt.installmentCount || 1));
    
    const paidSoFar = newPaidCount * monthlyAmt;
    const newRemaining = Math.max(0, debt.amount - paidSoFar);

    await db.debts.update(debt.id!, {
      paidInstallments: newPaidCount,
      remainingAmount: newRemaining
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold neon-red">{t('debts')}</h2>
          {widgets && updateWidget && (
            <button 
              onClick={() => updateWidget('debts', !widgets.debts)}
              className={cn(
                "p-1.5 rounded-lg border transition-colors",
                widgets.debts ? "bg-primary/10 border-blue-600 text-primary" : "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
              )}
              title={t('showOnDashboard')}
            >
              <LayoutDashboard size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowDebtExcel(!showDebtExcel)}
            className={cn(
              "p-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm",
              showDebtExcel 
                ? "bg-amber-600 text-white border-amber-600 shadow-amber-600/30" 
                : "border-amber-500/30 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:border-amber-600/40 dark:text-amber-300"
            )}
            title={language === 'ar' ? 'تبويب تصدير سجل الديون إلى إكسل' : 'Export Debts to Excel'}
          >
            <FileSpreadsheet size={16} />
            <span className="hidden sm:inline">{language === 'ar' ? 'تصدير إكسل' : 'Export Excel'}</span>
          </button>
          {!showDebtExcel && (
            <button onClick={() => { setEditingId(null); setShowAdd(true); }} className="btn-primary flex items-center gap-2">
              <Plus size={20} /> {t('addDebt')}
            </button>
          )}
        </div>
      </div>

      {/* 3 Subtabs: ديون بذمتي vs ديون اطلبها vs تصدير إكسل */}
      <div className="grid grid-cols-3 gap-2 bg-slate-200/90 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-300 dark:border-slate-700">
        <button
          type="button"
          onClick={() => { setDebtSubTab('owe'); setShowDebtExcel(false); }}
          className={cn(
            "py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-2 transition-all",
            debtSubTab === 'owe' && !showDebtExcel
              ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-[1.01]"
              : "text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700"
          )}
        >
          <div className="flex items-center gap-1.5">
            <HandCoins size={18} />
            <span>{language === 'ar' ? 'ديون بذمتي' : 'Debts I Owe'}</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/20 font-mono">
            {formatAmount(totalIOwe)} {getCurrencyLabel()}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setDebtSubTab('owed'); setShowDebtExcel(false); }}
          className={cn(
            "py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-2 transition-all",
            debtSubTab === 'owed' && !showDebtExcel
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.01]"
              : "text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700"
          )}
        >
          <div className="flex items-center gap-1.5">
            <ArrowUpCircle size={18} />
            <span>{language === 'ar' ? 'ديون اطلبها' : 'Debts Owed to Me'}</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/20 font-mono">
            {formatAmount(totalHeOwesMe)} {getCurrencyLabel()}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowDebtExcel(!showDebtExcel)}
          className={cn(
            "py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-center gap-2 transition-all",
            showDebtExcel
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30 scale-[1.01]"
              : "text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700"
          )}
        >
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet size={18} />
            <span>{language === 'ar' ? 'تصدير إكسل' : 'Excel Export'}</span>
          </div>
        </button>
      </div>

      {/* Inline Excel Export Tab (ضمن صفحة الديون المفتوحة حالياً) */}
      <AnimatePresence>
        {showDebtExcel && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <ExcelExportModal
              isOpen={showDebtExcel}
              inline={true}
              onClose={() => setShowDebtExcel(false)}
              language={language as any}
              formatAmount={formatAmount}
              getCurrencyLabel={getCurrencyLabel}
              initialTab="debts"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit Debt Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="card bg-white dark:bg-slate-800 border-primary/20 overflow-hidden shadow-xl rounded-3xl p-6">
            <form onSubmit={addDebt} className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
                <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <HandCoins size={20} className="text-blue-500" />
                  <span>{editingId ? (language === 'ar' ? 'تعديل بيانات الدين' : 'Edit Debt Details') : (language === 'ar' ? 'تسجيل دين جديد' : t('addDebt'))}</span>
                </h3>
                <button type="button" onClick={() => setShowAdd(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Person Name */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-xs text-slate-900 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('personName')}</label>
                  <input 
                    name="personName" 
                    defaultValue={editingId ? debts?.find(d => d.id === editingId)?.personName : ''} 
                    placeholder={language === 'ar' ? 'مثال: أحمد علي، أبو محمد...' : 'e.g. John Doe'}
                    className="input-field" 
                    required 
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs text-slate-900 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('amount')} ({getCurrencyLabel()})</label>
                  <input 
                    name="amount" 
                    type="number" 
                    min="1"
                    defaultValue={editingId ? debts?.find(d => d.id === editingId)?.amount : ''} 
                    placeholder="0"
                    className="input-field font-mono font-bold" 
                    required 
                  />
                </div>

                {/* Debt Type */}
                <div>
                  <label className="text-xs text-slate-900 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('debtType')}</label>
                  <select name="type" defaultValue={editingId ? debts?.find(d => d.id === editingId)?.type : debtSubTab} className="input-field font-bold" required>
                    <option value="owe">{language === 'ar' ? 'دين بذمتي (له عليّ / أنا مدين له)' : t('iOwe')}</option>
                    <option value="owed">{language === 'ar' ? 'دين لي عنده (أنا أطلبه)' : t('owedToMe')}</option>
                  </select>
                </div>

                {/* تاريخ أخذ الدين (متى قمت بأخذ هذا الدين) */}
                <div>
                  <label className="text-xs text-slate-900 dark:text-white font-black block mb-1 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-500" />
                    <span>{language === 'ar' ? 'تاريخ أخذ الدين (متى أخذت الدين)' : t('debtStartDate')}</span>
                  </label>
                  <input 
                    name="startDate" 
                    type="date" 
                    defaultValue={editingId ? (debts?.find(d => d.id === editingId)?.startDate || (debts?.find(d => d.id === editingId)?.createdAt ? new Date(debts?.find(d => d.id === editingId)!.createdAt).toISOString().split('T')[0] : '')) : new Date().toISOString().split('T')[0]} 
                    className="input-field font-mono" 
                    required
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'ar' ? 'اليوم الذي تم فيه استلام أو إعطاء الدين' : 'Date the debt was initiated'}
                  </p>
                </div>

                {/* موعد التسديد المتوقع */}
                <div>
                  <label className="text-xs text-slate-900 dark:text-white font-black block mb-1 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={14} className="text-amber-500" />
                    <span>{language === 'ar' ? 'تاريخ التسديد المتوقع (موعد الاستحقاق)' : t('dueDate')}</span>
                  </label>
                  <input 
                    name="dueDate" 
                    type="date" 
                    defaultValue={editingId ? debts?.find(d => d.id === editingId)?.dueDate : ''} 
                    className="input-field font-mono" 
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'ar' ? 'تاريخ إرجاع أو سداد المبلغ (اختياري)' : 'Expected repayment due date (optional)'}
                  </p>
                </div>

                {/* Repayment Method */}
                <div>
                   <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('repaymentMethod')}</label>
                   <select 
                    name="repaymentMethod" 
                    value={repaymentMethod}
                    onChange={(e) => setRepaymentMethod(e.target.value as any)}
                    className="input-field font-bold"
                    required
                  >
                     <option value="one-time">{t('oneTime')}</option>
                     <option value="installments">{t('installments')}</option>
                     <option value="two-payments">{t('twoPayments')}</option>
                   </select>
                </div>

                {repaymentMethod === 'installments' && (
                  <div>
                    <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('installmentCount')}</label>
                    <input 
                      name="installmentCount" 
                      type="number" 
                      min="1"
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(Math.max(1, Number(e.target.value)))}
                      className="input-field font-mono font-bold" 
                      required 
                    />
                  </div>
                )}

                {/* Phone */}
                <div>
                  <label className="text-xs text-slate-900 dark:text-white font-black block mb-1 uppercase tracking-widest flex items-center gap-1.5">
                    <Phone size={14} className="text-emerald-500" />
                    <span>{language === 'ar' ? 'رقم الهاتف للتواصل (اختياري)' : t('phoneNumber')}</span>
                  </label>
                  <input 
                    name="phone" 
                    type="tel"
                    defaultValue={editingId ? debts?.find(d => d.id === editingId)?.phone : ''} 
                    placeholder="07XXXXXXXXX"
                    className="input-field font-mono" 
                  />
                </div>

                {/* Notes */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-xs text-slate-900 dark:text-white font-black block mb-1 uppercase tracking-widest">{language === 'ar' ? 'ملاحظات وتفاصيل الدين (اختياري)' : t('notes')}</label>
                  <textarea 
                    name="note" 
                    rows={2}
                    defaultValue={editingId ? debts?.find(d => d.id === editingId)?.note : ''} 
                    placeholder={language === 'ar' ? 'تفاصيل إضافية عن سبب الدين، شروط السداد، أو مكان المقابلة...' : 'Additional notes...'}
                    className="input-field resize-none" 
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 py-3 text-base">
                  {t('save')}
                </button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  {t('cancel')}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Partial Payment Modal (نافذة تسديد جزء من الدين) */}
      <AnimatePresence>
        {payingDebt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 15 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.92, y: 15 }} 
              className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-emerald-500/40 relative overflow-hidden space-y-5"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm shrink-0">
                    <HandCoins size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-900 dark:text-white">
                      {language === 'ar' ? 'تسديد جزء من الدين' : t('recordPartialPayment')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      {language === 'ar' ? `المستفيد / الشخص: ${payingDebt.personName}` : `Person: ${payingDebt.personName}`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setPayingDebt(null)} 
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Remaining Balance Reminder Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                    {language === 'ar' ? 'المبلغ المتبقي حالياً من الدين' : 'Current Remaining Balance'}
                  </span>
                  <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {formatAmount(payingDebt.remainingAmount)} <span className="text-xs font-sans font-bold">{getCurrencyLabel()}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {language === 'ar' ? 'المبلغ الأصلي' : 'Original Debt'}
                  </span>
                  <p className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
                    {formatAmount(payingDebt.amount)} {getCurrencyLabel()}
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSavePartialPayment} className="space-y-4">
                {/* Amount Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                    <span>{language === 'ar' ? 'مبلغ الدفعة المراد تسديدها' : t('partialPaymentAmount')}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                      {getCurrencyLabel()}
                    </span>
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max={payingDebt.remainingAmount}
                    autoFocus
                    required
                    value={partialAmountInput}
                    onChange={(e) => setPartialAmountInput(e.target.value)}
                    placeholder={language === 'ar' ? 'ادخل مبلغ التسديد...' : 'Enter payment amount...'}
                    className="input-field text-xl font-mono font-black"
                  />

                  {/* Quick percentage buttons */}
                  <div className="flex gap-2 pt-1">
                    <button 
                      type="button" 
                      onClick={() => setPartialAmountInput(String(payingDebt.remainingAmount))}
                      className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 transition-colors border border-emerald-300 dark:border-emerald-700"
                    >
                      {language === 'ar' ? 'كامل المتبقي (100%)' : 'Full (100%)'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPartialAmountInput(String(Math.round(payingDebt.remainingAmount * 0.5)))}
                      className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 transition-colors border border-blue-300 dark:border-blue-700"
                    >
                      {language === 'ar' ? 'نصف المتبقي (50%)' : 'Half (50%)'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPartialAmountInput(String(Math.round(payingDebt.remainingAmount * 0.25)))}
                      className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors border border-slate-300 dark:border-slate-600"
                    >
                      {language === 'ar' ? 'ربع المتبقي (25%)' : 'Quarter (25%)'}
                    </button>
                  </div>
                </div>

                {/* Date Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-500" />
                    <span>{language === 'ar' ? 'تاريخ تسديد هذه الدفعة' : t('partialPaymentDate')}</span>
                  </label>
                  <input 
                    type="date" 
                    required
                    value={partialDateInput}
                    onChange={(e) => setPartialDateInput(e.target.value)}
                    className="input-field font-mono font-bold"
                  />
                </div>

                {/* Note Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-indigo-500" />
                    <span>{language === 'ar' ? 'ملاحظة أو بيان الدفعة (اختياري)' : t('paymentNote')}</span>
                  </label>
                  <input 
                    type="text" 
                    value={partialNoteInput}
                    onChange={(e) => setPartialNoteInput(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: تسديد نقدي كاش، حوالة، وصل رقم 4...' : 'e.g. Cash payment, bank transfer...'}
                    className="input-field"
                  />
                </div>

                {/* Real-time Calculation Preview Card */}
                {Number(partialAmountInput) > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                      <span>{language === 'ar' ? 'المبلغ بعد إضافة هذا التسديد:' : 'Remaining after payment:'}</span>
                      <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                        {formatAmount(Math.max(0, payingDebt.remainingAmount - Number(partialAmountInput)))} {getCurrencyLabel()}
                      </span>
                    </div>
                    {Number(partialAmountInput) >= payingDebt.remainingAmount && (
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        <span>{language === 'ar' ? 'رائع! سيتم إغلاق هذا الدين بالكامل كمسدد بنسبة 100%.' : 'Great! This debt will be marked as fully settled.'}</span>
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Submit Buttons */}
                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit" 
                    disabled={!partialAmountInput || Number(partialAmountInput) <= 0}
                    className="btn-primary flex-1 py-3 text-base flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check size={18} />
                    <span>{language === 'ar' ? 'حفظ وتأكيد السداد' : t('confirmPartialPayment')}</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setPayingDebt(null)} 
                    className="px-5 py-3 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Debts List */}
      <div className="grid grid-cols-1 gap-4">
        {currentDebts?.map(debt => {
          const payments = debt.payments || [];
          const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
          const remaining = debt.remainingAmount !== undefined ? debt.remainingAmount : Math.max(0, debt.amount - totalPaid);
          const paidPercent = debt.amount > 0 ? Math.min(100, Math.round((totalPaid / debt.amount) * 100)) : 0;
          const isSettled = remaining <= 0;
          const isOverdue = isDebtOverdue(debt.dueDate, remaining);
          const isExpanded = viewDebt === debt.id;

          return (
            <div 
              key={debt.id} 
              className={cn(
                "card relative overflow-hidden transition-all duration-300 border-2 rounded-3xl",
                isExpanded 
                  ? "border-blue-500/60 shadow-lg bg-white dark:bg-slate-800" 
                  : "border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white/90 dark:bg-slate-800/90"
              )}
            >
              {/* Type indicator stripe */}
              <div className={cn(
                "absolute right-0 top-0 bottom-0 w-2",
                debt.type === 'owe' ? "bg-rose-500" : "bg-emerald-500"
              )} />

              {/* Clickable Header Row */}
              <div 
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                onClick={() => setViewDebt(isExpanded ? null : debt.id!)}
              >
                {/* Person details & icon */}
                <div className="flex items-center gap-3.5">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm",
                    debt.type === 'owe' 
                      ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900" 
                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900"
                  )}>
                    {debt.type === 'owe' ? <HandCoins size={24} /> : <ArrowUpCircle size={24} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tighter">
                        {debt.personName}
                      </h4>

                      {/* Status Badge */}
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded-full border",
                        isSettled 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" 
                          : totalPaid > 0
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                      )}>
                        {isSettled 
                          ? (language === 'ar' ? '✓ تم السداد بالكامل' : 'Settled') 
                          : totalPaid > 0 
                            ? (language === 'ar' ? `جاري السداد (${paidPercent}%)` : `Partially Paid (${paidPercent}%)`) 
                            : (language === 'ar' ? 'لم يُسدد بعد' : 'Unpaid')}
                      </span>

                      {/* Overdue alert */}
                      {isOverdue && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700 flex items-center gap-1">
                          <AlertCircle size={10} />
                          <span>{language === 'ar' ? 'متأخر' : 'Overdue'}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
                      <span>{debt.type === 'owe' ? (language === 'ar' ? 'دين بذمتي (أنا مدين له)' : t('iOwe')) : (language === 'ar' ? 'دين لي (أنا أطلبه)' : t('owedToMe'))}</span>
                      {debt.startDate && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Calendar size={12} className="text-blue-500" />
                            <span>{formatDateDisplay(debt.startDate)}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Amount & Expand button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/50">
                  <div className="text-right sm:text-left">
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                      {language === 'ar' ? 'المبلغ المتبقي' : 'Remaining'}
                    </p>
                    <p className={cn(
                      "font-black font-mono text-xl",
                      isSettled ? "text-slate-400 dark:text-slate-500 line-through" : debt.type === 'owe' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    )}>
                      {isHidden ? '****' : formatAmount(remaining)} 
                      {!isHidden && <span className="text-xs font-sans font-bold ml-1">{getCurrencyLabel()}</span>}
                    </p>
                    {debt.dueDate && (
                      <p className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-0.5",
                        isOverdue 
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-black" 
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      )}>
                        <Clock size={10} />
                        <span>{t('dueDate')}: {formatDateDisplay(debt.dueDate)}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center gap-1.5">
                    {/* Quick partial pay button from list */}
                    {!isSettled && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPayPartModal(debt);
                        }}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 transition-all font-bold text-xs flex items-center gap-1 shadow-sm"
                        title={language === 'ar' ? 'تسديد جزء من الدين' : 'Record Partial Payment'}
                      >
                        <Plus size={14} />
                        <span className="hidden sm:inline">{language === 'ar' ? 'تسديد جزء' : 'Pay Part'}</span>
                      </button>
                    )}

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar along the card */}
              <div className="px-5 pb-2">
                <div className="w-full bg-slate-100 dark:bg-slate-700/80 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-600">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isSettled ? "bg-emerald-500" : paidPercent > 50 ? "bg-teal-500" : paidPercent > 0 ? "bg-blue-500" : "bg-transparent"
                    )}
                    style={{ width: `${paidPercent}%` }}
                  />
                </div>
              </div>

              {/* Expanded Detailed View (كل التفاصيل المطلوبة) */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-5 border-t-2 border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/30 space-y-5 overflow-hidden"
                  >
                    {/* 1. Dates Grid (متى قمت بأخذ هذا الدين ومتى التسديد) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* تاريخ أخذ الدين */}
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-blue-200/80 dark:border-blue-900/50 shadow-sm flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {language === 'ar' ? 'تاريخ أخذ الدين (متى أخذت الدين)' : t('debtStartDate')}
                          </p>
                          <p className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">
                            {formatDateDisplay(debt.startDate || debt.createdAt)}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                            {language === 'ar' ? 'تاريخ نشوء هذا الدين وبدايته' : 'Initiation date'}
                          </p>
                        </div>
                      </div>

                      {/* تاريخ التسديد المتوقع */}
                      <div className={cn(
                        "p-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 shadow-sm flex items-start gap-3",
                        isOverdue 
                          ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20" 
                          : "border-amber-200/80 dark:border-amber-900/50"
                      )}>
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                          isOverdue 
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800" 
                            : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                        )}>
                          <Clock size={20} />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {language === 'ar' ? 'تاريخ التسديد المتوقع (موعد الاستحقاق)' : t('debtDueDate')}
                          </p>
                          <p className={cn(
                            "text-base font-black font-mono mt-0.5",
                            isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                          )}>
                            {debt.dueDate ? formatDateDisplay(debt.dueDate) : (language === 'ar' ? 'غير محدد' : 'Not specified')}
                          </p>
                          <p className={cn(
                            "text-[10px] font-bold",
                            isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"
                          )}>
                            {isOverdue 
                              ? (language === 'ar' ? '⚠️ تنبيه: تجاوز موعد السداد المحدد!' : '⚠️ Repayment is overdue!') 
                              : (language === 'ar' ? 'الموعد المتفق عليه لتسديد الدين' : 'Agreed settlement date')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 2. Three Financial Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* المبلغ الأصلي */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <span className="text-[10px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400 block mb-1">
                          {language === 'ar' ? 'مبلغ الدين الأصلي' : t('total')}
                        </span>
                        <p className="font-black font-mono text-lg text-slate-900 dark:text-white">
                          {isHidden ? '****' : formatAmount(debt.amount)} 
                          {!isHidden && <span className="text-xs font-sans font-bold ml-1 opacity-70">{getCurrencyLabel()}</span>}
                        </p>
                      </div>

                      {/* المبلغ الواصل / المسدد */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] uppercase tracking-wider font-black text-emerald-700 dark:text-emerald-400">
                            {language === 'ar' ? 'المبلغ الواصل (المسدد)' : t('amountPaidSoFar')}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.2 rounded font-mono">
                            {paidPercent}%
                          </span>
                        </div>
                        <p className="font-black font-mono text-lg text-emerald-600 dark:text-emerald-400">
                          {isHidden ? '****' : formatAmount(totalPaid)} 
                          {!isHidden && <span className="text-xs font-sans font-bold ml-1 opacity-70">{getCurrencyLabel()}</span>}
                        </p>
                      </div>

                      {/* المبلغ المتبقي */}
                      <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-800/60 shadow-sm">
                        <span className="text-[10px] uppercase tracking-wider font-black text-blue-700 dark:text-blue-400 block mb-1">
                          {language === 'ar' ? 'المبلغ المتبقي المطلوب سداده' : t('remaining')}
                        </span>
                        <p className={cn(
                          "font-black font-mono text-lg",
                          isSettled ? "text-emerald-600 dark:text-emerald-400" : debt.type === 'owe' ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {isHidden ? '****' : formatAmount(remaining)} 
                          {!isHidden && <span className="text-xs font-sans font-bold ml-1 opacity-70">{getCurrencyLabel()}</span>}
                        </p>
                      </div>
                    </div>

                    {/* 3. Additional info: Phone and Notes */}
                    {(debt.phone || debt.note) && (
                      <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                        {debt.phone && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <Phone size={14} className="text-emerald-500" />
                            <span>{language === 'ar' ? 'رقم الهاتف:' : 'Phone:'}</span>
                            <a href={`tel:${debt.phone}`} className="font-mono text-blue-600 dark:text-blue-400 hover:underline">
                              {debt.phone}
                            </a>
                          </div>
                        )}
                        {debt.note && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                            <span className="font-black text-slate-900 dark:text-white block mb-0.5">{language === 'ar' ? 'ملاحظات:' : 'Notes:'}</span>
                            {debt.note}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4. Installments view if applicable */}
                    {debt.repaymentMethod === 'installments' && (
                      <div className="space-y-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{t('monthlyRepaymentAmount')}</p>
                          <p className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-base">
                            {formatAmount(debt.monthlyAmount || Math.round(debt.amount / (debt.installmentCount || 1)))} {getCurrencyLabel()}
                          </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 pt-1">
                          {Array.from({ length: debt.installmentCount || 1 }).map((_, idx) => {
                            const pNum = idx + 1;
                            const isP = pNum <= (debt.paidInstallments || 0);
                            const startDate = new Date(debt.startDate || debt.createdAt);
                            const installmentDate = new Date(startDate);
                            installmentDate.setMonth(startDate.getMonth() + idx);
                            
                            let monthName = '';
                            if (language === 'ar') {
                              const arMonths = ['كانون 2', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين 1', 'تشرين 2', 'كانون 1'];
                              monthName = arMonths[installmentDate.getMonth()];
                            } else {
                              monthName = installmentDate.toLocaleDateString('en-US', { month: 'short' });
                            }
                            const yearNum = installmentDate.getFullYear().toString();

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => toggleInstallment(debt, idx)}
                                className="flex flex-col items-center gap-1 group"
                              >
                                <div
                                  className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all border-2",
                                    isP 
                                      ? "bg-emerald-500/20 border-emerald-600 text-emerald-700 dark:text-emerald-300 shadow-sm"
                                      : "bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 group-hover:border-primary/50"
                                  )}
                                >
                                  {isP ? <Check size={16} /> : pNum}
                                </div>
                                <div className="text-[8px] font-black text-slate-500 dark:text-slate-400 text-center leading-tight">
                                  {monthName}<br/>{yearNum}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 5. Payment History (سجل التسديدات الجزئية لهذا الدين) */}
                    <div className="space-y-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
                          <Receipt size={16} className="text-emerald-500" />
                          <span>{language === 'ar' ? `سجل الدفعات المسددة (${payments.length})` : `${t('paymentHistory')} (${payments.length})`}</span>
                        </p>
                        {!isSettled && (
                          <button
                            type="button"
                            onClick={() => openPayPartModal(debt)}
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Plus size={14} />
                            <span>{language === 'ar' ? '+ تسديد دفعة جديدة' : '+ Add Payment'}</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {payments.map((p, i) => (
                          <div key={p.id || i} className="flex justify-between items-center text-xs p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                            <div className="space-y-0.5">
                              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                +{formatAmount(p.amount)} {getCurrencyLabel()}
                              </span>
                              {p.note && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                                  {p.note}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-bold text-slate-600 dark:text-slate-400 font-mono text-[11px] flex items-center gap-1">
                                <Calendar size={12} className="text-slate-400" />
                                {formatDateDisplay(p.date)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(debt, p.id || i)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title={language === 'ar' ? 'حذف هذه الدفعة' : 'Delete payment'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}

                        {payments.length === 0 && (
                          <div className="py-4 text-center text-slate-400 text-xs italic font-bold">
                            {language === 'ar' ? 'لم يتم تسجيل أي دفعات سداد لهذا الدين حتى الآن.' : t('noPayments')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 6. Action Buttons Bar */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {/* زر تسديد جزء (المطلوب الرئيسي) */}
                      {!isSettled && (
                        <button 
                          type="button"
                          onClick={() => openPayPartModal(debt)}
                          className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={18} />
                          <span>{language === 'ar' ? 'تسديد جزء من الدين' : t('payPart')}</span>
                        </button>
                      )}

                      {/* زر تسديد كامل المتبقي */}
                      {!isSettled && remaining > 0 && (
                        <button 
                          type="button"
                          onClick={() => handleSettleFullRemaining(debt)}
                          className="py-3 px-4 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={16} />
                          <span>{language === 'ar' ? 'تسديد كامل المتبقي' : 'Settle Full'}</span>
                        </button>
                      )}

                      {/* Edit Button */}
                      <button 
                        type="button"
                        onClick={() => { 
                          setEditingId(debt.id!); 
                          setRepaymentMethod(debt.repaymentMethod || 'one-time');
                          setInstallmentCount(debt.installmentCount || 1);
                          setShowAdd(true); 
                        }}
                        className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-bold text-xs flex items-center gap-1.5"
                        title={language === 'ar' ? 'تعديل' : 'Edit'}
                      >
                        <Edit size={16} />
                        <span className="hidden sm:inline">{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                      </button>

                      {/* Delete Button */}
                      <button 
                        type="button"
                        onClick={() => {
                          if (debt.id) requestDelete(debt.id, 'debt');
                        }}
                        className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl hover:bg-rose-100 transition-colors font-bold text-xs flex items-center gap-1.5"
                        title={language === 'ar' ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={16} />
                        <span className="hidden sm:inline">{language === 'ar' ? 'حذف' : 'Delete'}</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {currentDebts?.length === 0 && (
          <div className="card text-center py-16 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
              {debtSubTab === 'owe' ? <HandCoins size={36} /> : <ArrowUpCircle size={36} />}
            </div>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">
              {debtSubTab === 'owe' 
                ? (language === 'ar' ? 'لا توجد ديون بذمتك حالياً 🎉' : 'No debts you owe currently') 
                : (language === 'ar' ? 'لا توجد ديون تطلبها لأحد حالياً' : 'No debts owed to you currently')}
            </p>
            <button 
              type="button"
              onClick={() => { setEditingId(null); setShowAdd(true); }}
              className="mt-3 text-xs font-black text-blue-600 dark:text-blue-400 hover:underline"
            >
              + {language === 'ar' ? 'إضافة دين جديد' : 'Add new debt'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CumulativeCalculator = ({ t, language, widgets, updateWidget }: { t: any, language: string, widgets?: any, updateWidget?: any }) => {
  const [initialCapital, setInitialCapital] = useState(1000);
  const [roiRate, setRoiRate] = useState(2);
  const [duration, setDuration] = useState(30);
  const [periodType, setPeriodType] = useState('months');
  const [results, setResults] = useState<any[]>([]);
  const [summary, setSummary] = useState({ futureValue: 0, totalProfit: 0 });
  const [checkedPeriods, setCheckedPeriods] = useState<number[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('calculator_checked_periods');
    if (saved) setCheckedPeriods(JSON.parse(saved));
    calculateGrowth();
  }, []);

  const calculateGrowth = () => {
    const principal = Number(initialCapital);
    const rate = Number(roiRate) / 100;
    const safeDuration = Math.min(Number(duration), 1000);
    
    let currentBalance = principal;
    const rows = [];

    for (let i = 1; i <= safeDuration; i++) {
      const starting = currentBalance;
      const interest = currentBalance * rate;
      currentBalance += interest;
      
      rows.push({
        period: i,
        startingBalance: starting,
        interestEarned: interest,
        endingBalance: currentBalance
      });
    }

    setResults(rows);
    setSummary({
      futureValue: currentBalance,
      totalProfit: currentBalance - principal
    });
  };

  const toggleCheck = (period: number) => {
    const newChecked = checkedPeriods.includes(period)
      ? checkedPeriods.filter(p => p !== period)
      : [...checkedPeriods, period];
    
    setCheckedPeriods(newChecked);
    localStorage.setItem('calculator_checked_periods', JSON.stringify(newChecked));

    if (!checkedPeriods.includes(period)) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#1e3a8a', '#10b981', '#f43f5e']
      });
    }
  };

  const getChartData = () => {
    if (results.length <= 20) return results;
    const step = Math.ceil(results.length / 10);
    const sampled = [];
    for (let i = 0; i < results.length; i += step) {
      sampled.push(results[i]);
    }
    sampled.push(results[results.length - 1]);
    return sampled;
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="relative overflow-hidden p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-2xl shadow-indigo-500/30 mb-8 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 blur-2xl -ml-12 -mb-12 group-hover:translate-x-10 transition-transform duration-700" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner group-hover:rotate-12 transition-transform">
              <Calculator size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight">{t('cumulativeCalculator')}</h2>
              <p className="text-indigo-100/70 text-[10px] font-bold uppercase tracking-[0.2em]">{language === 'ar' ? 'أداة حساب النمو التراكمي' : 'Compound Growth Calculator'}</p>
            </div>
          </div>
          
          {widgets && updateWidget && (
            <button 
              onClick={() => updateWidget('calculator', !widgets.calculator)}
              className={cn(
                "px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest backdrop-blur-md transition-all flex items-center gap-2 border",
                widgets.calculator 
                  ? "bg-white text-indigo-600 border-slate-950 shadow-lg" 
                  : "bg-white/10 text-white border-white hover:bg-white/20"
              )}
            >
              <LayoutDashboard size={14} strokeWidth={3} />
              {t('showOnDashboard')}
            </button>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('initialCapital')}</label>
            <input 
              type="number" 
              className="input-field font-mono" 
              value={initialCapital} 
              onChange={(e) => setInitialCapital(Number(e.currentTarget.value))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('roiRate')}</label>
            <input 
              type="number" 
              className="input-field font-mono" 
              value={roiRate} 
              onChange={(e) => setRoiRate(Number(e.currentTarget.value))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('duration')}</label>
            <input 
              type="number" 
              className="input-field font-mono" 
              value={duration} 
              onChange={(e) => setDuration(Number(e.currentTarget.value))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-950 dark:text-white font-black block mb-1 uppercase tracking-widest">{t('compoundingPeriod')}</label>
            <select 
              className="input-field"
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value)}
            >
              <option value="hours">{t('hours')}</option>
              <option value="days">{t('daily')}</option>
              <option value="months">{t('monthly')}</option>
              <option value="years">{t('yearly')}</option>
            </select>
          </div>
        </div>
        <button 
          onClick={calculateGrowth}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <TrendingUp size={18} />
          {t('calculate')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-3xl p-6 bg-blue-900 text-white border-2 border-slate-950 dark:border-white relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150" />
            <p className="text-[10px] text-blue-100 font-black mb-1 uppercase tracking-widest">{t('futureValue')}</p>
            <p className="text-2xl font-black font-mono text-white">{summary.futureValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-3xl p-6 bg-emerald-700 text-white border-2 border-slate-950 dark:border-white relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150" />
            <p className="text-[10px] text-emerald-50 font-black mb-1 uppercase tracking-widest">{t('totalProfit')}</p>
            <p className="text-2xl font-black font-mono text-white">{summary.totalProfit.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
          </div>
      </div>

      {results.length > 0 && (
        <div className="card p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-slate-950 dark:border-white shadow-xl shadow-indigo-500/5">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-indigo-500 dark:text-indigo-400 mb-1">Target Progress</p>
              <p className="text-sm font-bold text-slate-950 dark:text-white">
                <span className="font-mono">{(checkedPeriods.length).toLocaleString('en-US')}</span> / <span className="font-mono">{(results.length).toLocaleString('en-US')}</span> {t('days')} {t('achieved')}
              </p>
            </div>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {(Math.round((checkedPeriods.length / results.length) * 100)).toLocaleString('en-US')}%
            </p>
          </div>
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-indigo-500/10">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(checkedPeriods.length / results.length) * 100}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 shadow-lg shadow-indigo-500/20"
            />
          </div>
        </div>
      )}

      <div className="card h-64 p-4">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <CircleDot size={14} className="text-accent" />
          {t('chartGrowth')}
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="period" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Area 
              type="monotone" 
              dataKey="endingBalance" 
              stroke="#2563eb" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorGrowth)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-sm px-2 text-slate-950 dark:text-white uppercase tracking-widest">{t('latestOperations')}</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-100 dark:bg-slate-800 rounded-3xl border border-slate-950 dark:border-white overflow-hidden shadow-sm">
          {results.slice(0, 100).map((row) => (
            <div 
              key={row.period} 
              className={cn(
                "p-4 flex items-center justify-between transition-all duration-300",
                checkedPeriods.includes(row.period) 
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 dark:border-white" 
                  : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30 border-l-4 border-transparent"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => toggleCheck(row.period)}>
                  <div className={cn(
                    "w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center",
                    checkedPeriods.includes(row.period)
                      ? "bg-emerald-500 border-slate-950 dark:border-white text-slate-950 dark:text-white shadow-sm"
                      : "border-slate-950 dark:border-white bg-slate-200 dark:bg-slate-800"
                  )}>
                    {checkedPeriods.includes(row.period) && <Check size={14} strokeWidth={4} />}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-950 dark:text-white bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded uppercase">
                      {t('period')} {row.period}
                    </span>
                    {checkedPeriods.includes(row.period) && (
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter flex items-center gap-1">
                        <Sparkles size={10} /> {t('achieved')}
                      </span>
                    )}
                  </div>
                  <p className="font-black text-sm font-mono text-emerald-600 mt-0.5 break-all">
                    +{row.interestEarned.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="text-left bg-slate-300/50 dark:bg-slate-900/50 px-3 py-1.5 rounded-2xl border border-slate-950 dark:border-white shadow-sm">
                <p className="text-[9px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest">{t('endingBalance')}</p>
                <p className={cn(
                  "font-black font-mono text-sm tracking-tighter",
                  checkedPeriods.includes(row.period) ? "text-emerald-600" : "text-slate-950 dark:text-white"
                )}>
                  {row.endingBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
          {results.length > 100 && (row => null) && (
            <div className="p-4 text-center text-xs text-slate-700 dark:text-slate-400 italic">
              Showing first 100 periods only...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AboutApp = ({ t, language, onBack }: { t: any, language: string, onBack: () => void }) => {
  const whatsappNumber = "+9647838516953"; // Updated number
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(language === 'ar' ? 'السلام عليكم، أرغب في الاستفسار عن تصميم تطبيق' : 'Hello, I would like to inquire about app design')}`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto py-4">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ChevronLeft size={24} className={cn(language === 'ar' ? "rotate-180" : "")} />
        </button>
        <h2 className="text-2xl font-black neon-blue">{t('aboutApp')}</h2>
      </div>

      <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/30 rotate-6 hover:rotate-0 transition-transform duration-500">
            <LayoutDashboard size={48} className="text-white -rotate-6" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900">
             <Heart size={22} className="text-white fill-white animate-pulse" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white uppercase tracking-tighter shadow-sm">Al-Hilali Finance</h1>
          <p className="text-slate-950 dark:text-white font-black tracking-[0.3em] text-[10px] uppercase">{t('appVersion')} 2.1.0</p>
        </div>

        <div className="w-full max-w-md p-8 bg-white dark:bg-slate-800 rounded-[3rem] shadow-sm border border-slate-950 dark:border-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <UserIcon size={140} className="text-primary -rotate-12" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-full text-primary text-[10px] font-black uppercase tracking-wider">
              <Info size={12} /> {t('developerInfo')}
            </div>
            
            <p className="text-xl leading-relaxed text-slate-950 dark:text-white font-bold">
              {t('designedBy')}
            </p>

            <div className="pt-4 border-t border-slate-950 dark:border-white">
              <p className="text-[10px] text-slate-700 font-bold uppercase mb-4">{t('contactMe')}</p>
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-1 active:scale-95 group"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Phone size={20} className="fill-white" />
                </div>
                <div className="flex-1 text-start">
                  <p className="text-[13px] font-bold leading-tight">{t('whatsappContact')}</p>
                </div>
                <MessageCircle size={18} className="opacity-50" />
              </a>
            </div>
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-800/50 dark:to-slate-800/50 rounded-[2.5rem] border border-slate-950 dark:border-white text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-2 h-full bg-amber-400/30" />
          <p className="text-lg leading-relaxed text-amber-900 dark:text-amber-400 font-bold italic">
            "{t('dedication')}"
          </p>
        </motion.div>

        <div className="pt-8">
          <div className="flex items-center gap-3 justify-center text-slate-500 dark:text-slate-500 font-black text-[10px] tracking-[0.3em]">
            <span className="w-12 h-[1px] bg-current" />
            <span>2026 COPYRIGHTS</span>
            <span className="w-12 h-[1px] bg-current" />
          </div>
        </div>
      </div>
    </div>
  );
};

const Settings = ({ 
  t, 
  language, 
  toggleLanguage, 
  theme, 
  toggleTheme,
  widgets,
  updateWidget,
  privacyMode,
  togglePrivacy,
  mainCurrency,
  changeMainCurrency,
  user,
  lastSync,
  setLastSync,
  formatAmount,
  getCurrencyLabel
}: { 
  t: any, 
  language: string, 
  toggleLanguage: () => void, 
  theme: string, 
  toggleTheme: () => void,
  widgets: any,
  updateWidget: (key: string, val: boolean) => void,
  privacyMode: boolean,
  togglePrivacy: () => void,
  mainCurrency: 'IQD' | 'USD',
  changeMainCurrency: (cur: 'IQD' | 'USD') => void,
  user: User | null,
  lastSync: string | null,
  setLastSync: (s: string | null) => void,
  formatAmount: (n: number) => string,
  getCurrencyLabel: () => string
}) => {
  const [exchangeRate, setExchangeRate] = useState(1530);
  const [biometrics, setBiometrics] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);

  useEffect(() => {
    db.settings.get('exchange_rate').then(s => s && setExchangeRate(s.value));
    db.settings.get('biometrics').then(s => s && setBiometrics(s.value));
  }, []);

  const saveRate = (val: number) => {
    setExchangeRate(val);
    db.settings.put({ id: 'exchange_rate', value: val });
  };

  const toggleBiometrics = () => {
    const newVal = !biometrics;
    setBiometrics(newVal);
    db.settings.put({ id: 'biometrics', value: newVal });
    if (newVal) alert(language === 'ar' ? 'سيتم تفعيل قفل البصمة عند فتح التطبيق المرة القادمة' : 'Biometric lock will be activated next time you open the app');
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackup = async () => {
    setIsSyncing(true);
    try {
      const syncTime = await firebaseService.backupData();
      if (syncTime) setLastSync(syncTime);
      alert(t('backupSuccess'));
    } catch (err) {
      console.error(err);
      alert(language === 'ar' ? 'فشل النسخ الاحتياطي' : 'Backup failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm(language === 'ar' ? 'هذا سيؤدي لمسح البيانات المحلية واستبدالها؟' : 'This will replace local data. Continue?')) return;
    setIsSyncing(true);
    try {
      const syncTime = await firebaseService.restoreData();
      if (syncTime) setLastSync(syncTime);
      alert(t('restoreSuccess'));
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(language === 'ar' ? 'فشلت الاستعادة' : 'Restore failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-amber-600">{t('settings')}</h2>
      
      {/* PWA Android Install Option */}
      <PWAInstallButton language={language} variant="settings" />
      
      {/* Excel Data Export Card */}
      <div className="card p-5 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-2 border-emerald-500/30 dark:border-emerald-500/20 rounded-3xl relative overflow-hidden space-y-3 group hover:border-emerald-500/60 transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="flex items-start justify-between relative z-10 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:rotate-6 transition-transform shrink-0">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {language === 'ar' ? 'تصدير البيانات بصيغة إكسل (Excel)' : 'Export Data to Excel'}
                </h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  .XLSX PRO
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold mt-0.5">
                {language === 'ar' 
                  ? 'حدد التبويبات والأعمدة والتفاصيل الدقيقة المراد تضمينها في ملف الإكسل' 
                  : 'Select specific tabs, columns, and date ranges for Excel export'}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between gap-3 relative z-10 border-t border-emerald-500/15 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-bold">
            <Sparkles size={13} className="text-emerald-500" />
            <span>{language === 'ar' ? 'تخصيص كامل للأعمدة والأوراق والتصفية' : 'Full columns, sheets & filter customization'}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowExcelModal(!showExcelModal)}
            className={cn(
              "btn-primary py-2.5 px-4 text-xs font-black flex items-center gap-2 active:scale-95 transition-all shadow-md",
              showExcelModal 
                ? "bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/30" 
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25"
            )}
          >
            <FileSpreadsheet size={16} />
            <span>{showExcelModal ? (language === 'ar' ? 'إغلاق تبويب الإكسل' : 'Close Export Tab') : (language === 'ar' ? 'تخصيص وتصدير الإكسل' : 'Customize & Export')}</span>
          </button>
        </div>
      </div>

      {/* Inline Excel Export Tab (ضمن صفحة الإعدادات) */}
      <AnimatePresence>
        {showExcelModal && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <ExcelExportModal
              isOpen={showExcelModal}
              inline={true}
              onClose={() => setShowExcelModal(false)}
              language={language as any}
              formatAmount={formatAmount}
              getCurrencyLabel={getCurrencyLabel}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Cloud Backup Section */}
      <div className="card space-y-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12 pointer-events-none text-blue-600">
          <Cloud size={120} />
        </div>
        
        <h3 className="font-bold border-b border-slate-950 dark:border-white pb-2 flex items-center gap-2">
          <Cloud size={18} className="text-blue-500"/> {t('cloudBackup')}
        </h3>

        {!user ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-800 dark:text-slate-300 font-bold">{t('backupDesc')}</p>
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-4 bg-slate-100 dark:bg-slate-700 border border-slate-950 dark:border-white rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-all shadow-sm"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              {t('loginWithGoogle')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div 
                className="flex items-center gap-3 cursor-pointer flex-1"
                onClick={() => (window as any).setActiveTab?.('account')}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ""} className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-600" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500">
                    <UserIcon size={20} />
                  </div>
                )}
                <div>
                  <p className="text-sm font-black leading-none text-slate-900 dark:text-white">{user.displayName || (language === 'ar' ? 'مستخدم حساباتي' : 'User')}</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold mt-1 uppercase tracking-tighter">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => (window as any).setActiveTab?.('account')}
                  className="px-2.5 py-1.5 text-xs font-black text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600 rounded-xl transition-colors"
                >
                  {language === 'ar' ? 'التفاصيل' : 'Details'}
                </button>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-600 transition-colors" title={language === 'ar' ? 'تسجيل الخروج' : 'Logout'}>
                  <LogOut size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleBackup}
                disabled={isSyncing}
                className="flex flex-col items-center gap-2 p-4 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-2xl transition-all group disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <CloudUpload size={20} />
                </div>
                <span className="text-xs font-bold text-primary">{t('backupNow')}</span>
              </button>

              <button 
                onClick={handleRestore}
                disabled={isSyncing}
                className="flex flex-col items-center gap-2 p-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-slate-950 dark:border-white rounded-2xl transition-all group disabled:opacity-50"
              >
                <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                  <CloudDownload size={20} />
                </div>
                <span className="text-xs font-bold text-emerald-500">{t('restoreNow')}</span>
              </button>
            </div>

            {isSyncing && (
              <div className="text-center">
                <p className="text-[10px] text-primary animate-pulse font-bold uppercase tracking-widest">
                  {language === 'ar' ? 'جاري المزامنة...' : 'Syncing...'}
                </p>
              </div>
            )}
            
            {lastSync && (
              <div className="pt-2 text-center border-t border-slate-900/10 dark:border-white/10 mt-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                  {language === 'ar' ? 'آخر مزامنة:' : 'Last Sync:'} {new Date(lastSync).toLocaleString(language === 'ar' ? 'ar-IQ' : 'en-US')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="card space-y-4">
        <h3 className="font-bold border-b border-slate-950 dark:border-white pb-2 flex items-center gap-2">
          <CircleDot size={18} className="text-primary"/> {t('currencyAndExchange')}
        </h3>
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-900 dark:text-white font-black uppercase tracking-widest">{t('mainCurrency')}</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl border border-slate-950 dark:border-white">
              <button 
                onClick={() => changeMainCurrency('IQD')}
                className={cn(
                  "py-3 text-xs font-bold rounded-lg transition-all border-2",
                  mainCurrency === 'IQD' 
                    ? "neon-pulse-emerald border-slate-950 dark:border-white" 
                    : "bg-transparent border-transparent text-slate-600 hover:text-emerald-400"
                )}
              >
                {t('iqd')}
              </button>
              <button 
                onClick={() => changeMainCurrency('USD')}
                className={cn(
                  "py-3 text-xs font-bold rounded-lg transition-all border-2",
                  mainCurrency === 'USD' 
                    ? "neon-pulse-amber border-slate-950 dark:border-white" 
                    : "bg-transparent border-transparent text-slate-600 hover:text-amber-400"
                )}
              >
                {t('usd')}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm text-slate-700 dark:text-slate-300 font-medium">{t('exchangeRate')}</label>
              <p className="text-[10px] text-slate-950 dark:text-white font-black uppercase tracking-widest">{t('convertNotice')}</p>
            </div>
            <input 
              type="number" 
              value={exchangeRate} 
              onChange={(e) => saveRate(Number(e.target.value))}
              className="w-24 text-center py-2 bg-slate-100 dark:bg-slate-700 rounded-xl font-mono font-bold"
            />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="font-bold border-b border-slate-950 dark:border-white pb-2 flex items-center gap-2">
          <LayoutDashboard size={18} className="text-primary"/> {t('dashboardWidgets')}
        </h3>
        <div className="space-y-3">
          {[
            { key: 'expenses', label: t('showExpenses') },
            { key: 'sulas', label: t('showSulas') },
            { key: 'debts', label: t('showDebts') },
            { key: 'calculator', label: t('showCalculator') }
          ].map(widget => (
            <div key={widget.key} className="flex items-center justify-between">
              <span className="text-sm">{widget.label}</span>
              <button 
                onClick={() => updateWidget(widget.key, !widgets[widget.key])}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  widgets[widget.key] ? "bg-primary" : "bg-slate-300"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                  language === 'ar' ? (widgets[widget.key] ? "right-7" : "right-1") : (widgets[widget.key] ? "left-7" : "left-1")
                )} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="font-bold border-b border-slate-950 dark:border-white pb-2 flex items-center gap-2">
          <SettingsIcon size={18} className="text-primary"/> {t('language')} & {t('theme')}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('language')}</span>
          <button 
            onClick={toggleLanguage}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-600"
          >
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('theme')}</span>
          <button 
            onClick={toggleTheme}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-600"
          >
            {theme === 'light' ? t('dark') : t('light')}
          </button>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="font-bold border-b border-slate-950 dark:border-white pb-2 flex items-center gap-2">
          <CircleDot size={18} className="text-primary"/> {t('securityAndPrivacy')}
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('privacyMode')}</p>
              <p className="text-[10px] text-slate-950 dark:text-white font-black uppercase tracking-widest">{privacyMode ? t('showBalances') : t('hideBalances')}</p>
          </div>
          <button 
            onClick={togglePrivacy}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              privacyMode ? "bg-accent" : "bg-slate-300"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
              language === 'ar' ? (privacyMode ? "right-7" : "right-1") : (privacyMode ? "left-7" : "left-1")
            )} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t('biometrics')}</p>
              <p className="text-[10px] text-slate-950 dark:text-white font-black uppercase tracking-widest">{t('biometricsDesc')}</p>
          </div>
          <button 
            onClick={toggleBiometrics}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              biometrics ? "bg-success" : "bg-slate-300"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
              language === 'ar' ? (biometrics ? "right-7" : "right-1") : (biometrics ? "left-7" : "left-1")
            )} />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-950 dark:border-white">
        <h3 className="font-bold border-b border-slate-950 dark:border-white pb-2 flex items-center gap-2 mb-4">
          <Info size={18} className="text-primary"/> {t('aboutApp')}
        </h3>
        <button 
          onClick={() => (window as any).setActiveTab('about')}
          className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-slate-500 rounded-xl flex items-center justify-center shadow-sm">
              <Heart size={20} className="text-rose-500" />
            </div>
            <span className="font-bold">{t('aboutApp')}</span>
          </div>
          <ChevronLeft size={20} className={cn("text-slate-600", language === 'ar' ? "" : "rotate-180")} />
        </button>
      </div>

      <div className="text-center py-6">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">2.1.0 (PRO)</p>
      </div>
    </div>
  );
};

// --- Localization ---

const translations = {
  ar: {
    dashboard: 'الرئيسية',
    expenses: 'المصاريف',
    sulas: 'السلف والقروض',
    debts: 'الديون',
    settings: 'الإعدادات',
    availableBalance: 'الرصيد المتوفر',
    totalIncome: 'إجمالي الدخل',
    totalExpenses: 'المصاريف',
    overview: 'نظرة عامة',
    debtsIowe: 'ديون بذمتي',
    activeSulas: 'سلف نشطة',
    latestOperations: 'أحدث العمليات',
    noOperations: 'لا توجد عمليات مسجلة حالياً',
    downloadReport: 'تحميل PDF',
    addSula: 'إضافة سلفة',
    sulaName: 'اسم السلفة',
    sulasSub: 'السلف',
    loansSub: 'القروض',
    loanName: 'اسم القرض',
    bankName: 'المصرف / الجهة المانحة',
    loanPrincipal: 'مبلغ القرض',
    totalToRepay: 'المبلغ الذي يجب سداده',
    paidAmountToBank: 'المبلغ الواصل للمصرف',
    remainingAmountToBank: 'المبلغ المتبقي للمصرف',
    recordLoanPayment: 'تسديد دفعة للمصرف',
    loanPaymentHistory: 'سجل المبالغ الواصلة',
    saveLoan: 'حفظ القرض',
    updateLoan: 'تحديث بيانات القرض',
    paymentReceiptNote: 'رقم الوصل / ملاحظة السداد',
    loanPaymentDate: 'تاريخ الدفعة',
    addLoanPaymentTitle: 'تسجيل دفعة مسددة للمصرف',
    noLoans: 'لا توجد قروض مسجلة حالياً. ابدأ بإضافة قرض جديد.',
    popularBanks: 'مصارف شائعة',
    paymentReceipts: 'إيصالات ودفعات السداد للمصرف',
    deletePaymentConfirm: 'هل أنت متأكد من حذف هذه الدفعة؟',
    addLoan: 'إضافة قرض',
    loanDetails: 'تفاصيل القرض',
    paymentAmount: 'مبلغ الدفعة المسددة',
    iAm: 'أنا',
    organizer: 'المنظم',
    member: 'مشترك فقط',
    participantsCount: 'عدد المشتركين',
    participantsNames: 'أسماء المشتركين',
    frequency: 'دورة الدفع',
    monthlyFreq: 'شهرياً',
    biweekly: 'كل 15 يوم',
    customDays: 'عدد أيام مخصص',
    everyXDays: 'كل {days} يوم',
    turnType: 'نوع الدور',
    fixedTurn: 'محدد (مثلاً: 5)',
    lottery: 'قرعة',
    yourTurn: 'تسلسلك',
    totalAmount: 'المبلغ الإجمالي',
    monthlyInstallment: 'القسط الشهري',
    turn: 'دوري (رقم الشهر)',
    startDate: 'تاريخ البدء',
    endDate: 'تاريخ الانتهاء',
    saveSula: 'حفظ السلفة',
    joinedSulas: 'سلف أنت مشترك بها كعضو',
    managedSulas: 'سلف أنت تديرها كمنظم',
    repaymentMethod: 'آلية السداد',
    oneTime: 'دفعة واحدة',
    installments: 'على شكل أقساط',
    twoPayments: 'دفعتين',
    installmentCount: 'عدد الأقساط',
    monthlyRepaymentAmount: 'المبلغ الواجب دفعه شهرياً',
    developer: 'حيدر الهلالي',
    about: 'حول التطبيق',
    dedicationTitle: 'إهداء خاص',
    dedicationText1: 'عملي هذا مهدى إلى نبع الحنان وباب الأمان، إلى من تعبا لنرتاح ومن أعطيا بلا مقابل',
    dedicationText2: 'اللهم احفظ والديّ وارحمهما كما ربياني صغيراً واجعل عملي هذا صدقة جارية لهما',
    cancel: 'إلغاء',
    paidMonths: 'شهر تم دفع',
    payInstallment: 'تسديد قسط هذا الشهر',
    noSulas: 'لا توجد سلف نشطة حالياً. ابدأ بإضافة سلفة جديدة.',
    addExpense: 'إضافة صرف',
    amount: 'المبلغ',
    category: 'الفئة',
    expenseType: 'نوع المصرف',
    variable: 'متغير',
    fixed: 'ثابت',
    date: 'التاريخ',
    notePlaceholder: 'التفاصيل / ملاحظة (مثلاً: صرف علاج)',
    receipt: 'صورة الوصل (اختياري)',
    save: 'حفظ',
    edit: 'تعديل',
    status: 'الحالة',
    paid: 'تم التسديد',
    partiallyPaid: 'تسديد جزئي',
    unpaid: 'لم يتم التسديد',
    paidAmountLabel: 'المبلغ المدفوع تم',
    updateExpense: 'تحديث بيانات الصرف',
    addDebt: 'إضافة دين',
    personName: 'اسم الشخص',
    debtType: 'نوع الدين',
    iOwe: 'عليّ (دين بذمتي)',
    owedToMe: 'لي (عند شخص آخر)',
    dueDate: 'موعد السداد (اختياري)',
    payPart: 'تسديد جزء',
    debtStartDate: 'تاريخ أخذ الدين',
    debtDueDate: 'تاريخ التسديد المتوقع',
    recordPartialPayment: 'تسجيل تسديد جزء',
    partialPaymentAmount: 'مبلغ الدفعة المسددة',
    partialPaymentDate: 'تاريخ السداد',
    paymentNote: 'ملاحظة أو بيان الدفعة (اختياري)',
    confirmPartialPayment: 'تأكيد وحفظ الدفعة',
    settleFullDebt: 'تسديد المبلغ المتبقي بالكامل',
    fullDebtSettledSuccess: 'تم تسديد هذا الدين بالكامل!',
    debtDetailsTitle: 'تفاصيل الدين والسداد',
    repaymentProgress: 'نسبة السداد',
    amountPaidSoFar: 'المبلغ الواصل (المسدد)',
    notes: 'ملاحظات',
    phoneNumber: 'رقم الهاتف',
    notSpecified: 'غير محدد',
    fullySettled: 'مسدد بالكامل',
    partiallySettled: 'جاري السداد',
    unpaidDebt: 'غير مسدد بعد',
    overdueWarning: 'متأخر عن موعد التسديد المحدد',
    deletePaymentWarning: 'هل تريد بالتأكيد حذف هذه الدفعة وإعادة احتساب المتبقي؟',
    quickPayFull: 'كامل المتبقي',
    quickPayHalf: 'نصف المتبقي',
    quickPayQuarter: 'ربع المتبقي',
    remainingAfterPayment: 'المتبقي بعد هذا السداد',
    delete: 'حذف',
    currencyAndExchange: 'المحاسبة والعملة',
    exchangeRate: 'سعر الصرف الحالي (IQD/$)',
    securityAndPrivacy: 'الأمان والخصوصية',
    biometrics: 'قفل البصمة والوجه',
    biometricsDesc: 'تأمين التطبيق باستخدام Biometrics',
    version: 'إصدار التطبيق',
    developedBy: 'تطوير بواسطة',
    currency: 'دينار',
    addIncome: 'إضافة دخل جديد',
    editIncome: 'تعديل بيانات الدخل',
    incomeSource: 'المصدر (مثلاً: راتب)',
    incomeSourcePlaceholder: 'راتب، هدية، عمل حر...',
    incomeHistory: 'سجل الدخل والواردات',
    confirmDelete: 'هل أنت متأكد من حذف هذا السجل؟',
    entries: 'سجلات',
    reportTitle: 'تقرير مالي شهري - حساباتي',
    reportSuccess: 'تم تحميل التقرير بنجاح',
    language: 'اللغة',
    theme: 'المظهر',
    light: 'نهاري',
    dark: 'ليلي',
    cumulativeCalculator: 'الحاسبة التراكمية',
    initialCapital: 'رأس المال الابتدائي',
    roiRate: 'نسبة العائد (%)',
    duration: 'المدة',
    compoundingPeriod: 'نوع الفترة',
    calculate: 'احسب النمو',
    futureValue: 'القيمة المستقبلية',
    totalProfit: 'إجمالي الربح',
    period: 'فترة',
    startingBalance: 'رصيد البداية',
    interestEarned: 'الربح',
    endingBalance: 'الرصيد النهائي',
    daily: 'يومي',
    monthly: 'شهري',
    yearly: 'سنوي',
    hours: 'ساعي',
    chartGrowth: 'رسم بياني للنمو',
    paymentHistory: 'سجل التسديدات',
    remaining: 'المتبقي',
    total: 'المجموع',
    showOnDashboard: 'إظهار في الرئيسية',
    privacyMode: 'وضع الخصوصية',
    amountPaid: 'المبلغ المسدد',
    paymentDate: 'تاريخ التسديد',
    noPayments: 'لا توجد تسديدات بعد',
    dashboardWidgets: 'صناديق الواجهة الرئيسية',
    showExpenses: 'إظهار المصاريف',
    showSulas: 'إظهار السلف',
    showDebts: 'إظهار الديون',
    showCalculator: 'إظهار الحاسبة',
    hideBalances: 'إخفاء المبالغ',
    showBalances: 'إظهار المبالغ',
    mainCurrency: 'العملة الرئيسية للتطبيق',
    usd: 'دولار أمريكي (USD)',
    iqd: 'دينار عراقي (IQD)',
    convertNotice: 'يتم تحويل جميع المبالغ المسجلة بالدينار تلقائياً بناءً على سعر الصرف',
    fixedExpenses: 'مصاريف ثابتة',
    variableExpenses: 'مصاريف متغيرة',
    partialPayment: 'تسديد جزئي',
    remainingAmountLabel: 'المبلغ المتبقي',
    aboutApp: 'حول التطبيق',
    designedBy: 'تم تصميم وتطوير البرنامج بواسطة: حيدر الهلالي',
    dedication: 'أهدي ثواب هذا العمل إلى روح والداي، لا تنساهما بقراءة سورة الفاتحة',
    contactMe: 'تواصل معي',
    whatsappContact: 'تواصل معنا عبر الواتساب لتصميم تطبيقك الخاص',
    appVersion: 'إصدار التطبيق',
    developerInfo: 'معلومات المطور',
    cloudBackup: 'نسخ احتياطي سحابي',
    backupNow: 'نسخ الآن إلى السحاب',
    restoreNow: 'استعادة البيانات',
    backupSuccess: 'تم النسخ الاحتياطي بنجاح',
    restoreSuccess: 'تمت استعادة البيانات بنجاح',
    loginWithGoogle: 'تسجيل الدخول عبر Google',
    logout: 'تسجيل الخروج',
    backupDesc: 'احتفظ ببياناتك آمنة في السحاب واستعدها في أي وقت عبر بريدك الإلكتروني',
    smartPlanner: 'المخطط الذكي',
    priorityFixed: 'المصاريف الثابتة (أولوية قصوى)',
    priorityDebts: 'الديون المستحقة (أولوية ثانية)',
    priorityVariable: 'المصاريف المتغيرة',
    suggestedAllocation: 'التوزيع المقترح للمحفظة',
    totalNeeds: 'إجمالي الاحتياجات',
    surplus: 'الفائض',
    deficit: 'العجز',
    remainingAfterFixed: 'المتبقي بعد الثابتة',
    remainingAfterDebts: 'المتبقي بعد الديون',
    plannerDesc: 'تحليل ذكي لتوزيع دخلك بناءً على الأولويات (ثوابت -> ديون -> متغيرات)',
    smartPlanning: 'تخطيط ذكي',
    achieved: 'تم الإنجاز',
    days: 'أيام',
    appName: 'حساباتي الذكي'
  },
  en: {
    dashboard: 'Dashboard',
    expenses: 'Expenses',
    sulas: 'Sulas & Loans',
    debts: 'Debts',
    settings: 'Settings',
    availableBalance: 'Available Balance',
    totalIncome: 'Total Income',
    totalExpenses: 'Expenses',
    overview: 'Overview',
    debtsIowe: 'Depts I Owe',
    activeSulas: 'Active Sulas',
    latestOperations: 'Latest Operations',
    noOperations: 'No transactions recorded',
    downloadReport: 'Download PDF',
    addSula: 'Add Sula',
    sulaName: 'Sula Name',
    sulasSub: 'Sulas',
    loansSub: 'Loans',
    loanName: 'Loan Name',
    bankName: 'Bank / Lender',
    loanPrincipal: 'Loan Amount (Principal)',
    totalToRepay: 'Total Repayment Amount',
    paidAmountToBank: 'Amount Paid to Bank',
    remainingAmountToBank: 'Remaining Balance',
    recordLoanPayment: 'Pay Installment',
    loanPaymentHistory: 'Payment Receipts',
    saveLoan: 'Save Loan',
    updateLoan: 'Update Loan Details',
    paymentReceiptNote: 'Receipt # / Payment Note',
    loanPaymentDate: 'Payment Date',
    addLoanPaymentTitle: 'Record Payment to Bank',
    noLoans: 'No loans recorded yet. Start by adding a new loan.',
    popularBanks: 'Popular Banks',
    paymentReceipts: 'Payment Receipts to Bank',
    deletePaymentConfirm: 'Are you sure you want to delete this payment?',
    addLoan: 'Add Loan',
    loanDetails: 'Loan Details',
    paymentAmount: 'Payment Amount',
    iAm: 'I am',
    organizer: 'Organizer',
    member: 'Member Only',
    participantsCount: 'Number of Participants',
    participantsNames: 'Participant Names',
    frequency: 'Payment Cycle',
    monthlyFreq: 'Monthly',
    biweekly: 'Every 15 Days',
    customDays: 'Custom Days',
    everyXDays: 'Every {days} Days',
    turnType: 'Turn Type',
    fixedTurn: 'Fixed (e.g. 5)',
    lottery: 'Lottery',
    yourTurn: 'Your Turn',
    totalAmount: 'Total Amount',
    monthlyInstallment: 'Monthly Installment',
    turn: 'My Turn (Month #)',
    startDate: 'Start Date',
    endDate: 'End Date',
    saveSula: 'Save Sula',
    joinedSulas: 'Joined Sulas',
    managedSulas: 'Managed Sulas',
    repaymentMethod: 'Repayment Method',
    oneTime: 'One-time Payment',
    installments: 'Installments',
    twoPayments: 'Two Payments',
    installmentCount: 'Installment Count',
    monthlyRepaymentAmount: 'Monthly Repayment Amount',
    developer: 'Haider Al-Hilali',
    about: 'About App',
    dedicationTitle: 'Special Dedication',
    dedicationText1: 'This work is dedicated to the source of tenderness and the door of safety, to those who toiled for our comfort and gave without return.',
    dedicationText2: 'O Allah, protect my parents and have mercy on them as they raised me when I was small, and make this work a continuous charity for them.',
    cancel: 'Cancel',
    paidMonths: 'Months Paid',
    payInstallment: 'Pay this month',
    noSulas: 'No active sulas. Start by adding a new one.',
    addExpense: 'Add Expense',
    amount: 'Amount',
    category: 'Category',
    expenseType: 'Type',
    variable: 'Variable',
    fixed: 'Fixed',
    date: 'Date',
    notePlaceholder: 'Details / Note (e.g. Medicine)',
    receipt: 'Receipt Image (Optional)',
    save: 'Save',
    edit: 'Edit',
    status: 'Status',
    paid: 'Paid',
    partiallyPaid: 'Partially Paid',
    unpaid: 'Unpaid',
    paidAmountLabel: 'Paid Amount',
    updateExpense: 'Update Expense',
    addDebt: 'Add Debt',
    personName: 'Person Name',
    debtType: 'Type',
    iOwe: 'I Owe',
    owedToMe: 'Owed to Me',
    dueDate: 'Due Date (Optional)',
    payPart: 'Pay Part',
    debtStartDate: 'Debt Taken Date',
    debtDueDate: 'Expected Repayment Date',
    recordPartialPayment: 'Record Partial Payment',
    partialPaymentAmount: 'Payment Amount',
    partialPaymentDate: 'Payment Date',
    paymentNote: 'Payment Note / Reference (Optional)',
    confirmPartialPayment: 'Confirm Payment',
    settleFullDebt: 'Settle Remaining in Full',
    fullDebtSettledSuccess: 'Debt has been settled in full!',
    debtDetailsTitle: 'Debt & Repayment Details',
    repaymentProgress: 'Repayment Progress',
    amountPaidSoFar: 'Total Paid So Far',
    notes: 'Notes',
    phoneNumber: 'Phone Number',
    notSpecified: 'Not specified',
    fullySettled: 'Fully Settled',
    partiallySettled: 'In Progress',
    unpaidDebt: 'Unpaid',
    overdueWarning: 'Past expected repayment date',
    deletePaymentWarning: 'Are you sure you want to delete this payment and recalculate the remaining balance?',
    quickPayFull: 'Full Remaining',
    quickPayHalf: '50% of Remaining',
    quickPayQuarter: '25% of Remaining',
    remainingAfterPayment: 'Remaining after this payment',
    delete: 'Delete',
    currencyAndExchange: 'Accounting & Currency',
    exchangeRate: 'Current Exchange Rate (IQD/$)',
    securityAndPrivacy: 'Security & Privacy',
    biometrics: 'Biometric Lock',
    biometricsDesc: 'Secure app using Fingerprint/FaceID',
    version: 'App Version',
    developedBy: 'Developed by',
    currency: 'IQD',
    addIncome: 'Add New Income',
    editIncome: 'Edit Income Entry',
    incomeSource: 'Source (e.g. Salary)',
    incomeSourcePlaceholder: 'Salary, Gift, Freelance...',
    incomeHistory: 'Income History',
    confirmDelete: 'Are you sure you want to delete this entry?',
    entries: 'Entries',
    reportTitle: 'Monthly Financial Report - Hesabati',
    reportSuccess: 'Report downloaded successfully',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    cumulativeCalculator: 'Calculator',
    initialCapital: 'Initial Capital',
    roiRate: 'ROI Rate (%)',
    duration: 'Duration',
    compoundingPeriod: 'Period Type',
    calculate: 'Calculate Growth',
    futureValue: 'Future Value',
    totalProfit: 'Total Profit',
    period: 'Period',
    startingBalance: 'Starting',
    interestEarned: 'Profit',
    endingBalance: 'Ending',
    daily: 'Daily',
    monthly: 'Monthly',
    yearly: 'Yearly',
    hours: 'Hourly',
    chartGrowth: 'Growth Chart',
    paymentHistory: 'Payment History',
    remaining: 'Remaining',
    total: 'Total',
    showOnDashboard: 'Show on Dashboard',
    privacyMode: 'Privacy Mode',
    amountPaid: 'Amount Paid',
    paymentDate: 'Payment Date',
    noPayments: 'No payments yet',
    dashboardWidgets: 'Dashboard Widgets',
    showExpenses: 'Show Expenses',
    showSulas: 'Show Sulas',
    showDebts: 'Show Debts',
    showCalculator: 'Show Calculator',
    hideBalances: 'Hide Balances',
    showBalances: 'Show Balances',
    mainCurrency: 'Primary Currency',
    usd: 'US Dollar (USD)',
    iqd: 'Iraqi Dinar (IQD)',
    convertNotice: 'All amounts registered in IQD are automatically converted based on the exchange rate',
    fixedExpenses: 'Fixed Expenses',
    variableExpenses: 'Variable Expenses',
    partialPayment: 'Partial Payment',
    remainingAmountLabel: 'Remaining Amount',
    aboutApp: 'About App',
    designedBy: 'Designed and Developed by: Haider Al-Hilali',
    dedication: 'I dedicate the reward of this work to the souls of my parents, do not forget them by reading Surah Al-Fatiha',
    contactMe: 'Contact Me',
    whatsappContact: 'Contact us via WhatsApp to design your own app',
    appVersion: 'App Version',
    developerInfo: 'Developer Info',
    cloudBackup: 'Cloud Backup',
    backupNow: 'Backup Now to Cloud',
    restoreNow: 'Restore Data',
    backupSuccess: 'Backup successful',
    restoreSuccess: 'Data restored successfully',
    loginWithGoogle: 'Login with Google',
    logout: 'Logout',
    backupDesc: 'Keep your data safe in the cloud and restore anytime via your email',
    smartPlanner: 'Smart Planner',
    priorityFixed: 'Fixed Expenses (High Priority)',
    priorityDebts: 'Due Debts (Secondary Priority)',
    priorityVariable: 'Variable Expenses',
    suggestedAllocation: 'Suggested Wallet Distribution',
    totalNeeds: 'Total Needs',
    surplus: 'Surplus',
    deficit: 'Deficit',
    remainingAfterFixed: 'Remaining after Fixed',
    remainingAfterDebts: 'Remaining after Debts',
    plannerDesc: 'Smart analysis to distribute your income based on priorities (Fixed -> Debts -> Variables)',
    smartPlanning: 'Smart Planning',
    achieved: 'Achieved',
    days: 'Days',
    appName: 'Smart Hesabati'
  }
};

// --- Side Menu Component ---
const SideMenu = ({ t, language, activeTab, setActiveTab, setIsMenuOpen, setShowAbout }: { t: any, language: string, activeTab: string, setActiveTab: (t: any) => void, setIsMenuOpen: (o: boolean) => void, setShowAbout: (s: boolean) => void }) => {
  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, color: 'text-blue-500' },
    { id: 'planner', label: t('smartPlanning'), icon: Calculator, color: 'text-indigo-500' },
    { id: 'sulas', label: t('sulas'), icon: Wallet, color: 'text-emerald-500' },
    { id: 'loans', label: language === 'ar' ? 'القروض' : 'Loans', icon: TrendingUp, color: 'text-indigo-500' },
    { id: 'debts', label: t('debts'), icon: HandCoins, color: 'text-amber-500' },
    { id: 'expenses', label: t('expenses'), icon: ArrowDownCircle, color: 'text-rose-500' },
  ];

  return (
    <div className={cn(
      "fixed inset-0 z-0 bg-gradient-to-br from-[#0a192f] via-[#112240] to-blue-900 flex",
      language === 'ar' ? "justify-end text-right" : "justify-start text-left"
    )}>
      <div className="flex flex-col w-[260px] sm:w-64 h-full justify-between py-10 px-6">
        <div className="space-y-8">
          <div className="flex flex-col gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl">
              <Wallet className="text-blue-500" size={28} />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tighter">{language === 'ar' ? 'حساباتي' : 'Hesabati'}</h2>
            <p className="text-[9px] text-blue-300/40 font-black uppercase tracking-[0.3em]">Smart Finance Manager</p>
          </div>

          <nav className="space-y-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setIsMenuOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 group touch-manipulation",
                  activeTab === item.id 
                    ? "bg-white text-blue-900 shadow-[0_15px_40px_rgba(30,58,138,0.3)] scale-[1.02]" 
                    : "text-blue-100/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon size={20} className={cn(activeTab === item.id ? "text-blue-900" : item.color)} />
                <span className="font-black text-xs uppercase tracking-tighter">{item.label}</span>
              </button>
            ))}
            
            <button
              onClick={() => { setShowAbout(true); setIsMenuOpen(false); }}
              className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 text-blue-100/60 hover:bg-white/5 hover:text-white touch-manipulation"
            >
              <Heart size={20} className="text-rose-400" />
              <span className="font-black text-xs uppercase tracking-tighter">{t('about')}</span>
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 group">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-[14px] bg-gradient-to-tr from-emerald-500 to-blue-500 p-[1px]">
                <div className="w-full h-full rounded-[13px] bg-[#0a192f] flex items-center justify-center">
                  <UserIcon className="text-white" size={16} />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0a192f] flex items-center justify-center">
                <Check size={8} className="text-white" />
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[8px] text-blue-300/40 font-black uppercase tracking-widest leading-none mb-1">{language === 'ar' ? 'تصميم وتطوير' : 'Developed By'}</p>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-black text-white text-xs whitespace-nowrap overflow-hidden text-ellipsis">{language === 'ar' ? 'حيدر الهلالي' : 'Haider Al-Hilali'}</h3>
                <a 
                  href="https://wa.me/9647800000000" 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all flex-shrink-0"
                >
                  <MessageCircle size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'sulas' | 'loans' | 'debts' | 'settings' | 'calculator' | 'about' | 'account' | 'planner'>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState<{ id: number; type: 'income' | 'expense' | 'sula' | 'debt'; callback?: () => void } | null>(null);

  const confirmDelete = async () => {
    if (!deleteConfig) return;
    
    try {
      if (deleteConfig.type === 'income') await db.incomes.delete(deleteConfig.id);
      else if (deleteConfig.type === 'expense') await db.expenses.delete(deleteConfig.id);
      else if (deleteConfig.type === 'sula') await db.sulas.delete(deleteConfig.id);
      else if (deleteConfig.type === 'debt') await db.debts.delete(deleteConfig.id);
      
      if (deleteConfig.callback) deleteConfig.callback();
    } catch (error) {
      console.error(`Failed to delete ${deleteConfig.type}:`, error);
    } finally {
      setShowDeleteModal(false);
      setDeleteConfig(null);
    }
  };

  const requestDelete = (id: number, type: 'income' | 'expense' | 'sula' | 'debt', callback?: () => void) => {
    setDeleteConfig({ id, type, callback });
    setShowDeleteModal(true);
  };
  
  // Expose setActiveTab for deep linking from Settings
  useEffect(() => {
    (window as any).setActiveTab = setActiveTab;

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [privacyMode, setPrivacyMode] = useState(false);
  const [mainCurrency, setMainCurrency] = useState<'IQD' | 'USD'>('IQD');
  const [exchangeRate, setExchangeRate] = useState(1530);
  const [widgets, setWidgets] = useState({
    expenses: true,
    sulas: true,
    debts: true,
    calculator: false
  });

  const t = (key: keyof typeof translations.ar) => (translations[language] as any)[key] || key;

  const formatAmount = (amountIQD: number) => {
    if (mainCurrency === 'USD') {
      const usd = amountIQD / exchangeRate;
      return usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    return Math.round(amountIQD).toLocaleString('en-US');
  };

  const getCurrencyLabel = () => {
    return mainCurrency === 'USD' ? '$' : (language === 'ar' ? 'د.ع' : 'IQD');
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Seed initial settings if needed
  useEffect(() => {
    db.settings.get('exchange_rate').then(e => {
      if (!e) db.settings.add({ id: 'exchange_rate', value: 1530 });
      else setExchangeRate(e.value);
    });
    db.settings.get('main_currency').then(c => c && setMainCurrency(c.value));
    db.settings.get('language').then(l => l && setLanguage(l.value));
    db.settings.get('theme').then(t => t && setTheme(t.value));
    db.settings.get('privacy_mode').then(p => p && setPrivacyMode(p.value));
    db.settings.get('dashboard_widgets').then(w => w && setWidgets(w.value));
    db.settings.get('last_sync').then(s => s && setLastSync(s.value));
  }, []);

  // Effect to suggest sync on login if local data is empty
  useEffect(() => {
    if (user) {
      // Check if local data is sparse
      Promise.all([
        db.incomes.count(),
        db.expenses.count(),
        db.sulas.count(),
        db.debts.count()
      ]).then(([inc, exp, sula, debt]) => {
        const totalItems = inc + exp + sula + debt;
        if (totalItems === 0 && !lastSync) {
          // New login, maybe suggest restore
          setActiveTab('settings');
        }
      });
    }
  }, [user]);

  const toggleLanguage = () => {
    const next = language === 'ar' ? 'en' : 'ar';
    setLanguage(next);
    db.settings.put({ id: 'language', value: next });
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    db.settings.put({ id: 'theme', value: next });
  };

  const togglePrivacy = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    db.settings.put({ id: 'privacy_mode', value: next });
  };

  const updateWidget = (key: keyof typeof widgets, val: boolean) => {
    const next = { ...widgets, [key]: val };
    setWidgets(next);
    db.settings.put({ id: 'dashboard_widgets', value: next });
  };

  const changeMainCurrency = (cur: 'IQD' | 'USD') => {
    setMainCurrency(cur);
    db.settings.put({ id: 'main_currency', value: cur });
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 selection:bg-emerald-500/30 selection:text-emerald-900 overflow-hidden relative perspective-1000",
      theme === 'dark' ? "bg-[#0a192f]" : "bg-slate-300"
    )}>
      <style>{`
        .perspective-1000 {
          perspective: 2000px;
        }
      `}</style>
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-xs p-8 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-2 border-slate-950 dark:border-white text-center"
            >
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-950 dark:text-white mb-2">{t('confirmDelete')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium italic">{language === 'ar' ? 'هذا الإجراء نهائي ولا يمكن التراجع عنه.' : 'This action is final and cannot be undone.'}</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDelete}
                  className="w-full py-4 font-black text-white bg-rose-600 rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                >
                  {t('delete')}
                </button>
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full py-4 font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  {t('cancel')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "min-h-screen relative z-10 flex flex-col transition-colors duration-300",
          theme === 'dark' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"
        )}
      >
        <header className="h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 z-[60] flex items-center justify-between px-5 text-slate-900 dark:text-white transition-all sticky top-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center relative hover:scale-105 active:scale-95 transition-all group overflow-hidden border border-slate-200 dark:border-slate-700"
              aria-label="Toggle Menu"
            >
              <div className="flex flex-col gap-1.5 items-center justify-center w-full h-full">
                <span className={cn("h-[2px] w-5 bg-slate-700 dark:bg-slate-200 rounded-full transition-all", isMenuOpen && "rotate-45 translate-y-[8px]")} />
                <span className={cn("h-[2px] w-4 bg-slate-700 dark:bg-slate-200 rounded-full transition-all", isMenuOpen && "opacity-0 scale-0")} />
                <span className={cn("h-[2px] w-5 bg-slate-700 dark:bg-slate-200 rounded-full transition-all", isMenuOpen && "-rotate-45 -translate-y-[8px]")} />
              </div>
            </button>
            <h1 className="font-black text-lg sm:text-xl italic neon-emerald truncate max-w-[120px] sm:max-w-none">{t('appName')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <PWAInstallButton language={language} variant="button" />
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold border border-slate-200 dark:border-slate-700"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold border border-slate-200 dark:border-slate-700"
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </header>

        {/* Dropdown Menu (القائمة المنسدلة بدون تحريك الشاشة) */}
        <AnimatePresence>
          {isMenuOpen && (
            <MenuDropdown
              isOpen={isMenuOpen}
              onClose={() => setIsMenuOpen(false)}
              user={user}
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab as any);
                setIsMenuOpen(false);
              }}
              language={language}
              t={t}
            />
          )}
        </AnimatePresence>

      <main className="container max-w-2xl mx-auto pt-4 pb-32 px-4 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <Dashboard t={t} language={language} privacyMode={privacyMode} togglePrivacy={togglePrivacy} widgets={widgets} formatAmount={formatAmount} getCurrencyLabel={getCurrencyLabel} setActiveTab={setActiveTab} requestDelete={requestDelete} />}
            {activeTab === 'planner' && <SmartPlanner t={t} language={language} formatAmount={formatAmount} getCurrencyLabel={getCurrencyLabel} />}
            {activeTab === 'expenses' && <ExpenseManager t={t} language={language} widgets={widgets} updateWidget={updateWidget} formatAmount={formatAmount} getCurrencyLabel={getCurrencyLabel} requestDelete={requestDelete} />}
            {(activeTab === 'sulas' || activeTab === 'loans') && <SulaManager t={t} language={language} widgets={widgets} updateWidget={updateWidget} formatAmount={formatAmount} getCurrencyLabel={getCurrencyLabel} requestDelete={requestDelete} />}
            {activeTab === 'debts' && <DebtManager t={t} language={language} isHidden={privacyMode} widgets={widgets} updateWidget={updateWidget} formatAmount={formatAmount} getCurrencyLabel={getCurrencyLabel} requestDelete={requestDelete} />}
            {activeTab === 'calculator' && <CumulativeCalculator t={t} language={language} widgets={widgets} updateWidget={updateWidget} />}
            {activeTab === 'about' && <AboutApp t={t} language={language} onBack={() => setActiveTab('settings')} />}
            {activeTab === 'account' && (
              <AccountDetails
                user={user}
                language={language}
                t={t}
                lastSync={lastSync}
                setLastSync={setLastSync}
                onBack={() => setActiveTab('dashboard')}
              />
            )}
            {activeTab === 'settings' && (
              <Settings 
                t={t} 
                language={language} 
                toggleLanguage={toggleLanguage}
                theme={theme}
                toggleTheme={toggleTheme}
                widgets={widgets}
                updateWidget={updateWidget}
                privacyMode={privacyMode}
                togglePrivacy={togglePrivacy}
                mainCurrency={mainCurrency}
                changeMainCurrency={changeMainCurrency}
                user={user}
                lastSync={lastSync}
                setLastSync={setLastSync}
                formatAmount={formatAmount}
                getCurrencyLabel={getCurrencyLabel}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

        <motion.nav 
          className="fixed bottom-0 inset-x-0 h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800 px-4 flex items-center z-[55] shadow-[0_-5px_25px_rgba(0,0,0,0.05)]"
        >
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-2 rounded-[32px] border border-slate-200 dark:border-slate-700">
            <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label={t('dashboard')} neonClass="neon-blue" />
            <NavButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={Wallet} label={t('expenses')} neonClass="neon-pink" />
            <NavButton active={activeTab === 'sulas'} onClick={() => setActiveTab('sulas')} icon={TrendingUp} label={t('sulas')} neonClass="neon-emerald" />
            <NavButton active={activeTab === 'debts'} onClick={() => setActiveTab('debts') } icon={HandCoins} label={t('debts')} neonClass="neon-red" />
            <NavButton active={activeTab === 'calculator'} onClick={() => setActiveTab('calculator')} icon={Calculator} label={t('cumulativeCalculator')} neonClass="neon-indigo" />
            <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={SettingsIcon} label={t('settings')} neonClass="neon-amber" />
          </div>
        </motion.nav>
      </div>

      {/* About Modal (Glassmorphism) */}
      <AnimatePresence>
        {showAbout && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#0a192f]/60 backdrop-blur-md"
            onClick={() => setShowAbout(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/20 blur-3xl -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl translate-x-1/2 translate-y-1/2" />
              
              <div className="w-20 h-20 bg-white/10 rounded-3xl mx-auto flex items-center justify-center border border-white/20 mb-6 group hover:rotate-12 transition-transform">
                <Heart className="text-emerald-400 fill-emerald-400 animate-pulse" size={40} />
              </div>
              
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">{t('aboutApp')}</h2>
              <p className="text-blue-200/60 font-bold mb-8 uppercase tracking-[0.2em] text-[10px]">{language === 'ar' ? 'حيدر الهلالي' : 'Haider Al-Hilali'} • {t('dedicationTitle')}</p>
              
              <div className="space-y-6 text-xl leading-relaxed text-blue-50 font-medium tracking-tight">
                <p className="italic opacity-80">"{t('dedicationText1')}"</p>
                <div className="w-12 h-1 bg-white/10 mx-auto rounded-full" />
                <p className="text-emerald-400 font-bold text-2xl">{t('dedicationText2')}</p>
              </div>

              <button 
                onClick={() => setShowAbout(false)}
                className="mt-12 w-full py-4 bg-white text-blue-900 font-black rounded-3xl hover:bg-emerald-400 hover:text-white transition-all shadow-xl shadow-blue-950/20"
              >
                {language === 'ar' ? 'آمين' : 'Amen'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
