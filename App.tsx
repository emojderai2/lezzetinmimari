
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
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8f6f2] text-[#1e202a]">
        <div className="text-center p-4">
          <h1 className="text-3xl font-bold mb-4">Bir Hata Oluştu</h1>
          <p>{error}</p>
          <p className="mt-4">Lütfen daha sonra tekrar deneyin.</p>
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
