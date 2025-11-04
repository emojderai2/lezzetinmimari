import React, { useState, useEffect } from 'react';

interface CountdownProps {
  targetDate: string;
  enabled: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const Countdown: React.FC<CountdownProps> = ({ targetDate, enabled }) => {
  const calculateTimeLeft = (): TimeLeft | {} => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft | {}>(calculateTimeLeft());
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // This runs every second to update the timer
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [targetDate]); // Recalculate if targetDate changes

  if (!enabled || !isClient || !Object.keys(timeLeft).length) {
    return null;
  }

  const timerComponents = Object.entries(timeLeft).map(([interval, value]) => {
    const labels: { [key: string]: string } = {
        days: 'Gün',
        hours: 'Saat',
        minutes: 'Dakika',
        seconds: 'Saniye'
    };
    return (
      <div key={interval} className="text-center">
        <div className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-white bg-white/10 backdrop-blur-sm rounded-lg p-2 sm:p-3 md:p-4 w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center">
          <span>{String(value).padStart(2, '0')}</span>
        </div>
        <div className="mt-2 text-xs sm:text-sm md:text-base font-semibold text-gray-300 uppercase tracking-wider">{labels[interval]}</div>
      </div>
    );
  });

  return (
    <section className="py-16 md:py-20 bg-[#1e202a]" data-aos="fade-up">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-brand-gold mb-8">Büyük Açılışa Kalan Süre</h2>
        <div className="flex justify-center items-center space-x-1 sm:space-x-4 md:space-x-6">
          {timerComponents.length > 0 ? timerComponents : <p className="text-white text-2xl">Açılış Zamanı Geldi!</p>}
        </div>
      </div>
    </section>
  );
};

export default Countdown;
