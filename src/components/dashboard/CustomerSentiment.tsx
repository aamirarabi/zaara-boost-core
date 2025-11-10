import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile, Meh, Frown } from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSpring, animated } from "react-spring";

interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  timeline: Array<{ date: string; positive: number; neutral: number; negative: number }>;
  topNegative: Array<{ issue: string; count: number }>;
}

interface CustomerSentimentProps {
  data: SentimentData;
}

const AnimatedNumber = ({ value }: { value: number }) => {
  const { number } = useSpring({
    from: { number: 0 },
    to: { number: value },
    config: { duration: 1000 }
  });

  return <animated.span>{number.to(n => Math.floor(n))}</animated.span>;
};

export const CustomerSentiment = ({ data }: CustomerSentimentProps) => {
  const total = data.positive + data.neutral + data.negative;
  const positivePercent = Math.round((data.positive / total) * 100);
  const neutralPercent = Math.round((data.neutral / total) * 100);
  const negativePercent = Math.round((data.negative / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card shadow-card hover:shadow-hover transition-smooth">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smile className="w-6 h-6 text-success" />
            <CardTitle>Customer Sentiment Dashboard</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              className="text-center p-4 rounded-lg bg-success/10 border border-success/20"
            >
              <Smile className="w-8 h-8 text-success mx-auto mb-2" />
              <div className="text-3xl font-bold text-success">
                <AnimatedNumber value={data.positive} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">{positivePercent}% Positive</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              className="text-center p-4 rounded-lg bg-warning/10 border border-warning/20"
            >
              <Meh className="w-8 h-8 text-warning mx-auto mb-2" />
              <div className="text-3xl font-bold text-warning">
                <AnimatedNumber value={data.neutral} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">{neutralPercent}% Neutral</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              className="text-center p-4 rounded-lg bg-danger/10 border border-danger/20"
            >
              <Frown className="w-8 h-8 text-danger mx-auto mb-2" />
              <div className="text-3xl font-bold text-danger">
                <AnimatedNumber value={data.negative} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">{negativePercent}% Negative</div>
            </motion.div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Sentiment Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Line type="monotone" dataKey="positive" stroke="hsl(var(--success))" animationDuration={1500} />
                <Line type="monotone" dataKey="neutral" stroke="hsl(var(--warning))" animationDuration={1500} />
                <Line type="monotone" dataKey="negative" stroke="hsl(var(--danger))" animationDuration={1500} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">💔 Top Negative Comments</h3>
            <div className="space-y-2">
              {data.topNegative.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-foreground">• "{item.issue}"</span>
                  <span className="text-danger font-semibold">{item.count} mentions</span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <p className="text-sm">
              💡 <span className="font-semibold">Insight:</span> Overall sentiment is {positivePercent}% positive! ✅<br />
              But delivery delays causing 67% of negative feedback.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
