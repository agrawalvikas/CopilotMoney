
"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, startOfYear, endOfYear } from 'date-fns';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { authedFetcher, api } from '@/lib/api';
import TransactionTable from './TransactionTable';
import AccountSelect from './AccountSelect';
import CategorySelect from './CategorySelect';
import AmountFilter from './AmountFilter';
import DatePickerWithPresets from '@/components/ui/DatePickerWithPresets';
import PaginationControls from './PaginationControls';
import TransactionSummaryHeader from './TransactionSummaryHeader';
import AddTransactionModal from './AddTransactionModal';
import { TransactionFlow, Account } from '@/lib/types';

interface Transaction {
  id: string;
  description: string;
  amount: string;
  date: string;
  flow: TransactionFlow;
  isManual: boolean;
  isHidden: boolean;
  account: { name: string; type: string };
  categoryId: string | null;
  notes: string | null;
  category: { name: string } | null;
  subCategoryId: string | null;
  subCategory: { name: string } | null;
}

interface PaginatedTransactions {
  data: Transaction[];
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
 * Filter state lives in React state (not the URL) so the page doesn't reload
 * on every filter change — SWR re-fetches automatically when the derived
 * `apiUrl` changes.
 *
 * The one exception is the initial state: `flow`, `startDate`, `endDate`,
 * `categoryId`, and `subCategoryId` are seeded from URL search params so that
 * the "Total Income" / "Total Expenses" links on the Dashboard can deep-link
 * to a pre-filtered transaction list.
 *
 * Sync routing:
 *   The sync button calls different API endpoints depending on the connection
 *   provider of the selected account:
 *     Plaid  → POST /api/v1/plaid/sync   (cursor-based incremental)
 *     Teller → POST /api/v1/teller/sync  (full re-fetch)
 */
const TransactionsView = () => {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();

  // Filter state — seeded from URL params to support dashboard deep-links
  const [accountId,      setAccountId]      = useState('');
  const [startDate,      setStartDate]      = useState(searchParams.get('startDate') ?? format(startOfYear(new Date()), 'yyyy-MM-dd'));
  const [endDate,        setEndDate]        = useState(searchParams.get('endDate')   ?? format(endOfYear(new Date()),   'yyyy-MM-dd'));
  const [categoryId,     setCategoryId]     = useState(searchParams.get('categoryId')    ?? '');
  const [subCategoryId,  setSubCategoryId]  = useState(searchParams.get('subCategoryId') ?? '');
  const [subCategoryName, setSubCategoryName] = useState(searchParams.get('subCategoryName') ?? '');
  const [amountOperator, setAmountOperator] = useState('');
  const [amount,         setAmount]         = useState('');
  const [limit,          setLimit]          = useState(25);
  const [page,           setPage]           = useState(1);
  const [description,    setDescription]    = useState('');
  const [flow,           setFlow]           = useState(searchParams.get('flow') ?? '');
  const [isSyncing,      setIsSyncing]      = useState(false);
  const [isModalOpen,    setIsModalOpen]    = useState(false);

  // Fetch all accounts so the sync button can look up the connection provider
  const { data: accounts } = useSWR<Account[]>(
    ['/api/v1/accounts', getToken],
    ([url, getTokenFn]: [string, () => Promise<string | null>]) => authedFetcher(url, getTokenFn)
  );

  // Only fetch sub-categories when a parent category is selected
  const { data: availableSubCategories } = useSWR<{ id: string; name: string }[]>(
    categoryId ? [`/api/v1/categories/${categoryId}/subcategories`, getToken] : null,
    ([url, getTokenFn]: [string, () => Promise<string | null>]) => authedFetcher(url, getTokenFn)
  );

  // Clearing the category must also clear any selected sub-category
  const handleCategoryChange = (newCategoryId: string) => {
    setCategoryId(newCategoryId);
    setSubCategoryId('');
    setSubCategoryName('');
  };

  const handleSubCategoryChange = (newSubCategoryId: string) => {
    setSubCategoryId(newSubCategoryId);
    const sc = availableSubCategories?.find(s => s.id === newSubCategoryId);
    setSubCategoryName(sc?.name ?? '');
  };

  const clearSubCategoryFilter = () => {
    setSubCategoryId('');
    setSubCategoryName('');
  };

  // Reset to page 1 whenever any filter changes — prevents landing on an empty page
  useEffect(() => {
    setPage(1);
  }, [accountId, startDate, endDate, categoryId, subCategoryId, amountOperator, amount, limit, description, flow]);

  // Build the API URL from current filter state — SWR watches this and re-fetches when it changes
  const queryParams = new URLSearchParams();
  queryParams.append('page',  page.toString());
  queryParams.append('limit', limit.toString());
  if (accountId)                     queryParams.append('accountId',     accountId);
  if (startDate)                     queryParams.append('startDate',     startDate);
  if (endDate)                       queryParams.append('endDate',       endDate);
  if (categoryId)                    queryParams.append('categoryId',    categoryId);
  if (subCategoryId)                 queryParams.append('subCategoryId', subCategoryId);
  if (description)                   queryParams.append('description',   description);
  if (flow)                          queryParams.append('flow',          flow);
  if (amountOperator && amount) {
    queryParams.append('amountOperator', amountOperator);
    queryParams.append('amount',         amount);
  }

  const apiUrl = `/api/v1/transactions?${queryParams.toString()}`;

  const { data, error, isLoading, mutate } = useSWR<PaginatedTransactions>(
    [apiUrl, getToken],
    ([url, getTokenFn]: [string, () => Promise<string | null>]) => authedFetcher(url, getTokenFn)
  );

  /**
   * Triggers a sync for the selected account.
   * Routes to the correct endpoint based on whether the account is connected
   * via Plaid (cursor-based incremental) or Teller (full re-fetch).
   * After sync completes, calls mutate() to re-fetch the transaction list.
   */
  const handleSync = async () => {
    if (!accountId) {
      alert('Please select an account to sync.');
      return;
    }

    const account = accounts?.find(a => a.id === accountId);
    if (!account) {
      alert('Could not find account details.');
      return;
    }

    setIsSyncing(true);
    try {
      const token   = await getToken();
      const isPlaid = account.connection?.provider === 'PLAID';
      const endpoint = isPlaid ? '/api/v1/plaid/sync' : '/api/v1/teller/sync';
      await api.post(endpoint,
        { connectionId: account.connectionId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Sync complete! Refreshing transactions...');
      mutate(); // Re-fetch the current page of transactions
    } catch (error) {
      console.error("Failed to sync account", error);
      alert("Failed to sync account.");
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
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          + Add Transaction
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-end">
        <div className="flex items-end gap-2">
          <div className="flex-grow">
            <label htmlFor="account" className="block text-sm font-medium text-gray-300 mb-1">Account</label>
            <AccountSelect value={accountId} onChange={setAccountId} />
          </div>
          <button
            onClick={handleSync}
            disabled={!accountId || isSyncing}
            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
          <CategorySelect value={categoryId} onChange={handleCategoryChange} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Sub-Category</label>
          {categoryId ? (
            // Category selected: show sub-category dropdown populated from the API
            <select
              value={subCategoryId}
              onChange={(e) => handleSubCategoryChange(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            >
              <option value="">All Sub-Categories</option>
              {availableSubCategories?.map((sc) => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
          ) : subCategoryId ? (
            // No category selected but a sub-category filter is active (deep-linked from elsewhere)
            // Show the sub-category as a chip with an X to clear it
            <div className="flex items-center gap-2 h-[42px] px-3 bg-gray-800 border border-blue-600 rounded-lg">
              <span className="text-sm text-blue-300 flex-1 truncate">{subCategoryName || subCategoryId}</span>
              <button onClick={clearSubCategoryFilter} className="text-gray-400 hover:text-white flex-shrink-0" title="Clear filter">✕</button>
            </div>
          ) : (
            // No category selected and no active sub-category filter
            <select disabled className="bg-gray-800 border border-gray-700 text-gray-600 text-sm rounded-lg block w-full p-2.5 cursor-not-allowed">
              <option>Select a category first</option>
            </select>
          )}
        </div>
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
            <option value="UNRECOGNIZED">Unrecognized</option>
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

      {/* Summary bar showing income/expense/transfer totals for the current filter */}
      <TransactionSummaryHeader
        summary={data?.summary}
        totalTransactions={data?.pagination?.total}
      />

      {/* Transaction table — passes mutate so individual row edits refresh the list */}
      <TransactionTable
        transactions={data?.data ?? []}
        isLoading={isLoading}
        error={error}
        onUpdate={() => mutate()}
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
