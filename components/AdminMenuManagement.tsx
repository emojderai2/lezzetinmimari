import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { MenuCategoryWithItems, MenuItem } from '../types';
import {
    fetchMenuData,
    addCategory,
    updateCategory,
    deleteCategory,
    addItem,
    updateItem,
    deleteItem,
    batchUpdateCategoryPositions,
    batchUpdateItemPositions,
} from '../services/supabaseService';

// Declare type for CDN-loaded SortableJS library
declare const Sortable: any;

const formatCurrency = (price: number | null | undefined) => {
  if (price === null || price === undefined || isNaN(price)) return '0 ₺';
  const formattedPrice = Number(price.toFixed(2));
  return `${formattedPrice.toLocaleString('tr-TR')} ₺`;
};

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
// Menu Management Component
// ===================================================================================
const AdminMenuManagement: React.FC = () => {
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
    const sortableStructureDependency = useMemo(() => {
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
                <form ref={addCategoryFormRef} onSubmit={handleAddCategory} className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <input name="categoryName" type="text" placeholder="Kategori Adı (örn: Ana Yemekler)" required className="w-full p-2 border rounded-lg" />
                    <button type="submit" className="bg-brand-gold text-white py-2 px-4 rounded-lg font-semibold whitespace-nowrap"><i className="fas fa-plus"></i><span className="sm:hidden md:inline"> Kategori Ekle</span></button>
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
                               <div key={item.id} data-item-id={item.id} className="bg-white p-2 rounded-md shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between border">
                                    <div className="flex items-center w-full">
                                        <i className="fas fa-grip-vertical item-handle cursor-move text-gray-400 mr-2 flex-shrink-0 pt-3 sm:pt-0"></i>
                                        <img src={item.image_url || 'https://placehold.co/60x60/eee/ccc?text=Görsel'} alt={item.name} className="w-12 h-12 rounded-md object-cover mr-3 flex-shrink-0" />
                                        <div className="flex-grow min-w-0">
                                            <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                                            <p className="text-xs text-gray-500 line-clamp-1">{item.description || 'Açıklama yok'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end mt-2 sm:mt-0 sm:ml-2">
                                        <span className="font-bold text-brand-dark w-20 text-right text-sm flex-shrink-0">{item.price ? formatCurrency(item.price) : 'Fiyatsız'}</span>
                                        <button onClick={() => openModalForEdit(item)} className="text-blue-500 hover:text-blue-700 p-1 flex-shrink-0"><i className="fas fa-pen"></i></button>
                                        <button onClick={() => handleDeleteItem(item.id, item.name)} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"><i className="fas fa-trash"></i></button>
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
                                <label className="block text-sm font-medium">Fiyat (₺)</label>
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

export default AdminMenuManagement;
