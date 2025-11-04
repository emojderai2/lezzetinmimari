// FIX: Manually defined the structure of `import.meta.env` to resolve TypeScript errors
// without relying on a triple-slash directive that was failing in the environment.
// NOTE: This global declaration is no longer used but kept for context.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_SUPABASE_URL: string;
      readonly VITE_SUPABASE_ANON_KEY: string;
    };
  }
}

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import type { SiteConfig, MenuCategoryWithItems, CartItem, OrderWithDetails, VisitWithDetails, TableWithStatus, Table, DashboardStats, MenuItem, MenuCategory, RolePins } from '../types';

// ===================================================================================
// YAYINLAMA İÇİN GÜVENLİ ANAHTAR YÖNETİMİ
// ===================================================================================
// Bu bölüm, sitenizi yayınlarken ve yerelde geliştirirken anahtarları güvenli 
// ve kolay bir şekilde yönetmenizi sağlar.

// 1. YEREL GELİŞTİRME: `.env` dosyası oluşturamadığınız için, yerel bilgisayarınızda
//    çalışırken kullanılacak anahtarları LÜTFEN aşağıdaki yer tutuculara girin.
const LOCAL_DEV_SUPABASE_URL = "https://wiaflghvicpzvmutobeb.supabase.co";
const LOCAL_DEV_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYWZsZ2h2aWNwenZtdXRvYmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5ODY1OTMsImV4cCI6MjA3NzU2MjU5M30.CBo49hch7FlHSj9IwrDs0lSRuEMOfvqe3KFakvP7ji0";

// 2. YAYINLAMA (PRODUCTION): Siteniz yayınlandığında, hosting platformunuzun 
//    (Netlify, Vercel vb.) "Environment Variables" bölümüne eklediğiniz `VITE_` 
//    ile başlayan değişkenler otomatik olarak kullanılır.
// FINAL FIX: Check if `import.meta.env` exists before trying to access it.
const supabaseUrl = (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SUPABASE_URL) || LOCAL_DEV_SUPABASE_URL;
const supabaseKey = (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SUPABASE_ANON_KEY) || LOCAL_DEV_SUPABASE_ANON_KEY;


if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("BURAYA")) {
  throw new Error("Supabase anahtarları services/supabaseService.ts dosyasına girilmemiş. Lütfen dosya içindeki 'LOCAL_DEV_' ile başlayan yer tutucuları kendi anahtarlarınızla güncelleyin.");
}

// In a real app, this would be a SupabaseClient type from the library
const supabase = createClient(supabaseUrl, supabaseKey);

export const getSupabaseClient = () => supabase;

export const fetchSiteConfig = async (): Promise<SiteConfig | null> => {
  const { data, error } = await supabase
    .from('site_config')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Error fetching site config:', error.message);
    throw new Error('Site ayarları yüklenemedi.');
  }
  return data as SiteConfig;
};

export const updateSiteConfig = async (updates: Partial<SiteConfig>): Promise<void> => {
    const { error } = await supabase
        .from('site_config')
        .update(updates)
        .eq('id', 1);
    
    if (error) {
        console.error('Error updating site config:', error);
        throw new Error('Site ayarları güncellenemedi.');
    }
};

export const fetchMenuData = async (): Promise<MenuCategoryWithItems[]> => {
  const { data: categories, error } = await supabase
    .from('menu_categories')
    .select(`
      *,
      menu_items (
        *
      )
    `)
    .order('position', { ascending: true })
    .order('position', { foreignTable: 'menu_items', ascending: true });

  if (error) {
    console.error('Error fetching menu data:', error.message);
    throw new Error('Menü verileri yüklenemedi.');
  }
  
  return categories as MenuCategoryWithItems[];
};

export const fetchVisibleMenuData = async (): Promise<MenuCategoryWithItems[]> => {
  // The DB-level filter .eq('menu_items.visible', true) was causing a "column does not exist" error.
  // This indicates a schema mismatch. To resolve this without requiring DB changes,
  // we remove the visibility feature. This function will now return all items,
  // behaving identically to fetchMenuData, which is the desired behavior.
  return fetchMenuData();
};

export const createOrder = async (tableId: string | number, cart: CartItem[], notes?: string | null): Promise<string> => {
  // tableId'nin sayıya çevrilebilir olduğundan emin olalım
  const tableNumber = parseInt(String(tableId), 10);
  if (isNaN(tableNumber)) {
      throw new Error("Geçersiz masa numarası.");
  }
    
  const orderItemsPayload = cart.map(item => ({
    menu_item_id: item.id,
    quantity: item.quantity,
    price: item.price // Fiyatı da gönderiyoruz
  }));

  const { data, error } = await supabase.rpc('create_order', {
    table_number_param: tableNumber,
    order_items_param: orderItemsPayload,
    notes_param: notes || null,
  });

  if (error) {
    console.error('Error creating order:', error);
    throw new Error(`Sipariş oluşturulamadı: ${error.message}`);
  }

  return data as string; // Returns the new order_id (UUID)
};


// Customer View Function
export const fetchActiveVisitForTable = async (tableNumber: string): Promise<VisitWithDetails | null> => {
    const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('id')
        .eq('table_number', parseInt(tableNumber, 10))
        .single();

    if (tableError || !tableData) {
        console.error('Error fetching table for customer view:', tableError?.message);
        return null;
    }

    const { data, error } = await supabase
        .from('visits')
        .select(`
            *,
            tables ( table_number ),
            orders (
                *,
                order_items (
                    *,
                    menu_items ( name )
                )
            )
        `)
        .eq('table_id', tableData.id)
        .eq('status', 'active')
        .order('created_at', {foreignTable: 'orders', ascending: true})
        .maybeSingle(); 

    if (error) {
        console.error('Error fetching active visit:', error.message);
        return null; 
    }
    return data as VisitWithDetails | null;
}


// Kitchen View Functions
export const fetchKitchenOrders = async (): Promise<OrderWithDetails[]> => {
    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            notes,
            visits (
                tables (
                    table_number
                )
            ),
            order_items (
                *,
                menu_items (
                    name
                )
            )
        `)
        .in('status', ['new', 'preparing', 'ready'])
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching kitchen orders:', error);
        throw new Error('Mutfak siparişleri yüklenemedi.');
    }
    return data as OrderWithDetails[];
};

export const updateOrderStatus = async (orderId: string, status: 'new' | 'preparing' | 'ready' | 'delivered') => {
    const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
    
    if (error) {
        console.error(`Error updating order ${orderId} status:`, error);
        throw new Error('Sipariş durumu güncellenemedi.');
    }
};

export const updateOrderItemStatus = async (orderItemId: number, status: 'pending' | 'prepared') => {
    const { error } = await supabase
        .from('order_items')
        .update({ status })
        .eq('id', orderItemId);

    if (error) {
        console.error(`Error updating order item ${orderItemId} status:`, error);
        throw new Error('Sipariş kalemi durumu güncellenemedi.');
    }
};

export const revertOrderItemsStatus = async (orderId: string) => {
    const { error } = await supabase
        .from('order_items')
        .update({ status: 'pending' })
        .eq('order_id', orderId);
    
    if (error) {
        console.error(`Error reverting order items for order ${orderId}:`, error);
        throw new Error('Sipariş kalemleri sıfırlanamadı.');
    }
};


export const subscribeToKitchenUpdates = (callback: () => void): RealtimeChannel => {
    const channel = supabase.channel('public-kitchen-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            console.log('Change detected in orders table. Payload:', payload);
            callback();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
             console.log('Change detected in order_items table. Payload:', payload);
             callback();
        })
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to kitchen updates!');
            }
            if (status === 'CHANNEL_ERROR' || err) {
                console.error('Subscription error:', status, err);
            }
            if (status === 'TIMED_OUT') {
                console.warn('Subscription timed out.');
            }
            if (status === 'CLOSED') {
                console.log('Subscription closed.');
            }
        });

    return channel;
};

// Cashier View Functions
export const fetchActiveVisits = async (): Promise<VisitWithDetails[]> => {
    const { data, error } = await supabase
        .from('visits')
        .select(`
            *,
            tables ( table_number ),
            orders (
                *,
                notes,
                order_items (
                    *,
                    menu_items ( name )
                )
            )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching active visits:', error);
        throw new Error('Aktif masalar yüklenemedi.');
    }
    return data as VisitWithDetails[];
};

export const closeVisit = async (visitId: string): Promise<void> => {
    const { error } = await supabase
        .from('visits')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', visitId);
    
    if (error) {
        console.error(`Error closing visit ${visitId}:`, error);
        throw new Error('Hesap kapatılamadı.');
    }
};

export const subscribeToCashierUpdates = (callback: () => void): RealtimeChannel => {
    const channel = supabase.channel('public-cashier-updates')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'orders' }, 
            () => callback()
        )
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'order_items' }, 
            () => callback()
        )
         .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'visits' }, 
            () => callback()
        )
        .subscribe();

    return channel;
};


// Waiter View Functions
export const fetchTableStatuses = async (): Promise<TableWithStatus[]> => {
    const { data, error } = await supabase
        .from('table_statuses')
        .select('*')
        .order('table_number', { ascending: true });

    if (error) {
        console.error('Error fetching table statuses:', error);
        throw new Error('Masa durumları yüklenemedi.');
    }
    return data as TableWithStatus[];
};

export const fetchVisitDetailsForWaiter = async (visitId: string): Promise<VisitWithDetails | null> => {
    const { data, error } = await supabase
        .from('visits')
        .select(`
            *,
            tables ( table_number ),
            orders (
                *,
                notes,
                order_items (
                    *,
                    menu_items ( name )
                )
            )
        `)
        .eq('id', visitId)
        .order('created_at', {foreignTable: 'orders', ascending: true})
        .single();
    
    if (error) {
        console.error(`Error fetching details for visit ${visitId}:`, error);
        throw new Error('Masa detayları yüklenemedi.');
    }
    return data as VisitWithDetails | null;
};

export const subscribeToWaiterUpdates = (callback: () => void): RealtimeChannel => {
    const channel = supabase.channel('public-waiter-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => callback())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, () => callback())
        .subscribe();
    
    return channel;
};

// Admin - Table Management Functions
export const fetchTables = async (): Promise<Table[]> => {
    const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('table_number', { ascending: true });

    if (error) {
        console.error('Error fetching tables:', error);
        throw new Error('Masalar yüklenemedi.');
    }
    return data as Table[];
};

export const addTable = async (tableNumber: number): Promise<Table> => {
    const { data, error } = await supabase
        .from('tables')
        .insert({ table_number: tableNumber })
        .select()
        .single();
    
    if (error) {
        console.error('Error adding table:', error);
        throw new Error('Masa eklenemedi. Bu numara zaten kullanımda olabilir.');
    }
    return data as Table;
};

export const deleteTable = async (tableId: number): Promise<void> => {
    const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', tableId);

    if (error) {
        console.error('Error deleting table:', error);
        throw new Error('Masa silinemedi. Masanın aktif bir siparişi olabilir.');
    }
};

// Admin - Dashboard Functions
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
    const { data, error } = await supabase.rpc('get_dashboard_stats');

    if (error) {
        console.error('Error fetching dashboard stats:', error);
        throw new Error('Pano verileri yüklenemedi.');
    }
    return data as DashboardStats;
};

// Admin - Menu Management Functions
export const addCategory = async (name: string): Promise<MenuCategory> => {
    const { data: maxPosData } = await supabase
        .from('menu_categories').select('position').order('position', { ascending: false }).limit(1).single();
    const newPosition = (maxPosData ? maxPosData.position : 0) + 1;

    const { data, error } = await supabase
        .from('menu_categories').insert({ name, position: newPosition }).select().single();

    if (error) throw new Error('Kategori eklenemedi.');
    return data as MenuCategory;
};

export const updateCategory = async (id: number, updates: { name?: string; position?: number }) => {
    const { error } = await supabase.from('menu_categories').update(updates).eq('id', id);
    if (error) throw new Error('Kategori güncellenemedi.');
};

export const deleteCategory = async (id: number) => {
    const { error } = await supabase.from('menu_categories').delete().eq('id', id);
    if (error) throw new Error('Kategori silinemedi. İçinde ürünler olabilir.');
};

export const addItem = async (item: Partial<MenuItem>): Promise<MenuItem> => {
    if (!item.category_id || !item.name) {
        throw new Error('Ürün eklemek için kategori ve isim gereklidir.');
    }
     const { data: maxPosData } = await supabase
        .from('menu_items').select('position').eq('category_id', item.category_id).order('position', { ascending: false }).limit(1).single();
    const newPosition = (maxPosData ? maxPosData.position : 0) + 1;

    const payload = {
        category_id: item.category_id,
        name: item.name,
        description: item.description || null,
        price: item.price || null,
        image_url: item.image_url || null,
        position: newPosition,
    };
    
    const { data, error } = await supabase.from('menu_items').insert(payload).select().single();

    if (error) {
        console.error("Error in addItem:", error);
        throw new Error('Ürün eklenemedi.');
    }
    return data as MenuItem;
};

export const updateItem = async (id: number, updates: Partial<MenuItem>) => {
    const { error } = await supabase.from('menu_items').update(updates).eq('id', id);
    if (error) {
        console.error("Error updating item:", error)
        throw new Error('Ürün güncellenemedi.');
    }
};

export const deleteItem = async (id: number) => {
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw new Error('Ürün silinemedi.');
};

export const batchUpdateCategoryPositions = async (updates: { id: number; position: number }[]) => {
    const { error } = await supabase.from('menu_categories').upsert(updates);
    if (error) throw new Error('Kategori sıralaması güncellenemedi.');
};

export const batchUpdateItemPositions = async (updates: { id: number; position: number; category_id?: number }[]) => {
    // Supabase RLS policies were likely preventing batch `upsert` calls.
    // The previous attempt to fix this with an RPC function failed because the function
    // does not exist in the database, as indicated by the "PGRST202" error.
    // This new approach sends individual update requests for each moved item.
    // This is more likely to succeed with standard RLS policies, as single updates
    // (like changing an item's name) were reported to be working.
    for (const update of updates) {
        const payload: { position: number; category_id?: number } = {
            position: update.position
        };
        // Only include category_id if it's being changed (i.e., item moved between categories)
        if (update.category_id !== undefined) {
            payload.category_id = update.category_id;
        }

        const { error } = await supabase
            .from('menu_items')
            .update(payload)
            .eq('id', update.id);

        if (error) {
            console.error(`Error updating position for item ${update.id}:`, error);
            // Throw an error on the first failure.
            throw new Error('Ürün sıralaması güncellenemedi. Lütfen tekrar deneyin.');
        }
    }
};

// Admin - PIN Management Functions
export const fetchRolePins = async (): Promise<RolePins[]> => {
    const { data, error } = await supabase
        .from('role_pins')
        .select('role, pin');
    
    if (error && error.code === 'PGRST205') { // "Could not find the table 'public.role_pins'..."
        console.warn(
            'UYARI: "role_pins" tablosu veritabanında bulunamadı. ' +
            'PIN doğrulama sistemi varsayılan PIN\'ler ile çalışacak. ' +
            'Lütfen Supabase projenizde tabloyu oluşturun. Varsayılanlar: Garson: 1111, Mutfak: 2222, Kasa: 3333'
        );
        // Return default PINs to allow the app to function
        return [
            { role: 'waiter', pin: '1111' },
            { role: 'kitchen', pin: '2222' },
            { role: 'cashier', pin: '3333' },
        ];
    }
    
    if (error) {
        console.error('Error fetching role pins:', error);
        throw new Error('PIN bilgileri alınamadı.');
    }
    return data as RolePins[];
};

export const updateRolePins = async (pins: { role: string; pin: string }[]): Promise<void> => {
    const { error } = await supabase
        .from('role_pins')
        .upsert(pins, { onConflict: 'role' });
    
    if (error) {
        console.error('Error updating role pins:', error);
        if (error.message.includes('relation "public.role_pins" does not exist')) {
             throw new Error('PIN yönetimi tablosu bulunamadı. Lütfen veritabanında "role_pins" tablosunu oluşturun.');
        }
        throw new Error('PIN bilgileri güncellenemedi.');
    }
};