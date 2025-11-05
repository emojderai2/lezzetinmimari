import React, { useState, useEffect } from 'react';
import type { RolePins } from '../types';
import { fetchRolePins, updateRolePins } from '../services/supabaseService';


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
// PIN Management Component
// ===================================================================================
const AdminPinManagement: React.FC = () => {
    const [pins, setPins] = useState<{ [key: string]: string }>({ waiter: '', kitchen: '', cashier: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const roles = [
        { key: 'waiter', name: 'Garson' },
        { key: 'kitchen', name: 'Mutfak' },
        { key: 'cashier', name: 'Kasa' },
    ];

    useEffect(() => {
        const loadPins = async () => {
            setIsLoading(true);
            try {
                const data = await fetchRolePins();
                const pinsMap = data.reduce((acc, item) => {
                    acc[item.role] = item.pin;
                    return acc;
                }, {} as { [key: string]: string });
                setPins(prev => ({ ...prev, ...pinsMap }));
            } catch (error: any) {
                showToast(error.message, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        loadPins();
    }, []);

    const handleChange = (role: string, value: string) => {
        // Only allow 4 digits
        if (/^\d{0,4}$/.test(value)) {
            setPins(prev => ({ ...prev, [role]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const pinPayload = Object.entries(pins).map(([role, pin]) => ({ role, pin: String(pin) }));
            await updateRolePins(pinPayload);
            showToast('PIN kodları başarıyla güncellendi.', 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>;
    }

    return (
        <div className="fade-in bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-brand-dark mb-5 border-b pb-3 flex items-center"><i className="fas fa-key mr-3"></i>PIN Yönetimi</h2>
            <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
                {roles.map(role => (
                    <div key={role.key}>
                        <label htmlFor={`${role.key}_pin`} className="block text-lg font-medium text-gray-700">{role.name} PIN</label>
                        <input
                            type="text"
                            id={`${role.key}_pin`}
                            value={pins[role.key] || ''}
                            onChange={(e) => handleChange(role.key, e.target.value)}
                            maxLength={4}
                            placeholder="4 Haneli PIN"
                            className="mt-1 w-full p-3 border rounded-lg text-center text-2xl tracking-[.5em]"
                        />
                    </div>
                ))}

                <button type="submit" disabled={isSaving} className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition duration-300 disabled:bg-gray-400">
                    <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'} mr-2`}></i> {isSaving ? 'Kaydediliyor...' : 'PIN Kodlarını Kaydet'}
                </button>
            </form>
        </div>
    );
};

export default AdminPinManagement;
