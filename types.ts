
export enum ItemType {
  NORMAL = 'عادي',
  SPECIAL = 'خاص',
  OTHER = 'أخرى',
}

export const ItemTypeShort = {
  [ItemType.NORMAL]: 'REG',
  [ItemType.SPECIAL]: 'SPE',
  [ItemType.OTHER]: 'OTH',
};

export enum TaxMethod {
  PER_UNIT = 'لكل وحدة',
  TOTAL = 'إجمالي',
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: 'admin' | 'user';
  permissions: string[];
}

export interface CloudConfig {
  enabled: boolean;
  serverUrl: string;
  apiKey: string;
  groupId: string;
  lastSync?: string;
}

export interface AppSettings {
  discountNormal: number;
  discountSpecial: number;
  discountOther: number;
  pharmacyName: string;
  users: User[];
  userAvatar?: string;
  logoText?: string;
  cloudConfig?: CloudConfig; // إعدادات السحابة
  autoBackupDrive?: boolean; // نسخ احتياطي تلقائي لجوجل درايف
}

export interface ItemCatalogEntry {
  id: string;
  name: string;
  type: ItemType;
  publicPrice: number;
  pharmaPrice: number;
  supplierDiscountVal?: number;
  taxValue?: number;
  taxMethod?: TaxMethod;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  discountNormal?: number;
  discountSpecial?: number;
  discountOther?: number;
  discountNormal2?: number;
  discountSpecial2?: number;
  discountOther2?: number;
}

export interface PendingItem {
  id: string;
  itemName: string;
  supplierId: string;
  supplierName: string;
  addedDate: string;
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  balance: number;
  notes?: string;
  discountNormal?: number;
  discountSpecial?: number;
  discountOther?: number;
}

export interface ClientTransaction {
  id: string;
  clientId: string;
  date: string;
  type: 'SALE' | 'PAYMENT' | 'RETURN';
  amount: number;
  notes?: string;
  relatedInvoiceId?: string;
  invoiceNumber?: string;
}

/* Added ItemInput interface to fix missing export errors across several files */
export interface ItemInput {
  id: string;
  name: string;
  type: ItemType;
  qty: number;
  bonus: number;
  publicPrice: number;
  pharmaPrice: number;
  supplierDiscountVal: number;
  extraDiscountPct: number;
  taxValue: number;
  taxMethod: TaxMethod;
  customTypeDiscount?: number;
}

/* Updated CalculatedItem to include calculation breakdown fields produced by CalculatorService */
export interface CalculatedItem {
  id: string;
  name: string;
  type: ItemType;
  qty: number;
  bonus: number;
  publicPrice: number;
  pharmaPrice: number;
  supplierDiscountVal: number;
  extraDiscountPct: number;
  taxValue: number;
  taxMethod: TaxMethod;
  totalUnits: number;
  netTotalCost: number;
  netUnitCost: number;
  realDiscountPct: number;
  isFakeDiscount?: boolean;
  historyComparison?: 'better' | 'worse' | 'same' | 'new';
  priceDifferencePct?: number;
  baseTotal?: number;
  typeDiscountValue?: number;
  afterTypeDiscount?: number;
  extraDiscountValue?: number;
  taxTotal?: number;
  isReturned?: boolean;
  returnedQty?: number;
}

/* Updated Invoice to include soldToClientId, soldDate, and totalUnits to resolve property access errors in storage and calculator pages */
export interface Invoice {
  id: string;
  date: string;
  invoiceNumber?: string;
  notes?: string;
  supplierId?: string;
  supplierName?: string;
  items: CalculatedItem[];
  totalValue: number;
  totalItems: number;
  totalUnits?: number;
  isSold?: boolean;
  soldToClientId?: string;
  soldDate?: string;
  isReviewed?: boolean;
  reviewedDate?: string;
  isReturned?: boolean;
  returnDate?: string;
}

export const DEFAULT_USER: User = {
  id: 'admin_1',
  username: 'Abdullah',
  password: '7837047136367',
  fullName: 'Abdullah Admin',
  role: 'admin',
  permissions: ['*']
};

export const DEFAULT_SETTINGS: AppSettings = {
  discountNormal: 20,
  discountSpecial: 10,
  discountOther: 0,
  pharmacyName: 'صيدليتي الذكية',
  users: [DEFAULT_USER],
  logoText: 'PharmaMind',
  cloudConfig: {
    enabled: false,
    serverUrl: '',
    apiKey: '',
    groupId: ''
  }
};
