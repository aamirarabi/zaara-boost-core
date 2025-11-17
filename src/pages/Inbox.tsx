import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Send, Trash2, Download, Trash } from "lucide-react";
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
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [phoneToDelete, setPhoneToDelete] = useState<string | null>(null);
  const [isZaaraTyping, setIsZaaraTyping] = useState(false);

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
      .select("phone_number, created_at, content")
      .order("created_at", { ascending: false });

    if (data) {
      const uniquePhones = Array.from(new Map(data.map((item) => [item.phone_number, item])).values());
      
      // Fetch customer names and last message
      const conversationsWithNames = await Promise.all(
        uniquePhones.map(async (conv) => {
          const { data: contextData } = await supabase
            .from("conversation_context")
            .select("customer_name")
            .eq("phone_number", conv.phone_number)
            .maybeSingle();
          
          // Get last message
          const { data: lastMsg } = await supabase
            .from("chat_history")
            .select("content, created_at")
            .eq("phone_number", conv.phone_number)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          
          // Count unread messages
          const { count: unreadCount } = await supabase
            .from("chat_history")
            .select("*", { count: 'exact', head: true })
            .eq("phone_number", conv.phone_number)
            .eq("direction", "inbound")
            .neq("status", "read");
          
          return {
            ...conv,
            customer_name: contextData?.customer_name || null,
            last_message: lastMsg?.content || "",
            last_message_time: lastMsg?.created_at || conv.created_at,
            unread_count: unreadCount || 0
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

    setIsZaaraTyping(true);

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
      
      // Simulate waiting for Zaara response
      setTimeout(() => {
        setIsZaaraTyping(false);
      }, 3000);
    } else {
      setIsZaaraTyping(false);
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

  const handleClearAllChats = async () => {
    try {
      // Delete all from chat_history
      const { error: chatError } = await supabase
        .from("chat_history")
        .delete()
        .neq("phone_number", "");

      // Delete all from conversation_context
      const { error: contextError } = await supabase
        .from("conversation_context")
        .delete()
        .neq("phone_number", "");

      // Delete all from conversation_analytics
      const { error: analyticsError } = await supabase
        .from("conversation_analytics")
        .delete()
        .neq("phone_number", "");

      if (chatError || contextError || analyticsError) {
        toast.error("Failed to clear all chats");
      } else {
        toast.success("All chats cleared successfully");
        setSelectedPhone(null);
        setMessages([]);
        setConversations([]);
      }
    } catch (error) {
      toast.error("Error clearing all chats");
    } finally {
      setDeleteAllDialogOpen(false);
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
          <div className="flex gap-2">
            <Button 
              onClick={() => setDeleteAllDialogOpen(true)} 
              variant="destructive" 
              className="gap-2"
            >
              <Trash className="h-4 w-4" />
              Clear All Chats
            </Button>
            <Button onClick={downloadAllChats} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download All Chats
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(100vh-12rem)] gap-4">
          {/* Left: Conversations (28%) */}
          <div className="w-[28%] border-r bg-white rounded-lg flex flex-col">
            <ScrollArea className="h-full bg-gray-50 rounded-lg">{" "}
              <div className="p-4 space-y-2">
                {conversations.map((conv) => {
                  const getInitials = (name: string | null, phone: string) => {
                    if (name) {
                      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    }
                    return phone.slice(-2);
                  };

                  const getTimeAgo = (timestamp: string) => {
                    const now = new Date();
                    const time = new Date(timestamp);
                    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
                    
                    if (diffInMinutes < 1) return 'Just now';
                    if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
                    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hr${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
                    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
                  };

                  return (
                    <div
                      key={conv.phone_number}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer group ${
                        selectedPhone === conv.phone_number
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "hover:bg-muted hover:shadow-sm"
                      }`}
                      onClick={() => handleSelectConversation(conv.phone_number)}
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-blue-500 text-white font-semibold">
                            {getInitials(conv.customer_name, conv.phone_number)}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Unread badge */}
                        {conv.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1">
                            <div className="h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full font-semibold">
                              {conv.unread_count}
                            </div>
                          </div>
                        )}
                        
                        {/* Online status indicator - show if message within last 5 mins */}
                        {new Date(conv.last_message_time).getTime() > Date.now() - 5 * 60 * 1000 && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold truncate">{conv.customer_name || conv.phone_number}</p>
                          <span className="text-xs opacity-70 whitespace-nowrap ml-2">
                            {getTimeAgo(conv.last_message_time)}
                          </span>
                        </div>
                        <p className="text-sm opacity-80 truncate">
                          {conv.last_message 
                            ? conv.last_message.length > 60 
                              ? conv.last_message.substring(0, 60) + "..." 
                              : conv.last_message
                            : "No messages yet"}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(conv.phone_number);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Middle: Chat (42%) */}
          <div className="w-[42%] flex flex-col bg-white rounded-lg border">
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

                {/* Typing Indicator */}
                {isZaaraTyping && (
                  <div className="px-4 py-2">
                    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg w-fit">
                      <span className="text-lg">💬</span>
                      <span className="text-sm font-medium text-gray-700">Zaara is typing</span>
                      <div className="flex gap-1">
                        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                      </div>
                    </div>
                  </div>
                )}

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

          {/* Right: Customer Intelligence (30%) */}
          <div className="w-[30%] border-l bg-white rounded-lg overflow-y-auto">
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

        <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All Chats</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete ALL conversations, messages, and chat history? This will completely clear the inbox and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAllChats} className="bg-destructive text-destructive-foreground">
                Clear All Chats
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Inbox;