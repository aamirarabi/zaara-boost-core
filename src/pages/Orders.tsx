import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Package, Clock, CheckCircle, TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import { formatPKRCurrency, formatPakistanDate, getPakistanMonthName } from "@/lib/utils";
import { toast } from "sonner";

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    fulfilledOrders: 0,
    thisMonthOrders: 0,
  });

  useEffect(() => {
    loadOrders();
    loadStats();
  }, [statusFilter]);

  const loadStats = async () => {
    // Get total orders
    const { count: totalOrders } = await supabase
      .from("shopify_orders")
      .select("*", { count: "exact", head: true });

    // Get pending orders (null, 'pending', or 'partial')
    const { count: pendingOrders } = await supabase
      .from("shopify_orders")
      .select("*", { count: "exact", head: true })
      .or("fulfillment_status.is.null,fulfillment_status.eq.pending,fulfillment_status.eq.partial");

    // Get fulfilled orders
    const { count: fulfilledOrders } = await supabase
      .from("shopify_orders")
      .select("*", { count: "exact", head: true })
      .eq("fulfillment_status", "fulfilled");

    // Get orders this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { count: thisMonthOrders } = await supabase
      .from("shopify_orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstDayOfMonth.toISOString());

    setStats({
      totalOrders: totalOrders || 0,
      pendingOrders: pendingOrders || 0,
      fulfilledOrders: fulfilledOrders || 0,
      thisMonthOrders: thisMonthOrders || 0,
    });
  };

  const loadOrders = async () => {
    let query = supabase.from("shopify_orders").select("*").order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("fulfillment_status", statusFilter);
    }
    
    if (sourceFilter !== "all") {
      query = query.eq("order_source", sourceFilter);
    }

    const { data } = await query;
    if (data) setOrders(data);
  };

  const syncOrders = async () => {
    setSyncing(true);
    toast("Syncing Orders", {
      description: "Fetching latest orders from Shopify...",
    });

    const { data, error } = await supabase.functions.invoke("sync-shopify-orders");

    if (error) {
      toast("Sync Failed", {
        description: error.message,
      });
    } else if (data.error) {
      toast("Sync Failed", {
        description: data.error,
      });
    } else {
      toast("Sync Complete", {
        description: `Synced orders from Shopify successfully`,
      });
      loadOrders();
      loadStats();
    }

    setSyncing(false);
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.order_number?.includes(searchQuery) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone?.includes(searchQuery)
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "fulfilled":
        return "default";
      case "pending":
        return "secondary";
      case "partial":
        return "outline";
      default:
        return "secondary";
    }
  };
  
  const getSourceColor = (source: string) => {
    switch(source) {
      case 'Facebook': return 'bg-blue-100 text-blue-800';
      case 'Instagram': return 'bg-pink-100 text-pink-800';
      case 'Google': return 'bg-red-100 text-red-800';
      case 'WhatsApp': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getDeliveryStatusColor = (status: string) => {
    switch(status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Delayed': return 'bg-red-100 text-red-800';
      case 'Arriving Today': return 'bg-blue-100 text-blue-800';
      case 'On Track': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground">Track and manage customer orders</p>
          </div>
          <Button onClick={syncOrders} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync from Shopify
              </>
            )}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">All time orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
              <p className="text-xs text-muted-foreground">Awaiting fulfillment</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fulfilled Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.fulfilledOrders}</div>
              <p className="text-xs text-muted-foreground">Completed orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonthOrders}</div>
              <p className="text-xs text-muted-foreground">Since {getPakistanMonthName()}</p>
            </CardContent>
          </Card>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground text-center">
                Sync from Shopify in Settings to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
          <CardHeader>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number, customer name, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Google">Google</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Organic">Organic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  // line_items is already a JSONB object, no need to parse
                  const items = Array.isArray(order.line_items) ? order.line_items : [];
                  const itemsText = items.map((item: any) => 
                    `${item.quantity}x ${item.name}`
                  ).join(', ');
                  
                  return (
                    <TableRow 
                      key={order.order_id}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <TableCell className="font-medium">#{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer_name || "—"}</div>
                          <div className="text-sm text-muted-foreground">{order.customer_phone || "—"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={itemsText}>
                          {itemsText || 'No items'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSourceColor(order.order_source || 'Organic')}>
                          {order.order_source || 'Organic'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPKRCurrency(order.total_price)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.fulfillment_status)}>
                          {order.fulfillment_status || "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.delivery_status && (
                            <Badge className={getDeliveryStatusColor(order.delivery_status)}>
                              {order.delivery_status}
                            </Badge>
                          )}
                          {order.estimated_delivery_date && (
                            <div className="text-xs text-muted-foreground">
                              Est: {new Date(order.estimated_delivery_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatPakistanDate(order.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        )}
        
        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order #{selectedOrder?.order_number}</DialogTitle>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-4">
                {/* Customer Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {selectedOrder.customer_name}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span> {selectedOrder.customer_phone}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {selectedOrder.customer_email || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">City:</span> {typeof selectedOrder.shipping_address === 'object' ? selectedOrder.shipping_address?.city : 'N/A'}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(Array.isArray(selectedOrder.line_items) ? selectedOrder.line_items : []).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Quantity: {item.quantity}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatPKRCurrency(item.price)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total: {formatPKRCurrency(item.quantity * parseFloat(item.price))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Order Source & Tracking */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Order Source & Delivery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Source:</span>
                        <Badge className={getSourceColor(selectedOrder.order_source)}>
                          {selectedOrder.order_source || 'Organic'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Courier:</span>
                        <span>{selectedOrder.courier_name || 'Not assigned'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Tracking #:</span>
                        <span>{selectedOrder.tracking_number || 'N/A'}</span>
                      </div>
                      {selectedOrder.delivery_status && (
                        <div className="flex justify-between">
                          <span className="font-medium">Delivery Status:</span>
                          <Badge className={getDeliveryStatusColor(selectedOrder.delivery_status)}>
                            {selectedOrder.delivery_status}
                          </Badge>
                        </div>
                      )}
                      {selectedOrder.estimated_delivery_date && (
                        <div className="flex justify-between">
                          <span className="font-medium">Estimated Delivery:</span>
                          <span>
                            {new Date(selectedOrder.estimated_delivery_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatPKRCurrency(selectedOrder.subtotal || 0)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base pt-2 border-t">
                        <span>Total:</span>
                        <span>{formatPKRCurrency(selectedOrder.total_price || 0)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Payment Status:</span>
                        <Badge variant={selectedOrder.financial_status === 'paid' ? 'default' : 'secondary'}>
                          {selectedOrder.financial_status || 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Orders;