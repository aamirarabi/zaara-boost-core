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
import { Search, Package, Clock, CheckCircle, TrendingUp, RefreshCw, RefreshCcw, Loader2, Truck, AlertCircle, FileDown, FileSpreadsheet, Download, BarChart3, FileText, Zap, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
    last24HoursTotal: 0,
    last24HoursFulfilled: 0,
    last24HoursPending: 0,
  });
  const [exportDays, setExportDays] = useState(15);
  const [exporting, setExporting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

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

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { count: last24HoursTotal } = await supabase
      .from("shopify_orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twentyFourHoursAgo.toISOString());

    const { count: last24HoursFulfilled } = await supabase
      .from("shopify_orders")
      .select("*", { count: "exact", head: true })
      .eq("fulfillment_status", "fulfilled")
      .gte("created_at", twentyFourHoursAgo.toISOString());

    const { count: last24HoursPending } = await supabase
      .from("shopify_orders")
      .select("*", { count: "exact", head: true })
      .or("fulfillment_status.is.null,fulfillment_status.eq.pending,fulfillment_status.eq.partial")
      .gte("created_at", twentyFourHoursAgo.toISOString());

    setStats({
      totalOrders: totalOrders || 0,
      pendingOrders: pendingOrders || 0,
      fulfilledOrders: fulfilledOrders || 0,
      thisMonthOrders: thisMonthOrders || 0,
      last24HoursTotal: last24HoursTotal || 0,
      last24HoursFulfilled: last24HoursFulfilled || 0,
      last24HoursPending: last24HoursPending || 0,
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

    // Fetch ALL orders in batches to avoid timeout
    console.log('Fetching courier data in batches...');
    const allOrders: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: batch, error } = await supabase
        .from("shopify_orders")
        .select("courier_name, delivered_at, scheduled_delivery_date")
        .not("courier_name", "is", null)
        .range(from, from + batchSize - 1);
        
      if (error) {
        console.error('Error fetching courier batch:', error);
        break;
      }
      
      if (!batch || batch.length === 0) {
        hasMore = false;
        break;
      }
      
      allOrders.push(...batch);
      console.log(`Fetched ${allOrders.length} orders so far...`);
      
      if (batch.length < batchSize) {
        hasMore = false; // Last batch
      }
      
      from += batchSize;
    }

    console.log(`Total courier data fetched: ${allOrders.length} orders`);
    const courierData = allOrders;

    if (!courierData || courierData.length === 0) return;

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
      if (order.delivered_at && order.scheduled_delivery_date) {
        statsMap[courier].delivered++;
        
        // Compare actual delivery date with scheduled delivery date (SLA ETA)
        const actualDelivery = new Date(order.delivered_at);
        const scheduledDelivery = new Date(order.scheduled_delivery_date);
        
        // Set both dates to midnight for fair day comparison
        actualDelivery.setHours(0, 0, 0, 0);
        scheduledDelivery.setHours(0, 0, 0, 0);
        
        // Calculate difference in days
        const diffDays = Math.ceil((actualDelivery.getTime() - scheduledDelivery.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          // Delivered before SLA ETA = Early
          statsMap[courier].early++;
        } else if (diffDays === 0) {
          // Delivered on SLA ETA = On-time
          statsMap[courier].onTime++;
        } else {
          // Delivered after SLA ETA = Late
          statsMap[courier].late++;
          statsMap[courier].totalDelayDays += diffDays;
        }
      } else {
        // No delivery date yet = Pending
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
        description: `Updated ${data.updatedCount || 0} orders (PostEx: ${data.postexCount || 0}, Leopards: ${data.leopardsCount || 0})`,
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

  const exportPerformanceReport = () => {
    setShowReportDialog(true);
  };

  const generatePerformanceReport = async (reportFormat: 'pdf' | 'excel' | 'both') => {
    setGeneratingReport(true);
    
    try {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const { data: reportOrders, error } = await supabase
        .from('shopify_orders')
        .select('*')
        .in('courier_name', ['PostEx', 'Leopards'])
        .eq('fulfillment_status', 'fulfilled')
        .gte('fulfilled_at', sixtyDaysAgo.toISOString())
        .not('delivered_at', 'is', null)
        .order('delivered_at', { ascending: false });
      
      if (error) throw error;
      
      // Calculate statistics
      const postexOrders = reportOrders.filter(o => o.courier_name === 'PostEx');
      const leopardsOrders = reportOrders.filter(o => o.courier_name === 'Leopards');
      
      const getStats = (courierOrders: any[]) => {
        let early = 0, onTime = 0, late = 0;
        const delays: number[] = [];
        
        courierOrders.forEach(order => {
          const shippingAddress = order.shipping_address || {};
          const isKarachi = shippingAddress.city?.toLowerCase().includes('karachi');
          const slaDays = isKarachi ? 2 : 5;
          
          if (order.fulfilled_at && order.delivered_at) {
            const dispatch = new Date(order.fulfilled_at);
            const slaDate = new Date(dispatch);
            slaDate.setDate(slaDate.getDate() + slaDays);
            
            const delivered = new Date(order.delivered_at);
            const deliveredDate = new Date(delivered.getFullYear(), delivered.getMonth(), delivered.getDate());
            const slaDateOnly = new Date(slaDate.getFullYear(), slaDate.getMonth(), slaDate.getDate());
            
            const diffTime = deliveredDate.getTime() - slaDateOnly.getTime();
            const delayDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            delays.push(delayDays);
            
            if (delayDays < 0) early++;
            else if (delayDays === 0) onTime++;
            else late++;
          }
        });
        
        const total = courierOrders.length;
        const onTimeRate = total > 0 ? Math.round(((early + onTime) / total) * 100) : 0;
        const avgDelay = delays.length > 0
          ? (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1)
          : '0.0';
        
        return { total, early, onTime, late, onTimeRate, avgDelay };
      };
      
      const stats = {
        postex: getStats(postexOrders),
        leopards: getStats(leopardsOrders),
        dateRange: {
          start: format(sixtyDaysAgo, 'dd MMM yyyy'),
          end: format(new Date(), 'dd MMM yyyy')
        }
      };
      
      if (reportFormat === 'pdf' || reportFormat === 'both') {
        await generatePDFReport(reportOrders, stats, sixtyDaysAgo);
      }
      
      if (reportFormat === 'excel' || reportFormat === 'both') {
        await generateExcelReport(reportOrders, stats, sixtyDaysAgo);
      }
      
      toast.success('Report generated successfully!');
      setShowReportDialog(false);
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const generatePDFReport = async (reportOrders: any[], stats: any, startDate: Date) => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // PAGE 1: EXECUTIVE SUMMARY
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, 297, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('COURIER PERFORMANCE REPORT', 148.5, 12, { align: 'center' } as any);
    
    doc.setFontSize(12);
    doc.text(`Period: ${stats.dateRange.start} to ${stats.dateRange.end} (60 Days)`, 148.5, 20, { align: 'center' } as any);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 148.5, 26, { align: 'center' } as any);
    
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'PostEx', 'Leopards']],
      body: [
        ['Total Orders', stats.postex.total, stats.leopards.total],
        ['On-Time Rate', `${stats.postex.onTimeRate}%`, `${stats.leopards.onTimeRate}%`],
        ['Early', stats.postex.early, stats.leopards.early],
        ['On-Time', stats.postex.onTime, stats.leopards.onTime],
        ['Late', stats.postex.late, stats.leopards.late],
        ['Avg Delay', `${stats.postex.avgDelay} days`, `${stats.leopards.avgDelay} days`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] }
    });
    
    // PAGE 2: POSTEX ORDERS
    const postexOrders = reportOrders.filter(o => o.courier_name === 'PostEx');
    if (postexOrders.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('PostEx Orders', 14, 15);
      
      const postexData = postexOrders.map(o => {
        const shippingAddress = o.shipping_address || {};
        return [
          o.order_number,
          o.customer_name?.substring(0, 20) || 'N/A',
          shippingAddress.city || 'N/A',
          o.fulfilled_at ? format(new Date(o.fulfilled_at), 'dd/MM/yy') : '',
          o.delivered_at ? format(new Date(o.delivered_at), 'dd/MM/yy') : '',
        ];
      });
      
      autoTable(doc, {
        startY: 20,
        head: [['Order #', 'Customer', 'City', 'Dispatch', 'Delivered']],
        body: postexData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [234, 88, 12] }
      });
    }
    
    // PAGE 3: LEOPARDS ORDERS
    const leopardsOrders = reportOrders.filter(o => o.courier_name === 'Leopards');
    if (leopardsOrders.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Leopards Orders', 14, 15);
      
      const leopardsData = leopardsOrders.map(o => {
        const shippingAddress = o.shipping_address || {};
        return [
          o.order_number,
          o.customer_name?.substring(0, 20) || 'N/A',
          shippingAddress.city || 'N/A',
          o.fulfilled_at ? format(new Date(o.fulfilled_at), 'dd/MM/yy') : '',
          o.delivered_at ? format(new Date(o.delivered_at), 'dd/MM/yy') : '',
        ];
      });
      
      autoTable(doc, {
        startY: 20,
        head: [['Order #', 'Customer', 'City', 'Dispatch', 'Delivered']],
        body: leopardsData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [220, 38, 38] }
      });
    }
    
    const fileName = `Courier_Performance_${format(startDate, 'ddMMMyyyy')}_to_${format(new Date(), 'ddMMMyyyy')}.pdf`;
    doc.save(fileName);
  };

  const generateExcelReport = async (reportOrders: any[], stats: any, startDate: Date) => {
    const wb = XLSX.utils.book_new();
    
    // Calculate performance stats
    const calculateStats = (orders: any[]) => {
      let early = 0, onTime = 0, oneDayLate = 0, twoPlusLate = 0;
      
      orders.forEach(o => {
        if (!o.scheduled_delivery_date || !o.delivered_at) return;
        
        const slaDate = new Date(o.scheduled_delivery_date);
        const deliveredDate = new Date(o.delivered_at);
        slaDate.setHours(0, 0, 0, 0);
        deliveredDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.round((deliveredDate.getTime() - slaDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) early++;
        else if (daysDiff === 0) onTime++;
        else if (daysDiff === 1) oneDayLate++;
        else twoPlusLate++;
      });
      
      const total = orders.length;
      const onTimeRate = total > 0 ? Math.round(((early + onTime) / total) * 100) : 0;
      
      return { total, early, onTime, oneDayLate, twoPlusLate, late: oneDayLate + twoPlusLate, onTimeRate };
    };
    
    const postexOrders = reportOrders.filter(o => o.courier_name === 'PostEx');
    const leopardsOrders = reportOrders.filter(o => o.courier_name === 'Leopards');
    const postexStats = calculateStats(postexOrders);
    const leopardsStats = calculateStats(leopardsOrders);
    
    // ===== SHEET 1: EXECUTIVE SUMMARY =====
    const summaryData = [
      ['📊 COURIER PERFORMANCE REPORT'],
      [`Period: ${stats.dateRange.start} to ${stats.dateRange.end} (60 Days)`],
      [`Generated: ${new Date().toLocaleString('en-GB')}`],
      [''],
      ['═══════════════════════════════════════════════════════════'],
      ['📦 60-DAY DELIVERY STATUS'],
      ['═══════════════════════════════════════════════════════════'],
      [''],
      ['Status', 'Count', 'Percentage', 'Rate'],
      ['Delivered ✅', stats60Days.delivered, `${stats60Days.deliveryRate}%`, stats60Days.deliveryRate >= 80 ? 'Excellent' : stats60Days.deliveryRate >= 70 ? 'Good' : 'Needs Improvement'],
      ['In Transit 🚚', stats60Days.inTransit, `${Math.round((stats60Days.inTransit / stats60Days.total) * 100)}%`, 'Active'],
      ['Returned 🔄', stats60Days.returned, `${stats60Days.returnRate}%`, stats60Days.returnRate <= 3 ? 'Good' : 'High'],
      ['Pending ⏳', stats60Days.pending, `${Math.round((stats60Days.pending / stats60Days.total) * 100)}%`, 'To Ship'],
      ['TOTAL', stats60Days.total, '100%', ''],
      [''],
      ['═══════════════════════════════════════════════════════════'],
      ['📮 COURIER COMPARISON'],
      ['═══════════════════════════════════════════════════════════'],
      [''],
      ['Metric', 'PostEx 📮', 'Leopards 🐆', 'Winner'],
      ['Total Orders', postexStats.total, leopardsStats.total, postexStats.total > leopardsStats.total ? 'PostEx' : 'Leopards'],
      ['On-Time Rate', `${postexStats.onTimeRate}%`, `${leopardsStats.onTimeRate}%`, postexStats.onTimeRate > leopardsStats.onTimeRate ? 'PostEx ✅' : 'Leopards ✅'],
      ['😄 Early Deliveries', postexStats.early, leopardsStats.early, postexStats.early > leopardsStats.early ? 'PostEx' : 'Leopards'],
      ['🙂 On-Time Deliveries', postexStats.onTime, leopardsStats.onTime, postexStats.onTime > leopardsStats.onTime ? 'PostEx' : 'Leopards'],
      ['😐 1 Day Late', postexStats.oneDayLate, leopardsStats.oneDayLate, postexStats.oneDayLate < leopardsStats.oneDayLate ? 'PostEx ✅' : 'Leopards ✅'],
      ['😠 2+ Days Late', postexStats.twoPlusLate, leopardsStats.twoPlusLate, postexStats.twoPlusLate < leopardsStats.twoPlusLate ? 'PostEx ✅' : 'Leopards ✅'],
      [''],
      ['KEY INSIGHTS'],
      [''],
      ['PostEx Performance', postexStats.onTimeRate >= 70 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT', `${postexStats.onTimeRate}% on-time rate`],
      ['Leopards Performance', leopardsStats.onTimeRate >= 70 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT', `${leopardsStats.onTimeRate}% on-time rate`],
      ['Recommended Courier', postexStats.onTimeRate > leopardsStats.onTimeRate ? 'PostEx 📮' : 'Leopards 🐆', `Better performance overall`],
    ];
    
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 35 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, '📊 Summary');
    
    // ===== SHEET 2: POSTEX DETAILED ORDERS =====
    const postexData = [
      [`📮 PostEx Orders - ${postexOrders.length} Total`],
      [`Performance: 😄 ${postexStats.early} Early | 🙂 ${postexStats.onTime} On-Time | 😐 ${postexStats.oneDayLate} 1d Late | 😠 ${postexStats.twoPlusLate} 2+ Late`],
      [`✅ On-Time Rate: ${postexStats.onTimeRate}%`],
      [''],
      ['Order Number', 'Customer Name', 'Phone', 'City', 'Product', 'Order Date', 'Dispatch Date', 'SLA Date', 'Delivered Date', '😊 Performance', 'Days', 'Status']
    ];
    
    postexOrders.forEach(order => {
      if (!order.scheduled_delivery_date || !order.delivered_at) return;
      
      const slaDate = new Date(order.scheduled_delivery_date);
      const deliveredDate = new Date(order.delivered_at);
      slaDate.setHours(0, 0, 0, 0);
      deliveredDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.round((deliveredDate.getTime() - slaDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let emoji = '🙂';
      let performance = 'On-Time';
      
      if (daysDiff < 0) {
        emoji = '😄';
        performance = `${Math.abs(daysDiff)}d Early`;
      } else if (daysDiff === 1) {
        emoji = '😐';
        performance = '1d Late';
      } else if (daysDiff > 1) {
        emoji = '😠';
        performance = `${daysDiff}d Late`;
      }
      
      postexData.push([
        order.order_number || 'N/A',
        order.customer_name || 'N/A',
        order.customer_phone || 'N/A',
        order.shipping_address?.city || 'N/A',
        order.line_items?.[0]?.title?.substring(0, 40) || 'N/A',
        new Date(order.created_at).toLocaleDateString('en-GB'),
        new Date(order.fulfilled_at).toLocaleDateString('en-GB'),
        slaDate.toLocaleDateString('en-GB'),
        deliveredDate.toLocaleDateString('en-GB'),
        `${emoji} ${performance}`,
        daysDiff,
        order.fulfillment_status
      ]);
    });
    
    const wsPostex = XLSX.utils.aoa_to_sheet(postexData);
    wsPostex['!cols'] = [
      { wch: 16 }, // Order #
      { wch: 22 }, // Customer
      { wch: 15 }, // Phone
      { wch: 15 }, // City
      { wch: 35 }, // Product
      { wch: 12 }, // Order Date
      { wch: 12 }, // Dispatch
      { wch: 12 }, // SLA
      { wch: 12 }, // Delivered
      { wch: 18 }, // Performance
      { wch: 8 },  // Days
      { wch: 12 }  // Status
    ];
    XLSX.utils.book_append_sheet(wb, wsPostex, '📮 PostEx Orders');
    
    // ===== SHEET 3: LEOPARDS DETAILED ORDERS =====
    const leopardsData = [
      [`🐆 Leopards Orders - ${leopardsOrders.length} Total`],
      [`Performance: 😄 ${leopardsStats.early} Early | 🙂 ${leopardsStats.onTime} On-Time | 😐 ${leopardsStats.oneDayLate} 1d Late | 😠 ${leopardsStats.twoPlusLate} 2+ Late`],
      [`✅ On-Time Rate: ${leopardsStats.onTimeRate}%`],
      [''],
      ['Order Number', 'Customer Name', 'Phone', 'City', 'Product', 'Order Date', 'Dispatch Date', 'SLA Date', 'Delivered Date', '😊 Performance', 'Days', 'Status']
    ];
    
    leopardsOrders.forEach(order => {
      if (!order.scheduled_delivery_date || !order.delivered_at) return;
      
      const slaDate = new Date(order.scheduled_delivery_date);
      const deliveredDate = new Date(order.delivered_at);
      slaDate.setHours(0, 0, 0, 0);
      deliveredDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.round((deliveredDate.getTime() - slaDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let emoji = '🙂';
      let performance = 'On-Time';
      
      if (daysDiff < 0) {
        emoji = '😄';
        performance = `${Math.abs(daysDiff)}d Early`;
      } else if (daysDiff === 1) {
        emoji = '😐';
        performance = '1d Late';
      } else if (daysDiff > 1) {
        emoji = '😠';
        performance = `${daysDiff}d Late`;
      }
      
      leopardsData.push([
        order.order_number || 'N/A',
        order.customer_name || 'N/A',
        order.customer_phone || 'N/A',
        order.shipping_address?.city || 'N/A',
        order.line_items?.[0]?.title?.substring(0, 40) || 'N/A',
        new Date(order.created_at).toLocaleDateString('en-GB'),
        new Date(order.fulfilled_at).toLocaleDateString('en-GB'),
        slaDate.toLocaleDateString('en-GB'),
        deliveredDate.toLocaleDateString('en-GB'),
        `${emoji} ${performance}`,
        daysDiff,
        order.fulfillment_status
      ]);
    });
    
    const wsLeopards = XLSX.utils.aoa_to_sheet(leopardsData);
    wsLeopards['!cols'] = wsPostex['!cols']; // Same column widths as PostEx
    XLSX.utils.book_append_sheet(wb, wsLeopards, '🐆 Leopards Orders');
    
    // Save file
    const fileName = `Courier_Performance_${format(startDate, 'ddMMMyyyy')}_to_${format(new Date(), 'ddMMMyyyy')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('📊 Professional Excel report generated!');
  };

  // Calculate 60-day delivery status - SIMPLIFIED & CORRECT
  const calculate60DayStats = () => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    // Get all orders from last 60 days
    const last60DaysOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= sixtyDaysAgo;
    });
    
    const total = last60DaysOrders.length;
    
    // DELIVERED: Has delivered_at date AND not cancelled
    const delivered = last60DaysOrders.filter((o: any) => {
      return o.delivered_at && !o.cancelled_at;
    }).length;
    
    // IN TRANSIT: Fulfilled but no delivered_at yet AND not cancelled
    const inTransit = last60DaysOrders.filter((o: any) => {
      return o.fulfillment_status === 'fulfilled' && 
             !o.delivered_at && 
             !o.cancelled_at;
    }).length;
    
    // PENDING: Not fulfilled yet AND not cancelled
    const pending = last60DaysOrders.filter((o: any) => {
      const isPending = !o.fulfillment_status || 
                        o.fulfillment_status === 'unfulfilled' || 
                        o.fulfillment_status === 'pending' ||
                        o.fulfillment_status === '';
      return isPending && !o.cancelled_at;
    }).length;
    
    // RETURNED: Has cancelled_at OR financial_status is refunded
    const returned = last60DaysOrders.filter((o: any) => {
      return o.cancelled_at || 
             o.financial_status === 'refunded' || 
             o.financial_status === 'partially_refunded';
    }).length;
    
    // Calculate rates
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const returnRate = total > 0 ? Math.round((returned / total) * 100) : 0;
    
    return {
      total,
      delivered,
      inTransit,
      pending,
      returned,
      deliveryRate,
      returnRate
    };
  };

  // Calculate 30-day order sources breakdown
  const calculate30DayOrderSources = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const last30DaysOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= thirtyDaysAgo;
    });
    
    const total = last30DaysOrders.length;
    
    // Count by source
    const facebook = last30DaysOrders.filter(o => o.order_source === 'Facebook').length;
    const instagram = last30DaysOrders.filter(o => o.order_source === 'Instagram').length;
    const tiktok = last30DaysOrders.filter(o => o.order_source === 'TikTok').length;
    const googleAds = last30DaysOrders.filter(o => o.order_source === 'Google Ads').length;
    const youtube = last30DaysOrders.filter(o => o.order_source === 'YouTube').length;
    const organic = last30DaysOrders.filter(o => !o.order_source || o.order_source === 'Organic' || o.order_source === '').length;
    
    return {
      total,
      facebook,
      instagram,
      tiktok,
      googleAds,
      youtube,
      organic,
      facebookPercent: total > 0 ? Math.round((facebook / total) * 100) : 0,
      instagramPercent: total > 0 ? Math.round((instagram / total) * 100) : 0,
      tiktokPercent: total > 0 ? Math.round((tiktok / total) * 100) : 0,
      googleAdsPercent: total > 0 ? Math.round((googleAds / total) * 100) : 0,
      youtubePercent: total > 0 ? Math.round((youtube / total) * 100) : 0,
      organicPercent: total > 0 ? Math.round((organic / total) * 100) : 0,
    };
  };

  const orderSources = calculate30DayOrderSources();
  const stats60Days = calculate60DayStats();

  const exportPerformanceToPDF = async () => {
    try {
      setExporting(true);
      toast.info('Generating PDF report...');
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - exportDays);
      
      // Filter orders for export period
      const exportOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= startDate && orderDate <= endDate;
      });
      
      const postexOrders = exportOrders.filter(o => o.courier_name === 'PostEx' && o.delivered_at && o.scheduled_delivery_date);
      const leopardsOrders = exportOrders.filter(o => o.courier_name === 'Leopards' && o.delivered_at && o.scheduled_delivery_date);
      
      // Calculate stats
      const calculateStatsForPDF = (courierOrders: any[]) => {
        let early = 0, onTime = 0, late = 0;
        
        courierOrders.forEach(o => {
          const slaDate = new Date(o.scheduled_delivery_date);
          const deliveredDate = new Date(o.delivered_at);
          slaDate.setHours(0, 0, 0, 0);
          deliveredDate.setHours(0, 0, 0, 0);
          
          const daysDiff = Math.round((deliveredDate.getTime() - slaDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff < 0) early++;
          else if (daysDiff === 0) onTime++;
          else late++;
        });
        
        const total = courierOrders.length;
        const onTimeRate = total > 0 ? Math.round(((early + onTime) / total) * 100) : 0;
        
        return { total, early, onTime, late, onTimeRate };
      };
      
      const postexStats = calculateStatsForPDF(postexOrders);
      const leopardsStats = calculateStatsForPDF(leopardsOrders);
      
      // Create PDF
      const doc = new jsPDF({ orientation: 'landscape' });
      
      // Header
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, 297, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('COURIER PERFORMANCE REPORT', 148.5, 12, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Period: ${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}`, 148.5, 19, { align: 'center' });
      
      // 60-Day Summary
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text('60-Day Delivery Status', 14, 35);
      
      autoTable(doc, {
        startY: 40,
        head: [['Status', 'Count', 'Percentage']],
        body: [
          ['Delivered', stats60Days.delivered, `${stats60Days.deliveryRate}%`],
          ['In Transit', stats60Days.inTransit, `${Math.round((stats60Days.inTransit / stats60Days.total) * 100)}%`],
          ['Returned', stats60Days.returned, `${stats60Days.returnRate}%`],
          ['Pending', stats60Days.pending, `${Math.round((stats60Days.pending / stats60Days.total) * 100)}%`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 }
      });
      
      // Courier Comparison
      const finalY = (doc as any).lastAutoTable.finalY || 80;
      doc.setFontSize(14);
      doc.text('Courier Performance Comparison', 14, finalY + 15);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Metric', 'PostEx', 'Leopards']],
        body: [
          ['Total Orders', postexStats.total, leopardsStats.total],
          ['On-Time Rate', `${postexStats.onTimeRate}%`, `${leopardsStats.onTimeRate}%`],
          ['Early', postexStats.early, leopardsStats.early],
          ['On-Time', postexStats.onTime, leopardsStats.onTime],
          ['Late', postexStats.late, leopardsStats.late],
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175] },
        styles: { fontSize: 10 }
      });
      
      // Save
      doc.save(`Courier_Performance_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.pdf`);
      
      toast.success('PDF report generated successfully!');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setExporting(false);
    }
  };

  const exportPerformanceToExcel = async () => {
    try {
      setExporting(true);
      toast.info('Generating Excel report...');
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - exportDays);
      
      // Filter orders
      const exportOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= startDate && orderDate <= endDate;
      });
      
      const postexOrders = exportOrders.filter(o => o.courier_name === 'PostEx' && o.delivered_at && o.scheduled_delivery_date);
      const leopardsOrders = exportOrders.filter(o => o.courier_name === 'Leopards' && o.delivered_at && o.scheduled_delivery_date);
      
      // Helper to calculate performance
      const getPerformanceText = (order: any) => {
        const slaDate = new Date(order.scheduled_delivery_date);
        const deliveredDate = new Date(order.delivered_at);
        slaDate.setHours(0, 0, 0, 0);
        deliveredDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.round((deliveredDate.getTime() - slaDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) return `😄 ${Math.abs(daysDiff)}d Early`;
        if (daysDiff === 0) return '🙂 On-Time';
        return `😠 ${daysDiff}d Late`;
      };
      
      // Calculate on-time rate
      const calculateOnTimeRate = (orders: any[]) => {
        let onTimeCount = 0;
        orders.forEach(o => {
          const slaDate = new Date(o.scheduled_delivery_date);
          const deliveredDate = new Date(o.delivered_at);
          slaDate.setHours(0, 0, 0, 0);
          deliveredDate.setHours(0, 0, 0, 0);
          if (deliveredDate.getTime() <= slaDate.getTime()) onTimeCount++;
        });
        return orders.length > 0 ? Math.round((onTimeCount / orders.length) * 100) : 0;
      };
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // ===== SHEET 1: SUMMARY =====
      const summaryData = [
        ['COURIER PERFORMANCE REPORT'],
        [`Period: ${startDate.toLocaleDateString('en-GB')} to ${endDate.toLocaleDateString('en-GB')}`],
        [`Generated: ${new Date().toLocaleString('en-GB')}`],
        [''],
        ['60-DAY DELIVERY STATUS'],
        [''],
        ['Status', 'Count', 'Percentage'],
        ['Delivered', stats60Days.delivered, `${stats60Days.deliveryRate}%`],
        ['In Transit', stats60Days.inTransit, `${Math.round((stats60Days.inTransit / stats60Days.total) * 100)}%`],
        ['Returned', stats60Days.returned, `${stats60Days.returnRate}%`],
        ['Pending', stats60Days.pending, `${Math.round((stats60Days.pending / stats60Days.total) * 100)}%`],
        ['Total', stats60Days.total, '100%'],
        [''],
        ['COURIER COMPARISON'],
        [''],
        ['Courier', 'Total Orders', 'On-Time Rate'],
        ['PostEx', postexOrders.length, `${calculateOnTimeRate(postexOrders)}%`],
        ['Leopards', leopardsOrders.length, `${calculateOnTimeRate(leopardsOrders)}%`],
      ];
      
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
      
      // ===== SHEET 2: POSTEX ORDERS =====
      const postexData = [
        [`PostEx Orders - ${postexOrders.length} Total`],
        [`On-Time Rate: ${calculateOnTimeRate(postexOrders)}%`],
        [''],
        ['Order #', 'Customer', 'City', 'Dispatch', 'SLA Date', 'Delivered', 'Performance']
      ];
      
      postexOrders.forEach(o => {
        postexData.push([
          o.order_number || 'N/A',
          o.customer_name || 'N/A',
          o.shipping_address?.city || 'N/A',
          new Date(o.fulfilled_at).toLocaleDateString('en-GB'),
          new Date(o.scheduled_delivery_date).toLocaleDateString('en-GB'),
          new Date(o.delivered_at).toLocaleDateString('en-GB'),
          getPerformanceText(o),
        ]);
      });
      
      const wsPostex = XLSX.utils.aoa_to_sheet(postexData);
      wsPostex['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 15 }, 
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, wsPostex, 'PostEx Orders');
      
      // ===== SHEET 3: LEOPARDS ORDERS =====
      const leopardsData = [
        [`Leopards Orders - ${leopardsOrders.length} Total`],
        [`On-Time Rate: ${calculateOnTimeRate(leopardsOrders)}%`],
        [''],
        ['Order #', 'Customer', 'City', 'Dispatch', 'SLA Date', 'Delivered', 'Performance']
      ];
      
      leopardsOrders.forEach(o => {
        leopardsData.push([
          o.order_number || 'N/A',
          o.customer_name || 'N/A',
          o.shipping_address?.city || 'N/A',
          new Date(o.fulfilled_at).toLocaleDateString('en-GB'),
          new Date(o.scheduled_delivery_date).toLocaleDateString('en-GB'),
          new Date(o.delivered_at).toLocaleDateString('en-GB'),
          getPerformanceText(o),
        ]);
      });
      
      const wsLeopards = XLSX.utils.aoa_to_sheet(leopardsData);
      wsLeopards['!cols'] = wsPostex['!cols'];
      XLSX.utils.book_append_sheet(wb, wsLeopards, 'Leopards Orders');
      
      // Save
      XLSX.writeFile(wb, `Courier_Performance_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.xlsx`);
      
      toast.success('Excel report generated successfully!');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to generate Excel report');
    } finally {
      setExporting(false);
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
            
            <Button onClick={async () => {
              setExporting(true);
              try {
                await exportPerformanceToExcel();
              } catch (error) {
                console.error('Excel export error:', error);
                toast.error('Failed to generate Excel report');
              } finally {
                setExporting(false);
              }
            }} disabled={exporting} variant="outline" className="hover:bg-green-50">
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

            <Button
              onClick={async () => {
                const confirmed = window.confirm(
                  'This will calculate scheduled delivery dates for all existing fulfilled orders (one-time operation). Continue?'
                )
                if (!confirmed) return
                
                toast.info('Backfilling scheduled dates... This may take 1-2 minutes.')
                
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  const response = await supabase.functions.invoke('backfill-scheduled-dates', {
                    headers: {
                      Authorization: `Bearer ${session?.access_token}`
                    }
                  })
                  
                  if (response.error) throw response.error
                  
                  const result = response.data
                  
                  if (result.success) {
                    toast.success(result.message)
                    // Reload stats
                    loadStats()
                    loadCourierStats()
                  } else {
                    toast.error('Backfill failed: ' + result.error)
                  }
                } catch (error) {
                  console.error('Backfill error:', error)
                  toast.error('Failed to backfill dates')
                }
              }}
              variant="outline"
              className="border-purple-500 text-purple-600 hover:bg-purple-50"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Backfill Dates (One-time)
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.last24HoursTotal}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span className="text-green-600 font-medium">{stats.last24HoursFulfilled} fulfilled</span>
                <span className="text-orange-600 font-medium">{stats.last24HoursPending} pending</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two-Column Layout: 60-Day Stats + Order Sources */}
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* LEFT: 60-Day Delivery Status (60% width = 3 columns) */}
          <div className="lg:col-span-3">
            <Card className="border-2 border-blue-500 shadow-xl bg-gradient-to-br from-blue-50 to-purple-50 h-full">
              <CardHeader className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">
                        Last 60 Days Delivery Status
                      </CardTitle>
                      <p className="text-xs text-blue-100 mt-1">
                        📅 {new Date(new Date().setDate(new Date().getDate() - 60)).toLocaleDateString('en-GB')} → {new Date().toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                    <div className="text-xs text-blue-100">TOTAL</div>
                    <div className="text-2xl font-bold">{stats60Days.total}</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Delivered */}
                  <div className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-green-50 opacity-50 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                    <div className="relative text-center p-3 border-2 border-green-300 rounded-xl hover:border-green-500 transition-all hover:shadow-lg hover:scale-105 transform duration-200">
                      <div className="text-3xl mb-2">📦</div>
                      <div className="text-2xl font-bold text-green-700 mb-1">
                        {stats60Days.delivered}
                      </div>
                      <div className="text-xs font-semibold text-green-900 mb-1">
                        DELIVERED
                      </div>
                      <Badge className="bg-green-600 text-white text-xs px-2 py-0.5 font-bold">
                        {stats60Days.deliveryRate}%
                      </Badge>
                    </div>
                  </div>
                  
                  {/* In Transit */}
                  <div className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-blue-50 opacity-50 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                    <div className="relative text-center p-3 border-2 border-blue-300 rounded-xl hover:border-blue-500 transition-all hover:shadow-lg hover:scale-105 transform duration-200">
                      <div className="text-3xl mb-2">🚚</div>
                      <div className="text-2xl font-bold text-blue-700 mb-1">
                        {stats60Days.inTransit}
                      </div>
                      <div className="text-xs font-semibold text-blue-900 mb-1">
                        IN TRANSIT
                      </div>
                      <Badge variant="outline" className="border-2 border-blue-600 text-blue-700 text-xs px-2 py-0.5 font-bold">
                        {Math.round((stats60Days.inTransit / stats60Days.total) * 100)}%
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Returned */}
                  <div className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-red-50 opacity-50 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                    <div className="relative text-center p-3 border-2 border-red-300 rounded-xl hover:border-red-500 transition-all hover:shadow-lg hover:scale-105 transform duration-200">
                      <div className="text-3xl mb-2">🔄</div>
                      <div className="text-2xl font-bold text-red-700 mb-1">
                        {stats60Days.returned}
                      </div>
                      <div className="text-xs font-semibold text-red-900 mb-1">
                        RETURNED
                      </div>
                      <Badge variant="destructive" className="text-xs px-2 py-0.5 font-bold">
                        {stats60Days.returnRate}%
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Pending */}
                  <div className="group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-50 opacity-50 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                    <div className="relative text-center p-3 border-2 border-orange-300 rounded-xl hover:border-orange-500 transition-all hover:shadow-lg hover:scale-105 transform duration-200">
                      <div className="text-3xl mb-2">⏳</div>
                      <div className="text-2xl font-bold text-orange-700 mb-1">
                        {stats60Days.pending}
                      </div>
                      <div className="text-xs font-semibold text-orange-900 mb-1">
                        PENDING
                      </div>
                      <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5 font-bold">
                        {Math.round((stats60Days.pending / stats60Days.total) * 100)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* RIGHT: Order Sources Last 30 Days (40% width = 2 columns) */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-purple-500 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50 h-full">
              <CardHeader className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">
                        Order Sources
                      </CardTitle>
                      <p className="text-xs text-purple-100 mt-1">
                        📅 Last 30 Days
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                    <div className="text-xs text-purple-100">TOTAL</div>
                    <div className="text-2xl font-bold">{orderSources.total}</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4">
                {/* Donut Chart Visual */}
                <div className="relative w-full aspect-square max-w-[200px] mx-auto mb-4">
                  {/* Donut segments */}
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="20"/>
                    {/* Facebook - Blue */}
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="#1877f2" 
                      strokeWidth="20"
                      strokeDasharray={`${orderSources.facebookPercent * 2.51} 251`}
                      strokeDashoffset="0"
                      className="transition-all duration-500"
                    />
                    {/* Instagram - Pink */}
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="#e4405f" 
                      strokeWidth="20"
                      strokeDasharray={`${orderSources.instagramPercent * 2.51} 251`}
                      strokeDashoffset={`-${orderSources.facebookPercent * 2.51}`}
                      className="transition-all duration-500"
                    />
                    {/* TikTok - Black */}
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="#000000" 
                      strokeWidth="20"
                      strokeDasharray={`${orderSources.tiktokPercent * 2.51} 251`}
                      strokeDashoffset={`-${(orderSources.facebookPercent + orderSources.instagramPercent) * 2.51}`}
                      className="transition-all duration-500"
                    />
                    {/* Google Ads - Red */}
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="#ea4335" 
                      strokeWidth="20"
                      strokeDasharray={`${orderSources.googleAdsPercent * 2.51} 251`}
                      strokeDashoffset={`-${(orderSources.facebookPercent + orderSources.instagramPercent + orderSources.tiktokPercent) * 2.51}`}
                      className="transition-all duration-500"
                    />
                    {/* YouTube - Red */}
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="#ff0000" 
                      strokeWidth="20"
                      strokeDasharray={`${orderSources.youtubePercent * 2.51} 251`}
                      strokeDashoffset={`-${(orderSources.facebookPercent + orderSources.instagramPercent + orderSources.tiktokPercent + orderSources.googleAdsPercent) * 2.51}`}
                      className="transition-all duration-500"
                    />
                    {/* Organic - Gray */}
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="none" 
                      stroke="#6b7280" 
                      strokeWidth="20"
                      strokeDasharray={`${orderSources.organicPercent * 2.51} 251`}
                      strokeDashoffset={`-${(orderSources.facebookPercent + orderSources.instagramPercent + orderSources.tiktokPercent + orderSources.googleAdsPercent + orderSources.youtubePercent) * 2.51}`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">{orderSources.total}</div>
                      <div className="text-xs text-gray-500">Orders</div>
                    </div>
                  </div>
                </div>
                
                {/* Source Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#1877f2]"></div>
                      <span className="font-medium">Facebook</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{orderSources.facebook}</span>
                      <Badge className="bg-blue-100 text-blue-800 text-[10px]">{orderSources.facebookPercent}%</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#e4405f]"></div>
                      <span className="font-medium">Instagram</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{orderSources.instagram}</span>
                      <Badge className="bg-pink-100 text-pink-800 text-[10px]">{orderSources.instagramPercent}%</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-black"></div>
                      <span className="font-medium">TikTok</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{orderSources.tiktok}</span>
                      <Badge className="bg-gray-100 text-gray-800 text-[10px]">{orderSources.tiktokPercent}%</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#ea4335]"></div>
                      <span className="font-medium">Google Ads</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{orderSources.googleAds}</span>
                      <Badge className="bg-red-100 text-red-800 text-[10px]">{orderSources.googleAdsPercent}%</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#ff0000]"></div>
                      <span className="font-medium">YouTube</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{orderSources.youtube}</span>
                      <Badge className="bg-red-100 text-red-800 text-[10px]">{orderSources.youtubePercent}%</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                      <span className="font-medium">Organic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{orderSources.organic}</span>
                      <Badge className="bg-gray-100 text-gray-800 text-[10px]">{orderSources.organicPercent}%</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
                    
                    {/* Mini Bar Chart */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-end justify-between gap-1 h-16">
                        {/* Early Bar */}
                        <div className="flex-1 flex flex-col items-center group">
                          <div 
                            className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t hover:from-green-600 hover:to-green-500 transition-all"
                            style={{ height: `${courier.early > 0 ? Math.max((courier.early / courier.total) * 100, 10) : 0}%` }}
                          />
                          <div className="text-[10px] font-bold text-green-700 mt-1">{courier.early}</div>
                          <div className="text-[8px] text-gray-500">😄 Early</div>
                        </div>
                        
                        {/* On-Time Bar */}
                        <div className="flex-1 flex flex-col items-center group">
                          <div 
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-600 hover:to-blue-500 transition-all"
                            style={{ height: `${courier.onTime > 0 ? Math.max((courier.onTime / courier.total) * 100, 10) : 0}%` }}
                          />
                          <div className="text-[10px] font-bold text-blue-700 mt-1">{courier.onTime}</div>
                          <div className="text-[8px] text-gray-500">🙂 On-Time</div>
                        </div>
                        
                        {/* Late Bar */}
                        <div className="flex-1 flex flex-col items-center group">
                          <div 
                            className="w-full bg-gradient-to-t from-red-500 to-red-400 rounded-t hover:from-red-600 hover:to-red-500 transition-all"
                            style={{ height: `${courier.late > 0 ? Math.max((courier.late / courier.total) * 100, 10) : 0}%` }}
                          />
                          <div className="text-[10px] font-bold text-red-700 mt-1">{courier.late}</div>
                          <div className="text-[8px] text-gray-500">😠 Late</div>
                        </div>
                      </div>
                      <div className="text-[9px] text-center text-gray-500 mt-2 font-medium">
                        Performance Breakdown
                      </div>
                    </div>
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
            <Card className="mb-4 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
              <CardContent className="py-4">
                <div className="flex items-center gap-6 text-sm flex-wrap">
                  <span className="font-bold text-gray-800 flex items-center gap-2">
                    📅 Date Columns:
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                    <span className="text-blue-700 font-medium">SLA ETA (Our Promise)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                    <span className="text-green-700 font-medium">Delivered (Actual)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span className="text-gray-600">Not Available</span>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                  <TableHead className="hidden md:table-cell text-blue-700 font-semibold">SLA ETA</TableHead>
                  <TableHead className="text-green-700 font-semibold">Delivered</TableHead>
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
                    
                    // Calculate delay if delivered (compare dates only, ignore time)
                    if (order.delivered_at) {
                      const delivered = new Date(order.delivered_at);
                      
                      // Reset both dates to midnight for pure date comparison
                      const deliveredDate = new Date(delivered.getFullYear(), delivered.getMonth(), delivered.getDate());
                      const slaDateOnly = new Date(slaDate.getFullYear(), slaDate.getMonth(), slaDate.getDate());
                      
                      // Calculate difference in days
                      const diffTime = deliveredDate.getTime() - slaDateOnly.getTime();
                      delayDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                      
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
                      <TableCell className="text-sm hidden md:table-cell text-blue-700 font-medium">
                        {order.scheduled_delivery_date 
                          ? formatPakistanDate(order.scheduled_delivery_date)
                          : slaEta}
                      </TableCell>
                      <TableCell className={`text-sm font-medium ${order.delivered_at ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
                        {deliveredDate}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {delayDisplay ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {delayDays! < 0 ? '😄' : delayDays === 0 ? '🙂' : delayDays === 1 ? '😐' : '😠'}
                            </span>
                            <Badge className={
                              delayDays! < 0 
                                ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-100'
                                : delayDays === 0
                                ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-100'
                                : delayDays === 1
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100'
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