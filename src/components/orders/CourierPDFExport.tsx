import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const CourierPDFExport = () => {
  const exportPDF = async () => {
    try {
      toast.info("Generating PDF report...");

      // Fetch all fulfilled orders with courier data
      const { data: orders, error } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('fulfillment_status', 'fulfilled')
        .not('courier_name', 'is', null);

      if (error) throw error;

      if (!orders || orders.length === 0) {
        toast.error("No fulfilled orders found");
        return;
      }

      // Calculate stats per courier
      const courierStats: { [key: string]: any } = {};

      orders.forEach(order => {
        const courier = order.courier_name || 'Unknown';
        if (!courierStats[courier]) {
          courierStats[courier] = {
            total: 0,
            onTime: 0,
            early: 0,
            delayed: 0,
            totalDelay: 0
          };
        }

        courierStats[courier].total++;

        if (order.actual_delivery_date && order.estimated_delivery_date) {
          const diffMs = new Date(order.actual_delivery_date).getTime() - new Date(order.estimated_delivery_date).getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            courierStats[courier].early++;
          } else if (diffDays === 0) {
            courierStats[courier].onTime++;
          } else {
            courierStats[courier].delayed++;
            courierStats[courier].totalDelay += diffDays;
          }
        }
      });

      // Find best performer
      let bestCourier = '';
      let bestRate = 0;
      Object.entries(courierStats).forEach(([courier, stats]: [string, any]) => {
        const rate = (stats.onTime + stats.early) / stats.total * 100;
        if (rate > bestRate) {
          bestRate = rate;
          bestCourier = courier;
        }
      });

      // Generate PDF
      const doc = new jsPDF();
      
      // Header with yellow background
      doc.setFillColor(249, 196, 0);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(29, 29, 29);
      doc.setFontSize(24);
      doc.text('Courier Performance Report', 105, 20, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });

      // Executive Summary
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.text('Executive Summary', 14, 50);
      doc.setFontSize(10);
      doc.text(`Total Fulfilled Orders: ${orders.length}`, 14, 60);
      doc.text(`Best Performer: ${bestCourier} (${bestRate.toFixed(1)}% on-time rate)`, 14, 67);

      // Performance Table
      const tableData = Object.entries(courierStats).map(([courier, stats]: [string, any]) => {
        const onTimeRate = ((stats.onTime + stats.early) / stats.total * 100).toFixed(1);
        const avgDelay = stats.delayed > 0 ? (stats.totalDelay / stats.delayed).toFixed(1) : '0';
        
        return [
          courier,
          stats.total,
          stats.early,
          stats.onTime,
          stats.delayed,
          `${onTimeRate}%`,
          `${avgDelay} days`
        ];
      });

      autoTable(doc, {
        startY: 75,
        head: [['Courier', 'Total', 'Early', 'On-Time', 'Delayed', 'On-Time Rate', 'Avg Delay']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [249, 196, 0],
          textColor: [29, 29, 29],
          fontStyle: 'bold'
        },
        columnStyles: {
          5: { 
            cellWidth: 30,
            fontStyle: 'bold'
          }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const rate = parseFloat(data.cell.text[0]);
            if (rate >= 90) {
              data.cell.styles.textColor = [0, 128, 0];
            } else if (rate >= 70) {
              data.cell.styles.textColor = [255, 165, 0];
            } else {
              data.cell.styles.textColor = [255, 0, 0];
            }
          }
        }
      });

      // Recommendations
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      doc.setFontSize(16);
      doc.text('Recommendations', 14, finalY + 15);
      doc.setFontSize(10);
      
      const recommendations = [
        `• Continue partnership with ${bestCourier} - highest performance`,
        '• Monitor delayed deliveries and investigate root causes',
        '• Consider implementing performance-based incentives',
        '• Review SLAs with couriers showing <80% on-time rate'
      ];

      recommendations.forEach((rec, i) => {
        doc.text(rec, 14, finalY + 25 + (i * 7));
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Boost Lifestyle - Courier Performance Analysis', 105, 285, { align: 'center' });

      // Save
      const filename = `Courier_Performance_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      
      toast.success("PDF report generated successfully");
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error(`Failed to generate PDF: ${error.message}`);
    }
  };

  return (
    <Button
      onClick={exportPDF}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <FileDown className="h-4 w-4" />
      Export PDF Report
    </Button>
  );
};
