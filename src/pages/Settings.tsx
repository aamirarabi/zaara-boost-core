import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Copy, Check, Settings as SettingsIcon, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [syncingCustomers, setSyncingCustomers] = useState(false);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>("");
  const [courierSettings, setCourierSettings] = useState<any[]>([]);
  const [editingCourier, setEditingCourier] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [settings, setSettings] = useState({
    whatsapp_phone_id: "",
    whatsapp_access_token: "",
    openai_api_key: "",
    shopify_store_url: "boost-lifestyle.myshopify.com",
    shopify_access_token: "",
  });

  useEffect(() => {
    loadSettings();
    loadCourierSettings();
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

  const loadCourierSettings = async () => {
    const { data } = await supabase
      .from("courier_settings")
      .select("*")
      .order("courier_name");
    if (data) {
      setCourierSettings(data);
    }
  };

  const saveCourierSetting = async () => {
    if (!editingCourier) return;
    
    const { error } = await supabase
      .from("courier_settings")
      .upsert(editingCourier);
    
    if (error) {
      toast.error("Failed to save courier settings");
    } else {
      toast.success("Courier settings saved!");
      loadCourierSettings();
      setIsDialogOpen(false);
      setEditingCourier(null);
    }
  };

  const deleteCourierSetting = async (id: string) => {
    const { error } = await supabase
      .from("courier_settings")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Failed to delete courier");
    } else {
      toast.success("Courier deleted!");
      loadCourierSettings();
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
    setSyncProgress("Starting customer sync... Fetching data from Shopify...");
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-customers');
      
      if (error) {
        toast.error(error.message || "Failed to sync customers");
        setSyncProgress("");
      } else if (data?.error) {
        toast.error(data.error);
        setSyncProgress("");
      } else {
        toast.success(`✅ ${data.message} in ${data.duration}`);
        setSyncProgress("");
        // Reload customers page if they navigate there
        await supabase.from('customers').select('count').single();
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error("Error syncing customers");
      setSyncProgress("");
    } finally {
      setSyncingCustomers(false);
    }
  };

  const syncOrders = async () => {
    setSyncingOrders(true);
    setSyncProgress("Starting order sync... This may take a moment for large catalogs.");
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-orders');
      
      if (error) {
        toast.error(error.message || "Failed to sync orders");
        setSyncProgress("");
      } else if (data?.error) {
        toast.error(data.error);
        setSyncProgress("");
      } else {
        toast.success("✅ Order sync started! Check Orders page in a moment.");
        setSyncProgress("");
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Error syncing orders - check console for details");
      setSyncProgress("");
    } finally {
      setSyncingOrders(false);
    }
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
            
            <Separator className="my-4" />
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">📡 Webhook Configuration</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Copy these values to Meta Business Suite → WhatsApp → Configuration → Webhook
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Callback URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={webhookUrl} 
                    readOnly 
                    className="font-mono text-xs bg-muted/50" 
                  />
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
                <Label className="text-xs">Verify Token</Label>
                <div className="flex gap-2">
                  <Input 
                    value={verifyToken} 
                    readOnly 
                    className="font-mono text-xs bg-muted/50" 
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(verifyToken, "token")}
                  >
                    {copied === "token" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs space-y-1">
                <p className="font-medium text-primary">⚠️ Important Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Copy the Callback URL and Verify Token above</li>
                  <li>Go to Meta Business Suite → WhatsApp → Configuration</li>
                  <li>Click "Edit" on Webhook section</li>
                  <li>Paste both values and click "Verify and Save"</li>
                  <li>Meta will immediately verify the webhook</li>
                  <li>Subscribe to "messages" webhook field</li>
                </ol>
              </div>
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
                <li>Sync takes 30-60 seconds for 3,000+ customers</li>
                <li>Sync Customers first, then Orders (orders need customer data)</li>
                <li>After first sync, only new/updated records are synced</li>
                <li>Stay on this page during sync to see progress</li>
                <li>Check edge function logs for detailed sync progress</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Courier Management 🚚</CardTitle>
            <CardDescription>Configure courier APIs and delivery timings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                Manage courier integrations for real-time order tracking
              </p>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setEditingCourier({
                        courier_name: "",
                        display_name: "",
                        api_key: "",
                        api_endpoint: "",
                        karachi_delivery_days: 2,
                        outside_karachi_delivery_days: 5,
                        is_active: true
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Courier
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCourier?.id ? "Edit Courier" : "Add New Courier"}
                    </DialogTitle>
                    <DialogDescription>
                      Configure courier API settings and delivery timings
                    </DialogDescription>
                  </DialogHeader>
                  {editingCourier && (
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Courier Name (Internal)</Label>
                        <Input
                          value={editingCourier.courier_name}
                          onChange={(e) => setEditingCourier({...editingCourier, courier_name: e.target.value})}
                          placeholder="Leopards"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input
                          value={editingCourier.display_name}
                          onChange={(e) => setEditingCourier({...editingCourier, display_name: e.target.value})}
                          placeholder="Leopards Courier"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          value={editingCourier.api_key || ""}
                          onChange={(e) => setEditingCourier({...editingCourier, api_key: e.target.value})}
                          placeholder="API Key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>API Endpoint</Label>
                        <Input
                          value={editingCourier.api_endpoint || ""}
                          onChange={(e) => setEditingCourier({...editingCourier, api_endpoint: e.target.value})}
                          placeholder="https://api.courier.com/track"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Karachi Delivery (days)</Label>
                          <Input
                            type="number"
                            value={editingCourier.karachi_delivery_days}
                            onChange={(e) => setEditingCourier({...editingCourier, karachi_delivery_days: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Outside Karachi (days)</Label>
                          <Input
                            type="number"
                            value={editingCourier.outside_karachi_delivery_days}
                            onChange={(e) => setEditingCourier({...editingCourier, outside_karachi_delivery_days: parseInt(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editingCourier.is_active}
                          onCheckedChange={(checked) => setEditingCourier({...editingCourier, is_active: checked})}
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button onClick={saveCourierSetting} className="flex-1">
                          Save
                        </Button>
                        <Button onClick={() => {setIsDialogOpen(false); setEditingCourier(null);}} variant="outline">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {courierSettings.map((courier) => (
                <div key={courier.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{courier.display_name}</h3>
                        {courier.is_active ? (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Active</span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">Inactive</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Karachi: {courier.karachi_delivery_days} days | 
                        Outside: {courier.outside_karachi_delivery_days} days
                      </p>
                      {courier.api_endpoint && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {courier.api_endpoint}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setEditingCourier(courier);
                          setIsDialogOpen(true);
                        }}
                      >
                        <SettingsIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Delete ${courier.display_name}?`)) {
                            deleteCourierSetting(courier.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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

      </div>
    </Layout>
  );
};

export default Settings;