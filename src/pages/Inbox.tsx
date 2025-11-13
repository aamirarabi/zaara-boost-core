import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Send, Trash2, Download } from "lucide-react";
import { CustomerIntelligencePanel } from "@/components/inbox/CustomerIntelligencePanel";
import { QuickReplies } from "@/components/inbox/QuickReplies";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Inbox = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [phoneToDelete, setPhoneToDelete] = useState<string | null>(null);

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
      
      // Fetch customer names
      const conversationsWithNames = await Promise.all(
        uniquePhones.map(async (conv) => {
          const { data: contextData } = await supabase
            .from("conversation_context")
            .select("customer_name")
            .eq("phone_number", conv.phone_number)
            .maybeSingle();
          
          return {
            ...conv,
            customer_name: contextData?.customer_name || null
          };
        })
      );
      
      setConversations(conversationsWithNames);
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

  const handleDeleteChat = async () => {
    if (!phoneToDelete) return;

    try {
      // Delete from chat_history
      const { error: chatError } = await supabase
        .from("chat_history")
        .delete()
        .eq("phone_number", phoneToDelete);

      // Delete from conversation_context
      const { error: contextError } = await supabase
        .from("conversation_context")
        .delete()
        .eq("phone_number", phoneToDelete);

      if (chatError || contextError) {
        toast.error("Failed to delete chat");
      } else {
        toast.success("Chat deleted successfully");
        if (selectedPhone === phoneToDelete) {
          setSelectedPhone(null);
          setMessages([]);
        }
        loadConversations();
      }
    } catch (error) {
      toast.error("Error deleting chat");
    } finally {
      setDeleteDialogOpen(false);
      setPhoneToDelete(null);
    }
  };

  const openDeleteDialog = (phone: string) => {
    setPhoneToDelete(phone);
    setDeleteDialogOpen(true);
  };

  const downloadChat = async (phone: string) => {
    const { data: chatData } = await supabase
      .from("chat_history")
      .select("*")
      .eq("phone_number", phone)
      .order("created_at", { ascending: true });

    const { data: contextData } = await supabase
      .from("conversation_context")
      .select("customer_name")
      .eq("phone_number", phone)
      .maybeSingle();

    if (!chatData) return;

    const customerName = contextData?.customer_name || phone;
    let chatText = `Chat Transcript: ${customerName}\n`;
    chatText += `Phone: ${phone}\n`;
    chatText += `Downloaded: ${new Date().toLocaleString()}\n`;
    chatText += `Total Messages: ${chatData.length}\n`;
    chatText += `${"=".repeat(60)}\n\n`;

    chatData.forEach((msg) => {
      const time = new Date(msg.created_at).toLocaleString();
      const sender = msg.direction === "outbound" ? "Agent" : customerName;
      chatText += `[${time}] ${sender}:\n${msg.content}\n`;
      if (msg.media_url) {
        chatText += `📎 Media: ${msg.media_url}\n`;
      }
      chatText += `\n`;
    });

    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_${customerName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Chat downloaded successfully");
  };

  const downloadAllChats = async () => {
    const { data: allChats } = await supabase
      .from("chat_history")
      .select("*")
      .order("phone_number", { ascending: true })
      .order("created_at", { ascending: true });

    if (!allChats) return;

    const chatsByPhone = allChats.reduce((acc: any, msg: any) => {
      if (!acc[msg.phone_number]) acc[msg.phone_number] = [];
      acc[msg.phone_number].push(msg);
      return acc;
    }, {});

    let allChatsText = `All Chat Transcripts\n`;
    allChatsText += `Downloaded: ${new Date().toLocaleString()}\n`;
    allChatsText += `Total Conversations: ${Object.keys(chatsByPhone).length}\n`;
    allChatsText += `${"=".repeat(80)}\n\n`;

    for (const [phone, msgs] of Object.entries(chatsByPhone)) {
      const { data: contextData } = await supabase
        .from("conversation_context")
        .select("customer_name")
        .eq("phone_number", phone)
        .maybeSingle();

      const customerName = contextData?.customer_name || phone;
      allChatsText += `\n${"#".repeat(80)}\n`;
      allChatsText += `CONVERSATION: ${customerName} (${phone})\n`;
      allChatsText += `Messages: ${(msgs as any[]).length}\n`;
      allChatsText += `${"#".repeat(80)}\n\n`;

      (msgs as any[]).forEach((msg) => {
        const time = new Date(msg.created_at).toLocaleString();
        const sender = msg.direction === "outbound" ? "Agent" : customerName;
        allChatsText += `[${time}] ${sender}:\n${msg.content}\n`;
        if (msg.media_url) {
          allChatsText += `📎 Media: ${msg.media_url}\n`;
        }
        allChatsText += `\n`;
      });
    }

    const blob = new Blob([allChatsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all_chats_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("All chats downloaded successfully");
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Inbox</h1>
          <Button onClick={downloadAllChats} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download All Chats
          </Button>
        </div>

        <div className="flex h-[calc(100vh-12rem)] gap-4">
          {/* Left: Conversations (25%) */}
          <div className="w-1/4 border-r">
            <ScrollArea className="h-full bg-gray-50 rounded-lg">{" "}
              <div className="p-4 space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.phone_number}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedPhone === conv.phone_number
                        ? "bg-primary text-secondary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Avatar onClick={() => handleSelectConversation(conv.phone_number)} className="cursor-pointer">
                      <AvatarFallback>{conv.phone_number.slice(-2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden cursor-pointer" onClick={() => handleSelectConversation(conv.phone_number)}>
                      <p className="font-medium truncate">{conv.customer_name || conv.phone_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {conv.customer_name ? conv.phone_number : new Date(conv.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(conv.phone_number);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Middle: Chat (42%) */}
          <div className="flex-1 flex flex-col bg-white rounded-lg border">
            {selectedPhone ? (
              <>
                <div className="p-4 border-b flex justify-between items-center">
                  <div>
                    <h2 className="font-semibold">
                      {conversations.find(c => c.phone_number === selectedPhone)?.customer_name || selectedPhone}
                    </h2>
                    {conversations.find(c => c.phone_number === selectedPhone)?.customer_name && (
                      <p className="text-xs text-muted-foreground">{selectedPhone}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadChat(selectedPhone)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(selectedPhone)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
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
                              ? "bg-gradient-to-r from-boost-yellow to-boost-amber text-boost-black"
                              : "bg-muted"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">
                            {msg.content.split('\n').map((line: string, i: number) => {
                              // Handle bold text
                              const parts = line.split(/(\*[^*]+\*)/g);
                              return (
                                <div key={i}>
                                  {parts.map((part: string, j: number) => {
                                    if (part.startsWith('*') && part.endsWith('*')) {
                                      return <strong key={j}>{part.slice(1, -1)}</strong>;
                                    }
                                    return <span key={j}>{part}</span>;
                                  })}
                                </div>
                              );
                            })}
                          </div>
                          {msg.media_url && (
                            <div className="mt-2">
                              <img src={msg.media_url} alt="Media" className="rounded max-w-full h-auto" />
                            </div>
                          )}
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <QuickReplies onSelectReply={(text) => setNewMessage(text)} />

                <Separator />

                <div className="p-4 flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} className="bg-gradient-to-r from-boost-yellow to-boost-amber hover:from-boost-amber hover:to-boost-gold text-boost-black font-semibold">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a conversation to view messages
              </div>
            )}
          </div>

          {/* Right: Customer Intelligence (33%) */}
          <div className="w-1/3 border-l bg-white rounded-lg overflow-y-auto">
            {selectedPhone ? (
              <CustomerIntelligencePanel phoneNumber={selectedPhone} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a conversation
              </div>
            )}
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Chat</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete all messages for {phoneToDelete}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteChat} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Inbox;