import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: LucideIcon;
  details?: { label: string; value: number | string }[];
  footer?: string;
  index: number;
}

export const MetricCard = ({ title, value, change, icon: Icon, details, footer, index }: MetricCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value === 'number') {
      const duration = 1000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className="h-5 w-5 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold">
              {typeof value === 'number' ? displayValue.toLocaleString() : value}
            </div>
            {change !== undefined && (
              <span className={`text-sm ${change >= 0 ? 'text-success' : 'text-danger'}`}>
                {change >= 0 ? '↑' : '↓'}{Math.abs(change)}%
              </span>
            )}
          </div>
          
          {details && (
            <div className="mt-3 space-y-1">
              {details.map((detail, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">• {detail.label}:</span>
                  <span className="font-medium">{detail.value}</span>
                </div>
              ))}
            </div>
          )}
          
          {footer && (
            <div className="mt-3 text-xs font-medium text-muted-foreground border-t pt-2">
              {footer}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
