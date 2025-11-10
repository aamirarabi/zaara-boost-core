import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChatMetrics {
  activeChats: number;
  waitingChats: number;
  escalatedChats: number;
  todayMessages: number;
  avgResponseTime: string;
  peakHour: string;
}

export const RealTimeChatAnalytics = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<ChatMetrics>({
    activeChats: 0,
    waitingChats: 0,
    escalatedChats: 0,
    todayMessages: 0,
    avgResponseTime: "—",
    peakHour: "—"
  });

  const loadMetrics = async () => {
    try {
      // Active chats (last message within 5 min)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: activeData } = await supabase
        .from('conversation_context')
        .select('phone_number')
        .gte('last_message_at', fiveMinAgo);

      // Waiting chats
      const { data: waitingData } = await supabase
        .from('conversation_context')
        .select('phone_number')
        .eq('status', 'waiting');

      // Escalated chats
      const { data: escalatedData } = await supabase
        .from('conversation_context')
        .select('phone_number')
        .eq('escalated', true)
        .eq('resolved', false);

      // Today's messages
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayData } = await supabase
        .from('chat_history')
        .select('id')
        .gte('created_at', todayStart.toISOString());

      // Avg response time
      const { data: responseData } = await supabase
        .from('chat_history')
        .select('response_time_seconds')
        .not('response_time_seconds', 'is', null)
        .gte('created_at', todayStart.toISOString());

      let avgTime = "—";
      if (responseData && responseData.length > 0) {
        const total = responseData.reduce((sum, r) => sum + (r.response_time_seconds || 0), 0);
        const avg = Math.round(total / responseData.length);
        avgTime = avg < 60 ? `${avg}s` : `${Math.round(avg / 60)}m`;
      }

      // Peak hour
      const { data: hourlyData } = await supabase
        .from('chat_history')
        .select('created_at')
        .gte('created_at', todayStart.toISOString());

      let peakHour = "—";
      if (hourlyData && hourlyData.length > 0) {
        const hourCounts: { [key: number]: number } = {};
        hourlyData.forEach(m => {
          const hour = new Date(m.created_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const maxHour = Object.entries(hourCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        peakHour = `${maxHour}:00`;
      }

      setMetrics({
        activeChats: activeData?.length || 0,
        waitingChats: waitingData?.length || 0,
        escalatedChats: escalatedData?.length || 0,
        todayMessages: todayData?.length || 0,
        avgResponseTime: avgTime,
        peakHour: peakHour
      });
    } catch (error) {
      console.error('Error loading chat metrics:', error);
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 30000);

    // Real-time subscription
    const channel = supabase
      .channel('chat-analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_history' }, () => {
        loadMetrics();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="bg-gradient-to-br from-green-500/10 via-blue-500/5 to-purple-500/10 backdrop-blur-lg border border-gray-100 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Real-Time Chat Analytics
          </span>
          <span className="flex items-center gap-2 text-xs font-normal text-green-600">
            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            Live
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 animate-pulse">
              {metrics.activeChats}
            </div>
            <div className="text-xs text-muted-foreground">Active Chats</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {metrics.waitingChats}
            </div>
            <div className="text-xs text-muted-foreground">Waiting</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {metrics.escalatedChats}
            </div>
            <div className="text-xs text-muted-foreground">Escalated</div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="text-sm font-semibold">{metrics.todayMessages}</div>
            <div className="text-xs text-muted-foreground">Today's Messages</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              {metrics.avgResponseTime}
            </div>
            <div className="text-xs text-muted-foreground">Avg Response</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {metrics.peakHour}
            </div>
            <div className="text-xs text-muted-foreground">Peak Hour</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={() => navigate('/inbox')}
            size="sm" 
            className="flex-1 bg-gradient-to-r from-boost-yellow to-boost-amber hover:from-boost-amber hover:to-boost-gold text-boost-black font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            View Inbox
          </Button>
          <Button 
            onClick={() => navigate('/inbox?filter=escalated')}
            size="sm" 
            variant="outline"
            className="flex-1"
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Handle Escalated
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
