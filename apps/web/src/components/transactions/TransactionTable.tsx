"use client";

import React from 'react';

// Define the Transaction type based on our Prisma schema
interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'debit' | 'credit';
  categoryId: string | null;
  notes: string | null;
  category: { name: string } | null;
}

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  error: any;
  onEditTransaction: (transaction: Transaction) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, isLoading, error, onEditTransaction }) => {
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
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 hover:text-white hover:underline cursor-pointer"
                onClick={() => onEditTransaction(transaction)}
              >
                {transaction.category?.name ?? 'N/A'}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-mono ${transaction.type === 'debit' ? 'text-red-400' : 'text-green-400'}`}>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD", // Assuming USD for now
                }).format(transaction.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;