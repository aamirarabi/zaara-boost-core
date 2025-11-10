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
import { SyncShopifyButton } from "@/components/dashboard/SyncShopifyButton";
import { ProductComplaints } from "@/components/dashboard/ProductComplaints";
import { CustomerSentiment } from "@/components/dashboard/CustomerSentiment";
import { WarrantyReturns } from "@/components/dashboard/WarrantyReturns";
import { PeakHours } from "@/components/dashboard/PeakHours";
import { RevenueTrends } from "@/components/dashboard/RevenueTrends";
import { InventoryAlerts } from "@/components/dashboard/InventoryAlerts";
import { LiveClock } from "@/components/dashboard/LiveClock";
import { RealTimeChatAnalytics } from "@/components/dashboard/RealTimeChatAnalytics";
import { LatestReviewsWidget } from "@/components/dashboard/LatestReviewsWidget";
import { format } from "date-fns";

// Dashboard component with complete analytics
const Dashboard = () => {
  const getTodayStart = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const getTodayEnd = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  };

  const [dateRange, setDateRange] = useState({
    start: getTodayStart(),
    end: getTodayEnd(),
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

  // Sample data for new sections
  const sampleComplaints = [
    { rank: 1, productName: "Beat Wireless ANC - Black", complaints: 8, rating: 3.2, topIssues: ["Battery dies quickly", "Sound cuts off"], priority: 'critical' as const },
    { rank: 2, productName: "Boost Surge Pro Chair", complaints: 6, rating: 3.8, topIssues: ["Armrest broken", "Squeaky wheels"], priority: 'review' as const },
    { rank: 3, productName: "Boost Hawk Earbuds", complaints: 5, rating: 4.0, topIssues: ["Connectivity issues"], priority: 'review' as const },
  ];

  const sentimentData = {
    positive: 156,
    neutral: 45,
    negative: 12,
    timeline: [
      { date: 'Nov 4', positive: 20, neutral: 8, negative: 2 },
      { date: 'Nov 5', positive: 25, neutral: 6, negative: 3 },
      { date: 'Nov 6', positive: 22, neutral: 7, negative: 1 },
      { date: 'Nov 7', positive: 28, neutral: 9, negative: 2 },
      { date: 'Nov 8', positive: 30, neutral: 8, negative: 2 },
      { date: 'Nov 9', positive: 31, neutral: 7, negative: 2 },
    ],
    topNegative: [
      { issue: "Delayed delivery", count: 8 },
      { issue: "Product different from photo", count: 5 },
      { issue: "Poor quality", count: 4 },
    ]
  };

  const peakHoursData = {
    peakTime: "2:00 PM - 5:00 PM",
    peakPercentage: 67,
    heatmapData: [
      [20, 25, 22, 28, 30, 35, 18], // 9 AM
      [35, 38, 35, 40, 42, 50, 25], // 10AM
      [55, 58, 52, 60, 62, 68, 35], // 11AM
      [68, 70, 65, 72, 75, 80, 50], // 12PM
      [75, 78, 72, 80, 82, 90, 68], // 1 PM
      [95, 98, 95, 98, 100, 98, 95], // 2 PM
      [98, 100, 98, 100, 98, 100, 98], // 3 PM
      [92, 95, 90, 95, 92, 98, 85], // 4 PM
      [65, 68, 62, 70, 68, 75, 60], // 5 PM
      [45, 48, 42, 50, 48, 55, 40], // 6 PM
      [28, 30, 25, 32, 30, 35, 22], // 7 PM
      [15, 18, 12, 20, 18, 22, 10], // 8 PM
    ],
    busiestDay: "Saturday",
    busiestDayPercent: 32,
    slowestDay: "Sunday",
    slowestDayPercent: 8
  };

  const revenueTrendsData = {
    totalRevenue: 4985248,
    avgOrderValue: 26376,
    dailyAverage: 712178,
    dailyData: [
      { date: 'Nov 3', revenue: 345600 },
      { date: 'Nov 4', revenue: 567800 },
      { date: 'Nov 5', revenue: 689400 },
      { date: 'Nov 6', revenue: 756200 },
      { date: 'Nov 7', revenue: 834500 },
      { date: 'Nov 8', revenue: 982450 },
      { date: 'Nov 9', revenue: 809298 },
    ],
    bestDay: { date: 'Nov 8', revenue: 982450 },
    lowestDay: { date: 'Nov 3', revenue: 345600 }
  };

  const inventoryData = {
    items: [
      { product: "Beat Wireless ANC - Black", stock: 0, status: 'out' as const, weeklySales: 12 },
      { product: "Boost Surge Pro Chair", stock: 2, status: 'critical' as const, weeklySales: 8 },
      { product: "Luna RGB Keyboard", stock: 3, status: 'low' as const, weeklySales: 5 },
    ],
    stockValue: 2400000,
    turnoverDays: 15,
    predictions: [
      { product: "Surge Pro Chair", daysLeft: 3 },
      { product: "Nova Mouse", daysLeft: 7 },
    ]
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Date Range Filter - Sticky at top */}
        <DateRangeFilter selectedRange={dateRange} onRangeChange={setDateRange} />

        <div className="p-6 space-y-6">
          {/* Header with Clock */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Complete business analytics and insights</p>
            </div>
            <div className="flex gap-4 items-start">
              <div className="flex gap-2">
                <SyncShopifyButton onSyncComplete={() => loadStats()} />
                <SyncCourierButton onSyncComplete={() => loadStats()} />
              </div>
              <LiveClock />
            </div>
          </div>

          {/* New Widgets Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RealTimeChatAnalytics />
            <LatestReviewsWidget />
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

          {/* NEW: Product Complaints */}
          <ProductComplaints complaints={sampleComplaints} />

          {/* NEW: Inventory Alerts */}
          <InventoryAlerts {...inventoryData} />

          {/* NEW: Revenue Trends */}
          <RevenueTrends {...revenueTrendsData} />

          {/* NEW: Customer Sentiment */}
          <CustomerSentiment data={sentimentData} />

          {/* NEW: Peak Hours */}
          <PeakHours {...peakHoursData} />

          {/* Courier Performance */}
          {courierStats.length > 0 && <CourierPerformance couriers={courierStats} />}

          {/* NEW: Warranty & Returns */}
          <WarrantyReturns 
            warrantyClaims={12}
            warrantyChange={15}
            returns={8}
            returnsChange={-20}
            refunds={45600}
            refundsChange={-10}
            topReturns={[
              { product: "Beat Wireless ANC - Black", returns: 3, rate: 8.1, reason: "Defective" },
              { product: "Boost Surge Pro Chair", returns: 2, rate: 2.1, reason: "Size issue" },
              { product: "Boost Hawk Earbuds", returns: 2, rate: 20, reason: "Not as described" },
            ]}
            returnReasons={[
              { name: "Defective", value: 45, color: "hsl(var(--danger))" },
              { name: "Not as Described", value: 30, color: "hsl(var(--warning))" },
              { name: "Size/Fit", value: 15, color: "hsl(var(--info))" },
              { name: "Changed Mind", value: 10, color: "hsl(var(--muted))" },
            ]}
          />

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