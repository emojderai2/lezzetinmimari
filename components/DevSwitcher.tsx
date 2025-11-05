import React, { useState } from 'react';

const DevSwitcher: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [tableId, setTableId] = useState('1');

    const navigate = (hash: string) => {
        window.location.hash = hash;
        setIsOpen(false);
    };

    const handleCustomerNav = (e: React.FormEvent) => {
        e.preventDefault();
        if (tableId.trim()) {
            navigate(`menu/${tableId.trim()}`);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 bg-brand-dark text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-[9999] hover:bg-brand-gold transition-colors"
                aria-label="Geliştirici Arayüz Değiştirici"
            >
                <i className="fas fa-cogs fa-lg"></i>
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl z-[9999] w-64 border border-gray-200">
            <div className="p-3 bg-gray-100 border-b flex justify-between items-center">
                <h3 className="font-bold text-sm text-gray-800">Hızlı Erişim</h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
            </div>
            <div className="p-2 flex flex-col items-start">
                <button onClick={() => navigate('')} className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm">Ana Sayfa</button>
                <button onClick={() => navigate('employee')} className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm">Çalışan Hub</button>
                <button onClick={() => navigate('admin')} className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm">Yönetici Paneli</button>
                <button onClick={() => navigate('waiter')} className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm">Garson Ekranı</button>
                <button onClick={() => navigate('kitchen')} className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm">Mutfak Ekranı</button>
                <button onClick={() => navigate('cashier')} className="w-full text-left p-2 rounded hover:bg-gray-100 text-sm">Kasa Ekranı</button>
                <div className="border-t w-full mt-2 pt-2">
                    <form onSubmit={handleCustomerNav} className="flex items-center space-x-2 p-1">
                        <label htmlFor="dev-table-id" className="text-sm flex-shrink-0">Müşteri:</label>
                        <input
                            id="dev-table-id"
                            type="number"
                            value={tableId}
                            onChange={(e) => setTableId(e.target.value)}
                            placeholder="Masa No"
                            className="w-full p-1 border rounded text-sm"
                            required
                        />
                        <button type="submit" className="text-sm bg-brand-gold text-white px-3 py-1 rounded hover:bg-opacity-90 whitespace-nowrap">
                           Git
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default DevSwitcher;
