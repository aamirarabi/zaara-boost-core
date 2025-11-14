import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Upload, Loader2, Download, Trash2 } from "lucide-react";
import { CreateFAQDialog } from "@/components/faq/CreateFAQDialog";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const FAQs = () => {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    const { data } = await supabase.from("faq_vectors").select("*").order("usage_count", { ascending: false });
    if (data) setFaqs(data);
  };

  const syncToVectorStore = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "sync-faq-to-vector-store"
      );
      
      if (error) throw error;
      
      toast.success("FAQs synced to Vector Store successfully!");
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("FAQ saved but sync to Vector Store failed");
    }
  };

  const deleteAllFAQs = async () => {
    setIsDeletingAll(true);
    try {
      // Delete all FAQs from database
      const { error } = await supabase
        .from('faq_vectors')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) throw error;

      // Sync to Vector Store (will clear it since no FAQs exist)
      await syncToVectorStore();

      toast.success("All FAQs deleted and synced to Vector Store");

      // Refresh the FAQ list
      loadFAQs();
    } catch (error) {
      console.error('Delete all error:', error);
      toast.error("Failed to delete all FAQs");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const bulkImportFAQs = async () => {
    if (!importFile) {
      toast.error("Please select a JSON file to import");
      return;
    }

    setIsImporting(true);
    try {
      // Read the file
      const fileText = await importFile.text();
      const faqData = JSON.parse(fileText);

      // Validate format
      if (!Array.isArray(faqData)) {
        throw new Error("Invalid format: JSON must be an array of FAQs");
      }

      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || "system@boost-lifestyle.co";

      // Import each FAQ
      let successCount = 0;
      let errorCount = 0;

      for (const faq of faqData) {
        try {
          const { error } = await supabase
            .from('faq_vectors')
            .insert({
              id: faq.id || crypto.randomUUID(),
              question: faq.question,
              answer: faq.answer,
              category: faq.category || 'General',
              keywords: faq.keywords || faq.tags || [],
              video_urls: faq.video_urls || [],
              is_active: faq.is_active !== undefined ? faq.is_active : true,
              created_by: userEmail,
              updated_by: userEmail
            });

          if (error) {
            console.error('Error importing FAQ:', faq.question, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error('Error processing FAQ:', err);
          errorCount++;
        }
      }

      // Sync to Vector Store after import
      await syncToVectorStore();

      toast.success(`Import complete: ${successCount} FAQs imported${errorCount > 0 ? `, ${errorCount} failed` : ''}`);

      // Refresh the page
      loadFAQs();
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to import FAQs");
    } finally {
      setIsImporting(false);
      setImportFile(null);
    }
  };

  const exportFAQs = async () => {
    try {
      // Fetch all FAQs
      const { data: faqs, error } = await supabase
        .from('faq_vectors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Format for export (remove system fields)
      const exportData = faqs?.map(faq => ({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        keywords: faq.keywords,
        video_urls: faq.video_urls,
        is_active: faq.is_active
      }));

      // Create JSON file
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `faqs-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportData?.length || 0} FAQs`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export FAQs");
    }
  };

  const deleteFAQ = async (id: string) => {
    try {
      const { error } = await supabase
        .from('faq_vectors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Sync to Vector Store after delete
      await syncToVectorStore();

      toast.success("FAQ deleted and synced to Vector Store");

      // Refresh the list
      loadFAQs();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error("Failed to delete FAQ");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const faqsData = data.faqs || data;

      if (!Array.isArray(faqsData)) {
        toast.error("Invalid JSON format. Expected an array of FAQs.");
        setUploading(false);
        return;
      }

      // Get current user for audit
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || "system@boost-lifestyle.co";

      const faqsToInsert = faqsData.map((f: any) => {
        // Fix URLs in answer (add // if missing)
        let fixedAnswer = f.answer || "";
        fixedAnswer = fixedAnswer
          .replace(/https:([^\/])/g, 'https://$1')
          .replace(/http:([^\/])/g, 'http://$1');
        
        // Extract video URLs from answer for separate storage
        const videoUrlPattern = /(https?:\/\/[^\s]+)/g;
        const foundUrls = fixedAnswer.match(videoUrlPattern) || [];
        const videoUrls = foundUrls.filter(url => 
          url.includes('youtube.com') || 
          url.includes('youtu.be') || 
          url.includes('instagram.com')
        );

        return {
          id: f.id || crypto.randomUUID(),
          question: f.question.trim(),
          answer: fixedAnswer.trim(),
          category: f.category || "general",
          video_urls: videoUrls.length > 0 ? videoUrls : (f.video_urls || []),
          image_urls: f.image_urls || [],
          is_active: true,
          created_by: f.author || userEmail,
          updated_by: userEmail,
          created_at: f.updated_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      const { error } = await supabase.from("faq_vectors").upsert(faqsToInsert, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

      if (error) {
        toast.error("Failed to import FAQs");
        console.error("Import error:", error);
      } else {
        toast.success(`✅ Imported ${faqsToInsert.length} FAQs with fixed URLs!`);
        loadFAQs();
        
        // Auto-sync to Vector Store after successful upload
        await syncToVectorStore();
      }
    } catch (error) {
      toast.error("Error reading file. Make sure it's valid JSON.");
      console.error("File error:", error);
    }
    setUploading(false);
    e.target.value = "";
  };

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">FAQs</h1>
            <p className="text-muted-foreground">Manage frequently asked questions</p>
          </div>
          <div className="flex gap-2">
            <CreateFAQDialog onSuccess={async () => {
              loadFAQs();
              await syncToVectorStore();
            }} />
            
            <Button variant="outline" onClick={exportFAQs}>
              <Download className="mr-2 h-4 w-4" />
              Export FAQs
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Import FAQs</DialogTitle>
                  <DialogDescription>
                    Upload a JSON file containing FAQs. Format should be an array of objects with:
                    question, answer, category, keywords, video_urls, is_active
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="faq-file">FAQ JSON File</Label>
                    <Input
                      id="faq-file"
                      type="file"
                      accept=".json"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-semibold">Expected JSON format:</p>
                    <pre className="mt-2 rounded bg-muted p-2 text-xs overflow-x-auto">
{`[
  {
    "question": "What is your warranty?",
    "answer": "1 year warranty...",
    "category": "Warranty",
    "keywords": ["warranty", "policy"],
    "video_urls": [],
    "is_active": true
  }
]`}
                    </pre>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={bulkImportFAQs}
                    disabled={!importFile || isImporting}
                  >
                    {isImporting ? "Importing..." : "Import FAQs"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="faq-upload"
              disabled={uploading}
            />
            <Button asChild disabled={uploading} variant="outline">
              <label htmlFor="faq-upload" className="cursor-pointer">
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload JSON
                  </>
                )}
              </label>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All FAQs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete ALL FAQs
                    from the database and the OpenAI Vector Store.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteAllFAQs}
                    disabled={isDeletingAll}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeletingAll ? "Deleting..." : "Yes, Delete All"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid gap-4">
          {filteredFAQs.map((faq) => (
            <Card key={faq.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                  <div className="flex gap-2">
                    <Badge>{faq.category}</Badge>
                    <Badge variant="secondary">Used {faq.usage_count} times</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{faq.answer}</p>
                
                {faq.video_urls && faq.video_urls.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Video Tutorials:</p>
                    <div className="flex flex-col gap-2">
                      {faq.video_urls.map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          📹 {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {faq.keywords && faq.keywords.length > 0 && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {faq.keywords.map((keyword: string, i: number) => (
                      <Badge key={i} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {faq.created_by && (
                      <span>Created by: <span className="font-medium">{faq.created_by}</span></span>
                    )}
                    {faq.created_at && (
                      <span>on {format(new Date(faq.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                    )}
                    {faq.updated_by && (
                      <span className="ml-auto">Last edited by: <span className="font-medium">{faq.updated_by}</span></span>
                    )}
                    {faq.edited_at && (
                      <span>on {format(new Date(faq.edited_at), "MMM d, yyyy 'at' h:mm a")}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default FAQs;