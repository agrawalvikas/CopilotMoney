"use client";

import React, { useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '@clerk/nextjs';
import useSWR from 'swr';
import { authedFetcher } from '@/lib/api';

interface Category {
  id: string | null;
  name: string;
  total: number;
}

interface MonthlyBreakdownData {
  categories: Category[];
  months: Record<string, string | number>[];
}

const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#ef4444', '#facc15', '#f97316', '#a78bfa'];
const COMPARE_COLOR = '#94a3b8';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

// CustomTooltip receives recharts props (active, payload, label) + our own (year, compareYear)
const CustomTooltip = ({ active, payload, label, year, compareYear }: any) => {
  if (!active || !payload?.length) return null;

  const compareEntry = payload.find((e: any) => e.dataKey === '__compareTotal__');
  const barEntries = payload.filter((e: any) => e.dataKey !== '__compareTotal__');

  const currentTotal = barEntries.reduce((sum: number, e: any) => sum + (e.value ?? 0), 0);
  const compareTotal: number | null = compareEntry?.value ?? null;

  const pctChange =
    compareTotal !== null && compareTotal > 0
      ? ((currentTotal - compareTotal) / compareTotal) * 100
      : null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-2xl min-w-[210px]">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>

      {/* Category rows (only non-zero) */}
      {[...barEntries].reverse().map((entry: any, idx: number) =>
        entry.value > 0 ? (
          <div key={`${entry.dataKey}-${idx}`} className="flex items-center justify-between gap-4 py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.fill }} />
              <span className="text-xs text-gray-300">{entry.name}</span>
            </div>
            <span className="text-xs font-mono text-white">{formatCurrency(entry.value)}</span>
          </div>
        ) : null
      )}

      {/* Totals + comparison */}
      <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
        <div className="flex justify-between">
          <span className="text-xs text-gray-400">{year} Total</span>
          <span className="text-xs font-mono font-semibold text-white">{formatCurrency(currentTotal)}</span>
        </div>
        {compareTotal !== null && (
          <>
            <div className="flex justify-between">
              <span className="text-xs text-gray-400">{compareYear} Total</span>
              <span className="text-xs font-mono text-gray-400">{formatCurrency(compareTotal)}</span>
            </div>
            {pctChange !== null && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">vs {compareYear}</span>
                <span
                  className={`text-xs font-mono font-semibold ${
                    pctChange > 0 ? 'text-red-400' : pctChange < 0 ? 'text-green-400' : 'text-gray-400'
                  }`}
                >
                  {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%{pctChange > 0 ? ' ↑' : pctChange < 0 ? ' ↓' : ''}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const MonthlyBreakdownChart: React.FC = () => {
  const { getToken } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [compareYear, setCompareYear] = useState<number | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Primary year data
  const { data, error, isLoading } = useSWR<MonthlyBreakdownData>(
    [`/api/v1/dashboard/monthly-breakdown?year=${year}`, getToken],
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  // Comparison year data (only fetched when a compare year is chosen)
  const { data: compareData } = useSWR<MonthlyBreakdownData>(
    compareYear ? [`/api/v1/dashboard/monthly-breakdown?year=${compareYear}`, getToken] : null,
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  // Compute per-month totals for the comparison year (sum all category values)
  const compareMonthlyTotals: number[] | null = compareData
    ? compareData.months.map((month) =>
        Object.entries(month)
          .filter(([key]) => key !== 'month')
          .reduce((sum, [, val]) => sum + (val as number), 0)
      )
    : null;

  const hasData = data && data.categories.length > 0;

  const displayCategories = data ? data.categories : [];

  const chartData = data?.months.map((month, idx) => {
    const entry: Record<string, string | number> = { month: month.month };
    for (const cat of data.categories) {
      entry[cat.name] = (month[cat.name] as number) ?? 0;
    }
    if (compareMonthlyTotals) entry['__compareTotal__'] = compareMonthlyTotals[idx] ?? 0;
    return entry;
  });

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
    // Clear compare year if it equals the new primary year
    if (compareYear === newYear) setCompareYear(null);
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl overflow-hidden">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Monthly Expenses by Category</h3>
            {hasData && (
              <p className="text-xs text-gray-600 mt-0.5">
                {formatCurrency(data.categories.reduce((s, c) => s + c.total, 0))} total in {year}
              </p>
            )}
          </div>

          {/* Year controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={year}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <span className="text-xs text-gray-500">vs</span>

            <select
              value={compareYear ?? ''}
              onChange={(e) => setCompareYear(e.target.value ? Number(e.target.value) : null)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">None</option>
              {years.filter((y) => y !== year).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chart */}
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500 text-sm">Loading…</p>
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-red-400 text-sm">Failed to load data.</p>
          </div>
        ) : !hasData ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500 text-sm">No expense data for {year}.</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} barSize={28} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  content={<CustomTooltip year={year} compareYear={compareYear} />}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                {displayCategories.map((cat, idx) => (
                  <Bar
                    key={cat.id ?? `__cat__${idx}`}
                    dataKey={cat.name}
                    name={cat.name}
                    stackId="expenses"
                    fill={COLORS[idx % COLORS.length]}
                    radius={idx === displayCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
                {compareYear && (
                  <Line
                    dataKey="__compareTotal__"
                    name={`${compareYear} Total`}
                    type="monotone"
                    stroke={COMPARE_COLOR}
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ fill: COMPARE_COLOR, r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: COMPARE_COLOR }}
                    legendType="none"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-800 pt-4">
              {displayCategories.map((cat, idx) => (
                <div key={cat.id ?? `__other__${idx}`} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-xs text-gray-400">{cat.name}</span>
                  <span className="text-xs text-gray-600 font-mono">{formatCurrency(cat.total)}</span>
                </div>
              ))}
              {compareYear && (
                <div className="flex items-center gap-1.5">
                  <svg width="18" height="10" className="flex-shrink-0">
                    <line x1="0" y1="5" x2="18" y2="5" stroke={COMPARE_COLOR} strokeWidth="2" strokeDasharray="5 4" />
                  </svg>
                  <span className="text-xs text-gray-400">{compareYear} Total</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyBreakdownChart;
