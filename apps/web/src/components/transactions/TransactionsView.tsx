
"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, startOfYear, endOfYear } from 'date-fns';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { authedFetcher, api } from '@/lib/api';
import TransactionTable, { TransactionFilters } from './TransactionTable';
import PaginationControls from './PaginationControls';
import TransactionSummaryHeader from './TransactionSummaryHeader';
import AddTransactionModal from './AddTransactionModal';
import { Account } from '@/lib/types';

interface PaginatedTransactions {
  data: {
    id: string;
    description: string;
    amount: string;
    date: string;
    flow: any;
    isManual: boolean;
    isHidden: boolean;
    account: { name: string; type: string };
    categoryId: string | null;
    notes: string | null;
    category: { name: string } | null;
    subCategoryId: string | null;
    subCategory: { name: string } | null;
  }[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  // Summary totals across ALL matching transactions (not just the current page)
  summary: {
    income: number;
    expenses: number;
    transfers: number;
  };
}

/**
 * Full-featured transaction browser with filtering, pagination, and sync.
 *
 * All filter state lives in a single `filters` object. Filters are passed
 * down to TransactionTable which renders them as column-header popovers.
 *
 * Initial filter values are seeded from URL search params so that
 * "Total Income" / "Total Expenses" links on the Dashboard can deep-link
 * to a pre-filtered transaction list.
 *
 * Sync routing:
 *   Plaid  → POST /api/v1/plaid/sync   (cursor-based incremental)
 *   Teller → POST /api/v1/teller/sync  (full re-fetch)
 */
const TransactionsView = () => {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();

  // ── Filter state (seeded from URL params for dashboard deep-links) ────
  const [filters, setFiltersState] = useState<TransactionFilters>({
    startDate:      searchParams.get('startDate')      ?? format(startOfYear(new Date()), 'yyyy-MM-dd'),
    endDate:        searchParams.get('endDate')         ?? format(endOfYear(new Date()),   'yyyy-MM-dd'),
    categoryId:     searchParams.get('categoryId')     ?? '',
    subCategoryId:  searchParams.get('subCategoryId')  ?? '',
    subCategoryName: searchParams.get('subCategoryName') ?? '',
    flow:           searchParams.get('flow')           ?? '',
    accountId:      '',
    amountOperator: '',
    amount:         '',
    description:    '',
  });

  const [limit,       setLimit]       = useState(25);
  const [page,        setPage]        = useState(1);
  const [isSyncing,   setIsSyncing]   = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /** Merge partial filter updates — mirrors React setState(partial) pattern. */
  const setFilters = (updates: Partial<TransactionFilters>) => {
    setFiltersState(prev => ({ ...prev, ...updates }));
  };

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Fetch accounts so the sync handler can look up the connection provider
  const { data: accounts } = useSWR<Account[]>(
    ['/api/v1/accounts', getToken],
    ([url, getTokenFn]: [string, () => Promise<string | null>]) => authedFetcher(url, getTokenFn)
  );

  // Build the API URL from current filter state
  const queryParams = new URLSearchParams();
  queryParams.append('page',  page.toString());
  queryParams.append('limit', limit.toString());
  if (filters.accountId)                              queryParams.append('accountId',     filters.accountId);
  if (filters.startDate)                              queryParams.append('startDate',     filters.startDate);
  if (filters.endDate)                                queryParams.append('endDate',       filters.endDate);
  if (filters.categoryId)                             queryParams.append('categoryId',    filters.categoryId);
  if (filters.subCategoryId)                          queryParams.append('subCategoryId', filters.subCategoryId);
  if (filters.description)                            queryParams.append('description',   filters.description);
  if (filters.flow)                                   queryParams.append('flow',          filters.flow);
  if (filters.amountOperator && filters.amount) {
    queryParams.append('amountOperator', filters.amountOperator);
    queryParams.append('amount',         filters.amount);
  }

  const apiUrl = `/api/v1/transactions?${queryParams.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<PaginatedTransactions>(
    [apiUrl, getToken],
    ([url, getTokenFn]: [string, () => Promise<string | null>]) => authedFetcher(url, getTokenFn)
  );

  /**
   * Triggers a sync for the selected account.
   * Routes to the correct endpoint based on the account's connection provider.
   */
  const handleSync = async () => {
    if (!filters.accountId) {
      alert('Please select an account to sync.');
      return;
    }

    const account = accounts?.find(a => a.id === filters.accountId);
    if (!account) {
      alert('Could not find account details.');
      return;
    }

    setIsSyncing(true);
    try {
      const token    = await getToken();
      const isPlaid  = account.connection?.provider === 'PLAID';
      const endpoint = isPlaid ? '/api/v1/plaid/sync' : '/api/v1/teller/sync';
      await api.post(endpoint,
        { connectionId: account.connectionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Sync complete! Refreshing transactions…');
      mutate();
    } catch {
      alert('Failed to sync account.');
    }
    setIsSyncing(false);
  };

  return (
    <div>
      {isModalOpen && (
        <AddTransactionModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => { setIsModalOpen(false); mutate(); }}
        />
      )}

      {/* Slim top bar: only the Add Transaction action */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          + Add Transaction
        </button>
      </div>

      {/* Summary bar — totals across all matching transactions */}
      <TransactionSummaryHeader
        summary={data?.summary}
        totalTransactions={data?.pagination?.total}
      />

      {/* Table with column-header filters */}
      <TransactionTable
        transactions={data?.data ?? []}
        isLoading={isLoading}
        error={error}
        onUpdate={() => mutate()}
        filters={filters}
        setFilters={setFilters}
        isSyncing={isSyncing}
        onSync={handleSync}
      />

      <PaginationControls
        currentPage={page}
        totalPages={data?.pagination?.totalPages ?? 1}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
      />
    </div>
  );
};

export default TransactionsView;
