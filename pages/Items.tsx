
import React, { useState, useEffect } from 'react';
import { Package, Plus, Save, Trash2, Search, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { ItemCatalogEntry, ItemType, ItemTypeShort, TaxMethod } from '../types';

const Items: React.FC = () => {
  const [items, setItems] = useState<ItemCatalogEntry[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemCatalogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<ItemCatalogEntry>({
      id: '', name: '', type: ItemType.NORMAL, publicPrice: 0, pharmaPrice: 0, supplierDiscountVal: 0, taxValue: 0, taxMethod: TaxMethod.PER_UNIT
  });

  useEffect(() => {
    loadItems();
    window.addEventListener('cloud-data-updated', loadItems);
    return () => window.removeEventListener('cloud-data-updated', loadItems);
  }, []);

  useEffect(() => {
    const filtered = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    setFilteredItems(filtered);
  }, [searchTerm, items]);

  const loadItems = () => {
      const data = StorageService.getCatalog();
      setItems(data);
  };

  const handleSave = () => {
      if (!currentItem.name) return alert('اسم الصنف مطلوب');
      const itemToSave = { ...currentItem, id: currentItem.id || Date.now().toString() };
      StorageService.saveCatalogItem(itemToSave);
      loadItems();
      setIsEditing(false);
      setCurrentItem({ id: '', name: '', type: ItemType.NORMAL, publicPrice: 0, pharmaPrice: 0, supplierDiscountVal: 0, taxValue: 0, taxMethod: TaxMethod.PER_UNIT });
  };

  const handleEdit = (item: ItemCatalogEntry) => {
      setCurrentItem(item);
      setIsEditing(true);
  };

  const handleDelete = (id: string) => {
      if (window.confirm('حذف هذا الصنف من الدليل؟')) {
          StorageService.deleteCatalogItem(id);
          loadItems();
      }
  };

  const exportToCSV = () => {
      const headers = ['Name,Type,PublicPrice,PharmaPrice'];
      const rows = items.map(i => `${i.name},${i.type},${i.publicPrice},${i.pharmaPrice}`);
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "items_catalog.csv");
      document.body.appendChild(link);
      link.click();
  };

  const importFromCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          const rows = text.split('\n').slice(1); // Skip header
          const newItems: ItemCatalogEntry[] = [];
          
          rows.forEach(row => {
              const cols = row.split(',');
              if (cols.length >= 4) {
                  newItems.push({
                      id: '', // Will be generated
                      name: cols[0],
                      type: cols[1] as ItemType || ItemType.NORMAL,
                      publicPrice: parseFloat(cols[2]) || 0,
                      pharmaPrice: parseFloat(cols[3]) || 0
                  });
              }
          });
          
          StorageService.importCatalog(newItems);
          loadItems();
          alert(`تم استيراد ${newItems.length} صنف بنجاح`);
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Package className="text-primary-600" /> دليل الأصناف</h2>
            <p className="text-sm text-gray-500">قاعدة بيانات الأصناف لتسريع الإدخال</p>
        </div>
        <div className="flex gap-2">
            <button onClick={exportToCSV} className="bg-green-50 text-green-700 px-3 py-2 rounded-lg border border-green-200 hover:bg-green-100 flex items-center gap-1 text-sm font-bold"><Download size={16} /> تصدير</button>
            <label className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center gap-1 text-sm font-bold cursor-pointer">
                <Upload size={16} /> استيراد
                <input type="file" accept=".csv" onChange={importFromCSV} className="hidden" />
            </label>
            <button onClick={() => { setIsEditing(true); setCurrentItem({ id: '', name: '', type: ItemType.NORMAL, publicPrice: 0, pharmaPrice: 0, supplierDiscountVal: 0, taxValue: 0, taxMethod: TaxMethod.PER_UNIT }) }} className="bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 flex items-center gap-2 font-bold"><Plus size={18} /> صنف جديد</button>
        </div>
      </div>

      {isEditing && (
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-primary-100 animate-fade-in mb-6 relative">
              <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">{currentItem.id ? 'تعديل صنف' : 'إضافة صنف جديد'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1">اسم الصنف</label>
                      <input className="w-full p-2 border rounded-lg" value={currentItem.name} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">النوع</label>
                      <select className="w-full p-2 border rounded-lg bg-white" value={currentItem.type} onChange={e => setCurrentItem({...currentItem, type: e.target.value as ItemType})}>
                          {Object.values(ItemType).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
                  <div className="flex gap-2">
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">س. الجمهور</label><input type="number" className="w-full p-2 border rounded-lg" value={currentItem.publicPrice} onChange={e => setCurrentItem({...currentItem, publicPrice: parseFloat(e.target.value) || 0})} /></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">س. الصيدلي</label><input type="number" className="w-full p-2 border rounded-lg" value={currentItem.pharmaPrice} onChange={e => setCurrentItem({...currentItem, pharmaPrice: parseFloat(e.target.value) || 0})} /></div>
                  </div>
                  <div className="flex gap-2">
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">خ. مورد (قيمة)</label><input type="number" className="w-full p-2 border rounded-lg" value={currentItem.supplierDiscountVal} onChange={e => setCurrentItem({...currentItem, supplierDiscountVal: parseFloat(e.target.value) || 0})} /></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">ضريبة (قيمة)</label><input type="number" className="w-full p-2 border rounded-lg" value={currentItem.taxValue} onChange={e => setCurrentItem({...currentItem, taxValue: parseFloat(e.target.value) || 0})} /></div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">نظام الضريبة</label>
                      <select className="w-full p-2 border rounded-lg bg-white" value={currentItem.taxMethod} onChange={e => setCurrentItem({...currentItem, taxMethod: e.target.value as TaxMethod})}>
                          {Object.values(TaxMethod).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">إلغاء</button>
                  <button onClick={handleSave} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold flex items-center gap-2"><Save size={16} /> حفظ</button>
              </div>
          </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2 bg-gray-50">
              <Search className="text-gray-400" />
              <input 
                placeholder="بحث في الأصناف..." 
                className="bg-transparent outline-none flex-1 text-sm" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                      <tr>
                          <th className="p-3">اسم الصنف</th>
                          <th className="p-3">النوع</th>
                          <th className="p-3">س. جمهور</th>
                          <th className="p-3">س. صيدلي</th>
                          <th className="p-3">خ. مورد</th>
                          <th className="p-3 text-center">إجراءات</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {filteredItems.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50 group">
                              <td className="p-3 font-medium">{item.name}</td>
                              <td className="p-3"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{ItemTypeShort[item.type]}</span></td>
                              <td className="p-3">{item.publicPrice}</td>
                              <td className="p-3">{item.pharmaPrice}</td>
                              <td className="p-3 text-gray-500">{item.supplierDiscountVal || '-'}</td>
                              <td className="p-3 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEdit(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Save size={16} /></button>
                                  <button onClick={() => handleDelete(item.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                              </td>
                          </tr>
                      ))}
                      {filteredItems.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد أصناف مطابقة</td></tr>}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default Items;
