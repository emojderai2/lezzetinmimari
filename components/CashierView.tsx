import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { VisitWithDetails, OrderItem } from '../types';
import { fetchActiveVisits, closeVisit, subscribeToCashierUpdates } from '../services/supabaseService';

const calculateTotal = (visit: VisitWithDetails | null): number => {
    if (!visit) return 0;
    return visit.orders.reduce((total, order) => {
        return total + order.order_items.reduce((orderTotal, item) => {
            return orderTotal + (item.price * item.quantity);
        }, 0);
    }, 0);
};

interface PrintableReceiptProps {
    visit: VisitWithDetails | null;
    total: number;
}
const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ visit, total }) => {
    if (!visit) return null;

    const allItems = visit.orders.flatMap(o => o.order_items);

    return (
        <div id="printable-receipt" className="p-4 text-xs text-black bg-white">
            <div className="text-center mb-4">
                <h1 className="text-lg font-bold">Lezzetin Mimarı</h1>
                <p>Fiş/Bilgilendirme</p>
                <p>Tarih: {new Date().toLocaleString('tr-TR')}</p>
            </div>
            <div className="mb-2">
                <p><span className="font-semibold">Masa No:</span> {visit.tables?.table_number}</p>
                <p><span className="font-semibold">Açılış:</span> {new Date(visit.created_at).toLocaleTimeString('tr-TR')}</p>
            </div>
            <hr className="my-2 border-black border-dashed" />
            <table className="w-full">
                <thead>
                    <tr>
                        <th className="text-left">Ürün</th>
                        <th className="text-center">Adet</th>
                        <th className="text-right">Tutar</th>
                    </tr>
                </thead>
                <tbody>
                    {allItems.map((item, index) => (
                        <tr key={index}>
                            <td>{item.menu_items?.name}</td>
                            <td className="text-center">{item.quantity}</td>
                            <td className="text-right">{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <hr className="my-2 border-black border-dashed" />
            <div className="text-right">
                <p className="font-bold text-sm">TOPLAM: {total.toFixed(2)} TL</p>
            </div>
            <div className="text-center mt-4">
                <p>Afiyet olsun!</p>
            </div>
        </div>
    );
};


const CashierView: React.FC = () => {
    const [visits, setVisits] = useState<VisitWithDetails[]>([]);
    const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAndSetVisits = useCallback(async () => {
        try {
            const fetchedVisits = await fetchActiveVisits();
            setVisits(fetchedVisits);
            // If there's no selected visit, or the selected one is now closed, select the first available one on desktop.
            const isDesktop = window.innerWidth >= 1024;
            if (isDesktop) {
                 const currentSelectedExists = fetchedVisits.some(v => v.id === selectedVisitId);
                 if ((!selectedVisitId || !currentSelectedExists) && fetchedVisits.length > 0) {
                     setSelectedVisitId(fetchedVisits[0].id);
                 }
            }
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Aktif masalar yüklenirken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    }, [selectedVisitId]);


    useEffect(() => {
        fetchAndSetVisits();
        const channel = subscribeToCashierUpdates(fetchAndSetVisits);
        return () => {
            channel.unsubscribe();
        };
    }, [fetchAndSetVisits]);

    const selectedVisit = useMemo(() => {
        return visits.find(v => v.id === selectedVisitId) || null;
    }, [visits, selectedVisitId]);

    const handleCloseVisit = async () => {
        if (!selectedVisitId) return;
        if (!confirm(`Masa ${selectedVisit?.tables?.table_number} hesabını kapatmak istediğinizden emin misiniz?`)) return;

        try {
            await closeVisit(selectedVisitId);
            setVisits(prev => prev.filter(v => v.id !== selectedVisitId));
            setSelectedVisitId(null);
        } catch (e: any) {
            alert(`Hesap kapatılırken hata: ${e.message}`);
        }
    };

    const handlePrint = () => {
        if (!selectedVisit) return;
        window.print();
    };

    const renderVisitList = () => (
        <div className="p-2 space-y-2 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200 lg:h-full lg:overflow-y-auto">
            {visits.length === 0 && !isLoading && <p className="text-center text-gray-500 p-4">Aktif masa bulunmuyor.</p>}
            {visits.map(visit => {
                const total = calculateTotal(visit);
                return (
                    <div
                        key={visit.id}
                        onClick={() => setSelectedVisitId(visit.id)}
                        className={`visit-card p-3 rounded-lg cursor-pointer ${selectedVisitId === visit.id ? 'selected' : 'hover:bg-gray-200'}`}
                    >
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg md:text-xl font-bold text-brand-dark">Masa {visit.tables?.table_number}</h3>
                            <span className="text-md md:text-lg font-semibold">{total.toFixed(2)} TL</span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-500">
                            Açılış: {new Date(visit.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                );
            })}
        </div>
    );
    
    const renderVisitDetails = () => {
        const total = calculateTotal(selectedVisit);

        if (!selectedVisit) {
            return (
                <div className="hidden lg:flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                         <i className="fas fa-arrow-left text-3xl mb-4"></i>
                         <p className="text-xl">Detayları görmek için yandaki listeden bir masa seçin.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="p-4 md:p-6 flex flex-col h-full bg-white">
                <div className="flex-grow">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                        <div className="mb-4 md:mb-0">
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-brand-dark">Masa {selectedVisit.tables?.table_number}</h2>
                            <p className="text-sm text-gray-500">Oturum Başlangıcı: {new Date(selectedVisit.created_at).toLocaleString('tr-TR')}</p>
                        </div>
                        <div className="text-left md:text-right w-full md:w-auto">
                            <p className="text-gray-600">Toplam Tutar</p>
                            <p className="text-4xl lg:text-5xl font-bold text-brand-gold">{total.toFixed(2)} TL</p>
                        </div>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[40vh] md:max-h-full">
                        {selectedVisit.orders.map((order, index) => (
                            <div key={order.id} className="bg-gray-50 p-3 rounded-lg">
                                <p className="font-semibold text-gray-600 border-b pb-1 mb-2">Sipariş #{index + 1} - {new Date(order.created_at).toLocaleTimeString('tr-TR')}</p>
                                <ul className="space-y-1 text-sm">
                                    {order.order_items.map(item => (
                                        <li key={item.id} className="flex justify-between items-center text-gray-800">
                                            <span>{item.quantity}x {item.menu_items?.name}</span>
                                            <span className="font-medium">{(item.price * item.quantity).toFixed(2)} TL</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 border-t pt-4 flex flex-col sm:flex-row justify-end sm:space-x-4 space-y-2 sm:space-y-0">
                    <button onClick={handlePrint} className="bg-gray-600 text-white font-bold py-2 px-4 lg:py-3 lg:px-6 rounded-lg hover:bg-gray-700 transition-all text-md lg:text-lg">
                        <i className="fas fa-print mr-2"></i>Yazdır
                    </button>
                    <button onClick={handleCloseVisit} className="bg-green-600 text-white font-bold py-2 px-4 lg:py-3 lg:px-6 rounded-lg hover:bg-green-700 transition-all text-md lg:text-lg">
                        <i className="fas fa-check-circle mr-2"></i>Hesabı Kapat
                    </button>
                </div>
                <div className="hidden">
                    <PrintableReceipt visit={selectedVisit} total={total} />
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white min-h-screen">
            <header className="bg-brand-dark shadow-md sticky top-0 z-40 text-white h-[60px] flex items-center">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <h1 className="text-xl md:text-2xl font-bold">Kasa Ekranı</h1>
                    <div className="space-x-2 md:space-x-4">
                        <a onClick={() => window.location.hash = 'employee'} className="text-xs md:text-sm bg-gray-600 text-white py-2 px-3 md:px-4 rounded-lg hover:bg-gray-700 transition cursor-pointer">
                           <i className="fas fa-users md:mr-2"></i><span className="hidden md:inline">Çalışan Arayüzü</span>
                        </a>
                        <a onClick={() => window.location.hash = ''} className="text-xs md:text-sm bg-brand-gold py-2 px-3 md:px-4 rounded-lg hover:bg-opacity-90 transition cursor-pointer">Ana Sayfa</a>
                    </div>
                </div>
            </header>
            
            {isLoading && (
                 <div className="flex items-center justify-center h-[calc(100vh-60px)]"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>
            )}
            {!isLoading && error && (
                 <div className="flex items-center justify-center h-[calc(100vh-60px)] text-red-500">{error}</div>
            )}
            {!isLoading && !error && (
                <main className="lg:grid lg:grid-cols-[350px_1fr] h-auto lg:h-[calc(100vh-60px)] flex flex-col">
                    {renderVisitList()}
                    {selectedVisitId && renderVisitDetails()}
                </main>
            )}
        </div>
    );
};

export default CashierView;