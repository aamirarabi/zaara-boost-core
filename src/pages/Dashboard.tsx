import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Package, MessageSquare, ShoppingCart } from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatPakistanDate } from "@/lib/utils";

const Dashboard = () => {
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    orders: 0,
    messages: 0,
  });

  const [messageData, setMessageData] = useState<any[]>([]);
  const [orderData, setOrderData] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [customers, products, orders, messages] = await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("shopify_products").select("*", { count: "exact", head: true }),
      supabase.from("shopify_orders").select("*", { count: "exact", head: true }),
      supabase.from("chat_history").select("*", { count: "exact", head: true }),
    ]);

    setStats({
      customers: customers.count || 0,
      products: products.count || 0,
      orders: orders.count || 0,
      messages: messages.count || 0,
    });

    // Load message analytics
    const { data: analytics } = await supabase
      .from("message_analytics")
      .select("*")
      .order("date", { ascending: true })
      .limit(7);

    if (analytics) {
      setMessageData(
        analytics.map((a) => ({
          date: formatPakistanDate(a.date),
          inbound: a.inbound_count,
          outbound: a.outbound_count,
        }))
      );
    }

    // Sample order status data
    setOrderData([
      { name: "Pending", value: 45, color: "#F9C400" },
      { name: "Processing", value: 30, color: "#1D1D1D" },
      { name: "Fulfilled", value: 180, color: "#10B981" },
      { name: "Cancelled", value: 15, color: "#EF4444" },
    ]);
  };

  const statCards = [
    { title: "Total Customers", value: stats.customers, icon: Users, color: "text-primary" },
    { title: "Total Products", value: stats.products, icon: Package, color: "text-success" },
    { title: "Total Orders", value: stats.orders, icon: ShoppingCart, color: "text-warning" },
    { title: "Total Messages", value: stats.messages, icon: MessageSquare, color: "text-primary" },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your business metrics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Activity (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={messageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="inbound" stroke="#F9C400" strokeWidth={2} />
                  <Line type="monotone" dataKey="outbound" stroke="#1D1D1D" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={orderData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {orderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;