import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Copy, Check } from "lucide-react";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const [showWebhook, setShowWebhook] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [syncingCustomers, setSyncingCustomers] = useState(false);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>("");
  const [settings, setSettings] = useState({
    whatsapp_phone_id: "",
    whatsapp_access_token: "",
    whatsapp_business_account_id: "",
    whatsapp_phone_number: "923288981133",
    openai_api_key: "",
    shopify_store_url: "boost-lifestyle.myshopify.com",
    shopify_access_token: "",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase.from("system_settings").select("*");
    if (data) {
      const settingsObj: any = {};
      data.forEach((item) => {
        settingsObj[item.setting_key] = item.setting_value || "";
      });
      setSettings(settingsObj);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const updates = Object.entries(settings).map(([key, value]) => ({
      setting_key: key,
      setting_value: value,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("system_settings").upsert(updates);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved successfully!");
      setShowWebhook(true);
    }
    setLoading(false);
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
  const verifyToken = "boost_webhook_verify_2025_secure";

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(""), 2000);
  };

  const syncProducts = async () => {
    setSyncingProducts(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-products');
      if (error) {
        toast.error(error.message || "Failed to sync products");
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`✅ ${data.message} in ${data.duration}`);
      }
    } catch (error) {
      toast.error("Error syncing products");
    }
    setSyncingProducts(false);
  };

  const syncCustomers = async () => {
    setSyncingCustomers(true);
    setSyncProgress("Starting customer sync... This may take 5-8 minutes for large catalogs.");
    
    // Start the sync (this will run in background)
    supabase.functions.invoke('sync-shopify-customers')
      .then(({ data, error }) => {
        setSyncingCustomers(false);
        setSyncProgress("");
        if (error) {
          toast.error(error.message || "Failed to sync customers");
        } else if (data?.error) {
          toast.error(data.error);
        } else {
          toast.success(`✅ ${data.message} in ${data.duration}`);
        }
      })
      .catch((error) => {
        setSyncingCustomers(false);
        setSyncProgress("");
        toast.error("Error syncing customers");
      });

    // Poll for progress every 3 seconds
    const progressInterval = setInterval(async () => {
      const { data: customers } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true });
      
      if (customers !== null) {
        setSyncProgress(`Syncing customers... ${customers || 0} customers synced so far. Please wait...`);
      }
    }, 3000);

    // Clear interval after 10 minutes max
    setTimeout(() => clearInterval(progressInterval), 600000);
  };

  const syncOrders = async () => {
    setSyncingOrders(true);
    setSyncProgress("Starting order sync... This may take 5-8 minutes for large catalogs.");
    
    // Start the sync (this will run in background)
    supabase.functions.invoke('sync-shopify-orders')
      .then(({ data, error }) => {
        setSyncingOrders(false);
        setSyncProgress("");
        if (error) {
          toast.error(error.message || "Failed to sync orders");
        } else if (data?.error) {
          toast.error(data.error);
        } else {
          toast.success(`✅ ${data.message} in ${data.duration}`);
        }
      })
      .catch((error) => {
        setSyncingOrders(false);
        setSyncProgress("");
        toast.error("Error syncing orders");
      });

    // Poll for progress every 3 seconds
    const progressInterval = setInterval(async () => {
      const { data: orders } = await supabase
        .from('shopify_orders')
        .select('id', { count: 'exact', head: true });
      
      if (orders !== null) {
        setSyncProgress(`Syncing orders... ${orders || 0} orders synced so far. Please wait...`);
      }
    }, 3000);

    // Clear interval after 10 minutes max
    setTimeout(() => clearInterval(progressInterval), 600000);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your API credentials and integrations</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Business API</CardTitle>
            <CardDescription>Configure your WhatsApp Business account credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone_id">Phone Number ID</Label>
              <Input
                id="whatsapp_phone_id"
                value={settings.whatsapp_phone_id}
                onChange={(e) => setSettings({ ...settings, whatsapp_phone_id: e.target.value })}
                placeholder="Enter WhatsApp Phone Number ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_access_token">Access Token</Label>
              <Input
                id="whatsapp_access_token"
                type="password"
                value={settings.whatsapp_access_token}
                onChange={(e) => setSettings({ ...settings, whatsapp_access_token: e.target.value })}
                placeholder="Enter WhatsApp Access Token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_business_account_id">Business Account ID</Label>
              <Input
                id="whatsapp_business_account_id"
                value={settings.whatsapp_business_account_id}
                onChange={(e) => setSettings({ ...settings, whatsapp_business_account_id: e.target.value })}
                placeholder="Enter Business Account ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone_number">Phone Number</Label>
              <Input
                id="whatsapp_phone_number"
                value={settings.whatsapp_phone_number}
                onChange={(e) => setSettings({ ...settings, whatsapp_phone_number: e.target.value })}
                placeholder="923288981133"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OpenAI API</CardTitle>
            <CardDescription>Configure OpenAI for Zaara AI assistant</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai_api_key">API Key</Label>
              <Input
                id="openai_api_key"
                type="password"
                value={settings.openai_api_key}
                onChange={(e) => setSettings({ ...settings, openai_api_key: e.target.value })}
                placeholder="sk-..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shopify Integration</CardTitle>
            <CardDescription>Configure your Shopify store connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shopify_store_url">Store URL</Label>
              <Input
                id="shopify_store_url"
                value={settings.shopify_store_url}
                onChange={(e) => setSettings({ ...settings, shopify_store_url: e.target.value })}
                placeholder="your-store.myshopify.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopify_access_token">Access Token</Label>
              <Input
                id="shopify_access_token"
                type="password"
                value={settings.shopify_access_token}
                onChange={(e) => setSettings({ ...settings, shopify_access_token: e.target.value })}
                placeholder="shpat_..."
              />
            </div>
            
            <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
              <p className="font-medium">📌 Sync Instructions:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>First sync takes 5-8 min for large stores (18,000+ records)</li>
                <li>Sync Customers first, then Orders (orders need customer data)</li>
                <li>After first sync, only new/updated records are synced</li>
                <li>Manual sync recommended: run when you need latest data</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save All Settings"
            )}
          </Button>
          
          <div className="grid grid-cols-3 gap-3">
            <Button onClick={syncProducts} disabled={syncingProducts} variant="outline">
              {syncingProducts ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Products"
              )}
            </Button>
            
            <Button onClick={syncCustomers} disabled={syncingCustomers} variant="outline">
              {syncingCustomers ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Customers"
              )}
            </Button>
            
            <Button onClick={syncOrders} disabled={syncingOrders} variant="outline">
              {syncingOrders ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                "Sync Orders"
              )}
            </Button>
          </div>
          
          {syncProgress && (
            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {syncProgress}
              </p>
            </div>
          )}
        </div>

        {showWebhook && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-primary">WhatsApp Webhook Configuration</CardTitle>
              <CardDescription>
                Copy these values and paste them in Meta Business Suite → WhatsApp → Configuration → Webhook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook Callback URL</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(webhookUrl, "url")}
                  >
                    {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Verify Token</Label>
                <div className="flex gap-2">
                  <Input value={verifyToken} readOnly className="font-mono text-sm" />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(verifyToken, "token")}
                  >
                    {copied === "token" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Settings;