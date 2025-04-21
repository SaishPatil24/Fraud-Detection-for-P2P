
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTransactionProcessor } from "@/hooks/useTransactionProcessor";
import { useAuthUser } from "@/hooks/useAuthUser";

const TransactionSimulator = ({
  onNewTransaction,
}: {
  onNewTransaction?: (transaction: any) => void;
}) => {
  const { toast } = useToast();
  const { user } = useAuthUser();
  const { processTransaction, loading } = useTransactionProcessor();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [simulateFraud, setSimulateFraud] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to make transactions.",
        variant: "destructive",
      });
      return;
    }
    
    if (!amount || !recipient) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Create transaction object
    const transaction = {
      recipient_id: recipient,
      amount: parseFloat(amount),
    };
    
    // Process the transaction through our fraud detection service
    const result = await processTransaction(transaction);
    
    if (result && onNewTransaction) {
      // Format for the transaction list component
      const formattedTransaction = {
        id: result.id,
        date: result.date,
        name: recipient, // In a real app, we'd look up the name from the ID
        amount: `$${parseFloat(amount).toFixed(2)}`,
        status: result.status,
        fraudScore: result.fraud_score,
      };
      
      onNewTransaction(formattedTransaction);
      
      // Reset form
      setAmount("");
      setRecipient("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Simulator</CardTitle>
        <CardDescription>
          Create a new payment to test the fraud detection system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-8"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Select onValueChange={setRecipient} value={recipient}>
                <SelectTrigger id="recipient">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alice Johnson">Alice Johnson</SelectItem>
                  <SelectItem value="Bob Smith">Bob Smith</SelectItem>
                  <SelectItem value="Carol Danvers">Carol Danvers</SelectItem>
                  <SelectItem value="Dave Williams">Dave Williams</SelectItem>
                  <SelectItem value="Eve Brown">Eve Brown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="simulate-fraud"
                checked={simulateFraud}
                onCheckedChange={setSimulateFraud}
              />
              <Label htmlFor="simulate-fraud">Simulate fraudulent activity</Label>
            </div>
          </div>
          <CardFooter className="px-0 pt-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : "Send Payment"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};

export default TransactionSimulator;
