

import React, { useEffect, useState } from 'react';
import type { SiteConfig } from '../types';
import { fetchSiteConfig, updateSiteConfig } from '../services/supabaseService';

// Helper function for Toast notifications
const showToast = (message: string, type = 'success') => {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = toast.className.replace('show', '');
    }, 3000);
};

// ===================================================================================
// Site Settings Component
// ===================================================================================
const AdminSiteSettings: React.FC = () => {
    const [config, setConfig] = useState<Partial<SiteConfig>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            setIsLoading(true);
            try {
                const data = await fetchSiteConfig();
                if (data) setConfig(data);
            } catch (error: any) {
                showToast(error.message, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        loadConfig();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        const isChecked = (e.target as HTMLInputElement).checked;
        setConfig(prev => ({ ...prev, [id]: type === 'checkbox' ? isChecked : value }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        // Convert local datetime-local string to ISO string for Supabase
        const isoString = value ? new Date(value).toISOString() : null;
        setConfig(prev => ({ ...prev, [id]: isoString }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateSiteConfig(config);
            showToast('Site ayarları kaydedildi!', 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    // Helper to format date for datetime-local input
    const formatDateTimeLocal = (isoString?: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
    };

    if (isLoading) return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>;

    const configFields = [
        { id: 'hero_title', label: 'Ana Başlık', type: 'text' },
        { id: 'hero_subtitle', label: 'Alt Başlık', type: 'text' },
        { id: 'hero_image_url', label: "Ana Görsel URL'i", type: 'text', preview: true },
        { id: 'brand_story_title', label: 'Hikaye Başlığı', type: 'text' },
        { id: 'brand_story_body', label: 'Hikaye İçeriği', type: 'textarea' },
        { id: 'value1_title', label: 'Değer 1 Başlık', type: 'text' },
        { id: 'value1_body', label: 'Değer 1 Açıklama', type: 'textarea' },
        { id: 'value2_title', label: 'Değer 2 Başlık', type: 'text' },
        { id: 'value2_body', label: 'Değer 2 Açıklama', type: 'textarea' },
        { id: 'value3_title', label: 'Değer 3 Başlık', type: 'text' },
        { id: 'value3_body', label: 'Değer 3 Açıklama', type: 'textarea' },
        { id: 'event_card1_title', label: 'Kart 1 Başlık', type: 'text' },
        { id: 'event_card1_body', label: 'Kart 1 Açıklama', type: 'textarea' },
        { id: 'event_card1_image_url', label: "Kart 1 Görsel URL'i", type: 'text', preview: true },
        { id: 'event_card2_title', label: 'Kart 2 Başlık', type: 'text' },
        { id: 'event_card2_body', label: 'Kart 2 Açıklama', type: 'textarea' },
        { id: 'event_card2_image_url', label: "Kart 2 Görsel URL'i", type: 'text', preview: true },
        { id: 'event_card3_title', label: 'Kart 3 Başlık', type: 'text' },
        { id: 'event_card3_body', label: 'Kart 3 Açıklama', type: 'textarea' },
        { id: 'event_card3_image_url', label: "Kart 3 Görsel URL'i", type: 'text', preview: true },
    ];

    return (
        <div className="fade-in bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-brand-dark mb-5 border-b pb-3 flex items-center"><i className="fas fa-cog mr-3"></i>Genel Site Ayarları</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dynamic fields */}
                {configFields.map(({ id, label, type, preview }) => (
                    <div key={id}>
                        <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
                        {type === 'textarea' ? (
                            <textarea id={id} rows={3} value={(config as any)[id] || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" />
                        ) : (
                            <input type={type} id={id} value={(config as any)[id] || ''} onChange={handleChange} className="mt-1 w-full p-2 border rounded-lg" />
                        )}
                        {preview && (config as any)[id] && (
                             <img src={(config as any)[id]} className="mt-2 h-32 rounded-lg shadow-sm object-cover" alt={`${label} Önizleme`} />
                        )}
                    </div>
                ))}
                
                {/* Countdown */}
                <div className="border-t pt-6">
                     <h3 className="text-lg font-semibold text-gray-700">Geri Sayım Sayacı</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center mt-2">
                        <div>
                            <label htmlFor="countdown_target" className="block text-sm font-medium text-gray-700">Hedef Tarih ve Saat</label>
                            <input type="datetime-local" id="countdown_target" value={formatDateTimeLocal(config.countdown_target)} onChange={handleDateChange} className="mt-1 w-full p-2 border rounded-lg" />
                        </div>
                        <div>
                            <label htmlFor="countdown_enabled" className="flex items-center cursor-pointer">
                                <div className="relative">
                                     <input type="checkbox" id="countdown_enabled" checked={config.countdown_enabled || false} onChange={handleChange} className="sr-only toggle-checkbox" />
                                     <div className="block bg-gray-600 w-10 h-6 rounded-full"></div>
                                     <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition"></div>
                                </div>
                                <div className="ml-3 text-gray-700 font-medium">Sayacı Ana Sayfada Göster</div>
                            </label>
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={isSaving} className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition duration-300 disabled:bg-gray-400">
                    <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i> {isSaving ? 'Kaydediliyor...' : 'Genel Ayarları Kaydet'}
                </button>
            </form>
        </div>
    );
};

export default AdminSiteSettings;