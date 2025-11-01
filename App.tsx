
import React, { useState, useEffect } from 'react';
import type { SiteConfig, MenuCategoryWithItems } from './types';
import { fetchSiteConfig, fetchMenuData } from './services/supabaseService';
import Header from './components/Header';
import Hero from './components/Hero';
import BrandStory from './components/BrandStory';
import Values from './components/Values';
import EventContent from './components/EventContent';
import Menu from './components/Menu';
import Footer from './components/Footer';
import AdminPanel from './components/AdminPanel'; // Import the new component

// Assume AOS is globally available from index.html
declare const AOS: any;

const App: React.FC = () => {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategoryWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<'main' | 'admin'>(
    window.location.hash === '#admin' ? 'admin' : 'main'
  );

  useEffect(() => {
    // Basic hash-based routing
    const handleHashChange = () => {
      setPage(window.location.hash === '#admin' ? 'admin' : 'main');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);


  useEffect(() => {
    // Load data only for the main page
    if (page === 'main') {
      const loadData = async () => {
        try {
          setIsLoading(true);
          const config = await fetchSiteConfig();
          const categories = await fetchMenuData();
          setSiteConfig(config);
          setMenuCategories(categories);
        } catch (err: any) {
          setError(err.message || 'An unexpected error occurred.');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadData();
    }
  }, [page]);

  useEffect(() => {
    // Initialize or refresh AOS
    if (page === 'main') {
      AOS.init({
        duration: 600,
        once: true,
        offset: 50,
      });
    }
  }, [page]);
  
  // Refresh AOS when async data loads on main page
  useEffect(() => {
    if (page === 'main' && !isLoading) {
      setTimeout(() => {
        AOS.refresh();
      }, 100);
    }
  }, [isLoading, page]);

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

  // Render Admin Panel
  if (page === 'admin') {
    return <AdminPanel />;
  }

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
        <BrandStory config={siteConfig} />
        <Values config={siteConfig} />
        <EventContent config={siteConfig} onScroll={handleSmoothScroll} />
        <Menu categories={menuCategories} isLoading={isLoading} />
      </main>
      <Footer />
    </div>
  );
};

export default App;
