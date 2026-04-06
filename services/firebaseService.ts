import { db, auth } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { StorageService, encrypt } from './storageService';
import { Invoice, Supplier, PendingItem, ItemCatalogEntry, Client, ClientTransaction, AppSettings } from '../types';

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
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
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
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const FirebaseService = {
  async testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration. ");
      }
    }
  },

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'auth');
    }
  },

  async initAuth() {
    if (!auth.currentUser) {
      throw new Error('يرجى تسجيل الدخول باستخدام Google لتفعيل المزامنة السحابية.');
    }
  },

  async saveUserSettings(settings: AppSettings) {
    await this.initAuth();
    const uid = auth.currentUser!.uid;
    try {
      // Don't sync the entire settings object if it contains large data like avatars
      // Just sync the critical cloud config and basic info
      const syncData = {
        pharmacyName: settings.pharmacyName,
        cloudConfig: settings.cloudConfig,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'userSettings', uid), syncData);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'userSettings');
    }
  },

  async getUserSettings(): Promise<Partial<AppSettings> | null> {
    await this.initAuth();
    const uid = auth.currentUser!.uid;
    try {
      const snap = await getDocFromServer(doc(db, 'userSettings', uid));
      if (snap.exists()) {
        return snap.data() as Partial<AppSettings>;
      }
      return null;
    } catch (error) {
      // If document doesn't exist or other error, return null
      return null;
    }
  },

  async syncAllDataToCloud(groupId: string) {
    await this.initAuth();
    
    // 1. First ensure user settings are synced
    const settings = StorageService.getSettings();
    await this.saveUserSettings(settings);

    // 2. Upload local data to cloud in parallel batches for performance
    const uploadPromises: Promise<void>[] = [];

    const invoices = StorageService.getInvoices();
    invoices.forEach(inv => {
      uploadPromises.push(
        setDoc(doc(db, 'invoices', inv.id), { ...inv, groupId })
          .catch(error => handleFirestoreError(error, OperationType.WRITE, `invoices/${inv.id}`))
      );
    });

    const suppliers = StorageService.getSuppliers();
    suppliers.forEach(sup => {
      uploadPromises.push(
        setDoc(doc(db, 'suppliers', sup.id), { ...sup, groupId })
          .catch(error => handleFirestoreError(error, OperationType.WRITE, `suppliers/${sup.id}`))
      );
    });

    const pending = StorageService.getPendingItems();
    pending.forEach(p => {
      uploadPromises.push(
        setDoc(doc(db, 'pendingItems', p.id), { ...p, groupId })
          .catch(error => handleFirestoreError(error, OperationType.WRITE, `pendingItems/${p.id}`))
      );
    });

    const catalog = StorageService.getCatalog();
    catalog.forEach(c => {
      uploadPromises.push(
        setDoc(doc(db, 'catalog', c.id), { ...c, groupId })
          .catch(error => handleFirestoreError(error, OperationType.WRITE, `catalog/${c.id}`))
      );
    });

    const clients = StorageService.getClients();
    clients.forEach(c => {
      uploadPromises.push(
        setDoc(doc(db, 'clients', c.id), { ...c, groupId })
          .catch(error => handleFirestoreError(error, OperationType.WRITE, `clients/${c.id}`))
      );
    });

    const transactions = StorageService.getTransactions();
    transactions.forEach(t => {
      uploadPromises.push(
        setDoc(doc(db, 'transactions', t.id), { ...t, groupId })
          .catch(error => handleFirestoreError(error, OperationType.WRITE, `transactions/${t.id}`))
      );
    });

    await Promise.all(uploadPromises);
  },

  async downloadAllDataFromCloud(groupId: string) {
    if (!groupId) throw new Error('معرف المجموعة مطلوب للتحميل');
    await this.initAuth();

    console.log('Starting full cloud download for group:', groupId);

    const downloadTasks = [
      {
        collection: 'invoices',
        key: 'pharmamind_invoices',
        query: query(collection(db, 'invoices'), where('groupId', '==', groupId))
      },
      {
        collection: 'suppliers',
        key: 'pharmamind_suppliers',
        query: query(collection(db, 'suppliers'), where('groupId', '==', groupId))
      },
      {
        collection: 'pendingItems',
        key: 'pharmamind_pending_items',
        query: query(collection(db, 'pendingItems'), where('groupId', '==', groupId))
      },
      {
        collection: 'catalog',
        key: 'pharmamind_catalog',
        query: query(collection(db, 'catalog'), where('groupId', '==', groupId))
      },
      {
        collection: 'clients',
        key: 'pharmamind_clients',
        query: query(collection(db, 'clients'), where('groupId', '==', groupId))
      },
      {
        collection: 'transactions',
        key: 'pharmamind_transactions',
        query: query(collection(db, 'transactions'), where('groupId', '==', groupId))
      }
    ];

    const results = await Promise.all(
      downloadTasks.map(async (task) => {
        try {
          const snap = await getDocs(task.query);
          const data: any[] = [];
          snap.forEach(doc => data.push(doc.data()));
          
          // Update local storage even if empty to reflect cloud state
          localStorage.setItem(task.key, encrypt(data));
          return { collection: task.collection, count: data.length, success: true };
        } catch (error) {
          console.error(`Error downloading ${task.collection}:`, error);
          handleFirestoreError(error, OperationType.GET, task.collection);
          return { collection: task.collection, success: false };
        }
      })
    );

    localStorage.removeItem('pharmamind_all_item_names');
    console.log('Cloud download completed:', results);
    return results;
  },

  // Real-time listeners
  listenToCloudChanges(groupId: string, onUpdate: () => void) {
    let unsubscribes: (() => void)[] = [];
    let isCancelled = false;
    
    this.initAuth().then(() => {
      if (isCancelled) return;

      const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), where('groupId', '==', groupId)), (snap) => {
        const items: any[] = [];
        snap.forEach(doc => items.push(doc.data()));
        localStorage.setItem('pharmamind_invoices', encrypt(items));
        localStorage.removeItem('pharmamind_all_item_names');
        onUpdate();
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'invoices');
      });

      const unsubSuppliers = onSnapshot(query(collection(db, 'suppliers'), where('groupId', '==', groupId)), (snap) => {
        const items: any[] = [];
        snap.forEach(doc => items.push(doc.data()));
        localStorage.setItem('pharmamind_suppliers', encrypt(items));
        onUpdate();
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'suppliers');
      });

      const unsubPending = onSnapshot(query(collection(db, 'pendingItems'), where('groupId', '==', groupId)), (snap) => {
        const items: any[] = [];
        snap.forEach(doc => items.push(doc.data()));
        localStorage.setItem('pharmamind_pending_items', encrypt(items));
        onUpdate();
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'pendingItems');
      });

      const unsubCatalog = onSnapshot(query(collection(db, 'catalog'), where('groupId', '==', groupId)), (snap) => {
        const items: any[] = [];
        snap.forEach(doc => items.push(doc.data()));
        localStorage.setItem('pharmamind_catalog', encrypt(items));
        localStorage.removeItem('pharmamind_all_item_names');
        onUpdate();
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'catalog');
      });

      const unsubClients = onSnapshot(query(collection(db, 'clients'), where('groupId', '==', groupId)), (snap) => {
        const items: any[] = [];
        snap.forEach(doc => items.push(doc.data()));
        localStorage.setItem('pharmamind_clients', encrypt(items));
        onUpdate();
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'clients');
      });

      const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), where('groupId', '==', groupId)), (snap) => {
        const items: any[] = [];
        snap.forEach(doc => items.push(doc.data()));
        localStorage.setItem('pharmamind_transactions', encrypt(items));
        onUpdate();
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'transactions');
      });
      
      if (isCancelled) {
        unsubInvoices();
        unsubSuppliers();
        unsubPending();
        unsubCatalog();
        unsubClients();
        unsubTransactions();
      } else {
        unsubscribes.push(unsubInvoices, unsubSuppliers, unsubPending, unsubCatalog, unsubClients, unsubTransactions);
      }
    }).catch(err => {
      console.warn('Cloud sync listener skipped:', err.message);
    });
    
    return () => {
      isCancelled = true;
      unsubscribes.forEach(unsub => unsub());
    };
  },

  // Individual saves
  async saveInvoice(invoice: Invoice, groupId: string) {
    await this.initAuth();
    try {
      await setDoc(doc(db, 'invoices', invoice.id), { ...invoice, groupId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'invoices');
    }
  },
  async deleteInvoice(id: string) {
    await this.initAuth();
    try {
      await deleteDoc(doc(db, 'invoices', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'invoices');
    }
  },

  async saveSupplier(supplier: Supplier, groupId: string) {
    await this.initAuth();
    try {
      await setDoc(doc(db, 'suppliers', supplier.id), { ...supplier, groupId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'suppliers');
    }
  },
  async deleteSupplier(id: string) {
    await this.initAuth();
    try {
      await deleteDoc(doc(db, 'suppliers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'suppliers');
    }
  },

  async savePendingItem(item: PendingItem, groupId: string) {
    await this.initAuth();
    try {
      await setDoc(doc(db, 'pendingItems', item.id), { ...item, groupId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'pendingItems');
    }
  },
  async deletePendingItem(id: string) {
    await this.initAuth();
    try {
      await deleteDoc(doc(db, 'pendingItems', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'pendingItems');
    }
  },

  async saveCatalogItem(item: ItemCatalogEntry, groupId: string) {
    await this.initAuth();
    try {
      await setDoc(doc(db, 'catalog', item.id), { ...item, groupId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'catalog');
    }
  },
  async deleteCatalogItem(id: string) {
    await this.initAuth();
    try {
      await deleteDoc(doc(db, 'catalog', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'catalog');
    }
  },

  async saveClient(client: Client, groupId: string) {
    await this.initAuth();
    try {
      await setDoc(doc(db, 'clients', client.id), { ...client, groupId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'clients');
    }
  },
  async deleteClient(id: string) {
    await this.initAuth();
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'clients');
    }
  },

  async saveTransaction(transaction: ClientTransaction, groupId: string) {
    await this.initAuth();
    try {
      await setDoc(doc(db, 'transactions', transaction.id), { ...transaction, groupId });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'transactions');
    }
  }
};
