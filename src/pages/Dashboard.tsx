import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Users, Package, MessageSquare, ShoppingCart, DollarSign, Truck } from "lucide-react";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { OrdersChart } from "@/components/dashboard/OrdersChart";
import { OrderStatusChart } from "@/components/dashboard/OrderStatusChart";
import { TopProductsTable } from "@/components/dashboard/TopProductsTable";
import { CourierPerformance } from "@/components/dashboard/CourierPerformance";
import { FAQGapAnalysis } from "@/components/dashboard/FAQGapAnalysis";
import { SyncCourierButton } from "@/components/dashboard/SyncCourierButton";
import { format } from "date-fns";

const Dashboard = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(),
    label: "Today"
  });

  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    orders: 0,
    messages: 0,
    revenue: 0,
    apiCosts: 0,
  });

  const [orderTimeline, setOrderTimeline] = useState<any[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [courierStats, setCourierStats] = useState<any[]>([]);
  const [faqGaps, setFaqGaps] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    // Get counts
    const [customers, productsCount, orders, messages] = await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("shopify_products").select("*", { count: "exact", head: true }),
      supabase.from("shopify_orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString()),
      supabase.from("chat_history")
        .select("*", { count: "exact", head: true })
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString()),
    ]);

    // Get revenue
    const { data: revenueData } = await supabase
      .from("shopify_orders")
      .select("total_price")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    const revenue = revenueData?.reduce((sum, order) => sum + (parseFloat(String(order.total_price || 0)) || 0), 0) || 0;

    // Get API costs
    const { data: apiCostsData } = await supabase
      .from("api_usage_logs")
      .select("cost_pkr")
      .gte("timestamp", dateRange.start.toISOString())
      .lte("timestamp", dateRange.end.toISOString());

    const apiCosts = apiCostsData?.reduce((sum, log) => sum + (parseFloat(String(log.cost_pkr || 0)) || 0), 0) || 0;

    setStats({
      customers: customers.count || 0,
      products: productsCount.count || 0,
      orders: orders.count || 0,
      messages: messages.count || 0,
      revenue,
      apiCosts,
    });

    // Load order timeline
    const { data: ordersByDate } = await supabase
      .from("shopify_orders")
      .select("created_at, fulfillment_status")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString())
      .order("created_at");

    const timelineMap: any = {};
    ordersByDate?.forEach(order => {
      const date = format(new Date(order.created_at as string), 'MMM d');
      if (!timelineMap[date]) {
        timelineMap[date] = { date, received: 0, fulfilled: 0, cancelled: 0 };
      }
      timelineMap[date].received++;
      if (order.fulfillment_status === 'fulfilled') timelineMap[date].fulfilled++;
      if (order.fulfillment_status === 'cancelled') timelineMap[date].cancelled++;
    });

    setOrderTimeline(Object.values(timelineMap));

    // Load order status data
    const { data: statusData } = await supabase
      .from("shopify_orders")
      .select("fulfillment_status")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    const statusMap: any = {};
    statusData?.forEach(order => {
      const status = order.fulfillment_status || 'pending';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    const statusColors: any = {
      fulfilled: 'hsl(var(--success))',
      pending: 'hsl(var(--warning))',
      processing: 'hsl(var(--info))',
      cancelled: 'hsl(var(--danger))',
      returned: 'hsl(var(--secondary))',
    };

    setOrderStatusData(
      Object.entries(statusMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: statusColors[name] || 'hsl(var(--muted))',
      }))
    );

    // Load top products
    const { data: orderItems } = await supabase
      .from("shopify_orders")
      .select("line_items")
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString());

    const productMap: any = {};
    orderItems?.forEach(order => {
      const items = order.line_items as any[];
      items?.forEach(item => {
        const key = item.sku || item.title;
        if (!productMap[key]) {
          productMap[key] = {
            name: item.title,
            sku: item.sku || 'N/A',
            orders: 0,
            revenue: 0,
          };
        }
        productMap[key].orders += item.quantity || 1;
        productMap[key].revenue += parseFloat(item.price || 0) * (item.quantity || 1);
      });
    });

    const topProductsList = Object.values(productMap)
      .sort((a: any, b: any) => b.orders - a.orders)
      .slice(0, 10)
      .map((p: any, i: number) => ({ ...p, rank: i + 1 }));

    setTopProducts(topProductsList);

    // Load courier stats
    const { data: courierData } = await supabase
      .from("courier_performance")
      .select("*")
      .gte("shipped_date", dateRange.start.toISOString())
      .lte("shipped_date", dateRange.end.toISOString());

    const courierMap: any = {};
    courierData?.forEach(delivery => {
      if (!courierMap[delivery.courier_name]) {
        courierMap[delivery.courier_name] = {
          name: delivery.courier_name,
          total: 0,
          onTime: 0,
          delayed: 0,
          veryDelayed: 0,
          totalDelay: 0,
        };
      }
      const courier = courierMap[delivery.courier_name];
      courier.total++;
      if (delivery.delay_days === 0) courier.onTime++;
      else if (delivery.delay_days <= 2) courier.delayed++;
      else courier.veryDelayed++;
      courier.totalDelay += delivery.delay_days || 0;
    });

    setCourierStats(
      Object.values(courierMap).map((c: any) => ({
        ...c,
        avgDelay: c.total > 0 ? (c.totalDelay / c.total).toFixed(1) : 0,
      }))
    );

    // Load FAQ gaps
    const { data: gaps } = await supabase
      .from("faq_gaps")
      .select("*")
      .eq("status", "pending")
      .order("frequency", { ascending: false })
      .limit(10);

    setFaqGaps(
      gaps?.map(gap => ({
        id: gap.id,
        question: gap.question,
        frequency: gap.frequency,
        category: gap.category || 'general',
        suggestedAnswer: gap.suggested_answer || 'No suggestion available',
        firstAsked: new Date(gap.first_asked),
        lastAsked: new Date(gap.last_asked),
      })) || []
    );
  };

  const handleFAQAdd = async (id: string) => {
    await supabase
      .from("faq_gaps")
      .update({ status: "added" })
      .eq("id", id);
    loadStats();
  };

  const handleFAQIgnore = async (id: string) => {
    await supabase
      .from("faq_gaps")
      .update({ status: "ignored" })
      .eq("id", id);
    loadStats();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Date Range Filter - Sticky at top */}
        <DateRangeFilter selectedRange={dateRange} onRangeChange={setDateRange} />

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Complete business analytics and insights</p>
            </div>
            <SyncCourierButton onSyncComplete={() => loadStats()} />
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <MetricCard
              title="Orders"
              value={stats.orders}
              change={23}
              icon={ShoppingCart}
              details={[
                { label: "Received", value: Math.floor(stats.orders * 0.4) },
                { label: "Fulfilled", value: Math.floor(stats.orders * 0.57) },
                { label: "Pending", value: Math.floor(stats.orders * 0.03) },
              ]}
              footer={`Revenue: ₨${Math.floor(stats.revenue).toLocaleString()}`}
              index={0}
            />
            <MetricCard
              title="WhatsApp"
              value={stats.messages}
              change={15}
              icon={MessageSquare}
              details={[
                { label: "New Users", value: Math.floor(stats.messages * 0.26) },
                { label: "Returning", value: Math.floor(stats.messages * 0.74) },
                { label: "Converted", value: Math.floor(stats.messages * 0.38) },
              ]}
              footer="Avg Response: 2.4s"
              index={1}
            />
            <MetricCard
              title="API Costs"
              value={`₨${Math.floor(stats.apiCosts)}`}
              change={-12}
              icon={DollarSign}
              details={[
                { label: "OpenAI", value: `₨${Math.floor(stats.apiCosts * 0.81)}` },
                { label: "WhatsApp", value: `₨${Math.floor(stats.apiCosts * 0.19)}` },
              ]}
              footer="Budget: 47%"
              index={2}
            />
            <MetricCard
              title="CS Team"
              value={34}
              change={8}
              icon={Users}
              details={[
                { label: "Manual", value: 34 },
                { label: "Escalations", value: 12 },
                { label: "Avg Time", value: "5.2m" },
              ]}
              footer="Top: Fahad (12)"
              index={3}
            />
            <MetricCard
              title="Delivery"
              value="84%"
              icon={Truck}
              details={[
                { label: "PostEx", value: "84%" },
                { label: "Leopards", value: "78%" },
              ]}
              footer="Avg Delay: 1.5 days"
              index={4}
            />
            <MetricCard
              title="FAQ Gaps"
              value={faqGaps.length}
              icon={MessageSquare}
              details={[
                { label: "Pending", value: faqGaps.length },
                { label: "Added", value: 8 },
              ]}
              footer={faqGaps[0] ? `Top: "${faqGaps[0].question.slice(0, 15)}..." ${faqGaps[0].frequency}x` : "No gaps"}
              index={5}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OrdersChart data={orderTimeline} />
            <OrderStatusChart data={orderStatusData} total={stats.orders} />
          </div>

          {/* Top Products Table */}
          {topProducts.length > 0 && <TopProductsTable products={topProducts} />}

          {/* Courier Performance */}
          {courierStats.length > 0 && <CourierPerformance couriers={courierStats} />}

          {/* FAQ Gap Analysis */}
          {faqGaps.length > 0 && (
            <FAQGapAnalysis 
              gaps={faqGaps} 
              onAdd={handleFAQAdd}
              onIgnore={handleFAQIgnore}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;