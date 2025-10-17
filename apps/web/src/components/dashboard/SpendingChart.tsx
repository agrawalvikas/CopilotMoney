"use client";

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SpendingChartProps {
  data: { name: string; total: number }[];
}

const SpendingChart: React.FC<SpendingChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800/50 p-6 rounded-lg shadow-md h-96 flex items-center justify-center">
        <p className="text-gray-500">No spending data for this month.</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md h-96">
      <h3 className="text-lg font-medium text-white mb-4">Spending by Category</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
          layout="vertical"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
          <XAxis type="number" stroke="#A0AEC0" tickFormatter={formatCurrency} />
          <YAxis type="category" dataKey="name" stroke="#A0AEC0" width={80} tick={{ fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: 'rgba(113, 128, 150, 0.1)' }}
            contentStyle={{ backgroundColor: '#2D3748', border: 'none' }}
            labelStyle={{ color: '#E2E8F0' }}
            formatter={(value: number) => [formatCurrency(value), 'Total']}
          />
          <Bar dataKey="total" fill="#4299E1" name="Spending" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SpendingChart;