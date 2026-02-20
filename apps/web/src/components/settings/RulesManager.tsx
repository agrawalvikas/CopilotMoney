
"use client";

import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useAuth } from '@clerk/nextjs';
import { api, authedFetcher } from '@/lib/api';

// Types
interface Rule {
  id: string;
  descriptionContains: string;
  categoryId: string;
  category: { name: string };
}
interface Category {
  id: string;
  name: string;
}

const RulesManager = () => {
  const { getToken } = useAuth();
  const { mutate } = useSWRConfig();

  // Form state for new rule
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);

  // Fetching data
  const { data: rules, error: rulesError } = useSWR<Rule[]>(
    ['/api/v1/rules', getToken],
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );
  const { data: categories, error: categoriesError } = useSWR<Category[]>(
    ['/api/v1/categories', getToken],
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !categoryId) return;
    setIsCreating(true);
    try {
      const token = await getToken();
      await api.post('/api/v1/rules', 
        { descriptionContains: description, categoryId }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      mutate(['/api/v1/rules', getToken]); // Re-fetch rules
      setDescription('');
      setCategoryId('');
    } catch {
      alert("Failed to create rule.");
    }
    setIsCreating(false);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      const token = await getToken();
      await api.delete(`/api/v1/rules/${ruleId}`, { headers: { Authorization: `Bearer ${token}` } });
      mutate(['/api/v1/rules', getToken]); // Re-fetch rules
    } catch {
      alert("Failed to delete rule.");
    }
  };

  const handleBackfill = async () => {
    if (!confirm('This will apply all your rules to all past transactions. This may take a moment. Continue?')) return;
    setIsBackfilling(true);
    try {
      const token = await getToken();
      const response = await api.post('/api/v1/transactions/backfill-rules', {}, { headers: { Authorization: `Bearer ${token}` } });
      alert(response.data.message);
    } catch {
      alert("Failed to apply rules.");
    }
    setIsBackfilling(false);
  };

  return (
    <div className="space-y-8">
      {/* Create Rule Form */}
      <div className="bg-gray-800/50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Create New Rule</h3>
        <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">If description contains...</label>
            <input 
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., 'Walmart' or 'Uber'"
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">Set category to...</label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              disabled={!categories}
            >
              <option value="">Select a category</option>
              {categories?.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button type="submit" disabled={isCreating} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
              {isCreating ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Rules List */}
      <div className="bg-gray-800/50 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Your Rules</h3>
          <button onClick={handleBackfill} disabled={isBackfilling} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-500">
            {isBackfilling ? 'Applying...' : 'Apply Rules to Past Transactions'}
          </button>
        </div>
        <div className="divide-y divide-gray-700">
          {rulesError && <p className="text-red-400">Failed to load rules.</p>}
          {!rules && !rulesError && <p className="text-gray-400">Loading rules...</p>}
          {rules?.length === 0 && <p className="text-gray-400">You haven't created any rules yet.</p>}
          {rules?.map(rule => (
            <div key={rule.id} className="flex justify-between items-center py-3">
              <div>
                <span className="text-gray-400">If description contains </span>
                <span className="font-mono text-blue-400">'{rule.descriptionContains}'</span>
                <span className="text-gray-400">, set category to </span>
                <span className="font-semibold text-white">{rule.category.name}</span>
              </div>
              <button onClick={() => handleDeleteRule(rule.id)} className="text-red-500 hover:text-red-400 text-sm">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RulesManager;
