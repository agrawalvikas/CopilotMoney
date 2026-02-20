"use client";

import React, { useState } from 'react';
import { TransactionFlow } from '@/lib/types';
import { api, authedFetcher } from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import useSWR from 'swr';
import { Eye, EyeOff, Filter, RefreshCw, X } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import AccountSelect from './AccountSelect';
import CategorySelect from './CategorySelect';

// --- Types ---

interface Category { id: string; name: string; }
interface SubCategory { id: string; name: string; }

interface Transaction {
  id: string;
  description: string;
  amount: string;
  date: string;
  flow: TransactionFlow;
  isManual: boolean;
  isHidden: boolean;
  account: { name: string; type: string };
  category: { name: string } | null;
  categoryId: string | null;
  subCategory: { name: string } | null;
  subCategoryId: string | null;
  notes: string | null;
}

/** All filter values as a single object — owned by TransactionsView, passed down here. */
export interface TransactionFilters {
  startDate: string;
  endDate: string;
  amountOperator: string;
  amount: string;
  description: string;
  flow: string;
  accountId: string;
  categoryId: string;
  subCategoryId: string;
  subCategoryName: string;
}

// --- Edit Modal ---

interface EditTransactionModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  onClose,
  onSaved,
  onDeleted,
}) => {
  const { getToken } = useAuth();
  const [flow, setFlow] = useState<TransactionFlow>(transaction.flow);
  const [categoryId, setCategoryId] = useState<string>(transaction.categoryId ?? '');
  const [subCategoryText, setSubCategoryText] = useState<string>(transaction.subCategory?.name ?? '');
  const [notes, setNotes] = useState<string>(transaction.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: categories } = useSWR<Category[]>(
    ['/api/v1/categories', getToken],
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  const { data: subCategories, mutate: mutateSubCategories } = useSWR<SubCategory[]>(
    categoryId ? [`/api/v1/categories/${categoryId}/subcategories`, getToken] : null,
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  const handleCategoryChange = (newCategoryId: string) => {
    setCategoryId(newCategoryId);
    setSubCategoryText('');
  };

  // Close on Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await getToken();
      let resolvedSubCategoryId: string | null = null;

      if (subCategoryText.trim() && categoryId) {
        const match = subCategories?.find(
          sc => sc.name.toLowerCase() === subCategoryText.trim().toLowerCase()
        );
        if (match) {
          resolvedSubCategoryId = match.id;
        } else {
          const res = await api.post(
            `/api/v1/categories/${categoryId}/subcategories`,
            { name: subCategoryText.trim() },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          resolvedSubCategoryId = res.data.id;
          mutateSubCategories();
        }
      }

      await api.patch(
        `/api/v1/transactions/${transaction.id}`,
        { flow, categoryId: categoryId || null, subCategoryId: resolvedSubCategoryId, notes: notes.trim() || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSaved();
    } catch {
      alert('Failed to save changes.');
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${transaction.description}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      const token = await getToken();
      await api.delete(`/api/v1/transactions/${transaction.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted();
    } catch {
      alert('Failed to delete transaction.');
    }
    setIsDeleting(false);
  };

  const selectClass =
    'bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{transaction.description}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(transaction.date).toLocaleDateString()} · {transaction.account.name}
              {transaction.isManual && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-900 text-blue-300 rounded">Manual</span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Flow</label>
          <select value={flow} onChange={(e) => setFlow(e.target.value as TransactionFlow)} className={selectClass}>
            <option value={TransactionFlow.INCOME}>Income</option>
            <option value={TransactionFlow.EXPENSE}>Expense</option>
            <option value={TransactionFlow.TRANSFER}>Transfer</option>
            <option value={TransactionFlow.UNRECOGNIZED}>Unrecognized</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Category</label>
          <select
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={!categories}
            className={selectClass}
          >
            <option value="">Uncategorized</option>
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {categoryId && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Sub-Category
              <span className="ml-1 normal-case font-normal text-gray-500">(type to create new)</span>
            </label>
            <input
              list="subcategory-suggestions"
              type="text"
              value={subCategoryText}
              onChange={(e) => setSubCategoryText(e.target.value)}
              placeholder="e.g. Rent, Groceries…"
              className={selectClass}
            />
            <datalist id="subcategory-suggestions">
              {subCategories?.map((sc) => (
                <option key={sc.id} value={sc.name} />
              ))}
            </datalist>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a private note…"
            rows={2}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          {transaction.isManual ? (
            <button
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Table Component ---

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  error: any;
  onUpdate: () => void;
  filters: TransactionFilters;
  setFilters: (updates: Partial<TransactionFilters>) => void;
  isSyncing: boolean;
  onSync: () => void;
}

const FLOW_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'UNRECOGNIZED', label: 'Unrecognized' },
];

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  isLoading,
  error,
  onUpdate,
  filters,
  setFilters,
  isSyncing,
  onSync,
}) => {
  const { getToken } = useAuth();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Which column's filter popover is open, and where to render it
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  // Sub-categories for the selected category — fetched here since the category filter lives here
  const { data: availableSubCategories } = useSWR<SubCategory[]>(
    filters.categoryId ? [`/api/v1/categories/${filters.categoryId}/subcategories`, getToken] : null,
    ([url, getTokenFn]: [string, () => Promise<string | null>]) => authedFetcher(url, getTokenFn)
  );

  /** Open a fixed-position filter popover anchored below the clicked button. */
  const openFilter = (name: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (activeFilter === name) { setActiveFilter(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    // Keep popover on-screen horizontally (assume max width 320px)
    const left = Math.min(rect.left, window.innerWidth - 328);
    setPopoverPos({ top: rect.bottom + 6, left: Math.max(8, left) });
    setActiveFilter(name);
  };

  const closeFilter = () => setActiveFilter(null);

  /** Apply a named date preset and close the popover. */
  const applyDatePreset = (preset: string) => {
    const now = new Date();
    const ranges: Record<string, [string, string]> = {
      week:  [format(startOfWeek(now),  'yyyy-MM-dd'), format(endOfWeek(now),  'yyyy-MM-dd')],
      month: [format(startOfMonth(now), 'yyyy-MM-dd'), format(endOfMonth(now), 'yyyy-MM-dd')],
      year:  [format(startOfYear(now),  'yyyy-MM-dd'), format(endOfYear(now),  'yyyy-MM-dd')],
      all:   ['', ''],
    };
    const [start, end] = ranges[preset] ?? ['', ''];
    setFilters({ startDate: start, endDate: end });
    closeFilter();
  };

  // Which filter columns have an active value (drives icon highlight)
  const isActive: Record<string, boolean> = {
    date:        !!(filters.startDate || filters.endDate),
    amount:      !!(filters.amount && filters.amountOperator),
    description: !!filters.description,
    account:     !!filters.accountId,
    flow:        !!filters.flow,
    category:    !!(filters.categoryId || filters.subCategoryId),
  };

  /** Small filter icon shown in column headers. Highlights blue when the filter is active. */
  const FilterBtn = ({
    name,
    onClick,
  }: {
    name: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  }) => (
    <button
      onClick={onClick}
      className={`ml-1 p-0.5 rounded transition-colors ${
        isActive[name]
          ? 'text-blue-400'
          : 'text-gray-600 hover:text-gray-400'
      } ${activeFilter === name ? 'bg-gray-700 text-gray-200' : ''}`}
      title={`Filter by ${name}`}
    >
      <Filter className="w-3 h-3" />
    </button>
  );

  /** Wrapper rendered inside each filter popover — consistent header + dismiss X. */
  const PopoverHeader = ({ label, onClear }: { label: string; onClear?: () => void }) => (
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        {onClear && (
          <button onClick={onClear} className="text-xs text-blue-400 hover:text-blue-300">
            Clear
          </button>
        )}
        <button onClick={closeFilter} className="ml-2 text-gray-500 hover:text-gray-300">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  // --- Row helpers ---

  const handleSaved = () => { setEditingTransaction(null); onUpdate(); };
  const handleDeleted = () => { setEditingTransaction(null); onUpdate(); };

  const handleToggleHidden = async (transaction: Transaction) => {
    setTogglingId(transaction.id);
    try {
      const token = await getToken();
      await api.patch(
        `/api/v1/transactions/${transaction.id}`,
        { isHidden: !transaction.isHidden },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onUpdate();
    } catch {
      alert('Failed to update transaction.');
    }
    setTogglingId(null);
  };

  const formatAmount = (amount: number, flow: TransactionFlow, accountType: string) => {
    const value = Math.abs(amount);
    let sign = '';
    let color = 'text-gray-200';
    if (flow === 'INCOME') { sign = '+'; color = 'text-green-400'; }
    else if (flow === 'EXPENSE') { sign = '-'; color = 'text-red-400'; }
    else if (flow === 'TRANSFER') {
      sign = accountType === 'credit' ? '+' : '-';
      color = accountType === 'credit' ? 'text-green-400' : 'text-gray-400';
    }
    return {
      display: `${sign} ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}`,
      color,
    };
  };

  // --- Render ---

  return (
    <>
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {/* Click-away backdrop — closes the active filter popover */}
      {activeFilter && (
        <div className="fixed inset-0 z-40" onClick={closeFilter} />
      )}

      {/* ── Filter Popovers (fixed position, above backdrop) ─────────────── */}

      {/* Date filter */}
      {activeFilter === 'date' && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 w-72"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <PopoverHeader
            label="Date Range"
            onClear={isActive.date ? () => { setFilters({ startDate: '', endDate: '' }); closeFilter(); } : undefined}
          />
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'year', label: 'This Year' },
              { key: 'all', label: 'All Time' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => applyDatePreset(key)}
                className="px-2.5 py-1 text-xs rounded-full bg-gray-700 hover:bg-blue-700 text-gray-300 hover:text-white transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
          {/* Custom date inputs */}
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ startDate: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ endDate: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]"
              />
            </div>
          </div>
          <button
            onClick={closeFilter}
            className="mt-3 w-full py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      )}

      {/* Amount filter */}
      {activeFilter === 'amount' && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 w-64"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <PopoverHeader
            label="Amount"
            onClear={isActive.amount ? () => setFilters({ amountOperator: '', amount: '' }) : undefined}
          />
          <div className="space-y-2">
            <select
              value={filters.amountOperator}
              onChange={(e) => setFilters({ amountOperator: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Operator…</option>
              <option value="eq">= equals</option>
              <option value="gt">&gt; greater than</option>
              <option value="lt">&lt; less than</option>
              <option value="gte">&gt;= at least</option>
              <option value="lte">&lt;= at most</option>
            </select>
            <input
              type="number"
              value={filters.amount}
              onChange={(e) => setFilters({ amount: e.target.value })}
              placeholder="e.g. 50.00"
              disabled={!filters.amountOperator}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-40"
            />
          </div>
        </div>
      )}

      {/* Description filter */}
      {activeFilter === 'description' && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 w-64"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <PopoverHeader
            label="Description Contains"
            onClear={isActive.description ? () => setFilters({ description: '' }) : undefined}
          />
          <input
            type="text"
            value={filters.description}
            onChange={(e) => setFilters({ description: e.target.value })}
            placeholder="e.g. Coffee, Uber…"
            autoFocus
            className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Account filter */}
      {activeFilter === 'account' && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 w-72"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <PopoverHeader
            label="Account"
            onClear={isActive.account ? () => setFilters({ accountId: '' }) : undefined}
          />
          <AccountSelect value={filters.accountId} onChange={(id) => setFilters({ accountId: id })} />
          {/* Sync button — only available when an account is selected */}
          {filters.accountId && (
            <button
              onClick={() => onSync()}
              disabled={isSyncing}
              className="mt-3 w-full flex items-center justify-center gap-2 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing…' : 'Sync Account'}
            </button>
          )}
        </div>
      )}

      {/* Flow filter */}
      {activeFilter === 'flow' && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 w-52"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <PopoverHeader
            label="Flow"
            onClear={isActive.flow ? () => setFilters({ flow: '' }) : undefined}
          />
          <div className="space-y-1">
            {FLOW_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setFilters({ flow: value }); closeFilter(); }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  filters.flow === value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      {activeFilter === 'category' && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 w-72"
          style={{ top: popoverPos.top, left: popoverPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <PopoverHeader
            label="Category"
            onClear={(filters.categoryId || filters.subCategoryId)
              ? () => setFilters({ categoryId: '', subCategoryId: '', subCategoryName: '' })
              : undefined}
          />
          <CategorySelect
            value={filters.categoryId}
            onChange={(id) => setFilters({ categoryId: id, subCategoryId: '', subCategoryName: '' })}
          />
          {/* Sub-category dropdown — only when a parent category is selected */}
          {filters.categoryId && (
            <div className="mt-2">
              <select
                value={filters.subCategoryId}
                onChange={(e) => {
                  const sc = availableSubCategories?.find(s => s.id === e.target.value);
                  setFilters({ subCategoryId: e.target.value, subCategoryName: sc?.name ?? '' });
                }}
                className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Sub-Categories</option>
                {availableSubCategories?.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
            </div>
          )}
          {/* Sub-category chip when deep-linked without a parent category */}
          {!filters.categoryId && filters.subCategoryId && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-gray-700 border border-blue-600 rounded-lg">
              <span className="text-sm text-blue-300 flex-1 truncate">{filters.subCategoryName || filters.subCategoryId}</span>
              <button
                onClick={() => setFilters({ subCategoryId: '', subCategoryName: '' })}
                className="text-gray-400 hover:text-white flex-shrink-0"
                title="Clear sub-category filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto overflow-y-auto h-[calc(100vh-14rem)] shadow ring-1 ring-white ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800 sticky top-0 z-10">
            <tr>
              {/* Date column */}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                <div className="flex items-center">
                  Date
                  <FilterBtn name="date" onClick={(e) => openFilter('date', e)} />
                </div>
              </th>

              {/* Amount column */}
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                <div className="flex items-center justify-end">
                  Amount
                  <FilterBtn name="amount" onClick={(e) => openFilter('amount', e)} />
                </div>
              </th>

              {/* Description column */}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                <div className="flex items-center">
                  Description
                  <FilterBtn name="description" onClick={(e) => openFilter('description', e)} />
                </div>
              </th>

              {/* Account column */}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                <div className="flex items-center">
                  Account
                  <FilterBtn name="account" onClick={(e) => openFilter('account', e)} />
                </div>
              </th>

              {/* Flow column */}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                <div className="flex items-center">
                  Flow
                  <FilterBtn name="flow" onClick={(e) => openFilter('flow', e)} />
                </div>
              </th>

              {/* Category column */}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                <div className="flex items-center">
                  Category
                  <FilterBtn name="category" onClick={(e) => openFilter('category', e)} />
                </div>
              </th>

              {/* Notes column — no filter */}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Notes</th>

              {/* Actions — no filter */}
              <th scope="col" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-gray-800/50 divide-y divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-red-400">
                  Failed to load transactions.
                </td>
              </tr>
            ) : !transactions || transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <p className="text-sm text-gray-400">No transactions match the current filters.</p>
                  <p className="text-xs text-gray-600 mt-1">Click the blue filter icons above to adjust or clear filters.</p>
                </td>
              </tr>
            ) : transactions.map((transaction) => {
              const hidden = transaction.isHidden;
              const formattedAmount = formatAmount(
                parseFloat(transaction.amount),
                transaction.flow,
                transaction.account.type
              );
              return (
                <tr key={transaction.id} className={`hover:bg-gray-800 group ${hidden ? 'opacity-40' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-mono ${formattedAmount.color}`}>
                    {formattedAmount.display}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white max-w-xs">
                    <span title={transaction.description}>
                      {transaction.description.length > 75
                        ? transaction.description.slice(0, 75) + '…'
                        : transaction.description}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {transaction.account.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      transaction.flow === 'INCOME'       ? 'bg-green-900 text-green-300'  :
                      transaction.flow === 'EXPENSE'      ? 'bg-red-900 text-red-300'      :
                      transaction.flow === 'TRANSFER'     ? 'bg-gray-700 text-gray-300'    :
                      'bg-yellow-900 text-yellow-300'
                    }`}>
                      {transaction.flow}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {transaction.category?.name ?? <span className="text-gray-600">—</span>}
                    {transaction.subCategory && (
                      <span className="ml-1.5 text-xs text-gray-500">/ {transaction.subCategory.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-[160px]">
                    {transaction.notes
                      ? <span title={transaction.notes} className="truncate block">{transaction.notes}</span>
                      : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleHidden(transaction)}
                        disabled={togglingId === transaction.id}
                        className={`transition-opacity p-1.5 rounded-md hover:bg-gray-700 disabled:opacity-30 ${
                          hidden
                            ? 'text-gray-500 opacity-100'
                            : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white'
                        }`}
                        title={hidden ? 'Unhide transaction' : 'Hide transaction'}
                      >
                        {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setEditingTransaction(transaction)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700"
                        title="Edit transaction"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default TransactionTable;
