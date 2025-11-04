import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Upload, Loader2 } from "lucide-react";

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

      const faqsToInsert = faqsData.map((f: any) => ({
        id: f.id || crypto.randomUUID(),
        question: f.question,
        answer: f.answer,
        category: f.category || "general",
        keywords: f.keywords || [],
        video_urls: f.video_urls || [],
        image_urls: f.image_urls || [],
        related_products: f.related_products || [],
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("faq_vectors").insert(faqsToInsert);

      if (error) {
        toast.error("Failed to import FAQs");
      } else {
        toast.success(`✅ Imported ${faqsToInsert.length} FAQs!`);
        loadFAQs();
      }
    } catch (error) {
      toast.error("Error reading file. Make sure it's valid JSON.");
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
          <div>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="faq-upload"
              disabled={uploading}
            />
            <Button asChild disabled={uploading}>
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
                <p className="text-muted-foreground">{faq.answer}</p>
                {faq.keywords && faq.keywords.length > 0 && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {faq.keywords.map((keyword: string, i: number) => (
                      <Badge key={i} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default FAQs;