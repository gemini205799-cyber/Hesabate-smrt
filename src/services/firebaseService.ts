import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db as firestore, auth } from '../lib/firebase';
import { db as localDb } from '../db';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const firebaseService = {
  async backupData() {
    if (!auth.currentUser) throw new Error('User not authenticated');
    const userId = auth.currentUser.uid;

    try {
      const incomes = await localDb.incomes.toArray();
      const expenses = await localDb.expenses.toArray();
      const sulas = await localDb.sulas.toArray();
      const debts = await localDb.debts.toArray();
      const settings = await localDb.settings.toArray();

      const batch = writeBatch(firestore);

      // Incomes
      for (const item of incomes) {
        const ref = doc(firestore, `users/${userId}/incomes`, `inc_${item.id}`);
        batch.set(ref, { 
          ...item, 
          userId, 
          localId: item.id, 
          date: item.date.toISOString(),
          id: undefined 
        });
      }

      // We use clear and replace approach for simplicity in this backup, 
      // or we can use localIds to update. 
      // For a "Backup" feature, replacing or merge-by-localId is common.
      
      // Expenses
      for (const item of expenses) {
        const ref = doc(firestore, `users/${userId}/expenses`, `exp_${item.id}`);
        batch.set(ref, { 
          ...item, 
          userId, 
          localId: item.id, 
          date: item.date.toISOString(),
          id: undefined // remove the auto-increment id from the object
        });
      }

      // Sulas
      for (const item of sulas) {
        const ref = doc(firestore, `users/${userId}/sulas`, `sula_${item.id}`);
        batch.set(ref, { ...item, userId, localId: item.id, id: undefined });
      }

      // Debts
      for (const item of debts) {
        const ref = doc(firestore, `users/${userId}/debts`, `debt_${item.id}`);
        batch.set(ref, { 
          ...item, 
          userId, 
          localId: item.id, 
          createdAt: (item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)).toISOString(),
          id: undefined 
        });
      }

      // Settings
      for (const item of settings) {
        const ref = doc(firestore, `users/${userId}/settings`, `set_${item.id}`);
        batch.set(ref, { ...item, userId });
      }

      await batch.commit();
      const now = new Date().toISOString();
      await localDb.settings.put({ id: 'last_sync', value: now });
      return now;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  },

  async restoreData() {
    if (!auth.currentUser) throw new Error('User not authenticated');
    const userId = auth.currentUser.uid;

    try {
      const incomesSnap = await getDocs(collection(firestore, `users/${userId}/incomes`));
      const expensesSnap = await getDocs(collection(firestore, `users/${userId}/expenses`));
      const sulasSnap = await getDocs(collection(firestore, `users/${userId}/sulas`));
      const debtsSnap = await getDocs(collection(firestore, `users/${userId}/debts`));
      const settingsSnap = await getDocs(collection(firestore, `users/${userId}/settings`));

      await localDb.transaction('rw', [localDb.incomes, localDb.expenses, localDb.sulas, localDb.debts, localDb.settings], async () => {
        await localDb.incomes.clear();
        await localDb.expenses.clear();
        await localDb.sulas.clear();
        await localDb.debts.clear();
        await localDb.settings.clear();

        for (const docSnap of incomesSnap.docs) {
          const data = docSnap.data();
          await localDb.incomes.add({ 
            ...data, 
            date: new Date(data.date),
            id: data.localId 
          } as any);
        }

        for (const docSnap of expensesSnap.docs) {
          const data = docSnap.data();
          await localDb.expenses.add({ 
            ...data, 
            date: new Date(data.date),
            id: data.localId 
          } as any);
        }

        for (const docSnap of sulasSnap.docs) {
          const data = docSnap.data();
          await localDb.sulas.add({ ...data, id: data.localId } as any);
        }

        for (const docSnap of debtsSnap.docs) {
          const data = docSnap.data();
          await localDb.debts.add({ 
            ...data, 
            createdAt: new Date(data.createdAt),
            id: data.localId 
          } as any);
        }

        for (const docSnap of settingsSnap.docs) {
          const data = docSnap.data();
          await localDb.settings.put({ id: data.id, value: data.value });
        }
        
        const now = new Date().toISOString();
        await localDb.settings.put({ id: 'last_sync', value: now });
      });
      return new Date().toISOString();
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `users/${userId}`);
    }
  }
};
