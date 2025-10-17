
"use client";

import dynamic from 'next/dynamic';
import SummaryCard from "@/components/dashboard/SummaryCard";

// Define types for the summary data
interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  spendingByCategory: { name: string; total: number }[];
}

// Dynamically import the chart component with SSR turned off
const SpendingChart = dynamic(
  () => import('@/components/dashboard/SpendingChart'),
  { 
    ssr: false,
    loading: () => <div className="bg-gray-800/50 p-6 rounded-lg shadow-md h-96 flex items-center justify-center"><p className='text-gray-500'>Loading chart...</p></div>
  }
);

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

const DashboardClient = ({ summaryData }: { summaryData: SummaryData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Summary Cards */}
      <SummaryCard title="Total Income" value={formatCurrency(summaryData.totalIncome)} />
      <SummaryCard title="Total Expenses" value={formatCurrency(summaryData.totalExpenses)} />
      <SummaryCard title="Net Income" value={formatCurrency(summaryData.netIncome)} />

      {/* Main Chart - Spans 2 columns on larger screens */}
      <div className="md:col-span-2">
        <SpendingChart data={summaryData.spendingByCategory} />
      </div>

      {/* Placeholder for another widget */}
      <div className="bg-gray-800/50 p-6 rounded-lg shadow-md flex items-center justify-center">
        <p className="text-gray-500">Future widget</p>
      </div>
    </div>
  );
};

export default DashboardClient;
