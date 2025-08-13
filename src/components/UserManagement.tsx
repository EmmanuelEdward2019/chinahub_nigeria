import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { Users, Eye, Search, Wallet } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  country: string;
  created_at: string;
  wallets?: {
    naira_balance: number;
    dollar_balance: number;
  };
  inquiries_count?: number;
  user_roles?: {
    role: string;
  }[];
}

interface UserTransaction {
  id: string;
  amount: number;
  currency: string;
  transaction_type: string;
  status: string;
  created_at: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
    setCurrentPage(1); // Reset to first page when search term changes
  }, [users, searchTerm]);

  const fetchUsers = async () => {
    try {
      // Fetch profiles first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get additional data for each user
      const usersWithData = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get wallet data
          const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('naira_balance, dollar_balance')
            .eq('user_id', profile.user_id)
            .maybeSingle();

          console.log('Wallet data for user', profile.full_name, ':', wallet, 'Error:', walletError);

          if (walletError) {
            console.error('Error fetching wallet for user:', profile.user_id, walletError);
          }

          // Get user roles
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          // Get inquiry count
          const { count } = await supabase
            .from('inquiries')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.user_id);

          return {
            ...profile,
            wallets: wallet || { naira_balance: 0, dollar_balance: 0 },
            user_roles: roles || [],
            inquiries_count: count || 0
          };
        })
      );

      setUsers(usersWithData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user => 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.country.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredUsers(filtered);
  };

  const fetchUserTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserTransactions(data || []);
    } catch (error) {
      console.error('Error fetching user transactions:', error);
    }
  };

  const viewUserDetails = async (user: UserProfile) => {
    setSelectedUser(user);
    await fetchUserTransactions(user.user_id);
    setIsDialogOpen(true);
  };

  const formatCurrency = (amount: number, currency: string) => {
    const value = amount / 100; // Convert from kobo/cents
    return currency === 'NGN' ? `₦${value.toLocaleString()}` : `$${value.toFixed(2)}`;
  };

  const getUserRole = (user: UserProfile) => {
    return user.user_roles?.[0]?.role || 'user';
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage users, view profiles, and monitor activities
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Wallet Balance</TableHead>
              <TableHead>Inquiries</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers
              .slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage)
              .map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-sm text-muted-foreground">{user.country}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{user.phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getUserRole(user) === 'admin' ? 'default' : 'secondary'}>
                    {getUserRole(user)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>₦{((user.wallets?.naira_balance || 0) / 100).toLocaleString()}</div>
                    <div className="text-muted-foreground">
                      ${((user.wallets?.dollar_balance || 0) / 100).toFixed(2)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {user.inquiries_count || 0}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => viewUserDetails(user)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No users found matching your search.' : 'No users found.'}
          </div>
        )}

        {/* Users Pagination */}
        {filteredUsers.length > usersPerPage && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                      }
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.ceil(filteredUsers.length / usersPerPage) }, (_, i) => i + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(pageNum);
                      }}
                      isActive={currentPage === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < Math.ceil(filteredUsers.length / usersPerPage)) {
                        setCurrentPage(currentPage + 1);
                      }
                    }}
                    className={currentPage === Math.ceil(filteredUsers.length / usersPerPage) ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                {selectedUser?.full_name} - Complete profile and activity
              </DialogDescription>
            </DialogHeader>

            {selectedUser && (
              <div className="space-y-6">
                {/* Profile Information */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Profile Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                        <p className="text-sm">{selectedUser.full_name}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Phone</label>
                        <p className="text-sm">{selectedUser.phone}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Country</label>
                        <p className="text-sm">{selectedUser.country}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Role</label>
                        <Badge variant="outline" className="text-xs">
                          {getUserRole(selectedUser)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Wallet Balance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Naira Balance</label>
                          <p className="text-lg font-semibold">
                            ₦{((selectedUser.wallets?.naira_balance || 0) / 100).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Dollar Balance</label>
                          <p className="text-lg font-semibold">
                            ${((selectedUser.wallets?.dollar_balance || 0) / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Transaction History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userTransactions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Amount</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userTransactions.slice(0, 5).map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="text-xs capitalize">
                                {transaction.transaction_type}
                              </TableCell>
                              <TableCell className="text-xs">
                                {formatCurrency(transaction.amount, transaction.currency)}
                              </TableCell>
                              <TableCell className="text-xs">
                                <Badge 
                                  variant={transaction.status === 'completed' ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {transaction.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No transactions found
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default UserManagement;