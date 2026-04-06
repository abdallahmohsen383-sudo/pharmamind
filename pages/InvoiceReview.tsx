import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from '../services/storageService';
import { Invoice } from '../types';
import { Search, Calendar, CheckCircle, Circle, ScanBarcode, AlertCircle, Camera, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const InvoiceReview: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'all' | 'reviewed' | 'unreviewed'>('all');
  
  // Barcode scanner
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInvoices();
    window.addEventListener('cloud-data-updated', loadInvoices);
    return () => window.removeEventListener('cloud-data-updated', loadInvoices);
  }, []);

  const loadInvoices = () => {
    const allInvoices = StorageService.getInvoices();
    setInvoices(allInvoices);
  };

  useEffect(() => {
    let result = invoices;

    // Filter by search term (invoice number or item name)
    if (searchTerm) {
      const normalize = (str: any) => {
          if (str == null) return '';
          return String(str)
              .toLowerCase()
              .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
              .trim();
      };
      const searchLower = normalize(searchTerm);
      if (searchLower !== '') {
        result = result.filter(inv => 
          normalize(inv.invoiceNumber).includes(searchLower) ||
          normalize(inv.id).includes(searchLower) ||
          normalize(inv.notes).includes(searchLower) ||
          inv.items.some(item => normalize(item.name).includes(searchLower))
        );
      }
    }

    // Filter by date range
    if (startDate) {
      result = result.filter(inv => new Date(inv.date) >= new Date(startDate));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(inv => new Date(inv.date) <= end);
    }

    // Filter by review status
    if (reviewStatus === 'reviewed') {
      result = result.filter(inv => inv.isReviewed);
    } else if (reviewStatus === 'unreviewed') {
      result = result.filter(inv => !inv.isReviewed);
    }

    setFilteredInvoices(result);
  }, [invoices, searchTerm, startDate, endDate, reviewStatus]);

  const handleScannedBarcode = (barcode: string) => {
    const normalize = (str: any) => {
        if (str == null) return '';
        return String(str)
            .toLowerCase()
            .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
            .trim();
    };
    
    const trimmedBarcode = normalize(barcode);
    if (!trimmedBarcode) return;

    // Clear other filters and set search term
    setStartDate('');
    setEndDate('');
    setReviewStatus('all');
    setSearchTerm(trimmedBarcode);
    setBarcodeInput(trimmedBarcode);

    // Find invoice and mark as reviewed
    const foundInvoice = invoices.find(inv => 
      normalize(inv.invoiceNumber) === trimmedBarcode || 
      normalize(inv.id) === trimmedBarcode || 
      normalize(inv.id).slice(-4) === trimmedBarcode
    );
    if (foundInvoice && !foundInvoice.isReviewed) {
      StorageService.markInvoiceAsReviewed(foundInvoice.id, true);
      loadInvoices();
    }
  };

  const handleScannedBarcodeRef = useRef(handleScannedBarcode);
  useEffect(() => {
    handleScannedBarcodeRef.current = handleScannedBarcode;
  }, [handleScannedBarcode]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;
    let isScanning = false;
    
    if (isScannerOpen) {
      setCameraError('');
      
      // Small delay to ensure the DOM element is fully rendered
      setTimeout(() => {
        if (!isMounted) return;
        
        try {
          html5QrCode = new Html5Qrcode("reader");
          html5QrCode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 200, height: 80 } },
            (decodedText) => {
              handleScannedBarcodeRef.current(decodedText);
            },
            (error) => {
              // ignore frame errors
            }
          ).then(() => {
            isScanning = true;
          }).catch((err) => {
            if (isMounted) {
              console.error("Camera start error:", err);
              setCameraError('تعذر الوصول إلى الكاميرا. يرجى التأكد من منح صلاحية الكاميرا للمتصفح.');
            }
          });
        } catch (err) {
          if (isMounted) {
            console.error("Scanner init error:", err);
            setCameraError('حدث خطأ أثناء تشغيل الكاميرا.');
          }
        }
      }, 100);
    }

    return () => {
      isMounted = false;
      if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode?.clear();
        }).catch(console.error);
      }
    };
  }, [isScannerOpen]);

  const toggleReviewStatus = (invoiceId: string, currentStatus: boolean) => {
    StorageService.markInvoiceAsReviewed(invoiceId, !currentStatus);
    loadInvoices(); // Reload to update state
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScannedBarcode(barcodeInput);
    barcodeInputRef.current?.focus();
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const unreviewedCount = filteredInvoices.filter(inv => !inv.isReviewed).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">مراجعة الفواتير</h2>
          <p className="text-gray-500 mt-1">راجع الفواتير الواردة وتأكد من مطابقتها</p>
        </div>
        
        {/* Barcode Scanner Input */}
        <div className="flex items-center w-full md:w-auto gap-2">
          <form onSubmit={handleBarcodeSubmit} className="flex-1">
            <div className="relative w-full">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <ScanBarcode size={20} />
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="مرر الباركود هنا..."
                className="w-full md:w-64 pl-4 pr-10 py-2 border-2 border-primary-200 rounded-xl focus:border-primary-500 outline-none transition-all"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                autoFocus
              />
            </div>
          </form>
          <button 
            onClick={() => setIsScannerOpen(!isScannerOpen)}
            className={`p-2 rounded-xl border-2 transition-colors ${isScannerOpen ? 'bg-red-50 border-red-200 text-red-600' : 'bg-primary-50 border-primary-200 text-primary-600 hover:bg-primary-100'}`}
            title="فتح الكاميرا للمسح"
          >
            {isScannerOpen ? <X size={24} /> : <Camera size={24} />}
          </button>
        </div>
      </div>

      {/* Camera Scanner */}
      {isScannerOpen && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          {cameraError ? (
            <div className="text-center p-4 bg-red-50 text-red-600 rounded-lg font-bold">
              {cameraError}
            </div>
          ) : (
            <>
              <div id="reader" className="w-full max-w-[250px] mx-auto overflow-hidden rounded-lg border-2 border-primary-100"></div>
              <p className="text-center text-sm text-gray-500 mt-3 font-bold">وجه الكاميرا نحو باركود الفاتورة للبحث والمراجعة التلقائية</p>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="بحث برقم الفاتورة أو الصنف..."
            className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <Calendar size={18} />
          </div>
          <input
            type="date"
            className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <Calendar size={18} />
          </div>
          <input
            type="date"
            className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <select
          className="w-full p-2 border border-gray-200 rounded-lg focus:border-primary-500 outline-none"
          value={reviewStatus}
          onChange={(e) => setReviewStatus(e.target.value as any)}
        >
          <option value="all">كل الفواتير</option>
          <option value="reviewed">تمت المراجعة</option>
          <option value="unreviewed">لم تتم المراجعة</option>
        </select>
      </div>

      {/* Alert for unreviewed invoices */}
      {unreviewedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="text-amber-500" />
          <span className="font-bold">يوجد {unreviewedCount} فواتير لم تتم مراجعتها في نتائج البحث الحالية.</span>
        </div>
      )}

      {/* Invoices List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-gray-500">
            لا توجد فواتير مطابقة للبحث
          </div>
        ) : (
          filteredInvoices.map(inv => (
            <div 
              key={inv.id} 
              className={`bg-white p-4 rounded-xl shadow-sm border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${inv.isReviewed ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleReviewStatus(inv.id, !!inv.isReviewed)}
                  className={`p-2 rounded-full transition-colors ${inv.isReviewed ? 'text-green-600 bg-green-100 hover:bg-green-200' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`}
                  title={inv.isReviewed ? 'إلغاء المراجعة' : 'تحديد كمُراجع'}
                >
                  {inv.isReviewed ? <CheckCircle size={24} /> : <Circle size={24} />}
                </button>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-800">{inv.supplierName || 'مورد غير محدد'}</span>
                    {inv.invoiceNumber && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded border">#{inv.invoiceNumber}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-3">
                    <span>{formatDate(inv.date)}</span>
                    <span>•</span>
                    <span>{inv.totalItems} أصناف</span>
                    <span>•</span>
                    <span className="font-bold text-primary-600">{inv.totalValue.toFixed(2)} EGP</span>
                  </div>
                  {inv.notes && (
                    <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 p-1.5 rounded border border-yellow-100 inline-block">
                      {inv.notes}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-sm">
                {inv.isReviewed ? (
                  <span className="text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle size={16} /> تمت المراجعة
                  </span>
                ) : (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <AlertCircle size={16} /> بانتظار المراجعة
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InvoiceReview;
