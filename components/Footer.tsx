import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-12 bg-white text-center">
      <div className="container mx-auto px-4">
        <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Lezzetin Mimarı Logo" className="h-12 mx-auto mb-4" />
        <p className="text-gray-600">
          Helali, Lezzeti ve Kaliteyi arayanların buluşma noktası.
        </p>
        <p className="text-sm text-gray-500 mt-4">
          © 2025 Lezzetin Mimarı. Tüm hakları saklıdır.
        </p>
        <div className="mt-6">
          <button 
            onClick={() => { window.location.hash = 'employee'; }}
            className="inline-block bg-gray-200 text-gray-800 font-semibold py-2 px-5 rounded-lg shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b98d4a] transition-all duration-300"
          >
            Çalışan Arayüzü
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;