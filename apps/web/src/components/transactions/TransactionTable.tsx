"use client";

import React from 'react';

// Define the Transaction type based on our Prisma schema
import { TransactionFlow } from '@/lib/types';

// Define the Transaction type based on our Prisma schema
interface Transaction {
  id: string;
  description: string;
  amount: string; // Amount comes as a string from the API
  date: string;
  flow: TransactionFlow;
  account: { name: string };
  category: { name: string } | null;
  // For modal
  categoryId: string | null;
  notes: string | null;
}

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  error: any;
  onEditTransaction: (transaction: Transaction) => void;
  pagination?: { total: number };
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, isLoading, error, onEditTransaction, pagination }) => {
  // Calculate the net total locally from the visible transactions
  const pageTotal = transactions.reduce((sum, transaction) => {
    const amount = parseFloat(transaction.amount);
    if (transaction.flow === 'INCOME') {
      return sum + amount;
    }
    if (transaction.flow === 'EXPENSE') {
      return sum - amount;
    }
    return sum;
  }, 0);

  if (isLoading) {
    return <div className="text-center p-8">Loading transactions...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-400">Failed to load transactions.</div>;
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-800/50 rounded-lg shadow">
        <h3 className="text-lg font-medium text-white">No transactions found.</h3>
        <p className="mt-1 text-sm text-gray-400">Your transactions will appear here once they are synced.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-white ring-opacity-5 rounded-lg">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-800">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Account</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Flow</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody className="bg-gray-800/50 divide-y divide-gray-700">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-gray-800">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {new Date(transaction.date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                {transaction.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {transaction.account.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${transaction.flow === 'INCOME' ? 'bg-green-900 text-green-300' : 
                    transaction.flow === 'EXPENSE' ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-300'}`}>
                  {transaction.flow}
                </span>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 hover:text-white hover:underline cursor-pointer"
                onClick={() => onEditTransaction(transaction)}
              >
                {transaction.category?.name ?? 'N/A'}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-gray-200`}>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD", // Assuming USD for now
                }).format(parseFloat(transaction.amount))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-800">
          <tr>
            <td colSpan={4} className="px-6 py-3 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
              Total Transactions: {pagination?.total ?? 0}
            </td>
            <td className="px-6 py-3 text-right text-sm font-medium text-gray-300 uppercase tracking-wider">Page Total</td>
            <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-mono text-white">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(pageTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default TransactionTable;