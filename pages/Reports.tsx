
import React, { useMemo, useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { TrendingUp, ShoppingBag, DollarSign, Percent, Gift, Search, Share2, Filter, AlertCircle, ArrowUp, ArrowDown, CheckCircle, Circle, FileDown, Printer } from 'lucide-react';
import { Invoice, Supplier, CalculatedItem } from '../types';

const Reports: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoices2, setInvoices2] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeTab, setActiveTab] = useState<'monthly' | 'extra_discount' | 'items_analysis' | 'supplier_invoices'>('monthly');

  // Monthly Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Extra Discount Filters
  const [edStartDate, setEdStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [edEndDate, setEdEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [edSupplierId, setEdSupplierId] = useState('');

  // Item Analysis Filters
  const [iaSearch, setIaSearch] = useState('');
  const [iaFilterType, setIaFilterType] = useState<'all' | 'bonus' | 'tax' | 'price_change'>('all');

  // Supplier Invoices Filters
  const [siSupplierId, setSiSupplierId] = useState('');
  const [siStartDate, setSiStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [siEndDate, setSiEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [siViewMode, setSiViewMode] = useState<'totals' | 'items'>('totals');
  
  // Global Invoice Type Toggle
  const [globalInvoiceType, setGlobalInvoiceType] = useState<'primary' | 'target'>('primary');

  const activeInvoices = globalInvoiceType === 'primary' ? invoices : invoices2;

  useEffect(() => {
    const loadData = () => {
      setInvoices(StorageService.getInvoices());
      setInvoices2(StorageService.getInvoices2());
      setSuppliers(StorageService.getSuppliers());
    };
    
    loadData();
    window.addEventListener('cloud-data-updated', loadData);
    return () => window.removeEventListener('cloud-data-updated', loadData);
  }, []);

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const shareOrDownloadFile = async (blob: Blob, filename: string, title: string) => {
      const file = new File([blob], filename, { type: blob.type });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
              await navigator.share({
                  files: [file],
                  title: title,
              });
              return;
          } catch (error) {
              console.error('Error sharing:', error);
          }
      }
      
      // Fallback to download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
      const d = new Date();
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      
      const formatCurrency = (val: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(val);
      
      const reportText = `تقرير PharmaMind - ${day}/${month}/${year}\n` +
      `عدد الفواتير: ${stats.invoiceCount}\n` +
      `إجمالي المشتريات: ${formatCurrency(stats.totalSpent)}\n` +
      `إجمالي المرتجعات: ${formatCurrency(stats.totalReturns)}\n` +
      `الصافي: ${formatCurrency(stats.netSpent)}\n` +
      `متوسط الخصم: ${stats.avgDiscount.toFixed(2)}%`;
      
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'تقرير صيدليتي الذكية',
                  text: reportText,
              });
          } catch (err) { console.error(err); }
      } else {
          // Fallback to clipboard
          navigator.clipboard.writeText(reportText);
          alert('تم نسخ ملخص التقرير للحافظة');
      }
  };

  const exportToExcelAndShare = (data: any[], fileName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    shareOrDownloadFile(blob, `${fileName}.xlsx`, `مشاركة تقرير ${fileName}`);
  };

  const exportAoaToExcelAndShare = (aoa: any[][], fileName: string) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    shareOrDownloadFile(blob, `${fileName}.xlsx`, `مشاركة تقرير ${fileName}`);
  };

  const exportToPdfAndShare = async (elementId: string, fileName: string) => {
      const element = document.getElementById(elementId);
      if (!element) return;
      
      // Temporarily hide no-print elements
      const noPrintElements = element.querySelectorAll('.no-print');
      noPrintElements.forEach(el => (el as HTMLElement).style.display = 'none');
      
      try {
          const canvas = await html2canvas(element, {
              scale: 2,
              useCORS: true,
              logging: false
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
              orientation: canvas.width > canvas.height ? 'l' : 'p',
              unit: 'mm',
              format: 'a4'
          });
          
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          
          const pdfBlob = pdf.output('blob');
          await shareOrDownloadFile(pdfBlob, `${fileName}.pdf`, `مشاركة تقرير ${fileName}`);
          
      } finally {
          // Restore no-print elements
          noPrintElements.forEach(el => (el as HTMLElement).style.display = '');
      }
  };

  // Monthly Stats Logic
  const stats = useMemo(() => {
    const filtered = activeInvoices.filter(inv => {
      const d = new Date(inv.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    const totalSpent = filtered.reduce((sum, inv) => sum + (inv.isReturned ? 0 : inv.totalValue), 0);
    const totalReturns = filtered.reduce((sum, inv) => {
        if (inv.isReturned) return sum + inv.totalValue;
        // Also count partial returns inside non-return invoices
        const partialReturns = inv.items.reduce((pSum, item) => {
            if (item.isReturned) return pSum + (item.netTotalCost || 0);
            if (item.returnedQty && item.returnedQty > 0) return pSum + (item.returnedQty * (item.netUnitCost || 0));
            return pSum;
        }, 0);
        return sum + partialReturns;
    }, 0);
    const invoiceCount = filtered.filter(i => !i.isReturned).length;
    const returnCount = filtered.filter(i => i.isReturned || i.items.some(it => it.isReturned || (it.returnedQty && it.returnedQty > 0))).length;
    
    let totalDiscountPoints = 0;
    let totalItems = 0;
    
    filtered.forEach(inv => {
        if (inv.isReturned) return;
        inv.items.forEach(item => {
            totalDiscountPoints += item.realDiscountPct;
            totalItems++;
        });
    });
    
    const avgDiscount = totalItems > 0 ? totalDiscountPoints / totalItems : 0;

    const dailyData = new Array(31).fill(0).map((_, i) => ({ day: i + 1, amount: 0, returns: 0 }));
    filtered.forEach(inv => {
        const day = new Date(inv.date).getDate();
        if(dailyData[day-1]) {
            if (inv.isReturned) {
                dailyData[day-1].returns += inv.totalValue;
            } else {
                dailyData[day-1].amount += inv.totalValue;
                // Subtract partial returns from daily amount or add to returns?
                // Let's add to returns for clarity
                const partialReturns = inv.items.reduce((pSum, item) => {
                    if (item.isReturned) return pSum + (item.netTotalCost || 0);
                    if (item.returnedQty && item.returnedQty > 0) return pSum + (item.returnedQty * (item.netUnitCost || 0));
                    return pSum;
                }, 0);
                dailyData[day-1].returns += partialReturns;
            }
        }
    });

    const netSpent = totalSpent - totalReturns;

    return { totalSpent, totalReturns, netSpent, invoiceCount, returnCount, avgDiscount, dailyData: dailyData.filter(d => d.amount > 0 || d.returns > 0) };
  }, [activeInvoices, selectedMonth, selectedYear]);

  // Extra Discount Stats Logic
  const extraDiscountStats = useMemo(() => {
      const filteredItems: any[] = [];
      let totalExtraValue = 0;

      activeInvoices.forEach(inv => {
          const d = inv.date.split('T')[0];
          // Filter by Date
          if (d < edStartDate || d > edEndDate) return;
          // Filter by Supplier
          if (edSupplierId && inv.supplierId !== edSupplierId) return;

          inv.items.forEach(item => {
              // Check if item has extra discount
              if ((item.extraDiscountValue || 0) > 0 || item.extraDiscountPct > 0) {
                  filteredItems.push({
                      ...item,
                      supplierName: inv.supplierName,
                      invDate: inv.date,
                      isInvoiceReturned: inv.isReturned
                  });
                  if (!inv.isReturned && !item.isReturned) {
                      totalExtraValue += item.extraDiscountValue || 0;
                  }
              }
          });
      });

      return { items: filteredItems, totalExtraValue };
  }, [activeInvoices, edStartDate, edEndDate, edSupplierId]);

  // Item Analysis Logic
  const itemAnalysisData = useMemo(() => {
      const allItems: any[] = [];
      activeInvoices.forEach(inv => {
          inv.items.forEach(item => {
              allItems.push({
                  ...item,
                  supplierName: inv.supplierName,
                  invDate: inv.date,
                  isInvoiceReturned: inv.isReturned
              });
          });
      });

      return allItems.filter(item => {
          const matchesSearch = item.name.toLowerCase().includes(iaSearch.toLowerCase());
          if (!matchesSearch) return false;

          if (iaFilterType === 'bonus') return item.bonus > 0;
          if (iaFilterType === 'tax') return item.taxValue > 0;
          if (iaFilterType === 'price_change') return item.historyComparison === 'better' || item.historyComparison === 'worse';
          
          return true;
      }).sort((a, b) => new Date(b.invDate).getTime() - new Date(a.invDate).getTime());
  }, [activeInvoices, iaSearch, iaFilterType]);

  // Supplier Invoices Logic
  const supplierInvoicesData = useMemo(() => {
      return activeInvoices.filter(inv => {
          const d = inv.date.split('T')[0];
          if (d < siStartDate || d > siEndDate) return false;
          if (siSupplierId && inv.supplierId !== siSupplierId) return false;
          return true;
      }).map(inv => {
          let returnValue = 0;
          if (inv.isReturned) {
              returnValue = inv.totalValue;
          } else {
              returnValue = inv.items.reduce((sum, item) => {
                  if (item.isReturned) {
                      return sum + (item.netTotalCost || 0);
                  } else if (item.returnedQty && item.returnedQty > 0) {
                      return sum + (item.returnedQty * (item.netUnitCost || 0));
                  }
                  return sum;
              }, 0);
          }

          return {
              ...inv,
              returnValue
          };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeInvoices, siStartDate, siEndDate, siSupplierId]);

  const siSummary = useMemo(() => {
      const totalInvoices = supplierInvoicesData.length;
      const totalValue = supplierInvoicesData.reduce((sum, inv) => sum + inv.totalValue, 0);
      const totalReturns = supplierInvoicesData.reduce((sum, inv) => sum + inv.returnValue, 0);
      const netValue = totalValue - totalReturns;
      
      return { totalInvoices, totalValue, totalReturns, netValue };
  }, [supplierInvoicesData]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 rtl pb-24">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">التقارير والإحصائيات</h1>
                <p className="text-gray-500">نظرة شاملة على أداء الصيدلية</p>
            </div>
            <div className="flex flex-col gap-3">
                <div className="flex bg-gray-100 p-1 rounded-xl self-end">
                    <button 
                        onClick={() => setActiveTab('monthly')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'monthly' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        التقرير الشهري
                    </button>
                    <button 
                        onClick={() => setActiveTab('supplier_invoices')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'supplier_invoices' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        فواتير الموردين
                    </button>
                    <button 
                        onClick={() => setActiveTab('extra_discount')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'extra_discount' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        الخصم الإضافي
                    </button>
                    <button 
                        onClick={() => setActiveTab('items_analysis')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'items_analysis' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        تحليل الأصناف
                    </button>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg self-end">
                    <button 
                        onClick={() => setGlobalInvoiceType('primary')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${globalInvoiceType === 'primary' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        الفواتير الأساسية
                    </button>
                    <button 
                        onClick={() => setGlobalInvoiceType('target')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${globalInvoiceType === 'target' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        الفواتير المستهدفة (التارجت)
                    </button>
                </div>
            </div>
        </div>

        {/* MONTHLY REPORT VIEW */}
        {activeTab === 'monthly' && (
        <div id="printable-area" className="space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">التقرير الشهري</h2>
                    <p className="text-gray-500">تحليل المشتريات والخصومات</p>
                </div>
                <div className="flex gap-2 no-print">
                    <button onClick={() => exportToPdfAndShare('printable-area', 'التقرير_الشهري')} className="bg-gray-100 p-2 rounded-lg text-gray-600 hover:bg-gray-200" title="طباعة PDF"><Printer size={20} /></button>
                    <button onClick={handleShare} className="bg-gray-100 p-2 rounded-lg text-gray-600 hover:bg-gray-200"><Share2 size={20} /></button>
                    <select 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="p-2 border rounded-lg bg-gray-50"
                    >
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="p-2 border rounded-lg bg-gray-50"
                    >
                        {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white shadow-lg shadow-primary-500/20">
                    <div className="flex items-center gap-3 mb-2 opacity-90">
                        <DollarSign />
                        <span>إجمالي المشتريات</span>
                    </div>
                    <div className="text-3xl font-bold">
                        {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(stats.totalSpent)}
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-gray-500">
                        <ShoppingBag className="text-orange-500" />
                        <span>عدد الفواتير</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-800">
                        {stats.invoiceCount}
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-gray-500">
                        <Percent className="text-green-500" />
                        <span>متوسط الخصم الحقيقي</span>
                    </div>
                    <div className="text-3xl font-bold text-gray-800">
                        {stats.avgDiscount.toFixed(2)}%
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-500/20">
                    <div className="flex items-center gap-3 mb-2 opacity-90">
                        <TrendingUp />
                        <span>الصافي</span>
                    </div>
                    <div className="text-3xl font-bold">
                        {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(stats.netSpent)}
                    </div>
                </div>

                {stats.totalReturns > 0 && (
                    <div className="bg-red-50 rounded-2xl p-6 border border-red-100 shadow-sm md:col-span-4">
                        <div className="flex items-center gap-3 mb-2 text-red-600">
                            <AlertCircle />
                            <span>إجمالي المرتجعات هذا الشهر</span>
                        </div>
                        <div className="text-3xl font-bold text-red-700">
                            {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(stats.totalReturns)}
                        </div>
                        <div className="text-sm text-red-500 mt-1">عدد فواتير المرتجع: {stats.returnCount}</div>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                    <TrendingUp size={20} /> تحليل الإنفاق اليومي
                </h3>
                <div className="h-64 w-full">
                    {stats.dailyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.dailyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="day" />
                                <YAxis />
                                <Tooltip 
                                    formatter={(value) => [`${value} EGP`, 'القيمة']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            لا توجد بيانات لعرضها لهذا الشهر
                        </div>
                    )}
                </div>
            </div>
        </div>
        )}

        {/* EXTRA DISCOUNT REPORT VIEW */}
        {activeTab === 'extra_discount' && (
            <div id="printable-area" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap gap-4 items-end mb-6 pb-6 border-b no-print">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                      <input type="date" className="p-2 border rounded-lg" value={edStartDate} onChange={e => setEdStartDate(e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                      <input type="date" className="p-2 border rounded-lg" value={edEndDate} onChange={e => setEdEndDate(e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">المورد</label>
                      <select 
                          value={edSupplierId} 
                          onChange={e => setEdSupplierId(e.target.value)}
                          className="p-2 border rounded-lg min-w-[200px]"
                      >
                          <option value="">جميع الموردين</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>
                   <div className="flex gap-2">
                      <button 
                          onClick={() => exportToExcelAndShare(extraDiscountStats.items.map(item => ({
                              'التاريخ': formatDate(item.invDate),
                              'الصنف': item.name,
                              'المورد': item.supplierName,
                              'نسبة الخصم': item.extraDiscountPct,
                              'قيمة الخصم': item.extraDiscountValue,
                              'الحالة': item.isInvoiceReturned ? 'مرتجع' : 'سليم'
                          })), 'تقرير_الخصم_الإضافي')}
                          className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
                          title="تصدير Excel"
                      >
                          <FileDown size={20} />
                      </button>
                      <button 
                          onClick={() => exportToPdfAndShare('printable-area', 'تقرير_الخصم_الإضافي')}
                          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                          title="طباعة PDF"
                      >
                          <Printer size={20} />
                      </button>
                   </div>
                </div>

                <div className="mb-6 bg-green-50 text-green-800 p-4 rounded-xl flex items-center gap-3 border border-green-100">
                    <div className="bg-white p-2 rounded-full text-green-600"><Gift size={24} /></div>
                    <div>
                        <div className="text-sm">إجمالي قيمة الخصومات الإضافية في الفترة المحددة</div>
                        <div className="text-2xl font-bold">{extraDiscountStats.totalExtraValue.toFixed(2)} EGP</div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="p-3">التاريخ</th>
                                <th className="p-3">الصنف</th>
                                <th className="p-3">المورد</th>
                                <th className="p-3">نسبة الخصم الإضافي</th>
                                <th className="p-3">قيمة الخصم الإضافي</th>
                                <th className="p-3">إجمالي الصنف</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {extraDiscountStats.items.map((item, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="p-3 text-gray-500">{formatDate(item.invDate)}</td>
                                    <td className="p-3 font-medium">
                                        {item.name}
                                        {item.isInvoiceReturned && <span className="mr-2 bg-red-100 text-red-600 px-1.5 rounded text-[10px] font-bold">مرتجع</span>}
                                    </td>
                                    <td className="p-3">{item.supplierName || '-'}</td>
                                    <td className="p-3 text-green-600 font-bold">{item.extraDiscountPct}%</td>
                                    <td className="p-3 font-mono">{item.extraDiscountValue.toFixed(2)}</td>
                                    <td className="p-3">{item.netTotalCost.toFixed(2)}</td>
                                </tr>
                            ))}
                            {extraDiscountStats.items.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">لا توجد أصناف بخصم إضافي في هذه الفترة</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* SUPPLIER INVOICES REPORT VIEW */}
        {activeTab === 'supplier_invoices' && (
            <div id="printable-area" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-wrap gap-4 items-end mb-6 pb-6 border-b no-print">
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">المورد</label>
                      <select 
                          value={siSupplierId} 
                          onChange={e => setSiSupplierId(e.target.value)}
                          className="p-2 border rounded-lg min-w-[200px]"
                      >
                          <option value="">جميع الموردين</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                      <input type="date" className="p-2 border rounded-lg" value={siStartDate} onChange={e => setSiStartDate(e.target.value)} />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                      <input type="date" className="p-2 border rounded-lg" value={siEndDate} onChange={e => setSiEndDate(e.target.value)} />
                   </div>
                   <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button 
                          onClick={() => setSiViewMode('totals')}
                          className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${siViewMode === 'totals' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                      >
                          إجماليات
                      </button>
                      <button 
                          onClick={() => setSiViewMode('items')}
                          className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${siViewMode === 'items' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                      >
                          أصناف
                      </button>
                   </div>
                   <div className="flex gap-2">
                      <button 
                          onClick={() => {
                              let aoaData: any[][] = [];
                              
                              // Add Summary
                              aoaData.push(['ملخص التقرير:']);
                              aoaData.push(['عدد الفواتير', siSummary.totalInvoices]);
                              aoaData.push(['إجمالي المشتريات', siSummary.totalValue.toFixed(2)]);
                              aoaData.push(['إجمالي المرتجعات', siSummary.totalReturns.toFixed(2)]);
                              aoaData.push(['الصافي', siSummary.netValue.toFixed(2)]);
                              aoaData.push([]); // Empty row
                              
                              if (siViewMode === 'items') {
                                  // Headers for items view
                                  aoaData.push([
                                      'التاريخ', 'رقم الفاتورة', 'المورد', 'قيمة الفاتورة', 'قيمة المرتجع', 'الصافي',
                                      'الصنف', 'الكمية', 'المرتجع', 'البونص', 'سعر الجمهور', 'سعر الصيدلي', 'صافي الصنف', 'حالة الصنف'
                                  ]);
                                  
                                  supplierInvoicesData.forEach(inv => {
                                      inv.items.forEach((item, index) => {
                                          if (index === 0) {
                                              // First item: include invoice details
                                              aoaData.push([
                                                  formatDate(inv.date),
                                                  inv.invoiceNumber || '-',
                                                  inv.supplierName,
                                                  inv.totalValue.toFixed(2),
                                                  inv.returnValue.toFixed(2),
                                                  (inv.totalValue - inv.returnValue).toFixed(2),
                                                  item.name,
                                                  item.qty,
                                                  item.returnedQty || (item.isReturned ? item.qty : 0),
                                                  item.bonus || 0,
                                                  item.publicPrice.toFixed(2),
                                                  item.pharmaPrice.toFixed(2),
                                                  item.netTotalCost.toFixed(2),
                                                  item.isReturned ? 'مرتجع كلي' : (item.returnedQty && item.returnedQty > 0 ? 'مرتجع جزئي' : 'سليم')
                                              ]);
                                          } else {
                                              // Subsequent items: leave invoice details empty
                                              aoaData.push([
                                                  '', '', '', '', '', '',
                                                  item.name,
                                                  item.qty,
                                                  item.returnedQty || (item.isReturned ? item.qty : 0),
                                                  item.bonus || 0,
                                                  item.publicPrice.toFixed(2),
                                                  item.pharmaPrice.toFixed(2),
                                                  item.netTotalCost.toFixed(2),
                                                  item.isReturned ? 'مرتجع كلي' : (item.returnedQty && item.returnedQty > 0 ? 'مرتجع جزئي' : 'سليم')
                                              ]);
                                          }
                                      });
                                      aoaData.push([]); // Empty row after each invoice
                                  });
                              } else {
                                  // Headers for totals view
                                  aoaData.push([
                                      'التاريخ', 'رقم الفاتورة', 'المورد', 'قيمة الفاتورة', 'قيمة المرتجع', 'الصافي', 'الحالة', 'المراجعة'
                                  ]);
                                  
                                  supplierInvoicesData.forEach(inv => {
                                      aoaData.push([
                                          formatDate(inv.date),
                                          inv.invoiceNumber || '',
                                          inv.supplierName,
                                          inv.totalValue.toFixed(2),
                                          inv.returnValue.toFixed(2),
                                          (inv.totalValue - inv.returnValue).toFixed(2),
                                          inv.isReturned ? 'مرتجع كلي' : 'سليمة',
                                          inv.isReviewed ? 'تمت' : 'لم تتم'
                                      ]);
                                  });
                              }
                              exportAoaToExcelAndShare(aoaData, 'تقرير_فواتير_الموردين');
                          }}
                          className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
                          title="تصدير Excel"
                      >
                          <FileDown size={20} />
                      </button>
                      <button 
                          onClick={() => exportToPdfAndShare('printable-area', 'تقرير_فواتير_الموردين')}
                          className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                          title="طباعة PDF"
                      >
                          <Printer size={20} />
                      </button>
                   </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                    <div className="bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 flex-1 min-w-[120px]">
                        <p className="text-[10px] text-blue-600 mb-0.5 font-bold">عدد الفواتير</p>
                        <p className="text-sm font-bold text-blue-800">{siSummary.totalInvoices}</p>
                    </div>
                    <div className="bg-green-50 px-3 py-2 rounded-lg border border-green-100 flex-1 min-w-[120px]">
                        <p className="text-[10px] text-green-600 mb-0.5 font-bold">إجمالي المشتريات</p>
                        <p className="text-sm font-bold text-green-800">{siSummary.totalValue.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-50 px-3 py-2 rounded-lg border border-red-100 flex-1 min-w-[120px]">
                        <p className="text-[10px] text-red-600 mb-0.5 font-bold">إجمالي المرتجعات</p>
                        <p className="text-sm font-bold text-red-800">{siSummary.totalReturns.toFixed(2)}</p>
                    </div>
                    <div className="bg-purple-50 px-3 py-2 rounded-lg border border-purple-100 flex-1 min-w-[120px]">
                        <p className="text-[10px] text-purple-600 mb-0.5 font-bold">الصافي</p>
                        <p className="text-sm font-bold text-purple-800">{siSummary.netValue.toFixed(2)}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="p-3">التاريخ</th>
                                <th className="p-3">رقم الفاتورة</th>
                                <th className="p-3">المورد</th>
                                <th className="p-3">قيمة الفاتورة</th>
                                <th className="p-3">قيمة المرتجع</th>
                                <th className="p-3">الحالة</th>
                                <th className="p-3">المراجعة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {supplierInvoicesData.map((inv, i) => (
                                <React.Fragment key={inv.id}>
                                  <tr className={`hover:bg-gray-50 ${inv.isReviewed ? 'bg-green-50/20' : ''} ${inv.isReturned ? 'bg-red-50/30' : ''}`}>
                                      <td className="p-3 text-gray-500">{formatDate(inv.date)}</td>
                                      <td className="p-3 font-mono">{inv.invoiceNumber || '-'}</td>
                                      <td className="p-3 font-medium">{inv.supplierName}</td>
                                      <td className="p-3 font-bold text-primary-700">{inv.totalValue.toFixed(2)}</td>
                                      <td className="p-3 text-red-600 font-bold">{inv.returnValue > 0 ? inv.returnValue.toFixed(2) : '-'}</td>
                                      <td className="p-3">
                                          {inv.isReturned ? <span className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded">مرتجع كلي</span> : <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded">سليمة</span>}
                                      </td>
                                      <td className="p-3">
                                          {inv.isReviewed ? (
                                              <span className="text-green-600 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14} /> تم المراجعة</span>
                                          ) : (
                                              <span className="text-amber-600 flex items-center gap-1 text-xs font-bold"><Circle size={14} /> لم تراجع</span>
                                          )}
                                      </td>
                                  </tr>
                                  {siViewMode === 'items' && (
                                      <tr className="bg-gray-50/50 no-print">
                                          <td colSpan={7} className="p-0">
                                              <div className="px-12 py-3">
                                                  <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                                      <thead className="bg-gray-100 text-gray-500">
                                                          <tr>
                                                              <th className="p-2 text-right">الصنف</th>
                                                              <th className="p-2 text-center">الكمية</th>
                                                              <th className="p-2 text-center">بونص</th>
                                                              <th className="p-2 text-center">سعر الجمهور</th>
                                                              <th className="p-2 text-center">سعر الصيدلي</th>
                                                              <th className="p-2 text-center">الصافي</th>
                                                              <th className="p-2 text-center">الحالة</th>
                                                          </tr>
                                                      </thead>
                                                      <tbody className="bg-white divide-y">
                                                          {inv.items.map((item, idx) => (
                                                              <tr key={idx}>
                                                                  <td className="p-2 font-medium">{item.name}</td>
                                                                  <td className="p-2 text-center">
                                                                      {item.returnedQty && item.returnedQty > 0 ? (
                                                                          <span className="text-red-500 font-bold ml-1">(-{item.returnedQty})</span>
                                                                      ) : null}
                                                                      {item.qty}
                                                                  </td>
                                                                  <td className="p-2 text-center text-purple-600 font-bold">{item.bonus || '-'}</td>
                                                                  <td className="p-2 text-center">{item.publicPrice.toFixed(2)}</td>
                                                                  <td className="p-2 text-center">{item.pharmaPrice.toFixed(2)}</td>
                                                                  <td className="p-2 text-center font-bold">{item.netTotalCost.toFixed(2)}</td>
                                                                  <td className="p-2 text-center">
                                                                      {item.isReturned ? (
                                                                          <span className="text-red-500 font-bold">مرتجع كلي</span>
                                                                      ) : item.returnedQty && item.returnedQty > 0 ? (
                                                                          <span className="text-orange-500 font-bold">مرتجع جزئي ({item.returnedQty})</span>
                                                                      ) : (
                                                                          <span className="text-gray-400">-</span>
                                                                      )}
                                                                  </td>
                                                              </tr>
                                                          ))}
                                                      </tbody>
                                                  </table>
                                              </div>
                                          </td>
                                      </tr>
                                  )}
                                </React.Fragment>
                            ))}
                            {supplierInvoicesData.length === 0 && (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-400">لا توجد فواتير مطابقة لهذه الفلاتر</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* ITEMS ANALYSIS SMART VIEW */}
        {activeTab === 'items_analysis' && (
            <div id="printable-area" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between border-b pb-4 no-print">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">تحليل الأصناف الذكي</h3>
                        <p className="text-xs text-gray-500">فلترة ذكية للأصناف لمعرفة البونص، الضرائب، وتغيرات الأسعار</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => exportToExcelAndShare(itemAnalysisData.map(item => ({
                                'الصنف': item.name,
                                'التاريخ': formatDate(item.invDate),
                                'المورد': item.supplierName,
                                'سعر الجمهور': item.publicPrice,
                                'سعر الصيدلي': item.pharmaPrice,
                                'الصافي': item.netTotalCost,
                                'الحالة': item.isInvoiceReturned ? 'مرتجع' : 'سليم'
                            })), 'تقرير_تحليل_الأصناف')}
                            className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
                            title="تصدير Excel"
                        >
                            <FileDown size={20} />
                        </button>
                        <button 
                            onClick={() => exportToPdfAndShare('printable-area', 'تقرير_تحليل_الأصناف')}
                            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                            title="طباعة PDF"
                        >
                            <Printer size={20} />
                        </button>
                        <button onClick={() => exportToPdfAndShare('printable-area', 'تقرير_تحليل_الأصناف')} className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm"><Share2 size={16} /> مشاركة</button>
                    </div>
                </div>

                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-print">
                    <button onClick={() => setIaFilterType('all')} className={`px-3 py-1.5 rounded-full text-sm font-bold border ${iaFilterType === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200'}`}>الكل</button>
                    <button onClick={() => setIaFilterType('bonus')} className={`px-3 py-1.5 rounded-full text-sm font-bold border flex items-center gap-1 ${iaFilterType === 'bonus' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200'}`}><Gift size={14} /> أصناف ببونص</button>
                    <button onClick={() => setIaFilterType('tax')} className={`px-3 py-1.5 rounded-full text-sm font-bold border flex items-center gap-1 ${iaFilterType === 'tax' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'}`}><AlertCircle size={14} /> عليها ضرائب</button>
                    <button onClick={() => setIaFilterType('price_change')} className={`px-3 py-1.5 rounded-full text-sm font-bold border flex items-center gap-1 ${iaFilterType === 'price_change' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}><TrendingUp size={14} /> تغير السعر</button>
                </div>

                <div className="mb-4 relative no-print">
                    <Search className="absolute right-3 top-3 text-gray-400" size={18} />
                    <input placeholder="ابحث باسم الصنف..." className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl" value={iaSearch} onChange={e => setIaSearch(e.target.value)} />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                            <tr>
                                <th className="p-3">الصنف</th>
                                <th className="p-3">التاريخ / المورد</th>
                                <th className="p-3">السعر (جمهور/صيدلي)</th>
                                <th className="p-3">العدد + البونص</th>
                                <th className="p-3">خ. مورد</th>
                                <th className="p-3">الضريبة</th>
                                <th className="p-3">حالة السعر</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {itemAnalysisData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3 font-bold text-gray-800">
                                        {item.name}
                                        {item.isInvoiceReturned && <span className="mr-2 bg-red-100 text-red-600 px-1.5 rounded text-[10px] font-bold">مرتجع</span>}
                                    </td>
                                    <td className="p-3">
                                        <div className="text-xs text-gray-500">{formatDate(item.invDate)}</div>
                                        <div className="text-xs font-bold">{item.supplierName}</div>
                                    </td>
                                    <td className="p-3">
                                        <div>{item.publicPrice} <span className="text-xs text-gray-400">جمهور</span></div>
                                        <div className="text-blue-600 font-mono">{item.pharmaPrice} <span className="text-xs text-gray-400">صيدلي</span></div>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-1">
                                            <span>{item.qty}</span>
                                            {item.bonus > 0 && <span className="bg-purple-100 text-purple-700 px-1.5 rounded text-xs font-bold">+{item.bonus}</span>}
                                        </div>
                                    </td>
                                    <td className="p-3 text-green-600 font-bold">{item.supplierDiscountVal > 0 ? item.supplierDiscountVal : '-'}</td>
                                    <td className="p-3 text-red-500">{item.taxValue > 0 ? item.taxValue : '-'}</td>
                                    <td className="p-3">
                                        {item.historyComparison === 'better' && <span className="flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-1 rounded"><ArrowDown size={12} /> أرخص</span>}
                                        {item.historyComparison === 'worse' && <span className="flex items-center gap-1 text-red-600 text-xs bg-red-50 px-2 py-1 rounded"><ArrowUp size={12} /> أغلى</span>}
                                        {item.historyComparison === 'same' && <span className="text-gray-400">-</span>}
                                        {item.historyComparison === 'new' && <span className="text-blue-500 text-xs">جديد</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

    </div>
  );
};

export default Reports;
