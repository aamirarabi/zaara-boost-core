import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Shield, DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSpring, animated } from "react-spring";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface WarrantyReturnsProps {
  warrantyClaims: number;
  warrantyChange: number;
  returns: number;
  returnsChange: number;
  refunds: number;
  refundsChange: number;
  topReturns: Array<{ product: string; returns: number; rate: number; reason: string }>;
  returnReasons: Array<{ name: string; value: number; color: string }>;
}

const AnimatedNumber = ({ value, prefix = "" }: { value: number | string; prefix?: string }) => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
  
  const { number } = useSpring({
    from: { number: 0 },
    to: { number: numValue },
    config: { duration: 1000 }
  });

  return (
    <animated.span>
      {number.to(n => prefix + Math.floor(n).toLocaleString())}
    </animated.span>
  );
};

export const WarrantyReturns = ({ 
  warrantyClaims, 
  warrantyChange, 
  returns, 
  returnsChange, 
  refunds, 
  refundsChange,
  topReturns,
  returnReasons
}: WarrantyReturnsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card shadow-card hover:shadow-hover transition-smooth">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-info" />
            <CardTitle>Warranty & Returns Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              className="p-4 rounded-lg bg-info/10 border border-info/20"
            >
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-5 h-5 text-info" />
                {warrantyChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-danger" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-success" />
                )}
              </div>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={warrantyClaims} />
              </div>
              <div className="text-sm text-muted-foreground">Warranty Claims</div>
              <div className={`text-xs mt-1 ${warrantyChange > 0 ? 'text-danger' : 'text-success'}`}>
                {warrantyChange > 0 ? '↑' : '↓'}{Math.abs(warrantyChange)}%
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              className="p-4 rounded-lg bg-warning/10 border border-warning/20"
            >
              <div className="flex items-center justify-between mb-2">
                <RefreshCw className="w-5 h-5 text-warning" />
                {returnsChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-danger" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-success" />
                )}
              </div>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={returns} />
              </div>
              <div className="text-sm text-muted-foreground">Returns Initiated</div>
              <div className={`text-xs mt-1 ${returnsChange > 0 ? 'text-danger' : 'text-success'}`}>
                {returnsChange > 0 ? '↑' : '↓'}{Math.abs(returnsChange)}%
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              className="p-4 rounded-lg bg-success/10 border border-success/20"
            >
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-5 h-5 text-success" />
                {refundsChange > 0 ? (
                  <TrendingUp className="w-4 h-4 text-danger" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-success" />
                )}
              </div>
              <div className="text-2xl font-bold">
                <AnimatedNumber value={refunds} prefix="₨" />
              </div>
              <div className="text-sm text-muted-foreground">Refunds Processed</div>
              <div className={`text-xs mt-1 ${refundsChange > 0 ? 'text-danger' : 'text-success'}`}>
                {refundsChange > 0 ? '↑' : '↓'}{Math.abs(refundsChange)}%
              </div>
            </motion.div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Products with Highest Return Rate</h3>
            <div className="space-y-2">
              {topReturns.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex justify-between items-center text-sm border-b border-border pb-2"
                >
                  <span className="flex-1">{item.product}</span>
                  <span className="w-16 text-center text-danger font-semibold">{item.returns}</span>
                  <span className={`w-16 text-center font-semibold ${item.rate > 5 ? 'text-danger' : 'text-success'}`}>
                    {item.rate}%
                  </span>
                  <span className="w-32 text-right text-muted-foreground">{item.reason}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Return Reasons Breakdown</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={returnReasons}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {returnReasons.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col justify-center space-y-2 text-sm">
              {returnReasons.map((reason, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex justify-between"
                >
                  <span>• {reason.name}:</span>
                  <span className="font-semibold">{reason.value}%</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm">
              ⚠️ <span className="font-semibold">Average Return Rate:</span> 4.2% (Industry: 6-8%) ✅ Good!
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">View All Claims</Button>
            <Button variant="outline" size="sm">Process Pending</Button>
            <Button variant="outline" size="sm">Export Report</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
