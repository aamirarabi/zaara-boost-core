import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncShopifyButtonProps {
  onSyncComplete?: () => void;
}

export const SyncShopifyButton = ({ onSyncComplete }: SyncShopifyButtonProps) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    toast.info("Starting Shopify orders sync...");

    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-orders');

      if (error) {
        console.error("Sync error:", error);
        toast.error(`Failed to sync: ${error.message}`);
        return;
      }

      console.log("Sync response:", data);
      toast.success(data?.message || "Shopify orders sync started! Check edge function logs for progress.");
      
      // Wait a bit for the background sync to process some data, then refresh
      setTimeout(() => {
        onSyncComplete?.();
      }, 3000);

    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Failed to start sync");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button 
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Syncing Orders...' : 'Sync Shopify Orders'}
    </Button>
  );
};
