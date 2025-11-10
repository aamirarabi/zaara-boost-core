import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface Complaint {
  rank: number;
  productName: string;
  complaints: number;
  rating: number;
  topIssues: string[];
  priority: 'critical' | 'review' | 'monitor';
}

interface ProductComplaintsProps {
  complaints: Complaint[];
}

export const ProductComplaints = ({ complaints }: ProductComplaintsProps) => {
  const getPriorityBadge = (priority: string, complaints: number) => {
    if (priority === 'critical') return <Badge className="bg-danger text-danger-foreground">🔴 Priority</Badge>;
    if (priority === 'review') return <Badge className="bg-warning text-warning-foreground">🟡 Review</Badge>;
    return <Badge className="bg-success text-success-foreground">🟢 Monitor</Badge>;
  };

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
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <AlertTriangle className="w-6 h-6 text-warning" />
              </motion.div>
              <CardTitle>Products with Most Complaints & Issues</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {complaints.map((item, index) => (
              <motion.div
                key={item.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border-b border-border pb-4 last:border-0"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {item.rank <= 3 && <span className="text-lg">⚠️</span>}
                      <span className="font-semibold">{item.rank}. {item.productName}</span>
                      {getPriorityBadge(item.priority, item.complaints)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {item.topIssues.map((issue, i) => (
                        <div key={i}>"{issue}"</div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-danger">{item.complaints}</div>
                      <div className="text-xs text-muted-foreground">Issues</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold">{item.rating}⭐</div>
                      <div className="text-xs text-muted-foreground">Rating</div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="outline" size="sm">Export Report</Button>
            <Button variant="outline" size="sm">Email to Supplier</Button>
            <Button variant="outline" size="sm">View All Complaints</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
