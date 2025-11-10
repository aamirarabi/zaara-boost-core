import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const SyncCourierButton = ({ onSyncComplete }: { onSyncComplete?: () => void }) => {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-courier-performance');

      if (error) throw error;

      toast({
        title: "✅ Sync Complete",
        description: `Synced ${data.records_synced} courier performance records`,
      });

      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "❌ Sync Failed",
        description: error.message || "Failed to sync courier data",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={syncing}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing...' : 'Sync Courier Data'}
    </Button>
  );
};
