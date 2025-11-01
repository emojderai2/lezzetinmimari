
import React from 'react';
import type { SiteConfig } from '../types';

interface HeroProps {
  config: SiteConfig | null;
  onScroll: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const Hero: React.FC<HeroProps> = ({ config, onScroll }) => {
  return (
    <section className="relative bg-[#1e202a] text-white min-h-[60vh] md:min-h-[70vh] flex items-center">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-full md:w-3/4 lg:w-2/3 hero-clip">
          <img 
            src={config?.hero_image_url || "https://placehold.co/1200x800/b98d4a/ffffff?text=Yükleniyor..."} 
            alt="Lezzetin Sunumu" 
            className="w-full h-full object-cover opacity-30 md:opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1e202a] via-[#1e202a]/50 to-transparent md:via-transparent"></div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="w-full md:w-1/2 lg:w-2/5 py-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4" data-aos="fade-up">
            {config?.hero_title || 'Yükleniyor...'}
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-8" data-aos="fade-up" data-aos-delay="100">
            {config?.hero_subtitle || '...'}
          </p>
          <div className="space-x-4" data-aos="fade-up" data-aos-delay="200">
            <a href="#menu" onClick={onScroll} className="bg-[#b98d4a] text-white py-3 px-6 rounded-lg font-semibold text-lg hover:bg-opacity-90 transition duration-300">
              Menüyü Gör
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
