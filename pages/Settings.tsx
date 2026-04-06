
import React, { useState, useEffect, useRef } from 'react';
import { Save, RefreshCw, Download, Upload, Database, Check, User, ShieldCheck, Settings2, Image as ImageIcon, Plus, Trash2, FileSpreadsheet, Cloud, Globe, Key, LogIn, LogOut, Copy, UploadCloud, DownloadCloud, HardDrive } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { AppSettings, DEFAULT_SETTINGS, User as UserType } from '../types';
import { auth } from '../firebase';
import { FirebaseService } from '../services/firebaseService';
import { GoogleDriveService } from '../services/googleDriveService';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ type: 'json' | 'excel', file: File } | null>(null);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [newUser, setNewUser] = useState<UserType>({ id: '', username: '', password: '', fullName: '', role: 'user', permissions: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    setSettings(StorageService.getSettings()); 
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await FirebaseService.loginWithGoogle();
      setMsg('تم تسجيل الدخول بنجاح');
    } catch (e) {
      console.error(e);
      alert('فشل تسجيل الدخول. تأكد من إعدادات Firebase.');
    }
  };

  const handleGoogleLogout = async () => {
    await auth.signOut();
    setMsg('تم تسجيل الخروج');
  };

  const handleCopyGroupId = () => {
    if (settings.cloudConfig?.groupId) {
      navigator.clipboard.writeText(settings.cloudConfig.groupId);
      setMsg('تم نسخ معرف المجموعة إلى الحافظة');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleManualSync = async () => {
    if (!settings.cloudConfig?.enabled) {
      alert('يرجى تفعيل المزامنة السحابية أولاً');
      return;
    }
    
    let currentGroupId = settings.cloudConfig.groupId;
    if (!currentGroupId) {
      const newId = 'PHARMA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      currentGroupId = newId;
      const updatedSettings = {
        ...settings,
        cloudConfig: { ...settings.cloudConfig, groupId: newId }
      };
      setSettings(updatedSettings);
      StorageService.saveSettings(updatedSettings);
    }

    if (!auth.currentUser) {
      alert('يرجى تسجيل الدخول باستخدام Google أولاً');
      return;
    }
    setLoading(true);
    try {
      setMsg('جاري رفع البيانات إلى السحابة...');
      await FirebaseService.syncAllDataToCloud(currentGroupId);
      setMsg('تم رفع جميع البيانات بنجاح');
    } catch (e: any) {
      console.error(e);
      const errorData = e.message.startsWith('{') ? JSON.parse(e.message) : null;
      if (errorData?.error?.includes('permissions')) {
        alert('خطأ في الصلاحيات: تأكد من أنك تملك صلاحية الوصول لهذه المجموعة');
      } else {
        alert('حدث خطأ أثناء المزامنة: ' + (errorData?.error || e.message));
      }
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleManualDownload = async () => {
    if (!settings.cloudConfig?.enabled || !settings.cloudConfig?.groupId) {
      alert('يرجى تفعيل المزامنة السحابية أولاً والتأكد من وجود معرف مجموعة');
      return;
    }
    if (!auth.currentUser) {
      alert('يرجى تسجيل الدخول باستخدام Google أولاً');
      return;
    }
    if (!window.confirm('سيتم استبدال جميع البيانات المحلية بالبيانات الموجودة في السحابة. هل تريد الاستمرار؟')) return;
    
    setLoading(true);
    try {
      setMsg('جاري تحميل البيانات من السحابة...');
      const results = await FirebaseService.downloadAllDataFromCloud(settings.cloudConfig.groupId);
      const totalCount = results.reduce((acc, curr) => acc + (curr.count || 0), 0);
      window.dispatchEvent(new Event('cloud-data-updated'));
      setMsg(`تم تحميل ${totalCount} عنصر بنجاح`);
    } catch (e: any) {
      console.error(e);
      const errorData = e.message.startsWith('{') ? JSON.parse(e.message) : null;
      alert('حدث خطأ أثناء التحميل: ' + (errorData?.error || e.message));
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const handleSave = () => {
    StorageService.saveSettings(settings);
    setMsg('تم حفظ الإعدادات بنجاح');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setSettings(prev => ({ ...prev, userAvatar: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddUser = () => {
      if (!newUser.username || !newUser.password) return alert('اسم المستخدم وكلمة المرور مطلوبان');
      const updatedUsers = [...settings.users, { ...newUser, id: Date.now().toString(), permissions: newUser.role === 'admin' ? ['*'] : newUser.permissions }];
      setSettings(prev => ({ ...prev, users: updatedUsers }));
      setNewUser({ id: '', username: '', password: '', fullName: '', role: 'user', permissions: [] });
  };

  const handleRemoveUser = (userId: string) => {
      if (settings.users.length <= 1) return alert('لا يمكن حذف المستخدم الوحيد');
      setSettings(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
  };

  const handleQuickBackup = () => {
      const data = StorageService.createBackup();
      const fileName = `pharmamind_backup_${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg('تم تحميل النسخة بنجاح');
      setTimeout(() => setMsg(''), 3000);
  };

  const handleDriveBackup = async () => {
      setIsDriveLoading(true);
      try {
          let token = GoogleDriveService.getStoredToken();
          if (!token) {
              token = await GoogleDriveService.getAccessToken();
          }
          if (!token) {
              throw new Error('لم يتم الحصول على صلاحية جوجل درايف');
          }
          
          const data = StorageService.createBackup();
          const fileName = `pharmamind_backup_${new Date().toISOString().split('T')[0]}.json`;
          
          await GoogleDriveService.uploadBackup(token, data, fileName);
          setMsg('تم النسخ الاحتياطي إلى جوجل درايف بنجاح');
      } catch (error: any) {
          console.error(error);
          alert('فشل النسخ الاحتياطي لجوجل درايف: ' + (error.message || 'تأكد من تفعيل Google Drive API في مشروعك'));
      } finally {
          setIsDriveLoading(false);
          setTimeout(() => setMsg(''), 3000);
      }
  };

  const handleExportExcel = async () => {
      const success = await StorageService.exportBackupToExcel();
      if (success) {
          setMsg('تم تجهيز ملف Excel للمشاركة');
      } else {
          alert('حدث خطأ أثناء التصدير');
      }
      setTimeout(() => setMsg(''), 3000);
  };

  const handleImportExcel = async (file: File) => {
      setLoading(true);
      setMsg('جاري استيراد البيانات من ملف Excel...');
      try {
          const success = await StorageService.restoreBackupFromExcel(file);
          if (success) {
              setMsg('تم استعادة البيانات بنجاح! جاري إعادة التحميل...');
              setTimeout(() => window.location.reload(), 2000);
          } else {
              setMsg('فشل استيراد الملف. تأكد من صحة الملف وتنسيقه.');
              setTimeout(() => setMsg(''), 5000);
          }
      } catch (e) {
          console.error(e);
          setMsg('حدث خطأ غير متوقع أثناء الاستيراد.');
      } finally {
          setLoading(false);
          setShowConfirm(null);
      }
  };

  const handleRestore = (file: File) => {
      setLoading(true);
      setMsg('جاري استعادة البيانات من ملف JSON...');
      const reader = new FileReader();
      reader.onload = (event) => {
          const content = event.target?.result as string;
          if (StorageService.restoreBackup(content)) {
              setMsg('تم استعادة البيانات! جاري إعادة التحميل...');
              setTimeout(() => window.location.reload(), 2000);
          } else {
              setMsg('فشل استعادة الملف.');
              setTimeout(() => setMsg(''), 5000);
              setLoading(false);
          }
          setShowConfirm(null);
      };
      reader.onerror = () => {
          setMsg('فشل قراءة الملف.');
          setLoading(false);
          setShowConfirm(null);
      };
      reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-2xl font-bold mb-8 text-gray-800 flex items-center gap-2"><Settings2 className="text-primary-600" /> إعدادات النظام والأمان</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
             <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2"><User size={18} className="text-blue-500" /> مظهر التطبيق</h3>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">اسم الصيدلية</label><input type="text" value={settings.pharmacyName} onChange={(e) => setSettings({...settings, pharmacyName: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">نص اللوجو (شاشة الدخول)</label><input type="text" value={settings.logoText || ''} onChange={(e) => setSettings({...settings, logoText: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="PharmaMind" /></div>
             
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-2">شعار / صورة الملف الشخصي</label>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 border overflow-hidden">
                        {settings.userAvatar ? <img src={settings.userAvatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-4 text-gray-300" />}
                    </div>
                    <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button onClick={() => imageInputRef.current?.click()} className="text-sm bg-gray-50 border px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-1"><ImageIcon size={14} /> اختر صورة</button>
                    {settings.userAvatar && <button onClick={() => setSettings({...settings, userAvatar: undefined})} className="text-sm text-red-500 hover:text-red-700">حذف</button>}
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <h3 className="font-bold text-gray-700 flex items-center gap-2 border-b pb-2"><ShieldCheck size={18} className="text-green-500" /> إدارة المستخدمين</h3>
             
             <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-200">
                 <h4 className="text-xs font-bold text-gray-500 uppercase">إضافة مستخدم جديد</h4>
                 <input placeholder="الاسم الكامل" className="w-full p-2 border rounded-lg" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} />
                 <div className="grid grid-cols-2 gap-2">
                     <input placeholder="اسم المستخدم" className="w-full p-2 border rounded-lg" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                     <input type="password" placeholder="كلمة المرور" className="w-full p-2 border rounded-lg" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                 </div>
                 <div className="flex gap-2">
                     <select className="p-2 border rounded-lg bg-white" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as 'user' | 'admin'})}>
                         <option value="user">مستخدم عادي</option>
                         <option value="admin">مسؤول كامل</option>
                     </select>
                     <button onClick={handleAddUser} className="flex-1 bg-green-600 text-white rounded-lg font-bold flex items-center justify-center gap-1"><Plus size={16} /> إضافة</button>
                 </div>
             </div>

             <div className="space-y-2 max-h-40 overflow-y-auto">
                 {settings.users?.map(user => (
                     <div key={user.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                         <div>
                             <div className="font-bold text-sm">{user.username}</div>
                             <div className="text-xs text-gray-400">{user.role === 'admin' ? 'Admin' : 'User'}</div>
                         </div>
                         <button onClick={() => handleRemoveUser(user.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
                     </div>
                 ))}
             </div>
          </div>
        </div>

        {/* Cloud Sync Section */}
        <div className="mt-10 pt-10 border-t space-y-6">
             <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Cloud className="text-indigo-600" /> الربط السحابي والمشاركة (Beta)
             </h3>
             <p className="text-sm text-gray-500 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                تفعيل هذا الخيار يسمح بربط عدة أجهزة معاً لمشاركة نفس قاعدة البيانات. ملاحظة: هذا يتطلب وجود خادم (Server) خاص بك لحفظ البيانات.
             </p>
             
             <div className="flex items-center gap-4 p-4 bg-white border-2 border-gray-100 rounded-2xl">
                 <div className="flex-1">
                     <div className="font-bold text-gray-800">تفعيل وضع المشاركة</div>
                     <div className="text-xs text-gray-400">عند التفعيل، سيتوقف التطبيق عن الاعتماد على الذاكرة المحلية فقط وسيبدأ بالمزامنة مع السحابة.</div>
                 </div>
                 <div className="flex items-center gap-4">
                     {settings.cloudConfig?.enabled && (
                         <div className="flex items-center gap-2">
                             {currentUser ? (
                                 <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl border border-green-100 text-xs font-bold">
                                     <div className="w-6 h-6 rounded-full overflow-hidden border border-green-200">
                                         <img src={currentUser.photoURL || ''} alt="" className="w-full h-full object-cover" />
                                     </div>
                                     {currentUser.email}
                                     <button onClick={handleGoogleLogout} className="text-red-500 hover:text-red-700 ml-1"><LogOut size={14} /></button>
                                 </div>
                             ) : (
                                 <button 
                                     onClick={handleGoogleLogin}
                                     className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-gray-50 text-gray-700"
                                 >
                                     <LogIn size={14} className="text-primary-600" /> تسجيل الدخول بـ Google
                                 </button>
                             )}
                         </div>
                     )}
                     <button 
                        onClick={async () => {
                            const newEnabled = !settings.cloudConfig?.enabled;
                            let groupId = settings.cloudConfig?.groupId;
                            
                            // Auto-generate Group ID if enabling and missing
                            if (newEnabled && !groupId) {
                                groupId = 'PHARMA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                            }

                            const newConfig = {
                                ...(settings.cloudConfig || DEFAULT_SETTINGS.cloudConfig!), 
                                enabled: newEnabled,
                                groupId: groupId || ''
                            };
                            
                            const updatedSettings = {...settings, cloudConfig: newConfig};
                            setSettings(updatedSettings);
                            
                            // Save immediately so it takes effect
                            StorageService.saveSettings(updatedSettings);
                            
                            if (newEnabled && groupId) {
                                if (!auth.currentUser) {
                                    alert('يرجى تسجيل الدخول باستخدام Google أولاً لتفعيل المزامنة.');
                                    return;
                                }
                                try {
                                    setMsg('جاري مزامنة البيانات مع السحابة...');
                                    const { FirebaseService } = await import('../services/firebaseService');
                                    await FirebaseService.syncAllDataToCloud(groupId);
                                    setMsg('تم تفعيل المزامنة السحابية بنجاح');
                                } catch (e: any) {
                                    console.error(e);
                                    const errorData = e.message.startsWith('{') ? JSON.parse(e.message) : null;
                                    alert('حدث خطأ أثناء المزامنة: ' + (errorData?.error || e.message));
                                }
                            } else {
                                setMsg('تم إيقاف المزامنة السحابية');
                            }
                            setTimeout(() => setMsg(''), 3000);
                        }}
                        className={`w-14 h-8 rounded-full transition-all relative ${settings.cloudConfig?.enabled ? 'bg-green-500' : 'bg-gray-200'}`}
                     >
                         <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.cloudConfig?.enabled ? 'left-7' : 'left-1'}`} />
                     </button>
                 </div>
             </div>

             {settings.cloudConfig?.enabled && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Globe size={12} /> رابط السيرفر (API Endpoint)</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border rounded-xl" 
                            placeholder="https://your-api.com" 
                            value={settings.cloudConfig.serverUrl}
                            onChange={e => setSettings({...settings, cloudConfig: {...settings.cloudConfig!, serverUrl: e.target.value}})}
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1"><Key size={12} /> معرف المجموعة (Group ID)</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleCopyGroupId}
                                    className="text-indigo-600 hover:underline text-[10px] flex items-center gap-0.5"
                                >
                                    <Copy size={10} /> نسخ
                                </button>
                                <button 
                                    onClick={() => {
                                        const randomId = 'PHARMA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
                                        setSettings({...settings, cloudConfig: {...settings.cloudConfig!, groupId: randomId}});
                                    }}
                                    className="text-primary-600 hover:underline text-[10px]"
                                >
                                    توليد معرف عشوائي
                                </button>
                            </div>
                         </label>
                        <input 
                            type="text" 
                            className="w-full p-3 border rounded-xl" 
                            placeholder="PHARMA-GROUP-001" 
                            value={settings.cloudConfig.groupId}
                            onChange={e => setSettings({...settings, cloudConfig: {...settings.cloudConfig!, groupId: e.target.value}})}
                        />
                     </div>
                 </div>
             )}

             {settings.cloudConfig?.enabled && (
                  <div className="flex flex-wrap gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <button 
                        onClick={handleManualSync}
                        disabled={loading}
                        className="flex-1 min-w-[150px] flex items-center justify-center gap-2 bg-white text-indigo-700 border border-indigo-200 px-4 py-3 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all disabled:opacity-50"
                      >
                          <UploadCloud size={18} /> رفع البيانات للسحابة
                      </button>
                      <button 
                        onClick={handleManualDownload}
                        disabled={loading}
                        className="flex-1 min-w-[150px] flex items-center justify-center gap-2 bg-white text-indigo-700 border border-indigo-200 px-4 py-3 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all disabled:opacity-50"
                      >
                          <DownloadCloud size={18} /> تحميل البيانات من السحابة
                      </button>
                  </div>
              )}
        </div>

        <div className="mt-10 flex items-center justify-between border-t pt-6">
            <button onClick={() => { if(window.confirm('استعادة الإعدادات الافتراضية؟')) { setSettings(DEFAULT_SETTINGS); StorageService.saveSettings(DEFAULT_SETTINGS); } }} className="text-red-500 text-sm font-bold flex items-center gap-1 hover:bg-red-50 p-2 rounded-lg"><RefreshCw size={16} /> استعادة الإعدادات</button>
            <button onClick={handleSave} className="bg-primary-600 text-white px-10 py-4 rounded-2xl shadow-xl shadow-primary-500/30 font-bold flex items-center gap-2"><Save /> حفظ التعديلات</button>
        </div>
        {msg && <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-xl text-center text-sm font-bold flex items-center justify-center gap-2"><Check size={16} /> {msg}</div>}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"><Database className="text-purple-600" /> إدارة البيانات والنسخ الاحتياطي</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button onClick={handleQuickBackup} className="bg-blue-50 text-blue-700 border border-blue-100 px-4 py-6 rounded-2xl hover:bg-blue-100 transition-all flex flex-col items-center justify-center gap-2 font-bold text-sm"><Download size={24} /> تحميل نسخة JSON</button>
              <div className="relative h-full">
                  <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setShowConfirm({ type: 'json', file });
                      e.target.value = '';
                  }} />
                  <button disabled={loading} onClick={() => fileInputRef.current?.click()} className="w-full bg-gray-50 text-gray-600 border border-gray-200 px-4 py-6 rounded-2xl hover:bg-gray-100 transition-all flex flex-col items-center justify-center gap-2 font-bold text-sm h-full disabled:opacity-50"><Upload size={24} /> استعادة JSON</button>
              </div>
              <button disabled={loading} onClick={handleExportExcel} className="bg-green-50 text-green-700 border border-green-100 px-4 py-6 rounded-2xl hover:bg-green-100 transition-all flex flex-col items-center justify-center gap-2 font-bold text-sm disabled:opacity-50"><FileSpreadsheet size={24} /> تصدير Excel</button>
              <div className="relative h-full">
                  <input type="file" accept=".xlsx, .xls" ref={excelInputRef} className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setShowConfirm({ type: 'excel', file });
                      e.target.value = '';
                  }} />
                  <button disabled={loading} onClick={() => excelInputRef.current?.click()} className="w-full bg-gray-50 text-gray-600 border border-gray-200 px-4 py-6 rounded-2xl hover:bg-gray-100 transition-all flex flex-col items-center justify-center gap-2 font-bold text-sm h-full disabled:opacity-50"><Upload size={24} /> استيراد Excel</button>
              </div>
              <button disabled={isDriveLoading} onClick={handleDriveBackup} className="bg-yellow-50 text-yellow-700 border border-yellow-100 px-4 py-6 rounded-2xl hover:bg-yellow-100 transition-all flex flex-col items-center justify-center gap-2 font-bold text-sm disabled:opacity-50">
                  <HardDrive size={24} /> 
                  {isDriveLoading ? 'جاري الرفع...' : 'نسخ احتياطي (Google Drive)'}
              </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                  <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                      checked={settings.autoBackupDrive || false}
                      onChange={(e) => setSettings({...settings, autoBackupDrive: e.target.checked})}
                  />
                  <div>
                      <div className="font-bold text-gray-800">نسخ احتياطي تلقائي لجوجل درايف</div>
                      <div className="text-xs text-gray-500 mt-1">سيتم رفع نسخة احتياطية تلقائياً عند فتح التطبيق (يتطلب تسجيل الدخول المسبق)</div>
                  </div>
              </label>
          </div>
      </div>

      {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-up">
                  <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Trash2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-center mb-2">تأكيد استعادة البيانات</h3>
                  <p className="text-gray-500 text-center mb-8">
                      تحذير: استيراد هذا الملف سيقوم باستبدال جميع البيانات الحالية في التطبيق. هل أنت متأكد من رغبتك في المتابعة؟
                  </p>
                  <div className="flex gap-4">
                      <button 
                          onClick={() => setShowConfirm(null)}
                          className="flex-1 py-3 border rounded-xl font-bold hover:bg-gray-50 transition-colors"
                      >
                          إلغاء
                      </button>
                      <button 
                          onClick={() => {
                              if (showConfirm.type === 'excel') handleImportExcel(showConfirm.file);
                              else handleRestore(showConfirm.file);
                          }}
                          className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                      >
                          نعم، استبدال
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;
