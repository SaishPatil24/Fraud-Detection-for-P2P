
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

const mockAlerts = [
  {
    id: "ALERT1",
    title: "Unusual Activity Detected",
    description: "Transaction TX123457 has a high fraud score of 87.",
    severity: "high",
  },
  {
    id: "ALERT2",
    title: "Large Transaction Flagged",
    description: "Transaction TX123459 amount ($1,290.75) exceeds usual pattern.",
    severity: "high",
  },
];

const FraudAlertCard = () => {
  const [alerts, setAlerts] = useState(mockAlerts);

  const dismissAlert = (id: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Alert key={alert.id} variant="destructive" className="animate-pulse-slow">
          <AlertCircle className="h-4 w-4" />
          <div className="ml-3 flex-1">
            <AlertTitle className="font-medium">{alert.title}</AlertTitle>
            <AlertDescription className="text-sm mt-1">
              {alert.description}
            </AlertDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => dismissAlert(alert.id)}
            className="ml-2"
          >
            Dismiss
          </Button>
        </Alert>
      ))}
    </div>
  );
};

export default FraudAlertCard;
