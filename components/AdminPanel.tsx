import React, { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../services/supabaseService';
import AdminDashboard from './AdminDashboard';
import AdminSiteSettings from './AdminSiteSettings';
import AdminMenuManagement from './AdminMenuManagement';
import AdminTableManagement from './AdminTableManagement';
import AdminPinManagement from './AdminPinManagement';


// Helper function for Toast notifications
const showToast = (message: string, type = 'success') => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
};

// ===================================================================================
// Main Admin Panel Component
// ===================================================================================
const AdminPanel: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [authError, setAuthError] = useState('');
    const formRef = useRef<HTMLFormElement>(null);

    const supabase = getSupabaseClient();

    // Global error handler to get more details on "Script error."
    useEffect(() => {
        console.log('[AdminPanel] Attaching global error handler.');
        const originalOnError = window.onerror;
        window.onerror = function(message, source, lineno, colno, error) {
            console.log('%cGLOBAL ERROR CAUGHT:', 'color: red; font-weight: bold;', {
                message,
                source,
                lineno,
                colno,
                error
            });
            if (originalOnError) {
                // @ts-ignore
                return originalOnError.apply(this, arguments);
            }
            return false;
        };

        return () => {
            console.log('[AdminPanel] Restoring original error handler.');
            window.onerror = originalOnError;
        };
    }, []);

    useEffect(() => {
        document.body.classList.remove('bg-[#f8f6f2]');
        document.body.classList.add('bg-gray-100');
        
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setIsLoading(false);
        };
        
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            subscription?.unsubscribe();
            document.body.classList.add('bg-[#f8f6f2]');
            document.body.classList.remove('bg-gray-100');
        };
    }, [supabase.auth]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        const email = formRef.current?.email.value;
        const password = formRef.current?.password.value;

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setAuthError(error.message);
        } else {
            showToast('Giriş başarılı!', 'success');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        showToast('Başarıyla çıkış yapıldı.');
    };

    const handleGoHome = () => {
        window.location.hash = '/';
    };

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'dashboard': return <AdminDashboard />;
            case 'site': return <AdminSiteSettings />;
            case 'menu': return <AdminMenuManagement />;
            case 'tables': return <AdminTableManagement />;
            case 'pins': return <AdminPinManagement />;
            default: return null;
        }
    };
    
    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-brand-dark"></div>;
    }

    if (!session) {
        return (
            <>
              <div id="toast" className="toast">Bildirim Mesajı</div>
              <div id="auth-screen" className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
                  <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                      <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Lezzetin Mimarı Logo" className="w-48 mx-auto mb-6" />
                      <h1 className="text-2xl font-bold text-gray-800 mb-4">Yönetim Paneli Girişi</h1>
                      <form ref={formRef} onSubmit={handleLogin}>
                          <div className="mb-4 text-left">
                              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                              <input type="email" id="email" name="email" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold" placeholder="admin@example.com" />
                          </div>
                          <div className="mb-6 text-left">
                              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                              <input type="password" id="password" name="password" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold" placeholder="••••••••" />
                          </div>
                          <button type="submit" className="w-full bg-brand-gold text-white py-2 px-4 rounded-lg font-semibold hover:bg-opacity-90 transition duration-300">
                              Giriş Yap
                          </button>
                      </form>
                      {authError && <p className="text-red-600 mt-4 text-sm">{authError}</p>}
                      <div className="mt-6 border-t pt-4">
                        <button onClick={handleGoHome} className="inline-block text-sm font-medium text-gray-500 hover:text-brand-gold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold rounded">
                            <i className="fas fa-arrow-left mr-1"></i>
                            Ana Sayfaya Dön
                        </button>
                      </div>
                  </div>
              </div>
            </>
        );
    }

    return (
        <>
            <style>{`.toggle-checkbox:checked~.dot{transform:translateX(100%);background-color:#b98d4a}.toggle-checkbox:checked~.block{background-color:#1e202a}`}</style>
            <div id="toast" className="toast">Bildirim Mesajı</div>
            <div id="admin-panel">
                <header className="bg-brand-dark shadow-md sticky top-0 z-50">
                    <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                        <button onClick={handleGoHome} className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-dark focus:ring-brand-gold rounded">
                           <h1 className="text-xl font-bold text-white">Yönetim Paneli</h1>
                        </button>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <button onClick={() => window.location.hash = 'employee'} className="text-sm bg-gray-600 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-700 transition duration-300">
                                <i className="fas fa-users sm:mr-2"></i><span className="hidden sm:inline">Çalışan Arayüzü</span>
                            </button>
                            <button onClick={handleLogout} className="text-sm bg-red-600 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-red-700 transition duration-300">
                                <i className="fas fa-sign-out-alt sm:mr-1"></i><span className="hidden sm:inline">Çıkış Yap</span>
                            </button>
                        </div>
                    </div>
                </header>
                <main className="container mx-auto p-2 sm:p-4 md:p-6">
                     <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg mb-8">
                        <nav className="border-b border-gray-200 mb-6">
                             <div className="flex space-x-4 sm:space-x-8 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide">
                                <button onClick={() => setActiveTab('dashboard')} className={`admin-tab py-4 px-1 text-sm sm:text-base border-b-4 whitespace-nowrap ${activeTab === 'dashboard' ? 'active' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                    <i className="fas fa-chart-line mr-2"></i>Pano
                                </button>
                                <button onClick={() => setActiveTab('menu')} className={`admin-tab py-4 px-1 text-sm sm:text-base border-b-4 whitespace-nowrap ${activeTab === 'menu' ? 'active' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                    <i className="fas fa-utensils mr-2"></i>Menü Yönetimi
                                </button>
                                <button onClick={() => setActiveTab('tables')} className={`admin-tab py-4 px-1 text-sm sm:text-base border-b-4 whitespace-nowrap ${activeTab === 'tables' ? 'active' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                    <i className="fas fa-chair mr-2"></i>Masa Yönetimi
                                </button>
                                <button onClick={() => setActiveTab('pins')} className={`admin-tab py-4 px-1 text-sm sm:text-base border-b-4 whitespace-nowrap ${activeTab === 'pins' ? 'active' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                    <i className="fas fa-key mr-2"></i>PIN Yönetimi
                                </button>
                                <button onClick={() => setActiveTab('site')} className={`admin-tab py-4 px-1 text-sm sm:text-base border-b-4 whitespace-nowrap ${activeTab === 'site' ? 'active' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                    <i className="fas fa-cog mr-2"></i>Site Ayarları
                                </button>
                            </div>
                        </nav>
                        {renderActiveTab()}
                    </div>
                </main>
            </div>
        </>
    );
};

export default AdminPanel;
