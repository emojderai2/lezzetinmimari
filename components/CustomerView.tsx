import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { MenuCategoryWithItems, MenuItem, CartItem, VisitWithDetails } from '../types';
import { fetchVisibleMenuData, createOrder, fetchActiveVisitForTable } from '../services/supabaseService';

interface CustomerViewProps {
  tableId: string;
}

const formatCurrency = (price: number | null | undefined) => {
  if (price === null || price === undefined) return '';
  const formattedPrice = Number(price.toFixed(2));
  return `${formattedPrice} ₺`;
};

const OrderConfirmationModal: React.FC<{
    cart: CartItem[];
    total: number;
    onConfirm: () => void;
    onClose: () => void;
    isOrdering: boolean;
}> = ({ cart, total, onConfirm, onClose, isOrdering }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <h2 className="text-2xl font-bold mb-4 text-brand-dark">Siparişi Onayla</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-gray-700">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">{formatCurrency(item.price! * item.quantity)}</span>
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-xl font-bold text-brand-dark">Toplam:</span>
                <span className="text-xl font-bold text-brand-dark">{formatCurrency(total)}</span>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
                <button onClick={onClose} className="bg-gray-200 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300">Geri Dön</button>
                <button onClick={onConfirm} disabled={isOrdering} className="bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400">
                    {isOrdering ? <><i className="fas fa-spinner fa-spin mr-2"></i> Gönderiliyor...</> : 'Onayla ve Gönder'}
                </button>
            </div>
        </div>
    </div>
);


const CustomerView: React.FC<CustomerViewProps> = ({ tableId }) => {
  const [menuCategories, setMenuCategories] = useState<MenuCategoryWithItems[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'ordering' | 'success' | 'error'>('idle');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [currentVisit, setCurrentVisit] = useState<VisitWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'order' | 'status'>('order');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  const categoryRefs = useRef<Record<number, HTMLElement | null>>({});
  const headerRef = useRef<HTMLElement>(null);
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(120); // A safe default to start
  const isNavigatingRef = useRef(false);
  const navScrollTimeoutRef = useRef<number | null>(null);

  const loadVisitData = useCallback(async () => {
    const visitData = await fetchActiveVisitForTable(tableId);
    setCurrentVisit(visitData);
  }, [tableId]);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const categories = await fetchVisibleMenuData();
        setMenuCategories(categories.filter(c => c.menu_items && c.menu_items.length > 0));
        await loadVisitData();
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Menü yüklenirken bir hata oluştu.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [tableId, loadVisitData]);

  // Dynamically calculate the scroll offset for the sticky headers
  useEffect(() => {
      const calculateOffset = () => {
          if (headerRef.current && categoryNavRef.current) {
              const headerHeight = headerRef.current.offsetHeight;
              const navHeight = categoryNavRef.current.offsetHeight;
              // Total offset = header height + nav bar height + 16px extra padding
              setScrollOffset(headerHeight + navHeight + 16);
          }
      };

      // Use a timeout to ensure elements are rendered with correct dimensions after data load or tab switch
      const timer = setTimeout(calculateOffset, 100);

      // Recalculate on window resize as nav bar height might change due to text wrapping
      window.addEventListener('resize', calculateOffset);

      return () => {
          clearTimeout(timer);
          window.removeEventListener('resize', calculateOffset);
      };
  }, [isLoading, activeTab]);
  
  // Periodically poll for visit details updates
  useEffect(() => {
    if (!currentVisit?.id) {
        return; // No active visit, so nothing to poll
    }

    const interval = setInterval(() => {
        loadVisitData();
    }, 60000); // Poll every 1 minute

    return () => {
        clearInterval(interval);
    };
  }, [currentVisit?.id, loadVisitData]);

  // Handle scroll to update active category in nav
  useEffect(() => {
    const handleScroll = () => {
        if (isNavigatingRef.current) return; // Ignore scroll events during programmatic navigation

        const topOffset = scrollOffset;
        let currentCategory: number | null = null;
        
        menuCategories.forEach(cat => {
            const element = categoryRefs.current[cat.id];
            if (element) {
                const rect = element.getBoundingClientRect();
                if (rect.top <= topOffset) {
                    currentCategory = cat.id;
                }
            }
        });

        setActiveCategory(prevActiveCategory => {
            if (prevActiveCategory !== currentCategory) {
                const navButton = categoryNavRef.current?.querySelector(`[data-cat-id="${currentCategory}"]`);
                navButton?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                return currentCategory;
            }
            return prevActiveCategory;
        });
    };
    
    let scrollTimeout: number | null = null;
    const throttledScrollHandler = () => {
        if (scrollTimeout === null) {
            scrollTimeout = window.setTimeout(() => {
                handleScroll();
                scrollTimeout = null;
            }, 100);
        }
    };

    if (activeTab === 'order') {
        window.addEventListener('scroll', throttledScrollHandler);
    }

    return () => {
        window.removeEventListener('scroll', throttledScrollHandler);
        if (scrollTimeout) clearTimeout(scrollTimeout);
        if (navScrollTimeoutRef.current) clearTimeout(navScrollTimeoutRef.current);
    };
  }, [menuCategories, activeTab, scrollOffset]);


  // Handle click on a category nav button to scroll to it
  const handleNavClick = (categoryId: number) => {
      const element = categoryRefs.current[categoryId];
      if (element) {
          isNavigatingRef.current = true;
          setActiveCategory(categoryId); // Update UI immediately

          if (navScrollTimeoutRef.current) {
              clearTimeout(navScrollTimeoutRef.current);
          }
          
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - scrollOffset;
          
          window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
          });

          navScrollTimeoutRef.current = window.setTimeout(() => {
              isNavigatingRef.current = false;
          }, 800); // Allow 800ms for smooth scroll to finish
      }
  };


  const handleUpdateQuantity = (item: MenuItem, newQuantity: number) => {
    if (newQuantity <= 0) {
        setCart(prevCart => prevCart.filter(cartItem => cartItem.id !== item.id));
    } else {
        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
            if (existingItem) {
                return prevCart.map(cartItem =>
                    cartItem.id === item.id ? { ...cartItem, quantity: newQuantity } : cartItem
                );
            }
            return [...prevCart, { ...item, quantity: newQuantity }];
        });
    }
  };


  const total = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
  }, [cart]);
  
  const totalItems = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setOrderStatus('ordering');
    setOrderError(null);
    try {
      await createOrder(tableId, cart);
      setOrderStatus('success');
      setCart([]);
      setIsConfirming(false);
      await loadVisitData(); // Refresh placed orders
    } catch (err: any) {
      setOrderStatus('error');
      setOrderError(err.message || 'Sipariş gönderilirken beklenmedik bir hata oluştu.');
      setIsConfirming(false);
    }
  };
  
  const grandTotal = useMemo(() => {
    if (!currentVisit) return 0;
    return currentVisit.orders.reduce((total, order) => {
        return total + order.order_items.reduce((orderTotal, item) => {
            return orderTotal + (item.price * item.quantity);
        }, 0);
    }, 0);
  }, [currentVisit]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-5xl text-brand-gold"></i>
          <p className="mt-4 text-lg text-gray-700">Menü Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8 bg-white shadow-lg rounded-lg max-w-sm mx-auto">
          <i className="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
          <h1 className="text-2xl font-bold text-brand-dark">Hata</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <a onClick={() => window.location.hash = ''} className="mt-6 inline-block bg-brand-gold text-white py-2 px-5 rounded-lg cursor-pointer">Ana Sayfaya Dön</a>
        </div>
      </div>
    );
  }

  if (orderStatus === 'success') {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center p-8 bg-white shadow-lg rounded-lg max-w-sm mx-auto fade-in">
                <i className="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
                <h1 className="text-3xl font-bold text-brand-dark">Siparişiniz Alındı!</h1>
                <p className="mt-2 text-lg text-gray-600">
                    Siparişiniz hazırlanmak üzere mutfağa iletildi. Afiyet olsun!
                </p>
                <button 
                    onClick={() => {
                        setOrderStatus('idle');
                        setActiveTab('status');
                    }}
                    className="mt-6 inline-block bg-brand-gold text-white py-2 px-5 rounded-lg hover:bg-opacity-90 transition-all duration-300 shadow-md">
                    <i className="fas fa-receipt mr-2"></i>
                    Hesabımı Görüntüle
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen pb-32">
        <header ref={headerRef} className="bg-white shadow-md sticky top-0 z-40 h-[60px] flex items-center">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Logo" className="h-10" />
                
                <div className="flex items-center gap-4">
                    {/* Tab Selector - moved from center and made smaller */}
                    <div className="relative flex bg-gray-200 rounded-full p-0.5">
                        <span
                            className="absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out"
                            style={{ transform: activeTab === 'order' ? 'translateX(2px)' : 'translateX(calc(100% + 2px))' }}
                        />
                        <button 
                            onClick={() => setActiveTab('order')} 
                            className={`relative z-10 py-1.5 px-4 text-center text-sm font-semibold transition-colors duration-300 ${activeTab === 'order' ? 'text-brand-dark' : 'text-gray-500'}`}>
                            Sipariş
                        </button>
                        <button 
                            onClick={() => setActiveTab('status')} 
                            className={`relative z-10 py-1.5 px-4 text-center text-sm font-semibold transition-colors duration-300 ${activeTab === 'status' ? 'text-brand-dark' : 'text-gray-500'}`}>
                            Hesap
                        </button>
                    </div>
        
                    <div className="text-right">
                        <span className="text-xs text-gray-600">Masa</span>
                        <p className="font-bold text-xl text-brand-gold">{tableId}</p>
                    </div>
                </div>
            </div>
        </header>
        
        {activeTab === 'order' && (
             <div className="sticky top-[60px] bg-white z-30 shadow-sm border-b">
                <div ref={categoryNavRef} className="flex space-x-4 overflow-x-auto scrollbar-hide px-4 py-2">
                    {menuCategories.map(category => (
                        <button
                            key={category.id}
                            data-cat-id={category.id}
                            onClick={() => handleNavClick(category.id)}
                            className={`py-1 px-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-300 ${activeCategory === category.id ? 'bg-brand-dark text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>
        )}
        
        {activeTab === 'order' && (
             <main className="container mx-auto p-4 fade-in">
                {menuCategories.map(category => (
                    <section 
                        key={category.id}
                        id={`category-${category.id}`}
                        ref={el => (categoryRefs.current[category.id] = el)}
                        className="mb-8 pt-2"
                    >
                        <h2 className="text-3xl font-bold text-brand-dark mb-4 border-b-2 border-brand-gold pb-2">{category.name}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {category.menu_items.map(item => {
                                const quantityInCart = cart.find(ci => ci.id === item.id)?.quantity || 0;
                                return (
                                    <div key={item.id} className="bg-white rounded-lg shadow-md flex flex-col relative">
                                        {quantityInCart > 0 && (
                                            <div key={`${item.id}-${quantityInCart}`} className="absolute -top-2 -right-2 bg-red-600 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-white notification-pop z-10">
                                                {quantityInCart}
                                            </div>
                                        )}
                                        <img src={item.image_url || 'https://placehold.co/300x200/eee/ccc?text=Görsel'} alt={item.name} className="w-full h-32 object-cover rounded-t-lg"/>
                                        <div className="p-3 flex flex-col flex-grow">
                                            <h3 className="font-bold text-md text-gray-800">{item.name}</h3>
                                            <p className="text-xs text-gray-600 flex-grow mt-1">{item.description}</p>
                                            <div className="flex justify-between items-center mt-3">
                                                <span className="font-semibold text-brand-dark text-lg">{formatCurrency(item.price)}</span>
                                                <div className="flex items-center gap-2">
                                                    {quantityInCart > 0 && (
                                                        <button onClick={() => handleUpdateQuantity(item, quantityInCart - 1)} className="bg-gray-200 text-brand-dark rounded-full w-8 h-8 text-lg font-bold hover:bg-gray-300 transition-colors duration-200 active:scale-90">-</button>
                                                    )}
                                                    <button onClick={() => handleUpdateQuantity(item, quantityInCart + 1)} className="bg-brand-gold text-white rounded-full w-8 h-8 text-lg hover:bg-opacity-90 transition-transform duration-200 active:scale-90">
                                                        <i className="fas fa-plus"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                ))}
            </main>
        )}
        
        {activeTab === 'status' && (
             <main className="container mx-auto p-4 fade-in pb-24">
                 {!currentVisit || currentVisit.orders.length === 0 ? (
                    <div className="text-center p-8 bg-white rounded-lg shadow-md mt-4">
                        <i className="fas fa-receipt text-4xl text-gray-400 mb-3"></i>
                        <p className="text-gray-600">Henüz sipariş vermediniz.</p>
                        <button onClick={() => setActiveTab('order')} className="mt-4 bg-brand-gold text-white font-semibold py-2 px-4 rounded-lg">Hemen Sipariş Ver</button>
                    </div>
                 ) : (
                    <div className="space-y-4">
                         {currentVisit.orders.map((order, index) => {
                            const orderTotal = order.order_items.reduce((acc, item) => acc + item.price * item.quantity, 0);
                            return (
                                <div key={order.id} className="bg-white p-4 rounded-lg shadow-md">
                                    <div className="flex justify-between items-center border-b pb-2 mb-3">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-lg text-brand-dark">Sipariş #{index + 1}</h3>
                                            <span className={`font-semibold px-2 py-1 text-xs rounded-full ${
                                                {'new': 'bg-blue-100 text-blue-800', 'preparing': 'bg-yellow-100 text-yellow-800', 'ready': 'bg-green-100 text-green-800', 'delivered': 'bg-gray-200 text-gray-700'}[order.status]
                                            }`}>
                                                {
                                                    {'new': 'Mutfakta', 'preparing': 'Hazırlanıyor', 'ready': 'Servise Hazır', 'delivered': 'Servis Edildi'}[order.status]
                                                }
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-500">{new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="space-y-2">
                                    {order.order_items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-gray-700">
                                            <div>
                                                <span className="font-semibold">{item.quantity}x</span> {item.menu_items?.name}
                                            </div>
                                            <span className="font-mono">{formatCurrency(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                    </div>
                                    <div className="text-right font-bold mt-3 pt-2 border-t text-gray-800">
                                        Sipariş Toplamı: {formatCurrency(orderTotal)}
                                    </div>
                                </div>
                            );
                        })}
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-100/80 backdrop-blur-sm">
                            <div className="bg-brand-dark text-white p-4 rounded-xl shadow-2xl flex justify-between items-center max-w-xl mx-auto">
                                <span className="text-xl font-bold">Genel Toplam</span>
                                <span className="text-2xl font-extrabold">{formatCurrency(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                 )}
            </main>
        )}
        
        {isConfirming && (
            <OrderConfirmationModal
                cart={cart}
                total={total}
                onConfirm={handlePlaceOrder}
                onClose={() => setIsConfirming(false)}
                isOrdering={orderStatus === 'ordering'}
            />
        )}
        
        {activeTab === 'order' && cart.length > 0 && (
            <footer className="fixed bottom-0 left-0 right-0 bg-brand-dark text-white p-3 shadow-2xl z-50 transform transition-transform duration-300 ease-out">
                <div className="container mx-auto flex justify-between items-center gap-2">
                    <div className="flex-shrink min-w-0">
                        <p className="text-sm font-semibold truncate whitespace-nowrap">
                            {totalItems} ürün <span className="mx-1">|</span> {formatCurrency(total)}
                        </p>
                    </div>
                    <button onClick={() => setIsConfirming(true)} className="bg-brand-gold text-white font-bold py-2 px-4 rounded-lg text-base hover:bg-opacity-90 transition-all duration-300 flex items-center whitespace-nowrap flex-shrink-0">
                        Siparişi Onayla
                    </button>
                </div>
                {orderStatus === 'error' && (
                  <div className="text-center bg-red-500 text-white p-2 mt-2 rounded-md">
                    {orderError}
                  </div>
                )}
            </footer>
        )}
    </div>
  );
};

export default CustomerView;