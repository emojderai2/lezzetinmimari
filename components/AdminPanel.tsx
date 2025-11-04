import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { SiteConfig, MenuCategoryWithItems, MenuItem, Table, DashboardStats, RolePins } from '../types';
import {
    getSupabaseClient,
    fetchSiteConfig,
    updateSiteConfig,
    fetchMenuData,
    addCategory,
    updateCategory,
    deleteCategory,
    addItem,
    updateItem,
    deleteItem,
    batchUpdateCategoryPositions,
    batchUpdateItemPositions,
    fetchTables,
    addTable,
    deleteTable,
    fetchDashboardStats,
    fetchRolePins,
    updateRolePins
} from '../services/supabaseService';

// Declare type for CDN-loaded SortableJS library
declare const Sortable: any;

// Helper function for Toast notifications
const showToast = (message: string, type = 'success') => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
};


// ===================================================================================
// Dashboard Component
// ===================================================================================
const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadStats = async () => {
            setIsLoading(true);
            try {
                const data = await fetchDashboardStats();
                setStats(data);
                setError(null);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        loadStats();
    }, []);

    if (isLoading) return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>;
    if (error) return <div className="text-center p-8 text-red-600 bg-red-100 rounded-lg">{error}</div>;
    if (!stats) return <div className="text-center p-8 text-gray-500">Veri bulunamadı.</div>;

    return (
        <div className="space-y-8 fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="kpi-card p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                        <div className="bg-brand-gold text-white rounded-full h-12 w-12 flex items-center justify-center">
                            <i className="fas fa-lira-sign text-2xl"></i>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-600 font-medium">Bugünkü Toplam Ciro</p>
                            <p className="text-3xl font-bold text-brand-dark">{stats.total_revenue.toFixed(2)} TL</p>
                        </div>
                    </div>
                </div>
                <div className="kpi-card p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                        <div className="bg-brand-gold text-white rounded-full h-12 w-12 flex items-center justify-center">
                            <i className="fas fa-receipt text-2xl"></i>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-600 font-medium">Bugünkü Hesap Sayısı</p>
                            <p className="text-3xl font-bold text-brand-dark">{stats.total_visits}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-brand-dark mb-4 flex items-center">
                    <i className="fas fa-star text-yellow-500 mr-3"></i>Günün Popüler Ürünleri
                </h3>
                {stats.popular_items.length > 0 ? (
                    <ul className="space-y-3">
                        {stats.popular_items.map((item, index) => (
                            <li key={item.name} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                                <span className="font-semibold text-gray-800">{index + 1}. {item.name}</span>
                                <span className="font-bold text-brand-gold bg-white px-3 py-1 rounded-full text-sm">{item.total_quantity} adet</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">Bugün henüz hiç ürün satılmadı.</p>
                )}
            </div>
        </div>
    );
};


// ===================================================================================
// Site Settings Component
// ===================================================================================
const SiteSettings: React.FC = () => {
    const [config, setConfig] = useState<Partial<SiteConfig>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            setIsLoading(true);
            try {
                const data = await fetchSiteConfig();
                if (data) setConfig(data);
            } catch (error: any) {
                showToast(error.message, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        loadConfig();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        const isChecked = (e.target as HTMLInputElement).checked;
        setConfig(prev => ({ ...prev, [id]: type === 'checkbox' ? isChecked : value }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        // Convert local datetime-local string to ISO string for Supabase
        const isoString = value ? new Date(value).toISOString() : null;
        setConfig(prev => ({ ...prev, [id]: isoString }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateSiteConfig(config);
            showToast('Site ayarları kaydedildi!', 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    // Helper to format date for datetime-local input
    const formatDateTimeLocal = (isoString?: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
    };

    if (isLoading) return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>;

    const configFields = [
        { id: 'hero_title', label: 'Ana Başlık', type: 'text' },
        { id: 'hero_subtitle', label: 'Alt Başlık', type: 'text' },
        { id: 'hero_image_url', label: "Ana Görsel URL'i", type: 'text', preview: true },
        { id: 'brand_story_title', label: 'Hikaye Başlığı', type: 'text' },
        { id: 'brand_story_body', label: 'Hikaye İçeriği', type: 'textarea' },
        { id: 'value1_title', label: 'Değer 1 Başlık', type: 'text' },
        { id: 'value1_body', label: 'Değer 1 Açıklama', type: 'textarea' },
        { id: 'value2_title', label: 'Değer 2 Başlık', type: 'text' },
        { id: 'value2_body', label: 'Değer 2 Açıklama', type: 'textarea' },
        { id: 'value3_title', label: 'Değer 3 Başlık', type: 'text' },
        { id: 'value3_body', label: 'Değer 3 Açıklama', type: 'textarea' },
        { id: 'event_card1_title', label: 'Kart 1 Başlık', type: 'text' },
        { id: 'event_card1_body', label: 'Kart 1 Açıklama', type: 'textarea' },
        { id: 'event_card1_image_url', label: "Kart 1 Görsel URL'i", type: 'text', preview: true },
        { id: 'event_card2_title', label: 'Kart 2 Başlık', type: 'text' },
        { id: 'event_card2_body', label: 'Kart 2 Açıklama', type: 'textarea' },
        { id: 'event_card2_image_url', label: "Kart 2 Görsel URL'i", type: 'text', preview: true },
        { id: 'event_card3_title', label: 'Kart 3 Başlık', type: 'text' },
        { id: 'event_card3_body', label: 'Kart 3 Açıklama', type: 'textarea' },
        { id: 'event_card3_image_url', label: "Kart 3 Görsel URL'i", type: 'text', preview: true },
    ];

    return (
        <div className="fade-in bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-brand-dark mb-5 border-b pb-3 flex items-center"><i className="fas fa-cog mr-3"></i>Genel Site Ayarları</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dynamic fields */}
                {configFields.map(({ id, label, type, preview }) => (
                    <div key={id}>
                        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
                        {type === 'textarea' ? (
                            <textarea id={id} rows={3} value={(config as any)[id] || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" />
                        ) : (
                            <input type={type} id={id} value={(config as any)[id] || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" />
                        )}
                        {preview && (config as any)[id] && (
                             <img src={(config as any)[id]} className="mt-2 h-32 rounded-lg shadow-sm object-cover" alt={`${label} Önizleme`} />
                        )}
                    </div>
                ))}
                
                {/* Countdown */}
                <div className="border-t pt-6">
                     <h3 className="text-lg font-semibold text-gray-700">Geri Sayım Sayacı</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center mt-2">
                        <div>
                            <label htmlFor="countdown_target" className="block text-sm font-medium text-gray-700">Hedef Tarih ve Saat</label>
                            <input type="datetime-local" id="countdown_target" value={formatDateTimeLocal(config.countdown_target)} onChange={handleDateChange} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                        <div>
                            <label htmlFor="countdown_enabled" className="flex items-center cursor-pointer">
                                <div className="relative">
                                     <input type="checkbox" id="countdown_enabled" checked={config.countdown_enabled || false} onChange={handleChange} className="sr-only toggle-checkbox" />
                                     <div className="block bg-gray-600 w-10 h-6 rounded-full"></div>
                                     <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                                </div>
                                <div className="ml-3 text-gray-700 font-medium">Sayacı Ana Sayfada Göster</div>
                            </label>
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={isSaving} className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition duration-300 disabled:bg-gray-400">
                    <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i> {isSaving ? 'Kaydediliyor...' : 'Genel Ayarları Kaydet'}
                </button>
            </form>
        </div>
    );
};


// ===================================================================================
// Menu Management Component
// ===================================================================================
const MenuManagement: React.FC = () => {
    const [menuData, setMenuData] = useState<MenuCategoryWithItems[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<Partial<MenuItem> | null>(null);

    const categoryListRef = useRef<HTMLDivElement>(null);
    const addCategoryFormRef = useRef<HTMLFormElement>(null);
    const sortableInstances = useRef<any[]>([]);

    // Create a dependency that only changes when the structure of the menu changes (IDs and order),
    // not when the data within an item (like name or price) changes.
    // This prevents SortableJS from being re-initialized unnecessarily, which was causing the crash.
    const sortableStructureDependency = React.useMemo(() => {
        if (isLoading) return null;
        console.log('[useMemo] Recalculating sortableStructureDependency.');
        return menuData
            .map(cat => `${cat.id}:${cat.menu_items.map(item => item.id).join(',')}`)
            .join('|');
    }, [menuData, isLoading]);

    useEffect(() => {
        if (isModalOpen) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        
        return () => {
            document.body.classList.remove('modal-open');
        };
    }, [isModalOpen]);

    // Log when menuData is updated
    useEffect(() => {
        if (!isLoading) {
            console.log('[MenuManagement] State Updated: menuData changed.', menuData);
        }
    }, [menuData, isLoading]);

    const loadMenu = useCallback(async () => {
        console.log('[MenuManagement] loadMenu: Fetching menu data from server.');
        setIsLoading(true);
        try {
            const data = await fetchMenuData();
            setMenuData(data);
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMenu();
    }, [loadMenu]);

    useEffect(() => {
        console.log('[Sortable Effect] Running due to dependency change.', { sortableStructureDependency });
        
        // Delay initialization to ensure React has finished DOM manipulation.
        const timerId = setTimeout(() => {
            try {
                // Now we check the new dependency. If it's null, it means we are loading or have no data.
                if (!sortableStructureDependency || !categoryListRef.current) {
                    console.log('[Sortable Effect] Skipping initialization (dependency is null or ref is not set).');
                    return;
                }

                console.log('[Sortable Effect] Initializing SortableJS...');
                const newInstances: any[] = [];
                
                // Initialize Sortable for categories
                const catSortable = new Sortable(categoryListRef.current, {
                    animation: 150,
                    ghostClass: 'ghost',
                    handle: '.category-handle',
                    onEnd: async (evt: any) => {
                        const updated = Array.from(evt.target.children).map((node: any, index: number) => ({
                            id: parseInt(node.dataset.categoryId, 10),
                            position: index + 1,
                        }));
                        try {
                            await batchUpdateCategoryPositions(updated);
                            showToast('Kategori sırası güncellendi.', 'success');
                        } catch (error: any) {
                            showToast(error.message, 'error');
                            loadMenu(); // Revert UI on failure
                        }
                    },
                });
                newInstances.push(catSortable);

                // Initialize Sortable for items within each category
                categoryListRef.current.querySelectorAll('.item-list').forEach((list: Element) => {
                    const itemSortable = new Sortable(list as HTMLElement, {
                        group: 'items',
                        animation: 150,
                        ghostClass: 'ghost',
                        handle: '.item-handle',
                        onEnd: async (evt: any) => {
                            const { from, to } = evt;
                            const fromCategoryId = parseInt(from.dataset.categoryId, 10);
                            const toCategoryId = parseInt(to.dataset.categoryId, 10);

                            const createUpdatePayload = (listEl: HTMLElement, catId: number) =>
                                Array.from(listEl.children).map((node: any, index: number) => ({
                                    id: parseInt(node.dataset.itemId, 10),
                                    position: index + 1,
                                    category_id: catId,
                                }));

                            let batchPayload = createUpdatePayload(to, toCategoryId);
                            if (from !== to) {
                                const fromItems = createUpdatePayload(from, fromCategoryId);
                                batchPayload = [...batchPayload, ...fromItems];
                            }

                            try {
                                await batchUpdateItemPositions(batchPayload);
                                showToast('Ürün sırası güncellendi.', 'success');
                            } catch (error: any) {
                                showToast(error.message, 'error');
                                loadMenu(); // Revert UI on failure
                            }
                        },
                    });
                    newInstances.push(itemSortable);
                });
                
                sortableInstances.current = newInstances;
                console.log(`[Sortable Effect] Successfully initialized ${sortableInstances.current.length} Sortable instances.`);

            } catch (e) {
                console.error('[Sortable Effect] CRITICAL ERROR during Sortable initialization:', e);
                showToast('Sıralama özelliği başlatılamadı.', 'error');
            }
        }, 150); 

        return () => {
            console.log('[Sortable Effect] Cleanup: Clearing timer and destroying instances.');
            clearTimeout(timerId);
            sortableInstances.current.forEach(instance => instance.destroy());
            sortableInstances.current = [];
        };
    }, [sortableStructureDependency, loadMenu]);

    const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = addCategoryFormRef.current;
        if (!form) return;
        const nameInput = form.elements.namedItem('categoryName') as HTMLInputElement;
        const name = nameInput.value.trim();
        if (!name) return;
        try {
            const newCategory = await addCategory(name);
            showToast('Kategori eklendi.', 'success');
            form.reset();
            setMenuData(prevData => [...prevData, { ...newCategory, menu_items: [] }]);
        } catch (error: any) { showToast(error.message, 'error'); }
    };
    
    const handleDeleteCategory = async (id: number, name: string) => {
        if (!window.confirm(`'${name}' kategorisini silerseniz içindeki tüm ürünler de silinir. Emin misiniz?`)) return;
        try {
            await deleteCategory(id);
            showToast('Kategori silindi.', 'success');
            setMenuData(prevData => prevData.filter(cat => cat.id !== id));
        } catch (error: any) { showToast(error.message, 'error'); }
    };

    const handleUpdateCategoryName = async (id: number, currentName: string) => {
        const newName = window.prompt('Yeni kategori adı:', currentName);
        if (newName && newName.trim() !== currentName) {
            try {
                await updateCategory(id, { name: newName.trim() });
                showToast('Kategori adı güncellendi.', 'success');
                setMenuData(prevData => prevData.map(cat => 
                    cat.id === id ? { ...cat, name: newName.trim() } : cat
                ));
            } catch (error: any) { showToast(error.message, 'error'); }
        }
    };
    
    const handleDeleteItem = async (id: number, name: string) => {
         if (!window.confirm(`'${name}' ürününü silmek istediğinizden emin misiniz?`)) return;
         try {
             await deleteItem(id);
             showToast('Ürün silindi.', 'success');
             setMenuData(prevData => prevData.map(cat => ({
                 ...cat,
                 menu_items: cat.menu_items.filter(item => item.id !== id)
             })));
         } catch (error: any) { showToast(error.message, 'error'); }
    };
    
    const openModalForNewItem = (categoryId: number) => {
        setCurrentItem({ category_id: categoryId, name: '', description: '', price: 0, image_url: '' });
        setIsModalOpen(true);
    };

    const openModalForEdit = (item: MenuItem) => {
        setCurrentItem(item);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setCurrentItem(null);
        setIsModalOpen(false);
    };

    const handleModalSave = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[handleModalSave] Save initiated for item:', currentItem);
        if (!currentItem) return;
        try {
            if (currentItem.id) { // Edit logic
                const { id, ...updates } = currentItem;
                console.log(`[handleModalSave] Calling updateItem API for item ID: ${id}`);
                await updateItem(id, updates);
                console.log('[handleModalSave] API call successful.');
                showToast('Ürün güncellendi.', 'success');
                
                console.log('[handleModalSave] Preparing to update local state.');
                setMenuData(prevData => {
                    console.log('[handleModalSave] setMenuData updater function running.');
                    // This immutable update is now safe because the useEffect dependency has been changed
                    // to ignore data-only changes, preventing the SortableJS re-initialization.
                    return prevData.map(category => {
                        if (category.id !== currentItem.category_id) {
                            return category;
                        }
                        return {
                            ...category,
                            menu_items: category.menu_items.map(item =>
                                item.id === currentItem.id ? (currentItem as MenuItem) : item
                            )
                        };
                    });
                });

            } else { // Add logic
                const newItem = await addItem(currentItem);
                showToast('Ürün eklendi.', 'success');

                setMenuData(prevData => prevData.map(cat => {
                    if (cat.id === newItem.category_id) {
                        return { ...cat, menu_items: [...cat.menu_items, newItem] };
                    }
                    return cat;
                }));
            }
            closeModal();
        } catch (error: any) { 
            console.error('[handleModalSave] Error caught during save:', error);
            showToast(error.message, 'error'); 
        }
    };

    const handleModalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setCurrentItem(prev => prev ? ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }) : null);
    };

    if (isLoading) return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>;
    
    return (
        <div className="fade-in">
             <h2 className="text-2xl font-bold text-brand-dark mb-5 border-b pb-3 flex items-center"><i className="fas fa-utensils mr-3"></i>Menü Yönetimi</h2>
             
             <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <h3 className="font-bold text-lg mb-2">Yeni Kategori Ekle</h3>
                <form ref={addCategoryFormRef} onSubmit={handleAddCategory} className="flex items-center space-x-2">
                    <input name="categoryName" type="text" placeholder="Kategori Adı (örn: Ana Yemekler)" required className="w-full p-2 border rounded-lg" />
                    <button type="submit" className="bg-brand-gold text-white py-2 px-4 rounded-lg font-semibold whitespace-nowrap"><i className="fas fa-plus"></i> Kategori Ekle</button>
                </form>
             </div>

             <div ref={categoryListRef} id="category-list" className="space-y-6">
                {menuData.map(category => (
                    <div key={category.id} data-category-id={category.id} className="bg-gray-50 p-4 rounded-lg shadow-sm border">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b">
                            <div className="flex items-center">
                                <i className="fas fa-grip-vertical category-handle cursor-move text-gray-400 mr-3"></i>
                                <h3 className="text-xl font-bold text-brand-dark">{category.name}</h3>
                            </div>
                            <div className="space-x-2">
                                <button onClick={() => handleUpdateCategoryName(category.id, category.name)} className="text-blue-500 hover:text-blue-700 p-1"><i className="fas fa-pen"></i></button>
                                <button onClick={() => handleDeleteCategory(category.id, category.name)} className="text-red-500 hover:text-red-700 p-1"><i className="fas fa-trash"></i></button>
                            </div>
                        </div>

                        <div data-category-id={category.id} className="item-list min-h-[50px] space-y-2">
                           {(category.menu_items || []).map(item => (
                               <div key={item.id} data-item-id={item.id} className="bg-white p-2 rounded-md shadow-sm flex items-center justify-between border">
                                    <div className="flex items-center flex-grow">
                                        <i className="fas fa-grip-vertical item-handle cursor-move text-gray-400 mr-2"></i>
                                        <img src={item.image_url || 'https://placehold.co/60x60/eee/ccc?text=Görsel'} alt={item.name} className="w-12 h-12 rounded-md object-cover mr-3" />
                                        <div className="flex-grow">
                                            <p className="font-semibold text-gray-800">{item.name}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">{item.description || 'Açıklama yok'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3 ml-2">
                                        <span className="font-bold text-brand-dark w-20 text-right text-sm">{item.price ? `${item.price.toFixed(2)} TL` : 'Fiyatsız'}</span>
                                        <button onClick={() => openModalForEdit(item)} className="text-blue-500 hover:text-blue-700 p-1"><i className="fas fa-pen"></i></button>
                                        <button onClick={() => handleDeleteItem(item.id, item.name)} className="text-red-500 hover:text-red-700 p-1"><i className="fas fa-trash"></i></button>
                                    </div>
                               </div>
                           ))}
                        </div>
                        <div className="mt-4">
                            <button onClick={() => openModalForNewItem(category.id)} className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition text-sm">
                                <i className="fas fa-plus mr-2"></i> Bu Kategoriye Ürün Ekle
                            </button>
                        </div>
                    </div>
                ))}
             </div>
             {isModalOpen && currentItem && (
                <div className="modal-overlay">
                    <form onSubmit={handleModalSave} className="modal-content">
                        <h2 className="text-2xl font-bold mb-4">{currentItem.id ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Ad</label>
                                <input name="name" value={currentItem.name} onChange={handleModalChange} required className="w-full p-2 border rounded"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Açıklama</label>
                                <textarea name="description" value={currentItem.description || ''} onChange={handleModalChange} className="w-full p-2 border rounded"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Fiyat (TL)</label>
                                <input name="price" type="number" step="0.01" value={currentItem.price || ''} onChange={handleModalChange} className="w-full p-2 border rounded"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Görsel URL</label>
                                <input name="image_url" value={currentItem.image_url || ''} onChange={handleModalChange} className="w-full p-2 border rounded"/>
                                {currentItem.image_url && <img src={currentItem.image_url} alt="preview" className="mt-2 h-24 rounded object-cover"/>}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button type="button" onClick={closeModal} className="bg-gray-200 py-2 px-4 rounded">İptal</button>
                            <button type="submit" className="bg-green-600 text-white py-2 px-4 rounded">Kaydet</button>
                        </div>
                    </form>
                </div>
             )}
        </div>
    );
};


// ===================================================================================
// Table Management Component
// ===================================================================================
const TableManagement: React.FC = () => {
    const [tables, setTables] = useState<Table[]>([]);
    const [newTableNumber, setNewTableNumber] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const loadTables = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchTables();
            setTables(data);
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTables();
    }, [loadTables]);

    const handleAddTable = async (e: React.FormEvent) => {
        e.preventDefault();
        const tableNum = parseInt(newTableNumber, 10);
        if (isNaN(tableNum) || tableNum <= 0) {
            showToast('Lütfen geçerli bir masa numarası girin.', 'error');
            return;
        }
        try {
            await addTable(tableNum);
            showToast(`Masa ${tableNum} eklendi.`, 'success');
            setNewTableNumber('');
            loadTables(); // Refresh list
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleDeleteTable = async (tableId: number, tableNumber: number) => {
        if (window.confirm(`Masa ${tableNumber}'ı silmek istediğinizden emin misiniz?`)) {
            try {
                await deleteTable(tableId);
                showToast(`Masa ${tableNumber} silindi.`, 'success');
                loadTables(); // Refresh list
            } catch (error: any) {
                showToast(error.message, 'error');
            }
        }
    };

    return (
        <div className="fade-in bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-brand-dark mb-5 border-b pb-3 flex items-center"><i className="fas fa-chair mr-3"></i>Masa Yönetimi</h2>
            <form onSubmit={handleAddTable} className="flex items-center space-x-2 mb-6">
                <input
                    type="number"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder="Yeni Masa Numarası"
                    required
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                />
                <button type="submit" className="bg-brand-gold text-white py-2 px-4 rounded-lg font-semibold hover:bg-opacity-90 transition duration-300 whitespace-nowrap">
                    <i className="fas fa-plus"></i> Masa Ekle
                </button>
            </form>
            {isLoading ? (
                 <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {tables.length === 0 ? (
                        <p className="col-span-full text-center text-gray-500">Henüz masa eklenmemiş.</p>
                    ) : (
                        tables.map(table => (
                            <div key={table.id} data-table-id={table.id} className="relative bg-gray-50 p-2 rounded-lg border border-gray-200 text-center">
                                <span className="font-bold text-2xl text-brand-dark">{table.table_number}</span>
                                <button
                                    onClick={() => handleDeleteTable(table.id, table.table_number)}
                                    className="absolute top-1 right-1 text-red-500 hover:text-red-800 js-table-delete p-1"
                                    title="Masayı Sil"
                                >
                                    <i className="fas fa-times-circle fa-sm"></i>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// ===================================================================================
// PIN Management Component
// ===================================================================================
const PinManagement: React.FC = () => {
    const [pins, setPins] = useState<{ [key: string]: string }>({ waiter: '', kitchen: '', cashier: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const roles = [
        { key: 'waiter', name: 'Garson' },
        { key: 'kitchen', name: 'Mutfak' },
        { key: 'cashier', name: 'Kasa' },
    ];

    useEffect(() => {
        const loadPins = async () => {
            setIsLoading(true);
            try {
                const data = await fetchRolePins();
                const pinsMap = data.reduce((acc, item) => {
                    acc[item.role] = item.pin;
                    return acc;
                }, {} as { [key: string]: string });
                setPins(prev => ({ ...prev, ...pinsMap }));
            } catch (error: any) {
                showToast(error.message, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        loadPins();
    }, []);

    const handleChange = (role: string, value: string) => {
        // Only allow 4 digits
        if (/^\d{0,4}$/.test(value)) {
            setPins(prev => ({ ...prev, [role]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const pinPayload = Object.entries(pins).map(([role, pin]) => ({ role, pin: String(pin) }));
            await updateRolePins(pinPayload);
            showToast('PIN kodları başarıyla güncellendi.', 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>;
    }

    return (
        <div className="fade-in bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-brand-dark mb-5 border-b pb-3 flex items-center"><i className="fas fa-key mr-3"></i>PIN Yönetimi</h2>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
                {roles.map(role => (
                    <div key={role.key}>
                        <label htmlFor={`${role.key}_pin`} className="block text-lg font-medium text-gray-700">{role.name} PIN</label>
                        <input
                            type="text"
                            id={`${role.key}_pin`}
                            value={pins[role.key] || ''}
                            onChange={(e) => handleChange(role.key, e.target.value)}
                            maxLength={4}
                            placeholder="4 Haneli PIN"
                            className="mt-1 w-full p-3 border rounded-lg text-center text-2xl tracking-[.5em]"
                        />
                    </div>
                ))}

                <button type="submit" disabled={isSaving} className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition duration-300 disabled:bg-gray-400">
                    <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i> {isSaving ? 'Kaydediliyor...' : 'PIN Kodlarını Kaydet'}
                </button>
            </form>
        </div>
    );
};


// ===================================================================================
// Main Admin Panel Component
// ===================================================================================
const AdminPanel: React.FC = () => {
    const [session, setSession] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [authError, setAuthError] = useState('');
    const formRef = useRef<HTMLFormElement>(null);

    const supabase = getSupabaseClient();

    // Global error handler to get more details on "Script error."
    useEffect(() => {
        console.log('[AdminPanel] Attaching global error handler.');
        const originalOnError = window.onerror;
        window.onerror = function(message, source, lineno, colno, error) {
            console.log('%cGLOBAL ERROR CAUGHT:', 'color: red; font-weight: bold;', {
                message,
                source,
                lineno,
                colno,
                error
            });
            if (originalOnError) {
                // @ts-ignore
                return originalOnError.apply(this, arguments);
            }
            return false;
        };

        return () => {
            console.log('[AdminPanel] Restoring original error handler.');
            window.onerror = originalOnError;
        };
    }, []);

    useEffect(() => {
        document.body.classList.remove('bg-[#f8f6f2]');
        document.body.classList.add('bg-gray-100');
        
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setIsLoading(false);
        };
        
        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            subscription?.unsubscribe();
            document.body.classList.add('bg-[#f8f6f2]');
            document.body.classList.remove('bg-gray-100');
        };
    }, [supabase.auth]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        const email = formRef.current?.email.value;
        const password = formRef.current?.password.value;

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setAuthError(error.message);
        } else {
            showToast('Giriş başarılı!', 'success');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        showToast('Başarıyla çıkış yapıldı.');
    };

    const handleGoHome = () => {
        window.location.hash = '/';
    };

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'dashboard': return <Dashboard />;
            case 'site': return <SiteSettings />;
            case 'menu': return <MenuManagement />;
            case 'tables': return <TableManagement />;
            case 'pins': return <PinManagement />;
            default: return null;
        }
    };
    
    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-brand-dark"></div>;
    }

    if (!session) {
        return (
            <>
              <div id="toast" className="toast">Bildirim Mesajı</div>
              <div id="auth-screen" className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
                  <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                      <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Lezzetin Mimarı Logo" className="w-48 mx-auto mb-6" />
                      <h1 className="text-2xl font-bold text-gray-800 mb-4">Yönetim Paneli Girişi</h1>
                      <form ref={formRef} onSubmit={handleLogin}>
                          <div className="mb-4 text-left">
                              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                              <input type="email" id="email" name="email" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold" placeholder="admin@example.com" />
                          </div>
                          <div className="mb-6 text-left">
                              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                              <input type="password" id="password" name="password" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold" placeholder="••••••••" />
                          </div>
                          <button type="submit" className="w-full bg-brand-gold text-white py-2 px-4 rounded-lg font-semibold hover:bg-opacity-90 transition duration-300">
                              Giriş Yap
                          </button>
                      </form>
                      {authError && <p className="text-red-600 mt-4 text-sm">{authError}</p>}
                      <div className="mt-6 border-t pt-4">
                        <button onClick={handleGoHome} className="inline-block text-sm font-medium text-gray-500 hover:text-brand-gold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold rounded">
                            <i className="fas fa-arrow-left mr-1"></i>
                            Ana Sayfaya Dön
                        </button>
                      </div>
                  </div>
              </div>
            </>
        );
    }

    return (
        <>
            <style>{`.toggle-checkbox:checked~.dot{transform:translateX(100%);background-color:#b98d4a}.toggle-checkbox:checked~.block{background-color:#1e202a}`}</style>
            <div id="toast" className="toast">Bildirim Mesajı</div>
            <div id="admin-panel">
                <header className="bg-brand-dark shadow-md sticky top-0 z-50">
                    <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                        <button onClick={handleGoHome} className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-dark focus:ring-brand-gold rounded">
                            <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Lezzetin Mimarı Logo" className="h-10 bg-white p-1 rounded" />
                        </button>
                        <div className="flex items-center space-x-4">
                            <button onClick={() => window.location.hash = 'employee'} className="text-sm bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition duration-300">
                                <i className="fas fa-users mr-2"></i> Çalışan Arayüzü
                            </button>
                            <button onClick={handleLogout} className="text-sm bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition duration-300">
                                <i className="fas fa-sign-out-alt mr-1"></i> Çıkış Yap
                            </button>
                        </div>
                    </div>
                </header>
                <main className="container mx-auto p-4 md:p-8">
                     <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
                        <nav className="border-b border-gray-200 mb-6">
                            <div className="flex space-x-8 overflow-x-auto">
                                <button onClick={() => setActiveTab('dashboard')} className={`admin-tab py-4 px-1 border-b-4 whitespace-nowrap ${activeTab === 'dashboard' ? 'active' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                    <i className="fas fa-chart-line mr-2"></i>Pano
                                </button>
                                <button onClick={() => setActiveTab('menu')} className={`admin-tab py-4 px-1 border-b-4 whitespace-nowrap ${activeTab === 'menu' ? 'active' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                    <i className="fas fa-utensils mr-2"></i>Menü Yönetimi
                                </button>
                                <button onClick={() => setActiveTab('tables')} className={`admin-tab py-4 px-1 border-b-4 whitespace-nowrap ${activeTab === 'tables' ? 'active' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                    <i className="fas fa-chair mr-2"></i>Masa Yönetimi
                                </button>
                                <button onClick={() => setActiveTab('pins')} className={`admin-tab py-4 px-1 border-b-4 whitespace-nowrap ${activeTab === 'pins' ? 'active' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                    <i className="fas fa-key mr-2"></i>PIN Yönetimi
                                </button>
                                <button onClick={() => setActiveTab('site')} className={`admin-tab py-4 px-1 border-b-4 whitespace-nowrap ${activeTab === 'site' ? 'active' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                                    <i className="fas fa-cog mr-2"></i>Site Ayarları
                                </button>
                            </div>
                        </nav>
                        {renderActiveTab()}
                    </div>
                </main>
            </div>
        </>
    );
};

export default AdminPanel;