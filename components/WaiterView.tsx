import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { TableWithStatus, VisitWithDetails, MenuCategoryWithItems, MenuItem, CartItem, RolePins } from '../types';
import {
  fetchTableStatuses,
  fetchVisitDetailsForWaiter,
  updateOrderStatus,
  createOrder,
  fetchVisibleMenuData,
  fetchRolePins,
} from '../services/supabaseService';

const formatCurrency = (price: number | null | undefined) => {
  if (price === null || price === undefined) return '';
  const formattedPrice = Number(price.toFixed(2));
  return `${formattedPrice} ₺`;
};


const OrderConfirmationModal: React.FC<{
    cart: CartItem[];
    notes: string;
    total: number;
    onConfirm: () => void;
    onClose: () => void;
    isOrdering: boolean;
}> = ({ cart, notes, total, onConfirm, onClose, isOrdering }) => (
    <div className="modal-overlay">
        <div className="modal-content">
            <h2 className="text-2xl font-bold mb-4 text-brand-dark">Siparişi Onayla</h2>
            {notes && (
                 <div className="mb-4 p-2 bg-amber-100 text-amber-800 rounded-md text-sm">
                    <strong>Not:</strong> {notes}
                </div>
            )}
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


// Reusable OrderTaking component
const OrderTakingMenu: React.FC<{ tableNumber: number; onOrderPlaced: () => void; onClose: () => void; }> = ({ tableNumber, onOrderPlaced, onClose }) => {
    const [menuCategories, setMenuCategories] = useState<MenuCategoryWithItems[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [orderStatus, setOrderStatus] = useState<'idle' | 'ordering' | 'error'>('idle');
    const [notes, setNotes] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        const loadMenu = async () => {
            setIsLoading(true);
            try {
                const categories = await fetchVisibleMenuData();
                setMenuCategories(categories);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadMenu();
    }, []);
    
    useEffect(() => {
        if (isConfirming) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
    }, [isConfirming]);


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


    const total = useMemo(() => cart.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0), [cart]);
    const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

    const handlePlaceOrder = async () => {
        if (cart.length === 0) return;
        setOrderStatus('ordering');
        try {
            await createOrder(tableNumber, cart, notes);
            onOrderPlaced(); // This will close the modal and refresh tables
        } catch (err) {
            setOrderStatus('error');
            console.error(err);
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="bg-white flex flex-col h-full">
            <header className="bg-brand-dark text-white p-4 flex justify-between items-center sticky top-0 z-10">
                <h2 className="text-xl md:text-2xl font-bold">Masa {tableNumber} - Yeni Sipariş</h2>
                <button onClick={onClose} className="text-3xl font-bold">&times;</button>
            </header>
            <main className="flex-grow overflow-y-auto p-2 md:p-4">
                {isLoading ? <p className="text-center p-4">Menü yükleniyor...</p> : (
                    <>
                        <div className="mb-4">
                            <label htmlFor="order-notes" className="block text-sm font-medium text-gray-700">Sipariş Notu (İsteğe Bağlı)</label>
                            <textarea
                                id="order-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="Örn: Az pişmiş, soğansız..."
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-gold focus:ring-brand-gold sm:text-sm"
                            />
                        </div>
                        {menuCategories.map(category => (
                            <section key={category.id} className="mb-6">
                                <h3 className="text-xl md:text-2xl font-bold text-brand-dark mb-3">{category.name}</h3>
                                <div className="space-y-2">
                                    {category.menu_items.map(item => {
                                        const quantityInCart = cart.find(ci => ci.id === item.id)?.quantity || 0;
                                        return (
                                            <div key={item.id} className={`border rounded-lg p-4 flex justify-between items-center transition-colors ${quantityInCart > 0 ? 'bg-amber-100 border-amber-300' : 'bg-white'}`}>
                                                <div>
                                                    <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
                                                    <span className="text-base text-gray-600">{formatCurrency(item.price)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleUpdateQuantity(item, quantityInCart - 1)} className="bg-gray-200 text-brand-dark rounded-full w-10 h-10 text-xl font-bold hover:bg-gray-300 transition-colors disabled:opacity-50" disabled={quantityInCart === 0}>-</button>
                                                    <span className="font-bold text-brand-dark text-xl w-8 text-center">{quantityInCart > 0 ? quantityInCart : ''}</span>
                                                    <button onClick={() => handleUpdateQuantity(item, quantityInCart + 1)} className="bg-gray-200 text-brand-dark rounded-full w-10 h-10 text-xl font-bold hover:bg-gray-300 transition-colors">+</button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        ))}
                    </>
                )}
            </main>
            {isConfirming && (
                <OrderConfirmationModal 
                    cart={cart}
                    notes={notes}
                    total={total}
                    onConfirm={handlePlaceOrder}
                    onClose={() => setIsConfirming(false)}
                    isOrdering={orderStatus === 'ordering'}
                />
            )}
            {cart.length > 0 && (
                <footer className="bg-brand-dark text-white p-3 md:p-4 shadow-inner">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-md md:text-lg font-semibold">{totalItems} ürün</span>
                            <span className="mx-2">|</span>
                            <span className="text-lg md:text-xl font-bold">{formatCurrency(total)}</span>
                        </div>
                        <button onClick={() => setIsConfirming(true)} className="bg-brand-gold text-white font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg text-md md:text-lg hover:bg-opacity-90">
                           <i className="fas fa-arrow-right mr-2"></i> Siparişi Onayla
                        </button>
                    </div>
                </footer>
            )}
        </div>
    );
};

// Manage Table Modal component
const ManageTableModal: React.FC<{ table: TableWithStatus, onOpenOrderMenu: () => void, onMarkAsDelivered: () => void, onClose: () => void }> = ({ table, onOpenOrderMenu, onMarkAsDelivered, onClose }) => {
    const [visit, setVisit] = useState<VisitWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!table.visit_id) return;
        setIsLoading(true);
        fetchVisitDetailsForWaiter(table.visit_id)
            .then(data => setVisit(data))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [table.visit_id]);

    const handleMarkAsDelivered = async (orderId: string) => {
        await updateOrderStatus(orderId, 'delivered');
        // Refresh details
        if(table.visit_id) {
             const data = await fetchVisitDetailsForWaiter(table.visit_id);
             setVisit(data);
             onMarkAsDelivered();
        }
    };

    const total = useMemo(() => {
        if (!visit) return 0;
        return visit.orders.reduce((acc, order) => {
            return acc + order.order_items.reduce((itemTotal, item) => itemTotal + (item.price * item.quantity), 0);
        }, 0);
    }, [visit]);

    return (
         <div className="bg-white flex flex-col h-full">
            <header className="bg-brand-dark text-white p-4 flex justify-between items-center sticky top-0 z-10">
                <div>
                   <h2 className="text-xl md:text-2xl font-bold">Masa {table.table_number}</h2>
                   <span className="text-xs md:text-sm">Toplam: {formatCurrency(total)}</span>
                </div>
                <button onClick={onClose} className="text-3xl font-bold">&times;</button>
            </header>
            <main className="flex-grow overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4">
                {isLoading ? <p>Yükleniyor...</p> : !visit ? <p>Masa detayı bulunamadı.</p> : (
                    visit.orders.map(order => (
                        <div key={order.id} className={`p-3 md:p-4 rounded-lg shadow ${order.status === 'ready' ? 'bg-blue-100' : order.status === 'delivered' ? 'bg-gray-200' : 'bg-white'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-md md:text-lg">Sipariş - {new Date(order.created_at).toLocaleTimeString()}</h3>
                                <span className={`font-semibold px-2 py-1 text-xs md:text-sm rounded-full ${
                                    {'new': 'bg-blue-200 text-blue-800', 'preparing': 'bg-yellow-200 text-yellow-800', 'ready': 'bg-green-200 text-green-800', 'delivered': 'bg-gray-300 text-gray-800'}[order.status]
                                }`}>{
                                    {'new': 'Mutfakta', 'preparing': 'Hazırlanıyor', 'ready': 'Servise Hazır', 'delivered': 'Servis Edildi'}[order.status]
                                }</span>
                            </div>
                            {order.notes && (
                                <div className="text-sm italic text-amber-800 bg-amber-100 p-2 rounded-md my-2">
                                    <i className="fas fa-sticky-note mr-2"></i>
                                    <strong>Not:</strong> {order.notes}
                                </div>
                            )}
                            <ul className="pl-2 border-l-2 text-sm md:text-base">
                                {order.order_items.map(item => <li key={item.id}>{item.quantity}x {item.menu_items?.name}</li>)}
                            </ul>
                            {order.status === 'ready' && (
                                <button onClick={() => handleMarkAsDelivered(order.id)} className="w-full mt-3 bg-green-500 text-white font-bold py-2 rounded-lg hover:bg-green-600">Servis Edildi Olarak İşaretle</button>
                            )}
                        </div>
                    ))
                )}
            </main>
             <footer className="bg-brand-dark text-white p-3 md:p-4 shadow-inner">
                 <button onClick={onOpenOrderMenu} className="w-full bg-brand-gold text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-opacity-90">
                     <i className="fas fa-plus mr-2"></i> Yeni Sipariş Ekle
                 </button>
             </footer>
        </div>
    )
};

const PinEntry: React.FC<{ onPinVerified: () => void; correctPin: string; roleName: string }> = ({ onPinVerified, correctPin, roleName }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    useEffect(() => {
        if (pin.length === 4) {
            if (pin === correctPin) {
                onPinVerified();
            } else {
                setError('Hatalı PIN. Lütfen tekrar deneyin.');
                setIsShaking(true);
                setTimeout(() => {
                    setIsShaking(false);
                    setPin('');
                }, 820); // Corresponds to animation duration
            }
        }
    }, [pin, correctPin, onPinVerified]);
    
    // Clear error message when user starts typing again
    useEffect(() => {
        if (pin.length > 0 && error) {
            setError('');
        }
    }, [pin, error]);

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            setPin(pin + num);
        }
    };

    const handleDeleteClick = () => {
        setPin(pin.slice(0, -1));
    };

    const numpadLayout = [
        '1', '2', '3',
        '4', '5', '6',
        '7', '8', '9',
        '', '0', 'DEL'
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
            <div className="w-full max-w-xs bg-white p-8 rounded-2xl shadow-xl text-center">
                 <h1 className="text-2xl font-bold text-brand-dark mb-2">{roleName} Girişi</h1>
                 <p className="text-gray-600 mb-6 text-sm">Devam etmek için 4 haneli PIN kodunuzu girin.</p>
                 
                 <div className={`flex justify-center gap-4 mb-2 ${isShaking ? 'shake' : ''}`}>
                    {Array(4).fill(0).map((_, i) => (
                        <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${pin.length > i ? 'bg-brand-dark border-brand-dark' : 'border-gray-300 bg-transparent'}`}></div>
                    ))}
                 </div>
                 
                 <p className="text-red-500 text-sm h-5 mb-4">{error}</p>

                 <div className="grid grid-cols-3 gap-4">
                     {numpadLayout.map((key) => {
                         if (key === '') return <div key="placeholder"></div>;
                         if (key === 'DEL') {
                             return (
                                 <button 
                                     key="delete" 
                                     onClick={handleDeleteClick}
                                     className="h-16 bg-gray-100 rounded-full text-2xl font-semibold text-gray-800 hover:bg-gray-200 active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-gold transition-colors"
                                >
                                    <i className="fas fa-backspace"></i>
                                </button>
                             );
                         }
                         return (
                            <button 
                                key={key}
                                onClick={() => handleNumberClick(key)}
                                className="h-16 bg-gray-100 rounded-full text-2xl font-semibold text-gray-800 hover:bg-gray-200 active:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-gold transition-colors"
                            >
                                {key}
                            </button>
                         );
                     })}
                 </div>
                 
                 <div className="mt-8">
                    <a onClick={() => window.location.hash = 'employee'} className="text-sm text-gray-500 hover:text-brand-gold">
                        <i className="fas fa-arrow-left mr-1"></i>
                        Çalışan Arayüzüne Dön
                    </a>
                </div>
            </div>
        </div>
    );
};

const WaiterView: React.FC = () => {
    const [tables, setTables] = useState<TableWithStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<{ type: 'order' | 'manage'; table: TableWithStatus } | null>(null);
    
    const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('waiter_pin_verified') === 'true');
    const [correctPin, setCorrectPin] = useState<string | null>(null);


    useEffect(() => {
        const getPins = async () => {
            try {
                const pins = await fetchRolePins();
                const waiterPin = pins.find(p => p.role === 'waiter')?.pin;
                if (!waiterPin) {
                    setError('Garson PIN kodu ayarlanmamış. Lütfen yöneticiyle görüşün.');
                } else {
                    setCorrectPin(waiterPin);
                }
            } catch (err: any) {
                setError(err.message);
            }
        };
        if(!isAuthenticated) {
            getPins();
        }
    }, [isAuthenticated]);


    const fetchAndSetTables = useCallback(async () => {
        try {
            const data = await fetchTableStatuses();
            setTables(data);
        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    useEffect(() => {
        if (!isAuthenticated) return;

        fetchAndSetTables();
        const interval = setInterval(fetchAndSetTables, 10000); // Poll every 10 seconds

        return () => clearInterval(interval);
    }, [fetchAndSetTables, isAuthenticated]);

    const handlePinVerified = () => {
        sessionStorage.setItem('waiter_pin_verified', 'true');
        setIsAuthenticated(true);
    };

    const handleTableClick = (table: TableWithStatus) => {
        if (!table.visit_status) { // Boş masa
            setActiveModal({ type: 'order', table });
        } else { // Dolu masa
            setActiveModal({ type: 'manage', table });
        }
    };

    const closeModal = () => {
        setActiveModal(null);
        fetchAndSetTables();
    };

    const openOrderMenuFromManage = () => {
        if(activeModal && activeModal.table) {
            setActiveModal({ type: 'order', table: activeModal.table });
        }
    }

    const renderTableCard = (table: TableWithStatus) => {
        const statusClass = table.has_ready_orders ? 'status-ready' : (table.visit_status === 'active' ? 'status-occupied' : 'status-available');
        const statusText = table.has_ready_orders ? 'Servise Hazır' : (table.visit_status === 'active' ? 'Dolu' : 'Boş');

        return (
            <div key={table.id} className={`table-card ${statusClass}`} onClick={() => handleTableClick(table)}>
                <span className="text-3xl sm:text-4xl">{table.table_number}</span>
                <span className="text-xs sm:text-sm mt-1">{statusText}</span>
            </div>
        );
    };

    if (!isAuthenticated) {
        if (error) return <div className="flex items-center justify-center h-screen text-red-500 bg-gray-100 p-4">{error}</div>;
        if (!correctPin) return <div className="flex items-center justify-center h-screen"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>;
        return <PinEntry onPinVerified={handlePinVerified} correctPin={correctPin} roleName="Garson" />;
    }

    return (
        <div className="bg-gray-100 min-h-screen">
             <header className="bg-brand-dark shadow-md sticky top-0 z-40 text-white">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl md:text-2xl font-bold">Garson Ekranı</h1>
                    </div>
                    <div className="space-x-2 md:space-x-4">
                        <a onClick={() => window.location.hash = 'employee'} className="text-xs md:text-sm bg-gray-600 text-white py-2 px-3 md:px-4 rounded-lg hover:bg-gray-700 transition cursor-pointer">
                            <i className="fas fa-users md:mr-2"></i><span className="hidden md:inline">Çalışan Arayüzü</span>
                        </a>
                        <a onClick={() => window.location.hash = ''} className="text-xs md:text-sm bg-brand-gold py-2 px-3 md:px-4 rounded-lg hover:bg-opacity-90 transition cursor-pointer">Ana Sayfa</a>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-2 md:p-4">
                 {isLoading && <div className="text-center"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>}
                 {error && <div className="text-center text-red-500">{error}</div>}
                 {!isLoading && !error && (
                     <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                         {tables.map(renderTableCard)}
                     </div>
                 )}
            </main>

            {activeModal && (
                <div className="modal-overlay">
                    <div className="waiter-modal-content">
                        {activeModal.type === 'order' && (
                            <OrderTakingMenu 
                                tableNumber={activeModal.table.table_number} 
                                onOrderPlaced={closeModal}
                                onClose={closeModal}
                            />
                        )}
                        {activeModal.type === 'manage' && (
                           <ManageTableModal 
                                table={activeModal.table} 
                                onOpenOrderMenu={openOrderMenuFromManage}
                                onMarkAsDelivered={fetchAndSetTables}
                                onClose={closeModal}
                           />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaiterView;