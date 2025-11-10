import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface CreateFAQDialogProps {
  onSuccess: () => void;
}

export const CreateFAQDialog = ({ onSuccess }: CreateFAQDialogProps) => {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [videoInput, setVideoInput] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState("");
  const [relatedProducts, setRelatedProducts] = useState<string[]>([]);
  const [productInput, setProductInput] = useState("");
  const [loading, setLoading] = useState(false);

  const addKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const addVideoUrl = () => {
    if (videoInput.trim() && !videoUrls.includes(videoInput.trim())) {
      setVideoUrls([...videoUrls, videoInput.trim()]);
      setVideoInput("");
    }
  };

  const removeVideoUrl = (url: string) => {
    setVideoUrls(videoUrls.filter((u) => u !== url));
  };

  const addImageUrl = () => {
    if (imageInput.trim() && !imageUrls.includes(imageInput.trim())) {
      setImageUrls([...imageUrls, imageInput.trim()]);
      setImageInput("");
    }
  };

  const removeImageUrl = (url: string) => {
    setImageUrls(imageUrls.filter((u) => u !== url));
  };

  const addProduct = () => {
    if (productInput.trim() && !relatedProducts.includes(productInput.trim())) {
      setRelatedProducts([...relatedProducts, productInput.trim()]);
      setProductInput("");
    }
  };

  const removeProduct = (product: string) => {
    setRelatedProducts(relatedProducts.filter((p) => p !== product));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || !answer.trim() || !category.trim()) {
      toast.error("Please fill in question, answer, and category");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("faq_vectors").insert({
        id: crypto.randomUUID(),
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim(),
        keywords: keywords,
        video_urls: videoUrls,
        image_urls: imageUrls,
        related_products: relatedProducts,
        is_active: true,
        created_by: user?.email || "unknown",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("FAQ created successfully! Zaara can now use it immediately.");
      
      // Reset form
      setQuestion("");
      setAnswer("");
      setCategory("");
      setKeywords([]);
      setVideoUrls([]);
      setImageUrls([]);
      setRelatedProducts([]);
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating FAQ:", error);
      toast.error("Failed to create FAQ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create New FAQ
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New FAQ</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What is the battery life?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">Answer *</Label>
            <Textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="The battery life is..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., battery, warranty, shipping"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords</Label>
            <div className="flex gap-2">
              <Input
                id="keywords"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Add keyword"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
              />
              <Button type="button" onClick={addKeyword} variant="secondary">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {keywords.map((keyword) => (
                <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => removeKeyword(keyword)}>
                  {keyword}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="videoUrls">Video URLs</Label>
            <div className="flex gap-2">
              <Input
                id="videoUrls"
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                placeholder="https://youtube.com/..."
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addVideoUrl())}
              />
              <Button type="button" onClick={addVideoUrl} variant="secondary">
                Add
              </Button>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {videoUrls.map((url) => (
                <div key={url} className="flex items-center gap-2 text-sm">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex-1 truncate">
                    {url}
                  </a>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeVideoUrl(url)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrls">Image URLs</Label>
            <div className="flex gap-2">
              <Input
                id="imageUrls"
                value={imageInput}
                onChange={(e) => setImageInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addImageUrl())}
              />
              <Button type="button" onClick={addImageUrl} variant="secondary">
                Add
              </Button>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {imageUrls.map((url) => (
                <div key={url} className="flex items-center gap-2 text-sm">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex-1 truncate">
                    {url}
                  </a>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeImageUrl(url)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="products">Related Products</Label>
            <div className="flex gap-2">
              <Input
                id="products"
                value={productInput}
                onChange={(e) => setProductInput(e.target.value)}
                placeholder="Product ID or name"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addProduct())}
              />
              <Button type="button" onClick={addProduct} variant="secondary">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {relatedProducts.map((product) => (
                <Badge key={product} variant="outline" className="cursor-pointer" onClick={() => removeProduct(product)}>
                  {product}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create FAQ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
