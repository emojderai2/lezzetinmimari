import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { OrderWithDetails, OrderItem } from '../types';
import {
  fetchKitchenOrders,
  updateOrderStatus,
  updateOrderItemStatus,
  subscribeToOrders
} from '../services/supabaseService';

type OrderStatus = 'new' | 'preparing' | 'ready';

const KITCHEN_COLUMNS: { id: OrderStatus, title: string }[] = [
    { id: 'new', title: 'Yeni Siparişler' },
    { id: 'preparing', title: 'Hazırlanıyor' },
    { id: 'ready', title: 'Teslime Hazır' }
];

const KitchenView: React.FC = () => {
    const [orders, setOrders] = useState<OrderWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
    const notificationSoundRef = useRef<HTMLAudioElement>(null);

    const fetchAndSetOrders = useCallback(async () => {
        try {
            const fetchedOrders = await fetchKitchenOrders();
            setOrders(fetchedOrders);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Siparişler yüklenirken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAndSetOrders();

        const channel = subscribeToOrders(() => {
            notificationSoundRef.current?.play();
            fetchAndSetOrders();
        });

        return () => {
            channel.unsubscribe();
        };
    }, [fetchAndSetOrders]);

    const itemSummary = useMemo(() => {
        const summary = new Map<string, number>();
        orders.forEach(order => {
            if (order.status !== 'ready') {
                order.order_items.forEach(item => {
                    if (item.status === 'pending' && item.menu_items) {
                        const currentCount = summary.get(item.menu_items.name) || 0;
                        summary.set(item.menu_items.name, currentCount + item.quantity);
                    }
                });
            }
        });
        return Array.from(summary.entries());
    }, [orders]);

    const handleItemStatusChange = async (orderId: string, itemId: number, isPrepared: boolean) => {
        const newStatus = isPrepared ? 'prepared' : 'pending';
        try {
            await updateOrderItemStatus(itemId, newStatus);

            // Update local state for instant UI feedback
            setOrders(prevOrders => {
                const newOrders = prevOrders.map(o => {
                    if (o.id === orderId) {
                        const newItems = o.order_items.map(i => i.id === itemId ? { ...i, status: newStatus } : i);
                        return { ...o, order_items: newItems };
                    }
                    return o;
                });
                
                // Also update selected order in modal
                const updatedOrder = newOrders.find(o => o.id === orderId);
                if (updatedOrder) {
                    setSelectedOrder(updatedOrder);

                    // Check if all items are prepared
                    const allPrepared = updatedOrder.order_items.every(i => i.status === 'prepared');
                    if (allPrepared && updatedOrder.status !== 'ready') {
                        handleOrderStatusChange(orderId, 'ready'); // Auto-move to ready
                    }
                }
                
                return newOrders;
            });

        } catch (e) {
            console.error(e);
            // Optionally show an error toast
        }
    };
    
    const handleOrderStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            if (newStatus === 'ready') {
                setSelectedOrder(null); // Close modal when moved to ready
            } else {
                 setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: newStatus } : prev);
            }
        } catch(e) {
            console.error(e);
        }
    };

    const renderOrderCard = (order: OrderWithDetails) => (
        <div 
            key={order.id}
            className={`kanban-card status-${order.status} notification-pop`}
            onClick={() => setSelectedOrder(order)}
        >
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg text-brand-dark">Masa {order.visits?.tables?.table_number ?? 'N/A'}</h3>
                <span className="text-sm text-gray-500">{new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <ul>
                {order.order_items.map(item => (
                    <li key={item.id} className="text-gray-700 text-sm">
                        <span className="font-semibold">{item.quantity}x</span> {item.menu_items?.name ?? 'Ürün'}
                    </li>
                ))}
            </ul>
        </div>
    );
    
    const renderModal = () => {
        if (!selectedOrder) return null;
        
        const allItemsPrepared = selectedOrder.order_items.every(i => i.status === 'prepared');

        return (
            <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-start">
                        <div>
                           <h2 className="text-3xl font-bold text-brand-dark">Masa {selectedOrder.visits?.tables?.table_number ?? 'N/A'}</h2>
                           <p className="text-gray-500">Sipariş Saati: {new Date(selectedOrder.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                        {selectedOrder.order_items.map(item => (
                             <div key={item.id} className={`p-3 rounded-lg flex items-center justify-between transition-colors ${item.status === 'prepared' ? 'bg-green-100' : 'bg-gray-100'}`}>
                                <div>
                                    <span className={`font-bold text-lg ${item.status === 'prepared' ? 'line-through text-gray-500' : 'text-brand-dark'}`}>
                                        {item.quantity}x {item.menu_items?.name ?? 'Ürün'}
                                    </span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="item-checkbox h-6 w-6"
                                    checked={item.status === 'prepared'}
                                    onChange={(e) => handleItemStatusChange(selectedOrder.id, item.id, e.target.checked)}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 border-t pt-4 flex justify-end space-x-3">
                        {selectedOrder.status === 'new' && (
                            <button 
                                onClick={() => handleOrderStatusChange(selectedOrder.id, 'preparing')}
                                className="bg-amber-500 text-white font-bold py-2 px-5 rounded-lg hover:bg-amber-600 transition-all">
                                Hazırlamaya Başla
                            </button>
                        )}
                        {selectedOrder.status === 'preparing' && (
                             <button 
                                onClick={() => handleOrderStatusChange(selectedOrder.id, 'ready')}
                                disabled={!allItemsPrepared}
                                className="bg-green-500 text-white font-bold py-2 px-5 rounded-lg hover:bg-green-600 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed">
                                Teslime Hazır
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>;
    }
    if (error) {
        return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>;
    }

    return (
        <div className="bg-white min-h-screen">
            <header className="bg-brand-dark shadow-md sticky top-0 z-40 text-white">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <h1 className="text-xl md:text-2xl font-bold">Mutfak Ekranı</h1>
                     <div className="space-x-2 md:space-x-4">
                        <a onClick={() => window.location.hash = 'employee'} className="text-xs md:text-sm bg-gray-600 text-white py-2 px-3 md:px-4 rounded-lg hover:bg-gray-700 transition cursor-pointer">
                            <i className="fas fa-users md:mr-2"></i><span className="hidden md:inline">Çalışan Arayüzü</span>
                        </a>
                        <a onClick={() => window.location.hash = ''} className="text-xs md:text-sm bg-brand-gold py-2 px-3 md:px-4 rounded-lg hover:bg-opacity-90 transition cursor-pointer">Ana Sayfa</a>
                    </div>
                </div>
            </header>
            
            <main className="container mx-auto p-4">
                {itemSummary.length > 0 && (
                    <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 rounded-lg mb-6 shadow-sm">
                        <h2 className="font-bold text-lg mb-2">Hazırlanacak Ürün Özeti</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
                            {itemSummary.map(([name, count]) => (
                                <div key={name}><span className="font-semibold bg-white px-2 py-1 rounded">{count}x</span> {name}</div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex flex-col lg:flex-row gap-4">
                    {KITCHEN_COLUMNS.map(column => (
                        <div key={column.id} className="w-full lg:flex-1 lg:min-w-[320px] bg-gray-100 rounded-lg">
                            <div className="p-4 sticky top-[68px] lg:top-16 bg-gray-200 rounded-t-lg z-10">
                               <h2 className="text-xl font-bold text-brand-dark">{column.title} ({orders.filter(o => o.status === column.id).length})</h2>
                            </div>
                            <div className="p-4 pt-2 space-y-4 h-full">
                               {orders.filter(o => o.status === column.id).map(renderOrderCard)}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
            {renderModal()}
            <audio ref={notificationSoundRef} src="https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3" preload="auto"></audio>
        </div>
    );
};

export default KitchenView;