import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProductAnalyticsButtonProps {
  productId: string;
  productTitle: string;
  totalViews?: number;
  totalSales?: number;
  reviewRating?: number;
  reviewCount?: number;
  inventory?: number;
}

export const ProductAnalyticsButton = ({
  productId,
  productTitle,
  totalViews = 0,
  totalSales = 0,
  reviewRating = 0,
  reviewCount = 0,
  inventory = 0,
}: ProductAnalyticsButtonProps) => {
  const conversionRate = totalViews > 0 ? ((totalSales / totalViews) * 100).toFixed(1) : '0.0';
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Product Analytics: {productTitle}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
          <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="text-sm text-gray-600 font-medium">Total Views</div>
            <div className="text-3xl font-bold text-blue-700">{totalViews.toLocaleString()}</div>
          </div>
          
          <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-green-100">
            <div className="text-sm text-gray-600 font-medium">Total Sales</div>
            <div className="text-3xl font-bold text-green-700">{totalSales.toLocaleString()}</div>
          </div>
          
          <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="text-sm text-gray-600 font-medium">Inventory</div>
            <div className="text-3xl font-bold text-purple-700">{inventory.toLocaleString()}</div>
          </div>
          
          <div className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
            <div className="text-sm text-gray-600 font-medium">Rating</div>
            <div className="text-3xl font-bold text-yellow-700">{reviewRating.toFixed(1)} ⭐</div>
          </div>
          
          <div className="p-4 border rounded-lg bg-gradient-to-br from-pink-50 to-pink-100">
            <div className="text-sm text-gray-600 font-medium">Reviews</div>
            <div className="text-3xl font-bold text-pink-700">{reviewCount.toLocaleString()}</div>
          </div>
          
          <div className="p-4 border rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100">
            <div className="text-sm text-gray-600 font-medium">Conversion</div>
            <div className="text-3xl font-bold text-indigo-700">{conversionRate}%</div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <strong>Product ID:</strong> {productId}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
