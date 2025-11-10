import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";

interface Product {
  rank: number;
  name: string;
  sku: string;
  orders: number;
  revenue: number;
}

interface TopProductsTableProps {
  products: Product[];
}

export const TopProductsTable = ({ products }: TopProductsTableProps) => {
  const [sortBy, setSortBy] = useState<'orders' | 'revenue'>('orders');
  
  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'orders') return b.orders - a.orders;
    return b.revenue - a.revenue;
  });

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🏆 Top 10 Products (By Order Volume)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50" 
                    onClick={() => setSortBy('orders')}
                  >
                    Orders {sortBy === 'orders' && '↓'}
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSortBy('revenue')}
                  >
                    Revenue {sortBy === 'revenue' && '↓'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.slice(0, 10).map((product, index) => (
                  <TableRow 
                    key={product.sku}
                    className={`hover:bg-muted/50 transition-colors ${index === 0 ? 'bg-warning/10' : ''}`}
                  >
                    <TableCell className="font-medium">
                      {getMedalEmoji(index + 1)} {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                    <TableCell>{product.orders}</TableCell>
                    <TableCell>₨{product.revenue.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              View All Products →
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
