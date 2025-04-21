
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const transactionData = [
  { name: "Apr 15", transactions: 42, fraudScore: 12 },
  { name: "Apr 16", transactions: 38, fraudScore: 15 },
  { name: "Apr 17", transactions: 45, fraudScore: 18 },
  { name: "Apr 18", transactions: 39, fraudScore: 22 },
  { name: "Apr 19", transactions: 53, fraudScore: 25 },
  { name: "Apr 20", transactions: 47, fraudScore: 19 },
  { name: "Apr 21", transactions: 51, fraudScore: 32 },
];

const fraudByTypeData = [
  { name: "Account Takeover", value: 32 },
  { name: "Unusual Amount", value: 45 },
  { name: "New Recipient", value: 27 },
  { name: "Abnormal Timing", value: 18 },
  { name: "Location Mismatch", value: 23 },
];

const TransactionChart = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-md font-medium">Transaction Volume & Fraud Score Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart
              data={transactionData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorFraudScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" fontSize={12} />
              <YAxis yAxisId="left" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" fontSize={12} />
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <Tooltip />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="transactions"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorTransactions)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="fraudScore"
                stroke="hsl(var(--destructive))"
                fillOpacity={1}
                fill="url(#colorFraudScore)"
              />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-md font-medium">Fraud Alerts by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={fraudByTypeData}
              margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar
                dataKey="value"
                fill="hsl(var(--secondary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionChart;
