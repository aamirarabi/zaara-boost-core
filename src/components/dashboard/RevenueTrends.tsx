import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useSpring, animated } from "react-spring";

interface RevenueTrendsProps {
  totalRevenue: number;
  avgOrderValue: number;
  dailyAverage: number;
  dailyData: Array<{ date: string; revenue: number }>;
  bestDay: { date: string; revenue: number };
  lowestDay: { date: string; revenue: number };
}

const AnimatedNumber = ({ value, prefix = "" }: { value: number; prefix?: string }) => {
  const { number } = useSpring({
    from: { number: 0 },
    to: { number: value },
    config: { duration: 1500 }
  });

  return (
    <animated.span>
      {number.to(n => prefix + Math.floor(n).toLocaleString())}
    </animated.span>
  );
};

export const RevenueTrends = ({
  totalRevenue,
  avgOrderValue,
  dailyAverage,
  dailyData,
  bestDay,
  lowestDay
}: RevenueTrendsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card shadow-card hover:shadow-hover transition-smooth gradient-subtle">
        <CardHeader>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <DollarSign className="w-6 h-6 text-success" />
            </motion.div>
            <CardTitle>Revenue Trends & Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-success">
                ₨<AnimatedNumber value={totalRevenue} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">Last 7 Days</div>
            </div>

            <div className="p-4 rounded-lg bg-info/10 border border-info/20">
              <div className="text-sm text-muted-foreground mb-1">Avg Order Value</div>
              <div className="text-3xl font-bold text-info">
                ₨<AnimatedNumber value={avgOrderValue} />
              </div>
              <div className="text-xs text-success mt-1">↑ 15% vs last period</div>
            </div>

            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="text-sm text-muted-foreground mb-1">Daily Average</div>
              <div className="text-3xl font-bold text-warning">
                ₨<AnimatedNumber value={dailyAverage} />
              </div>
              <div className="text-xs text-muted-foreground mt-1">Per day</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Revenue by Day</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    background: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                  formatter={(value: any) => `₨${value.toLocaleString()}`}
                />
                <Bar dataKey="revenue" fill="url(#colorRevenue)" animationDuration={1500} />
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-lg bg-success/10 border border-success/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-sm font-semibold">Best Performing Day</span>
              </div>
              <div className="text-2xl font-bold">{bestDay.date}</div>
              <div className="text-lg text-success">₨{bestDay.revenue.toLocaleString()}</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-4 rounded-lg bg-muted/50 border border-border"
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-semibold">Lowest Day</span>
              </div>
              <div className="text-2xl font-bold">{lowestDay.date}</div>
              <div className="text-lg text-muted-foreground">₨{lowestDay.revenue.toLocaleString()}</div>
            </motion.div>
          </div>

          <div className="p-4 rounded-lg bg-info/10 border border-info/20 space-y-2">
            <h3 className="text-sm font-semibold">📈 Trends:</h3>
            <ul className="text-sm space-y-1">
              <li>• Weekend sales 45% higher than weekdays ⬆️</li>
              <li>• Evening orders (5-8 PM) = 38% of daily revenue</li>
              <li>• Average order value increased 15% vs last period</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm">
              💡 <span className="font-semibold">Insight:</span> Revenue growing steadily! Target this week: ₨5.5M (10% growth). On track! ✅
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
