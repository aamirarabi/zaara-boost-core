import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

interface CourierStats {
  name: string;
  total: number;
  onTime: number;
  delayed: number;
  veryDelayed: number;
  avgDelay: number;
}

interface CourierPerformanceProps {
  couriers: CourierStats[];
}

export const CourierPerformance = ({ couriers }: CourierPerformanceProps) => {
  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getPerformanceStatus = (percentage: number) => {
    if (percentage >= 80) return '✅';
    if (percentage >= 60) return '⚠️';
    return '🚨';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {couriers.map((courier, index) => {
        const performance = Math.round((courier.onTime / courier.total) * 100);
        const pieData = [
          { name: 'On Time', value: courier.onTime, color: 'hsl(var(--success))' },
          { name: 'Delayed', value: courier.delayed, color: 'hsl(var(--warning))' },
          { name: 'Very Delayed', value: courier.veryDelayed, color: 'hsl(var(--danger))' }
        ];

        return (
          <motion.div
            key={courier.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🚚 {courier.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className={`text-4xl font-bold ${getPerformanceColor(performance)}`}>
                    {performance}% {getPerformanceStatus(performance)}
                  </div>
                  <p className="text-sm text-muted-foreground">Performance</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Total:</div>
                    <div className="font-bold">{courier.total}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">On Time:</div>
                    <div className="font-bold text-success">{courier.onTime}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Delayed:</div>
                    <div className="font-bold text-warning">{courier.delayed}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Very Delayed:</div>
                    <div className="font-bold text-danger">{courier.veryDelayed}</div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground mb-4">
                  ⏱️ Avg Delay: <span className="font-medium text-foreground">{courier.avgDelay} days</span>
                </div>

                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
