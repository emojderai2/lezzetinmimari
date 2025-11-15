
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Bildirim verisinin yapısını tanımlar
interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

// Context'in hem state'i hem de bildirim gösterme fonksiyonunu içermesini sağlar
interface NotificationContextType {
  notification: NotificationState | null;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// Varsayılan değerlerle Context oluşturulur
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider bileşeninin alacağı propları tanımlar
interface NotificationProviderProps {
  children: ReactNode;
}

// Uygulamayı saran ve bildirim mantığını yöneten Provider
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Bildirimi gösteren ve bir süre sonra gizleyen fonksiyon
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, visible: true });

    // 5 saniye sonra bildirimi otomatik olarak gizle
    setTimeout(() => {
      setNotification(prev => prev ? { ...prev, visible: false } : null);
    }, 5000);
  }, []);

  const value = { notification, showNotification };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Bildirim context'ine kolay erişim sağlayan custom hook
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
