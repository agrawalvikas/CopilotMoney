
"use client";

import React from 'react';

interface Summary {
  income: number;
  expenses: number;
  transfers: number;
}

interface TransactionSummaryHeaderProps {
  summary: Summary | undefined;
  totalTransactions: number | undefined;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

const TransactionSummaryHeader: React.FC<TransactionSummaryHeaderProps> = ({ summary, totalTransactions }) => {
  const income = summary?.income ?? 0;
  const expenses = summary?.expenses ?? 0;
  const transfers = summary?.transfers ?? 0;

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm sticky top-16 z-10 p-4 rounded-lg mb-4 border border-gray-800">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-400">Transactions</p>
          <p className="text-lg font-bold text-white">{totalTransactions ?? 0}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Income</p>
          <p className="text-lg font-bold text-green-400">{formatCurrency(income)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Expenses</p>
          <p className="text-lg font-bold text-red-400">{formatCurrency(expenses)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Transfers</p>
          <p className="text-lg font-bold text-gray-400">{formatCurrency(transfers)}</p>
        </div>
      </div>
    </div>
  );
};

export default TransactionSummaryHeader;
