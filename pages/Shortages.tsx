
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Supplier, PendingItem } from '../types';
import { ClipboardList, Plus, Trash2, Calendar, AlertCircle } from 'lucide-react';

const Shortages: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
    
    // New Item State
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [newItemName, setNewItemName] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        const loadData = () => {
            setSuppliers(StorageService.getSuppliers());
            loadPendingItems();
        };
        
        loadData();
        window.addEventListener('cloud-data-updated', loadData);
        return () => window.removeEventListener('cloud-data-updated', loadData);
    }, []);

    const loadPendingItems = () => {
        setPendingItems(StorageService.getPendingItems());
    };

    const handleAdd = () => {
        if (!selectedSupplierId || !newItemName) return alert('الرجاء اختيار المورد واسم الصنف');
        
        const supplier = suppliers.find(s => s.id === selectedSupplierId);
        
        const item: PendingItem = {
            id: Date.now().toString(),
            supplierId: selectedSupplierId,
            supplierName: supplier?.name || 'غير معروف',
            itemName: newItemName,
            addedDate: new Date().toISOString(),
            notes: notes
        };

        StorageService.addPendingItem(item);
        loadPendingItems();
        setNewItemName('');
        setNotes('');
    };

    const handleDelete = (id: string) => {
        if (confirm('حذف هذا الصنف من القائمة؟')) {
            StorageService.deletePendingItem(id);
            loadPendingItems();
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <ClipboardList className="text-primary-600" /> النواقص والمؤجلات
            </h2>
            <p className="text-gray-500">سجل الأصناف التي تنتظرها من موردين معينين (تنبيه تلقائي عند الحساب)</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-4">
                    <h3 className="font-bold text-gray-700 border-b pb-2">تسجيل صنف مؤجل</h3>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">المورد *</label>
                        <select 
                            value={selectedSupplierId} 
                            onChange={e => setSelectedSupplierId(e.target.value)} 
                            className="w-full p-3 border rounded-xl bg-gray-50"
                        >
                            <option value="">-- اختر المورد --</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">اسم الصنف *</label>
                        <input 
                            value={newItemName} 
                            onChange={e => setNewItemName(e.target.value)} 
                            className="w-full p-3 border rounded-xl"
                            placeholder="مثال: Panadol Extra"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">ملاحظات (اختياري)</label>
                        <textarea 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            className="w-full p-3 border rounded-xl h-20"
                            placeholder="مثال: خصم إضافي 5% الشهر القادم"
                        />
                    </div>

                    <button 
                        onClick={handleAdd} 
                        className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 flex justify-center items-center gap-2"
                    >
                        <Plus size={18} /> إضافة للقائمة
                    </button>
                </div>

                {/* List */}
                <div className="md:col-span-2 space-y-4">
                    {pendingItems.length === 0 ? (
                        <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
                            <AlertCircle className="mx-auto mb-2 opacity-20" size={40} />
                            لا توجد أصناف مسجلة في قائمة النواقص
                        </div>
                    ) : (
                        pendingItems.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start group hover:border-primary-200 transition-all">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-lg text-gray-800">{item.itemName}</h4>
                                        <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded border border-primary-100">{item.supplierName}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(item.addedDate).toLocaleDateString('ar-EG')}</span>
                                        {item.notes && <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">{item.notes}</span>}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDelete(item.id)} 
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Shortages;
