
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Calculator from './pages/Calculator';
import Invoices from './pages/Invoices';
import InvoiceReview from './pages/InvoiceReview';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Suppliers from './pages/Suppliers';
import Clients from './pages/Clients';
import Items from './pages/Items';
import Shortages from './pages/Shortages';
import OnlineSearch from './pages/OnlineSearch';
import Login from './components/Login';
import Activation from './components/Activation';
import { ActivationService } from './services/activationService';
import { StorageService } from './services/storageService';
import { FirebaseService } from './services/firebaseService';
import { GoogleDriveService } from './services/googleDriveService';
import { auth } from './firebase';
import { Cloud, LogIn } from 'lucide-react';

const App: React.FC = () => {
  const [isActivated, setIsActivated] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCloudSyncActive, setIsCloudSyncActive] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    // 1. Check Activation
    const activated = ActivationService.isActivated();
    setIsActivated(activated);

    // 2. Check Authentication
    const authSession = sessionStorage.getItem('is_auth');
    if (authSession === 'true') {
      setIsAuthenticated(true);
    }
    
    // Test Firebase Connection
    FirebaseService.testConnection();

    // 3. Cloud Sync Listener Management
    let unsubscribeCloud: (() => void) | null = null;
    
    const manageCloudListener = () => {
      const settings = StorageService.getSettings();
      const isSyncEnabled = settings.cloudConfig?.enabled && settings.cloudConfig?.groupId;
      const isUserLoggedIn = !!auth.currentUser;

      if (isSyncEnabled) {
        if (isUserLoggedIn) {
          setShowLoginPrompt(false);
          if (!unsubscribeCloud) {
            unsubscribeCloud = FirebaseService.listenToCloudChanges(settings.cloudConfig!.groupId, () => {
              localStorage.setItem('pharmamind_last_sync', new Date().toISOString());
              window.dispatchEvent(new Event('cloud-data-updated'));
            });
            setIsCloudSyncActive(true);
          }
        } else {
          setShowLoginPrompt(true);
          setIsCloudSyncActive(false);
          if (unsubscribeCloud) {
            unsubscribeCloud();
            unsubscribeCloud = null;
          }
        }
      } else {
        setShowLoginPrompt(false);
        setIsCloudSyncActive(false);
        if (unsubscribeCloud) {
          unsubscribeCloud();
          unsubscribeCloud = null;
        }
      }
    };

    // Listen for auth changes to trigger listener management
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // When user logs in, try to fetch their cloud settings
        try {
          const cloudSettings = await FirebaseService.getUserSettings();
          if (cloudSettings && cloudSettings.cloudConfig) {
            const currentSettings = StorageService.getSettings();
            // Only update if cloud settings are different and sync is enabled in cloud
            if (cloudSettings.cloudConfig.enabled) {
              const shouldUpdateSettings = 
                currentSettings.cloudConfig?.groupId !== cloudSettings.cloudConfig.groupId || 
                !currentSettings.cloudConfig?.enabled;

              if (shouldUpdateSettings) {
                StorageService.saveSettings({
                  ...currentSettings,
                  pharmacyName: cloudSettings.pharmacyName || currentSettings.pharmacyName,
                  cloudConfig: cloudSettings.cloudConfig
                });
              }

              // Automatic download of all data on login if groupId exists
              if (cloudSettings.cloudConfig.groupId) {
                console.log('Auto-downloading cloud data on login for group:', cloudSettings.cloudConfig.groupId);
                await FirebaseService.downloadAllDataFromCloud(cloudSettings.cloudConfig.groupId);
                localStorage.setItem('pharmamind_last_sync', new Date().toISOString());
                window.dispatchEvent(new Event('cloud-data-updated'));
              }
            }
          }
        } catch (e) {
          console.error('Failed to fetch user settings or data on login:', e);
        }
      }
      manageCloudListener();
    });

    // Initial check
    manageCloudListener();

    // Automatic Google Drive Backup
    const performAutoBackup = async () => {
      const settings = StorageService.getSettings();
      if (settings.autoBackupDrive) {
        const token = GoogleDriveService.getStoredToken();
        if (token) {
          try {
            const lastBackup = localStorage.getItem('last_gdrive_autobackup');
            const today = new Date().toISOString().split('T')[0];
            
            // Only auto-backup once per day to avoid spamming
            if (lastBackup !== today) {
              const data = StorageService.createBackup();
              const fileName = `pharmamind_autobackup_${today}.json`;
              await GoogleDriveService.uploadBackup(token, data, fileName);
              localStorage.setItem('last_gdrive_autobackup', today);
              console.log('Auto-backup to Google Drive successful');
            }
          } catch (e) {
            console.error('Auto-backup to Google Drive failed:', e);
          }
        }
      }
    };
    
    performAutoBackup();

    // Listen for settings changes
    window.addEventListener('settings-updated', manageCloudListener);

    setLoading(false);
    
    return () => {
      window.removeEventListener('settings-updated', manageCloudListener);
      unsubscribeAuth();
      if (unsubscribeCloud) {
        unsubscribeCloud();
      }
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  // Flow: Activation -> Login -> App
  if (!isActivated) {
      return <Activation onActivate={() => setIsActivated(true)} />;
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <HashRouter>
      <Layout>
        {showLoginPrompt && (
          <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Cloud size={18} className="animate-pulse" />
              <span>المزامنة السحابية مفعلة ولكنك غير مسجل الدخول بـ Google.</span>
            </div>
            <button 
              onClick={() => FirebaseService.loginWithGoogle()}
              className="bg-white text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-indigo-50 transition-colors"
            >
              <LogIn size={14} /> تسجيل الدخول الآن
            </button>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/items" element={<Items />} />
          <Route path="/shortages" element={<Shortages />} />
          <Route path="/online-search" element={<OnlineSearch />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoice-review" element={<InvoiceReview />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
