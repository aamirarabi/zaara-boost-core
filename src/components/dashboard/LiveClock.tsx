import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

export const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = (hours % 12) * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;

  const formatTime = () => {
    return time.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Karachi' });
  };

  const formatDate = () => {
    return time.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'Asia/Karachi'
    });
  };

  return (
    <Card className="p-4 bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-100">
      <div className="flex flex-col items-center gap-3">
        {/* Analog Clock */}
        <svg width="80" height="80" viewBox="0 0 100 100" className="drop-shadow-md">
          <circle cx="50" cy="50" r="48" fill="white" stroke="#F9C400" strokeWidth="2"/>
          {/* Hour markers */}
          {[...Array(12)].map((_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x1 = 50 + 40 * Math.cos(angle);
            const y1 = 50 + 40 * Math.sin(angle);
            const x2 = 50 + 35 * Math.cos(angle);
            const y2 = 50 + 35 * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#1D1D1D"
                strokeWidth="2"
              />
            );
          })}
          {/* Hour hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + 25 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
            y2={50 + 25 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
            stroke="#1D1D1D"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Minute hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + 35 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
            y2={50 + 35 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
            stroke="#F9C400"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Second hand */}
          <line
            x1="50"
            y1="50"
            x2={50 + 38 * Math.cos((secondAngle - 90) * (Math.PI / 180))}
            y2={50 + 38 * Math.sin((secondAngle - 90) * (Math.PI / 180))}
            stroke="#FFA500"
            strokeWidth="1"
            strokeLinecap="round"
          />
          {/* Center dot */}
          <circle cx="50" cy="50" r="3" fill="#1D1D1D"/>
        </svg>

        {/* Digital Time */}
        <div className="text-2xl font-bold text-boost-black">
          {formatTime()}
        </div>

        {/* Date */}
        <div className="text-sm text-muted-foreground text-center">
          {formatDate()}
        </div>

        {/* Timezone */}
        <div className="text-xs text-boost-amber font-semibold">
          PKT (GMT+5)
        </div>
      </div>
    </Card>
  );
};
