
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../services/storageService';
import { CalculatorService } from '../services/calculatorService';
import { Invoice, Client, ItemType, ClientTransaction, Supplier, ItemInput } from '../types';
import { FileText, Calendar, Package, ChevronDown, ChevronUp, Printer, Trash, Repeat, X, Check, Lock, UserCheck, ToggleLeft, ToggleRight, Edit, Share2, Undo, Search, FilterX } from 'lucide-react';

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const [showResellModal, setShowResellModal] = useState(false);
  const [resellInvoice, setResellInvoice] = useState<Invoice | null>(null);
  const [includeExtraDiscount, setIncludeExtraDiscount] = useState(false);
  const [resellConfig, setResellConfig] = useState({
      clientId: '',
      discountReg: 0,
      discountSpe: 0,
      discountOth: 0
  });

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnInvoice, setReturnInvoice] = useState<Invoice | null>(null);
  const [returnType, setReturnType] = useState<'SUPPLIER' | 'CLIENT'>('SUPPLIER');
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'primary' | 'target'>('primary');

  useEffect(() => {
    const loadData = () => {
      if (activeTab === 'primary') {
        setInvoices(StorageService.getInvoices());
      } else {
        setInvoices(StorageService.getInvoices2());
      }
      setClients(StorageService.getClients());
      setSuppliers(StorageService.getSuppliers());
    };
    
    loadData();
    window.addEventListener('cloud-data-updated', loadData);
    return () => window.removeEventListener('cloud-data-updated', loadData);
  }, [activeTab]);

  useEffect(() => {
    if (resellConfig.clientId) {
        const client = clients.find(c => c.id === resellConfig.clientId);
        const globalSettings = StorageService.getSettings();

        setResellConfig(prev => ({
            ...prev,
            discountReg: client?.discountNormal ?? globalSettings.discountNormal,
            discountSpe: client?.discountSpecial ?? globalSettings.discountSpecial,
            discountOth: client?.discountOther ?? globalSettings.discountOther,
        }));
    }
  }, [resellConfig.clientId]);

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      if (activeTab === 'primary') {
        StorageService.deleteInvoice(id);
        setInvoices(StorageService.getInvoices());
      } else {
        StorageService.deleteInvoice2(id);
        setInvoices(StorageService.getInvoices2());
      }
    }
  };
  
  const handleEdit = (invoice: Invoice, e: React.MouseEvent) => {
      e.stopPropagation();
      if (invoice.isSold) {
          alert('لا يمكن تعديل فاتورة تم بيعها أو توزيعها.');
          return;
      }
      navigate('/calculator', { state: { editInvoice: invoice } });
  };

  const handlePrint = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintInvoice(invoice);
    setTimeout(() => { window.print(); }, 100);
  };

  const handleShare = async (invoice: Invoice, e: React.MouseEvent) => {
      e.stopPropagation();
      if (navigator.share) {
          const text = `فاتورة من ${invoice.supplierName || 'غير محدد'}\n` +
                       `التاريخ: ${new Date(invoice.date).toLocaleDateString('ar-EG')}\n` +
                       `الإجمالي: ${invoice.totalValue.toFixed(2)} EGP\n` +
                       `عدد الأصناف: ${invoice.totalItems}`;
          try {
              await navigator.share({
                  title: 'فاتورة PharmaMind',
                  text: text,
              });
          } catch (err) {
              console.error(err);
          }
      } else {
          // If native share not supported, treat as "Save PDF" intention -> Trigger Print
          if(confirm('المشاركة المباشرة غير مدعومة على هذا الجهاز. هل تريد حفظ الفاتورة كملف PDF؟')) {
              handlePrint(invoice, e);
          }
      }
  };

  const openResellModal = (invoice: Invoice, e: React.MouseEvent) => {
      e.stopPropagation();
      if (invoice.isSold) return;
      setResellInvoice(invoice);
      setResellConfig({ clientId: '', discountReg: 0, discountSpe: 0, discountOth: 0 });
      setIncludeExtraDiscount(false);
      setShowResellModal(true);
  };

  const handleReturn = (invoice: Invoice, e: React.MouseEvent) => {
      e.stopPropagation();
      
      if (invoice.isReturned) {
          alert('هذه الفاتورة مرتجعة بالكامل.');
          return;
      }

      if (invoice.isSold) {
          setReturnInvoice(invoice);
          setReturnType('CLIENT');
          setReturnQuantities({});
          setShowReturnModal(true);
      } else {
          setReturnInvoice(invoice);
          setReturnType('SUPPLIER');
          setReturnQuantities({});
          setShowReturnModal(true);
      }
  };

  const confirmReturn = () => {
      if (!returnInvoice) return;
      
      const hasReturns = Object.values(returnQuantities).some(q => q > 0);
      if (!hasReturns) {
          alert('الرجاء تحديد كمية لمرتجع واحد على الأقل');
          return;
      }

      // 1. Update Primary Invoice
      const primaryInvoices = StorageService.getInvoices();
      const primaryInvoice = primaryInvoices.find(i => i.id === returnInvoice.id) || returnInvoice;
      const updatedPrimary = { ...primaryInvoice, items: primaryInvoice.items.map(i => ({...i})) };

      let returnSupplierValue = 0;

      Object.entries(returnQuantities).forEach(([idxStr, qty]) => {
          const idx = parseInt(idxStr);
          if (qty > 0) {
              const item = updatedPrimary.items[idx];
              const currentReturned = item.returnedQty ?? (item.isReturned ? item.totalUnits : 0);
              item.returnedQty = currentReturned + qty;
              if (item.returnedQty >= item.totalUnits) {
                  item.isReturned = true;
                  item.returnedQty = item.totalUnits;
              }
              returnSupplierValue += qty * item.netUnitCost;
          }
      });

      const allReturnedPrimary = updatedPrimary.items.every(item => item.isReturned);
      if (allReturnedPrimary && returnType === 'SUPPLIER') {
          updatedPrimary.isReturned = true;
          updatedPrimary.returnDate = new Date().toISOString();
      }

      // 2. Update Target Invoice (if exists)
      const targetInvoices = StorageService.getInvoices2();
      const targetInvoice = targetInvoices.find(i => i.id === returnInvoice.id);
      let updatedTarget: Invoice | null = null;

      if (targetInvoice) {
          updatedTarget = { ...targetInvoice, items: targetInvoice.items.map(i => ({...i})) };
          Object.entries(returnQuantities).forEach(([idxStr, qty]) => {
              const idx = parseInt(idxStr);
              if (qty > 0) {
                  const item = updatedTarget!.items[idx];
                  if (item) {
                      const currentReturned = item.returnedQty ?? (item.isReturned ? item.totalUnits : 0);
                      item.returnedQty = currentReturned + qty;
                      if (item.returnedQty >= item.totalUnits) {
                          item.isReturned = true;
                          item.returnedQty = item.totalUnits;
                      }
                  }
              }
          });

          const allReturnedTarget = updatedTarget.items.every(item => item.isReturned);
          if (allReturnedTarget && returnType === 'SUPPLIER') {
              updatedTarget.isReturned = true;
              updatedTarget.returnDate = updatedPrimary.returnDate || new Date().toISOString();
          }
      }

      if (returnType === 'CLIENT') {
          const transactions = StorageService.getTransactions(updatedPrimary.soldToClientId!);
          const saleTransaction = transactions.find(t => t.relatedInvoiceId === updatedPrimary.id && t.type === 'SALE');
          
          let returnClientAmount = returnSupplierValue;
          if (saleTransaction && updatedPrimary.totalValue > 0) {
              const proportion = returnSupplierValue / updatedPrimary.totalValue;
              returnClientAmount = saleTransaction.amount * proportion;
          }

          const transaction: ClientTransaction = {
              id: Date.now().toString(),
              clientId: updatedPrimary.soldToClientId!,
              date: new Date().toISOString(),
              type: 'RETURN',
              amount: returnClientAmount,
              notes: `مرتجع جزئي/كلي من فاتورة #${updatedPrimary.invoiceNumber || updatedPrimary.id.slice(-4)}`,
              relatedInvoiceId: updatedPrimary.id,
              invoiceNumber: updatedPrimary.invoiceNumber || updatedPrimary.id.slice(-4)
          };

          StorageService.addTransaction(transaction);
          
          if (allReturnedPrimary) {
              updatedPrimary.isSold = false;
              updatedPrimary.soldToClientId = undefined;
              updatedPrimary.soldDate = undefined;
              if (updatedTarget) {
                  updatedTarget.isSold = false;
                  updatedTarget.soldToClientId = undefined;
                  updatedTarget.soldDate = undefined;
              }
          }
          
          alert('تم عمل مرتجع من العميل بنجاح.');
      } else {
          alert('تم عمل مرتجع للمورد بنجاح.');
      }

      StorageService.saveInvoice(updatedPrimary);
      if (updatedTarget) {
          StorageService.saveInvoice2(updatedTarget);
      }

      if (activeTab === 'primary') {
          setInvoices(StorageService.getInvoices());
      } else {
          setInvoices(StorageService.getInvoices2());
      }
      setShowReturnModal(false);
  };

  const calculateSellTotal = () => {
      if (!resellInvoice) return 0;
      
      const globalSettings = StorageService.getSettings();
      let total = 0;

      resellInvoice.items.forEach(item => {
          let clientDiscountPct = 0;
          if (item.type === ItemType.NORMAL) clientDiscountPct = resellConfig.discountReg;
          else if (item.type === ItemType.SPECIAL) clientDiscountPct = resellConfig.discountSpe;
          else clientDiscountPct = resellConfig.discountOth;

          const input: ItemInput = {
              ...item,
              customTypeDiscount: clientDiscountPct,
              extraDiscountPct: includeExtraDiscount ? item.extraDiscountPct : 0,
              supplierDiscountVal: item.supplierDiscountVal
          };

          const result = CalculatorService.calculateItem(input, globalSettings);
          total += result.netTotalCost;
      });
      
      return total;
  };

  const confirmResell = () => {
      if (!resellConfig.clientId) return alert('اختر العميل');
      if (!resellInvoice) return;

      const totalAmount = calculateSellTotal();
      const transaction: ClientTransaction = {
          id: Date.now().toString(),
          clientId: resellConfig.clientId,
          date: new Date().toISOString(),
          type: 'SALE',
          amount: totalAmount,
          notes: `توزيع فاتورة #${resellInvoice.invoiceNumber || resellInvoice.id.slice(-4)} | خصومات: ${resellConfig.discountReg}%/${resellConfig.discountSpe}% | ${includeExtraDiscount ? 'مع خصم إضافي' : 'بدون إضافي'}`,
          relatedInvoiceId: resellInvoice.id,
          invoiceNumber: resellInvoice.invoiceNumber || resellInvoice.id.slice(-4)
      };

      StorageService.addTransaction(transaction);
      StorageService.markInvoiceAsSold(resellInvoice.id, resellConfig.clientId);
      
      alert('تم التوزيع بنجاح');
      setShowResellModal(false);
      if (activeTab === 'primary') {
          setInvoices(StorageService.getInvoices());
      } else {
          setInvoices(StorageService.getInvoices2());
      }
  };

  const filteredInvoices = invoices.filter(inv => {
      const normalize = (str: any) => {
          if (str == null) return '';
          return String(str)
              .toLowerCase()
              .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
              .trim();
      };
      const searchLower = normalize(searchTerm);
      
      const matchesSearch = searchLower === '' || 
          normalize(inv.invoiceNumber).includes(searchLower) ||
          normalize(inv.id).includes(searchLower) ||
          normalize(inv.supplierName).includes(searchLower) ||
          normalize(inv.notes).includes(searchLower) ||
          inv.items.some(item => normalize(item.name).includes(searchLower));
          
      const invDate = new Date(inv.date);
      const matchesStartDate = startDate === '' || invDate >= new Date(startDate);
      
      let matchesEndDate = true;
      if (endDate !== '') {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matchesEndDate = invDate <= end;
      }
      
      return matchesSearch && matchesStartDate && matchesEndDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">سجل الفواتير</h2>
          <p className="text-gray-500 mt-1">إدارة المشتريات وعمليات التوزيع للعملاء</p>
        </div>
        <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-bold">
            {filteredInvoices.length} فاتورة
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeTab === 'primary' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('primary')}
        >
          الفواتير الأساسية
        </button>
        <button
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeTab === 'target' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('target')}
        >
          الفواتير المستهدفة (التارجت)
        </button>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                  type="text" 
                  placeholder="بحث برقم الفاتورة، اسم المورد، أو اسم الصنف..." 
                  className="w-full pl-4 pr-10 py-2 border rounded-lg outline-none focus:border-primary-500"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">من:</span>
                  <input 
                      type="date" 
                      className="border rounded-lg px-3 py-2 outline-none focus:border-primary-500"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                  />
              </div>
              <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">إلى:</span>
                  <input 
                      type="date" 
                      className="border rounded-lg px-3 py-2 outline-none focus:border-primary-500"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                  />
              </div>
              {(searchTerm || startDate || endDate) && (
                  <button 
                      onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="مسح الفلاتر"
                  >
                      <FilterX size={20} />
                  </button>
              )}
          </div>
      </div>

      <div className="space-y-4">
        {filteredInvoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                <div onClick={() => toggleExpand(inv.id)} className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-gray-50 gap-4">
                    <div className="flex items-start md:items-center gap-4">
                        <div className="bg-primary-100 p-3 rounded-full text-primary-600 hidden md:block"><FileText size={24} /></div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <div className="font-bold text-gray-800 text-lg">{inv.supplierName || 'غير محدد'}</div>
                                {inv.invoiceNumber && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded border">#{inv.invoiceNumber}</span>}
                                {inv.isSold && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold flex items-center gap-1"><UserCheck size={12} /> تم التوزيع</span>}
                                {inv.isReturned && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 font-bold flex items-center gap-1"><Undo size={12} /> مرتجع</span>}
                            </div>
                            <div className="text-sm text-gray-500 flex flex-wrap items-center gap-3">
                                <span className="flex items-center gap-1"><Calendar size={14} /> {
                                    (() => {
                                        const d = new Date(inv.date);
                                        const day = String(d.getDate()).padStart(2, '0');
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const year = d.getFullYear();
                                        return `${day}/${month}/${year}`;
                                    })()
                                }</span>
                                <span className="flex items-center gap-1"><Package size={14} /> {inv.totalItems} أصناف</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-xl font-bold text-primary-700 bg-primary-50 px-3 py-1 rounded-lg">
                            {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(inv.totalValue)}
                        </div>
                        {expandedId === inv.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </div>
                </div>

                {expandedId === inv.id && (
                    <div className="border-t border-gray-100 bg-gray-50 p-6 animate-fade-in">
                        {inv.notes && (
                            <div className="mb-4 bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800">
                                <strong>ملاحظات:</strong> {inv.notes}
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right bg-white rounded-xl shadow-sm border">
                                <thead className="bg-gray-100 text-gray-600">
                                    <tr><th className="p-3">الصنف</th><th className="p-3">العدد</th><th className="p-3">سعر الجمهور</th><th className="p-3">الخصم</th><th className="p-3">الإجمالي</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {inv.items.map((item, idx) => (
                                        <tr key={idx} className={item.isReturned ? 'bg-red-50 opacity-70' : (item.returnedQty ? 'bg-orange-50/30' : '')}>
                                            <td className="p-3 font-medium">
                                                <span className={item.isReturned ? 'line-through text-red-700' : ''}>{item.name}</span>
                                                {item.isReturned ? (
                                                    <span className="mr-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">مرتجع بالكامل</span>
                                                ) : item.returnedQty ? (
                                                    <span className="mr-2 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">مرتجع جزئي ({item.returnedQty})</span>
                                                ) : null}
                                            </td>
                                            <td className="p-3">
                                                {item.totalUnits}
                                                {item.returnedQty && !item.isReturned ? <span className="text-red-500 text-xs mr-1">(-{item.returnedQty})</span> : null}
                                            </td>
                                            <td className="p-3">{(item.publicPrice || 0).toFixed(2)}</td>
                                            <td className="p-3 text-green-600 font-bold">{(item.realDiscountPct || 0).toFixed(3)}%</td>
                                            <td className={`p-3 font-bold ${item.isReturned ? 'line-through text-red-700' : ''}`}>
                                                {(item.netTotalCost || 0).toFixed(2)}
                                                {item.returnedQty && !item.isReturned ? (
                                                    <div className="text-xs text-orange-600">الباقي: {((item.totalUnits - item.returnedQty) * item.netUnitCost).toFixed(2)}</div>
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {(() => {
                            const returnValue = inv.items.reduce((sum, i) => sum + ((i.returnedQty ?? (i.isReturned ? i.totalUnits : 0)) * i.netUnitCost), 0);
                            if (returnValue > 0) {
                                return (
                                    <div className="flex flex-wrap gap-4 mt-4 bg-white p-4 rounded-xl border shadow-sm">
                                        <div className="flex-1">
                                            <div className="text-xs text-gray-500 mb-1">إجمالي الفاتورة</div>
                                            <div className="font-bold text-gray-800 text-lg">{inv.totalValue.toFixed(2)} EGP</div>
                                        </div>
                                        <div className="flex-1 border-r pr-4">
                                            <div className="text-xs text-red-500 mb-1">قيمة المرتجع</div>
                                            <div className="font-bold text-red-600 text-lg">{returnValue.toFixed(2)} EGP</div>
                                        </div>
                                        <div className="flex-1 border-r pr-4">
                                            <div className="text-xs text-green-600 mb-1">الصافي</div>
                                            <div className="font-bold text-green-700 text-xl">{(inv.totalValue - returnValue).toFixed(2)} EGP</div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <div className="flex flex-wrap justify-end gap-3 mt-6">
                            {inv.isReturned ? (
                                <div className="flex items-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-lg border border-red-200 font-bold"><Undo size={18} /> تم عمل مرتجع</div>
                            ) : inv.isSold ? (
                                <>
                                  <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg border"><Lock size={18} /> تم البيع</div>
                                  <button onClick={(e) => handleReturn(inv, e)} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"><Undo size={18} /> مرتجع من العميل</button>
                                </>
                            ) : (
                                <>
                                  <button onClick={(e) => openResellModal(inv, e)} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 shadow-md"><Repeat size={18} /> بيع وتوزيع</button>
                                  {activeTab === 'primary' && (
                                    <button onClick={(e) => handleEdit(inv, e)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Edit size={18} /> تعديل</button>
                                  )}
                                  <button onClick={(e) => handleReturn(inv, e)} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"><Undo size={18} /> مرتجع للمورد</button>
                                </>
                            )}
                            <button onClick={(e) => handleShare(inv, e)} className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700"><Share2 size={18} /> مشاركة/PDF</button>
                            <button onClick={(e) => handlePrint(inv, e)} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900"><Printer size={18} /> طباعة</button>
                            <button onClick={(e) => handleDelete(inv.id, e)} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg"><Trash size={18} /> حذف</button>
                        </div>
                    </div>
                )}
            </div>
        ))}
      </div>

      {showResellModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
                  <div className="p-5 border-b flex justify-between items-center bg-purple-600 text-white">
                      <h3 className="font-bold text-lg">توزيع الفاتورة لعميل</h3>
                      <button onClick={() => setShowResellModal(false)}><X /></button>
                  </div>
                  <div className="p-6 space-y-5">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">اختر العميل</label>
                          <select className="w-full p-3 border-2 border-gray-100 rounded-xl outline-none focus:border-purple-500 transition-all" value={resellConfig.clientId} onChange={e => setResellConfig({...resellConfig, clientId: e.target.value})}>
                              <option value="">-- اختر عميل من القائمة --</option>
                              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                          <div><label className="text-xs font-bold text-gray-500 block mb-1">عادي %</label><input type="number" className="w-full p-2 border rounded-lg text-center font-bold" value={resellConfig.discountReg} onChange={e => setResellConfig({...resellConfig, discountReg: parseFloat(e.target.value) || 0})} /></div>
                          <div><label className="text-xs font-bold text-gray-500 block mb-1">خاص %</label><input type="number" className="w-full p-2 border rounded-lg text-center font-bold" value={resellConfig.discountSpe} onChange={e => setResellConfig({...resellConfig, discountSpe: parseFloat(e.target.value) || 0})} /></div>
                          <div><label className="text-xs font-bold text-gray-500 block mb-1">أخرى %</label><input type="number" className="w-full p-2 border rounded-lg text-center font-bold" value={resellConfig.discountOth} onChange={e => setResellConfig({...resellConfig, discountOth: parseFloat(e.target.value) || 0})} /></div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-bold text-gray-700">تضمين الخصم الإضافي؟</span>
                             <button onClick={() => setIncludeExtraDiscount(!includeExtraDiscount)} className="text-purple-600">
                                {includeExtraDiscount ? <ToggleRight size={36} /> : <ToggleLeft size={36} className="text-gray-300" />}
                             </button>
                          </div>
                          <span className="text-xs text-gray-400 max-w-[150px] leading-tight text-left">سيتم إضافة نسبة الخصم الإضافي من الفاتورة الأصلية للعميل أيضاً</span>
                      </div>

                      <div className="bg-purple-50 p-6 rounded-2xl text-center border-2 border-purple-100">
                          <div className="text-xs text-purple-600 font-bold mb-1">قيمة المديونية النهائية على العميل</div>
                          <div className="text-4xl font-black text-purple-700">
                              {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(calculateSellTotal())}
                          </div>
                      </div>

                      <button onClick={confirmResell} className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-purple-500/30 hover:bg-purple-700 transition-all flex items-center justify-center gap-2"><Check /> تسجيل المديونية وتأكيد التوزيع</button>
                  </div>
              </div>
          </div>
      )}
      
      <div id="printable-area" style={{ display: 'none' }}>
        {printInvoice && (
             <div className="p-8 font-sans" dir="rtl">
                <h1 className="text-2xl font-bold mb-4 border-b pb-2">فاتورة مشتريات صيدلية</h1>
                <p><strong>المورد:</strong> {printInvoice.supplierName}</p>
                <p><strong>التاريخ:</strong> {
                    (() => {
                        const d = new Date(printInvoice.date);
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        return `${day}/${month}/${year}`;
                    })()
                }</p>
                <table className="w-full mt-6 border-collapse border">
                    <thead><tr className="bg-gray-100"><th>الصنف</th><th>العدد</th><th>سعر الجمهور</th><th>الخصم</th><th>الإجمالي</th></tr></thead>
                    <tbody>
                        {printInvoice.items.map((item, i) => (
                            <tr key={i} className="border"><td className="p-2">{item.name}</td><td className="p-2">{item.totalUnits}</td><td className="p-2">{(item.publicPrice || 0).toFixed(2)}</td><td className="p-2">{(item.realDiscountPct || 0).toFixed(3)}%</td><td className="p-2 font-bold">{(item.netTotalCost || 0).toFixed(2)}</td></tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-8 text-right font-bold text-xl">الإجمالي: {printInvoice.totalValue.toFixed(2)} EGP</div>
            </div>
        )}
      </div>

      {/* Return Modal */}
      {showReturnModal && returnInvoice && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                      <div>
                          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                              <Undo className={returnType === 'CLIENT' ? 'text-orange-500' : 'text-red-500'} />
                              {returnType === 'CLIENT' ? 'مرتجع من العميل' : 'مرتجع للمورد'}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">حدد الأصناف التي تريد إرجاعها من الفاتورة #{returnInvoice.invoiceNumber || returnInvoice.id.slice(-4)}</p>
                      </div>
                      <button onClick={() => setShowReturnModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={24} /></button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1">
                      <div className="space-y-3">
                          {returnInvoice.items.map((item, idx) => {
                              const maxReturn = item.totalUnits - (item.returnedQty || 0);
                              const isAlreadyReturned = maxReturn <= 0;
                              const currentReturnQty = returnQuantities[idx] || 0;

                              return (
                                  <div 
                                      key={idx} 
                                      className={`p-4 rounded-xl border-2 transition-all flex flex-col sm:flex-row justify-between items-center gap-4 ${
                                          isAlreadyReturned ? 'bg-gray-100 border-gray-200 opacity-60' :
                                          currentReturnQty > 0 ? 'border-orange-500 bg-orange-50' : 'border-gray-100'
                                      }`}
                                  >
                                      <div className="flex items-center gap-3 w-full sm:w-auto">
                                          <div>
                                              <div className="font-bold text-gray-800">{item.name}</div>
                                              <div className="text-xs text-gray-500">الكمية الأصلية: {item.totalUnits} | متاح للإرجاع: <span className="font-bold text-gray-800">{maxReturn}</span></div>
                                          </div>
                                      </div>
                                      
                                      <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                                          {isAlreadyReturned ? (
                                              <div className="text-sm text-red-500 font-bold">مرتجع بالكامل</div>
                                          ) : (
                                              <div className="flex items-center gap-3">
                                                  <div className="flex items-center bg-white border rounded-lg overflow-hidden">
                                                      <button 
                                                          onClick={() => setReturnQuantities(prev => ({...prev, [idx]: Math.max(0, (prev[idx] || 0) - 1)}))}
                                                          className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold border-l"
                                                      >-</button>
                                                      <input 
                                                          type="number" 
                                                          min="0" 
                                                          max={maxReturn}
                                                          value={currentReturnQty}
                                                          onChange={(e) => {
                                                              let val = parseInt(e.target.value) || 0;
                                                              if (val > maxReturn) val = maxReturn;
                                                              if (val < 0) val = 0;
                                                              setReturnQuantities(prev => ({...prev, [idx]: val}));
                                                          }}
                                                          className="w-16 text-center py-1 font-bold outline-none"
                                                      />
                                                      <button 
                                                          onClick={() => setReturnQuantities(prev => ({...prev, [idx]: Math.min(maxReturn, (prev[idx] || 0) + 1)}))}
                                                          className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold border-r"
                                                      >+</button>
                                                  </div>
                                                  <div className="text-left min-w-[80px]">
                                                      <div className="font-bold text-orange-600">{(currentReturnQty * item.netUnitCost).toFixed(2)}</div>
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>

                  <div className="p-6 border-t bg-gray-50">
                      <div className="flex justify-between items-center mb-6">
                          <div className="text-gray-500">الكمية المحددة: <span className="font-bold text-gray-800">{Object.values(returnQuantities).reduce((a, b) => a + b, 0)}</span></div>
                          <div className="text-left">
                              <div className="text-sm text-gray-500">قيمة المرتجع التقديرية</div>
                              <div className="text-2xl font-black text-orange-600">
                                  {returnInvoice.items.reduce((sum, item, idx) => sum + ((returnQuantities[idx] || 0) * item.netUnitCost), 0).toFixed(2)} EGP
                              </div>
                          </div>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => setShowReturnModal(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-white border hover:bg-gray-50">إلغاء</button>
                          <button onClick={confirmReturn} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg ${returnType === 'CLIENT' ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-600/30'}`}>
                              تأكيد المرتجع
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Invoices;
