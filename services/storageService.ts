
import { AppSettings, DEFAULT_SETTINGS, Invoice, CalculatedItem, Supplier, Client, ClientTransaction, ItemCatalogEntry, User, PendingItem } from '../types';
import CryptoJS from 'crypto-js';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FirebaseService } from './firebaseService';
import { auth } from '../firebase';

const KEYS = {
  SETTINGS: 'pharmamind_settings',
  INVOICES: 'pharmamind_invoices',
  INVOICES2: 'pharmamind_invoices2',
  SUPPLIERS: 'pharmamind_suppliers',
  CLIENTS: 'pharmamind_clients',
  TRANSACTIONS: 'pharmamind_transactions',
  CATALOG: 'pharmamind_catalog',
  PENDING_ITEMS: 'pharmamind_pending_items',
};

const SECRET_KEY = "PHARMA_MIND_SECURE_7837047136367";

export const encrypt = (data: any): string => {
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
  } catch (e) {
    console.error("Encryption Error", e);
    return "";
  }
};

export const decrypt = (ciphertext: string | null): any => {
  if (!ciphertext) return null;
  try {
    if (ciphertext.startsWith('[') || ciphertext.startsWith('{')) {
        return JSON.parse(ciphertext);
    }
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedData ? JSON.parse(decryptedData) : null;
  } catch (e) {
    console.error("Decryption Error", e);
    return null;
  }
};

export const StorageService = {
  getSettings: (): AppSettings => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.SETTINGS));
      if (data) {
        if (!data.users || data.users.length === 0) data.users = [DEFAULT_SETTINGS.users[0]];
        return data;
      }
      return DEFAULT_SETTINGS;
    } catch (e) { return DEFAULT_SETTINGS; }
  },
  
  saveSettings: (settings: AppSettings): void => {
    localStorage.setItem(KEYS.SETTINGS, encrypt(settings));
    window.dispatchEvent(new Event('settings-updated'));
    
    // Sync settings to cloud if logged in
    if (auth.currentUser) {
        FirebaseService.saveUserSettings(settings);
    }
  },

  getCurrentUser: (): User | null => {
      const userStr = sessionStorage.getItem('current_user');
      return userStr ? JSON.parse(userStr) : null;
  },

  getCatalog: (): ItemCatalogEntry[] => {
      try {
          const data = decrypt(localStorage.getItem(KEYS.CATALOG));
          return data || [];
      } catch { return []; }
  },

  saveCatalogItem: (item: ItemCatalogEntry): void => {
      const list = StorageService.getCatalog();
      const idx = list.findIndex(i => i.id === item.id || i.name.trim().toLowerCase() === item.name.trim().toLowerCase());
      if (idx >= 0) list[idx] = { ...list[idx], ...item }; // Merge to keep ID if updating by name
      else list.push(item);
      localStorage.setItem(KEYS.CATALOG, encrypt(list));
      localStorage.removeItem('pharmamind_all_item_names');
      
      const settings = StorageService.getSettings();
      if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
          FirebaseService.saveCatalogItem(item, settings.cloudConfig.groupId);
      }
  },

  deleteCatalogItem: (id: string): void => {
      const list = StorageService.getCatalog();
      const updated = list.filter(i => i.id !== id);
      localStorage.setItem(KEYS.CATALOG, encrypt(updated));
      localStorage.removeItem('pharmamind_all_item_names');
      
      const settings = StorageService.getSettings();
      if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
          FirebaseService.deleteCatalogItem(id);
      }
  },

  importCatalog: (items: ItemCatalogEntry[]): void => {
      const current = StorageService.getCatalog();
      const settings = StorageService.getSettings();
      const isCloudEnabled = settings.cloudConfig?.enabled && settings.cloudConfig?.groupId;
      
      items.forEach(newItem => {
          const existingIdx = current.findIndex(c => c.name.trim().toLowerCase() === newItem.name.trim().toLowerCase());
          let itemToSave;
          if (existingIdx >= 0) {
              itemToSave = { ...current[existingIdx], ...newItem, id: current[existingIdx].id };
              current[existingIdx] = itemToSave;
          } else {
              itemToSave = { ...newItem, id: Date.now().toString() + Math.random() };
              current.push(itemToSave);
          }
          
          if (isCloudEnabled) {
              FirebaseService.saveCatalogItem(itemToSave, settings.cloudConfig!.groupId);
          }
      });
      localStorage.setItem(KEYS.CATALOG, encrypt(current));
      localStorage.removeItem('pharmamind_all_item_names');
  },

  getSuppliers: (): Supplier[] => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.SUPPLIERS));
      return data || [];
    } catch (e) { return []; }
  },

  saveSupplier: (supplier: Supplier): void => {
    const list = StorageService.getSuppliers();
    const existingIndex = list.findIndex(s => s.id === supplier.id);
    if (existingIndex >= 0) {
        list[existingIndex] = supplier;
    } else {
        list.push(supplier);
    }
    localStorage.setItem(KEYS.SUPPLIERS, encrypt(list));
    
    const settings = StorageService.getSettings();
    if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
        FirebaseService.saveSupplier(supplier, settings.cloudConfig.groupId);
    }
  },

  deleteSupplier: (id: string): void => {
    const list = StorageService.getSuppliers();
    const updated = list.filter(s => s.id !== id);
    localStorage.setItem(KEYS.SUPPLIERS, encrypt(updated));
    
    const settings = StorageService.getSettings();
    if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
        FirebaseService.deleteSupplier(id);
    }
  },

  // --- Pending Items Logic ---
  getPendingItems: (): PendingItem[] => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.PENDING_ITEMS));
      return data || [];
    } catch { return []; }
  },

  addPendingItem: (item: PendingItem): void => {
    const list = StorageService.getPendingItems();
    list.push(item);
    localStorage.setItem(KEYS.PENDING_ITEMS, encrypt(list));
    
    const settings = StorageService.getSettings();
    if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
        FirebaseService.savePendingItem(item, settings.cloudConfig.groupId);
    }
  },

  deletePendingItem: (id: string): void => {
    const list = StorageService.getPendingItems();
    const updated = list.filter(i => i.id !== id);
    localStorage.setItem(KEYS.PENDING_ITEMS, encrypt(updated));
    
    const settings = StorageService.getSettings();
    if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
        FirebaseService.deletePendingItem(id);
    }
  },

  deletePendingItemByNameAndSupplier: (itemName: string, supplierId: string): boolean => {
      const list = StorageService.getPendingItems();
      const initialLen = list.length;
      const itemToDelete = list.find(i => i.itemName.trim().toLowerCase() === itemName.trim().toLowerCase() && i.supplierId === supplierId);
      const updated = list.filter(i => !(i.itemName.trim().toLowerCase() === itemName.trim().toLowerCase() && i.supplierId === supplierId));
      if (updated.length !== initialLen) {
          localStorage.setItem(KEYS.PENDING_ITEMS, encrypt(updated));
          
          const settings = StorageService.getSettings();
          if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId && itemToDelete) {
              FirebaseService.deletePendingItem(itemToDelete.id);
          }
          return true; // Deleted successfully
      }
      return false;
  },

  getClients: (): Client[] => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.CLIENTS));
      return data || [];
    } catch (e) { return []; }
  },

  saveClient: (client: Client): void => {
    const list = StorageService.getClients();
    const existingIndex = list.findIndex(c => c.id === client.id);
    if (existingIndex >= 0) {
        list[existingIndex] = client;
    } else {
        list.push(client);
    }
    localStorage.setItem(KEYS.CLIENTS, encrypt(list));
    
    const settings = StorageService.getSettings();
    if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
        FirebaseService.saveClient(client, settings.cloudConfig.groupId);
    }
  },

  deleteClient: (id: string): void => {
    const list = StorageService.getClients();
    const updated = list.filter(c => c.id !== id);
    localStorage.setItem(KEYS.CLIENTS, encrypt(updated));
    
    const settings = StorageService.getSettings();
    if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
        FirebaseService.deleteClient(id);
    }
  },

  getTransactions: (clientId?: string): ClientTransaction[] => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.TRANSACTIONS));
      const all = data || [];
      if (clientId) {
        return all.filter((t: ClientTransaction) => t.clientId === clientId).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      return all;
    } catch (e) { return []; }
  },

  addTransaction: (transaction: ClientTransaction): void => {
    const transactions = StorageService.getTransactions();
    transactions.push(transaction);
    localStorage.setItem(KEYS.TRANSACTIONS, encrypt(transactions));

    const settings = StorageService.getSettings();
    if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
        FirebaseService.saveTransaction(transaction, settings.cloudConfig.groupId);
    }

    const clients = StorageService.getClients();
    const clientIndex = clients.findIndex(c => c.id === transaction.clientId);
    if (clientIndex >= 0) {
        const client = clients[clientIndex];
        if (transaction.type === 'SALE') {
            client.balance += transaction.amount;
        } else {
            client.balance -= transaction.amount;
        }
        clients[clientIndex] = client;
        localStorage.setItem(KEYS.CLIENTS, encrypt(clients));
        
        if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
            FirebaseService.saveClient(client, settings.cloudConfig.groupId);
        }
    }
  },

  getInvoices: (): Invoice[] => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.INVOICES));
      return data || [];
    } catch (e) { return []; }
  },

  getInvoices2: (): Invoice[] => {
    try {
      const data = decrypt(localStorage.getItem(KEYS.INVOICES2));
      return data || [];
    } catch (e) { return []; }
  },

  getInvoiceById: (id: string): Invoice | undefined => {
      return StorageService.getInvoices().find(i => i.id === id);
  },

  saveInvoice: (invoice: Invoice): void => {
    const invoices = StorageService.getInvoices();
    const index = invoices.findIndex(i => i.id === invoice.id);
    
    if (index >= 0) {
        invoices[index] = invoice;
    } else {
        invoices.unshift(invoice);
    }
    localStorage.setItem(KEYS.INVOICES, encrypt(invoices));
    localStorage.removeItem('pharmamind_all_item_names');
    
    const settings = StorageService.getSettings();
    if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
        FirebaseService.saveInvoice(invoice, settings.cloudConfig.groupId);
    }

    // Auto-update catalog
    const catalog = StorageService.getCatalog();
    let catalogChanged = false;
    invoice.items.forEach(item => {
        const existingIdx = catalog.findIndex(c => c.name.trim().toLowerCase() === item.name.trim().toLowerCase());
        if (existingIdx === -1) {
            const newItem = {
                id: Date.now().toString() + Math.random(),
                name: item.name,
                type: item.type,
                publicPrice: item.publicPrice,
                pharmaPrice: item.pharmaPrice,
                supplierDiscountVal: item.supplierDiscountVal,
                taxValue: item.taxValue,
                taxMethod: item.taxMethod
            };
            catalog.push(newItem);
            catalogChanged = true;
            if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
                FirebaseService.saveCatalogItem(newItem, settings.cloudConfig.groupId);
            }
        } 
    });
    if (catalogChanged) localStorage.setItem(KEYS.CATALOG, encrypt(catalog));
  },

  saveInvoice2: (invoice: Invoice): void => {
    const invoices = StorageService.getInvoices2();
    const index = invoices.findIndex(i => i.id === invoice.id);
    
    if (index >= 0) {
        invoices[index] = invoice;
    } else {
        invoices.unshift(invoice);
    }
    localStorage.setItem(KEYS.INVOICES2, encrypt(invoices));
    
    // We can also sync this to cloud if needed, but for now let's keep it local or use a different collection
    // If we want to sync it, we might need a different method in FirebaseService.
    const settings = StorageService.getSettings();
    if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
        // FirebaseService.saveInvoice2(invoice, settings.cloudConfig.groupId);
    }
  },

  markInvoiceAsSold: (invoiceId: string, clientId: string): void => {
    const invoices = StorageService.getInvoices();
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    if (index >= 0) {
        invoices[index].isSold = true;
        invoices[index].soldToClientId = clientId;
        invoices[index].soldDate = new Date().toISOString();
        localStorage.setItem(KEYS.INVOICES, encrypt(invoices));
        
        const settings = StorageService.getSettings();
        if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
            FirebaseService.saveInvoice(invoices[index], settings.cloudConfig.groupId);
        }
    }

    const invoices2 = StorageService.getInvoices2();
    const index2 = invoices2.findIndex(inv => inv.id === invoiceId);
    if (index2 >= 0) {
        invoices2[index2].isSold = true;
        invoices2[index2].soldToClientId = clientId;
        invoices2[index2].soldDate = new Date().toISOString();
        localStorage.setItem(KEYS.INVOICES2, encrypt(invoices2));
    }
  },

  markInvoiceAsReturned: (invoiceId: string): void => {
    const invoices = StorageService.getInvoices();
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    if (index >= 0) {
        invoices[index].isReturned = true;
        invoices[index].returnDate = new Date().toISOString();
        localStorage.setItem(KEYS.INVOICES, encrypt(invoices));
        
        const settings = StorageService.getSettings();
        if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
            FirebaseService.saveInvoice(invoices[index], settings.cloudConfig.groupId);
        }
    }

    const invoices2 = StorageService.getInvoices2();
    const index2 = invoices2.findIndex(inv => inv.id === invoiceId);
    if (index2 >= 0) {
        invoices2[index2].isReturned = true;
        invoices2[index2].returnDate = new Date().toISOString();
        localStorage.setItem(KEYS.INVOICES2, encrypt(invoices2));
    }
  },

  unmarkInvoiceAsSold: (invoiceId: string): void => {
    const invoices = StorageService.getInvoices();
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    if (index >= 0) {
        invoices[index].isSold = false;
        invoices[index].soldToClientId = undefined;
        invoices[index].soldDate = undefined;
        localStorage.setItem(KEYS.INVOICES, encrypt(invoices));
        
        const settings = StorageService.getSettings();
        if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
            FirebaseService.saveInvoice(invoices[index], settings.cloudConfig.groupId);
        }
    }

    const invoices2 = StorageService.getInvoices2();
    const index2 = invoices2.findIndex(inv => inv.id === invoiceId);
    if (index2 >= 0) {
        invoices2[index2].isSold = false;
        invoices2[index2].soldToClientId = undefined;
        invoices2[index2].soldDate = undefined;
        localStorage.setItem(KEYS.INVOICES2, encrypt(invoices2));
    }
  },

  markInvoiceAsReviewed: (invoiceId: string, isReviewed: boolean = true): void => {
    const invoices = StorageService.getInvoices();
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    if (index >= 0) {
        invoices[index].isReviewed = isReviewed;
        invoices[index].reviewedDate = isReviewed ? new Date().toISOString() : undefined;
        localStorage.setItem(KEYS.INVOICES, encrypt(invoices));
        
        const settings = StorageService.getSettings();
        if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
            FirebaseService.saveInvoice(invoices[index], settings.cloudConfig.groupId);
        }
    }
  },

  deleteInvoice: (id: string): void => {
    const invoices = StorageService.getInvoices();
    const updated = invoices.filter(inv => inv.id !== id);
    localStorage.setItem(KEYS.INVOICES, encrypt(updated));
    localStorage.removeItem('pharmamind_all_item_names');
    
    const settings = StorageService.getSettings();
    if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
        FirebaseService.deleteInvoice(id);
    }
  },

  deleteInvoice2: (id: string): void => {
    const invoices = StorageService.getInvoices2();
    const updated = invoices.filter(inv => inv.id !== id);
    localStorage.setItem(KEYS.INVOICES2, encrypt(updated));
    
    // const settings = StorageService.getSettings();
    // if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
    //     FirebaseService.deleteInvoice2(id);
    // }
  },

  getLastPurchaseItem: (itemName: string): CalculatedItem | null => {
    const invoices = StorageService.getInvoices();
    for (const inv of invoices) {
      const found = inv.items.find(item => item.name.trim().toLowerCase() === itemName.trim().toLowerCase());
      if (found) return found;
    }
    return null;
  },

  getItemWithBonusHistory: (itemName: string): CalculatedItem | null => {
    const invoices = StorageService.getInvoices();
    for (const inv of invoices) {
      const found = inv.items.find(item => 
        item.name.trim().toLowerCase() === itemName.trim().toLowerCase() && 
        item.bonus > 0
      );
      if (found) return found;
    }
    return null;
  },

  getAllItemNames: (): string[] => {
    try {
        const cached = localStorage.getItem('pharmamind_all_item_names');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {}

    const catalogNames = StorageService.getCatalog().map(c => c.name);
    const invoiceNames = new Set<string>();
    StorageService.getInvoices().forEach(inv => {
        inv.items.forEach(item => invoiceNames.add(item.name));
    });
    const allNames = Array.from(new Set([...catalogNames, ...Array.from(invoiceNames)]));
    
    try {
        localStorage.setItem('pharmamind_all_item_names', JSON.stringify(allNames));
    } catch (e) {}
    
    return allNames;
  },
  
  getCatalogItemByName: (name: string): ItemCatalogEntry | undefined => {
      return StorageService.getCatalog().find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  },

  createBackup: (): string => {
      const backup = {
          settings: StorageService.getSettings(),
          suppliers: StorageService.getSuppliers(),
          clients: StorageService.getClients(),
          invoices: StorageService.getInvoices(),
          transactions: StorageService.getTransactions(),
          catalog: StorageService.getCatalog(),
          pending: StorageService.getPendingItems(),
          version: '2.1',
          date: new Date().toISOString()
      };
      return JSON.stringify(backup, null, 2);
  },

  restoreBackup: (jsonString: string): boolean => {
      try {
          if (!jsonString) return false;
          const cleanJson = jsonString.replace(/^\uFEFF/, '');
          const data = JSON.parse(cleanJson);
          
          if (!data || typeof data !== 'object') {
             console.error("Invalid backup format");
             return false;
          }

          if (data.settings) localStorage.setItem(KEYS.SETTINGS, encrypt(data.settings));
          if (data.suppliers) localStorage.setItem(KEYS.SUPPLIERS, encrypt(data.suppliers));
          if (data.clients) localStorage.setItem(KEYS.CLIENTS, encrypt(data.clients));
          if (data.invoices) localStorage.setItem(KEYS.INVOICES, encrypt(data.invoices));
          if (data.transactions) localStorage.setItem(KEYS.TRANSACTIONS, encrypt(data.transactions));
          if (data.catalog) localStorage.setItem(KEYS.CATALOG, encrypt(data.catalog));
          if (data.pending) localStorage.setItem(KEYS.PENDING_ITEMS, encrypt(data.pending));
          
          localStorage.removeItem('pharmamind_all_item_names');
          
          const settings = StorageService.getSettings();
          if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
              FirebaseService.syncAllDataToCloud(settings.cloudConfig.groupId);
          }
          
          return true;
      } catch (e) {
          console.error("Restore Failed", e);
          return false;
      }
  },

  // ---------------- Excel Export / Import ----------------
  
  exportBackupToExcel: async (): Promise<boolean> => {
      try {
          // 1. Prepare Data
          const suppliers = StorageService.getSuppliers();
          const clients = StorageService.getClients();
          const catalog = StorageService.getCatalog();
          const pending = StorageService.getPendingItems();
          const transactions = StorageService.getTransactions();
          const invoices = StorageService.getInvoices();
          const settings = StorageService.getSettings();

          // 2. Separate Invoice Headers from Invoice Items for relational structure
          const invoiceHeaders = invoices.map(({ items, ...rest }) => rest);
          const invoiceItems: any[] = [];
          invoices.forEach(inv => {
              inv.items.forEach(item => {
                  invoiceItems.push({
                      invoiceId: inv.id,
                      invoiceDate: inv.date,
                      ...item
                  });
              });
          });

          // 3. Create Workbook
          const wb = XLSX.utils.book_new();

          // 4. Create Sheets
          const sheetSettings = XLSX.utils.json_to_sheet([settings]);
          const sheetSuppliers = XLSX.utils.json_to_sheet(suppliers);
          const sheetClients = XLSX.utils.json_to_sheet(clients);
          const sheetCatalog = XLSX.utils.json_to_sheet(catalog);
          const sheetPending = XLSX.utils.json_to_sheet(pending);
          const sheetTrans = XLSX.utils.json_to_sheet(transactions);
          const sheetInvHeaders = XLSX.utils.json_to_sheet(invoiceHeaders);
          const sheetInvItems = XLSX.utils.json_to_sheet(invoiceItems);

          // 5. Append Sheets
          XLSX.utils.book_append_sheet(wb, sheetSettings, "Settings");
          XLSX.utils.book_append_sheet(wb, sheetSuppliers, "Suppliers");
          XLSX.utils.book_append_sheet(wb, sheetClients, "Clients");
          XLSX.utils.book_append_sheet(wb, sheetCatalog, "Catalog");
          XLSX.utils.book_append_sheet(wb, sheetPending, "PendingItems");
          XLSX.utils.book_append_sheet(wb, sheetTrans, "Transactions");
          XLSX.utils.book_append_sheet(wb, sheetInvHeaders, "Invoices_Data");
          XLSX.utils.book_append_sheet(wb, sheetInvItems, "Invoices_Items");

          const fileName = `PharmaMind_Excel_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;

          // 6. Handle Export based on Platform
          if (Capacitor.isNativePlatform()) {
              // Write to local filesystem then share
              const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
              
              try {
                const result = await Filesystem.writeFile({
                  path: fileName,
                  data: wbout,
                  directory: Directory.Documents,
                });
                
                await Share.share({
                  title: 'نسخة احتياطية PharmaMind',
                  text: 'تصدير بيانات صيدليتي الذكية',
                  url: result.uri,
                  dialogTitle: 'مشاركة ملف الإكسل',
                });
                return true;
              } catch (e) {
                console.error("Native write failed", e);
                // Fallback attempt to Cache if Documents failed (permission issues)
                try {
                    const resultCache = await Filesystem.writeFile({
                        path: fileName,
                        data: wbout,
                        directory: Directory.Cache,
                    });
                    await Share.share({
                        title: 'نسخة احتياطية',
                        url: resultCache.uri
                    });
                    return true;
                } catch (innerE) {
                     console.error("Cache write failed", innerE);
                     return false;
                }
              }
          } else {
              // Web Browser
              XLSX.writeFile(wb, fileName);
              return true;
          }
      } catch (e) {
          console.error("Excel Export Error", e);
          return false;
      }
  },

  restoreBackupFromExcel: async (file: File): Promise<boolean> => {
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const data = new Uint8Array(e.target?.result as ArrayBuffer);
                  const wb = XLSX.read(data, { type: 'array' });

                  // Helper to safe get sheet
                  const getSheet = (name: string) => {
                      return wb.Sheets[name] ? XLSX.utils.sheet_to_json(wb.Sheets[name]) : [];
                  };

                  const toBool = (val: any) => {
                      if (typeof val === 'boolean') return val;
                      if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
                      if (typeof val === 'number') return val === 1;
                      return false;
                  };

                  const toNum = (val: any) => {
                      const n = Number(val);
                      return isNaN(n) ? 0 : n;
                  };

                  const toStr = (val: any) => {
                      if (val === null || val === undefined) return '';
                      return String(val);
                  };

                  // 1. Read Sheets
                  const settingsRaw = getSheet("Settings") as any[];
                  const suppliersRaw = getSheet("Suppliers") as any[];
                  const clientsRaw = getSheet("Clients") as any[];
                  const catalogRaw = getSheet("Catalog") as any[];
                  const pendingRaw = getSheet("PendingItems") as any[];
                  const transactionsRaw = getSheet("Transactions") as any[];
                  const invHeadersRaw = getSheet("Invoices_Data") as any[];
                  const invItemsRaw = getSheet("Invoices_Items") as any[];

                  // 2. Reconstruct Invoices (Join Headers with Items)
                  const reconstructedInvoices: Invoice[] = invHeadersRaw.map(header => {
                      const items = invItemsRaw
                        .filter(i => toStr(i.invoiceId) === toStr(header.id))
                        .map(({ invoiceId, invoiceDate, ...item }) => ({
                            ...item,
                            qty: toNum(item.qty),
                            bonus: toNum(item.bonus),
                            publicPrice: toNum(item.publicPrice),
                            pharmaPrice: toNum(item.pharmaPrice),
                            supplierDiscountVal: toNum(item.supplierDiscountVal),
                            extraDiscountPct: toNum(item.extraDiscountPct),
                            taxValue: toNum(item.taxValue),
                            totalUnits: toNum(item.totalUnits),
                            netTotalCost: toNum(item.netTotalCost),
                            netUnitCost: toNum(item.netUnitCost),
                            realDiscountPct: toNum(item.realDiscountPct),
                            baseTotal: toNum(item.baseTotal),
                            typeDiscountValue: toNum(item.typeDiscountValue),
                            afterTypeDiscount: toNum(item.afterTypeDiscount),
                            extraDiscountValue: toNum(item.extraDiscountValue),
                            taxTotal: toNum(item.taxTotal),
                        }));

                      return {
                          ...header,
                          id: toStr(header.id),
                          totalValue: toNum(header.totalValue),
                          totalItems: toNum(header.totalItems),
                          totalUnits: toNum(header.totalUnits),
                          isSold: toBool(header.isSold),
                          isReviewed: toBool(header.isReviewed),
                          items: items as CalculatedItem[]
                      };
                  });

                  // 3. Process other data
                  const suppliers: Supplier[] = suppliersRaw.map(s => ({
                      ...s,
                      id: toStr(s.id),
                      discountNormal: toNum(s.discountNormal),
                      discountSpecial: toNum(s.discountSpecial),
                      discountOther: toNum(s.discountOther),
                  }));

                  const clients: Client[] = clientsRaw.map(c => ({
                      ...c,
                      id: toStr(c.id),
                      balance: toNum(c.balance),
                      discountNormal: toNum(c.discountNormal),
                      discountSpecial: toNum(c.discountSpecial),
                      discountOther: toNum(c.discountOther),
                  }));

                  const catalog: ItemCatalogEntry[] = catalogRaw.map(i => ({
                      ...i,
                      id: toStr(i.id),
                      publicPrice: toNum(i.publicPrice),
                      pharmaPrice: toNum(i.pharmaPrice),
                      supplierDiscountVal: toNum(i.supplierDiscountVal),
                      taxValue: toNum(i.taxValue),
                  }));

                  const pending: PendingItem[] = pendingRaw.map(p => ({
                      ...p,
                      id: toStr(p.id),
                  }));

                  const transactions: ClientTransaction[] = transactionsRaw.map(t => ({
                      ...t,
                      id: toStr(t.id),
                      amount: toNum(t.amount),
                  }));

                  // 4. Save to Storage (Encrypts automatically)
                  if (settingsRaw.length > 0) {
                      const s = settingsRaw[0];
                      if (s.cloudConfig && typeof s.cloudConfig === 'string') {
                          try { s.cloudConfig = JSON.parse(s.cloudConfig); } catch(e) {}
                      }
                      if (s.users && typeof s.users === 'string') {
                          try { s.users = JSON.parse(s.users); } catch(e) {}
                      }
                      localStorage.setItem(KEYS.SETTINGS, encrypt(s));
                  }
                  
                  localStorage.setItem(KEYS.SUPPLIERS, encrypt(suppliers));
                  localStorage.setItem(KEYS.CLIENTS, encrypt(clients));
                  localStorage.setItem(KEYS.CATALOG, encrypt(catalog));
                  localStorage.setItem(KEYS.PENDING_ITEMS, encrypt(pending));
                  localStorage.setItem(KEYS.TRANSACTIONS, encrypt(transactions));
                  localStorage.setItem(KEYS.INVOICES, encrypt(reconstructedInvoices));
                  localStorage.removeItem('pharmamind_all_item_names');

                  const settings = StorageService.getSettings();
                  if (settings.cloudConfig?.enabled && settings.cloudConfig?.groupId) {
                      FirebaseService.syncAllDataToCloud(settings.cloudConfig.groupId);
                  }

                  resolve(true);
              } catch (err) {
                  console.error("Excel Import Error", err);
                  resolve(false);
              }
          };
          reader.onerror = () => resolve(false);
          reader.readAsArrayBuffer(file);
      });
  }
};
