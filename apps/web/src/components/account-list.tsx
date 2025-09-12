"use client";

import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }

  return res.json();
};

const AccountList = () => {
  const { getToken } = useAuth();
  const { data: accounts, error } = useSWR('/api/v1/accounts', (url) =>
    getToken().then((token) => fetcher(url, token!))
  );

  if (error) return <div>Failed to load accounts</div>;
  if (!accounts) return <div>Loading...</div>;

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <ul className="divide-y divide-gray-200">
        {accounts.map((account: any) => (
          <li key={account.id} className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-indigo-600 truncate">
                {account.name}
              </div>
              <div className="ml-2 flex-shrink-0 flex">
                <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  {account.type}
                </p>
              </div>
            </div>
            <div className="mt-2 sm:flex sm:justify-between">
              <div className="sm:flex">
                <p className="flex items-center text-sm text-gray-500">
                  {account.institution}
                </p>
              </div>
              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                <p>
                  Balance: <span className="font-medium">{account.balance}</span>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AccountList;
