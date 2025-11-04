import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Send } from "lucide-react";

const Inbox = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel("chat_history")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_history" }, () => {
        loadConversations();
        if (selectedPhone) loadMessages(selectedPhone);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPhone]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("chat_history")
      .select("phone_number, created_at")
      .order("created_at", { ascending: false });

    if (data) {
      const uniquePhones = Array.from(new Map(data.map((item) => [item.phone_number, item])).values());
      setConversations(uniquePhones);
    }
  };

  const loadMessages = async (phone: string) => {
    const { data } = await supabase
      .from("chat_history")
      .select("*")
      .eq("phone_number", phone)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  };

  const handleSelectConversation = (phone: string) => {
    setSelectedPhone(phone);
    loadMessages(phone);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedPhone) return;

    const { error } = await supabase.from("chat_history").insert({
      phone_number: selectedPhone,
      content: newMessage,
      direction: "outbound",
      sent_by: "human",
      message_type: "text",
      status: "sent",
    });

    if (!error) {
      setNewMessage("");
      loadMessages(selectedPhone);
    }
  };

  return (
    <Layout>
      <div className="p-6 h-[calc(100vh-4rem)]">
        <h1 className="text-3xl font-bold mb-6">Inbox</h1>

        <div className="grid grid-cols-3 gap-4 h-[calc(100%-5rem)]">
          {/* Conversations List */}
          <Card className="col-span-1">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.phone_number}
                    onClick={() => handleSelectConversation(conv.phone_number)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedPhone === conv.phone_number
                        ? "bg-primary text-secondary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Avatar>
                      <AvatarFallback>{conv.phone_number.slice(-2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium truncate">{conv.phone_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conv.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Message Thread */}
          <Card className="col-span-2 flex flex-col">
            {selectedPhone ? (
              <>
                <div className="p-4 border-b">
                  <h2 className="font-semibold">{selectedPhone}</h2>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.direction === "outbound"
                              ? "bg-primary text-secondary"
                              : "bg-muted"
                          }`}
                        >
                          <p>{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator />

                <div className="p-4 flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a conversation to view messages
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Inbox;