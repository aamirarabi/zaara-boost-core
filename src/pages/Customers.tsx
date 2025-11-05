import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserPlus, Users, TrendingUp, ShoppingBag, DollarSign } from "lucide-react";

const Customers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [stats, setStats] = useState({
    totalCustomers: 0,
    newThisMonth: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadCustomers();
    loadStats();
  }, [filterType]);

  const loadStats = async () => {
    // Get total customers
    const { count: totalCustomers } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    // Get new customers this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstDayOfMonth.toISOString());

    // Get total orders and revenue
    const { data: aggregateData } = await supabase
      .from("customers")
      .select("order_count, total_spend");

    const totalOrders = aggregateData?.reduce((sum, c) => sum + (c.order_count || 0), 0) || 0;
    const totalRevenue = aggregateData?.reduce((sum, c) => sum + (parseFloat(c.total_spend as any) || 0), 0) || 0;

    setStats({
      totalCustomers: totalCustomers || 0,
      newThisMonth: newThisMonth || 0,
      totalOrders,
      totalRevenue,
    });
  };

  const loadCustomers = async () => {
    let query = supabase.from("customers").select("*").order("created_at", { ascending: false });

    if (filterType !== "all") {
      query = query.eq("customer_type", filterType);
    }

    const { data } = await query;
    if (data) setCustomers(data);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone_number?.includes(searchQuery) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-muted-foreground">Manage your customer database</p>
          </div>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground">Registered customers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.newThisMonth}</div>
              <p className="text-xs text-muted-foreground">Since {new Date().toLocaleString('default', { month: 'long' })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">All time orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">PKR {stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time revenue</p>
            </CardContent>
          </Card>
        </div>

        {customers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No customers yet</h3>
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
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="D2C">D2C</SelectItem>
                  <SelectItem value="B2B">B2B</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spend</TableHead>
                  <TableHead>Last Interaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.phone_number}>
                    <TableCell className="font-medium">{customer.customer_name || "—"}</TableCell>
                    <TableCell>{customer.phone_number}</TableCell>
                    <TableCell>{customer.email || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={customer.customer_type === "B2B" ? "default" : "secondary"}>
                        {customer.customer_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{customer.order_count}</TableCell>
                    <TableCell>PKR {customer.total_spend?.toLocaleString() || 0}</TableCell>
                    <TableCell>
                      {customer.last_interaction_at
                        ? new Date(customer.last_interaction_at).toLocaleDateString()
                        : "—"}
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

export default Customers;