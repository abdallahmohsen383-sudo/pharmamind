
import React, { useState } from 'react';
import { Lock, User, LogIn, AlertCircle, RefreshCw } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { DEFAULT_SETTINGS } from '../types';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [logoText, setLogoText] = useState('PharmaMind');

  React.useEffect(() => {
      const settings = StorageService.getSettings();
      if (settings.userAvatar) setAvatar(settings.userAvatar);
      if (settings.logoText) setLogoText(settings.logoText);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const settings = StorageService.getSettings();
    const users = (settings.users && settings.users.length > 0) ? settings.users : DEFAULT_SETTINGS.users;
    
    const validUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password);

    if (validUser) {
      sessionStorage.setItem('is_auth', 'true');
      sessionStorage.setItem('current_user', JSON.stringify(validUser));
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  const handleFactoryReset = () => {
    if (confirm('تنبيه هام: سيتم مسح جميع البيانات المخزنة وإعادة التطبيق للوضع الافتراضي. هل أنت متأكد؟')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 font-sans p-4 relative overflow-hidden">
      {/* Offline-safe Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-primary-900" />
      
      {/* Decorative Circles */}
      <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="bg-white/95 backdrop-blur shadow-2xl rounded-3xl overflow-hidden border border-white/20">
          <div className="bg-primary-600 p-8 text-center text-white relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Lock size={80} />
            </div>
            <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 border-4 border-primary-500 shadow-xl overflow-hidden flex items-center justify-center bg-gray-100 text-gray-400">
               {avatar ? (
                 <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <User size={48} />
               )}
            </div>
            <h1 className="text-2xl font-bold">{logoText}</h1>
            <p className="opacity-80 text-sm mt-1">نظام الإدارة الذكي</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2 mr-1">اسم المستخدم</label>
              <div className="relative">
                <span className="absolute right-3 top-3 text-gray-400"><User size={20} /></span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="أدخل اسم المستخدم"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2 mr-1">كلمة المرور</label>
              <div className="relative">
                <span className="absolute right-3 top-3 text-gray-400"><Lock size={20} /></span>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 animate-bounce">
                <AlertCircle size={18} />
                <span className="text-sm">بيانات الدخول غير صحيحة</span>
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <LogIn size={20} /> دخول للنظام
            </button>
          </form>
          
          <div className="bg-gray-50 p-4 text-center border-t border-gray-100 flex flex-col gap-2">
             <button onClick={handleFactoryReset} className="text-[10px] text-red-400 hover:text-red-600 flex items-center justify-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                <RefreshCw size={10} /> ضبط المصنع
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
