
import React from 'react';
import type { SiteConfig } from '../types';

interface EventContentProps {
  config: SiteConfig | null;
  onScroll: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

const EventContent: React.FC<EventContentProps> = ({ config, onScroll }) => {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1e202a] mb-4" data-aos="fade-up">Etkinlikte Sizi Neler Bekliyor?</h2>
          <p className="text-lg text-gray-700" data-aos="fade-up" data-aos-delay="100">
            "Lezzetin Mimarı" sadece bir yemek alanı değil, aynı zamanda bir kültür ve alışveriş merkezidir.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Kart 1: Lezzet */}
          <div className="bg-[#f8f6f2] rounded-2xl shadow-lg overflow-hidden" data-aos="fade-up" data-aos-delay="200">
            <img src={config?.event_card1_image_url || "https://placehold.co/600x400/78350f/ffffff?text=Yükleniyor..."} alt="Lezzet Şöleni" className="w-full h-64 object-cover" />
            <div className="p-8">
              <h3 className="text-2xl font-bold text-[#1e202a] mb-3">{config?.event_card1_title || 'Yükleniyor...'}</h3>
              <p className="text-gray-700 mb-5">{config?.event_card1_body || '...'}</p>
              <a href="#menu" onClick={onScroll} className="font-semibold text-[#b98d4a] hover:text-[#1e202a] transition duration-300">
                Menüyü İncele <i className="fas fa-arrow-right ml-1"></i>
              </a>
            </div>
          </div>
          {/* Kart 2: Alışveriş */}
          <div className="bg-[#f8f6f2] rounded-2xl shadow-lg overflow-hidden" data-aos="fade-up" data-aos-delay="300">
            <img src={config?.event_card2_image_url || "https://placehold.co/600x400/166534/ffffff?text=Yükleniyor..."} alt="Alışveriş Alanı" className="w-full h-64 object-cover" />
            <div className="p-8">
              <h3 className="text-2xl font-bold text-[#1e202a] mb-3">{config?.event_card2_title || 'Yükleniyor...'}</h3>
              <p className="text-gray-700">{config?.event_card2_body || '...'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventContent;
