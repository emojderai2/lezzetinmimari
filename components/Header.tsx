
import React from 'react';

const Header: React.FC = () => {
  const openingDays = [26, 27, 28, 29, 30];

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo */}
        <div className="flex-shrink-0">
          <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Lezzetin Mimarı Logo" className="h-12 md:h-14" />
        </div>
        
        {/* Opening Dates */}
        <div className="flex flex-col items-end">
          <div className="flex items-center space-x-1 md:space-x-1.5">
            {openingDays.map((day) => (
              <div 
                key={day} 
                className="bg-brand-gold text-white rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center text-[10px] md:text-xs font-bold shadow"
                aria-label={`${day} Kasım`}
              >
                {day}
              </div>
            ))}
          </div>
          <span className="text-xs md:text-sm text-gray-700 font-medium mt-1">
            Kasım’da Hizmetinizde
          </span>
        </div>
      </nav>
    </header>
  );
};

export default Header;