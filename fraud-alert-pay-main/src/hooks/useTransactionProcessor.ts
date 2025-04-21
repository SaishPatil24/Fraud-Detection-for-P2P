
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id?: string;
  sender_id?: string;
  recipient_id: string;
  amount: number;
  date?: string;
  status?: string;
  fraud_score?: number;
}

export const useTransactionProcessor = () => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthUser();
  const { toast } = useToast();

  const processTransaction = async (transaction: Omit<Transaction, "sender_id">) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to process transactions.",
        variant: "destructive",
      });
      return null;
    }

    setLoading(true);

    try {
      // Add the sender ID (current user)
      const transactionWithSender = {
        ...transaction,
        sender_id: user.id,
      };

      // Call the fraud-detection edge function
      const { data, error } = await supabase.functions.invoke("fraud-detection", {
        body: { transaction: transactionWithSender },
      });

      if (error) {
        throw error;
      }

      // Show appropriate toast message
      toast({
        title: data.transaction.status === "flagged" ? "Transaction Flagged" : "Transaction Completed",
        description: data.message,
        variant: data.transaction.status === "flagged" ? "destructive" : "default",
      });

      return data.transaction;
    } catch (error) {
      console.error("Error processing transaction:", error);
      toast({
        title: "Transaction Error",
        description: "Failed to process transaction. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    processTransaction,
    loading,
  };
};
