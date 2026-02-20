"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { ShoppingCart, Home, Car, Utensils, Plane, ShoppingBag, Smartphone, Heart, ChevronDown, ChevronRight } from 'lucide-react';

interface SubCategoryData {
  id: string;
  name: string;
  total: number;
}

interface SpendingChartProps {
  data: { id: string | null; name: string; total: number; subCategories?: SubCategoryData[] }[];
  compact?: boolean;
  startDate?: string;
  endDate?: string;
}

const COLORS = ['#06b6d4', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#ef4444', '#facc15'];

const CATEGORY_ICONS: { [key: string]: any } = {
  'Groceries': ShoppingCart,
  'Rent': Home,
  'Auto & Transport': Car,
  'Household': Home,
  'Drinks & Dining': Utensils,
  'Travel & Vacation': Plane,
  'Shopping': ShoppingBag,
  'Entertainment': Smartphone,
  'Healthcare': Heart,
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const SpendingChart: React.FC<SpendingChartProps> = ({ data, compact = false, startDate, endDate }) => {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 p-6 rounded-2xl flex items-center justify-center" style={{ minHeight: compact ? '200px' : '300px' }}>
        <p className="text-gray-500 text-sm">No spending data for this month.</p>
      </div>
    );
  }

  const totalSpending = data.reduce((acc, entry) => acc + entry.total, 0);

  const chartData = data
    .filter(entry => entry.total > 0)
    .map(entry => ({
      ...entry,
      percentage: totalSpending > 0 ? (entry.total / totalSpending) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const displayLimit = compact ? 5 : chartData.length;

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl overflow-hidden">
      <div className="p-4 sm:p-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Category Breakdown</h3>

        {/* Side-by-side: donut chart left, category list right */}
        <div className={`flex ${compact ? 'flex-col' : 'flex-col lg:flex-row lg:gap-8 lg:items-start'}`}>

          {/* Donut Chart */}
          <div className={`flex-shrink-0 flex justify-center ${compact ? 'mb-4' : 'mb-6 lg:mb-0 lg:sticky lg:top-0'}`}>
            <div className={`relative ${compact ? 'w-36 h-36' : 'w-52 h-52 sm:w-60 sm:h-60'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={compact ? "60%" : "65%"}
                    outerRadius={compact ? "85%" : "90%"}
                    paddingAngle={2}
                    fill="#8884d8"
                    dataKey="total"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className={`font-bold text-white ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>
                  {formatCurrency(totalSpending)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Total spent</p>
              </div>
            </div>
          </div>

          {/* Category List */}
          <div className={`flex-1 min-w-0 ${compact ? '' : 'border-t lg:border-t-0 lg:border-l border-gray-800 pt-4 lg:pt-0 lg:pl-6'}`}>
            <div className="space-y-0">
            {chartData.slice(0, displayLimit).map((entry, index) => {
            const Icon = CATEGORY_ICONS[entry.name] || ShoppingBag;
            const color = COLORS[index % COLORS.length];
            const hasSubCategories = (entry.subCategories?.length ?? 0) > 0;
            const isExpanded = expandedCategoryId === entry.id;

            const rowClass = "flex items-center justify-between py-3 border-b border-gray-800/50 last:border-b-0 transition-colors px-2 rounded";

            const rowContent = (
              <>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`rounded-full flex items-center justify-center flex-shrink-0 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`}
                    style={{ backgroundColor: color + '25' }}
                  >
                    <Icon
                      className={compact ? 'w-4 h-4' : 'w-5 h-5'}
                      style={{ color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-white ${compact ? 'text-sm' : 'text-base'}`}>{entry.name}</p>
                    <p className="text-xs text-gray-500">{entry.percentage.toFixed(1)}% of expenses</p>
                  </div>
                </div>
                <div className="text-right pl-4 flex-shrink-0 flex items-center gap-2">
                  <p className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
                    {formatCurrency(entry.total)}
                  </p>
                  {hasSubCategories && (
                    isExpanded
                      ? <ChevronDown className="w-4 h-4 text-gray-400" />
                      : <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </>
            );

            return (
              <div key={`cat-${entry.id ?? 'uncategorized'}-${index}`}>
                {/* Category row */}
                {hasSubCategories ? (
                  <button
                    onClick={() => setExpandedCategoryId(isExpanded ? null : (entry.id ?? null))}
                    className={`${rowClass} hover:bg-gray-800/30 w-full text-left`}
                  >
                    {rowContent}
                  </button>
                ) : entry.id ? (
                  (() => {
                    const params = new URLSearchParams({ flow: 'EXPENSE', categoryId: entry.id });
                    if (startDate) params.set('startDate', startDate);
                    if (endDate) params.set('endDate', endDate);
                    return (
                      <Link href={`/transactions?${params.toString()}`} className={`${rowClass} hover:bg-gray-800/30`}>
                        {rowContent}
                      </Link>
                    );
                  })()
                ) : (
                  <div className={rowClass}>{rowContent}</div>
                )}

                {/* Sub-category rows (expanded) */}
                {isExpanded && entry.subCategories && (
                  <div className="ml-6 border-l border-gray-700 pl-3 mb-1">
                    {entry.subCategories.map((sc) => {
                      const scParams = new URLSearchParams({ flow: 'EXPENSE', subCategoryId: sc.id, subCategoryName: sc.name });
                      if (startDate) scParams.set('startDate', startDate);
                      if (endDate) scParams.set('endDate', endDate);
                      const scPct = entry.total > 0 ? (sc.total / entry.total) * 100 : 0;
                      return (
                        <Link
                          key={sc.id}
                          href={`/transactions?${scParams.toString()}`}
                          className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-800/30 transition-colors"
                        >
                          <div>
                            <p className="text-sm text-gray-300">{sc.name}</p>
                            <p className="text-xs text-gray-500">{scPct.toFixed(1)}% of {entry.name}</p>
                          </div>
                          <p className="text-sm font-medium text-gray-300 pl-4">{formatCurrency(sc.total)}</p>
                        </Link>
                      );
                    })}
                    {entry.id && (
                      <Link
                        href={`/transactions?${new URLSearchParams({ flow: 'EXPENSE', categoryId: entry.id, ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) }).toString()}`}
                        className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-800/30 transition-colors"
                      >
                        <p className="text-xs text-gray-500 italic">All {entry.name}</p>
                        <p className="text-xs text-gray-500 pl-4">{formatCurrency(entry.total)}</p>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
            })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpendingChart;
