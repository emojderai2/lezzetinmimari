import React, { useEffect, useRef, useState } from 'react';
import type { SalesReportData, MenuCategoryWithItems } from '../types';
import { fetchClosedVisitsByDateRange, fetchMenuData } from '../services/supabaseService';

// Declare type for CDN-loaded Chart.js library
declare const Chart: any;


const formatCurrency = (price: number | null | undefined) => {
  if (price === null || price === undefined || isNaN(price)) return '0 ₺';
  const formattedPrice = Number(price.toFixed(2));
  return `${formattedPrice.toLocaleString('tr-TR')} ₺`;
};


// ===================================================================================
// Dashboard Component (Now Sales Reports)
// ===================================================================================
const AdminDashboard: React.FC = () => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [reportData, setReportData] = useState<SalesReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [menuData, setMenuData] = useState<MenuCategoryWithItems[]>([]);
    const [chartView, setChartView] = useState<'category' | 'product'>('category');
    
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<any>(null); // To hold Chart.js instance

    useEffect(() => {
        const loadMenu = async () => {
            try {
                const data = await fetchMenuData();
                setMenuData(data);
            } catch (err) {
                setError("Raporlama için menü verisi çekilemedi.");
            }
        };
        loadMenu();
    }, []);

    const handleGenerateReport = async () => {
        setIsLoading(true);
        setError(null);
        setReportData(null);
        try {
            const visits = await fetchClosedVisitsByDateRange(startDate, endDate);
            
            if (visits.length === 0) {
                setReportData({
                    totalRevenue: 0,
                    totalVisits: 0,
                    averageVisitValue: 0,
                    categoryBreakdown: [],
                    productBreakdown: [],
                    popularItems: [],
                });
                return;
            }

            const itemToCategoryMap = new Map<string, string>();
            menuData.forEach(category => {
                category.menu_items.forEach(item => {
                    itemToCategoryMap.set(item.name, category.name);
                });
            });

            const allItems = visits.flatMap(v => v.orders).flatMap(o => o.order_items);
            const totalRevenue = allItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const totalVisits = visits.length;

            const categoryRevenues = new Map<string, number>();
            const popularItemsCount = new Map<string, number>();
            const productRevenues = new Map<string, number>();

            allItems.forEach(item => {
                const itemName = item.menu_items?.name;
                if (itemName) {
                    const itemRevenue = item.price * item.quantity;

                    popularItemsCount.set(itemName, (popularItemsCount.get(itemName) || 0) + item.quantity);
                    productRevenues.set(itemName, (productRevenues.get(itemName) || 0) + itemRevenue);
                    
                    const categoryName = itemToCategoryMap.get(itemName) || 'Diğer';
                    categoryRevenues.set(categoryName, (categoryRevenues.get(categoryName) || 0) + itemRevenue);
                }
            });
            
            const categoryBreakdown = Array.from(categoryRevenues.entries())
                .map(([name, revenue]) => ({ 
                    name, 
                    revenue,
                    percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
                }))
                .sort((a, b) => b.revenue - a.revenue);
            
            const productBreakdown = Array.from(productRevenues.entries())
                .map(([name, revenue]) => ({ name, revenue }))
                .sort((a, b) => b.revenue - a.revenue);

            const popularItems = Array.from(popularItemsCount.entries())
                .map(([name, quantity]) => ({
                    name,
                    quantity,
                    revenue: productRevenues.get(name) || 0,
                    percentage: totalRevenue > 0 ? ((productRevenues.get(name) || 0) / totalRevenue) * 100 : 0
                }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);

            setReportData({
                totalRevenue,
                totalVisits,
                averageVisitValue: totalVisits > 0 ? totalRevenue / totalVisits : 0,
                categoryBreakdown,
                productBreakdown,
                popularItems
            });

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Effect to draw chart
    useEffect(() => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
        if (chartRef.current && reportData) {
             const isProductView = chartView === 'product';
             const breakdownDataRaw = isProductView 
                ? reportData.productBreakdown
                : reportData.categoryBreakdown;

            let breakdownData = breakdownDataRaw;
            if (isProductView && breakdownDataRaw.length > 8) {
                const topItems = breakdownDataRaw.slice(0, 7);
                const otherRevenue = breakdownDataRaw.slice(7).reduce((acc, item) => acc + item.revenue, 0);
                breakdownData = [...topItems, { name: 'Diğer Ürünler', revenue: otherRevenue }];
            }

            if (breakdownData.length === 0) return;
            
            const ctx = chartRef.current.getContext('2d');
            if (!ctx) return;

            const labels = breakdownData.map(c => c.name);
            const data = breakdownData.map(c => c.revenue);
            
            chartInstanceRef.current = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Ciro Dağılımı',
                        data: data,
                        backgroundColor: [
                            '#b98d4a', '#1e202a', '#6b7280', '#f59e0b',
                            '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: function(context: any) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += formatCurrency(context.parsed);
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        }
    }, [reportData, chartView]);

    return (
        <div className="space-y-6 fade-in">
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border">
                <h3 className="font-bold text-lg mb-2">Raporlama Periyodu</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Başlangıç Tarihi</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full p-2 border rounded-lg" />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">Bitiş Tarihi</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full p-2 border rounded-lg" />
                    </div>
                    <button onClick={handleGenerateReport} disabled={isLoading} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition w-full disabled:bg-gray-400">
                        {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i> Oluşturuluyor...</> : <><i className="fas fa-search mr-2"></i> Rapor Oluştur</>}
                    </button>
                </div>
            </div>

            {error && <div className="text-center p-4 text-red-600 bg-red-100 rounded-lg">{error}</div>}

            {isLoading && (
                 <div className="text-center p-8"><i className="fas fa-spinner fa-spin text-4xl text-brand-gold"></i></div>
            )}
            
            {reportData && (
                <div className="space-y-8">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="kpi-card p-6 rounded-lg shadow-md">
                            <h4 className="text-sm text-gray-600 font-medium">Toplam Ciro</h4>
                            <p className="text-3xl font-bold text-brand-dark">{formatCurrency(reportData.totalRevenue)}</p>
                        </div>
                        <div className="kpi-card p-6 rounded-lg shadow-md">
                            <h4 className="text-sm text-gray-600 font-medium">Toplam Hesap Sayısı</h4>
                            <p className="text-3xl font-bold text-brand-dark">{reportData.totalVisits}</p>
                        </div>
                        <div className="kpi-card p-6 rounded-lg shadow-md">
                            <h4 className="text-sm text-gray-600 font-medium">Ortalama Sepet Tutarı</h4>
                            <p className="text-3xl font-bold text-brand-dark">{formatCurrency(reportData.averageVisitValue)}</p>
                        </div>
                    </div>
                    
                    {reportData.totalVisits > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                            {/* Chart */}
                            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-brand-dark">Ciro Dağılımı</h3>
                                    <div className="flex items-center bg-gray-200 rounded-full p-1 text-sm">
                                        <button 
                                            onClick={() => setChartView('category')}
                                            className={`px-3 py-1 rounded-full font-semibold transition-colors ${chartView === 'category' ? 'bg-white text-brand-dark shadow' : 'text-gray-600'}`}
                                        >
                                            Kategori
                                        </button>
                                        <button 
                                            onClick={() => setChartView('product')}
                                            className={`px-3 py-1 rounded-full font-semibold transition-colors ${chartView === 'product' ? 'bg-white text-brand-dark shadow' : 'text-gray-600'}`}
                                        >
                                            Ürün
                                        </button>
                                    </div>
                                </div>
                                <canvas ref={chartRef}></canvas>
                            </div>

                            {/* Tables */}
                            <div className="lg:col-span-3 space-y-6">
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    <h3 className="text-xl font-bold text-brand-dark mb-4">Kategori Bazında Ciro Dökümü</h3>
                                    <ul className="space-y-2">
                                        {reportData.categoryBreakdown.map(cat => (
                                            <li key={cat.name} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                                <span className="font-semibold text-gray-800">{cat.name}</span>
                                                <div className="text-right">
                                                    <span className="font-bold text-brand-gold">{formatCurrency(cat.revenue)}</span>
                                                    <span className="text-sm text-blue-600 ml-2 font-semibold">({cat.percentage.toFixed(1)}%)</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-white p-6 rounded-lg shadow-md">
                                    <h3 className="text-xl font-bold text-brand-dark mb-4">En Çok Satan Ürünler</h3>
                                    <ul className="space-y-2">
                                        {reportData.popularItems.map(item => (
                                            <li key={item.name} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                                                <span className="font-semibold text-gray-800 truncate pr-2">{item.name}</span>
                                                <div className="text-right flex-shrink-0">
                                                    <span className="font-bold text-brand-dark">{item.quantity} adet</span>
                                                    <span className="text-sm text-gray-600 mx-2">/</span>
                                                    <span className="font-bold text-brand-gold">{formatCurrency(item.revenue)}</span>
                                                    <span className="text-sm text-blue-600 ml-2 font-semibold">({item.percentage.toFixed(1)}%)</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-white rounded-lg shadow-md">
                            <i className="fas fa-info-circle text-3xl text-gray-400 mb-3"></i>
                            <p className="text-gray-600">Seçilen tarih aralığında veri bulunamadı.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
