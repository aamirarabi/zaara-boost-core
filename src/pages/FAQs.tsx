import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Upload, Loader2 } from "lucide-react";
import { CreateFAQDialog } from "@/components/faq/CreateFAQDialog";
import { format } from "date-fns";

const FAQs = () => {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    const { data } = await supabase.from("faq_vectors").select("*").order("usage_count", { ascending: false });
    if (data) setFaqs(data);
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
            <CreateFAQDialog onSuccess={loadFAQs} />
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