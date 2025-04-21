
import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  date: string;
  name: string;
  amount: string;
  status: "completed" | "pending" | "flagged";
  fraudScore: number;
}

const TransactionList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { toast } = useToast();

  // Helper to fetch transactions and merge with recipient names for the UI
  const fetchTransactions = async () => {
    // Fetch transactions, sorted by date descending
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });
    if (error) {
      toast({
        title: "Error loading transactions",
        description: error.message,
        variant: "destructive",
      });
      setTransactions([]);
      return;
    }
    // Map to Transaction[]
    setTransactions(
      (data || []).map((tx: any) => ({
        id: tx.id,
        date: tx.date ? new Date(tx.date).toLocaleString() : "",
        name: tx.recipient_id ?? "Unknown",
        amount: typeof tx.amount === "number" ? `$${parseFloat(tx.amount).toFixed(2)}` : String(tx.amount ?? ""),
        status: tx.status,
        fraudScore: typeof tx.fraud_score === "number" ? tx.fraud_score : 0,
      }))
    );
  };

  useEffect(() => {
    fetchTransactions();
    // Listen for changes to the transactions table (real-time updates)
    const channel = supabase
      .channel("public:transactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        fetchTransactions
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleReview = (id: string) => {
    toast({
      title: "Transaction Reviewed",
      description: `Transaction ${id} has been marked for review.`,
    });
  };

  const handleApprove = async (id: string) => {
    // Update status in database
    const { error } = await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", id);
    if (error) {
      toast({
        title: "Error updating transaction",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Transaction Approved",
      description: `Transaction ${id} has been approved.`,
    });
    // The useEffect real-time listener will update the UI
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Recent Transactions</h2>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fraud Score</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">{transaction.id}</TableCell>
                <TableCell>{transaction.date}</TableCell>
                <TableCell>{transaction.name}</TableCell>
                <TableCell>{transaction.amount}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      transaction.status === "completed"
                        ? "outline"
                        : transaction.status === "pending"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {transaction.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-full max-w-24 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          transaction.fraudScore < 50
                            ? "bg-green-500"
                            : transaction.fraudScore < 80
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${transaction.fraudScore}%` }}
                      />
                    </div>
                    <span className="text-xs w-6">{transaction.fraudScore}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {transaction.status === "flagged" ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReview(transaction.id)}
                      >
                        Review
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(transaction.id)}
                      >
                        Approve
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReview(transaction.id)}
                    >
                      Details
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransactionList;
