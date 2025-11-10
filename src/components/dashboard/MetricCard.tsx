import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { useSpring, animated } from "react-spring";
import { useEffect, useState } from "react";

interface MetricCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: LucideIcon;
  details?: Array<{ label: string; value: number | string }>;
  footer?: string;
  index?: number;
}

const AnimatedNumber = ({ value }: { value: number | string }) => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) || 0 : value;
  
  const { number } = useSpring({
    from: { number: 0 },
    to: { number: numValue },
    config: { duration: 1000 }
  });

  if (typeof value === 'string' && value.includes('₨')) {
    return <animated.span>{number.to(n => '₨' + Math.floor(n))}</animated.span>;
  }
  
  if (typeof value === 'string' && value.includes('%')) {
    return <animated.span>{number.to(n => Math.floor(n) + '%')}</animated.span>;
  }

  return <animated.span>{number.to(n => Math.floor(n))}</animated.span>;
};

export const MetricCard = ({ title, value, change, icon: Icon, details, footer, index = 0 }: MetricCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="h-full"
    >
      <Card className="glass-card shadow-card hover:shadow-hover transition-smooth h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <motion.div
            whileHover={{ rotate: 360, scale: 1.2 }}
            transition={{ duration: 0.6 }}
          >
            <Icon className="h-4 w-4 text-primary" />
          </motion.div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            <AnimatedNumber value={value} />
          </div>
          
          {change !== undefined && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className={`flex items-center text-xs ${change >= 0 ? 'text-success' : 'text-danger'}`}
            >
              {change >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              <span>{Math.abs(change)}% from last period</span>
            </motion.div>
          )}

          {details && details.length > 0 && (
            <div className="mt-3 space-y-1">
              {details.map((detail, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                  className="flex justify-between text-xs"
                >
                  <span className="text-muted-foreground">{detail.label}:</span>
                  <span className="font-semibold">{detail.value}</span>
                </motion.div>
              ))}
            </div>
          )}

          {footer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground"
            >
              {footer}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
