import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { VisitWithDetails, OrderItem, RolePins } from '../types';
import { fetchActiveVisits, closeVisit, subscribeToCashierUpdates, fetchRolePins } from '../services/supabaseService';

const formatCurrency = (price: number | null | undefined) => {
  if (price === null || price === undefined) return '';
  const formattedPrice = Number(price.toFixed(2));
  return `${formattedPrice} ₺`;
};


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
    
    const formatCurrencyForReceipt = (price: number | null | undefined) => {
        if (price === null || price === undefined) return '';
        return Number(price.toFixed(2)).toString();
    };

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
                            <td className="text-right">{formatCurrencyForReceipt(item.price * item.quantity)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <hr className="my-2 border-black border-dashed" />
            <div className="text-right">
                <p className="font-bold text-sm">TOPLAM: {formatCurrency(total)}</p>
            </div>
            <div className="text-center mt-4">
                <p>Afiyet olsun!</p>
            </div>
        </div>
    );
};

const PinEntry: React.FC<{ onPinVerified: () => void; correctPin: string; roleName: string }> = ({ onPinVerified, correctPin, roleName }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const { value } = e.target;
        if (/^\d*$/.test(value) && value.length <= 1) {
            const newPin = pin.split('');
            newPin[index] = value;
            setPin(newPin.join(''));

            if (value && index < 3) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };
    
    useEffect(() => {
        if(pin.length === 4) {
            if (pin === correctPin) {
                onPinVerified();
            } else {
                setError('Hatalı PIN. Lütfen tekrar deneyin.');
                setPin('');
                inputRefs.current[0]?.focus();
            }
        } else {
            setError('');
        }
    }, [pin, correctPin, onPinVerified]);


    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-dark p-4">
            <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-xl text-center">
                 <h1 className="text-3xl font-bold text-brand-dark mb-2">{roleName} Girişi</h1>
                 <p className="text-gray-600 mb-6">Lütfen devam etmek için 4 haneli PIN kodunuzu girin.</p>
                 <div className="flex justify-center gap-3 mb-4">
                    {[0, 1, 2, 3].map(i => (
                        <input
                            key={i}
                            // FIX: Use a block body for the ref callback to prevent an implicit return value,
                            // which was causing a TypeScript type error.
                            ref={el => { inputRefs.current[i] = el; }}
                            type="text"
                            maxLength={1}
                            value={pin[i] || ''}
                            onChange={e => handlePinChange(e, i)}
                            onKeyDown={e => handleKeyDown(e, i)}
                            className="w-14 h-16 text-center text-3xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-brand-gold"
                        />
                    ))}
                 </div>
                 {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                 <div className="mt-8">
                    <a onClick={() => window.location.hash = 'employee'} className="text-sm text-gray-500 hover:text-brand-gold">
                        <i className="fas fa-arrow-left mr-1"></i>
                        Çalışan Arayüzüne Dön
                    </a>
                </div>
            </div>
        </div>
    );
};


const CashierView: React.FC = () => {
    const [visits, setVisits] = useState<VisitWithDetails[]>([]);
    const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('cashier_pin_verified') === 'true');
    const [correctPin, setCorrectPin] = useState<string | null>(null);

    useEffect(() => {
        const getPins = async () => {
            try {
                const pins = await fetchRolePins();
                const cashierPin = pins.find(p => p.role === 'cashier')?.pin;
                 if (!cashierPin) {
                    setError('Kasa PIN kodu ayarlanmamış. Lütfen yöneticiyle görüşün.');
                } else {
                    setCorrectPin(cashierPin);
                }
            } catch (err: any) {
                setError(err.message);
            }
        };
        if(!isAuthenticated) {
            getPins();
        }
    }, [isAuthenticated]);

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
        if (!isAuthenticated) return;
        
        fetchAndSetVisits();
        
        const channel = subscribeToCashierUpdates(fetchAndSetVisits);

        // Setup polling as a fallback mechanism
        const pollingId = setInterval(() => {
            console.log('Polling cashier for updates...');
            fetchAndSetVisits();
        }, 10000); // every 10 seconds

        return () => {
            console.log('CashierView: Cleaning up subscription and polling.');
            clearInterval(pollingId);
            channel.unsubscribe();
        };
    }, [fetchAndSetVisits, isAuthenticated]);
    
    const handlePinVerified = () => {
        sessionStorage.setItem('cashier_pin_verified', 'true');
        setIsAuthenticated(true);
    };

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
                            <span className="text-md md:text-lg font-semibold">{formatCurrency(total)}</span>
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
                            <p className="text-4xl lg:text-5xl font-bold text-brand-gold">{formatCurrency(total)}</p>
                        </div>
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[40vh] md:max-h-full">
                        {selectedVisit.orders.map((order, index) => (
                            <div key={order.id} className="bg-gray-50 p-3 rounded-lg">
                                <p className="font-semibold text-gray-600 border-b pb-1 mb-2">Sipariş #{index + 1} - {new Date(order.created_at).toLocaleTimeString('tr-TR')}</p>
                                {order.notes && (
                                    <div className="text-xs italic text-amber-800 bg-amber-100 p-2 my-2 rounded-md">
                                        <i className="fas fa-sticky-note mr-1"></i> {order.notes}
                                    </div>
                                )}
                                <ul className="space-y-1 text-sm">
                                    {order.order_items.map(item => (
                                        <li key={item.id} className="flex justify-between items-center text-gray-800">
                                            <span>{item.quantity}x {item.menu_items?.name}</span>
                                            <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
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

    if (!isAuthenticated) {
        if (error) return <div className="flex items-center justify-center h-screen text-red-500 bg-gray-100 p-4">{error}</div>;
        if (!correctPin) return <div className="flex items-center justify-center h-screen"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>;
        return <PinEntry onPinVerified={handlePinVerified} correctPin={correctPin} roleName="Kasa" />;
    }

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
                    {selectedVisitId ? renderVisitDetails() : (
                        <div className="hidden lg:flex flex-col items-center justify-center h-full text-gray-500 p-4 text-center">
                             <i className="fas fa-arrow-left text-3xl mb-4"></i>
                             <p className="text-xl">Detayları görmek için yandaki listeden bir masa seçin.</p>
                        </div>
                    )}
                </main>
            )}
        </div>
    );
};

export default CashierView;