import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, User, Bell, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
  };
}

interface NotificationReply {
  id: string;
  message: string;
  is_admin_reply: boolean;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
  };
}

interface UserProfile {
  user_id: string;
  full_name: string;
}

const NotificationSystem = ({ isAdmin, currentUserId }: { isAdmin: boolean; currentUserId: string }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [newNotificationTitle, setNewNotificationTitle] = useState("");
  const [newNotificationMessage, setNewNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("info");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [replies, setReplies] = useState<NotificationReply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const notificationsPerPage = 10;
  
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, currentUserId, currentPage, searchTerm]);

  const fetchNotifications = async () => {
    try {
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', currentUserId);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query
        .range((currentPage - 1) * notificationsPerPage, currentPage * notificationsPerPage - 1);

      if (error) throw error;
      setNotifications((data as any) || []);
      setTotalNotifications(count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchReplies = async (notificationId: string) => {
    try {
      const { data, error } = await supabase
        .from('notification_replies')
        .select('*')
        .eq('notification_id', notificationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setReplies((data as any) || []);
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  const sendNotification = async () => {
    if (!selectedUser || !newNotificationTitle || !newNotificationMessage) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Handle "all" users case
      if (selectedUser === "all") {
        const notifications = users.map(user => ({
          user_id: user.user_id,
          title: newNotificationTitle,
          message: newNotificationMessage,
          type: notificationType
        }));

        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;

        toast({
          title: "Notifications Sent",
          description: `Notification sent to all ${users.length} users successfully`,
        });
      } else {
        // Send to specific user
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: selectedUser,
            title: newNotificationTitle,
            message: newNotificationMessage,
            type: notificationType
          });

        if (error) throw error;

        toast({
          title: "Notification Sent",
          description: "Your notification has been sent successfully",
        });
      }

      setSelectedUser("");
      setNewNotificationTitle("");
      setNewNotificationMessage("");
      setNotificationType("info");
      setIsCreateDialogOpen(false);
      fetchNotifications();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    }
  };

  const sendReply = async () => {
    if (!selectedNotification || !newReply) return;

    try {
      const { error } = await supabase
        .from('notification_replies')
        .insert({
          notification_id: selectedNotification.id,
          user_id: currentUserId,
          message: newReply,
          is_admin_reply: isAdmin
        });

      if (error) throw error;

      toast({
        title: "Reply Sent",
        description: "Your reply has been sent successfully",
      });

      setNewReply("");
      fetchReplies(selectedNotification.id);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    }
  };

  const openReplyDialog = async (notification: Notification) => {
    setSelectedNotification(notification);
    await fetchReplies(notification.id);
    setIsReplyDialogOpen(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              {isAdmin ? "Send notifications and manage conversations" : "Your notifications and messages"}
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Send Notification</DialogTitle>
                  <DialogDescription>
                    Send a notification to a specific user
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user">Select User</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <span className="font-medium">📢 Send to All Users</span>
                        </SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Notification Type</Label>
                    <Select value={notificationType} onValueChange={setNotificationType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newNotificationTitle}
                      onChange={(e) => setNewNotificationTitle(e.target.value)}
                      placeholder="Notification title"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={newNotificationMessage}
                      onChange={(e) => setNewNotificationMessage(e.target.value)}
                      placeholder="Notification message"
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={sendNotification}>
                      Send
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search notifications by title or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{notification.title}</h4>
                    <Badge className={getTypeColor(notification.type)}>
                      {notification.type}
                    </Badge>
                    {!notification.read && (
                      <Badge variant="outline" className="text-xs">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{new Date(notification.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openReplyDialog(notification)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Reply
                </Button>
              </div>
            </div>
          ))}
          
          {notifications.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? `No notifications found matching "${searchTerm}"` : "No notifications found"}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalNotifications > notificationsPerPage && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    disabled={currentPage === 1}
                    className="h-10 px-4 py-2"
                  >
                    Previous
                  </Button>
                </PaginationItem>
                
                {Array.from({ length: Math.ceil(totalNotifications / notificationsPerPage) }, (_, i) => i + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <Button
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="h-10 w-10"
                    >
                      {pageNum}
                    </Button>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (currentPage < Math.ceil(totalNotifications / notificationsPerPage)) setCurrentPage(currentPage + 1);
                    }}
                    disabled={currentPage === Math.ceil(totalNotifications / notificationsPerPage)}
                    className="h-10 px-4 py-2"
                  >
                    Next
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Reply Dialog */}
        <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Notification Conversation</DialogTitle>
              <DialogDescription>
                {selectedNotification?.title}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Original notification */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">System</span>
                  <Badge className={getTypeColor(selectedNotification?.type || 'info')}>
                    {selectedNotification?.type}
                  </Badge>
                </div>
                <p className="text-sm">{selectedNotification?.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedNotification?.created_at && new Date(selectedNotification.created_at).toLocaleString()}
                </p>
              </div>
              
              {/* Replies */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`p-3 rounded-lg ${
                      reply.is_admin_reply 
                        ? 'bg-primary/10 ml-4' 
                        : 'bg-secondary/50 mr-4'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {reply.is_admin_reply ? 'Admin' : 'User'}
                      </span>
                      {reply.is_admin_reply && (
                        <Badge variant="outline" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{reply.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(reply.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Reply input */}
              <div className="space-y-2">
                <Label htmlFor="reply">Your Reply</Label>
                <Textarea
                  id="reply"
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Type your reply..."
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button onClick={sendReply} disabled={!newReply.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default NotificationSystem;