import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { MenuCategoryWithItems, MenuItem, CartItem, VisitWithDetails } from '../types';
import { fetchVisibleMenuData, createOrder, fetchActiveVisitForTable } from '../services/supabaseService';

interface CustomerViewProps {
  tableId: string;
}

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
                        <span className="font-medium">{(item.price! * item.quantity).toFixed(2)} TL</span>
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="text-xl font-bold text-brand-dark">Toplam:</span>
                <span className="text-xl font-bold text-brand-dark">{total.toFixed(2)} TL</span>
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

  const loadVisitData = useCallback(async () => {
    const visitData = await fetchActiveVisitForTable(tableId);
    setCurrentVisit(visitData);
  }, [tableId]);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const categories = await fetchVisibleMenuData();
        setMenuCategories(categories);
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
                    onClick={() => setOrderStatus('idle')} 
                    className="mt-6 inline-block bg-brand-gold text-white py-2 px-5 rounded-lg hover:bg-opacity-90 transition-all duration-300 shadow-md">
                    <i className="fas fa-plus mr-2"></i>
                    Yeni Sipariş Ver
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen pb-32">
        <header className="bg-white shadow-md sticky top-0 z-40">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Logo" className="h-12" />
                <div className="text-right">
                    <span className="text-sm text-gray-600">Masa Numaranız</span>
                    <p className="font-bold text-2xl text-brand-gold">{tableId}</p>
                </div>
            </div>
        </header>

        <main className="container mx-auto p-4">
            {currentVisit && currentVisit.orders.length > 0 && (
                <section className="mb-8 p-4 bg-green-50 rounded-lg shadow">
                    <h2 className="text-xl font-bold text-green-800 mb-3">Mevcut Siparişleriniz</h2>
                    <div className="space-y-3">
                        {currentVisit.orders.map(order => (
                            <div key={order.id} className="text-sm">
                                <p className="font-semibold text-gray-600">Sipariş ({new Date(order.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})})</p>
                                <ul className="list-disc list-inside text-gray-700">
                                    {order.order_items.map(item => (
                                        <li key={item.id}>{item.quantity}x {item.menu_items?.name}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {menuCategories.map(category => (
                <section key={category.id} className="mb-8">
                    <h2 className="text-3xl font-bold text-brand-dark mb-4 border-b-2 border-brand-gold pb-2">{category.name}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {category.menu_items.map(item => {
                            const quantityInCart = cart.find(ci => ci.id === item.id)?.quantity || 0;
                            return (
                                <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                                    <img src={item.image_url || 'https://placehold.co/300x200/eee/ccc?text=Görsel'} alt={item.name} className="w-full h-32 object-cover"/>
                                    <div className="p-3 flex flex-col flex-grow">
                                        <h3 className="font-bold text-md text-gray-800">{item.name}</h3>
                                        <p className="text-xs text-gray-600 flex-grow mt-1">{item.description}</p>
                                        <div className="flex justify-between items-center mt-3">
                                            <span className="font-semibold text-brand-dark text-lg">{item.price?.toFixed(2)} TL</span>
                                            {quantityInCart === 0 ? (
                                                <button onClick={() => handleUpdateQuantity(item, 1)} className="bg-brand-gold text-white rounded-full w-8 h-8 text-lg hover:bg-opacity-90 transition-transform duration-200 active:scale-90">
                                                    <i className="fas fa-plus"></i>
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-2 bg-gray-200 rounded-full">
                                                    <button onClick={() => handleUpdateQuantity(item, quantityInCart - 1)} className="text-brand-dark rounded-full w-7 h-7 text-lg hover:bg-gray-300 transition-colors">-</button>
                                                    <span className="font-bold text-brand-dark text-md w-4 text-center">{quantityInCart}</span>
                                                    <button onClick={() => handleUpdateQuantity(item, quantityInCart + 1)} className="text-brand-dark rounded-full w-7 h-7 text-lg hover:bg-gray-300 transition-colors">+</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            ))}
        </main>
        
        {isConfirming && (
            <OrderConfirmationModal
                cart={cart}
                total={total}
                onConfirm={handlePlaceOrder}
                onClose={() => setIsConfirming(false)}
                isOrdering={orderStatus === 'ordering'}
            />
        )}
        
        {cart.length > 0 && (
            <footer className="fixed bottom-0 left-0 right-0 bg-brand-dark text-white p-4 shadow-2xl z-50 transform transition-transform duration-300 ease-out">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <span className="text-lg font-semibold">{totalItems} ürün</span>
                        <span className="mx-2">|</span>
                        <span className="text-xl font-bold">{total.toFixed(2)} TL</span>
                    </div>
                    <button onClick={() => setIsConfirming(true)} className="bg-brand-gold text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90 transition-all duration-300 flex items-center">
                        <i className="fas fa-shopping-cart mr-2"></i> Siparişi Onayla
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