import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { OrderWithDetails, OrderItem, RolePins, MenuCategoryWithItems } from '../types';
import {
  fetchKitchenOrders,
  updateOrderStatus,
  updateOrderItemStatus,
  revertOrderItemsStatus,
  fetchRolePins,
  fetchVisibleMenuData,
} from '../services/supabaseService';

type OrderStatus = 'new' | 'preparing' | 'ready';

// Helper function for Toast notifications, uses the global toast element from index.html
const showToast = (message: string, type = 'success') => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
};

const KITCHEN_COLUMNS: { id: OrderStatus, title: string }[] = [
    { id: 'new', title: 'Yeni Siparişler' },
    { id: 'preparing', title: 'Hazırlanıyor' },
    { id: 'ready', title: 'Teslime Hazır' }
];

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

const KitchenView: React.FC = () => {
    const [orders, setOrders] = useState<OrderWithDetails[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
    const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
    const [isNotifying, setIsNotifying] = useState(false);
    
    const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('kitchen_pin_verified') === 'true');
    const [correctPin, setCorrectPin] = useState<string | null>(null);


    // Filter Mode State
    const [filteredItemIds, setFilteredItemIds] = useState<Set<number>>(new Set());
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [menuForFiltering, setMenuForFiltering] = useState<MenuCategoryWithItems[]>([]);
    const filterPanelRef = useRef<HTMLDivElement>(null);
    const filterButtonRef = useRef<HTMLButtonElement>(null);
    
    const isFilterModeActive = filteredItemIds.size > 0;

    // Initialize Audio object once user is authenticated
    useEffect(() => {
        if (isAuthenticated && !notificationSoundRef.current) {
            const audio = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3");
            audio.preload = 'auto';
            notificationSoundRef.current = audio;
        }
    }, [isAuthenticated]);

    // Fetch menu for filter panel once
    useEffect(() => {
        const loadMenuForFilter = async () => {
            try {
                const menu = await fetchVisibleMenuData();
                setMenuForFiltering(menu);
            } catch (err) {
                console.error("Could not load menu for filtering:", err);
            }
        };
        if (isAuthenticated) {
            loadMenuForFilter();
        }
    }, [isAuthenticated]);


    useEffect(() => {
        const getPins = async () => {
            try {
                const pins = await fetchRolePins();
                const kitchenPin = pins.find(p => p.role === 'kitchen')?.pin;
                 if (!kitchenPin) {
                    setError('Mutfak PIN kodu ayarlanmamış. Lütfen yöneticiyle görüşün.');
                } else {
                    setCorrectPin(kitchenPin);
                }
            } catch (err: any) {
                setError(err.message);
            }
        };
        if(!isAuthenticated) {
            getPins();
        }
    }, [isAuthenticated]);

    const fetchAndSetOrders = useCallback(async (isInitialLoad = false) => {
        if (!isInitialLoad) console.log("[Kitchen Polling] Re-fetching orders...");
        try {
            const fetchedOrders = await fetchKitchenOrders();
             setOrders(currentOrders => {
                const isUpdate = currentOrders.length > 0;
                if (isUpdate && fetchedOrders.length > currentOrders.length) {
                    const newOrderExists = fetchedOrders.some(fo => fo.status === 'new' && !currentOrders.some(o => o.id === fo.id));
                    if (newOrderExists && notificationSoundRef.current) {
                        notificationSoundRef.current.currentTime = 0; // Play from the start
                        notificationSoundRef.current.play().catch(e => console.error("Audio play failed:", e));
                        setIsNotifying(true);
                        setTimeout(() => setIsNotifying(false), 800);
                    }
                }
                return fetchedOrders;
            });
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Siparişler yüklenirken bir hata oluştu.');
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;

        setIsLoading(true);
        fetchAndSetOrders(true).finally(() => setIsLoading(false));

        const interval = setInterval(() => fetchAndSetOrders(), 10000);

        return () => clearInterval(interval);
    }, [isAuthenticated, fetchAndSetOrders]);
    
    
    // Click outside handler for filter panel
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isFilterPanelOpen &&
                filterPanelRef.current && 
                !filterPanelRef.current.contains(event.target as Node) &&
                filterButtonRef.current &&
                !filterButtonRef.current.contains(event.target as Node)
            ) {
                setIsFilterPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFilterPanelOpen]);

    const filteredOrders = useMemo(() => {
        if (!isFilterModeActive) {
            return orders;
        }
        return orders.filter(order => 
            order.order_items.some(item => filteredItemIds.has(item.menu_item_id))
        );
    }, [orders, isFilterModeActive, filteredItemIds]);
    
    const itemSummary = useMemo(() => {
        const summary = new Map<string, number>();
        // Determine which orders to process based on filter mode
        const ordersToProcess = isFilterModeActive ? filteredOrders : orders;

        ordersToProcess.forEach(order => {
            // Only consider orders that are not yet ready
            if (order.status === 'new' || order.status === 'preparing') {
                order.order_items.forEach(item => {
                    // Only count items that are not yet prepared ('pending')
                    if (item.status === 'pending') {
                        // In filter mode, only count items that are part of the filter
                        if (isFilterModeActive && !filteredItemIds.has(item.menu_item_id)) {
                            return; // Skip if not in filter
                        }

                        if ((item as any).menu_items) {
                            const itemName = (item as any).menu_items.name;
                            const currentCount = summary.get(itemName) || 0;
                            summary.set(itemName, currentCount + item.quantity);
                        }
                    }
                });
            }
        });
        return Array.from(summary.entries());
    }, [orders, filteredOrders, isFilterModeActive, filteredItemIds]);
    
    const handleFilterItemToggle = (itemId: number) => {
        setFilteredItemIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            // Automatically close panel if a selection is made or cleared
            if (newSet.size > 0 || prev.size > 0) {
                 // No need to close, let user select multiple
            }
            return newSet;
        });
    };

    const handleItemStatusChange = async (orderId: string, itemId: number, isPrepared: boolean) => {
        // FIX: Explicitly type `newStatus` to prevent TypeScript from widening it to `string`,
        // which caused a type mismatch with `OrderItem['status']`.
        const newStatus: 'pending' | 'prepared' = isPrepared ? 'prepared' : 'pending';
        try {
            await updateOrderItemStatus(itemId, newStatus);

            setOrders(prevOrders => {
                const newOrders = prevOrders.map(o => {
                    if (o.id === orderId) {
                        const newItems = o.order_items.map(i => i.id === itemId ? { ...i, status: newStatus } : i);
                        const updatedOrder = { ...o, order_items: newItems };
                        // Update selected order in modal instantly
                        // FIX: Ensure selectedOrder is also updated with the new item status
                        setSelectedOrder(currentSelected => 
                            currentSelected && currentSelected.id === orderId ? updatedOrder : currentSelected
                        );
                        return updatedOrder;
                    }
                    return o;
                });
                return newOrders;
            });

        } catch (e) {
            console.error(e);
            showToast('Ürün durumu güncellenemedi.', 'error');
        }
    };
    
    const handleOrderStatusChange = async (orderId: string, newStatus: OrderStatus) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            // Optimistic update
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            if (newStatus === 'ready' || newStatus === 'new') {
                setSelectedOrder(null); 
            } else {
                 setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: newStatus } : prev);
            }
        } catch(e) {
            console.error(e);
            showToast('Sipariş durumu güncellenemedi.', 'error');
            fetchAndSetOrders(); // Revert on error
        }
    };
    
    const handleRevertOrder = async (orderId: string) => {
        if (!confirm("Bu siparişi 'Yeni Siparişler' bölümüne geri almak istediğinizden emin misiniz? Tüm ürün işaretleri kaldırılacak.")) return;
        try {
            // Optimistic update for faster UI response
             setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    return {
                        ...o,
                        status: 'new',
                        order_items: o.order_items.map(oi => ({...oi, status: 'pending'}))
                    };
                }
                return o;
            }));
            setSelectedOrder(null);
            showToast('Sipariş başa alındı.', 'success');
            
            // API calls
            await revertOrderItemsStatus(orderId);
            await updateOrderStatus(orderId, 'new');
        } catch (e) {
            console.error(e);
            showToast('Sipariş başa alınamadı.', 'error');
            fetchAndSetOrders(); // Revert on error
        }
    };

    const renderOrderCard = (order: OrderWithDetails) => {
       // In filter mode, highlight items that match the filter
        const renderItemName = (item: OrderItem) => {
            const isFiltered = isFilterModeActive && filteredItemIds.has(item.menu_item_id);
            if (isFiltered) {
                return <strong className="text-brand-gold">{(item as any).menu_items?.name ?? 'Ürün'}</strong>;
            }
            return <span>{(item as any).menu_items?.name ?? 'Ürün'}</span>;
        };
        
        return (
             <div 
                key={order.id}
                className={`kanban-card status-${order.status} notification-pop`}
                onClick={() => setSelectedOrder(order)}
            >
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-brand-dark">Masa {order.visits?.tables?.table_number ?? 'N/A'}</h3>
                    <span className="text-sm text-gray-500">{new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <ul className="space-y-0.5">
                    {order.order_items.map(item => (
                        <li key={item.id} className={`text-sm transition-colors ${item.status === 'prepared' ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            <span className="font-semibold">{item.quantity}x</span> {renderItemName(item)}
                        </li>
                    ))}
                </ul>
                 {order.notes && (
                    <div className="text-xs italic text-amber-800 bg-amber-100 p-2 mt-2 rounded-md">
                        <i className="fas fa-sticky-note mr-1"></i> {order.notes}
                    </div>
                )}
            </div>
        )
    };
    
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

                     {selectedOrder.notes && (
                        <div className="text-md italic text-amber-800 bg-amber-100 p-3 my-4 rounded-lg">
                            <i className="fas fa-sticky-note mr-2"></i>
                            <strong>Garson Notu:</strong> {selectedOrder.notes}
                        </div>
                    )}
                    
                    <div className="mt-6 space-y-3">
                        {selectedOrder.order_items.map(item => {
                            const isItemInFilter = filteredItemIds.has(item.menu_item_id);
                            const isDisabled = isFilterModeActive && !isItemInFilter;

                            return (
                                <div key={item.id} className={`p-3 rounded-lg flex items-center justify-between transition-colors ${item.status === 'prepared' ? 'bg-green-100' : 'bg-gray-100'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <div>
                                        <span className={`font-bold text-lg ${item.status === 'prepared' ? 'line-through text-gray-500' : 'text-brand-dark'}`}>
                                            {item.quantity}x {(item as any).menu_items?.name ?? 'Ürün'}
                                        </span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="item-checkbox h-6 w-6"
                                        checked={item.status === 'prepared'}
                                        onChange={(e) => handleItemStatusChange(selectedOrder.id, item.id, e.target.checked)}
                                        disabled={isDisabled}
                                    />
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-6 border-t pt-4 flex flex-wrap justify-between items-center gap-3">
                        <div>
                             {(selectedOrder.status === 'preparing' || selectedOrder.status === 'ready') && (
                                <button
                                    onClick={() => handleRevertOrder(selectedOrder.id)}
                                    className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-all text-sm">
                                    <i className="fas fa-undo mr-1"></i> Siparişi Başa Al
                                </button>
                            )}
                        </div>
                        <div className="flex justify-end space-x-3">
                            {(selectedOrder.status === 'new' || (selectedOrder.status === 'preparing' && isFilterModeActive)) && (
                                <button 
                                    onClick={() => handleOrderStatusChange(selectedOrder.id, 'preparing')}
                                    className="bg-amber-500 text-white font-bold py-2 px-5 rounded-lg hover:bg-amber-600 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed">
                                    Hazırlamaya Başla
                                </button>
                            )}
                            {selectedOrder.status === 'preparing' && (
                                 <button 
                                    onClick={() => handleOrderStatusChange(selectedOrder.id, 'ready')}
                                    disabled={!allItemsPrepared || isFilterModeActive}
                                    className="bg-green-500 text-white font-bold py-2 px-5 rounded-lg hover:bg-green-600 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed">
                                    Teslime Hazır
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const handlePinVerified = () => {
        sessionStorage.setItem('kitchen_pin_verified', 'true');
        setIsAuthenticated(true);
    };

    if (!isAuthenticated) {
        if (error) return <div className="flex items-center justify-center h-screen text-red-500 bg-gray-100 p-4">{error}</div>;
        if (!correctPin) return <div className="flex items-center justify-center h-screen"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>;
        return <PinEntry onPinVerified={handlePinVerified} correctPin={correctPin} roleName="Mutfak" />;
    }

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>;
    }
    if (error) {
        return <div className="flex items-center justify-center h-screen text-red-500">{error}</div>;
    }

    return (
        <div className={`bg-white min-h-screen ${isNotifying ? 'flash-notification' : ''}`}>
            <div id="toast" className="toast"></div>
            <header className="bg-brand-dark shadow-md sticky top-0 z-40 text-white">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-xl md:text-2xl font-bold">Mutfak Ekranı</h1>
                    </div>
                     <div className="flex items-center space-x-2 md:space-x-4">
                        <div className="relative">
                            <button 
                                ref={filterButtonRef}
                                onClick={() => setIsFilterPanelOpen(prev => !prev)}
                                className={`text-xs md:text-sm py-2 px-3 md:px-4 rounded-lg transition-colors ${isFilterModeActive ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white hover:bg-gray-700'}`}
                            >
                                <i className="fas fa-filter mr-1 md:mr-2"></i>
                                <span className="hidden md:inline">Filtrele</span>
                                {isFilterModeActive && <span className="ml-1">({filteredItemIds.size})</span>}
                            </button>
                            {isFilterPanelOpen && (
                                <div ref={filterPanelRef} className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-50 border text-black flex flex-col max-h-96">
                                    <div className="sticky top-0 bg-white border-b z-10 p-3">
                                        <button
                                            onClick={() => {
                                                setFilteredItemIds(new Set());
                                                setIsFilterPanelOpen(false);
                                            }}
                                            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded text-sm transition-colors"
                                        >
                                            <i className="fas fa-times mr-2"></i> Filtreyi Temizle
                                        </button>
                                    </div>
                                    <div className="overflow-y-auto p-4">
                                        {menuForFiltering.map(category => (
                                            <div key={category.id} className="mb-4">
                                                <h4 className="font-bold text-sm text-gray-600 border-b pb-1 mb-2">{category.name}</h4>
                                                <div className="space-y-2">
                                                {category.menu_items.map(item => (
                                                    <label key={item.id} className="flex items-center space-x-2 cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            className="h-4 w-4 rounded accent-brand-gold"
                                                            checked={filteredItemIds.has(item.id)}
                                                            onChange={() => handleFilterItemToggle(item.id)}
                                                        />
                                                        <span>{item.name}</span>
                                                    </label>
                                                ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <a onClick={() => window.location.hash = 'employee'} className="text-xs md:text-sm bg-gray-600 text-white py-2 px-3 md:px-4 rounded-lg hover:bg-gray-700 transition cursor-pointer">
                            <i className="fas fa-users md:mr-2"></i><span className="hidden md:inline">Çalışan Arayüzü</span>
                        </a>
                    </div>
                </div>
            </header>
            
            <main className="container mx-auto p-4">
                {itemSummary.length > 0 && (
                    <div className={`p-4 rounded-lg mb-6 shadow-sm ${isFilterModeActive ? 'bg-blue-100 border-l-4 border-blue-500 text-blue-800' : 'bg-amber-100 border-l-4 border-amber-500 text-amber-800'}`}>
                        <h2 className="font-bold text-lg mb-2">{isFilterModeActive ? 'Filtrelenmiş Ürün Özeti' : 'Hazırlanacak Ürün Özeti'}</h2>
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
                               <h2 className="text-xl font-bold text-brand-dark">{column.title} ({filteredOrders.filter(o => o.status === column.id).length})</h2>
                            </div>
                            <div className="p-4 pt-2 space-y-4 h-full">
                               {filteredOrders.filter(o => o.status === column.id).map(renderOrderCard)}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
            {renderModal()}
        </div>
    );
};

export default KitchenView;