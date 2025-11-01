import React, { useEffect, useRef } from 'react';

// FIX: Add global declarations for custom window properties and CDN libraries to satisfy TypeScript.
// This resolves errors about properties not existing on the `window` object.
declare global {
  interface Window {
    supabase: any;
    escapeHTML: (str: string | null | undefined) => string;
    escapeJS: (str: string | null | undefined) => string;
    handleCategoryNameUpdate: (inputEl: HTMLInputElement) => Promise<void>;
    handleCategoryDelete: (categoryId: number, categoryName: string) => Promise<void>;
    handleItemAdd: (event: Event, categoryId: number) => Promise<void>;
    handleItemDelete: (itemId: number, itemName: string, imageUrl: string | null) => Promise<void>;
    handleItemNameUpdate: (inputEl: HTMLInputElement) => Promise<void>;
    handleItemPriceUpdate: (inputEl: HTMLInputElement) => Promise<void>;
  }
}

// Declare types for CDN-loaded libraries to satisfy TypeScript
declare const Sortable: any;
// The supabase client is loaded from a script tag and attached to window.
// The original `declare const supabase: any;` is removed as we now declare it on the Window interface.

const AdminPanel: React.FC = () => {
  const isInitialized = useRef(false);

  useEffect(() => {
    // This effect hook wraps the entire vanilla JS logic from the original admin.html.
    // It runs only once after the component mounts, replicating the classic <script> tag behavior.
    if (isInitialized.current || typeof window === 'undefined') return;
    isInitialized.current = true;

    // Set body class for admin panel styling
    document.body.classList.remove('bg-[#f8f6f2]');
    document.body.classList.add('bg-gray-100');
    
    // --- Start of original script from admin.html ---

    // ===== SUPABASE BAĞLANTISI =====
    const supabaseUrl = 'https://wiaflghvicpzvmutobeb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYWZsZ2h2aWNwenZtdXRvYmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5ODY1OTMsImV4cCI6MjA3NzU2MjU5M30.CBo49hch7FlHSj9IwrDs0lSRuEMOfvqe3KFakvP7ji0';
    
    // FIX: Property 'supabase' does not exist on type 'Window & typeof globalThis'.
    // The `window.supabase` is now declared in the global interface.
    const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    console.log("Supabase istemcisi başlatıldı.");

    const authScreen = document.getElementById('auth-screen');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const authError = document.getElementById('auth-error');
    const logoutButton = document.getElementById('logout-button');
    const categoriesContainer = document.getElementById('categories-container');
    const addCategoryForm = document.getElementById('add-category-form');
    const newCategoryNameInput = document.getElementById('new-category-name');
    const menuLoadingMessage = document.getElementById('menu-loading-message');
    const siteConfigForm = document.getElementById('site-config-form');
    
    // Global state
    let categorySortable: any = null;
    let itemSortables: { [key: string]: any } = {}; // Kategori ID'lerine göre { catId: sortableInstance }

    // ===== Toast Bildirim Fonksiyonu =====
    function showToast(message: string, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = 'toast show';
        if (type === 'success') {
            toast.classList.add('success');
        } else {
            toast.classList.add('error');
        }
        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 3000);
    }

    // ===== AUTH (GİRİŞ/ÇIKIŞ) İŞLEMLERİ =====

    // Giriş Formu
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (loginForm as any).email.value;
        const password = (loginForm as any).password.value;
        if(authError) authError.textContent = '';

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            
            showToast('Giriş başarılı! Panel yükleniyor...', 'success');
            await checkUserSession();
        } catch (error: any) {
            console.error('Giriş hatası:', error.message);
            if(authError) authError.textContent = `Giriş yapılamadı: ${error.message}`;
            showToast('Giriş yapılamadı!', 'error');
        }
    });

    // Çıkış Butonu
    logoutButton?.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            showToast(`Çıkış hatası: ${error.message}`, 'error');
        } else {
            authScreen?.classList.remove('hidden');
            adminPanel?.classList.add('hidden');
            showToast('Başarıyla çıkış yapıldı.', 'success');
        }
    });

    // Kullanıcı Oturum Kontrolü
    async function checkUserSession() {
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            
            if (session) {
                authScreen?.classList.add('hidden');
                adminPanel?.classList.remove('hidden');
                // Oturum varsa, verileri yükle
                await loadSiteConfig();
                await loadCategoriesAndItems();
            } else {
                authScreen?.classList.remove('hidden');
                adminPanel?.classList.add('hidden');
            }
        } catch (error: any) {
            console.error("Oturum kontrol hatası:", error.message);
            authScreen?.classList.remove('hidden');
            adminPanel?.classList.add('hidden');
        }
    }

    // ===== RESİM YÜKLEME İŞLEMLERİ =====
    
    // Genel resim yükleme fonksiyonu
    async function handleFileUpload(file: File) {
        if (!file) return null;

        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${fileName}`; 

        try {
            const { data, error } = await supabaseClient
                .storage
                .from('uploads')
                .upload(filePath, file);

            if (error) throw error;

            const { data: publicData } = supabaseClient
                .storage
                .from('uploads')
                .getPublicUrl(filePath);

            if (!publicData) throw new Error("Dosya yüklendi ancak URL alınamadı.");

            showToast('Resim başarıyla yüklendi.', 'success');
            return publicData.publicUrl;

        } catch (error: any) {
            console.error('Resim yükleme hatası:', error.message);
            showToast(`Resim yüklenemedi: ${error.message}`, 'error');
            return null;
        }
    }

    // Belirli bir resim URL'sini depodan silme
    async function deleteStorageFile(publicUrl: string) {
        if (!publicUrl) return;
        
        try {
            const urlParts = publicUrl.split('/uploads/');
            if (urlParts.length < 2) return;
            
            const filePath = urlParts[1];
            
            const { error } = await supabaseClient
                .storage
                .from('uploads')
                .remove([filePath]);

            if (error) {
                console.warn(`Depodan resim silinirken hata (belki zaten yoktu): ${filePath}`, error.message);
            } else {
                console.log(`Depodan silindi: ${filePath}`);
            }
        } catch (error: any) {
            console.error('Depodan silme hatası:', error.message);
        }
    }

    function setupImageUploadListeners() {
        const setupListener = (fileInputId: string, urlInputId: string, previewId: string) => {
            const fileInput = document.getElementById(fileInputId) as HTMLInputElement;
            const urlInput = document.getElementById(urlInputId) as HTMLInputElement;
            const preview = document.getElementById(previewId) as HTMLImageElement;
            
            fileInput?.addEventListener('change', async (e) => {
                const target = e.target as HTMLInputElement;
                const file = target.files?.[0];
                if (file) {
                    const url = await handleFileUpload(file);
                    if (url) {
                        if(urlInput) urlInput.value = url;
                        if(preview) preview.src = url;
                    }
                }
            });
            urlInput?.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                if(preview) preview.src = target.value;
            });
             (document.querySelector(`button[type="button"][onclick*="${fileInputId}"]`) as HTMLButtonElement)
                ?.addEventListener('click', () => fileInput.click());
        };

        setupListener('hero_image_file', 'hero_image_url', 'hero_image_preview');
        setupListener('event_card1_file', 'event_card1_image_url', 'event_card1_preview');
        setupListener('event_card2_file', 'event_card2_image_url', 'event_card2_preview');
    }

    // ===== SİTE AYARLARI (site_config) İŞLEMLERİ =====
    const configFields = [
        'hero_title', 'hero_subtitle', 'hero_image_url',
        'brand_story_title', 'brand_story_body',
        'value1_title', 'value1_body', 'value2_title', 'value2_body', 'value3_title', 'value3_body',
        'event_card1_title', 'event_card1_body', 'event_card1_image_url',
        'event_card2_title', 'event_card2_body', 'event_card2_image_url'
    ];
    
    async function loadSiteConfig() {
        try {
            const { data, error } = await supabaseClient
                .from('site_config')
                .select('*')
                .eq('id', 1)
                .single();
            if (error) throw error;
            if (data) {
                configFields.forEach(id => {
                    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
                    if (el) el.value = data[id] || '';
                    if (id.endsWith('_url')) {
                        const previewEl = document.getElementById(id.replace('_url', '_preview')) as HTMLImageElement;
                        if (previewEl) previewEl.src = data[id] || '';
                    }
                });
            }
        } catch (error: any) {
            console.error('Site ayarları yüklenemedi:', error.message);
            showToast('Site ayarları yüklenemedi!', 'error');
        }
    }

    siteConfigForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updates: { [key: string]: any } = {};
        configFields.forEach(id => {
            updates[id] = (document.getElementById(id) as HTMLInputElement).value;
        });

        try {
            const { error } = await supabaseClient
                .from('site_config')
                .update(updates)
                .eq('id', 1);

            if (error) throw error;
            showToast('Site ayarları başarıyla kaydedildi!', 'success');
        } catch (error: any) {
            console.error('Site ayarları kaydedilemedi:', error.message);
            showToast(`Kayıt hatası: ${error.message}`, 'error');
        }
    });

    // ===== MENÜ (KATEGORİ VE ÜRÜN) İŞLEMLERİ =====
    async function loadCategoriesAndItems() {
        if(menuLoadingMessage) menuLoadingMessage.textContent = 'Menü yükleniyor...';
        if(categoriesContainer) categoriesContainer.innerHTML = '';
        
        try {
            const { data: categories, error: catError } = await supabaseClient
                .from('menu_categories').select('*').order('position', { ascending: true });
            if (catError) throw catError;

            const { data: items, error: itemError } = await supabaseClient
                .from('menu_items').select('*').order('position', { ascending: true });
            if (itemError) throw itemError;

            if (categories.length === 0) {
                 if(categoriesContainer) categoriesContainer.innerHTML = '<p class="text-gray-500 text-center">Henüz hiç kategori eklenmemiş.</p>';
            } else {
                if(menuLoadingMessage) menuLoadingMessage.textContent = '';
            }

            categories.forEach((category: any) => {
                const categoryItems = items.filter((item: any) => item.category_id === category.id);
                renderCategory(category, categoryItems);
            });

            initCategorySortable();
            categories.forEach((category: any) => initItemSortable(category.id));

        } catch (error: any) {
            console.error('Menü yüklenemedi:', error.message);
            if(menuLoadingMessage) menuLoadingMessage.textContent = 'Menü yüklenirken bir hata oluştu.';
            showToast('Menü yüklenemedi!', 'error');
        }
    }

    addCategoryForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryName = (newCategoryNameInput as HTMLInputElement)?.value.trim();
        if (!categoryName) return;

        const { data: maxPosData } = await supabaseClient
            .from('menu_categories').select('position').order('position', { ascending: false }).limit(1).single();
        const newPosition = (maxPosData ? maxPosData.position : 0) + 1;

        try {
            const { data, error } = await supabaseClient
                .from('menu_categories').insert({ name: categoryName, position: newPosition }).select().single();
            if (error) throw error;
            
            renderCategory(data, []);
            initItemSortable(data.id);
            if(newCategoryNameInput) (newCategoryNameInput as HTMLInputElement).value = '';
            showToast('Kategori eklendi.', 'success');
        } catch (error: any) {
            console.error('Kategori eklenemedi:', error.message);
            showToast('Kategori eklenemedi!', 'error');
        }
    });

    function renderCategory(category: any, items: any[]) {
        if(!categoriesContainer) return;
        const categoryEl = document.createElement('div');
        categoryEl.className = 'bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm category-card';
        categoryEl.dataset.categoryId = category.id;
        
        categoryEl.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-arrows-alt handle text-gray-400 cursor-move" title="Kategoriyi Sürükle"></i>
                    <input type="text" value="${window.escapeHTML(category.name)}" class="text-xl font-bold text-brand-dark bg-transparent border-b-2 border-transparent focus:border-brand-gold focus:outline-none" data-category-id="${category.id}">
                </div>
                <button class="text-red-600 hover:text-red-800" title="Kategoriyi Sil">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 item-list" id="item-list-${category.id}" data-category-id="${category.id}">
                ${items.map(renderItem).join('')}
            </div>
            <form class="mt-4 p-3 bg-white rounded-lg border border-dashed">
                <h4 class="font-semibold text-gray-600 mb-2">Yeni Ürün Ekle (${window.escapeHTML(category.name)})</h4>
                <div class="flex flex-col md:flex-row gap-2">
                    <input type="text" name="itemName" placeholder="Ürün Adı" required class="flex-grow p-2 border rounded-lg">
                    <input type="file" name="itemImage" accept="image/*" class="text-sm">
                    <button type="submit" class="bg-blue-500 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-600">
                        <i class="fas fa-plus"></i> Ekle
                    </button>
                </div>
            </form>
        `;
        // FIX: Property 'handle...' does not exist on type 'Window & typeof globalThis'.
        // The `window.handle...` functions are now declared on the global interface.
        categoryEl.querySelector('input[type="text"]')?.addEventListener('change', (e) => window.handleCategoryNameUpdate(e.target as HTMLInputElement));
        categoryEl.querySelector('button.text-red-600')?.addEventListener('click', () => window.handleCategoryDelete(category.id, category.name));
        categoryEl.querySelector('form')?.addEventListener('submit', (e) => window.handleItemAdd(e, category.id));

        categoriesContainer.appendChild(categoryEl);
    }

    window.handleCategoryNameUpdate = async (inputEl: HTMLInputElement) => {
        const categoryId = inputEl.dataset.categoryId;
        const newName = inputEl.value;
        try {
            const { error } = await supabaseClient.from('menu_categories').update({ name: newName }).eq('id', categoryId);
            if (error) throw error;
            showToast('Kategori adı güncellendi.', 'success');
        } catch (error: any) {
            showToast('Kategori adı güncellenemedi!', 'error');
            console.error(error);
        }
    };

    window.handleCategoryDelete = async (categoryId: number, categoryName: string) => {
        if (!confirm(`'${categoryName}' kategorisini silmek istediğinizden emin misiniz? Bu kategorideki TÜM ÜRÜNLER de silinecektir!`)) return;
        try {
            const { error } = await supabaseClient.from('menu_categories').delete().eq('id', categoryId);
            if (error) throw error;
            document.querySelector(`[data-category-id="${categoryId}"]`)?.remove();
            delete itemSortables[categoryId];
            showToast('Kategori ve içindeki ürünler silindi.', 'success');
        } catch (error: any) {
            showToast('Kategori silinemedi!', 'error');
            console.error(error);
        }
    };

    function renderItem(item: any) {
        // FIX: Add `window.` prefix to event handlers for clarity and to resolve potential scope issues.
        // FIX: Property 'escapeHTML'/'escapeJS' does not exist on type 'Window & typeof globalThis'.
        // The `window.escape...` functions are now declared on the global interface.
        return `
            <div class="bg-white border rounded-lg shadow-sm flex items-center p-2 space-x-2 item-card" data-item-id="${item.id}">
                <i class="fas fa-arrows-alt handle text-gray-400 cursor-move" title="Ürünü Sürükle"></i>
                <img src="${item.image_url || 'https://placehold.co/100x100/eee/ccc?text=Görsel'}" alt="${window.escapeHTML(item.name)}" class="w-16 h-16 object-cover rounded-md bg-gray-200">
                <div class="flex-grow">
                    <input type="text" value="${window.escapeHTML(item.name)}" class="font-semibold w-full bg-transparent border-b-2 border-transparent focus:border-brand-gold focus:outline-none" data-item-id="${item.id}" onchange="window.handleItemNameUpdate(this)">
                    <input type="number" step="0.01" value="${item.price || ''}" placeholder="Fiyat (örn: 150.50)" class="text-sm text-gray-600 w-full mt-1 bg-transparent border-b-2 border-transparent focus:border-brand-gold focus:outline-none" data-item-id="${item.id}" onchange="window.handleItemPriceUpdate(this)">
                </div>
                <button class="text-red-500 hover:text-red-700 ml-auto" title="Ürünü Sil" onclick="window.handleItemDelete(${item.id}, '${window.escapeJS(item.name)}', ${item.image_url ? `'${window.escapeJS(item.image_url)}'` : 'null'})">
                    <i class="fas fa-trash-alt fa-sm"></i>
                </button>
            </div>
        `;
    }

    window.handleItemAdd = async (event: Event, categoryId: number) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const itemName = (form.elements.namedItem('itemName') as HTMLInputElement).value.trim();
        const itemImageFile = (form.elements.namedItem('itemImage') as HTMLInputElement).files?.[0];
        if (!itemName) return;

        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            let imageUrl = null;
            if (itemImageFile) {
                imageUrl = await handleFileUpload(itemImageFile);
                if (!imageUrl) throw new Error('Resim yüklenemedi, ürün eklenmedi.');
            }

            const { data: maxPosData } = await supabaseClient
                .from('menu_items').select('position').eq('category_id', categoryId).order('position', { ascending: false }).limit(1).single();
            const newPosition = (maxPosData ? maxPosData.position : 0) + 1;

            const { data: newItem, error } = await supabaseClient
                .from('menu_items').insert({ category_id: categoryId, name: itemName, image_url: imageUrl, price: null, position: newPosition }).select().single();
            if (error) throw error;

            const itemListEl = document.getElementById(`item-list-${categoryId}`);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = renderItem(newItem);
            const newItemEl = tempDiv.firstChild as HTMLElement;
            
            // Re-attach event listeners for dynamically created element
            newItemEl.querySelector('input[type="text"]')?.addEventListener('change', (e) => window.handleItemNameUpdate(e.target as HTMLInputElement));
            newItemEl.querySelector('input[type="number"]')?.addEventListener('change', (e) => window.handleItemPriceUpdate(e.target as HTMLInputElement));
            newItemEl.querySelector('button')?.addEventListener('click', () => window.handleItemDelete(newItem.id, newItem.name, newItem.image_url));
            itemListEl?.appendChild(newItemEl);
            
            form.reset();
            showToast('Ürün eklendi.', 'success');
        } catch (error: any) {
            showToast(`Ürün eklenemedi: ${error.message}`, 'error');
            console.error(error);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-plus"></i> Ekle';
        }
    };

    window.handleItemDelete = async (itemId: number, itemName: string, imageUrl: string | null) => {
        if (!confirm(`'${itemName}' ürününü silmek istediğinizden emin misiniz?`)) return;
        try {
            const { error } = await supabaseClient.from('menu_items').delete().eq('id', itemId);
            if (error) throw error;
            if (imageUrl) await deleteStorageFile(imageUrl);
            document.querySelector(`div[data-item-id="${itemId}"]`)?.remove();
            showToast('Ürün silindi.', 'success');
        } catch (error: any) {
            showToast('Ürün silinemedi!', 'error');
            console.error(error);
        }
    };
    
    window.handleItemNameUpdate = async (inputEl: HTMLInputElement) => {
        const itemId = inputEl.dataset.itemId;
        const newName = inputEl.value;
        try {
            const { error } = await supabaseClient.from('menu_items').update({ name: newName }).eq('id', itemId);
            if (error) throw error;
            showToast('Ürün adı güncellendi.', 'success');
        } catch (error: any) {
            showToast('Ürün adı güncellenemedi!', 'error');
            console.error(error);
        }
    };

    window.handleItemPriceUpdate = async (inputEl: HTMLInputElement) => {
        const itemId = inputEl.dataset.itemId;
        const newPrice = inputEl.value ? parseFloat(inputEl.value) : null;
        try {
            const { error } = await supabaseClient.from('menu_items').update({ price: newPrice }).eq('id', itemId);
            if (error) throw error;
            showToast('Ürün fiyatı güncellendi.', 'success');
        } catch (error: any) {
            showToast('Ürün fiyatı güncellenemedi!', 'error');
            console.error(error);
        }
    };

    // ===== SÜRÜKLE-BIRAK (SortableJS) İŞLEMLERİ =====
    function initCategorySortable() {
        if (categorySortable) categorySortable.destroy();
        if(!categoriesContainer) return;
        categorySortable = new Sortable(categoriesContainer, {
            animation: 150, handle: '.handle', ghostClass: 'ghost', chosenClass: 'sortable-chosen', onEnd: updateCategoryPositions
        });
    }

    async function updateCategoryPositions() {
        if(!categoriesContainer) return;
        const updates = Array.from(categoriesContainer.querySelectorAll('.category-card')).map((card, index) => ({
            id: (card as HTMLElement).dataset.categoryId,
            position: index + 1
        }));
        try {
            const { error } = await supabaseClient.from('menu_categories').upsert(updates);
            if (error) throw error;
            showToast('Kategori sırası güncellendi.', 'success');
        } catch (error: any) {
            showToast('Kategori sırası güncellenemedi!', 'error');
            console.error(error);
        }
    }

    function initItemSortable(categoryId: number) {
        const itemListEl = document.getElementById(`item-list-${categoryId}`);
        if (!itemListEl) return;
        if (itemSortables[categoryId]) itemSortables[categoryId].destroy();
        itemSortables[categoryId] = new Sortable(itemListEl, {
            animation: 150, handle: '.handle', ghostClass: 'ghost', chosenClass: 'sortable-chosen', group: 'items', onEnd: updateItemPositions
        });
    }

    async function updateItemPositions(event: any) {
        const newCategoryEl = event.to as HTMLElement;
        const newCategoryId = newCategoryEl.dataset.categoryId;
        const updates = Array.from(newCategoryEl.querySelectorAll('.item-card')).map((card, index) => ({
            id: (card as HTMLElement).dataset.itemId,
            position: index + 1,
            category_id: newCategoryId
        }));

        if (event.from !== newCategoryEl) {
            const oldCategoryEl = event.from as HTMLElement;
            const oldCategoryId = oldCategoryEl.dataset.categoryId;
            const oldItems = Array.from(oldCategoryEl.querySelectorAll('.item-card')).map((card, index) => ({
                id: (card as HTMLElement).dataset.itemId,
                position: index + 1,
                category_id: oldCategoryId
            }));
            updates.push(...oldItems);
        }

        try {
            const { error } = await supabaseClient.from('menu_items').upsert(updates);
            if (error) throw error;
            showToast('Ürün sırası güncellendi.', 'success');
        } catch (error: any) {
            showToast('Ürün sırası güncellenemedi!', 'error');
            console.error(error);
        }
    }
    
    window.escapeHTML = (str: string | null | undefined) => {
        if (str === null || str === undefined) return '';
        return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };
    window.escapeJS = (str: string | null | undefined) => {
        if (str === null || str === undefined) return '';
        return str.toString().replace(/'/g, "\\'");
    };

    // ===== BAŞLANGIÇ =====
    setupImageUploadListeners();
    checkUserSession();

    // --- End of original script ---

    // Cleanup function when the component unmounts
    return () => {
      document.body.classList.remove('bg-gray-100');
      document.body.classList.add('bg-[#f8f6f2]');
      // Destroy sortable instances to prevent memory leaks
      if (categorySortable) categorySortable.destroy();
      Object.values(itemSortables).forEach((sortable: any) => sortable.destroy());
    };
  }, []); // Empty dependency array ensures this effect runs only once

  const handleGoHome = () => {
    window.location.hash = '/';
  };

  return (
    <>
      <div id="toast" className="toast">Bildirim Mesajı</div>

      <div id="auth-screen" className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
              <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Lezzetin Mimarı Logo" className="w-48 mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-gray-800 mb-4">Yönetim Paneli Girişi</h1>
              <form id="login-form">
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
              <p id="auth-error" className="text-red-600 mt-4 text-sm"></p>
              <div className="mt-6 border-t pt-4">
                <button 
                  onClick={handleGoHome} 
                  className="inline-block text-sm font-medium text-gray-500 hover:text-brand-gold transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-gold rounded"
                >
                    <i className="fas fa-arrow-left mr-1"></i>
                    Ana Sayfaya Dön
                </button>
              </div>
          </div>
      </div>

      <div id="admin-panel" className="hidden">
          <header className="bg-brand-dark shadow-md sticky top-0 z-50">
              <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                  <button onClick={handleGoHome} className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-dark focus:ring-brand-gold rounded">
                    <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Lezzetin Mimarı Logo" className="h-10" />
                  </button>
                  <button id="logout-button" className="text-sm bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition duration-300">
                      <i className="fas fa-sign-out-alt mr-1"></i> Çıkış Yap
                  </button>
              </div>
          </header>

          <div className="container mx-auto p-4 md:p-8">
              <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
                  <h2 className="text-2xl font-bold text-brand-dark mb-5 border-b pb-3 flex items-center"><i className="fas fa-cog mr-3"></i>Genel Site Ayarları</h2>
                  <form id="site-config-form" className="space-y-4">
                      
                      <h3 className="text-lg font-semibold text-gray-700 mt-4 border-t pt-4">Ana Başlık Bölümü</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label htmlFor="hero_title" className="block text-sm font-medium text-gray-700">Ana Başlık</label>
                              <input type="text" id="hero_title" className="mt-1 w-full p-2 border rounded-lg" />
                          </div>
                          <div>
                              <label htmlFor="hero_subtitle" className="block text-sm font-medium text-gray-700">Alt Başlık</label>
                              <input type="text" id="hero_subtitle" className="mt-1 w-full p-2 border rounded-lg" />
                          </div>
                      </div>
                      <div>
                          <label htmlFor="hero_image_url" className="block text-sm font-medium text-gray-700">Ana Görsel (URL veya Yükle)</label>
                          <div className="flex items-center space-x-2 mt-1">
                              <input type="text" id="hero_image_url" className="w-full p-2 border rounded-lg" placeholder="https://..." />
                              <input type="file" id="hero_image_file" className="hidden" accept="image/*" />
                              <button type="button" className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm" onClick={() => document.getElementById('hero_image_file')?.click()}><i className="fas fa-upload"></i></button>
                          </div>
                          <img id="hero_image_preview" src="" className="mt-2 h-32 rounded-lg shadow-sm object-cover" alt="Ana Görsel Önizleme" />
                      </div>

                      <h3 className="text-lg font-semibold text-gray-700 mt-4 border-t pt-4">Marka Hikayesi</h3>
                      <div>
                          <label htmlFor="brand_story_title" className="block text-sm font-medium text-gray-700">Hikaye Başlığı</label>
                          <input type="text" id="brand_story_title" className="mt-1 w-full p-2 border rounded-lg" />
                      </div>
                      <div>
                          <label htmlFor="brand_story_body" className="block text-sm font-medium text-gray-700">Hikaye İçeriği</label>
                          <textarea id="brand_story_body" rows={3} className="mt-1 w-full p-2 border rounded-lg"></textarea>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-700 mt-4 border-t pt-4">Değerler (3 Adet)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                              <label htmlFor="value1_title" className="block text-sm font-medium text-gray-700">Değer 1 Başlık</label>
                              <input type="text" id="value1_title" className="mt-1 w-full p-2 border rounded-lg" />
                              <label htmlFor="value1_body" className="block text-sm font-medium text-gray-700 mt-2">Değer 1 Açıklama</label>
                              <textarea id="value1_body" rows={2} className="mt-1 w-full p-2 border rounded-lg"></textarea>
                          </div>
                          <div>
                              <label htmlFor="value2_title" className="block text-sm font-medium text-gray-700">Değer 2 Başlık</label>
                              <input type="text" id="value2_title" className="mt-1 w-full p-2 border rounded-lg" />
                              <label htmlFor="value2_body" className="block text-sm font-medium text-gray-700 mt-2">Değer 2 Açıklama</label>
                              <textarea id="value2_body" rows={2} className="mt-1 w-full p-2 border rounded-lg"></textarea>
                          </div>
                          <div>
                              <label htmlFor="value3_title" className="block text-sm font-medium text-gray-700">Değer 3 Başlık</label>
                              <input type="text" id="value3_title" className="mt-1 w-full p-2 border rounded-lg" />
                              <label htmlFor="value3_body" className="block text-sm font-medium text-gray-700 mt-2">Değer 3 Açıklama</label>
                              <textarea id="value3_body" rows={2} className="mt-1 w-full p-2 border rounded-lg"></textarea>
                          </div>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-700 mt-4 border-t pt-4">Etkinlik İçeriği Kartları</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <h4 className="font-semibold text-gray-600 mb-2">Kart 1 (Lezzet)</h4>
                              <label htmlFor="event_card1_title" className="block text-sm font-medium text-gray-700">Başlık</label>
                              <input type="text" id="event_card1_title" className="mt-1 w-full p-2 border rounded-lg" />
                              <label htmlFor="event_card1_body" className="block text-sm font-medium text-gray-700 mt-2">Açıklama</label>
                              <textarea id="event_card1_body" rows={3} className="mt-1 w-full p-2 border rounded-lg"></textarea>
                              <label htmlFor="event_card1_image_url" className="block text-sm font-medium text-gray-700 mt-2">Görsel (URL veya Yükle)</label>
                              <div className="flex items-center space-x-2 mt-1">
                                  <input type="text" id="event_card1_image_url" className="w-full p-2 border rounded-lg" placeholder="https://..." />
                                  <input type="file" id="event_card1_file" className="hidden" accept="image/*" />
                                  <button type="button" className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm" onClick={() => document.getElementById('event_card1_file')?.click()}><i className="fas fa-upload"></i></button>
                              </div>
                              <img id="event_card1_preview" src="" className="mt-2 h-24 rounded-lg shadow-sm object-cover" alt="Kart 1 Önizleme" />
                          </div>
                          <div>
                              <h4 className="font-semibold text-gray-600 mb-2">Kart 2 (Alışveriş)</h4>
                              <label htmlFor="event_card2_title" className="block text-sm font-medium text-gray-700">Başlık</label>
                              <input type="text" id="event_card2_title" className="mt-1 w-full p-2 border rounded-lg" />
                              <label htmlFor="event_card2_body" className="block text-sm font-medium text-gray-700 mt-2">Açıklama</label>
                              <textarea id="event_card2_body" rows={3} className="mt-1 w-full p-2 border rounded-lg"></textarea>
                              <label htmlFor="event_card2_image_url" className="block text-sm font-medium text-gray-700 mt-2">Görsel (URL veya Yükle)</label>
                              <div className="flex items-center space-x-2 mt-1">
                                  <input type="text" id="event_card2_image_url" className="w-full p-2 border rounded-lg" placeholder="https://..." />
                                  <input type="file" id="event_card2_file" className="hidden" accept="image/*" />
                                  <button type="button" className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm" onClick={() => document.getElementById('event_card2_file')?.click()}><i className="fas fa-upload"></i></button>
                              </div>
                              <img id="event_card2_preview" src="" className="mt-2 h-24 rounded-lg shadow-sm object-cover" alt="Kart 2 Önizleme" />
                          </div>
                      </div>
                      
                      <button type="submit" className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition duration-300 mt-6">
                          <i className="fas fa-save mr-2"></i> Genel Ayarları Kaydet
                      </button>
                  </form>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg">
                  <h2 className="text-2xl font-bold text-brand-dark mb-5 border-b pb-3 flex items-center"><i className="fas fa-utensils mr-3"></i>Menü Yönetimi</h2>
                  <form id="add-category-form" className="flex items-center space-x-2 mb-6">
                      <input type="text" id="new-category-name" placeholder="Yeni Kategori Adı (örn: Tatlılar)" required className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold" />
                      <button type="submit" className="bg-brand-gold text-white py-2 px-4 rounded-lg font-semibold hover:bg-opacity-90 transition duration-300 whitespace-nowrap">
                          <i className="fas fa-plus"></i> Kategori Ekle
                      </button>
                  </form>
                  <div id="categories-container" className="space-y-6">
                      <p id="menu-loading-message">Menü yükleniyor...</p>
                  </div>
              </div>
          </div>
      </div>
    </>
  );
};

export default AdminPanel;