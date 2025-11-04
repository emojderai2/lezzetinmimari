import React from 'react';

const EmployeeHub: React.FC = () => {
    
    const roleLinks = [
        { hash: 'waiter', icon: 'fa-concierge-bell', title: 'Garson Ekranı' },
        { hash: 'kitchen', icon: 'fa-utensils', title: 'Mutfak Ekranı' },
        { hash: 'cashier', icon: 'fa-cash-register', title: 'Kasa Ekranı' },
        { hash: 'admin', icon: 'fa-cogs', title: 'Yönetici Paneli' },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-2xl bg-white p-8 md:p-12 rounded-2xl shadow-xl text-center">
                <img src="https://i.imgur.com/xwoTCIK.jpeg" alt="Lezzetin Mimarı Logo" className="h-16 mx-auto mb-4" />
                <h1 className="text-4xl font-bold text-brand-dark mb-8">Çalışan Arayüzü</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {roleLinks.map(link => (
                        <a 
                            key={link.title}
                            onClick={() => window.location.hash = link.hash}
                            className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg shadow-sm hover:shadow-lg hover:bg-brand-gold hover:text-white text-brand-dark transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                        >
                            <i className={`fas ${link.icon} fa-3x mb-3`}></i>
                            <span className="text-xl font-semibold">{link.title}</span>
                        </a>
                    ))}
                </div>
                <div className="mt-10 border-t pt-6">
                    <a 
                        onClick={() => window.location.hash = ''} 
                        className="inline-block text-sm font-medium text-gray-500 hover:text-brand-gold transition-colors duration-300 cursor-pointer"
                    >
                        <i className="fas fa-arrow-left mr-2"></i>
                        Ana Sayfaya Dön
                    </a>
                </div>
            </div>
        </div>
    );
};

export default EmployeeHub;