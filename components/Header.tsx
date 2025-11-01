
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex-shrink-0">
          <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Lezzetin Mimarı Logo" className="h-10 md:h-12" />
        </div>
        <div className="text-right">
          <a href="#" className="text-sm md:text-base text-gray-600 font-medium hover:text-[#b98d4a] transition duration-300">
            Çok Yakında Hizmetinizde...
          </a>
        </div>
      </nav>
    </header>
  );
};

export default Header;
