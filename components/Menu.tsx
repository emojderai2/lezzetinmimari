import React from 'react';
import type { MenuCategoryWithItems, MenuItem } from '../types';

interface MenuProps {
  categories: MenuCategoryWithItems[];
  isLoading: boolean;
}

const MenuItemCard: React.FC<{ item: MenuItem; imageHeightClass: string }> = ({ item, imageHeightClass }) => {
  return (
    <div 
      className="bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:scale-105"
    >
      <img 
        src={item.image_url || 'https://placehold.co/300x300/eee/ccc?text=Görsel'} 
        alt={item.name} 
        className={`w-full ${imageHeightClass} object-cover bg-gray-700`} 
      />
      <div className="p-3 md:p-4">
        <h4 className="font-bold text-base md:text-lg text-white truncate">{item.name}</h4>
        {item.price != null && (
          <p className="text-sm text-gray-300 font-medium">
            {parseFloat(String(item.price)).toFixed(2)} TL
          </p>
        )}
      </div>
    </div>
  );
};

const Menu: React.FC<MenuProps> = ({ categories, isLoading }) => {
  return (
    <section id="menu" className="py-16 md:py-24 bg-[#1e202a] text-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Lezzet Menümüz
          </h2>
          <p className="text-lg text-gray-300">
            Usta mimarlarımızın elinden çıkan, helal ve kaliteli lezzet seçkimiz.
          </p>
        </div>

        <div className="space-y-16">
          {isLoading && (
            <p className="text-center text-xl text-gray-300">
              <i className="fas fa-spinner fa-spin mr-2"></i> Menü yükleniyor...
            </p>
          )}
          {!isLoading && categories.length === 0 && (
            <p className="text-center text-xl text-gray-300">Menü yakında eklenecek...</p>
          )}
          {!isLoading && categories.map((category) => {
            const categoryItems = category.menu_items;
            if (categoryItems.length === 0) return null;

            const isDrinkCategory = category.name.toLowerCase().includes('içecek');
            const itemGridClass = isDrinkCategory
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'
              : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
            const imageHeightClass = isDrinkCategory
              ? 'h-24 md:h-32'
              : 'h-32 md:h-40';

            return (
              <div key={category.id}>
                <h3 className="text-3xl font-bold text-[#b98d4a] mb-8 text-center">
                  {category.name}
                </h3>
                <div className={`grid ${itemGridClass} gap-4 md:gap-6`}>
                  {categoryItems.map((item) => (
                    <MenuItemCard 
                      key={item.id} 
                      item={item} 
                      imageHeightClass={imageHeightClass}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Menu;