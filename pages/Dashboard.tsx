import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, FileText, PieChart, ArrowLeft, Cloud, CheckCircle2, Clock } from 'lucide-react';
import { StorageService } from '../services/storageService';

const Dashboard: React.FC = () => {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);

  useEffect(() => {
    const checkSync = () => {
      const settings = StorageService.getSettings();
      setIsSyncEnabled(!!(settings.cloudConfig?.enabled && settings.cloudConfig?.groupId));
      setLastSync(localStorage.getItem('pharmamind_last_sync'));
    };
    
    checkSync();
    window.addEventListener('cloud-data-updated', checkSync);
    window.addEventListener('settings-updated', checkSync);
    return () => {
      window.removeEventListener('cloud-data-updated', checkSync);
      window.removeEventListener('settings-updated', checkSync);
    };
  }, []);

  return (
    <div className="space-y-8 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">مرحباً بك في PharmaMind</h1>
        <p className="text-gray-500 text-lg">نظامك الذكي لإدارة مشتريات الصيدلية واتخاذ القرارات</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* ... existing links ... */}
        <Link to="/calculator" className="group">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary-200 transition-all duration-300 h-full flex flex-col items-center text-center">
            <div className="bg-primary-50 text-primary-600 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <Calculator size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">حاسبة الخصومات</h3>
            <p className="text-gray-500 mb-6">احسب صافي التكلفة بدقة، واكشف الخصومات الوهمية، وقارن الأسعار</p>
            <span className="mt-auto text-primary-600 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              ابدأ الحساب <ArrowLeft size={16} />
            </span>
          </div>
        </Link>

        <Link to="/invoices" className="group">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 h-full flex flex-col items-center text-center">
             <div className="bg-indigo-50 text-indigo-600 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <FileText size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">سجل الفواتير</h3>
            <p className="text-gray-500 mb-6">راجع فواتيرك السابقة، اعد طباعتها، وتابع تواريخ الشراء</p>
             <span className="mt-auto text-indigo-600 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              عرض السجل <ArrowLeft size={16} />
            </span>
          </div>
        </Link>

        <Link to="/reports" className="group">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-teal-200 transition-all duration-300 h-full flex flex-col items-center text-center">
             <div className="bg-teal-50 text-teal-600 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
              <PieChart size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">التقارير الذكية</h3>
            <p className="text-gray-500 mb-6">راقب معدلات الخصم، إجمالي الإنفاق، وتطور الأسعار شهرياً</p>
             <span className="mt-auto text-teal-600 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              عرض التحليلات <ArrowLeft size={16} />
            </span>
          </div>
        </Link>
      </div>

      {isSyncEnabled && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 text-green-600 p-2 rounded-full">
              <Cloud size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800 flex items-center gap-1">
                المزامنة السحابية نشطة <CheckCircle2 size={14} className="text-green-500" />
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={12} /> آخر مزامنة: {lastSync ? new Date(lastSync).toLocaleString('ar-EG') : 'جاري المزامنة...'}
              </div>
            </div>
          </div>
          <Link to="/settings" className="text-xs font-bold text-primary-600 hover:underline">إعدادات المزامنة</Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;