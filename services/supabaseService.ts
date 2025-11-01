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

import { createClient } from '@supabase/supabase-js';
import type { SiteConfig, MenuCategoryWithItems } from '../types';

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