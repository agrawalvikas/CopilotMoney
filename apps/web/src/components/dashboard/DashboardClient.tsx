"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { authedFetcher } from '@/lib/api';
import SummaryCard from "@/components/dashboard/SummaryCard";
import DatePresetPicker from '../ui/DatePickerWithPresets';

// Define types
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

const DashboardClient = () => {
  const { getToken } = useAuth();

  // Set default date range to current month
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);

  // Construct the query parameters string
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);

  const apiUrl = `/api/v1/dashboard/summary?${queryParams.toString()}`;

  const { data: summaryData, error } = useSWR<SummaryData>(
    [apiUrl, getToken],
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  if (error) return <div className="text-red-400 p-4">Failed to load dashboard data.</div>;
  if (!summaryData) return <div className="p-4">Loading...</div>;

  return (
    <div>
      <div className="mb-6 max-w-xs">
        <DatePresetPicker 
          startDate={startDate}
          endDate={endDate}
          onDatesChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
        />
      </div>
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
    </div>
  );
};

export default DashboardClient;