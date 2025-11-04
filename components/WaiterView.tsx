import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { TableWithStatus, VisitWithDetails, MenuCategoryWithItems, MenuItem, CartItem } from '../types';
import {
  fetchTableStatuses,
  fetchVisitDetailsForWaiter,
  subscribeToWaiterUpdates,
  updateOrderStatus,
  createOrder,
  fetchVisibleMenuData,
} from '../services/supabaseService';

// Reusable OrderTaking component
const OrderTakingMenu: React.FC<{ tableNumber: number; onOrderPlaced: () => void; onClose: () => void; }> = ({ tableNumber, onOrderPlaced, onClose }) => {
    const [menuCategories, setMenuCategories] = useState<MenuCategoryWithItems[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [orderStatus, setOrderStatus] = useState<'idle' | 'ordering' | 'error'>('idle');

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

    const handleAddToCart = (item: MenuItem) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
            if (existingItem) {
                return prevCart.map(cartItem => cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem);
            }
            return [...prevCart, { ...item, quantity: 1 }];
        });
    };

    const total = useMemo(() => cart.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0), [cart]);
    const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

    const handlePlaceOrder = async () => {
        if (cart.length === 0) return;
        setOrderStatus('ordering');
        try {
            await createOrder(tableNumber, cart);
            onOrderPlaced(); // This will close the modal and refresh tables
        } catch (err) {
            setOrderStatus('error');
            console.error(err);
        }
    };

    return (
        <div className="bg-white flex flex-col h-full">
            <header className="bg-brand-dark text-white p-4 flex justify-between items-center sticky top-0 z-10">
                <h2 className="text-xl md:text-2xl font-bold">Masa {tableNumber} - Yeni Sipariş</h2>
                <button onClick={onClose} className="text-3xl font-bold">&times;</button>
            </header>
            <main className="flex-grow overflow-y-auto p-2 md:p-4">
                {isLoading ? <p>Menü yükleniyor...</p> : (
                    menuCategories.map(category => (
                        <section key={category.id} className="mb-8">
                            <h3 className="text-xl md:text-2xl font-bold text-brand-dark mb-4">{category.name}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                                {category.menu_items.map(item => (
                                     <div key={item.id} onClick={() => handleAddToCart(item)} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col cursor-pointer hover:shadow-xl transition-shadow">
                                        <img src={item.image_url || 'https://placehold.co/300x200/eee/ccc?text=Görsel'} alt={item.name} className="w-full h-20 md:h-24 object-cover"/>
                                        <div className="p-2 md:p-3 flex flex-col flex-grow">
                                            <h4 className="font-bold text-xs md:text-sm text-gray-800">{item.name}</h4>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="font-semibold text-brand-dark text-sm md:text-md">{item.price?.toFixed(2)} TL</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </main>
            {cart.length > 0 && (
                <footer className="bg-brand-dark text-white p-3 md:p-4 shadow-inner">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="text-md md:text-lg font-semibold">{totalItems} ürün</span>
                            <span className="mx-2">|</span>
                            <span className="text-lg md:text-xl font-bold">{total.toFixed(2)} TL</span>
                        </div>
                        <button onClick={handlePlaceOrder} disabled={orderStatus === 'ordering'} className="bg-brand-gold text-white font-bold py-2 px-4 md:py-3 md:px-6 rounded-lg text-md md:text-lg hover:bg-opacity-90 disabled:bg-gray-500">
                           {orderStatus === 'ordering' ? <i className="fas fa-spinner fa-spin"></i> : "Siparişi Gönder"}
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
            if (order.status !== 'delivered') { // Kasiyer ekranı için hesap kapanana kadar tümü toplanmalı
                 return acc + order.order_items.reduce((itemTotal, item) => itemTotal + (item.price * item.quantity), 0);
            }
            return acc;
        }, 0);
    }, [visit]);

    return (
         <div className="bg-white flex flex-col h-full">
            <header className="bg-brand-dark text-white p-4 flex justify-between items-center sticky top-0 z-10">
                <div>
                   <h2 className="text-xl md:text-2xl font-bold">Masa {table.table_number}</h2>
                   <span className="text-xs md:text-sm">Toplam: {total.toFixed(2)} TL</span>
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


const WaiterView: React.FC = () => {
    const [tables, setTables] = useState<TableWithStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeModal, setActiveModal] = useState<{ type: 'order' | 'manage'; table: TableWithStatus } | null>(null);

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
        fetchAndSetTables();
        const channel = subscribeToWaiterUpdates(fetchAndSetTables);
        return () => { channel.unsubscribe(); };
    }, [fetchAndSetTables]);

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

    return (
        <div className="bg-gray-100 min-h-screen">
             <header className="bg-brand-dark shadow-md sticky top-0 z-40 text-white">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl md:text-2xl font-bold">Garson Ekranı</h1>
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