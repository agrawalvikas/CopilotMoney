
import React from 'react';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { authedFetcher } from '@/lib/api';
import type { Account } from '@/lib/types';

interface AccountSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const AccountSelect: React.FC<AccountSelectProps> = ({ value, onChange }) => {
  const { getToken } = useAuth();

  const { data: accounts, error } = useSWR<Account[]>(
    ['/api/v1/accounts', getToken], // Pass getToken to the fetcher via the key
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  if (error) return <option>Failed to load accounts</option>;
  if (!accounts) return <option>Loading accounts...</option>;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
    >
      <option value="">All Accounts</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name} ({account.institutionName})
        </option>
      ))}
    </select>
  );
};

export default AccountSelect;
