
import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import StatCard from "@/components/StatCard";
import TransactionList from "@/components/TransactionList";
import FraudAlertCard from "@/components/FraudAlertCard";
import TransactionChart from "@/components/TransactionChart";
import TransactionSimulator from "@/components/TransactionSimulator";
import { ChartBar, AlertCircle, Database } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    transactionsToday: "143",
    fraudAlerts: "2",
    fraudScore: "87",
    transactionVolume: "$12,480.53",
  });

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="flex-1 p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Transactions Today"
            value={stats.transactionsToday}
            trend="up"
            trendValue="12% from yesterday"
            icon={<Database className="h-4 w-4" />}
          />
          <StatCard
            title="Fraud Alerts"
            value={stats.fraudAlerts}
            description="Requiring immediate attention"
            icon={<AlertCircle className="h-4 w-4" />}
            className="border-destructive/50"
          />
          <StatCard
            title="Highest Fraud Score"
            value={stats.fraudScore}
            description="Transaction TX123459"
            icon={<ChartBar className="h-4 w-4" />}
          />
          <StatCard
            title="Transaction Volume"
            value={stats.transactionVolume}
            trend="up"
            trendValue="8.3% from yesterday"
            icon={<Database className="h-4 w-4" />}
          />
        </div>

        <FraudAlertCard />

        <TransactionChart />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TransactionList />
          </div>
          <div>
            <TransactionSimulator
              onNewTransaction={(transaction) => {
                // In a real app, we would update our transaction list
                console.log("New transaction:", transaction);
                
                // Update stats
                setStats({
                  ...stats,
                  transactionsToday: (parseInt(stats.transactionsToday) + 1).toString(),
                  fraudAlerts: transaction.status === "flagged" 
                    ? (parseInt(stats.fraudAlerts) + 1).toString() 
                    : stats.fraudAlerts,
                });
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
