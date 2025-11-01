
import React from 'react';
import type { SiteConfig } from '../types';

interface ValuesProps {
  config: SiteConfig | null;
}

const Values: React.FC<ValuesProps> = ({ config }) => {
  return (
    <section className="py-16 md:py-24 bg-[#f8f6f2]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Değer 1 */}
          <div className="text-center" data-aos="fade-up">
            <div className="w-16 h-16 bg-[#b98d4a] text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check-circle text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-[#1e202a] mb-2">{config?.value1_title || 'Yükleniyor...'}</h3>
            <p className="text-gray-600">{config?.value1_body || '...'}</p>
          </div>
          {/* Değer 2 */}
          <div className="text-center" data-aos="fade-up" data-aos-delay="150">
            <div className="w-16 h-16 bg-[#b98d4a] text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-star text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-[#1e202a] mb-2">{config?.value2_title || 'Yükleniyor...'}</h3>
            <p className="text-gray-600">{config?.value2_body || '...'}</p>
          </div>
          {/* Değer 3 */}
          <div className="text-center" data-aos="fade-up" data-aos-delay="300">
            <div className="w-16 h-16 bg-[#b98d4a] text-white rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-medal text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-[#1e202a] mb-2">{config?.value3_title || 'Yükleniyor...'}</h3>
            <p className="text-gray-600">{config?.value3_body || '...'}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Values;
