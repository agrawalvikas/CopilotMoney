"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { authedFetcher } from '@/lib/api';
import TransactionTable from './TransactionTable';
import AccountSelect from './AccountSelect';
import DateRangePicker from './DateRangePicker';
import EditTransactionModal from './EditTransactionModal';

// Define types
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

interface PaginatedTransactions {
  data: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const TransactionsView = () => {
  const { getToken } = useAuth();

  // State for filters
  const [accountId, setAccountId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State for modal
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Construct the query parameters string
  const queryParams = new URLSearchParams();
  if (accountId) queryParams.append('accountId', accountId);
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);

  const apiUrl = `/api/v1/transactions?${queryParams.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<PaginatedTransactions>(
    [apiUrl, getToken], // Pass getToken to the fetcher via the key
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <AccountSelect value={accountId} onChange={setAccountId} />
        <DateRangePicker 
          startDate={startDate} 
          endDate={endDate} 
          onStartDateChange={setStartDate} 
          onEndDateChange={setEndDate} 
        />
      </div>
      <TransactionTable 
        transactions={data?.data ?? []} 
        isLoading={isLoading} 
        error={error} 
        onEditTransaction={setEditingTransaction}
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