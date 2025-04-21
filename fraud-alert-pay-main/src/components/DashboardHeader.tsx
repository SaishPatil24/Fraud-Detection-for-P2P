
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const DashboardHeader = () => {
  const { toast } = useToast();

  const handleNotificationClick = () => {
    toast({
      title: "Notifications",
      description: "You have 2 new fraud alerts to review.",
    });
  };

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div>
        <h1 className="text-2xl font-bold">FraudGuard Pay</h1>
        <p className="text-sm text-muted-foreground">Secure P2P Payment System</p>
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleNotificationClick}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive flex items-center justify-center text-[10px] text-white">
            2
          </span>
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            JS
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">John Smith</p>
            <p className="text-xs text-muted-foreground">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
