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
import { Search, Package, Clock, CheckCircle, TrendingUp, RefreshCw, Loader2, Truck, AlertCircle, FileDown, FileSpreadsheet, Download } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatPKRCurrency, formatPakistanDate, formatPakistanDateTime, getPakistanMonthName } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const Orders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [courierFilter, setCourierFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [courierStats, setCourierStats] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    fulfilledOrders: 0,
    thisMonthOrders: 0,
  });
  const [exportDays, setExportDays] = useState(15);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadOrders();
    loadStats();
    loadCourierStats();
  }, [statusFilter, courierFilter, deliveryFilter]);

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
    setLoading(true);
    let query = supabase.from("shopify_orders").select("*").order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("fulfillment_status", statusFilter);
    }
    
    if (sourceFilter !== "all") {
      query = query.eq("order_source", sourceFilter);
    }
    
    if (courierFilter !== "all") {
      query = query.eq("courier_name", courierFilter);
    }
    
    if (deliveryFilter === "delivered") {
      query = query.not("delivered_at", "is", null);
    }

    const { data } = await query;
    if (data) setOrders(data);
    setLoading(false);
  };

  // Map Shopify courier names to our standard names
  const normalizeCourierName = (courier: string | null): string | null => {
    if (!courier) return null;
    
    const courierMapping: any = {
      "Other": "PostEx",
      "other": "PostEx",
      "PostEx": "PostEx",
      "postex": "PostEx",
      "POSTEX": "PostEx",
      "Leopards": "Leopards",
      "leopards": "Leopards",
      "LEOPARDS": "Leopards",
      "TCS": "TCS",
      "tcs": "TCS",
      "BlueEx": "BlueEx",
      "blueex": "BlueEx",
      "Rider": "Rider",
      "rider": "Rider",
    };
    
    return courierMapping[courier] || courier;
  };

  const loadCourierStats = async () => {
    // First, get courier SLA settings from database
    const { data: courierSettings } = await supabase
      .from("courier_settings")
      .select("courier_name, sla_days_karachi, sla_days_other");

    // Create SLA map for quick lookup
    const slaMap: Record<string, { karachi: number; other: number }> = {};
    if (courierSettings) {
      courierSettings.forEach((setting) => {
        slaMap[setting.courier_name] = {
          karachi: setting.sla_days_karachi || 2,
          other: setting.sla_days_other || 5,
        };
      });
    }

    const { data: courierData } = await supabase
      .from("shopify_orders")
      .select("courier_name, actual_delivery_date, estimated_delivery_date, fulfillment_status, created_at, shipping_address, dispatched_at, delivery_city")
      .not("courier_name", "is", null);

    if (!courierData) return;

    const statsMap: any = {};
    courierData.forEach((order) => {
      // Normalize courier name (Other → PostEx)
      const courier = normalizeCourierName(order.courier_name);
      if (!courier) return;
      
      if (!statsMap[courier]) {
        statsMap[courier] = {
          name: courier,
          total: 0,
          onTime: 0,
          early: 0,
          late: 0,
          totalDelayDays: 0,
          delivered: 0,
          pending: 0,
        };
      }
      
      statsMap[courier].total++;
      
      // Only calculate for delivered orders
      if (order.actual_delivery_date && order.dispatched_at) {
        statsMap[courier].delivered++;
        
        const actual = new Date(order.actual_delivery_date);
        const dispatched = new Date(order.dispatched_at);
        const shippingAddress = order.shipping_address as any;
        const city = (order.delivery_city || shippingAddress?.city || "").toLowerCase();
        const isKarachi = city.includes("karachi");
        
        // Get SLA days from database settings (flexible - you can change anytime!)
        const courierSLA = slaMap[courier];
        const expectedDays = isKarachi 
          ? (courierSLA?.karachi || 2)  // Default 2 days for Karachi
          : (courierSLA?.other || 5);    // Default 5 days for other cities
        
        const expectedDelivery = new Date(dispatched);
        expectedDelivery.setDate(expectedDelivery.getDate() + expectedDays);
        
        const diffDays = Math.ceil((actual.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          statsMap[courier].early++;
        } else if (diffDays === 0) {
          statsMap[courier].onTime++;
        } else {
          statsMap[courier].late++;
          statsMap[courier].totalDelayDays += diffDays;
        }
      } else {
        statsMap[courier].pending++;
      }
    });

    const statsArray = Object.values(statsMap).map((stat: any) => ({
      ...stat,
      onTimeRate: stat.delivered > 0 ? Math.round(((stat.onTime + stat.early) / stat.delivered) * 100) : 0,
      avgDelay: stat.late > 0 ? (stat.totalDelayDays / stat.late).toFixed(1) : 0,
    }));

    // Sort: PostEx first, then Leopards, then others
    statsArray.sort((a: any, b: any) => {
      const order = ['PostEx', 'Leopards'];
      const aIndex = order.indexOf(a.name);
      const bIndex = order.indexOf(b.name);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

    setCourierStats(statsArray);
  };

  const testLeopardsTracking = async () => {
    toast.loading("Testing Leopards API...");
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('test-leopards-tracking');
      
      if (invokeError) {
        console.error('❌ Error calling test function:', invokeError);
        toast.error(`Test failed: ${invokeError.message}`);
        return;
      }

      console.log('\n=== LEOPARDS API TEST RESPONSE ===');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.success) {
        toast.success("✅ Test complete! Check browser console for full response.");
      } else {
        toast.error(`Test failed: ${data.error}`);
      }
    } catch (err) {
      console.error('❌ Test error:', err);
      toast.error('Failed to test Leopards API');
    }
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
      loadCourierStats();
    }

    setSyncing(false);
  };

  const updateCourierTracking = async () => {
    try {
      toast("Updating Tracking", {
        description: "Fetching latest delivery status from couriers...",
      });

      const { data, error } = await supabase.functions.invoke("update-courier-tracking");

      if (error) throw error;

      toast("Tracking Updated", {
        description: `${data.trackedCount} orders tracked, ${data.deliveredCount} delivered`,
      });

      loadOrders();
      loadStats();
      loadCourierStats();
    } catch (error: any) {
      toast("Tracking Update Failed", {
        description: error.message,
      });
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Orders Report', 14, 20);
      
      // Add date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      
      // Prepare table data
      const tableData = filteredOrders.map((order: any) => {
        const shippingAddress = order.shipping_address || {};
        const city = shippingAddress.city || 'N/A';
        
        const orderDate = order.created_at 
          ? new Date(order.created_at).toLocaleDateString('en-GB')
          : '—';
        
        const dispatchDate = order.dispatched_at
          ? new Date(order.dispatched_at).toLocaleDateString('en-GB')
          : '—';
        
        const items = Array.isArray(order.line_items) ? order.line_items : [];
        const productName = items.length > 0 
          ? items[0].name || 'N/A'
          : 'N/A';
        
        return [
          order.order_number,
          order.customer_name || 'N/A',
          orderDate,
          dispatchDate,
          city,
          order.courier_name || 'Not Assigned',
          `${items.length}x ${productName.substring(0, 30)}`,
          order.order_source || 'Organic',
          `${order.currency} ${order.total_price?.toLocaleString()}`,
          order.delivered_at ? 'Delivered' : order.fulfillment_status === 'fulfilled' ? 'Fulfilled' : 'Pending',
        ];
      });
      
      // Add table
      (doc as any).autoTable({
        startY: 35,
        head: [['Order #', 'Customer', 'Order Date', 'Dispatch', 'City', 'Courier', 'Items', 'Source', 'Total', 'Status']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      doc.save(`orders-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
    }
    
    setExporting(false);
  };

  const exportToExcel = async () => {
    setExporting(true);
    
    try {
      const excelData = filteredOrders.map((order: any) => {
        const shippingAddress = order.shipping_address || {};
        const city = shippingAddress.city || 'N/A';
        
        const orderDate = order.created_at 
          ? new Date(order.created_at).toLocaleDateString('en-GB')
          : '';
        
        const dispatchDate = order.dispatched_at
          ? new Date(order.dispatched_at).toLocaleDateString('en-GB')
          : '';
        
        let eta = '';
        let delayDays = '';
        
        if (order.dispatched_at) {
          const dispatch = new Date(order.dispatched_at);
          const isKarachi = city.toLowerCase().includes('karachi');
          const slaDays = isKarachi ? 2 : 5;
          
          const etaDate = new Date(dispatch);
          etaDate.setDate(etaDate.getDate() + slaDays);
          eta = etaDate.toLocaleDateString('en-GB');
          
          if (order.delivered_at) {
            const delivered = new Date(order.delivered_at);
            const diffTime = delivered.getTime() - etaDate.getTime();
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            delayDays = days < 0 ? `${Math.abs(days)}d Early` : days === 0 ? 'On-Time' : `${days}d Late`;
          }
        }
        
        const items = Array.isArray(order.line_items) ? order.line_items : [];
        const productName = items.length > 0 
          ? items[0].name || 'N/A'
          : 'N/A';
        
        return {
          'Order Number': order.order_number,
          'Customer Name': order.customer_name || '',
          'Customer Phone': order.customer_phone || '',
          'Order Date': orderDate,
          'Dispatch Date': dispatchDate,
          'City': city,
          'Courier': order.courier_name || 'Not Assigned',
          'Tracking Number': order.tracking_number || '',
          'Items': `${items.length}x ${productName}`,
          'Source': order.order_source || 'Organic',
          'Total': order.total_price,
          'Currency': order.currency,
          'Status': order.delivered_at ? 'Delivered' : order.fulfillment_status === 'fulfilled' ? 'Fulfilled' : 'Pending',
          'ETA (SLA)': eta,
          'Delay': delayDays,
        };
      });
      
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders');
      
      XLSX.writeFile(wb, `orders-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel');
    }
    
    setExporting(false);
  };

  const getCourierBadge = (courier: string | null) => {
    const normalizedCourier = normalizeCourierName(courier);
    
    if (!normalizedCourier) return { icon: "📮", color: "bg-gray-100 text-gray-800", text: "Not Assigned" };
    
    const courierMap: any = {
      "PostEx": { icon: "📦", color: "bg-blue-100 text-blue-800", text: "PostEx" },
      "Leopards": { icon: "🐆", color: "bg-orange-100 text-orange-800", text: "Leopards" },
      "TCS": { icon: "🚚", color: "bg-purple-100 text-purple-800", text: "TCS" },
      "BlueEx": { icon: "🔵", color: "bg-sky-100 text-sky-800", text: "BlueEx" },
      "Rider": { icon: "🏍️", color: "bg-green-100 text-green-800", text: "Rider" },
    };
    
    return courierMap[normalizedCourier] || { icon: "📮", color: "bg-gray-100 text-gray-800", text: normalizedCourier };
  };

  const getDeliveryPerformance = (order: any) => {
    if (!order.actual_delivery_date) {
      if (order.fulfillment_status === "fulfilled") {
        return { text: "In Transit", color: "bg-yellow-100 text-yellow-800", days: null, time: null };
      }
      return { text: "Pending", color: "bg-gray-100 text-gray-800", days: null, time: null };
    }

    const actual = new Date(order.actual_delivery_date);
    const dispatched = new Date(order.created_at);
    const shippingAddress = order.shipping_address as any;
    const city = shippingAddress?.city?.toLowerCase() || "";
    const isKarachi = city.includes("karachi");
    
    // Calculate expected delivery based on Karachi/outside criteria
    const expectedDays = isKarachi ? 2 : 5;
    const expectedDelivery = new Date(dispatched);
    expectedDelivery.setDate(expectedDelivery.getDate() + expectedDays);
    
    const diffDays = Math.ceil((actual.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24));
    
    // Format delivery time
    const deliveryTime = actual.toLocaleString('en-PK', { 
      timeZone: 'Asia/Karachi',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    const deliveryDate = formatPakistanDate(actual.toISOString());

    if (diffDays < 0) {
      return { 
        text: `⚡ Early (${Math.abs(diffDays)}d)`, 
        color: "bg-green-100 text-green-800", 
        days: diffDays,
        time: `${deliveryDate} ${deliveryTime}`
      };
    } else if (diffDays === 0) {
      return { 
        text: "✓ On-time", 
        color: "bg-green-100 text-green-800", 
        days: 0,
        time: `${deliveryDate} ${deliveryTime}`
      };
    } else {
      return { 
        text: `⏰ Delayed (+${diffDays}d)`, 
        color: "bg-red-100 text-red-800", 
        days: diffDays,
        time: `${deliveryDate} ${deliveryTime}`
      };
    }
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
          <div className="flex gap-2 items-center">
            <Select value={exportDays.toString()} onValueChange={(v) => setExportDays(parseInt(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="15">Last 15 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="60">Last 60 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={exportToPDF} disabled={exporting} variant="outline" className="hover:bg-red-50">
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
            
            <Button onClick={exportToExcel} disabled={exporting} variant="outline" className="hover:bg-green-50">
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </>
              )}
            </Button>
            
            <Button 
              onClick={testLeopardsTracking}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              🔍 Test Leopards API
            </Button>
            
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
            
            <Button onClick={updateCourierTracking} variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
              <Truck className="mr-2 h-4 w-4" />
              Update Tracking
            </Button>
          </div>
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

        {/* Courier Performance Cards */}
        {courierStats.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Courier Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {courierStats.map((courier) => (
                <Card key={courier.name}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <span className="text-2xl">{getCourierBadge(courier.name).icon}</span>
                      {courier.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Orders:</span>
                      <span className="font-semibold">{courier.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">On-Time Rate:</span>
                      <span className={`font-semibold ${courier.onTimeRate >= 80 ? 'text-green-600' : courier.onTimeRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {courier.onTimeRate}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t">
                      <div className="text-center">
                        <div className="text-green-600 font-semibold">{courier.early}</div>
                        <div className="text-muted-foreground">Early</div>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-600 font-semibold">{courier.onTime}</div>
                        <div className="text-muted-foreground">On-time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-red-600 font-semibold">{courier.late}</div>
                        <div className="text-muted-foreground">Late</div>
                      </div>
                    </div>
                    {courier.late > 0 && (
                      <div className="text-xs text-muted-foreground pt-2">
                        Avg Delay: {courier.avgDelay} days
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : orders.length === 0 ? (
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
              <Select value={courierFilter} onValueChange={setCourierFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Couriers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Couriers</SelectItem>
                  {courierStats.map((courier) => (
                    <SelectItem key={courier.name} value={courier.name}>
                      {courier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Deliveries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Deliveries</SelectItem>
                  <SelectItem value="delivered">Delivered Only</SelectItem>
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
                  <TableHead className="hidden md:table-cell">Order Date</TableHead>
                  <TableHead className="hidden md:table-cell">Dispatch Date</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Courier</TableHead>
                  <TableHead className="hidden lg:table-cell">Items</TableHead>
                  <TableHead className="hidden lg:table-cell">Source</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="hidden md:table-cell">SLA ETA</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead className="hidden md:table-cell">Performance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  // Extract city from shipping_address JSON
                  const shippingAddress = order.shipping_address || {};
                  const city = shippingAddress.city || 'N/A';
                  
                  // Format dates
                  const orderDate = order.created_at 
                    ? new Date(order.created_at).toLocaleDateString('en-GB')
                    : '—';
                  
                  const dispatchDate = order.dispatched_at
                    ? new Date(order.dispatched_at).toLocaleDateString('en-GB')
                    : '—';
                  
                  const deliveredDate = order.delivered_at
                    ? formatPakistanDateTime(order.delivered_at)
                    : '—';
                  
                  // Calculate ETA based on SLA (2 days Karachi, 5 days other)
                  let slaEta = '—';
                  let delayDays: number | null = null;
                  let delayDisplay = '';
                  
                  if (order.dispatched_at) {
                    const dispatch = new Date(order.dispatched_at);
                    const isKarachi = city.toLowerCase().includes('karachi');
                    const slaDays = isKarachi ? 2 : 5;
                    
                    // Calculate SLA ETA
                    const slaDate = new Date(dispatch);
                    slaDate.setDate(slaDate.getDate() + slaDays);
                    slaEta = slaDate.toLocaleDateString('en-GB');
                    
                    // Calculate delay if delivered
                    if (order.delivered_at) {
                      const delivered = new Date(order.delivered_at);
                      const diffTime = delivered.getTime() - slaDate.getTime();
                      delayDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      if (delayDays < 0) {
                        delayDisplay = `${Math.abs(delayDays)}d Early`;
                      } else if (delayDays === 0) {
                        delayDisplay = 'On-Time';
                      } else {
                        delayDisplay = `${delayDays}d Late`;
                      }
                    }
                  }
                  
                  // Get product name for hover
                  const items = Array.isArray(order.line_items) ? order.line_items : [];
                  const itemsText = items.map((item: any) => 
                    `${item.quantity}x ${item.name}`
                  ).join(', ');
                  const productName = items.length > 0 
                    ? items[0].name || 'N/A'
                    : 'N/A';
                  
                  const shortName = productName.length > 40 
                    ? productName.substring(0, 40) + '...'
                    : productName;
                  
                  const courierBadge = getCourierBadge(order.courier_name);
                  
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
                      <TableCell className="text-sm hidden md:table-cell">{orderDate}</TableCell>
                      <TableCell className="text-sm hidden md:table-cell">{dispatchDate}</TableCell>
                      <TableCell className="text-sm">{city}</TableCell>
                      <TableCell>
                        <Badge className={courierBadge.color}>
                          {courierBadge.icon} {courierBadge.text || order.courier_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="max-w-[200px] truncate cursor-help" title={itemsText}>
                          {items.length}x {shortName}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge className={getSourceColor(order.order_source || 'Organic')}>
                          {order.order_source || 'Organic'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatPKRCurrency(order.total_price)}</TableCell>
                      <TableCell className="text-sm hidden md:table-cell">{slaEta}</TableCell>
                      <TableCell className="text-sm font-medium">{deliveredDate}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {delayDisplay ? (
                          <div className="flex justify-center">
                            <Badge className={
                              delayDays! < 0 
                                ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-100'
                                : delayDays === 0
                                ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-100'
                                : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-100'
                            }>
                              {delayDisplay}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.fulfillment_status)}>
                          {order.fulfillment_status === 'fulfilled' ? 'Fulfilled' : 'Pending'}
                        </Badge>
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