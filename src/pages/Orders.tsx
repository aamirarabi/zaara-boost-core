import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Package, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { formatPKRCurrency, formatPakistanDate, getPakistanMonthName } from "@/lib/utils";

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

    const { data } = await query;
    if (data) setOrders(data);
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

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">Track and manage customer orders</p>
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
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead>Tracking</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.order_id}>
                    <TableCell className="font-medium">#{order.order_number}</TableCell>
                    <TableCell>{order.customer_name || "—"}</TableCell>
                    <TableCell>{order.customer_phone || "—"}</TableCell>
                    <TableCell>{formatPKRCurrency(order.total_price)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(order.fulfillment_status)}>
                        {order.fulfillment_status || "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.courier_name || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{order.tracking_number || "—"}</TableCell>
                    <TableCell>
                      {formatPakistanDate(order.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        )}
      </div>
    </Layout>
  );
};

export default Orders;