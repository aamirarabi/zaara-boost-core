import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface QuickRepliesProps {
  onSelectReply: (text: string) => void;
}

const TEMPLATES = [
  {
    label: "Greeting",
    text: "السلام علیکم! Thank you for contacting Boost Lifestyle. How can I help you today?"
  },
  {
    label: "Order Status",
    text: "Let me check your order status for you. Please give me a moment."
  },
  {
    label: "Delivery Time",
    text: "Standard delivery takes 2-3 business days for Karachi and 3-5 days for other cities."
  },
  {
    label: "Product Info",
    text: "I'd be happy to provide more details about this product. What would you like to know?"
  },
  {
    label: "Return Policy",
    text: "We offer 7-day returns for unused items in original packaging. Warranty varies by product."
  },
  {
    label: "Payment Methods",
    text: "We accept Cash on Delivery (COD), Bank Transfer, and Online Payment."
  },
  {
    label: "Thank You",
    text: "Thank you for your patience! Is there anything else I can help you with?"
  },
  {
    label: "Escalate",
    text: "Let me connect you with our senior support team for better assistance."
  }
];

export const QuickReplies = ({ onSelectReply }: QuickRepliesProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-t bg-gray-50 p-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between mb-2"
      >
        <span className="text-sm font-semibold">Quick Replies</span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isExpanded && (
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((template, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => {
                onSelectReply(template.text);
                setIsExpanded(false);
              }}
              className="text-xs justify-start"
            >
              {template.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
