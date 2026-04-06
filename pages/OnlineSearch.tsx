import React, { useState } from 'react';
import { Search, Globe, AlertCircle, Loader2, Package, DollarSign, Info, Building2 } from 'lucide-react';

const OnlineSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const targetUrl = 'https://dwaprices.com/routing.php';
      
      const proxies = [
        `https://cors.eu.org/${targetUrl}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
      ];

      const formData = new URLSearchParams();
      formData.append('search', '1');
      formData.append('searchq', query);
      formData.append('order_by', 'name ASC');

      let response = null;
      let lastError = null;

      for (const proxyUrl of proxies) {
        try {
          const res = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json'
            },
            body: formData.toString()
          });

          if (res.ok) {
            response = res;
            break;
          } else {
            console.warn(`Proxy ${proxyUrl} failed with status ${res.status}`);
          }
        } catch (e) {
          console.warn(`Proxy ${proxyUrl} failed with error`, e);
          lastError = e;
        }
      }

      if (!response) {
        throw new Error('فشل الاتصال بالخادم بعدة محاولات. يرجى التأكد من اتصالك بالإنترنت أو المحاولة لاحقاً.');
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("Failed to parse JSON:", text);
        throw new Error('استجابة غير صالحة من الخادم.');
      }

      // The API might return an array directly, or an object with a 'data' array
      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data && typeof data === 'object') {
        const possibleArrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
        if (possibleArrayKey) {
          items = data[possibleArrayKey];
        } else if (data.data && Array.isArray(data.data)) {
            items = data.data;
        } else if (data.results && Array.isArray(data.results)) {
            items = data.results;
        } else {
            items = [data]; // Wrap in array if it's a single object
        }
      }

      setResults(items);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء البحث');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Globe className="text-primary-600" /> بحث الأدوية أونلاين
          </h2>
          <p className="text-gray-500 mt-1">ابحث عن أسعار وتفاصيل الأدوية من قاعدة البيانات المحدثة</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="أدخل اسم الدواء (مثال: panadol)..."
              className="w-full pl-4 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg transition-all"
              dir="auto"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-primary-500/30"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
            بحث
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3 animate-fade-in">
          <AlertCircle size={24} />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {searched && !loading && !error && (
        <div className="space-y-4 animate-fade-in">
          <h3 className="font-bold text-gray-700 text-lg">نتائج البحث ({results.length})</h3>
          
          {results.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center shadow-sm">
              <Search className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">لا توجد نتائج</h3>
              <p className="text-gray-500">لم يتم العثور على أدوية مطابقة لبحثك. جرب اسماً آخر.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-start">
                      {item.img && (
                        <img 
                          src={`https://dwaprices.com/${item.img}`} 
                          alt={item.name || 'صورة الدواء'} 
                          className="w-16 h-16 object-contain rounded-lg border border-gray-100 bg-white"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://dwaprices.com/files/circlemedhome.png';
                          }}
                        />
                      )}
                      <div>
                        <h4 className="font-bold text-lg text-gray-800 group-hover:text-primary-600 transition-colors">
                          {item.name || item.Name || item.trade_name || 'بدون اسم'}
                        </h4>
                        {item.arabic && (
                          <p className="text-sm font-bold text-blue-600 mt-1" dir="rtl">{item.arabic}</p>
                        )}
                      </div>
                    </div>
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-1 border border-green-100 shrink-0">
                      <DollarSign size={14} />
                      {item.price || item.Price || item.public_price || 'غير محدد'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    {(item.active || item.active_ingredient || item.generic_name || item.Ingredient) && (
                      <div className="flex items-start gap-2">
                        <Info size={16} className="text-gray-400 mt-0.5 shrink-0" />
                        <span><strong className="text-gray-700">المادة الفعالة:</strong> {item.active || item.active_ingredient || item.generic_name || item.Ingredient}</span>
                      </div>
                    )}
                    {(item.company || item.Company || item.manufacturer) && (
                      <div className="flex items-start gap-2">
                        <Building2 size={16} className="text-gray-400 mt-0.5 shrink-0" />
                        <span><strong className="text-gray-700">الشركة:</strong> {item.company || item.Company || item.manufacturer}</span>
                      </div>
                    )}
                    {(item.dosage_form || item.type || item.Type || item.form) && (
                      <div className="flex items-start gap-2">
                        <Package size={16} className="text-gray-400 mt-0.5 shrink-0" />
                        <span><strong className="text-gray-700">الشكل الدوائي:</strong> {item.dosage_form || item.type || item.Type || item.form}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Dump other useful keys dynamically */}
                  <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-2">
                    {Object.entries(item).map(([key, val]) => {
                      if (['name', 'Name', 'trade_name', 'price', 'Price', 'public_price', 'active', 'active_ingredient', 'generic_name', 'Ingredient', 'company', 'Company', 'manufacturer', 'dosage_form', 'type', 'Type', 'form', 'img', 'arabic'].includes(key)) return null;
                      if (typeof val !== 'string' && typeof val !== 'number') return null;
                      if (!val) return null;
                      return (
                        <span key={key} className="bg-gray-50 text-gray-500 text-xs px-2 py-1 rounded border border-gray-100">
                          {key}: {val}
                        </span>
                      );
                    }).slice(0, 5)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OnlineSearch;
