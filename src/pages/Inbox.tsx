import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Send, Trash2, Download, Trash, Phone, Search, Star, MessageSquare, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [starredChats, setStarredChats] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    loadStarredChats();

    const channel = supabase
      .channel("chat_history")
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "chat_history" 
      }, (payload) => {
        loadConversations();
        
        // If message is for current chat
        if (payload.new.phone_number === selectedPhone) {
          // If outbound from human, show Zaara typing
          if (payload.new.direction === "outbound" && payload.new.sent_by === "human") {
            setIsZaaraTyping(true);
          }
          
          // If inbound (Zaara response), hide typing
          if (payload.new.direction === "inbound" || payload.new.sent_by === "ai") {
            setIsZaaraTyping(false);
          }
          
          loadMessages(selectedPhone);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedPhone]);

  const loadConversations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_history")
      .select("phone_number, created_at, content")
      .order("created_at", { ascending: false });

    if (data) {
      const uniquePhones = Array.from(new Map(data.map((item) => [item.phone_number, item])).values());
      
      const conversationsWithNames = await Promise.all(
        uniquePhones.map(async (conv) => {
          const { data: contextData } = await supabase
            .from("conversation_context")
            .select("customer_name")
            .eq("phone_number", conv.phone_number)
            .maybeSingle();
          
          const { data: lastMsg } = await supabase
            .from("chat_history")
            .select("content, created_at")
            .eq("phone_number", conv.phone_number)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          
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
    setLoading(false);
  };

  const loadStarredChats = async () => {
    const { data } = await supabase
      .from("conversation_context")
      .select("phone_number, is_priority")
      .eq("is_priority", true);
    
    if (data) {
      setStarredChats(data.map(d => d.phone_number));
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
      // Typing indicator managed by real-time subscription
    }
  };

  const toggleStarChat = async (phone: string) => {
    const isStarred = starredChats.includes(phone);
    
    const { error } = await supabase
      .from("conversation_context")
      .update({ is_priority: !isStarred })
      .eq("phone_number", phone);
    
    if (!error) {
      if (isStarred) {
        setStarredChats(prev => prev.filter(p => p !== phone));
        toast.success("Removed from priority");
      } else {
        setStarredChats(prev => [...prev, phone]);
        toast.success("Marked as priority");
      }
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
            {/* Filter Tabs */}
            <div className="px-4 py-3 border-b bg-white">
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("all")}
                  className="text-xs transition-all"
                >
                  All ({conversations.length})
                </Button>
                <Button
                  variant={filter === "unread" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("unread")}
                  className="text-xs transition-all"
                >
                  Unread ({conversations.filter(c => c.unread_count > 0).length})
                </Button>
                <Button
                  variant={filter === "starred" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter("starred")}
                  className="text-xs transition-all"
                >
                  ⭐ Priority ({starredChats.length})
                </Button>
              </div>
            </div>

            <ScrollArea className="h-full bg-gray-50 rounded-lg">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex gap-3 p-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 space-y-2">
                {conversations
                  .filter(conv => {
                    if (filter === "unread") return conv.unread_count > 0;
                    if (filter === "starred") return starredChats.includes(conv.phone_number);
                    return true;
                  })
                  .map((conv) => {
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
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer group hover-lift shadow-premium ${
                        selectedPhone === conv.phone_number
                          ? "bg-primary text-primary-foreground shadow-premium-lg"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => handleSelectConversation(conv.phone_number)}
                    >
                      <div className="relative">
                        {/* Status ring overlay */}
                        {new Date(conv.last_message_time).getTime() > Date.now() - 5 * 60 * 1000 && (
                          <div className="absolute inset-0 rounded-full border-2 border-green-500 animate-pulse" />
                        )}
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStarChat(conv.phone_number);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <Star className={`h-4 w-4 transition-colors ${
                            starredChats.includes(conv.phone_number) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-400 hover:text-yellow-400'
                          }`} />
                        </Button>
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
                    </div>
                  );
                })}
                </div>
              )}
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
                      onClick={() => window.open(`https://wa.me/${selectedPhone}`, '_blank')}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                      title="Call on WhatsApp"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadChat(selectedPhone)}
                      className="hover:bg-gray-100 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(selectedPhone)}
                      className="hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Search Box */}
                <div className="px-4 py-2 border-b bg-gray-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search messages..."
                      className="pl-9 h-9 text-sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages
                      .filter(msg => 
                        searchTerm === "" || 
                        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"} ${
                          msg.direction === "outbound" ? "animate-slide-in-right" : "animate-slide-in-left"
                        }`}
                      >
                        <div className="relative">
                          {/* Message tail */}
                          <div 
                            className={`absolute top-3 w-0 h-0 ${
                              msg.direction === "outbound"
                                ? "right-[-6px] border-l-[8px] border-l-boost-amber border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent"
                                : "left-[-6px] border-r-[8px] border-r-gray-100 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent"
                            }`}
                          />
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              msg.direction === "outbound"
                                ? "bg-gradient-to-r from-boost-yellow to-boost-amber text-boost-black"
                                : "bg-gray-100"
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
                            {msg.direction === "outbound" && (
                              <div className="flex items-center justify-end gap-1 mt-1">
                                {msg.status === "sent" && (
                                  <span className="text-xs opacity-60">✓</span>
                                )}
                                {msg.status === "delivered" && (
                                  <span className="text-xs opacity-60">✓✓</span>
                                )}
                                {msg.status === "read" && (
                                  <span className="text-xs text-blue-500">✓✓</span>
                                )}
                              </div>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Typing Indicator */}
                {isZaaraTyping && (
                  <div className="px-4 py-2 animate-slide-in-left">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg w-fit shadow-premium">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                          Z
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800">Zaara</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-600">typing</span>
                          <div className="flex gap-0.5">
                            <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <QuickReplies onSelectReply={(text) => setNewMessage(text)} />

                {/* Quick Actions */}
                <div className="px-4 py-2 border-t bg-gradient-to-r from-gray-50 to-blue-50">
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewMessage("Can you please share your order number?")}
                      className="text-xs hover:bg-boost-yellow hover:border-boost-yellow transition-all hover-lift"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Ask Order #
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewMessage("Thank you for contacting Boost Lifestyle! How can I assist you today?")}
                      className="text-xs hover:bg-boost-yellow hover:border-boost-yellow transition-all hover-lift"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Welcome
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewMessage("Your issue has been resolved. Is there anything else I can help you with?")}
                      className="text-xs hover:bg-boost-yellow hover:border-boost-yellow transition-all hover-lift"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Resolved
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setNewMessage("I'll check on this and get back to you shortly!")}
                      className="text-xs hover:bg-boost-yellow hover:border-boost-yellow transition-all hover-lift"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      Checking
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="p-4 flex gap-2 bg-white border-t">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    className="flex-1 focus:ring-2 focus:ring-boost-yellow transition-all"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-gradient-to-r from-boost-yellow to-boost-amber hover:from-boost-amber hover:to-boost-gold text-boost-black font-semibold transition-all hover-lift shadow-premium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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