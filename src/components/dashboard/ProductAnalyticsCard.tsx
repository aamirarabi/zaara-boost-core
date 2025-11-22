import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Package, ShoppingCart, DollarSign, AlertTriangle } from "lucide-react";

interface ProductAnalyticsCardProps {
  analytics: {
    total_purchases?: number;
    total_revenue?: number;
    current_stock?: number;
    days_of_inventory?: number;
    low_stock_alert?: boolean;
    trending_score?: number;
    sales_velocity?: number;
    conversion_rate?: number;
    average_order_value?: number;
    last_synced_at?: string;
  } | null;
  productPrice?: number;
}

export function ProductAnalyticsCard({ analytics, productPrice }: ProductAnalyticsCardProps) {
  if (!analytics) return null;

  const {
    total_purchases = 0,
    total_revenue = 0,
    current_stock = 0,
    days_of_inventory = 0,
    low_stock_alert = false,
    trending_score = 0,
    sales_velocity = 0,
    average_order_value = 0,
  } = analytics;

  // Determine trend direction
  const isTrending = trending_score > 50;
  const stockStatus = low_stock_alert ? "Low Stock" : days_of_inventory < 30 ? "Medium Stock" : "Good Stock";
  const stockColor = low_stock_alert ? "text-red-600" : days_of_inventory < 30 ? "text-yellow-600" : "text-green-600";

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 Product Insights
          {isTrending && <span className="text-sm text-green-600 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" /> Trending
          </span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="w-4 h-4" />
              <span>Total Sales</span>
            </div>
            <div className="text-2xl font-bold">{total_purchases}</div>
            <div className="text-xs text-muted-foreground">
              {sales_velocity.toFixed(1)} units/day
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Revenue</span>
            </div>
            <div className="text-2xl font-bold">Rs. {total_revenue.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Avg: Rs. {average_order_value.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Stock Status */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="text-sm text-muted-foreground">Stock Status</span>
            </div>
            <span className={`text-sm font-semibold ${stockColor}`}>
              {stockStatus}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Current Stock</div>
              <div className="font-semibold">{current_stock} units</div>
            </div>
            <div>
              <div className="text-muted-foreground">Days Remaining</div>
              <div className="font-semibold">
                {days_of_inventory > 365 ? "365+" : days_of_inventory} days
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {low_stock_alert && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <div className="font-semibold text-red-900 dark:text-red-100">Low Stock Alert</div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  Less than 2 weeks of inventory remaining at current sales rate
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions for CSR */}
        <div className="border-t pt-4">
          <div className="text-xs text-muted-foreground mb-2">Quick Insights</div>
          <div className="space-y-2 text-sm">
            {sales_velocity > 1 && (
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                ✅ Popular product - selling well
              </div>
            )}
            {sales_velocity < 0.5 && total_purchases > 0 && (
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                ⚠️ Slow moving - consider promotion
              </div>
            )}
            {current_stock === 0 && (
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                ❌ Out of stock - inform customer
              </div>
            )}
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-right">
          Last updated: {analytics.last_synced_at 
            ? new Date(analytics.last_synced_at).toLocaleDateString()
            : 'Never'}
        </div>
      </CardContent>
    </Card>
  );
}
