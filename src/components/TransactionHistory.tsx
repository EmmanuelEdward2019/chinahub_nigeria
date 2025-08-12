import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ArrowUpCircle, ArrowDownCircle, FileText } from "lucide-react";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  status: string;
  reference?: string;
  created_at: string;
  inquiry_id?: string;
}

interface TransactionHistoryProps {
  userId?: string; // Optional - if not provided, shows all transactions (for admin)
  currency?: "NGN" | "USD";
  isAdmin?: boolean;
}

const TransactionHistory = ({ userId, currency = "NGN", isAdmin = false }: TransactionHistoryProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<{ naira: number; dollar: number }>({ naira: 0, dollar: 0 });

  useEffect(() => {
    fetchTransactions();
    if (userId) {
      fetchWalletBalance();
    }
  }, [userId, currency]);

  const fetchTransactions = async () => {
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (currency && !isAdmin) {
        query = query.eq('currency', currency);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('naira_balance, dollar_balance')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      
      setWalletBalance({
        naira: data?.naira_balance || 0,
        dollar: data?.dollar_balance || 0
      });
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const formatCurrency = (amount: number, curr: string) => {
    const value = amount / 100; // Convert from kobo/cents
    return curr === "NGN" ? `₦${value.toLocaleString()}` : `$${value.toFixed(2)}`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'wallet_topup':
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case 'inquiry_fee':
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionDescription = (transaction: Transaction) => {
    switch (transaction.transaction_type) {
      case 'wallet_topup':
        return 'Wallet Top-up';
      case 'inquiry_fee':
        return 'Inquiry Processing Fee';
      default:
        return transaction.transaction_type;
    }
  };

  const calculateRunningBalance = () => {
    const filteredTransactions = currency && !isAdmin 
      ? transactions.filter(t => t.currency === currency)
      : transactions;

    let runningBalance = 0;
    
    // Start with current balance and work backwards
    if (userId) {
      runningBalance = currency === "NGN" ? walletBalance.naira : walletBalance.dollar;
    }

    return filteredTransactions.map((transaction, index) => {
      const amount = transaction.amount;
      
      if (index === 0) {
        // For the most recent transaction, use current balance
        return { ...transaction, balance: runningBalance };
      } else {
        // For older transactions, calculate backwards
        const prevTransaction = filteredTransactions[index - 1];
        if (prevTransaction.transaction_type === 'wallet_topup') {
          runningBalance -= prevTransaction.amount;
        } else if (prevTransaction.transaction_type === 'inquiry_fee') {
          runningBalance += prevTransaction.amount;
        }
        return { ...transaction, balance: runningBalance };
      }
    });
  };

  const transactionsWithBalance = calculateRunningBalance();
  const displayTransactions = currency && !isAdmin 
    ? transactionsWithBalance.filter(t => t.currency === currency)
    : transactionsWithBalance;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Transaction History
          {!isAdmin && currency && (
            <Badge variant="outline">
              {currency === "NGN" ? "₦ Naira" : "$ USD"}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {isAdmin 
            ? "All user transactions across the platform"
            : "Your wallet transactions showing how your balance was built"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  {userId && <TableHead>Balance After</TableHead>}
                  <TableHead>Date</TableHead>
                  {isAdmin && <TableHead>Currency</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.transaction_type)}
                        <span className="text-sm">
                          {getTransactionDescription(transaction)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {transaction.transaction_type === 'wallet_topup' && (
                          <span className="text-green-600">+ Credit</span>
                        )}
                        {transaction.transaction_type === 'inquiry_fee' && (
                          <span className="text-red-600">- Deduction</span>
                        )}
                        {transaction.reference && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Ref: {transaction.reference}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={
                        transaction.transaction_type === 'wallet_topup' 
                          ? "text-green-600 font-medium" 
                          : "text-red-600 font-medium"
                      }>
                        {transaction.transaction_type === 'wallet_topup' ? '+' : '-'}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </span>
                    </TableCell>
                    {userId && (
                      <TableCell>
                        <span className="font-medium">
                          {formatCurrency(transaction.balance || 0, transaction.currency)}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="text-sm">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.currency}
                        </Badge>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;