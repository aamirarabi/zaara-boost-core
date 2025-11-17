import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Plus, Edit2, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface QuickRepliesProps {
  onSelectReply: (text: string) => void;
}

interface QuickReply {
  id: string;
  label: string;
  text: string;
  sort_order: number;
}

export const QuickReplies = ({ onSelectReply }: QuickRepliesProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [templates, setTemplates] = useState<QuickReply[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<QuickReply | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newText, setNewText] = useState("");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from("quick_replies")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error loading quick replies:", error);
      toast.error("Failed to load quick replies");
    } else if (data) {
      setTemplates(data);
    }
  };

  const handleSave = async () => {
    if (!newLabel.trim() || !newText.trim()) {
      toast.error("Label and text are required");
      return;
    }

    if (editingReply) {
      // Update existing
      const { error } = await supabase
        .from("quick_replies")
        .update({
          label: newLabel,
          text: newText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingReply.id);

      if (error) {
        toast.error("Failed to update quick reply");
      } else {
        toast.success("Quick reply updated!");
        loadTemplates();
        handleCloseDialog();
      }
    } else {
      // Create new
      const { error } = await supabase
        .from("quick_replies")
        .insert({
          label: newLabel,
          text: newText,
          sort_order: templates.length + 1,
        });

      if (error) {
        toast.error("Failed to create quick reply");
      } else {
        toast.success("Quick reply created!");
        loadTemplates();
        handleCloseDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("quick_replies")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete quick reply");
    } else {
      toast.success("Quick reply deleted!");
      loadTemplates();
    }
  };

  const handleEdit = (reply: QuickReply) => {
    setEditingReply(reply);
    setNewLabel(reply.label);
    setNewText(reply.text);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingReply(null);
    setNewLabel("");
    setNewText("");
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingReply(null);
    setNewLabel("");
    setNewText("");
  };

  return (
    <>
      <div className="border-t bg-gray-50 p-2">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 justify-between hover-lift"
          >
            <span className="text-sm font-semibold">Quick Replies</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditMode(!editMode)}
            className="ml-2 hover:bg-gray-200 transition-colors"
            title={editMode ? "Exit edit mode" : "Edit quick replies"}
          >
            {editMode ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAdd}
            className="ml-1 hover:bg-green-100 transition-colors"
            title="Add new quick reply"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-2 gap-2">
            {templates.map((template) => (
              <div key={template.id} className="relative group">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!editMode) {
                      onSelectReply(template.text);
                      setIsExpanded(false);
                    }
                  }}
                  className="text-xs justify-start w-full hover-lift transition-all"
                  disabled={editMode}
                >
                  {template.label}
                </Button>
                {editMode && (
                  <div className="absolute top-0 right-0 flex gap-1 p-1 bg-white rounded shadow-premium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="h-6 w-6 p-0 hover:bg-blue-100"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="h-6 w-6 p-0 text-destructive hover:bg-red-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="shadow-premium-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReply ? "Edit Quick Reply" : "Add Quick Reply"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Label</label>
              <Input
                placeholder="e.g., Greeting"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message Text</label>
              <textarea
                placeholder="Enter the quick reply message..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full p-2 border rounded-md min-h-[100px] mt-1 focus:ring-2 focus:ring-boost-yellow"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-boost-yellow hover:bg-boost-amber">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
