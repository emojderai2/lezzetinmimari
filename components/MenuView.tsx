
import React, { useState, useEffect, useRef } from 'react';
import type { MenuCategoryWithItems, MenuItem } from '../types';
import { fetchVisibleMenuData } from '../services/supabaseService';

const formatCurrency = (price: number | null | undefined) => {
  if (price === null || price === undefined) return '';
  const formattedPrice = Number(price.toFixed(2));
  return `${formattedPrice} ₺`;
};

const MenuView: React.FC = () => {
  const [menuCategories, setMenuCategories] = useState<MenuCategoryWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [scrollOffset, setScrollOffset] = useState(140); // Header + Nav height approx

  const categoryRefs = useRef<Record<number, HTMLElement | null>>({});
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const isNavigatingRef = useRef(false);
  const navScrollTimeoutRef = useRef<number | null>(null);
  
  const openingDays = [26, 27, 28, 29, 30];

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const categories = await fetchVisibleMenuData();
        const filtered = categories.filter(c => c.menu_items && c.menu_items.length > 0);
        setMenuCategories(filtered);
        if (filtered.length > 0) {
            setActiveCategory(filtered[0].id);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Menü yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Scroll Spy Logic
  useEffect(() => {
    const handleScroll = () => {
        if (isNavigatingRef.current) return;

        // Add a bit more offset for better trigger point
        const topOffset = scrollOffset + 20; 
        let currentCategory: number | null = null;
        
        // Find the category that is currently at the top position
        for (const cat of menuCategories) {
            const element = categoryRefs.current[cat.id];
            if (element) {
                const rect = element.getBoundingClientRect();
                // If the top of the element is near the top of the viewport (accounting for offset)
                // OR if the bottom of the element is still visible
                if (rect.top <= topOffset && rect.bottom > topOffset) {
                    currentCategory = cat.id;
                    break; // Found the active one, stop loop
                }
            }
        }

        setActiveCategory(prevActiveCategory => {
            if (currentCategory && prevActiveCategory !== currentCategory) {
                const navButton = categoryNavRef.current?.querySelector(`[data-cat-id="${currentCategory}"]`);
                navButton?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                return currentCategory;
            }
            return prevActiveCategory;
        });
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [menuCategories, scrollOffset]);

  const handleNavClick = (categoryId: number) => {
      const element = categoryRefs.current[categoryId];
      if (element) {
          isNavigatingRef.current = true;
          setActiveCategory(categoryId);

          if (navScrollTimeoutRef.current) clearTimeout(navScrollTimeoutRef.current);
          
          const headerOffset = 130; // Approximate visible header + nav height
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - headerOffset;
          
          window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
          });

          navScrollTimeoutRef.current = window.setTimeout(() => {
              isNavigatingRef.current = false;
          }, 800);
      }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8f6f2]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
             <div className="absolute inset-0 border-4 border-[#b98d4a]/30 rounded-full animate-ping"></div>
             <div className="absolute inset-0 border-4 border-[#b98d4a] rounded-full flex items-center justify-center">
                <i className="fas fa-utensils text-[#b98d4a]"></i>
             </div>
          </div>
          <p className="text-lg text-[#b98d4a] font-medium tracking-widest animate-pulse">MENÜ YÜKLENİYOR</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-brand-dark">Hata</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f6f2] min-h-screen pb-20">
      {/* Modern Header (Light Theme) */}
      <header className="bg-white shadow-md sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
              {/* Left: Logo */}
              <div className="flex items-center gap-4">
                  <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Lezzetin Mimarı Logo" className="h-12 md:h-14" />
                  <div className="hidden sm:flex flex-col justify-center border-l border-gray-300 pl-4 h-10">
                      <span className="text-xs font-bold text-[#b98d4a] tracking-[0.2em]">DİJİTAL MENÜ</span>
                  </div>
              </div>

               {/* Right: Opening Dates */}
               <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-1 w-full">
                    {openingDays.map((day) => (
                      <div 
                        key={day} 
                        className="bg-[#b98d4a] text-white rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-[10px] md:text-xs font-bold shadow-sm"
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between w-full text-[10px] md:text-xs text-gray-500 font-medium mt-1 uppercase tracking-wide">
                    <span>Kasım'da</span>
                    <span>Hizmetinizde</span>
                  </div>
                </div>
          </div>

          {/* Category Navigation Bar */}
          <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
              <div ref={categoryNavRef} className="container mx-auto overflow-x-auto scrollbar-hide px-4 py-3 flex space-x-3">
                  {menuCategories.map(category => (
                      <button
                          key={category.id}
                          data-cat-id={category.id}
                          onClick={() => handleNavClick(category.id)}
                          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-300 transform ${
                              activeCategory === category.id 
                              ? 'bg-[#b98d4a] text-white shadow-md scale-105' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                          {category.name}
                      </button>
                  ))}
              </div>
          </div>
      </header>

      <main className="container mx-auto px-4 pt-8 relative z-10">
          {menuCategories.map((category, catIndex) => (
              <section 
                  key={category.id}
                  id={`category-${category.id}`}
                  ref={el => { categoryRefs.current[category.id] = el; }}
                  className="mb-12 scroll-mt-40"
              >
                  <div className="flex items-center gap-3 mb-6 pl-2">
                      <div className="w-1 h-8 bg-[#b98d4a] rounded-full"></div>
                      <h2 className="text-2xl md:text-3xl font-bold text-[#1e202a]">{category.name}</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {category.menu_items.map((item, index) => (
                          <div 
                              key={item.id} 
                              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col"
                              style={{ animationDelay: `${index * 50}ms` }}
                          >
                              <div className="relative h-48 overflow-hidden">
                                  <img 
                                      src={item.image_url || 'https://placehold.co/400x300/eee/ccc?text=Görsel'} 
                                      alt={item.name} 
                                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              </div>
                              
                              <div className="p-5 flex flex-col flex-grow">
                                  <div className="flex justify-between items-start mb-2">
                                      <h3 className="font-bold text-xl text-[#1e202a] group-hover:text-[#b98d4a] transition-colors">{item.name}</h3>
                                  </div>
                                  
                                  <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-grow">
                                      {item.description}
                                  </p>
                                  
                                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                      <span className="text-2xl font-bold text-[#b98d4a]">{formatCurrency(item.price)}</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </section>
          ))}
      </main>

      <footer className="text-center py-8 text-gray-500 text-sm">
        <p>© 2025 Lezzetin Mimarı</p>
        <p className="mt-1">Afiyet Olsun</p>
      </footer>
    </div>
  );
};

export default MenuView;
