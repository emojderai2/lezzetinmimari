import React, { useState, useEffect, useCallback } from 'react';
import type { Table } from '../types';
import { fetchTables, addTable, deleteTable } from '../services/supabaseService';

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
// Table Management Component
// ===================================================================================
const AdminTableManagement: React.FC = () => {
    const [tables, setTables] = useState<Table[]>([]);
    const [newTableNumber, setNewTableNumber] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const loadTables = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchTables();
            setTables(data);
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTables();
    }, [loadTables]);

    const handleAddTable = async (e: React.FormEvent) => {
        e.preventDefault();
        const tableNum = parseInt(newTableNumber, 10);
        if (isNaN(tableNum) || tableNum <= 0) {
            showToast('Lütfen geçerli bir masa numarası girin.', 'error');
            return;
        }
        try {
            await addTable(tableNum);
            showToast(`Masa ${tableNum} eklendi.`, 'success');
            setNewTableNumber('');
            loadTables(); // Refresh list
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleDeleteTable = async (tableId: number, tableNumber: number) => {
        if (window.confirm(`Masa ${tableNumber}'ı silmek istediğinizden emin misiniz?`)) {
            try {
                await deleteTable(tableId);
                showToast(`Masa ${tableNumber} silindi.`, 'success');
                loadTables(); // Refresh list
            } catch (error: any) {
                showToast(error.message, 'error');
            }
        }
    };

    return (
        <div className="fade-in bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold text-brand-dark mb-5 border-b pb-3 flex items-center"><i className="fas fa-chair mr-3"></i>Masa Yönetimi</h2>
            <form onSubmit={handleAddTable} className="flex items-center space-x-2 mb-6">
                <input
                    type="number"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder="Yeni Masa Numarası"
                    required
                    className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                />
                <button type="submit" className="bg-brand-gold text-white py-2 px-4 rounded-lg font-semibold hover:bg-opacity-90 transition duration-300 whitespace-nowrap">
                    <i className="fas fa-plus"></i> Masa Ekle
                </button>
            </form>
            {isLoading ? (
                 <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>
            ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                    {tables.length === 0 ? (
                        <p className="col-span-full text-center text-gray-500">Henüz masa eklenmemiş.</p>
                    ) : (
                        tables.map(table => (
                            <div key={table.id} data-table-id={table.id} className="relative bg-gray-50 p-2 rounded-lg border border-gray-200 text-center">
                                <span className="font-bold text-2xl text-brand-dark">{table.table_number}</span>
                                <button
                                    onClick={() => handleDeleteTable(table.id, table.table_number)}
                                    className="absolute top-1 right-1 text-red-500 hover:text-red-800 js-table-delete p-1"
                                    title="Masayı Sil"
                                >
                                    <i className="fas fa-times-circle fa-sm"></i>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminTableManagement;
