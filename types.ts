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
  event_card3_title: string;
  event_card3_body: string;
  event_card3_image_url: string;
  countdown_enabled: boolean;
  countdown_target: string;
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
  description: string | null;
  price: number | null;
  image_url: string | null;
  position: number;
}

export interface MenuCategoryWithItems extends MenuCategory {
  menu_items: MenuItem[];
}

// Order Management System Types
export interface Table {
  id: number;
  table_number: number;
}

export interface Visit {
  id: string; // UUID
  table_id: number;
  status: 'active' | 'closed';
  created_at: string;
  closed_at?: string;
}

export interface Order {
  id: string; // UUID
  visit_id: string; // UUID
  waiter_id?: string; // UUID
  status: 'new' | 'preparing' | 'ready' | 'delivered';
  created_at: string;
  notes?: string | null;
}

export interface OrderItem {
  id: number;
  order_id: string; // UUID
  menu_item_id: number;
  quantity: number;
  price: number;
  status: 'pending' | 'prepared';
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface OrderWithDetails extends Order {
  visits: {
    tables: {
      table_number: number;
    } | null;
  } | null;
  order_items: (OrderItem & {
    menu_items: { name: string } | null;
  })[];
}

export interface VisitWithDetails extends Visit {
  tables: {
    table_number: number;
  } | null;
  orders: (Order & {
    order_items: (OrderItem & {
        menu_items: { name: string } | null;
    })[];
  })[];
}

export interface TableWithStatus {
    id: number; // table id
    table_number: number;
    visit_id: string | null;
    visit_status: 'active' | null;
    has_ready_orders: boolean;
}

// Admin Dashboard Types
export interface DashboardStats {
  total_revenue: number;
  total_visits: number;
  popular_items: {
    name: string;
    total_quantity: number;
  }[];
}

export interface RolePins {
    role: string;
    pin: string;
}

export interface SalesReportData {
    totalRevenue: number;
    totalVisits: number;
    averageVisitValue: number;
    categoryBreakdown: {
        name: string;
        revenue: number;
        percentage: number;
    }[];
    productBreakdown: {
        name: string;
        revenue: number;
    }[];
    popularItems: {
        name: string;
        quantity: number;
        revenue: number;
        percentage: number;
    }[];
}