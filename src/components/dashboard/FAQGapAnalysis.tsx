import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface FAQGap {
  id: string;
  question: string;
  frequency: number;
  category: string;
  suggestedAnswer: string;
  firstAsked: Date;
  lastAsked: Date;
}

interface FAQGapAnalysisProps {
  gaps: FAQGap[];
  onAdd: (id: string) => void;
  onIgnore: (id: string) => void;
}

export const FAQGapAnalysis = ({ gaps, onAdd, onIgnore }: FAQGapAnalysisProps) => {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'product': 'bg-info text-info-foreground',
      'delivery': 'bg-warning text-warning-foreground',
      'warranty': 'bg-success text-success-foreground',
      'payment': 'bg-danger text-danger-foreground',
    };
    return colors[category.toLowerCase()] || 'bg-secondary text-secondary-foreground';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.4 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ❓ FAQ Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gaps.slice(0, 10).map((gap, index) => (
              <div 
                key={gap.id}
                className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={index === 0 ? "default" : "secondary"} className={index === 0 ? "bg-warning text-black" : ""}>
                      #{index + 1}
                    </Badge>
                    <Badge className={getCategoryColor(gap.category)}>
                      {gap.category}
                    </Badge>
                    <Badge variant="destructive" className="flex items-center gap-1">
                      🔥 Asked {gap.frequency} times
                    </Badge>
                  </div>
                </div>

                <h4 className="font-semibold text-lg mb-3">{gap.question}</h4>

                <div className="bg-info/10 border border-info/20 rounded-md p-3 mb-3">
                  <p className="text-sm font-medium mb-1">💡 Suggested Answer:</p>
                  <p className="text-sm text-muted-foreground">{gap.suggestedAnswer}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>First: {format(gap.firstAsked, 'MMM d')}</span>
                  <span>Last: {format(gap.lastAsked, 'MMM d')}</span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={() => onAdd(gap.id)}
                  >
                    ✅ Add to FAQ
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => onIgnore(gap.id)}
                  >
                    ❌ Ignore
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            <Button variant="outline" className="flex-1">
              📥 Export CSV
            </Button>
            <Button variant="outline" className="flex-1">
              🤖 Generate Answers with AI
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
