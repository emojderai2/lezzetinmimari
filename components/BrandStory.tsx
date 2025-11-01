
import React from 'react';
import type { SiteConfig } from '../types';

interface BrandStoryProps {
  config: SiteConfig | null;
}

const BrandStory: React.FC<BrandStoryProps> = ({ config }) => {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <i className="fas fa-drafting-compass text-[#b98d4a] text-5xl mb-4" data-aos="fade-up"></i>
        <h2 className="text-3xl md:text-4xl font-bold text-[#1e202a] mb-4" data-aos="fade-up" data-aos-delay="100">
          {config?.brand_story_title || 'Yükleniyor...'}
        </h2>
        <p className="text-lg text-gray-700" data-aos="fade-up" data-aos-delay="200">
          {config?.brand_story_body || '...'}
        </p>
      </div>
    </section>
  );
};

export default BrandStory;
