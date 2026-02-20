"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useTellerConnect } from 'teller-connect-react';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '@clerk/nextjs';
import { api } from '@/lib/api';

type Mode = 'picker' | 'manual' | null;

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

const AddAccountButton = () => {
  const { getToken } = useAuth();
  const [mode, setMode] = useState<Mode>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Manual form state
  const [name, setName] = useState('');
  const [type, setType] = useState('cash');
  const [institutionName, setInstitutionName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Plaid link token state
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);

  // Fetch Plaid link token when picker opens
  useEffect(() => {
    if (mode !== 'picker') return;
    let cancelled = false;
    const fetchLinkToken = async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/v1/plaid/link-token', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPlaidLinkToken(data.linkToken);
      } catch {
        // Plaid unavailable — button stays disabled
      }
    };
    fetchLinkToken();
    return () => { cancelled = true; };
  }, [mode, getToken]);

  const { open: openTeller, ready: tellerReady } = useTellerConnect({
    applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID!,
    environment: process.env.NEXT_PUBLIC_TELLER_ENV as 'sandbox' | 'development' | 'production' | undefined,
    onSuccess: async (enrollment) => {
      const token = await getToken();
      if (!token) { alert('Authentication error. Please try again.'); return; }
      try {
        setIsConnecting(true);
        const response = await fetch('/api/v1/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            accessToken: enrollment.accessToken,
            tellerId: enrollment.enrollment.id,
            institutionName: enrollment.enrollment.institution.name,
          }),
        });
        if (!response.ok) throw new Error('Failed to save connection');
        alert('Account connected successfully! Your accounts will now be synced.');
        window.location.reload();
      } catch {
        alert('Failed to connect account. Please try again.');
      } finally {
        setIsConnecting(false);
      }
    },
  });

  const onPlaidSuccess = useCallback(async (publicToken: string, metadata: any) => {
    const token = await getToken();
    if (!token) { alert('Authentication error. Please try again.'); return; }
    try {
      setIsConnecting(true);
      const institution = metadata?.institution?.name ?? 'Unknown Bank';
      const response = await fetch('/api/v1/plaid/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ publicToken, institutionName: institution }),
      });
      if (!response.ok) throw new Error('Failed to exchange token');
      alert('Account connected via Plaid! Your accounts will now be synced.');
      window.location.reload();
    } catch {
      alert('Failed to connect Plaid account. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  }, [getToken]);

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    token: plaidLinkToken,
    onSuccess: onPlaidSuccess,
  });

  // Close modal on Escape
  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  const closeModal = () => {
    setMode(null);
    setName('');
    setType('cash');
    setInstitutionName('');
    setPlaidLinkToken(null);
  };

  const handleTellerSelect = () => {
    closeModal();
    openTeller();
  };

  // Do NOT call closeModal here — resetting plaidLinkToken to null would destroy
  // the usePlaidLink instance before openPlaid() can open the Plaid dialog.
  const handlePlaidSelect = () => {
    setMode(null);
    openPlaid();
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const token = await getToken();
      await api.post(
        '/api/v1/accounts',
        { name: name.trim(), type, institutionName: institutionName.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.reload();
    } catch {
      alert('Failed to create account. Please try again.');
    }
    setIsSaving(false);
  };

  const inputClass = 'bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5';

  return (
    <>
      <button
        onClick={() => setMode('picker')}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm"
      >
        + Add Account
      </button>

      {mode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={closeModal}
        >
          <div
            className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Picker */}
            {mode === 'picker' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Add Account</h2>
                  <button onClick={closeModal} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
                </div>
                <p className="text-sm text-gray-400">How would you like to add your account?</p>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {/* Teller */}
                  <button
                    onClick={handleTellerSelect}
                    disabled={!tellerReady || isConnecting}
                    className="flex flex-col items-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl border border-gray-600 hover:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white">Teller</p>
                      <p className="text-xs text-gray-400 mt-0.5">US Banks</p>
                    </div>
                  </button>

                  {/* Plaid */}
                  <button
                    onClick={handlePlaidSelect}
                    disabled={!plaidReady || isConnecting}
                    className="flex flex-col items-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl border border-gray-600 hover:border-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white">Plaid</p>
                      <p className="text-xs text-gray-400 mt-0.5">US & Canada</p>
                    </div>
                  </button>

                  {/* Manual */}
                  <button
                    onClick={() => setMode('manual')}
                    className="flex flex-col items-center gap-2 p-4 bg-gray-700 hover:bg-gray-600 rounded-xl border border-gray-600 hover:border-purple-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-white">Manual</p>
                      <p className="text-xs text-gray-400 mt-0.5">Cash, etc.</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Manual form */}
            {mode === 'manual' && (
              <form onSubmit={handleManualSave} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setMode('picker')} className="text-gray-400 hover:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <h2 className="text-lg font-semibold text-white">Add Manual Account</h2>
                  </div>
                  <button type="button" onClick={closeModal} className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Account Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cash, Splitwise Balance"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Account Type *</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Institution / Source <span className="normal-case text-gray-500">(optional)</span></label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="e.g. Splitwise, Wallet"
                    className={inputClass}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !name.trim()}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Creating…' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AddAccountButton;
