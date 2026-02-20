"use client";

import React, { useState } from 'react';
import { format, startOfYear, endOfYear } from 'date-fns';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { authedFetcher } from '@/lib/api';
import SummaryCard from "@/components/dashboard/SummaryCard";
import DatePresetPicker from '@/components/ui/DatePickerWithPresets';

interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  spendingByCategory: { id: string | null; name: string; total: number }[];
}

// Chart components are dynamically imported with SSR disabled because:
//   1. Recharts (the charting library) uses browser-only APIs (e.g. ResizeObserver)
//      that are unavailable during Next.js server-side rendering.
//   2. Dynamic import also enables code-splitting — the chart bundle is only
//      downloaded when the dashboard page is first rendered in the browser.
const SpendingChart = dynamic(
  () => import('@/components/dashboard/SpendingChart'),
  {
    ssr: false,
    loading: () => <div className="bg-gray-800/50 p-6 rounded-lg shadow-md h-96 flex items-center justify-center"><p className='text-gray-500'>Loading chart...</p></div>
  }
);

const MonthlyBreakdownChart = dynamic(
  () => import('@/components/dashboard/MonthlyBreakdownChart'),
  {
    ssr: false,
    loading: () => <div className="bg-gray-800/50 p-6 rounded-lg shadow-md h-96 flex items-center justify-center"><p className='text-gray-500'>Loading chart...</p></div>
  }
);

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
};

/**
 * Client-side dashboard shell.
 *
 * Responsible for:
 *   - Owning the shared date range state (passed to the date picker and the API call)
 *   - Fetching summary data via SWR (auto-refreshes when dates change)
 *   - Rendering the summary cards and chart panels
 *
 * The summary cards link back to the Transactions page pre-filtered by the
 * same date range and flow type, so users can drill into the numbers.
 *
 * SWR key: [apiUrl, getToken] — including getToken in the key ensures SWR
 * creates a separate cache entry per auth session, preventing data leakage
 * if multiple users share a browser tab (unlikely but safe).
 */
const DashboardClient = () => {
  const { getToken } = useAuth();

  // Default date range: current calendar year (Jan 1 – Dec 31)
  const [startDate, setStartDate] = useState(format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [endDate,   setEndDate]   = useState(format(endOfYear(new Date()),   'yyyy-MM-dd'));

  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate)   queryParams.append('endDate',   endDate);

  const apiUrl = `/api/v1/dashboard/summary?${queryParams.toString()}`;

  // SWR re-fetches automatically when apiUrl changes (i.e. when dates change)
  const { data: summaryData, error } = useSWR<SummaryData>(
    [apiUrl, getToken],
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  if (error)        return <div className="text-red-400 p-4">Failed to load dashboard data.</div>;
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
        {/* Summary cards — clicking Income/Expenses navigates to Transactions with a pre-set filter */}
        <SummaryCard
          title="Total Income"
          value={formatCurrency(summaryData.totalIncome)}
          href={`/transactions?flow=INCOME${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}`}
        />
        <SummaryCard
          title="Total Expenses"
          value={formatCurrency(summaryData.totalExpenses)}
          href={`/transactions?flow=EXPENSE${startDate ? `&startDate=${startDate}` : ''}${endDate ? `&endDate=${endDate}` : ''}`}
        />
        {/* Net Income has no drill-through link since it's a derived value */}
        <SummaryCard title="Net Income" value={formatCurrency(summaryData.netIncome)} />

        {/* Donut chart showing spending breakdown by category — full width */}
        <div className="md:col-span-3">
          <SpendingChart
            data={summaryData.spendingByCategory}
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        {/* Stacked bar chart showing monthly category breakdown — full width */}
        <div className="md:col-span-3">
          <MonthlyBreakdownChart />
        </div>
      </div>
    </div>
  );
};

export default DashboardClient;
