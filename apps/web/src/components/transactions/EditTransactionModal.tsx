
"use client";

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { api, authedFetcher } from '@/lib/api';

// Types
interface Transaction {
  id: string;
  description: string;
  amount: string; // Amount is a string
  date: string;
  flow: string; // Not strictly needed here, but good for consistency
  account: { name: string };
  categoryId: string | null;
  notes: string | null;
}
interface Category {
  id: string;
  name: string;
}

// Modal Props
interface EditTransactionModalProps {
  transaction: Transaction | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, onClose, onSuccess }) => {
  const { getToken } = useAuth();
  
  // Form state
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
  const { data: categories, error: categoriesError } = useSWR<Category[]>(
    transaction ? ['/api/v1/categories', getToken] : null, // Only fetch if modal is open
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  // This effect syncs the form state with the transaction prop when it changes.
  useEffect(() => {
    if (transaction) {
      setCategoryId(transaction.categoryId ?? '');
      setNotes(transaction.notes ?? '');
    } else {
      // Reset form when modal is closed
      setCategoryId('');
      setNotes('');
      setError(null);
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    // This is the payload to be sent. `notes` will be a string or empty string.
    const payload = {
      categoryId: categoryId || null, // Send null if categoryId is an empty string
      notes: notes || null, // Send the notes state directly (which is a string)
    };

    console.log('--- Submitting Transaction Update ---');
    console.log('Transaction ID:', transaction.id);
    console.log('Payload being sent:', payload);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('User not authenticated');
      }
      console.log('Using auth token:', token);

      await api.patch(`/api/v1/transactions/${transaction.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('--- Update successful ---');
      onSuccess(); // Trigger re-fetch in parent
      onClose(); // Close modal
    } catch (err) {
      setError('Failed to update transaction. Please try again.');
      console.error('Update failed with error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">&times;</button>
        <h2 className="text-2xl font-bold mb-4 text-white">Edit Transaction</h2>
        <p className="text-sm text-gray-400 mb-6 truncate">{transaction.description}</p>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">Category</label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                disabled={!categories}
              >
                <option value="">Uncategorized</option>
                {categoriesError && <option>Error loading categories</option>}
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTransactionModal;
