
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, Lock, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { ActivationService } from '../services/activationService';

interface ActivationProps {
  onActivate: () => void;
}

const Activation: React.FC<ActivationProps> = ({ onActivate }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState(false);
  const [debugClicks, setDebugClicks] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // تحديث الساعة في الواجهة كل ثانية ليعرف المستخدم الدقائق
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (ActivationService.activate(licenseKey)) {
      onActivate();
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  // حيلة المطور: الضغط 5 مرات يظهر الكود الحالي بناءً على المعادلة
  const handleDebugClick = () => {
      const newCount = debugClicks + 1;
      setDebugClicks(newCount);
      if (newCount === 5) {
          alert(ActivationService.getCurrentDebugCode());
          setDebugClicks(0);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 font-sans p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 p-8 text-center text-white relative">
             <div 
                className="mx-auto bg-white/10 w-20 h-20 rounded-full flex items-center justify-center mb-4 cursor-pointer select-none hover:bg-white/20 transition-colors"
                onClick={handleDebugClick}
             >
                 <Lock size={40} className="text-indigo-200" />
             </div>
             <h1 className="text-2xl font-bold mb-1">تفعيل النظام</h1>
             <p className="text-indigo-200 text-sm">أدخل كود التفعيل للمتابعة</p>
        </div>

        <div className="p-8 space-y-6">
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
                 <div className="text-gray-400 text-xs font-bold uppercase tracking-wider">التوقيت الحالي على جهازك</div>
                 <div className="text-3xl font-mono font-bold text-gray-800 flex items-center gap-2 bg-gray-50 px-6 py-2 rounded-xl border border-gray-200">
                    <Clock className="text-indigo-500" />
                    {currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                 </div>
                 <p className="text-[10px] text-gray-400 text-center px-4">
                    تأكد من أن ساعة جهازك مضبوطة بشكل صحيح، الكود يعتمد على الدقائق الحالية.
                 </p>
            </div>

            <form onSubmit={handleActivate} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <Key size={16} /> كود التفعيل
                    </label>
                    <input 
                        type="number" 
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                        className="w-full p-4 border-2 border-gray-200 rounded-xl text-center font-mono text-xl tracking-widest focus:border-indigo-500 outline-none"
                        placeholder="أدخل الرقم هنا"
                        autoFocus
                    />
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center justify-center gap-2 animate-bounce">
                        <AlertTriangle size={18} />
                        <span className="text-sm font-bold">الكود غير صحيح (تأكد من الدقائق)</span>
                    </div>
                )}

                <button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                    <ShieldCheck size={20} /> تفعيل
                </button>
            </form>

            <div className="text-center pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">PharmaMind Secure System v2.2</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Activation;
