import Dexie, { type Table } from 'dexie';

export interface Income {
  id?: number;
  amount: number;
  category: string;
  date: Date;
  currency: 'IQD' | 'USD';
  note?: string;
}

export interface Expense {
  id?: number;
  amount: number;
  category: string;
  date: Date;
  currency: 'IQD' | 'USD';
  note?: string;
  type: 'fixed' | 'variable';
  status: 'paid' | 'partially_paid' | 'unpaid';
  paidAmount?: number;
}

export interface LoanPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Sula {
  id?: number;
  name: string;
  bank?: string; // المصرف
  loanAmount?: number; // مبلغ القرض
  totalToRepay?: number; // المبلغ الذي يجب سداده
  totalAmount: number;
  monthlyInstallment: number;
  paidAmount?: number; // المبلغ الواصل (مجموع الدفعات)
  remainingAmount?: number; // المبلغ المتبقي الكلي المطلوب سداده
  remainingPrincipal?: number; // المبلغ المتبقي = مبلغ القرض - المبلغ الواصل للمصرف
  loanPayments?: LoanPayment[]; // سجل المدفوعات المسددة للمصرف
  startDate: string;
  endDate: string;
  myTurn: number | 'lottery';
  status: 'active' | 'completed';
  paidMonths: number;
  type?: 'sula' | 'loan';
  role: 'organizer' | 'member';
  participantsCount: number;
  frequency: 'monthly' | 'biweekly' | 'custom';
  frequencyDays?: number;
  participantNames?: string[];
  participantPayments?: { [name: string]: number };
  turnType: 'fixed' | 'lottery';
}

export interface DebtPayment {
  id?: string;
  amount: number;
  date: Date | string;
  note?: string;
}

export interface Debt {
  id?: number;
  type: 'owe' | 'owed'; // owe = I owe (Liability / دين بذمتي), owed = owed to me (Asset / دين لي)
  personName: string;
  amount: number;
  remainingAmount: number;
  dueDate?: string; // تاريخ التسديد / موعد الاستحقاق
  createdAt: Date | string; // تاريخ التسجيل في النظام
  startDate?: string; // تاريخ أخذ أو نشوء الدين (متى قمت بأخذ هذا الدين)
  phone?: string;
  note?: string;
  payments?: DebtPayment[];
  showOnDashboard?: boolean;
  repaymentMethod?: 'one-time' | 'installments' | 'two-payments';
  installmentCount?: number;
  paidInstallments?: number;
  monthlyAmount?: number;
}

export interface Setting {
  id: string;
  value: any;
}

export class AppDatabase extends Dexie {
  incomes!: Table<Income>;
  expenses!: Table<Expense>;
  sulas!: Table<Sula>;
  debts!: Table<Debt>;
  settings!: Table<Setting>;

  constructor() {
    super('HesabatiDB');
    this.version(2).stores({
      incomes: '++id, date, category',
      expenses: '++id, date, category, type',
      sulas: '++id, name, status',
      debts: '++id, type, personName',
      settings: 'id'
    });
  }
}

export const db = new AppDatabase();
