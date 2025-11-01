
export interface SiteConfig {
  id: number;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  brand_story_title: string;
  brand_story_body: string;
  value1_title: string;
  value1_body: string;
  value2_title: string;
  value2_body: string;
  value3_title: string;
  value3_body: string;
  event_card1_title: string;
  event_card1_body: string;
  event_card1_image_url: string;
  event_card2_title: string;
  event_card2_body: string;
  event_card2_image_url: string;
}

export interface MenuCategory {
  id: number;
  name: string;
  position: number;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  price: number | null;
  image_url: string | null;
  position: number;
}

export interface MenuCategoryWithItems extends MenuCategory {
  menu_items: MenuItem[];
}
