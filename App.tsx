
import React, { useState, useEffect } from 'react';
import type { SiteConfig, MenuCategoryWithItems } from './types';
import { fetchSiteConfig, fetchVisibleMenuData } from './services/supabaseService';
import Header from './components/Header';
import Hero from './components/Hero';
import Countdown from './components/Countdown';
import BrandStory from './components/BrandStory';
import Values from './components/Values';
import EventContent from './components/EventContent';
import Menu from './components/Menu';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel';
import CustomerView from './components/CustomerView';
import WaiterView from './components/WaiterView';
import KitchenView from './components/KitchenView';
import CashierView from './components/CashierView';
import EmployeeHub from './components/EmployeeHub';
import DevSwitcher from './components/DevSwitcher';
import MenuView from './components/MenuView';


// Assume AOS is globally available from index.html
declare const AOS: any;

interface Route {
  path: string;
  params: string[];
}

const App: React.FC = () => {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategoryWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>({ path: 'main', params: [] });
  const [isDevEnvironment, setIsDevEnvironment] = useState(false);

  useEffect(() => {
    // AI Studio gibi geliştirme ortamlarını tespit etmek için `window.aistudio` kontrolü yapılır.
    // Bu, "Dev Switcher" butonunun sadece bu ortamlarda gösterilmesini sağlar.
    if ((window as any).aistudio) {
      setIsDevEnvironment(true);
    }
  }, []);

  useEffect(() => {
    const getRoute = (): Route => {
      const hash = window.location.hash.slice(1);
      if (!hash) return { path: 'main', params: [] };
      const parts = hash.split('/').filter(p => p); // Filter out empty strings from //
      const path = parts[0] || 'main';
      const params = parts.slice(1);
      return { path, params };
    };
    
    setRoute(getRoute());

    const handleHashChange = () => {
      setRoute(getRoute());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);


  useEffect(() => {
    // Load data only for the main page
    if (route.path === 'main') {
      setIsLoading(true);
      const loadData = async () => {
        try {
          const config = await fetchSiteConfig();
          const categories = await fetchVisibleMenuData();
          setSiteConfig(config);
          setMenuCategories(categories);
          setError(null);
        } catch (err: any) {
          setError(err.message || 'An unexpected error occurred.');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    }
  }, [route.path]);

  useEffect(() => {
    // Initialize or refresh AOS only on the main page
    if (route.path === 'main') {
      AOS.init({
        duration: 600,
        once: true,
        offset: 50,
      });
    }
  }, [route.path]);
  
  // Refresh AOS when async data loads on main page
  useEffect(() => {
    if (route.path === 'main' && !isLoading) {
      setTimeout(() => {
        AOS.refresh();
      }, 100);
    }
  }, [isLoading, route.path]);

  // Smooth scroll handler for main page
  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const targetId = e.currentTarget.getAttribute('href');
    if (!targetId) return;
    const targetElement = document.querySelector(targetId);
    
    if (targetElement) {
      const headerOffset = document.querySelector('header')?.offsetHeight || 0;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset - 20;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const renderPage = () => {
    switch (route.path) {
      case 'employee':
        return <EmployeeHub />;
      case 'admin':
        return <AdminPanel />;
      case 'menu':
        const tableId = route.params[0];
        return tableId ? <CustomerView tableId={tableId} /> : <div className="flex items-center justify-center h-screen"><div className="text-center p-8 bg-white shadow-lg rounded-lg">Masa Numarası Eksik. Lütfen QR kodu tekrar okutun.</div></div>;
      case 'view-menu': // QR Code digital menu (read-only)
        return <MenuView />;
      case 'waiter':
        return <WaiterView />;
      case 'kitchen':
        return <KitchenView />;
      case 'cashier':
        return <CashierView />;
      case 'main':
      default:
        // Render Main Page Error State
        if (error) {
          const isConfigError = error.includes("Supabase anahtarları");

          return (
            <div className="flex items-center justify-center h-screen bg-[#f8f6f2] text-[#1e202a]">
              <div className="text-center p-8 bg-white shadow-xl rounded-2xl max-w-2xl mx-4">
                <i className={`fas ${isConfigError ? 'fa-cogs' : 'fa-exclamation-triangle'} text-5xl text-red-500 mb-4`}></i>
                <h1 className="text-3xl font-bold mb-4 text-brand-dark">
                  {isConfigError ? "Yapılandırma Gerekli" : "Bir Hata Oluştu"}
                </h1>
                <p className="text-gray-700 text-lg">{error}</p>
                
                {isConfigError && (
                   <div className="mt-6 text-left bg-gray-100 p-4 rounded-lg border-l-4 border-brand-gold">
                      <p className="font-semibold text-gray-800">Ne Yapmalısınız?</p>
                      <p className="mt-2 text-sm text-gray-600">
                        AI Studio'da önizleme yapabilmek için, projenizdeki 
                        <code className="bg-gray-300 text-gray-800 px-1 py-0.5 rounded-md mx-1 font-mono">services/supabaseService.ts</code> 
                        dosyasını açıp kendi Supabase anahtarlarınızı girmeniz gerekmektedir. Bu işlem Netlify'daki yayınlanan sitenizi etkilemez.
                      </p>
                   </div>
                )}
                
                {!isConfigError && (
                  <p className="mt-4 text-gray-500">Lütfen daha sonra tekrar deneyin veya internet bağlantınızı kontrol edin.</p>
                )}
              </div>
            </div>
          );
        }

        // Render Main Page
        return (
          <div className="bg-[#f8f6f2] text-[#1e202a]">
            <Header />
            <main>
              <Hero config={siteConfig} onScroll={handleSmoothScroll} />
              <Countdown 
                enabled={siteConfig?.countdown_enabled ?? false} 
                targetDate={siteConfig?.countdown_target ?? ''} 
              />
              <BrandStory config={siteConfig} />
              <Values config={siteConfig} />
              <EventContent config={siteConfig} onScroll={handleSmoothScroll} />
              <Menu categories={menuCategories} isLoading={isLoading} />
            </main>
            <Footer />
          </div>
        );
      }
  };

  return (
    <>
      {renderPage()}
      {isDevEnvironment && <DevSwitcher />}
    </>
  );
};

export default App;
