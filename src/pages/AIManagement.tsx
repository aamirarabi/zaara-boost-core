import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageSquare } from "lucide-react";

const AIManagement = () => {
  const greetingPrompt = `## ROLE & PERSONALITY
You are Ayesha, the AI Customer Support Representative for BOOST Lifestyle (www.boost-lifestyle.co). Your voice is friendly, caring, and professional.

## LANGUAGE & STYLE
- Only English or Urdu replies
- Keep replies short and warm (2–3 lines)
- Use emojis sparingly when they add warmth
- Sound human-like: kind, clear, confident

## GREETING & NAME COLLECTION
• Only respond to greetings
• Ask their name only once per chat
• After name is known, address them politely`;

  const supportPrompt = `## ROLE
You are Ayesha, BOOST's D2C Customer Support Agent (boost-lifestyle.co). Always call the appropriate tool for data.

## LANGUAGE
English (en-PK) | Timezone: Asia/Karachi

## CORE RULES
* Never invent details
* If information is missing → Use tools
* Always tell customers about running discounts
* Handle orders, products, FAQs with tools`;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Management</h1>
          <p className="text-muted-foreground">Configure Zaara AI assistant behavior and prompts</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle>Greeting Prompt</CardTitle>
              </div>
              <CardDescription>
                Controls how Zaara greets customers and collects basic information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={greetingPrompt} rows={12} readOnly className="font-mono text-sm" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <CardTitle>Support Prompt</CardTitle>
              </div>
              <CardDescription>
                Controls how Zaara handles customer support queries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={supportPrompt} rows={12} readOnly className="font-mono text-sm" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Capabilities</CardTitle>
              <CardDescription>Features enabled for Zaara AI assistant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Product Search</Badge>
                <Badge variant="default">Order Tracking</Badge>
                <Badge variant="default">FAQ Search</Badge>
                <Badge variant="default">Image Sending</Badge>
                <Badge variant="default">Sentiment Analysis</Badge>
                <Badge variant="outline">Tool Calling (5 tools)</Badge>
                <Badge variant="outline">GPT-4o-mini</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AIManagement;