
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Truck, Settings2 } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Supplier, Invoice } from '../types';

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [newSupplier, setNewSupplier] = useState<Supplier>({ id: '', name: '', phone: '', notes: '', discountNormal: 0, discountSpecial: 0, discountOther: 0, discountNormal2: 0, discountSpecial2: 0, discountOther2: 0 });

  useEffect(() => {
    const loadData = () => {
      setSuppliers(StorageService.getSuppliers());
      setInvoices(StorageService.getInvoices());
    };
    
    loadData();
    window.addEventListener('cloud-data-updated', loadData);
    return () => window.removeEventListener('cloud-data-updated', loadData);
  }, []);

  const handleSave = () => {
    if (!newSupplier.name) return alert('اسم المورد مطلوب');
    StorageService.saveSupplier({ ...newSupplier, id: newSupplier.id || Date.now().toString() });
    setSuppliers(StorageService.getSuppliers());
    setNewSupplier({ id: '', name: '', phone: '', notes: '', discountNormal: 0, discountSpecial: 0, discountOther: 0, discountNormal2: 0, discountSpecial2: 0, discountOther2: 0 });
  };

  const handleEdit = (s: Supplier) => setNewSupplier(s);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Truck className="text-primary-600" /> إدارة الموردين والخصومات</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-fit space-y-4">
                <h3 className="font-bold text-gray-700 mb-2 border-b pb-2">{newSupplier.id ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</h3>
                <div className="space-y-3">
                    <input className="w-full p-3 border rounded-xl" placeholder="اسم المورد" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                    <input className="w-full p-3 border rounded-xl" placeholder="رقم الهاتف" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
                    
                    <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                        <div className="text-xs font-bold text-gray-400 flex items-center gap-1 uppercase"><Settings2 size={12} /> خصومات المورد الافتراضية</div>
                        <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-[10px] text-gray-500 font-bold block">عادي %</label><input type="number" className="w-full p-2 border rounded-lg text-sm" value={newSupplier.discountNormal} onChange={e => setNewSupplier({...newSupplier, discountNormal: parseFloat(e.target.value) || 0})} /></div>
                            <div><label className="text-[10px] text-gray-500 font-bold block">خاص %</label><input type="number" className="w-full p-2 border rounded-lg text-sm" value={newSupplier.discountSpecial} onChange={e => setNewSupplier({...newSupplier, discountSpecial: parseFloat(e.target.value) || 0})} /></div>
                            <div><label className="text-[10px] text-gray-500 font-bold block">أخرى %</label><input type="number" className="w-full p-2 border rounded-lg text-sm" value={newSupplier.discountOther} onChange={e => setNewSupplier({...newSupplier, discountOther: parseFloat(e.target.value) || 0})} /></div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl space-y-3 border border-blue-100">
                        <div className="text-xs font-bold text-blue-500 flex items-center gap-1 uppercase"><Settings2 size={12} /> خصومات المورد المستهدفة (التارجت)</div>
                        <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-[10px] text-blue-600 font-bold block">عادي %</label><input type="number" className="w-full p-2 border border-blue-200 rounded-lg text-sm" value={newSupplier.discountNormal2 || 0} onChange={e => setNewSupplier({...newSupplier, discountNormal2: parseFloat(e.target.value) || 0})} /></div>
                            <div><label className="text-[10px] text-blue-600 font-bold block">خاص %</label><input type="number" className="w-full p-2 border border-blue-200 rounded-lg text-sm" value={newSupplier.discountSpecial2 || 0} onChange={e => setNewSupplier({...newSupplier, discountSpecial2: parseFloat(e.target.value) || 0})} /></div>
                            <div><label className="text-[10px] text-blue-600 font-bold block">أخرى %</label><input type="number" className="w-full p-2 border border-blue-200 rounded-lg text-sm" value={newSupplier.discountOther2 || 0} onChange={e => setNewSupplier({...newSupplier, discountOther2: parseFloat(e.target.value) || 0})} /></div>
                        </div>
                    </div>

                    <button onClick={handleSave} className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-700 shadow-lg shadow-primary-500/30 font-bold flex justify-center items-center gap-2"><Save size={18} /> {newSupplier.id ? 'تحديث' : 'حفظ المورد'}</button>
                </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {suppliers.map(s => (
                    <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm group hover:border-primary-300 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div><div className="font-bold text-gray-800 text-lg">{s.name}</div><div className="text-xs text-gray-400">{s.phone}</div></div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(s)} className="p-2 text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-100"><Save size={16} /></button>
                                <button onClick={() => { if(window.confirm('حذف المورد؟')) { StorageService.deleteSupplier(s.id); setSuppliers(StorageService.getSuppliers()); } }} className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded-xl text-center">
                                <div><div className="text-[10px] text-gray-400">عادي</div><div className="font-bold text-primary-600">{s.discountNormal}%</div></div>
                                <div><div className="text-[10px] text-gray-400">خاص</div><div className="font-bold text-primary-600">{s.discountSpecial}%</div></div>
                                <div><div className="text-[10px] text-gray-400">أخرى</div><div className="font-bold text-primary-600">{s.discountOther}%</div></div>
                            </div>
                            {(s.discountNormal2 !== undefined || s.discountSpecial2 !== undefined || s.discountOther2 !== undefined) && (
                                <div className="grid grid-cols-3 gap-2 bg-blue-50 border border-blue-100 p-2 rounded-xl text-center">
                                    <div><div className="text-[10px] text-blue-400">تارجت عادي</div><div className="font-bold text-blue-600">{s.discountNormal2 || 0}%</div></div>
                                    <div><div className="text-[10px] text-blue-400">تارجت خاص</div><div className="font-bold text-blue-600">{s.discountSpecial2 || 0}%</div></div>
                                    <div><div className="text-[10px] text-blue-400">تارجت أخرى</div><div className="font-bold text-blue-600">{s.discountOther2 || 0}%</div></div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
      </div>
    </div>
  );
};

export default Suppliers;
