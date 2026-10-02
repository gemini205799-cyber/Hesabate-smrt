import React, { useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  HandCoins, 
  TrendingUp, 
  Calculator, 
  ArrowDownCircle, 
  Settings as SettingsIcon, 
  Heart, 
  User as UserIcon, 
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { type User } from 'firebase/auth';
import { motion } from 'motion/react';

interface MenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  language: string;
  t: (key: any) => string;
}

export const MenuDropdown: React.FC<MenuDropdownProps> = ({
  isOpen,
  onClose,
  user,
  activeTab,
  onSelectTab,
  language,
  t
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAr = language === 'ar';

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, color: 'text-blue-500' },
    { id: 'planner', label: t('smartPlanning'), icon: Calculator, color: 'text-indigo-500' },
    { id: 'sulas', label: t('sulas'), icon: Wallet, color: 'text-emerald-500' },
    { id: 'loans', label: isAr ? 'القروض' : 'Loans', icon: TrendingUp, color: 'text-blue-500' },
    { id: 'debts', label: t('debts'), icon: HandCoins, color: 'text-rose-500' },
    { id: 'expenses', label: t('expenses'), icon: ArrowDownCircle, color: 'text-pink-500' },
    { id: 'calculator', label: t('cumulativeCalculator'), icon: Calculator, color: 'text-indigo-500' },
    { id: 'settings', label: t('settings'), icon: SettingsIcon, color: 'text-amber-500' },
    { id: 'about', label: t('about'), icon: Heart, color: 'text-rose-400' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Dropdown Menu Container */}
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`fixed top-16 ${isAr ? 'right-4 sm:right-6' : 'left-4 sm:left-6'} z-[70] w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-white`}
      >
        {/* FIRST OPTION: ACCOUNT (اسم مستخدم الحساب وتفاصيل الحساب) */}
        <div className="p-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white">
          <button
            onClick={() => {
              onSelectTab('account');
              onClose();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all border border-white/20 text-white group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-11 h-11 rounded-xl border-2 border-white/50 object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/30">
                  <UserIcon size={22} />
                </div>
              )}
              <div className="text-right flex-1 truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
                    {isAr ? 'الحساب' : 'Account'}
                  </span>
                  {user && (
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <p className="text-sm font-black text-white truncate">
                  {user ? (user.displayName || user.email) : (isAr ? 'تسجيل الدخول / الحساب' : 'Sign In / Account')}
                </p>
                <p className="text-[10px] text-blue-100 font-bold opacity-80 truncate">
                  {isAr ? 'اضغط لفتح تفاصيل الحساب' : 'Click for account details'}
                </p>
              </div>
            </div>
            <div className="text-white/80 group-hover:text-white transition-colors shrink-0">
              {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </div>
          </button>
        </div>

        {/* NAVIGATION ITEMS */}
        <div className="p-2 max-h-[60vh] overflow-y-auto space-y-1">
          {menuItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-black' 
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-xl ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 ' + item.color}`}>
                    <item.icon size={16} />
                  </div>
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[10px] text-slate-500 font-black">
            {isAr ? 'حساباتي - إدارة الشؤون المالية' : 'Smart Hesabati Finance'}
          </p>
        </div>
      </motion.div>
    </>
  );
};
