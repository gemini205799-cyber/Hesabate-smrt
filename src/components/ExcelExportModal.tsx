import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  X, 
  Check, 
  Calendar, 
  Sparkles,
  Layers,
  Settings2,
  Filter,
  Wallet, 
  ArrowUpCircle, 
  HandCoins, 
  Landmark, 
  TrendingUp, 
  PieChart,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Income, type Expense, type Sula, type Debt } from '../db';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'ar' | 'en';
  formatAmount: (n: number) => string;
  getCurrencyLabel: () => string;
  initialTab?: 'expenses' | 'incomes' | 'debts' | 'loans' | 'sulas' | 'summary' | 'all';
  inline?: boolean;
}

type DateRangeType = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom';

interface ColumnOption {
  key: string;
  labelAr: string;
  labelEn: string;
}

interface SectionConfig {
  id: 'expenses' | 'incomes' | 'debts' | 'loans' | 'sulas';
  titleAr: string;
  titleEn: string;
  icon: any;
  color: string;
  badgeColor: string;
  columns: ColumnOption[];
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'expenses',
    titleAr: 'المصروفات',
    titleEn: 'Expenses',
    icon: Wallet,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
    badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    columns: [
      { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' },
      { key: 'category', labelAr: 'الفئة / البند', labelEn: 'Category' },
      { key: 'type', labelAr: 'نوع المصرف (ثابت/متغير)', labelEn: 'Type (Fixed/Variable)' },
      { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
      { key: 'status', labelAr: 'حالة التسديد', labelEn: 'Status' },
      { key: 'paidAmount', labelAr: 'المبلغ المسدد', labelEn: 'Paid Amount' },
      { key: 'remaining', labelAr: 'المبلغ المتبقي', labelEn: 'Remaining Amount' },
      { key: 'currency', labelAr: 'العملة', labelEn: 'Currency' },
      { key: 'note', labelAr: 'الملاحظات / التفاصيل', labelEn: 'Notes / Details' }
    ]
  },
  {
    id: 'incomes',
    titleAr: 'الدخل والأرباح',
    titleEn: 'Income & Revenue',
    icon: ArrowUpCircle,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    columns: [
      { key: 'amount', labelAr: 'المبلغ', labelEn: 'Amount' },
      { key: 'category', labelAr: 'مصدر الدخل', labelEn: 'Income Source' },
      { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
      { key: 'currency', labelAr: 'العملة', labelEn: 'Currency' },
      { key: 'note', labelAr: 'الملاحظات', labelEn: 'Notes' }
    ]
  },
  {
    id: 'loans',
    titleAr: 'القروض المصرفية',
    titleEn: 'Bank Loans',
    icon: Landmark,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    columns: [
      { key: 'name', labelAr: 'اسم القرض', labelEn: 'Loan Name' },
      { key: 'bank', labelAr: 'المصرف / الجهة المانحة', labelEn: 'Bank / Lender' },
      { key: 'loanAmount', labelAr: 'مبلغ القرض (الأصل)', labelEn: 'Principal Amount' },
      { key: 'totalToRepay', labelAr: 'المبلغ الذي يجب سداده', labelEn: 'Total To Repay' },
      { key: 'paidAmount', labelAr: 'المبلغ الواصل للمصرف', labelEn: 'Amount Paid to Bank' },
      { key: 'remainingPrincipal', labelAr: 'المبلغ المتبقي (مبلغ القرض - الواصل)', labelEn: 'Remaining Principal' },
      { key: 'remainingAmount', labelAr: 'المتبقي الكلي المطلوب سداده', labelEn: 'Remaining Balance' },
      { key: 'progress', labelAr: 'نسبة السداد %', labelEn: 'Repayment %' },
      { key: 'monthlyInstallment', labelAr: 'القسط الشهري', labelEn: 'Monthly Installment' },
      { key: 'status', labelAr: 'حالة القرض', labelEn: 'Loan Status' },
      { key: 'startDate', labelAr: 'تاريخ البدء', labelEn: 'Start Date' },
      { key: 'endDate', labelAr: 'تاريخ الانتهاء', labelEn: 'End Date' },
      { key: 'paymentsCount', labelAr: 'عدد الدفعات الواصلة', labelEn: 'Payments Count' }
    ]
  },
  {
    id: 'debts',
    titleAr: 'الديون (بذمتي واطلبها)',
    titleEn: 'Debts & Liabilities',
    icon: HandCoins,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    columns: [
      { key: 'personName', labelAr: 'اسم الشخص / الجهة', labelEn: 'Person / Entity' },
      { key: 'type', labelAr: 'نوع الدين (بذمتي / اطلبه)', labelEn: 'Debt Type' },
      { key: 'amount', labelAr: 'أصل مبلغ الدين', labelEn: 'Original Amount' },
      { key: 'paidAmount', labelAr: 'المبلغ المسدد', labelEn: 'Amount Paid' },
      { key: 'remainingAmount', labelAr: 'المبلغ المتبقي', labelEn: 'Remaining Balance' },
      { key: 'repaymentMethod', labelAr: 'آلية السداد', labelEn: 'Repayment Method' },
      { key: 'dueDate', labelAr: 'موعد السداد', labelEn: 'Due Date' },
      { key: 'createdAt', labelAr: 'تاريخ التسجيل', labelEn: 'Created Date' }
    ]
  },
  {
    id: 'sulas',
    titleAr: 'السلف المالية',
    titleEn: 'Financial Sulas',
    icon: TrendingUp,
    color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900',
    badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    columns: [
      { key: 'name', labelAr: 'اسم السلفة', labelEn: 'Sula Name' },
      { key: 'role', labelAr: 'دورك (عضو / منظم)', labelEn: 'Role' },
      { key: 'totalAmount', labelAr: 'المبلغ الإجمالي', labelEn: 'Total Amount' },
      { key: 'monthlyInstallment', labelAr: 'القسط الشهري', labelEn: 'Monthly Installment' },
      { key: 'participantsCount', labelAr: 'عدد المشتركين', labelEn: 'Participants' },
      { key: 'turn', labelAr: 'رقم دورك', labelEn: 'Your Turn' },
      { key: 'paidMonths', labelAr: 'الأشهر المسددة', labelEn: 'Months Paid' },
      { key: 'totalPaid', labelAr: 'إجمالي ما دفعته', labelEn: 'Total Paid' },
      { key: 'frequency', labelAr: 'دورة الدفع', labelEn: 'Payment Cycle' },
      { key: 'startDate', labelAr: 'تاريخ البدء', labelEn: 'Start Date' },
      { key: 'status', labelAr: 'الحالة', labelEn: 'Status' }
    ]
  }
];

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  language,
  formatAmount,
  getCurrencyLabel,
  initialTab = 'all',
  inline = true
}) => {
  const isAr = language === 'ar';

  // Live queries to show counts & fetch data
  const allExpenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const allIncomes = useLiveQuery(() => db.incomes.toArray()) || [];
  const allDebts = useLiveQuery(() => db.debts.toArray()) || [];
  const allSulas = useLiveQuery(() => db.sulas.toArray()) || [];

  const loansList = allSulas.filter(s => s.type === 'loan');
  const sulasList = allSulas.filter(s => (s.type || 'sula') === 'sula');

  // Currently focused tab in the interactive inspector
  const [activeTab, setActiveTab] = useState<string>(
    initialTab === 'all' ? 'expenses' : initialTab
  );

  // Selected sections
  const [selectedSections, setSelectedSections] = useState<{ [key: string]: boolean }>({
    expenses: true,
    incomes: true,
    debts: true,
    loans: true,
    sulas: true
  });

  // Selected columns per section
  const [selectedColumns, setSelectedColumns] = useState<{ [sectionId: string]: { [colKey: string]: boolean } }>({
    expenses: { amount: true, category: true, type: true, date: true, status: true, paidAmount: true, remaining: true, currency: true, note: true },
    incomes: { amount: true, category: true, date: true, currency: true, note: true },
    loans: { name: true, bank: true, loanAmount: true, totalToRepay: true, paidAmount: true, remainingPrincipal: true, remainingAmount: true, progress: true, monthlyInstallment: true, status: true, startDate: true, endDate: true, paymentsCount: true },
    debts: { personName: true, type: true, amount: true, paidAmount: true, remainingAmount: true, repaymentMethod: true, dueDate: true, createdAt: true },
    sulas: { name: true, role: true, totalAmount: true, monthlyInstallment: true, participantsCount: true, turn: true, paidMonths: true, totalPaid: true, frequency: true, startDate: true, status: true }
  });

  // Date Range Filtering
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Professional Ideas & Options
  const [includeExecutiveSummary, setIncludeExecutiveSummary] = useState(true);
  const [includeSummaryRow, setIncludeSummaryRow] = useState(true);
  const [separateSheets, setSeparateSheets] = useState(true);
  const [debtFilter, setDebtFilter] = useState<'all' | 'owe' | 'owed'>('all');
  const [enableRTL, setEnableRTL] = useState(true);

  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  // Toggle whole section
  const toggleSection = (sectionId: string) => {
    setSelectedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Toggle specific column in a section
  const toggleColumn = (sectionId: string, colKey: string) => {
    setSelectedColumns(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [colKey]: !prev[sectionId]?.[colKey]
      }
    }));
  };

  // Select / Deselect all columns in section
  const setAllColumnsInSection = (sectionId: string, value: boolean) => {
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return;
    const updated: { [colKey: string]: boolean } = {};
    section.columns.forEach(col => {
      updated[col.key] = value;
    });
    setSelectedColumns(prev => ({
      ...prev,
      [sectionId]: updated
    }));
  };

  // Select all sections
  const selectAllSections = (val: boolean) => {
    const updated: { [key: string]: boolean } = {};
    SECTIONS.forEach(s => {
      updated[s.id] = val;
    });
    setSelectedSections(updated);
  };

  // Smart Presets
  const applyPreset = (preset: 'all' | 'loans_debts' | 'cash_flow' | 'debts_only') => {
    if (preset === 'all') {
      setSelectedSections({ expenses: true, incomes: true, debts: true, loans: true, sulas: true });
      setIncludeExecutiveSummary(true);
      setDateRange('all');
    } else if (preset === 'loans_debts') {
      setSelectedSections({ expenses: false, incomes: false, debts: true, loans: true, sulas: false });
      setIncludeExecutiveSummary(true);
      setActiveTab('loans');
    } else if (preset === 'cash_flow') {
      setSelectedSections({ expenses: true, incomes: true, debts: false, loans: false, sulas: false });
      setIncludeExecutiveSummary(true);
      setDateRange('this_month');
      setActiveTab('expenses');
    } else if (preset === 'debts_only') {
      setSelectedSections({ expenses: false, incomes: false, debts: true, loans: false, sulas: false });
      setIncludeExecutiveSummary(false);
      setActiveTab('debts');
    }
  };

  // Date filtering logic
  const isDateInRange = (dateVal: string | Date | undefined): boolean => {
    if (!dateVal || dateRange === 'all') return true;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return true;

    const now = new Date();
    if (dateRange === 'this_month') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (dateRange === 'last_month') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === prevMonth.getFullYear() && d.getMonth() === prevMonth.getMonth();
    }
    if (dateRange === 'last_3_months') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      return d >= threeMonthsAgo && d <= now;
    }
    if (dateRange === 'this_year') {
      return d.getFullYear() === now.getFullYear();
    }
    if (dateRange === 'custom') {
      if (customStartDate && d < new Date(customStartDate)) return false;
      if (customEndDate && d > new Date(customEndDate + 'T23:59:59')) return false;
      return true;
    }
    return true;
  };

  // Auto calculate sensible column widths based on contents
  const formatWorksheet = (ws: XLSX.WorkSheet, rows: any[]) => {
    if (!rows || rows.length === 0) return;
    const colKeys = Object.keys(rows[0]);
    ws['!cols'] = colKeys.map(key => {
      let maxLen = key.length;
      rows.forEach(r => {
        const valStr = r[key] !== undefined && r[key] !== null ? String(r[key]) : '';
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(50, Math.max(14, maxLen + 3)) };
    });

    if (enableRTL) {
      (ws as any)['!views'] = [{ rightToLeft: true }];
    }
  };

  // Core Excel Export Execution
  const handleExportExcel = (onlyTabId?: string) => {
    setIsExporting(true);

    try {
      const workbook = XLSX.utils.book_new();
      const currencyLabel = getCurrencyLabel();
      let hasAnyData = false;

      const activeSections = onlyTabId ? { [onlyTabId]: true } : selectedSections;

      // 0. IDEA: Smart Executive Summary Sheet (الملخص المالي الشامل)
      if (includeExecutiveSummary && !onlyTabId) {
        const filteredExpenses = allExpenses.filter(e => isDateInRange(e.date));
        const filteredIncomes = allIncomes.filter(i => isDateInRange(i.date));
        const totalExp = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
        const totalInc = filteredIncomes.reduce((s, i) => s + (i.amount || 0), 0);
        const netCash = totalInc - totalExp;

        // Loans summary
        const filteredLoans = loansList.filter(l => isDateInRange(l.startDate));
        const totalLoansPrincipal = filteredLoans.reduce((s, l) => s + (l.loanAmount || l.totalAmount || 0), 0);
        const totalLoansRepay = filteredLoans.reduce((s, l) => s + (l.totalToRepay || l.totalAmount || l.loanAmount || 0), 0);
        const totalLoansPaid = filteredLoans.reduce((s, l) => {
          const paymentsSum = (l.loanPayments || []).reduce((acc, p) => acc + p.amount, 0);
          return s + (l.loanPayments && l.loanPayments.length > 0 ? paymentsSum : (l.paidAmount || 0));
        }, 0);
        const totalLoansRemaining = Math.max(0, totalLoansRepay - totalLoansPaid);

        // Debts summary
        const filteredDebts = allDebts.filter(d => isDateInRange(d.createdAt || d.dueDate));
        const oweDebts = filteredDebts.filter(d => d.type === 'owe').reduce((s, d) => s + (d.remainingAmount ?? d.amount ?? 0), 0);
        const owedDebts = filteredDebts.filter(d => d.type === 'owed').reduce((s, d) => s + (d.remainingAmount ?? d.amount ?? 0), 0);

        const summaryRows: any[] = [
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: isAr ? '📅 تاريخ استخراج التقرير' : 'Report Generated Date', [isAr ? 'القيمة / التفاصيل' : 'Value']: new Date().toLocaleString(isAr ? 'ar-IQ' : 'en-US') },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: isAr ? '📌 نطاق التصفية الزمنية' : 'Date Range Filter', [isAr ? 'القيمة / التفاصيل' : 'Value']: dateRange === 'all' ? (isAr ? 'كل الأوقات' : 'All Time') : (isAr ? 'فترة محددة' : 'Filtered Period') },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: '----------------------------------------', [isAr ? 'القيمة / التفاصيل' : 'Value']: '-------------------------' },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: isAr ? '💰 إجمالي الإيرادات المسجلة' : 'Total Revenue', [isAr ? 'القيمة / التفاصيل' : 'Value']: `${formatAmount(totalInc)} ${currencyLabel}` },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: isAr ? '🛒 إجمالي المصروفات' : 'Total Expenses', [isAr ? 'القيمة / التفاصيل' : 'Value']: `${formatAmount(totalExp)} ${currencyLabel}` },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: isAr ? '⚖️ صافي السيولة المتاحة (الفائض/العجز)' : 'Net Liquidity (Surplus/Deficit)', [isAr ? 'القيمة / التفاصيل' : 'Value']: `${formatAmount(netCash)} ${currencyLabel}` },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: '----------------------------------------', [isAr ? 'القيمة / التفاصيل' : 'Value']: '-------------------------' },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: isAr ? '🏦 إجمالي مبالغ القروض (الأصل)' : 'Total Loan Principal', [isAr ? 'القيمة / التفاصيل' : 'Value']: `${formatAmount(totalLoansPrincipal)} ${currencyLabel}` },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: isAr ? '🏦 إجمالي المطلوب سداده للقروض' : 'Total Loans to Repay', [isAr ? 'القيمة / التفاصيل' : 'Value']: `${formatAmount(totalLoansRepay)} ${currencyLabel}` },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: isAr ? '✅ إجمالي المبالغ الواصلة للمصارف' : 'Total Loans Paid to Bank', [isAr ? 'القيمة / التفاصيل' : 'Value']: `${formatAmount(totalLoansPaid)} ${currencyLabel}` },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: isAr ? '🔴 إجمالي المتبقي للمصارف' : 'Total Loans Remaining', [isAr ? 'القيمة / التفاصيل' : 'Value']: `${formatAmount(totalLoansRemaining)} ${currencyLabel}` },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: '----------------------------------------', [isAr ? 'القيمة / التفاصيل' : 'Value']: '-------------------------' },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: isAr ? '🤝 ديون بذمتي (مطلوبة مني للغير)' : 'Debts I Owe', [isAr ? 'القيمة / التفاصيل' : 'Value']: `${formatAmount(oweDebts)} ${currencyLabel}` },
          { [isAr ? 'البند المالي / المؤشر' : 'Financial KPI']: isAr ? '🤝 ديون أطلبها للآخرين (مستحقة لي)' : 'Debts Owed to Me', [isAr ? 'القيمة / التفاصيل' : 'Value']: `${formatAmount(owedDebts)} ${currencyLabel}` },
        ];

        const summaryWs = XLSX.utils.json_to_sheet(summaryRows);
        formatWorksheet(summaryWs, summaryRows);
        XLSX.utils.book_append_sheet(workbook, summaryWs, isAr ? 'الملخص التنفيذي' : 'Summary');
        hasAnyData = true;
      }

      // 1. Process Expenses
      if (activeSections.expenses) {
        const filteredExpenses = allExpenses.filter(e => isDateInRange(e.date));
        const cols = selectedColumns.expenses || {};
        const rows: any[] = [];
        let totalSum = 0;
        let totalPaidSum = 0;
        let totalRemainingSum = 0;

        filteredExpenses.forEach(exp => {
          const row: any = {};
          const amount = exp.amount || 0;
          const paidAmount = exp.paidAmount || (exp.status === 'paid' ? amount : 0);
          const remaining = Math.max(0, amount - paidAmount);

          totalSum += amount;
          totalPaidSum += paidAmount;
          totalRemainingSum += remaining;

          if (cols.amount) row[isAr ? 'المبلغ' : 'Amount'] = amount;
          if (cols.category) row[isAr ? 'الفئة' : 'Category'] = exp.category || '';
          if (cols.type) row[isAr ? 'النوع' : 'Type'] = exp.type === 'fixed' ? (isAr ? 'ثابت' : 'Fixed') : (isAr ? 'متغير' : 'Variable');
          if (cols.date) row[isAr ? 'التاريخ' : 'Date'] = exp.date ? new Date(exp.date).toISOString().split('T')[0] : '';
          if (cols.status) {
            row[isAr ? 'الحالة' : 'Status'] = exp.status === 'paid' 
              ? (isAr ? 'تم التسديد' : 'Paid') 
              : exp.status === 'partially_paid' 
                ? (isAr ? 'تسديد جزئي' : 'Partially Paid') 
                : (isAr ? 'غير مسدد' : 'Unpaid');
          }
          if (cols.paidAmount) row[isAr ? 'المسدد' : 'Paid'] = paidAmount;
          if (cols.remaining) row[isAr ? 'المتبقي' : 'Remaining'] = remaining;
          if (cols.currency) row[isAr ? 'العملة' : 'Currency'] = exp.currency || currencyLabel;
          if (cols.note) row[isAr ? 'الملاحظات' : 'Notes'] = exp.note || '';

          rows.push(row);
        });

        if (includeSummaryRow && rows.length > 0) {
          const sumRow: any = {};
          if (cols.category) sumRow[isAr ? 'الفئة' : 'Category'] = isAr ? '--- المجموع الكلي ---' : '--- Total Sum ---';
          if (cols.amount) sumRow[isAr ? 'المبلغ' : 'Amount'] = totalSum;
          if (cols.paidAmount) sumRow[isAr ? 'المسدد' : 'Paid'] = totalPaidSum;
          if (cols.remaining) sumRow[isAr ? 'المتبقي' : 'Remaining'] = totalRemainingSum;
          rows.push(sumRow);
        }

        if (rows.length > 0) {
          hasAnyData = true;
          const ws = XLSX.utils.json_to_sheet(rows);
          formatWorksheet(ws, rows);
          XLSX.utils.book_append_sheet(workbook, ws, isAr ? 'المصروفات' : 'Expenses');
        }
      }

      // 2. Process Incomes
      if (activeSections.incomes) {
        const filteredIncomes = allIncomes.filter(i => isDateInRange(i.date));
        const cols = selectedColumns.incomes || {};
        const rows: any[] = [];
        let totalIncomeSum = 0;

        filteredIncomes.forEach(inc => {
          const row: any = {};
          const amount = inc.amount || 0;
          totalIncomeSum += amount;

          if (cols.amount) row[isAr ? 'المبلغ' : 'Amount'] = amount;
          if (cols.category) row[isAr ? 'مصدر الدخل' : 'Source'] = inc.category || '';
          if (cols.date) row[isAr ? 'التاريخ' : 'Date'] = inc.date ? new Date(inc.date).toISOString().split('T')[0] : '';
          if (cols.currency) row[isAr ? 'العملة' : 'Currency'] = inc.currency || currencyLabel;
          if (cols.note) row[isAr ? 'الملاحظات' : 'Notes'] = inc.note || '';

          rows.push(row);
        });

        if (includeSummaryRow && rows.length > 0) {
          const sumRow: any = {};
          if (cols.category) sumRow[isAr ? 'مصدر الدخل' : 'Source'] = isAr ? '--- مجموع الدخل ---' : '--- Total Income ---';
          if (cols.amount) sumRow[isAr ? 'المبلغ' : 'Amount'] = totalIncomeSum;
          rows.push(sumRow);
        }

        if (rows.length > 0) {
          hasAnyData = true;
          const ws = XLSX.utils.json_to_sheet(rows);
          formatWorksheet(ws, rows);
          XLSX.utils.book_append_sheet(workbook, ws, isAr ? 'الدخل' : 'Income');
        }
      }

      // 3. Process Loans (القروض المصرفية)
      if (activeSections.loans) {
        const filteredLoans = loansList.filter(l => isDateInRange(l.startDate));
        const cols = selectedColumns.loans || {};
        const rows: any[] = [];
        let totalPrincipalSum = 0;
        let totalRepaySum = 0;
        let totalPaidSum = 0;
        let totalRemainingPrincipalSum = 0;
        let totalRemainingSum = 0;

        filteredLoans.forEach(loan => {
          const row: any = {};
          const principal = loan.loanAmount || loan.totalAmount || 0;
          const totalToRepay = loan.totalToRepay || loan.totalAmount || principal;
          const paymentsSum = (loan.loanPayments || []).reduce((s, p) => s + p.amount, 0);
          const paid = (loan.loanPayments && loan.loanPayments.length > 0) ? paymentsSum : (loan.paidAmount || 0);
          // المبلغ المتبقي = مبلغ القرض - المبلغ الواصل للمصرف
          const remainingPrincipal = Math.max(0, principal - paid);
          const remainingTotal = Math.max(0, totalToRepay - paid);
          const progress = Math.min(100, Math.round((paid / (totalToRepay || principal || 1)) * 100));

          totalPrincipalSum += principal;
          totalRepaySum += totalToRepay;
          totalPaidSum += paid;
          totalRemainingPrincipalSum += remainingPrincipal;
          totalRemainingSum += remainingTotal;

          if (cols.name) row[isAr ? 'اسم القرض' : 'Loan Name'] = loan.name || '';
          if (cols.bank) row[isAr ? 'المصرف' : 'Bank'] = loan.bank || (isAr ? 'غير محدد' : 'N/A');
          if (cols.loanAmount) row[isAr ? 'مبلغ القرض (الأصل)' : 'Principal'] = principal;
          if (cols.totalToRepay) row[isAr ? 'المبلغ الذي يجب سداده' : 'Total To Repay'] = totalToRepay;
          if (cols.paidAmount) row[isAr ? 'المبلغ الواصل للمصرف' : 'Paid to Bank'] = paid;
          if (cols.remainingPrincipal) row[isAr ? 'المتبقي من أصل القرض (مبلغ القرض - الواصل)' : 'Remaining Principal'] = remainingPrincipal;
          if (cols.remainingAmount) row[isAr ? 'المتبقي الكلي المطلوب سداده' : 'Remaining Balance'] = remainingTotal;
          if (cols.progress) row[isAr ? 'نسبة السداد %' : 'Progress %'] = `${progress}%`;
          if (cols.monthlyInstallment) row[isAr ? 'القسط الشهري' : 'Monthly Installment'] = loan.monthlyInstallment || 0;
          if (cols.status) row[isAr ? 'حالة القرض' : 'Status'] = remainingTotal <= 0 ? (isAr ? 'مكتمل السداد' : 'Completed') : (isAr ? 'قيد السداد' : 'Active');
          if (cols.startDate) row[isAr ? 'تاريخ البدء' : 'Start Date'] = loan.startDate || '';
          if (cols.endDate) row[isAr ? 'تاريخ الانتهاء' : 'End Date'] = loan.endDate || '';
          if (cols.paymentsCount) row[isAr ? 'عدد الدفعات الواصلة' : 'Payments Count'] = loan.loanPayments?.length || 0;

          rows.push(row);
        });

        if (includeSummaryRow && rows.length > 0) {
          const sumRow: any = {};
          if (cols.name) sumRow[isAr ? 'اسم القرض' : 'Loan Name'] = isAr ? '--- مجموع القروض ---' : '--- Total Loans ---';
          if (cols.loanAmount) sumRow[isAr ? 'مبلغ القرض (الأصل)' : 'Principal'] = totalPrincipalSum;
          if (cols.totalToRepay) sumRow[isAr ? 'المبلغ الذي يجب سداده' : 'Total To Repay'] = totalRepaySum;
          if (cols.paidAmount) sumRow[isAr ? 'المبلغ الواصل للمصرف' : 'Paid to Bank'] = totalPaidSum;
          if (cols.remainingPrincipal) sumRow[isAr ? 'المتبقي من أصل القرض (مبلغ القرض - الواصل)' : 'Remaining Principal'] = totalRemainingPrincipalSum;
          if (cols.remainingAmount) sumRow[isAr ? 'المتبقي الكلي المطلوب سداده' : 'Remaining Balance'] = totalRemainingSum;
          rows.push(sumRow);
        }

        if (rows.length > 0) {
          hasAnyData = true;
          const ws = XLSX.utils.json_to_sheet(rows);
          formatWorksheet(ws, rows);
          XLSX.utils.book_append_sheet(workbook, ws, isAr ? 'القروض المصرفية' : 'Bank Loans');
        }
      }

      // 4. Process Debts
      if (activeSections.debts) {
        let filteredDebts = allDebts.filter(d => isDateInRange(d.createdAt || d.dueDate));
        if (debtFilter !== 'all') {
          filteredDebts = filteredDebts.filter(d => d.type === debtFilter);
        }
        const cols = selectedColumns.debts || {};
        const rows: any[] = [];
        let totalDebtSum = 0;
        let totalPaidSum = 0;
        let totalRemainingSum = 0;

        filteredDebts.forEach(d => {
          const row: any = {};
          const amount = d.amount || 0;
          const remaining = d.remainingAmount ?? amount;
          const paid = Math.max(0, amount - remaining);

          totalDebtSum += amount;
          totalPaidSum += paid;
          totalRemainingSum += remaining;

          if (cols.personName) row[isAr ? 'اسم الشخص' : 'Person'] = d.personName || '';
          if (cols.type) row[isAr ? 'نوع الدين' : 'Debt Type'] = d.type === 'owe' ? (isAr ? 'بذمتي (عليّ)' : 'I Owe') : (isAr ? 'أطلبه (لي)' : 'Owed to Me');
          if (cols.amount) row[isAr ? 'أصل المبلغ' : 'Amount'] = amount;
          if (cols.paidAmount) row[isAr ? 'المسدد' : 'Paid'] = paid;
          if (cols.remainingAmount) row[isAr ? 'المتبقي' : 'Remaining'] = remaining;
          if (cols.repaymentMethod) {
            row[isAr ? 'طريقة السداد' : 'Method'] = d.repaymentMethod === 'installments' 
              ? (isAr ? `أقساط (${d.installmentCount || 1})` : `Installments (${d.installmentCount || 1})`)
              : (isAr ? 'دفعة واحدة' : 'One-time');
          }
          if (cols.dueDate) row[isAr ? 'موعد السداد' : 'Due Date'] = d.dueDate || (isAr ? 'غير محدد' : 'Unspecified');
          if (cols.createdAt) row[isAr ? 'تاريخ التسجيل' : 'Created Date'] = d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : '';

          rows.push(row);
        });

        if (includeSummaryRow && rows.length > 0) {
          const sumRow: any = {};
          if (cols.personName) sumRow[isAr ? 'اسم الشخص' : 'Person'] = isAr ? '--- المجموع ---' : '--- Total ---';
          if (cols.amount) sumRow[isAr ? 'أصل المبلغ' : 'Amount'] = totalDebtSum;
          if (cols.paidAmount) sumRow[isAr ? 'المسدد' : 'Paid'] = totalPaidSum;
          if (cols.remainingAmount) sumRow[isAr ? 'المتبقي' : 'Remaining'] = totalRemainingSum;
          rows.push(sumRow);
        }

        if (rows.length > 0) {
          hasAnyData = true;
          const ws = XLSX.utils.json_to_sheet(rows);
          formatWorksheet(ws, rows);
          XLSX.utils.book_append_sheet(workbook, ws, isAr ? 'الديون' : 'Debts');
        }
      }

      // 5. Process Sulas
      if (activeSections.sulas) {
        const filteredSulas = sulasList.filter(s => isDateInRange(s.startDate));
        const cols = selectedColumns.sulas || {};
        const rows: any[] = [];
        let totalSulaAmount = 0;
        let totalPaidSum = 0;

        filteredSulas.forEach(s => {
          const row: any = {};
          const totalAmount = s.totalAmount || 0;
          const monthly = s.monthlyInstallment || 0;
          const paid = (s.paidMonths || 0) * monthly;

          totalSulaAmount += totalAmount;
          totalPaidSum += paid;

          if (cols.name) row[isAr ? 'اسم السلفة' : 'Sula Name'] = s.name || '';
          if (cols.role) row[isAr ? 'الصفة' : 'Role'] = s.role === 'organizer' ? (isAr ? 'منظم' : 'Organizer') : (isAr ? 'مشترك' : 'Member');
          if (cols.totalAmount) row[isAr ? 'المبلغ الإجمالي' : 'Total Amount'] = totalAmount;
          if (cols.monthlyInstallment) row[isAr ? 'القسط الشهري' : 'Monthly Installment'] = monthly;
          if (cols.participantsCount) row[isAr ? 'عدد المشتركين' : 'Participants'] = s.participantsCount || 0;
          if (cols.turn) row[isAr ? 'الدور' : 'Turn'] = s.myTurn === 'lottery' ? (isAr ? 'قرعة' : 'Lottery') : s.myTurn;
          if (cols.paidMonths) row[isAr ? 'الأشهر المسددة' : 'Paid Months'] = s.paidMonths || 0;
          if (cols.totalPaid) row[isAr ? 'إجمالي المدفوع' : 'Total Paid'] = paid;
          if (cols.frequency) {
            row[isAr ? 'دورة الدفع' : 'Frequency'] = s.frequency === 'monthly' ? (isAr ? 'شهرياً' : 'Monthly') : (isAr ? 'كل 15 يوم' : 'Biweekly');
          }
          if (cols.startDate) row[isAr ? 'تاريخ البدء' : 'Start Date'] = s.startDate || '';
          if (cols.status) row[isAr ? 'الحالة' : 'Status'] = s.status === 'completed' ? (isAr ? 'مكتملة' : 'Completed') : (isAr ? 'نشطة' : 'Active');

          rows.push(row);
        });

        if (includeSummaryRow && rows.length > 0) {
          const sumRow: any = {};
          if (cols.name) sumRow[isAr ? 'اسم السلفة' : 'Sula Name'] = isAr ? '--- مجموع السلف ---' : '--- Total Sulas ---';
          if (cols.totalAmount) sumRow[isAr ? 'المبلغ الإجمالي' : 'Total Amount'] = totalSulaAmount;
          if (cols.totalPaid) sumRow[isAr ? 'إجمالي المدفوع' : 'Total Paid'] = totalPaidSum;
          rows.push(sumRow);
        }

        if (rows.length > 0) {
          hasAnyData = true;
          const ws = XLSX.utils.json_to_sheet(rows);
          formatWorksheet(ws, rows);
          XLSX.utils.book_append_sheet(workbook, ws, isAr ? 'السلف المالية' : 'Sulas');
        }
      }

      if (!hasAnyData) {
        alert(isAr 
          ? 'لم يتم العثور على بيانات مطابقة للشروط والفترة المحددة لتصديرها.' 
          : 'No data matching the selected filters found to export.');
        setIsExporting(false);
        return;
      }

      // Generate File Name with Date
      const dateStr = new Date().toISOString().split('T')[0];
      const sectionNamePart = onlyTabId 
        ? `_${SECTIONS.find(s => s.id === onlyTabId)?.titleAr || onlyTabId}`
        : '';
      const fileName = isAr ? `حساباتي_تصدير${sectionNamePart}_${dateStr}.xlsx` : `Hesabati_Export${sectionNamePart}_${dateStr}.xlsx`;

      // Trigger browser download of .xlsx
      XLSX.writeFile(workbook, fileName);

      // Celebration
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Failed to export Excel file:', err);
      alert(isAr ? 'حدث خطأ أثناء تصدير ملف الإكسل' : 'Error exporting Excel file');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper count badges
  const getSectionCount = (id: string) => {
    switch (id) {
      case 'expenses': return allExpenses.length;
      case 'incomes': return allIncomes.length;
      case 'debts': return allDebts.length;
      case 'loans': return loansList.length;
      case 'sulas': return sulasList.length;
      default: return 0;
    }
  };

  const currentSection = SECTIONS.find(s => s.id === activeTab) || SECTIONS[0];
  const currentCols = selectedColumns[currentSection.id] || {};
  const currentActiveColsCount = Object.values(currentCols).filter(Boolean).length;
  const isCurrentSectionSelected = !!selectedSections[currentSection.id];

  const cardContent = (
    <div 
      className={cn(
        "card bg-white dark:bg-slate-900 border-2 border-emerald-500/40 dark:border-emerald-600/40 w-full flex flex-col p-0 shadow-xl rounded-3xl overflow-hidden animate-in fade-in duration-200",
        inline ? "my-3 max-w-full" : "max-w-3xl max-h-[92vh]"
      )}
    >
      {/* Header */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-md shrink-0">
            <FileSpreadsheet size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-xl font-black text-white">
                {isAr ? 'تبويب تصدير البيانات إلى إكسل (Excel)' : 'Export Data to Excel'}
              </h2>
              <span className="text-[10px] bg-white/25 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                .XLSX PRO
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-white/90 font-bold mt-0.5">
              {isAr 
                ? 'اختر التبويب المطلوب ثم حدد التفاصيل والأعمدة لتصديرها مباشرة داخل هذه الصفحة' 
                : 'Select specific tab and choose exact columns/details to export directly within this page'}
            </p>
          </div>
        </div>
        <button 
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-xs font-bold transition-colors border border-white/20 shadow-sm"
          title={isAr ? 'إغلاق تبويب الإكسل' : 'Close tab'}
        >
          <X size={16} />
          <span>{isAr ? 'إغلاق التبويب' : 'Close'}</span>
        </button>
      </div>

      {/* Scrollable Body */}
      <div className={cn("p-4 sm:p-6 space-y-6", !inline && "flex-1 overflow-y-auto")}>

          {/* Quick Presets Bar (فكرة القوالب السريعة) */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>{isAr ? 'قوالب تصدير سريعة ذكية (بضغطة واحدة):' : 'Smart Quick Export Presets:'}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-emerald-500 transition-all flex items-center gap-1.5"
              >
                <span>🌟</span>
                <span>{isAr ? 'تصدير شامل لكل شيء' : 'Full Backup (All)'}</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('loans_debts')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-blue-500 transition-all flex items-center gap-1.5"
              >
                <span>🏦</span>
                <span>{isAr ? 'تقرير القروض والديون فقط' : 'Loans & Debts'}</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('cash_flow')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-emerald-500 transition-all flex items-center gap-1.5"
              >
                <span>📊</span>
                <span>{isAr ? 'كشف المصروفات والدخل (الشهري)' : 'Monthly Cash Flow'}</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('debts_only')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-amber-500 transition-all flex items-center gap-1.5"
              >
                <span>🤝</span>
                <span>{isAr ? 'المطالبات والديون فقط' : 'Debts Only'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Tab Selector (طلب المستخدم: التبويب المحدد ثم التفاصيل من ذلك التبويب) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={15} className="text-emerald-600" />
                <span>{isAr ? 'اختر التبويب المطلوب لتحديد تفاصيله:' : 'Select Tab to Customize Details:'}</span>
              </span>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => selectAllSections(true)}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {isAr ? 'تضمين كل التبويبات' : 'Include All Tabs'}
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button 
                  type="button"
                  onClick={() => selectAllSections(false)}
                  className="text-xs font-bold text-slate-500 hover:underline"
                >
                  {isAr ? 'إلغاء الكل' : 'Deselect All'}
                </button>
              </div>
            </div>

            {/* Horizontal Tabs Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SECTIONS.map(sec => {
                const Icon = sec.icon;
                const isTabActive = activeTab === sec.id;
                const isIncluded = !!selectedSections[sec.id];
                const count = getSectionCount(sec.id);

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveTab(sec.id)}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 text-center relative ${
                      isTabActive
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 shadow-md scale-[1.02]'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`w-2.5 h-2.5 rounded-full ${isIncluded ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${sec.badgeColor}`}>
                        {count}
                      </span>
                    </div>

                    <div className={`p-2 rounded-xl border ${sec.color}`}>
                      <Icon size={18} />
                    </div>

                    <span className="text-xs font-black text-slate-900 dark:text-white truncate w-full">
                      {isAr ? sec.titleAr : sec.titleEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE TAB DETAILS INSPECTOR (طلب المستخدم المباشر) */}
          <div className="p-4 sm:p-5 rounded-3xl border-2 border-emerald-500/40 bg-white dark:bg-slate-800 shadow-md space-y-4">
            {/* Tab Header bar with Include/Exclude switch */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl border ${currentSection.color}`}>
                  {React.createElement(currentSection.icon, { size: 22 })}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      {isAr ? currentSection.titleAr : currentSection.titleEn}
                    </h3>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold ${currentSection.badgeColor}`}>
                      {getSectionCount(currentSection.id)} {isAr ? 'سجل متوفر' : 'records'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                    {isAr 
                      ? `تم تحديد ${currentActiveColsCount} من أصل ${currentSection.columns.length} تفاصيل ستطبع في الإكسل` 
                      : `${currentActiveColsCount} of ${currentSection.columns.length} details selected for export`}
                  </p>
                </div>
              </div>

              {/* Include toggle button */}
              <button
                type="button"
                onClick={() => toggleSection(currentSection.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all border ${
                  isCurrentSectionSelected
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                }`}
              >
                <Check size={14} className={isCurrentSectionSelected ? 'opacity-100' : 'opacity-0'} />
                <span>{isCurrentSectionSelected ? (isAr ? 'التبويب مضمّن في الإكسل' : 'Tab Included') : (isAr ? 'التبويب مستثنى' : 'Tab Excluded')}</span>
              </button>
            </div>

            {/* Quick columns select/deselect */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 size={14} className="text-emerald-600" />
                <span>{isAr ? 'التفاصيل والأعمدة التي ستطبع منها البيانات:' : 'Columns / Details to Print:'}</span>
              </span>
              <div className="flex gap-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => setAllColumnsInSection(currentSection.id, true)}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                >
                  {isAr ? 'تحديد كل تفاصيل التبويب' : 'Select All Details'}
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button 
                  type="button" 
                  onClick={() => setAllColumnsInSection(currentSection.id, false)}
                  className="text-slate-500 hover:underline font-bold"
                >
                  {isAr ? 'إلغاء التحديد' : 'Deselect All'}
                </button>
              </div>
            </div>

            {/* Debts Sub-filter if in Debts */}
            {currentSection.id === 'debts' && (
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs">
                <Filter size={14} className="text-amber-600" />
                <span className="font-bold text-slate-800 dark:text-slate-200">{isAr ? 'تصفية نوع الديون المسجلة:' : 'Filter Debts:'}</span>
                <div className="flex gap-1.5">
                  {[
                    { key: 'all', label: isAr ? 'الكل (بذمتي واطلبها)' : 'All' },
                    { key: 'owe', label: isAr ? 'بذمتي فقط (عليّ)' : 'I Owe Only' },
                    { key: 'owed', label: isAr ? 'اطلبها فقط (لي)' : 'Owed to Me Only' }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setDebtFilter(opt.key as any)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                        debtFilter === opt.key 
                          ? 'bg-amber-600 text-white shadow-sm' 
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Checkboxes Grid for Details / Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {currentSection.columns.map(col => {
                const isColActive = !!currentCols[col.key];
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleColumn(currentSection.id, col.key)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold text-right transition-all ${
                      isColActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/50 text-slate-900 dark:text-emerald-200 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs shrink-0 transition-colors ${
                      isColActive ? 'bg-emerald-600 text-white' : 'border border-slate-400 dark:border-slate-600'
                    }`}>
                      {isColActive ? '✓' : ''}
                    </span>
                    <span className="truncate">{isAr ? col.labelAr : col.labelEn}</span>
                  </button>
                );
              })}
            </div>

            {/* Single Tab Quick Export Button */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => handleExportExcel(currentSection.id)}
                disabled={isExporting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-800 dark:text-slate-200 text-xs font-black transition-all flex items-center gap-2 border border-slate-300 dark:border-slate-600"
              >
                <FileDown size={15} />
                <span>{isAr ? `تصدير تبويب (${currentSection.titleAr}) فقط الآن كملف منفصل` : `Export (${currentSection.titleEn}) Only Now`}</span>
              </button>
            </div>
          </div>

          {/* Date Filter Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-emerald-600" />
              <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                {isAr ? 'الفترة الزمنية لتصدير البيانات:' : 'Date Filter:'}
              </h4>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', labelAr: 'كل الأوقات (الكل)', labelEn: 'All Time' },
                { key: 'this_month', labelAr: 'هذا الشهر الحالي', labelEn: 'This Month' },
                { key: 'last_month', labelAr: 'الشهر الماضي', labelEn: 'Last Month' },
                { key: 'last_3_months', labelAr: 'آخر 3 أشهر', labelEn: 'Last 3 Months' },
                { key: 'this_year', labelAr: 'السنة الحالية', labelEn: 'This Year' },
                { key: 'custom', labelAr: 'فترة مخصصة...', labelEn: 'Custom Range...' }
              ].map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDateRange(opt.key as DateRangeType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    dateRange === opt.key
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isAr ? opt.labelAr : opt.labelEn}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">{isAr ? 'من تاريخ:' : 'From:'}</label>
                  <input 
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">{isAr ? 'إلى تاريخ:' : 'To:'}</label>
                  <input 
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Smart Ideas & Formatting Options */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <h4 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600" />
              <span>{isAr ? 'أفكار ومميزات التصدير المتقدمة:' : 'Advanced Export Options:'}</span>
            </h4>

            {/* 1. Executive Summary Sheet */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input 
                type="checkbox"
                checked={includeExecutiveSummary}
                onChange={(e) => setIncludeExecutiveSummary(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <span>{isAr ? 'تضمين ورقة (الملخص المالي الشامل Executive Summary) في بداية الملف بمؤشرات الأداء' : 'Include Executive Summary dashboard sheet in workbook'}</span>
            </label>

            {/* 2. Summary Row */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input 
                type="checkbox"
                checked={includeSummaryRow}
                onChange={(e) => setIncludeSummaryRow(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <span>{isAr ? 'إضافة صف الإجماليات والمجموع الرياضي أسفل كل جدول في الإكسل' : 'Include Summary / Totals Row at the bottom of sheets'}</span>
            </label>

            {/* 3. RTL Support */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input 
                type="checkbox"
                checked={enableRTL}
                onChange={(e) => setEnableRTL(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <span>{isAr ? 'ضبط محاذاة صفحات الإكسل من اليمين إلى اليسار (RTL) لسهولة القراءة باللغة العربية' : 'Right-to-Left (RTL) worksheet alignment for Arabic'}</span>
            </label>

            {/* 4. Separate Sheets */}
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
              <input 
                type="checkbox"
                checked={separateSheets}
                onChange={(e) => setSeparateSheets(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <span>{isAr ? 'تضمين كل تبويب في ورقة عمل مستقلة داخل ملف الإكسل (Multi-Sheet)' : 'Create separate sheet per section in workbook'}</span>
            </label>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 sm:p-5 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-bold hidden sm:block">
            {isAr ? 'صيغة الملف: مايكروسوفت إكسل (.xlsx) مع دعم الجداول والتنسيق' : 'File format: Microsoft Excel (.xlsx)'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 border-2 border-slate-300 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex-1 sm:flex-none"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={() => handleExportExcel()}
              disabled={isExporting || exportSuccess}
              className="btn-primary py-3 px-6 text-sm font-black flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 flex-1 sm:flex-none active:scale-95 transition-all"
            >
              {exportSuccess ? (
                <>
                  <Check size={18} className="text-white animate-bounce" />
                  <span>{isAr ? 'تم استخراج الملف بنجاح!' : 'Exported Successfully!'}</span>
                </>
              ) : isExporting ? (
                <span>{isAr ? 'جاري إنشاء الملف...' : 'Generating...'}</span>
              ) : (
                <>
                  <Download size={18} />
                  <span>{isAr ? 'استخراج وتحميل الإكسل (.xlsx)' : 'Download Excel (.xlsx)'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
  );

  if (inline) {
    return cardContent;
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md">
      {cardContent}
    </div>
  );
};
