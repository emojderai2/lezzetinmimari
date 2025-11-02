import React, { useEffect, useRef } from 'react';

// FIX: Add global declarations for custom window properties, CDN libraries, and Vite environment variables to satisfy TypeScript.
// This resolves errors about properties not existing on the `window` or `import.meta.env` objects.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_SUPABASE_URL: string;
      readonly VITE_SUPABASE_ANON_KEY: string;
    };
  }
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
    handleItemImageUrlUpdate: (inputEl: HTMLInputElement) => Promise<void>;
    handleItemDescriptionUpdate: (textareaEl: HTMLTextAreaElement) => Promise<void>;
  }
}

// Declare types for CDN-loaded libraries to satisfy TypeScript
declare const Sortable: any;
// The supabase client is loaded from a script tag and attached to window.
// The original `declare const supabase: any;` is removed as we now declare it on the Window interface.

// ===================================================================================
// YAYINLAMA İÇİN GÜVENLİ ANAHTAR YÖNETİMİ (Yönetici Paneli)
// LÜTFEN `services/supabaseService.ts` dosyasındaki anahtarları da güncelleyin.
// ===================================================================================
const LOCAL_DEV_SUPABASE_URL = "https://wiaflghvicpzvmutobeb.supabase.co";
const LOCAL_DEV_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYWZsZ2h2aWNwenZtdXRvYmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5ODY1OTMsImV4cCI6MjA3NzU2MjU5M30.CBo49hch7FlHSj9IwrDs0lSRuEMOfvqe3KFakvP7ji0";


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
    // FINAL FIX: Check if `import.meta.env` exists before trying to access it.
    const supabaseUrl = (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SUPABASE_URL) || LOCAL_DEV_SUPABASE_URL;
    const supabaseKey = (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SUPABASE_ANON_KEY) || LOCAL_DEV_SUPABASE_ANON_KEY;
    const STORAGE_BUCKET_NAME = 'site-assets';

    // Check if environment variables are set. If not, show an error and stop.
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("BURAYA")) {
        console.error("Supabase environment variables not set!");
        const authScreen = document.getElementById('auth-screen');
        if (authScreen) {
            authScreen.innerHTML = `
                <div class="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                    <h1 class="text-2xl font-bold text-red-600 mb-4">Yapılandırma Hatası</h1>
                    <p class="text-gray-700">Lütfen 'components/AdminPanel.tsx' dosyasındaki yer tutucu Supabase anahtarlarını doldurun.</p>
                </div>
            `;
        }
        return; // Stop execution of the script
    }
    
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

    // ===== SİTE AYARLARI (site_config) İŞLEMLERİ =====
    const configFields = [
        'hero_title', 'hero_subtitle', 'hero_image_url',
        'brand_story_title', 'brand_story_body',
        'value1_title', 'value1_body', 'value2_title', 'value2_body', 'value3_title', 'value3_body',
        'event_card1_title', 'event_card1_body', 'event_card1_image_url',
        'event_card2_title', 'event_card2_body', 'event_card2_image_url',
        'event_card3_title', 'event_card3_body', 'event_card3_image_url',
        'countdown_enabled', 'countdown_target'
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
                    if (el) {
                         if (el.type === 'checkbox') {
                            (el as HTMLInputElement).checked = data[id];
                        } else if (el.type === 'datetime-local') {
                            if (data[id]) {
                                // Supabase timestamp: 2024-11-26T11:00:00+00:00
                                // datetime-local input needs: 2024-11-26T11:00
                                const date = new Date(data[id]);
                                // Adjust for local timezone to display correctly in the input
                                const timezoneOffset = date.getTimezoneOffset() * 60000;
                                const localISOTime = new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
                                el.value = localISOTime;
                            } else {
                                el.value = '';
                            }
                        } else {
                            el.value = data[id] || '';
                        }
                    }

                    if (id.endsWith('_url')) {
                        const previewEl = document.getElementById(id.replace('_url', '_preview')) as HTMLImageElement;
                        if (previewEl) previewEl.src = data[id] || 'https://placehold.co/100x100/eee/ccc?text=Görsel';
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
            const el = document.getElementById(id) as HTMLInputElement;
            if (!el) return;

            if (el.type === 'checkbox') {
                updates[id] = el.checked;
            } else {
                // For datetime-local and other text inputs, an empty value should be null in the DB
                updates[id] = el.value === '' ? null : el.value;
            }
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
                    <input type="text" value="${window.escapeHTML(category.name)}" class="text-xl font-bold text-brand-dark bg-transparent border-b-2 border-transparent focus:border-brand-gold focus:outline-none" data-category-id="${category.id}" style="color: initial;">
                </div>
                <button class="text-red-600 hover:text-red-800 js-category-delete" title="Kategoriyi Sil">
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
                    <input type="text" name="itemImageUrl" placeholder="Görsel URL'i" class="flex-grow p-2 border rounded-lg">
                    <button type="submit" class="bg-blue-500 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-600">
                        <i class="fas fa-plus"></i> Ekle
                    </button>
                </div>
            </form>
        `;

        categoryEl.querySelector('input[type="text"]')?.addEventListener('change', (e) => window.handleCategoryNameUpdate(e.target as HTMLInputElement));
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
            <div class="bg-white border rounded-lg shadow-sm flex items-start p-2 space-x-2 item-card" data-item-id="${item.id}">
                <i class="fas fa-arrows-alt handle text-gray-400 cursor-move pt-1" title="Ürünü Sürükle"></i>
                <img src="${item.image_url || 'https://placehold.co/100x100/eee/ccc?text=Görsel'}" alt="${window.escapeHTML(item.name)}" class="w-16 h-16 object-cover rounded-md bg-gray-200 flex-shrink-0">
                <div class="flex-grow">
                    <input type="text" value="${window.escapeHTML(item.name)}" class="font-semibold text-brand-dark w-full bg-transparent border-b-2 border-transparent focus:border-brand-gold focus:outline-none" data-item-id="${item.id}" onchange="window.handleItemNameUpdate(this)" style="color: initial;">
                    <input type="number" step="0.01" value="${item.price || ''}" placeholder="Fiyat (örn: 150.50)" class="text-sm text-gray-600 w-full mt-1 bg-transparent border-b-2 border-transparent focus:border-brand-gold focus:outline-none" data-item-id="${item.id}" onchange="window.handleItemPriceUpdate(this)" style="color: initial;">
                    <textarea placeholder="Açıklama..." rows="2" class="text-sm text-gray-600 w-full mt-1 bg-transparent border-b-2 border-transparent focus:border-brand-gold focus:outline-none resize-none" data-item-id="${item.id}" onchange="window.handleItemDescriptionUpdate(this)" style="color: initial;">${item.description ? window.escapeHTML(item.description) : ''}</textarea>
                    <input type="text" value="${item.image_url || ''}" placeholder="Görsel URL'i" class="text-xs text-gray-500 w-full mt-1 bg-transparent border-b-2 border-transparent focus:border-brand-gold focus:outline-none js-image-url-input" data-item-id="${item.id}" onchange="window.handleItemImageUrlUpdate(this)" style="color: initial;">
                </div>
                <button class="js-item-delete text-red-500 hover:text-red-700 ml-auto flex-shrink-0" title="Ürünü Sil">
                    <i class="fas fa-trash-alt fa-sm"></i>
                </button>
            </div>
        `;
    }

    window.handleItemAdd = async (event: Event, categoryId: number) => {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const itemName = (form.elements.namedItem('itemName') as HTMLInputElement).value.trim();
        const imageUrl = (form.elements.namedItem('itemImageUrl') as HTMLInputElement).value.trim() || null;
        if (!itemName) return;

        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const { data: maxPosData } = await supabaseClient
                .from('menu_items').select('position').eq('category_id', categoryId).order('position', { ascending: false }).limit(1).single();
            const newPosition = (maxPosData ? maxPosData.position : 0) + 1;

            const { data: newItem, error } = await supabaseClient
                .from('menu_items').insert({ 
                    category_id: categoryId, 
                    name: itemName, 
                    image_url: imageUrl, 
                    price: null, 
                    position: newPosition,
                    description: null 
                }).select().single();
            if (error) throw error;

            const itemListEl = document.getElementById(`item-list-${categoryId}`);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = renderItem(newItem);
            const newItemEl = tempDiv.firstElementChild; // FIX: Use firstElementChild to skip leading text/whitespace nodes
            
            if (newItemEl) {
                // The `renderItem` function already includes inline `onchange` and `onclick` handlers.
                // Manually adding them again with `addEventListener` is redundant and has been removed.
                itemListEl?.appendChild(newItemEl);
            }
            
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
            const { error: deleteError } = await supabaseClient.from('menu_items').delete().eq('id', itemId);
            if (deleteError) throw deleteError;
            
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
    
    window.handleItemDescriptionUpdate = async (textareaEl: HTMLTextAreaElement) => {
        const itemId = textareaEl.dataset.itemId;
        const newDescription = textareaEl.value.trim() || null;
        try {
            const { error } = await supabaseClient.from('menu_items').update({ description: newDescription }).eq('id', itemId);
            if (error) throw error;
            showToast('Ürün açıklaması güncellendi.', 'success');
        } catch (error: any) {
            showToast('Ürün açıklaması güncellenemedi!', 'error');
            console.error(error);
        }
    };

    window.handleItemImageUrlUpdate = async (inputEl: HTMLInputElement) => {
        const itemId = inputEl.dataset.itemId;
        const newImageUrl = inputEl.value.trim() || null;
        try {
            const { error } = await supabaseClient.from('menu_items').update({ image_url: newImageUrl }).eq('id', itemId);
            if (error) throw error;

            // Update the preview image in the same card
            const itemCard = inputEl.closest('.item-card');
            if (itemCard) {
                const imgEl = itemCard.querySelector('img');
                if (imgEl) {
                    imgEl.src = newImageUrl || 'https://placehold.co/100x100/eee/ccc?text=Görsel';
                }
            }
            showToast('Ürün görseli güncellendi.', 'success');
        } catch (error: any) {
            showToast('Ürün görseli güncellenemedi!', 'error');
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
        if (!categoriesContainer) return;
        const updates = Array.from(categoriesContainer.querySelectorAll('.category-card')).map((card, index) => ({
            id: parseInt((card as HTMLElement).dataset.categoryId!, 10),
            position: index + 1
        }));

        const promises = updates.map(update =>
            supabaseClient
                .from('menu_categories')
                .update({ position: update.position })
                .eq('id', update.id)
        );

        try {
            const results = await Promise.all(promises);
            for (const result of results) {
                if (result.error) throw result.error;
            }
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
        const newCategoryId = parseInt(newCategoryEl.dataset.categoryId!, 10);
        let updates = Array.from(newCategoryEl.querySelectorAll('.item-card')).map((card, index) => ({
            id: parseInt((card as HTMLElement).dataset.itemId!, 10),
            position: index + 1,
            category_id: newCategoryId
        }));

        if (event.from !== newCategoryEl) {
            const oldCategoryEl = event.from as HTMLElement;
            const oldCategoryId = parseInt(oldCategoryEl.dataset.categoryId!, 10);
            const oldItems = Array.from(oldCategoryEl.querySelectorAll('.item-card')).map((card, index) => ({
                id: parseInt((card as HTMLElement).dataset.itemId!, 10),
                position: index + 1,
                category_id: oldCategoryId
            }));
            updates.push(...oldItems);
        }

        const promises = updates.map(update =>
            supabaseClient
                .from('menu_items')
                .update({ position: update.position, category_id: update.category_id })
                .eq('id', update.id)
        );

        try {
            const results = await Promise.all(promises);
            for (const result of results) {
                if (result.error) throw result.error;
            }
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
    
    // ===== DELEGATED EVENT LISTENER FOR DYNAMIC CONTENT =====
    categoriesContainer?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;

        // Handle Category Deletion
        const categoryDeleteButton = target.closest('.js-category-delete');
        if (categoryDeleteButton) {
            event.preventDefault();
            const categoryCard = categoryDeleteButton.closest('.category-card') as HTMLElement;
            if (categoryCard?.dataset.categoryId) {
                const categoryId = parseInt(categoryCard.dataset.categoryId, 10);
                const categoryNameInput = categoryCard.querySelector('input[data-category-id]') as HTMLInputElement;
                const categoryName = categoryNameInput ? categoryNameInput.value : '...';
                window.handleCategoryDelete(categoryId, categoryName);
            }
        }

        // Handle Item Deletion
        const itemDeleteButton = target.closest('.js-item-delete');
        if (itemDeleteButton) {
            event.preventDefault();
            const itemCard = itemDeleteButton.closest('.item-card') as HTMLElement;
            if (itemCard?.dataset.itemId) {
                const itemId = parseInt(itemCard.dataset.itemId, 10);
                const itemNameInput = itemCard.querySelector('div.flex-grow > input[type="text"]') as HTMLInputElement;
                const itemName = itemNameInput ? itemNameInput.value : '...';
                const imageUrlInput = itemCard.querySelector('.js-image-url-input') as HTMLInputElement;
                const imageUrl = imageUrlInput ? imageUrlInput.value : null;
                window.handleItemDelete(itemId, itemName, imageUrl);
            }
        }
    });

    // ===== BAŞLANGIÇ =====
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
                    <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Lezzetin Mimarı Logo" className="h-10 bg-white p-1 rounded" />
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
                          <label htmlFor="hero_image_url" className="block text-sm font-medium text-gray-700">Ana Görsel URL'i</label>
                          <div className="flex items-center space-x-2 mt-1">
                              <input type="text" id="hero_image_url" className="w-full p-2 border rounded-lg" placeholder="https://..." />
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                              <h4 className="font-semibold text-gray-600 mb-2">Kart 1 (Lezzet)</h4>
                              <label htmlFor="event_card1_title" className="block text-sm font-medium text-gray-700">Başlık</label>
                              <input type="text" id="event_card1_title" className="mt-1 w-full p-2 border rounded-lg" />
                              <label htmlFor="event_card1_body" className="block text-sm font-medium text-gray-700 mt-2">Açıklama</label>
                              <textarea id="event_card1_body" rows={3} className="mt-1 w-full p-2 border rounded-lg"></textarea>
                              <label htmlFor="event_card1_image_url" className="block text-sm font-medium text-gray-700 mt-2">Görsel URL'i</label>
                              <div className="flex items-center space-x-2 mt-1">
                                  <input type="text" id="event_card1_image_url" className="w-full p-2 border rounded-lg" placeholder="https://..." />
                              </div>
                              <img id="event_card1_preview" src="" className="mt-2 h-24 rounded-lg shadow-sm object-cover" alt="Kart 1 Önizleme" />
                          </div>
                          <div>
                              <h4 className="font-semibold text-gray-600 mb-2">Kart 2 (Alışveriş)</h4>
                              <label htmlFor="event_card2_title" className="block text-sm font-medium text-gray-700">Başlık</label>
                              <input type="text" id="event_card2_title" className="mt-1 w-full p-2 border rounded-lg" />
                              <label htmlFor="event_card2_body" className="block text-sm font-medium text-gray-700 mt-2">Açıklama</label>
                              <textarea id="event_card2_body" rows={3} className="mt-1 w-full p-2 border rounded-lg"></textarea>
                              <label htmlFor="event_card2_image_url" className="block text-sm font-medium text-gray-700 mt-2">Görsel URL'i</label>
                              <div className="flex items-center space-x-2 mt-1">
                                  <input type="text" id="event_card2_image_url" className="w-full p-2 border rounded-lg" placeholder="https://..." />
                              </div>
                              <img id="event_card2_preview" src="" className="mt-2 h-24 rounded-lg shadow-sm object-cover" alt="Kart 2 Önizleme" />
                          </div>
                          <div>
                              <h4 className="font-semibold text-gray-600 mb-2">Kart 3 (VİP Aile Bölümleri)</h4>
                              <label htmlFor="event_card3_title" className="block text-sm font-medium text-gray-700">Başlık</label>
                              <input type="text" id="event_card3_title" className="mt-1 w-full p-2 border rounded-lg" />
                              <label htmlFor="event_card3_body" className="block text-sm font-medium text-gray-700 mt-2">Açıklama</label>
                              <textarea id="event_card3_body" rows={3} className="mt-1 w-full p-2 border rounded-lg"></textarea>
                              <label htmlFor="event_card3_image_url" className="block text-sm font-medium text-gray-700 mt-2">Görsel URL'i</label>
                              <div className="flex items-center space-x-2 mt-1">
                                  <input type="text" id="event_card3_image_url" className="w-full p-2 border rounded-lg" placeholder="https://..."/>
                              </div>
                              <img id="event_card3_preview" src="" className="mt-2 h-24 rounded-lg shadow-sm object-cover" alt="Kart 3 Önizleme" />
                          </div>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-700 mt-4 border-t pt-4">Geri Sayım Sayacı</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                          <div>
                              <label htmlFor="countdown_target" className="block text-sm font-medium text-gray-700">Hedef Tarih ve Saat</label>
                              <input type="datetime-local" id="countdown_target" className="mt-1 w-full p-2 border rounded-lg" defaultValue="2024-11-26T11:00" />
                          </div>
                          <div>
                              <label htmlFor="countdown_enabled" className="flex items-center cursor-pointer">
                                  <div className="relative">
                                      <input type="checkbox" id="countdown_enabled" className="sr-only" />
                                      <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                                      <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
                                  </div>
                                  <div className="ml-3 text-gray-700 font-medium">
                                      Sayacı Ana Sayfada Göster
                                  </div>
                              </label>
                              <style>{`
                                  #countdown_enabled:checked ~ .dot {
                                      transform: translateX(100%);
                                      background-color: #b98d4a;
                                  }
                                  #countdown_enabled:checked ~ .block {
                                      background-color: #1e202a;
                                  }
                              `}</style>
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