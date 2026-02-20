"use client";

import React, { useState } from 'react';
import { format } from 'date-fns';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { authedFetcher, api } from '@/lib/api';
import type { Account } from '@/lib/types';

interface Category {
  id: string;
  name: string;
}

interface AddTransactionModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ onClose, onSuccess }) => {
  const { getToken } = useAuth();

  const { data: accounts } = useSWR<Account[]>(
    ['/api/v1/accounts', getToken],
    ([url, fn]: [string, () => Promise<string | null>]) => authedFetcher(url, fn)
  );
  const { data: categories } = useSWR<Category[]>(
    ['/api/v1/categories', getToken],
    ([url, fn]: [string, () => Promise<string | null>]) => authedFetcher(url, fn)
  );

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState('');
  const [flow, setFlow] = useState('EXPENSE');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!accountId) {
      setError('Please select an account.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      // type is derived from flow for manual transactions
      const type = flow === 'INCOME' ? 'credit' : 'debit';
      await api.post(
        '/api/v1/transactions',
        {
          description,
          amount: parseFloat(amount),
          date,
          type,
          accountId,
          flow,
          categoryId: categoryId || undefined,
          notes: notes || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to add transaction.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-5">Add Transaction</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Grocery run"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Amount + Flow side by side */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">Flow</label>
              <select
                value={flow}
                onChange={(e) => setFlow(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Account</label>
            <select
              required
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select account...</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.institutionName}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category <span className="text-gray-500">(optional)</span></label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Uncategorized</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes <span className="text-gray-500">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any extra details..."
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
