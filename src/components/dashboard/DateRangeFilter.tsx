import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

interface DateRangeFilterProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

export const DateRangeFilter = ({ selectedRange, onRangeChange }: DateRangeFilterProps) => {
  const getTodayStart = () => {
    const today = new Date();
    const utc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
    return utc;
  };

  const getTodayEnd = () => {
    const today = new Date();
    const utc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));
    return utc;
  };

  const ranges: DateRange[] = [
    {
      start: getTodayStart(),
      end: getTodayEnd(),
      label: "Today"
    },
    {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
      label: "Last 24h"
    },
    {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
      label: "Last 7 Days"
    },
    {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(),
      label: "This Month"
    },
    {
      start: new Date(new Date().getFullYear(), 0, 1),
      end: new Date(),
      label: "This Year"
    }
  ];

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-medium">Select Time Period:</h3>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {ranges.map((range) => (
          <Button
            key={range.label}
            variant={selectedRange.label === range.label ? "default" : "outline"}
            size="sm"
            onClick={() => {
              console.log('📆 Date range selected:', range.label, range.start.toISOString(), range.end.toISOString());
              onRangeChange(range);
            }}
            className={selectedRange.label === range.label ? "bg-warning text-black hover:bg-warning/90" : ""}
          >
            {range.label}
          </Button>
        ))}
        <Button variant="outline" size="sm">
          Custom Date Range ▼
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        Selected: {selectedRange.label} ({format(selectedRange.start, 'MMM d, yyyy')} - {format(selectedRange.end, 'MMM d, yyyy')})
      </p>
    </div>
  );
};
