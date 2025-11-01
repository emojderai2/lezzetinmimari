
import { createClient } from '@supabase/supabase-js';
import type { SiteConfig, MenuCategoryWithItems } from '../types';

const supabaseUrl = 'https://wiaflghvicpzvmutobeb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpYWZsZ2h2aWNwenZtdXRvYmViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5ODY1OTMsImV4cCI6MjA3NzU2MjU5M30.CBo49hch7FlHSj9IwrDs0lSRuEMOfvqe3KFakvP7ji0';

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
