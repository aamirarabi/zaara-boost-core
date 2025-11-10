import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface InventoryItem {
  product: string;
  stock: number;
  status: 'out' | 'critical' | 'low' | 'ok';
  weeklySales: number;
}

interface InventoryAlertsProps {
  items: InventoryItem[];
  stockValue: number;
  turnoverDays: number;
  predictions: Array<{ product: string; daysLeft: number }>;
}

export const InventoryAlerts = ({ items, stockValue, turnoverDays, predictions }: InventoryAlertsProps) => {
  const getStatusBadge = (status: string) => {
    if (status === 'out') return <Badge className="bg-danger text-danger-foreground">🚨 OUT</Badge>;
    if (status === 'critical') return <Badge className="bg-danger text-danger-foreground">🚨 CRIT</Badge>;
    if (status === 'low') return <Badge className="bg-warning text-warning-foreground">⚠️ LOW</Badge>;
    return <Badge className="bg-success text-success-foreground">✅ OK</Badge>;
  };

  const criticalCount = items.filter(i => i.status === 'out' || i.status === 'critical').length;
  const lowCount = items.filter(i => i.status === 'low').length;
  const okCount = items.filter(i => i.status === 'ok').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="glass-card shadow-card hover:shadow-hover transition-smooth">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-info" />
              <CardTitle>Inventory Status & Alerts</CardTitle>
            </div>
            <div className="flex gap-2">
              <Badge variant="destructive" className="animate-pulse-glow">🚨 {criticalCount}</Badge>
              <Badge variant="secondary" className="bg-warning text-warning-foreground">⚠️ {lowCount}</Badge>
              <Badge variant="secondary" className="bg-success text-success-foreground">✅ {okCount}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3 text-danger">🚨 OUT OF STOCK / CRITICAL</h3>
            <div className="space-y-3">
              {items.filter(i => i.status === 'out' || i.status === 'critical' || i.status === 'low').map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-lg border ${
                    item.status === 'out' 
                      ? 'bg-danger/10 border-danger/30 animate-pulse-glow' 
                      : item.status === 'critical'
                      ? 'bg-danger/10 border-danger/20'
                      : 'bg-warning/10 border-warning/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{item.product}</span>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Stock: <span className="font-semibold text-danger">{item.stock} units</span> • 
                        Sales: {item.weeklySales}/week
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className={item.status === 'out' ? 'bg-danger hover:bg-danger/90' : ''}
                    >
                      {item.status === 'out' ? 'Urgent Reorder' : 'Reorder'}
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Progress 
                      value={Math.min((item.stock / 10) * 100, 100)} 
                      className="h-2"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-info/10 border border-info/20">
            <h3 className="text-sm font-semibold mb-2">💡 AI Prediction:</h3>
            <p className="text-sm mb-2">Based on sales trend, you'll run out of:</p>
            <ul className="text-sm space-y-1">
              {predictions.map((pred, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  • <span className="font-semibold">{pred.product}</span> in <span className="text-danger font-semibold">{pred.daysLeft} days</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <div className="text-xs text-muted-foreground">Stock Value</div>
              <div className="text-2xl font-bold">₨{stockValue.toLocaleString()}</div>
            </div>
            <div className="p-3 rounded-lg bg-info/10 border border-info/20">
              <div className="text-xs text-muted-foreground">Turnover Rate</div>
              <div className="text-2xl font-bold">{turnoverDays} days</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">Auto-Reorder Setup</Button>
            <Button variant="outline" size="sm">Contact Suppliers</Button>
            <Button variant="outline" size="sm">View All Stock</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
