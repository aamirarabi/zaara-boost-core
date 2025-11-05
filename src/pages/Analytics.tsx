import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatPakistanDate } from "@/lib/utils";

const Analytics = () => {
  const [messageData, setMessageData] = useState<any[]>([]);
  const [topFAQs, setTopFAQs] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    // Load message analytics
    const { data: analytics } = await supabase
      .from("message_analytics")
      .select("*")
      .order("date", { ascending: true })
      .limit(30);

    if (analytics) {
      setMessageData(
        analytics.map((a) => ({
          date: formatPakistanDate(a.date),
          inbound: a.inbound_count,
          outbound: a.outbound_count,
          zaara: a.zaara_handled,
          human: a.human_handled,
        }))
      );
    }

    // Load top FAQs
    const { data: faqs } = await supabase
      .from("faq_vectors")
      .select("question, usage_count")
      .order("usage_count", { ascending: false })
      .limit(10);

    if (faqs) setTopFAQs(faqs);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Insights into your business performance</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Volume (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={messageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="inbound" stroke="#F9C400" strokeWidth={2} name="Inbound" />
                  <Line type="monotone" dataKey="outbound" stroke="#1D1D1D" strokeWidth={2} name="Outbound" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Handling (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={messageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="zaara" fill="#F9C400" name="Zaara AI" />
                  <Bar dataKey="human" fill="#1D1D1D" name="Human" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top 10 Most Used FAQs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topFAQs.map((faq, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-secondary flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{faq.question}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Used {faq.usage_count} times</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;