"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { authedFetcher } from '@/lib/api';
import TransactionTable from './TransactionTable';
import AccountSelect from './AccountSelect';
import EditTransactionModal from './EditTransactionModal';
import CategorySelect from './CategorySelect';
import AmountFilter from './AmountFilter';
import DatePickerWithPresets from '../ui/DatePickerWithPresets';
import PaginationControls from './PaginationControls'; // Add import

import { TransactionFlow } from '@/lib/types';

// Define types
interface Transaction {
  id: string;
  description: string;
  amount: string; // Amount is a string
  date: string;
  flow: TransactionFlow;
  account: { name: string };
  categoryId: string | null;
  notes: string | null;
  category: { name: string } | null;
}

interface PaginatedTransactions {
  data: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  summary: {
    totalAmount: number;
  };
}

const TransactionsView = () => {
  const { getToken } = useAuth();

  // State for filters
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amountOperator, setAmountOperator] = useState('');
  const [amount, setAmount] = useState('');
  const [limit, setLimit] = useState(25);
  const [page, setPage] = useState(1);
  const [description, setDescription] = useState('');
  const [flow, setFlow] = useState('');

  // State for modal
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Reset page to 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [accountId, startDate, endDate, categoryId, amountOperator, amount, limit, description, flow]);

  // Construct the query parameters string
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());
  if (accountId) queryParams.append('accountId', accountId);
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (categoryId) queryParams.append('categoryId', categoryId);
  if (description) queryParams.append('description', description);
  if (flow) queryParams.append('flow', flow);
  if (amountOperator && amount) {
    queryParams.append('amountOperator', amountOperator);
    queryParams.append('amount', amount);
  }

  const apiUrl = `/api/v1/transactions?${queryParams.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<PaginatedTransactions>(
    [apiUrl, getToken], // Pass getToken to the fetcher via the key
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-end">
        <AccountSelect value={accountId} onChange={setAccountId} />
        <CategorySelect value={categoryId} onChange={setCategoryId} />
        <div>
          <label htmlFor="flow" className="block text-sm font-medium text-gray-300 mb-1">Flow</label>
          <select
            id="flow"
            value={flow}
            onChange={(e) => setFlow(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            <option value="">All Flows</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>
        <AmountFilter 
          operator={amountOperator}
          amount={amount}
          onOperatorChange={setAmountOperator}
          onAmountChange={setAmount}
        />
        <div className="lg:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description Contains</label>
          <input 
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., 'Coffee Shop' or 'UBER'"
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        </div>
        <div className="flex flex-col justify-end">
          <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
          <DatePickerWithPresets 
            startDate={startDate}
            endDate={endDate}
            onDatesChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        </div>
      </div>
      <TransactionTable 
        transactions={data?.data ?? []} 
        isLoading={isLoading} 
        error={error} 
        onEditTransaction={setEditingTransaction}
        summary={data?.summary}
        pagination={data?.pagination}
      />
      <PaginationControls 
        currentPage={page}
        totalPages={data?.pagination?.totalPages ?? 1}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
      />
      <EditTransactionModal 
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSuccess={() => mutate()} // Re-fetch data on success
      />
    </div>
  );
};

export default TransactionsView;