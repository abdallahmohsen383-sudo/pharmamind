
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, Wallet, Save, History, ArrowDownLeft, ArrowUpRight, CheckCircle, AlertTriangle, FileText, Settings2 } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Client, ClientTransaction } from '../types';

const formatCurrency = (val: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(val);

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'settings'>('overview');
  const [isAdding, setIsAdding] = useState(false);
  const [newClient, setNewClient] = useState<Client>({ id: '', name: '', phone: '', balance: 0, notes: '', discountNormal: 0, discountSpecial: 0, discountOther: 0 });

  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentNote, setPaymentNote] = useState('');
  
  useEffect(() => {
    const refreshData = () => { 
        setClients(StorageService.getClients()); 
        if (selectedClient) {
            setTransactions(StorageService.getTransactions(selectedClient.id));
        }
    };
    refreshData();
    window.addEventListener('cloud-data-updated', refreshData);
    return () => window.removeEventListener('cloud-data-updated', refreshData);
  }, [selectedClient]);

  const refreshData = () => { 
      setClients(StorageService.getClients()); 
      if (selectedClient) {
          setTransactions(StorageService.getTransactions(selectedClient.id));
      }
  };

  const handleSaveClient = () => {
    if (!newClient.name) return alert('اسم العميل مطلوب');
    StorageService.saveClient({ ...newClient, id: newClient.id || Date.now().toString() });
    setIsAdding(false);
    setNewClient({ id: '', name: '', phone: '', balance: 0, notes: '', discountNormal: 0, discountSpecial: 0, discountOther: 0 });
    refreshData();
  };

  const handleUpdateClientSettings = () => {
      if (!selectedClient) return;
      StorageService.saveClient(selectedClient);
      alert('تم تحديث خصومات العميل بنجاح');
      refreshData();
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setTransactions(StorageService.getTransactions(client.id));
    setActiveTab('overview');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-primary-600" /> العملاء والمديونيات</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-700 flex items-center gap-2"><Plus size={18} /> عميل جديد</button>
      </div>

      {isAdding && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-fade-in space-y-4">
              <h3 className="font-bold border-b pb-2">إضافة عميل جديد</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input placeholder="اسم العميل" className="p-3 border rounded-xl" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
                  <input placeholder="رقم الهاتف" className="p-3 border rounded-xl" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                  <div className="col-span-full grid grid-cols-3 gap-3 bg-gray-50 p-4 rounded-xl">
                      <div><label className="text-xs font-bold text-gray-500 block mb-1">خصم عادي %</label><input type="number" className="w-full p-2 border rounded-lg" value={newClient.discountNormal} onChange={e => setNewClient({...newClient, discountNormal: parseFloat(e.target.value) || 0})} /></div>
                      <div><label className="text-xs font-bold text-gray-500 block mb-1">خصم خاص %</label><input type="number" className="w-full p-2 border rounded-lg" value={newClient.discountSpecial} onChange={e => setNewClient({...newClient, discountSpecial: parseFloat(e.target.value) || 0})} /></div>
                      <div><label className="text-xs font-bold text-gray-500 block mb-1">خصم أخرى %</label><input type="number" className="w-full p-2 border rounded-lg" value={newClient.discountOther} onChange={e => setNewClient({...newClient, discountOther: parseFloat(e.target.value) || 0})} /></div>
                  </div>
              </div>
              <div className="flex gap-2 justify-end">
                  <button onClick={() => setIsAdding(false)} className="px-6 py-2 rounded-lg text-gray-500 hover:bg-gray-100">إلغاء</button>
                  <button onClick={handleSaveClient} className="bg-primary-600 text-white px-8 py-2 rounded-lg shadow-lg font-bold">حفظ العميل</button>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
              {clients.map(client => (
                  <div key={client.id} onClick={() => handleSelectClient(client)} className={`bg-white p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedClient?.id === client.id ? 'border-primary-500 bg-primary-50/30' : 'border-gray-100 hover:border-gray-200'}`}>
                      <div className="flex justify-between items-center">
                          <div><div className="font-bold text-gray-800">{client.name}</div><div className="text-xs text-gray-400">{client.phone || 'بدون هاتف'}</div></div>
                          <div className={`font-bold ${client.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatCurrency(client.balance)}</div>
                      </div>
                  </div>
              ))}
          </div>

          <div className="lg:col-span-2">
              {selectedClient ? (
                  <div className="space-y-6">
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
                          <div><h3 className="text-2xl font-bold text-gray-800">{selectedClient.name}</h3><p className="text-sm text-gray-500">ID: {selectedClient.id}</p></div>
                          <div className="text-left"><div className="text-xs text-gray-400 font-bold uppercase">الرصيد الكلي</div><div className={`text-3xl font-black ${selectedClient.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(selectedClient.balance)}</div></div>
                      </div>

                      <div className="flex gap-6 border-b text-sm font-bold">
                          <button onClick={() => setActiveTab('overview')} className={`pb-3 px-2 ${activeTab === 'overview' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400'}`}>الحساب والسداد</button>
                          <button onClick={() => setActiveTab('settings')} className={`pb-3 px-2 ${activeTab === 'settings' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-400'}`}>خصومات العميل</button>
                      </div>

                      {activeTab === 'overview' && (
                          <div className="animate-fade-in space-y-6">
                              <div className="bg-green-50 p-6 rounded-2xl border-2 border-green-100">
                                  <h4 className="font-bold mb-4 text-green-800 flex items-center gap-2"><Wallet /> تسجيل دفعة نقدية</h4>
                                  <div className="flex gap-3">
                                      <input type="number" placeholder="المبلغ" className="flex-1 p-3 border rounded-xl" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))} />
                                      <input type="text" placeholder="البيان" className="flex-[2] p-3 border rounded-xl" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} />
                                      <button onClick={() => {
                                          if (!paymentAmount) return;
                                          StorageService.addTransaction({ id: Date.now().toString(), clientId: selectedClient.id, date: new Date().toISOString(), type: 'PAYMENT', amount: Number(paymentAmount), notes: paymentNote || 'تسديد نقدية' });
                                          refreshData();
                                          handleSelectClient(StorageService.getClients().find(c => c.id === selectedClient.id)!);
                                      }} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold">سداد</button>
                                  </div>
                              </div>

                              <div className="bg-white p-6 rounded-2xl border border-gray-100">
                                  <h4 className="font-bold mb-4 flex items-center gap-2 text-gray-700"><History size={20} /> سجل الحركات</h4>
                                  {transactions.length === 0 ? (
                                      <p className="text-gray-400 text-center py-8">لا توجد حركات مسجلة</p>
                                  ) : (
                                      <div className="space-y-3">
                                          {transactions.map(t => (
                                              <div key={t.id} className="flex justify-between items-center p-4 rounded-xl border border-gray-50 bg-gray-50/50">
                                                  <div className="flex items-center gap-4">
                                                      {t.type === 'SALE' ? <ArrowUpRight className="text-red-500" /> : t.type === 'RETURN' ? <ArrowDownLeft className="text-orange-500" /> : <ArrowDownLeft className="text-green-500" />}
                                                      <div>
                                                          <div className="font-bold text-gray-800">{t.type === 'SALE' ? 'فاتورة مبيعات' : t.type === 'RETURN' ? 'مرتجع فاتورة' : 'سداد نقدية'}</div>
                                                          <div className="text-xs text-gray-500">{
                                                              (() => {
                                                                  const d = new Date(t.date);
                                                                  const day = String(d.getDate()).padStart(2, '0');
                                                                  const month = String(d.getMonth() + 1).padStart(2, '0');
                                                                  const year = d.getFullYear();
                                                                  const time = d.toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'});
                                                                  return `${day}/${month}/${year} ${time}`;
                                                              })()
                                                          } - {t.notes}</div>
                                                      </div>
                                                  </div>
                                                  <div className={`font-bold ${t.type === 'SALE' ? 'text-red-600' : t.type === 'RETURN' ? 'text-orange-600' : 'text-green-600'}`}>
                                                      {t.type === 'SALE' ? '+' : '-'}{formatCurrency(t.amount)}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      {activeTab === 'settings' && (
                          <div className="bg-white p-6 rounded-2xl border border-gray-100 animate-fade-in">
                              <h4 className="font-bold mb-6 flex items-center gap-2 text-gray-700"><Settings2 size={20} /> تخصيص خصومات لهذا العميل</h4>
                              <p className="text-sm text-gray-400 mb-6">ملاحظة: هذه الخصومات سيتم اقتراحها تلقائياً عند بيع أي فاتورة لهذا العميل.</p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div><label className="block text-sm font-bold text-gray-600 mb-2">خصم العادي %</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white" value={selectedClient.discountNormal || 0} onChange={e => setSelectedClient({...selectedClient, discountNormal: parseFloat(e.target.value) || 0})} /></div>
                                  <div><label className="block text-sm font-bold text-gray-600 mb-2">خصم الخاص %</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white" value={selectedClient.discountSpecial || 0} onChange={e => setSelectedClient({...selectedClient, discountSpecial: parseFloat(e.target.value) || 0})} /></div>
                                  <div><label className="block text-sm font-bold text-gray-600 mb-2">خصم أخرى %</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white" value={selectedClient.discountOther || 0} onChange={e => setSelectedClient({...selectedClient, discountOther: parseFloat(e.target.value) || 0})} /></div>
                              </div>
                              <button onClick={handleUpdateClientSettings} className="mt-8 bg-primary-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20"><Save size={18} /> حفظ التعديلات</button>
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border-2 border-dashed border-gray-100"><Users size={48} className="mb-2 opacity-20" /><p>اختر عميل لعرض التفاصيل</p></div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Clients;
