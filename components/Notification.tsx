
import React, { useEffect, useRef } from 'react';
import { useNotification } from '../contexts/NotificationProvider';

const Notification: React.FC = () => {
  const { notification } = useNotification();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Bildirim göründüğünde sesi çal
  useEffect(() => {
    if (notification?.visible && audioRef.current) {
      audioRef.current.play().catch(error => {
        // Otomatik oynatma engellendiğinde hatayı konsola yazdır
        console.error("Audio play failed:", error);
      });
    }
  }, [notification]);

  // Eğer bildirim yoksa veya görünür değilse, hiçbir şey render etme
  if (!notification) {
    return null;
  }

  // Bildirim tipine göre stil belirle
  const baseStyle = 'fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white transform transition-all duration-300 z-50';
  const typeStyles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  // Görünürlüğe göre stil değiştir
  const visibilityStyle = notification.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0';

  return (
    <div className={`${baseStyle} ${typeStyles[notification.type]} ${visibilityStyle}`}>
      {notification.message}
      {/* Ses dosyası */}
      <audio ref={audioRef} src="https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3" preload="auto" />
    </div>
  );
};

export default Notification;
