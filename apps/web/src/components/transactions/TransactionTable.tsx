"use client";

import React, { useState, useEffect } from 'react';
import { TransactionFlow } from '@/lib/types';
import { api, authedFetcher } from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import useSWR from 'swr';
import { Eye, EyeOff } from 'lucide-react';

// --- Types --- //
interface Category {
  id: string;
  name: string;
}
interface SubCategory {
  id: string;
  name: string;
}
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
}

// --- Edit Modal --- //
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
  useEffect(() => {
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
        // Match case-insensitively against existing sub-categories
        const match = subCategories?.find(
          sc => sc.name.toLowerCase() === subCategoryText.trim().toLowerCase()
        );
        if (match) {
          resolvedSubCategoryId = match.id;
        } else {
          // Create a new sub-category
          const res = await api.post(
            `/api/v1/categories/${categoryId}/subcategories`,
            { name: subCategoryText.trim() },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          resolvedSubCategoryId = res.data.id;
          mutateSubCategories(); // refresh suggestions cache
        }
      }

      await api.patch(
        `/api/v1/transactions/${transaction.id}`,
        { flow, categoryId: categoryId || null, subCategoryId: resolvedSubCategoryId },
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
        {/* Header */}
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

        {/* Flow */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Flow</label>
          <select value={flow} onChange={(e) => setFlow(e.target.value as TransactionFlow)} className={selectClass}>
            <option value={TransactionFlow.INCOME}>Income</option>
            <option value={TransactionFlow.EXPENSE}>Expense</option>
            <option value={TransactionFlow.TRANSFER}>Transfer</option>
            <option value={TransactionFlow.UNRECOGNIZED}>Unrecognized</option>
          </select>
        </div>

        {/* Category */}
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

        {/* Sub-Category */}
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

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          {transaction.isManual ? (
            <button
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          ) : (
            <span />
          )}
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

// --- Main Table Component --- //
interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  error: any;
  onUpdate: () => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, isLoading, error, onUpdate }) => {
  const { getToken } = useAuth();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleSaved = () => {
    setEditingTransaction(null);
    onUpdate();
  };

  const handleDeleted = () => {
    setEditingTransaction(null);
    onUpdate();
  };

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

  if (isLoading) return <div className="text-center p-8">Loading...</div>;
  if (error) return <div className="text-center p-8 text-red-400">Failed to load.</div>;
  if (!transactions || transactions.length === 0)
    return <div className="text-center py-12 px-4 bg-gray-800/50 rounded-lg"><h3>No transactions found.</h3></div>;

  const formatAmount = (amount: number, flow: TransactionFlow, accountType: string) => {
    const value = Math.abs(amount);
    let sign = '';
    let color = 'text-gray-200';

    if (flow === 'INCOME') {
      sign = '+';
      color = 'text-green-400';
    } else if (flow === 'EXPENSE') {
      sign = '-';
      color = 'text-red-400';
    } else if (flow === 'TRANSFER') {
      if (accountType === 'credit') {
        sign = '+';
        color = 'text-green-400';
      } else {
        sign = '-';
        color = 'text-gray-400';
      }
    }

    return {
      display: `${sign} ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}`,
      color,
    };
  };

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

      <div className="overflow-x-auto overflow-y-auto h-[calc(100vh-14rem)] shadow ring-1 ring-white ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Account</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Flow</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
              <th scope="col" className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-gray-800/50 divide-y divide-gray-700">
            {transactions.map((transaction) => {
              const hidden = transaction.isHidden;
              const formattedAmount = formatAmount(parseFloat(transaction.amount), transaction.flow, transaction.account.type);
              return (
                <tr key={transaction.id} className={`hover:bg-gray-800 group ${hidden ? 'opacity-40' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(transaction.date).toLocaleDateString()}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-mono ${formattedAmount.color}`}>
                    {formattedAmount.display}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white max-w-xs">
                    <span title={transaction.description}>
                      {transaction.description.length > 75 ? transaction.description.slice(0, 75) + '…' : transaction.description}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{transaction.account.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${transaction.flow === 'INCOME' ? 'bg-green-900 text-green-300' : transaction.flow === 'EXPENSE' ? 'bg-red-900 text-red-300' : transaction.flow === 'TRANSFER' ? 'bg-gray-700 text-gray-300' : 'bg-yellow-900 text-yellow-300'}`}>
                      {transaction.flow}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {transaction.category?.name ?? <span className="text-gray-600">—</span>}
                    {transaction.subCategory && (
                      <span className="ml-1.5 text-xs text-gray-500">/ {transaction.subCategory.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleHidden(transaction)}
                        disabled={togglingId === transaction.id}
                        className={`transition-opacity p-1.5 rounded-md hover:bg-gray-700 disabled:opacity-30 ${hidden ? 'text-gray-500 opacity-100' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white'}`}
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
