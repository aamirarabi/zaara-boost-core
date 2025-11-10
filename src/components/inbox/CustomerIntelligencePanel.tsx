import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { User, Tag, FileText, ShoppingBag, TrendingUp, Star, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface CustomerIntelligencePanelProps {
  phoneNumber: string;
}

export const CustomerIntelligencePanel = ({ phoneNumber }: CustomerIntelligencePanelProps) => {
  const [customer, setCustomer] = useState<any>(null);
  const [sentiment, setSentiment] = useState<{ label: string; emoji: string; score: number }>({
    label: "Neutral",
    emoji: "😐",
    score: 50
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [newTag, setNewTag] = useState("");
  const [orderStats, setOrderStats] = useState({ total: 0, totalSpent: 0, avgOrder: 0 });

  useEffect(() => {
    if (phoneNumber) {
      loadCustomerData();
    }
  }, [phoneNumber]);

  const loadCustomerData = async () => {
    try {
      // Load customer profile
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (customerData) {
        setCustomer(customerData);
      }

      // Load sentiment
      const { data: sentimentData } = await supabase
        .from('chat_history')
        .select('sentiment_score')
        .eq('phone_number', phoneNumber)
        .not('sentiment_score', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sentimentData && sentimentData.length > 0) {
        const avgScore = sentimentData.reduce((sum, s) => sum + (parseFloat(String(s.sentiment_score)) || 0), 0) / sentimentData.length;
        const normalizedScore = Math.round(avgScore * 100);
        let label = "Neutral", emoji = "😐";
        if (normalizedScore > 60) {
          label = "Positive";
          emoji = "😊";
        } else if (normalizedScore < 40) {
          label = "Negative";
          emoji = "😟";
        }
        setSentiment({ label, emoji, score: normalizedScore });
      }

      // Load orders
      const { data: ordersData } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('customer_phone', phoneNumber)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersData) {
        setOrders(ordersData);
        const total = ordersData.length;
        const totalSpent = ordersData.reduce((sum, o) => sum + (parseFloat(String(o.total_price)) || 0), 0);
        setOrderStats({
          total,
          totalSpent,
          avgOrder: total > 0 ? totalSpent / total : 0
        });
      }

      // Load tags
      const { data: tagsData } = await supabase
        .from('customer_tags')
        .select('tag')
        .eq('phone_number', phoneNumber);

      if (tagsData) {
        setTags(tagsData.map(t => t.tag));
      }

      // Load notes
      const { data: notesData } = await supabase
        .from('customer_notes')
        .select('note')
        .eq('phone_number', phoneNumber)
        .single();

      if (notesData) {
        setNotes(notesData.note);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    try {
      const { error } = await supabase
        .from('customer_tags')
        .insert({ phone_number: phoneNumber, tag: newTag.trim() });

      if (error) throw error;

      setTags([...tags, newTag.trim()]);
      setNewTag("");
      toast.success("Tag added");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      const { error } = await supabase
        .from('customer_tags')
        .delete()
        .eq('phone_number', phoneNumber)
        .eq('tag', tag);

      if (error) throw error;

      setTags(tags.filter(t => t !== tag));
      toast.success("Tag removed");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSaveNotes = async () => {
    try {
      const { error } = await supabase
        .from('customer_notes')
        .upsert({ 
          phone_number: phoneNumber, 
          note: notes,
          created_by: 'admin'
        });

      if (error) throw error;

      toast.success("Notes saved");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Customer Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <div className="font-semibold">{customer?.customer_name || phoneNumber}</div>
            <div className="text-sm text-muted-foreground">{phoneNumber}</div>
            {customer?.email && (
              <div className="text-sm text-muted-foreground">{customer.email}</div>
            )}
          </div>
          {customer?.created_at && (
            <div className="text-xs text-muted-foreground">
              Customer since {new Date(customer.created_at).toLocaleDateString()}
            </div>
          )}
          {customer?.vip && (
            <Badge className="bg-boost-yellow text-boost-black">
              <Star className="h-3 w-3 mr-1" />
              VIP
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Sentiment Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{sentiment.emoji}</span>
            <Badge
              variant={sentiment.label === "Positive" ? "default" : sentiment.label === "Negative" ? "destructive" : "secondary"}
            >
              {sentiment.label}
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                sentiment.label === "Positive" ? "bg-green-500" : sentiment.label === "Negative" ? "bg-red-500" : "bg-gray-400"
              }`}
              style={{ width: `${sentiment.score}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Order Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Order Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">Total Orders</div>
              <div className="font-semibold">{orderStats.total}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Spent</div>
              <div className="font-semibold">Rs. {orderStats.totalSpent.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Order</div>
              <div className="font-semibold">Rs. {orderStats.avgOrder.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Order</div>
              <div className="font-semibold text-xs">
                {customer?.last_order_date ? formatDistanceToNow(new Date(customer.last_order_date), { addSuffix: true }) : "—"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[250px] overflow-y-auto space-y-2">
          {orders.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">No orders yet</div>
          ) : (
            orders.map(order => (
              <div
                key={order.order_id}
                className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-xs"
                onClick={() => window.open(`/orders?id=${order.order_id}`, '_blank')}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">#{order.order_number}</span>
                  <Badge variant="outline" className="text-xs">
                    {order.fulfillment_status || 'pending'}
                  </Badge>
                </div>
                <div className="text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()} • Rs. {parseFloat(order.total_price).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Customer Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                  onClick={() => handleRemoveTag(tag)}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="text-sm"
            />
            <Button size="sm" onClick={handleAddTag}>Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Internal Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="Add internal notes about this customer..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[100px] text-sm"
          />
          <Button size="sm" onClick={handleSaveNotes} className="w-full">
            Save Notes
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            Create New Order
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            Escalate to Manager
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start">
            Mark as VIP
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
