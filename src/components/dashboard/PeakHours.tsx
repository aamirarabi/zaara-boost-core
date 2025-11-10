import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface PeakHoursProps {
  peakTime: string;
  peakPercentage: number;
  heatmapData: Array<Array<number>>;
  busiestDay: string;
  busiestDayPercent: number;
  slowestDay: string;
  slowestDayPercent: number;
}

export const PeakHours = ({
  peakTime,
  peakPercentage,
  heatmapData,
  busiestDay,
  busiestDayPercent,
  slowestDay,
  slowestDayPercent
}: PeakHoursProps) => {
  const hours = ['9 AM', '10AM', '11AM', '12PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM'];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getHeatColor = (value: number) => {
    if (value >= 80) return 'bg-danger';
    if (value >= 60) return 'bg-warning';
    if (value >= 40) return 'bg-info';
    return 'bg-muted';
  };

  const getHeatSymbol = (value: number) => {
    if (value >= 80) return '█';
    if (value >= 60) return '▓';
    if (value >= 40) return '▒';
    return '░';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card shadow-card hover:shadow-hover transition-smooth">
        <CardHeader>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Clock className="w-6 h-6 text-info" />
            </motion.div>
            <CardTitle>Peak Business Hours & Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-danger/10 border border-danger/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-danger" />
              <span className="font-semibold">🔥 Busiest Time: {peakTime}</span>
              <span className="text-muted-foreground">({peakPercentage}% of daily activity)</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">📊 Hourly Activity Heatmap</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left p-2 border-b border-border">Hour</th>
                    {days.map(day => (
                      <th key={day} className="text-center p-2 border-b border-border">{day}</th>
                    ))}
                    <th className="text-left p-2 border-b border-border"></th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((hour, hourIndex) => (
                    <motion.tr
                      key={hour}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: hourIndex * 0.05 }}
                      className="border-b border-border/50"
                    >
                      <td className="p-2 font-medium">{hour}</td>
                      {heatmapData[hourIndex]?.map((value, dayIndex) => (
                        <td key={dayIndex} className="text-center p-2">
                          <motion.span
                            whileHover={{ scale: 1.5 }}
                            className={`inline-block ${getHeatColor(value)} text-transparent rounded px-1`}
                          >
                            {getHeatSymbol(value)}
                          </motion.span>
                        </td>
                      ))}
                      <td className="p-2 text-muted-foreground text-xs">
                        {hourIndex < 3 ? 'Low' : hourIndex < 6 ? 'Peak' : 'Low'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-info/10 border border-info/20 space-y-2">
            <h3 className="text-sm font-semibold">💡 Recommendations:</h3>
            <ul className="text-sm space-y-1 text-foreground">
              <li>• Schedule CS team 2-5 PM (peak hours)</li>
              <li>• Run Instagram ads 1-4 PM (highest engagement)</li>
              <li>• Avoid system maintenance 2-5 PM</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <div className="text-xs text-muted-foreground">Busiest Day</div>
              <div className="text-lg font-bold">{busiestDay}</div>
              <div className="text-xs text-success">{busiestDayPercent}% of weekly orders</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="text-xs text-muted-foreground">Slowest Day</div>
              <div className="text-lg font-bold">{slowestDay}</div>
              <div className="text-xs text-muted-foreground">{slowestDayPercent}% of weekly orders</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
