import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, TrendingUp, Award } from "lucide-react";

interface PerformanceStats {
  total: number;
  onTime: number;
  delayed: number;
  early: number;
  avgDelay: number;
}

interface CourierPerformanceCardsProps {
  postexStats: PerformanceStats;
  leopardsStats: PerformanceStats;
  overallStats: PerformanceStats & { onTimePercent: number };
  bestCourier: { name: string; rate: number };
}

export const CourierPerformanceCards = ({
  postexStats,
  leopardsStats,
  overallStats,
  bestCourier
}: CourierPerformanceCardsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* PostEx Performance */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 backdrop-blur-lg border border-gray-100 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">PostEx Performance</CardTitle>
          <Truck className="h-5 w-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Orders</span>
              <span className="font-semibold">{postexStats.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">On-Time</span>
              <span className="font-semibold text-green-600">{postexStats.onTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delayed</span>
              <span className="font-semibold text-red-600">{postexStats.delayed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Delay</span>
              <span className="font-semibold">{postexStats.avgDelay.toFixed(1)}d</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leopards Performance */}
      <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 backdrop-blur-lg border border-gray-100 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Leopards Performance</CardTitle>
          <Truck className="h-5 w-5 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Orders</span>
              <span className="font-semibold">{leopardsStats.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">On-Time</span>
              <span className="font-semibold text-green-600">{leopardsStats.onTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delayed</span>
              <span className="font-semibold text-red-600">{leopardsStats.delayed}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg Delay</span>
              <span className="font-semibold">{leopardsStats.avgDelay.toFixed(1)}d</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Performance */}
      <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 backdrop-blur-lg border border-gray-100 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall Performance</CardTitle>
          <TrendingUp className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">On-Time %</span>
              <span className="font-semibold text-green-600">{overallStats.onTimePercent.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Early</span>
              <span className="font-semibold text-blue-600">{overallStats.early}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">On-Time</span>
              <span className="font-semibold text-green-600">{overallStats.onTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delayed</span>
              <span className="font-semibold text-red-600">{overallStats.delayed}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Courier */}
      <Card className="bg-gradient-to-br from-boost-yellow/10 to-boost-amber/5 backdrop-blur-lg border border-gray-100 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Best Courier</CardTitle>
          <Award className="h-5 w-5 text-boost-yellow" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-boost-black">{bestCourier.name}</div>
              <Badge className="mt-2 bg-boost-yellow text-boost-black">
                🏆 Top Performer
              </Badge>
            </div>
            <div className="text-center pt-2">
              <div className="text-2xl font-bold text-green-600">{bestCourier.rate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">On-Time Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
