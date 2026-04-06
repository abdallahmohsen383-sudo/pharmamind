
import { ItemInput, CalculatedItem, AppSettings, TaxMethod, ItemType } from '../types';
import { StorageService } from './storageService';

export const CalculatorService = {
  calculateItem: (input: ItemInput, settings: AppSettings): CalculatedItem => {
    const {
      type,
      qty,
      bonus,
      pharmaPrice,
      publicPrice,
      supplierDiscountVal,
      extraDiscountPct,
      taxValue,
      taxMethod,
      customTypeDiscount
    } = input;

    // 1. تحديد نسبة خصم النوع (الأولوية للخصم الممرر من المورد، ثم الإعدادات)
    let typeDiscountPct = 0;
    
    if (customTypeDiscount !== undefined && customTypeDiscount >= 0) {
        typeDiscountPct = customTypeDiscount;
    } else {
        switch (type) {
            case ItemType.NORMAL: typeDiscountPct = settings.discountNormal; break;
            case ItemType.SPECIAL: typeDiscountPct = settings.discountSpecial; break;
            case ItemType.OTHER: typeDiscountPct = settings.discountOther; break;
        }
    }

    // 2. الحسابات المالية
    const baseTotal = pharmaPrice * qty; // (سعر الصيدلي × الكمية)
    const totalUnits = qty + bonus;

    // خصم النوع (يُحسب من إجمالي سعر الصيدلي المبدئي)
    const typeDiscountValue = baseTotal * (typeDiscountPct / 100);
    
    // الخصم الإضافي (يُحسب من إجمالي سعر الصيدلي المبدئي مباشرة)
    const extraDiscountValue = baseTotal * (extraDiscountPct / 100);
    
    // الصافي بعد طرح خصم النوع والخصم الإضافي
    let subTotal = baseTotal - typeDiscountValue - extraDiscountValue;

    // تعديل خصم المورد (قيمة نقدية): يُضرب في الكمية الأساسية (بدون البونص) ويُجمع للصافي (أو يطرح حسب المفهوم، هنا نتبع المنطق السابق: إضافة تكلفة أو خصم سلبي)
    // تنويه: في النسخ السابقة طلبت "جمعه"، سنبقيه كما هو.
    const totalSupplierAdjustment = supplierDiscountVal * qty;
    subTotal = subTotal + totalSupplierAdjustment;

    // 3. حساب الضريبة
    let taxTotal = 0;
    if (taxMethod === TaxMethod.PER_UNIT) {
      // الضريبة تُحسب على كل الوحدات الموجودة فعلياً (الأساسية + البونص)
      taxTotal = taxValue * totalUnits;
    } else {
      // الضريبة مبلغ مقطوع على إجمالي الصنف
      taxTotal = taxValue;
    }

    // 4. الإجمالي النهائي للصنف
    const netTotalCost = subTotal + taxTotal;

    // 5. صافي تكلفة القطعة الواحدة
    const netUnitCost = totalUnits > 0 ? netTotalCost / totalUnits : 0;

    // 6. الخصم الحقيقي النهائي (مقارنة التكلفة بسعر الجمهور)
    const realDiscountPct = publicPrice > 0 ? (1 - (netUnitCost / publicPrice)) * 100 : 0;

    const result: CalculatedItem = {
      ...input,
      totalUnits,
      baseTotal,
      typeDiscountValue,
      afterTypeDiscount: baseTotal - typeDiscountValue,
      extraDiscountValue,
      taxTotal,
      netTotalCost,
      netUnitCost,
      realDiscountPct,
      historyComparison: 'new',
      isFakeDiscount: false
    };

    // مقارنة التاريخ
    const lastPurchase = StorageService.getLastPurchaseItem(input.name);
    if (lastPurchase) {
      const diff = netUnitCost - lastPurchase.netUnitCost;
      const pctDiff = lastPurchase.netUnitCost > 0 ? (diff / lastPurchase.netUnitCost) * 100 : 0;
      result.priceDifferencePct = Math.abs(pctDiff);
      
      if (diff < -0.001) result.historyComparison = 'better';
      else if (diff > 0.001) result.historyComparison = 'worse';
      else result.historyComparison = 'same';
    }

    // كشف الخصم الوهمي
    if (realDiscountPct < (typeDiscountPct + extraDiscountPct - 1)) {
      result.isFakeDiscount = true;
    }

    return result;
  }
};
