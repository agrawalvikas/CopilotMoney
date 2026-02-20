import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { api } from '@/lib/api';
import type { Account } from '@/lib/types';
import AddAccountButton from "@/components/add-account-button";
import DeleteAccountButton from "@/components/accounts/DeleteAccountButton";

async function getAccounts(userId: string, token: string): Promise<Account[]> {
  try {
    const response = await api.get("/api/v1/accounts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch {
    return [];
  }
}

export default async function AccountsPage() {
  const { userId, getToken } = await auth();

  if (!userId) {
    return (
      <div className="p-8 bg-gray-900 text-white min-h-screen">
        <p>You are not logged in. Please <Link href="/sign-in" className="underline">sign in</Link>.</p>
      </div>
    );
  }

  const token = await getToken();

  if (!token) {
    return (
      <div className="p-8 bg-gray-900 text-white min-h-screen">
        <p>
          Could not retrieve authentication token. Please{" "}
          <Link href="/sign-in" className="underline">
            sign in
          </Link>{" "}
          again.
        </p>
      </div>
    );
  }

  const accounts = await getAccounts(userId, token);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold tracking-tight">Copilot Money</h1>
              <nav className="hidden md:flex space-x-4">
                <Link href="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white">
                  Dashboard
                </Link>
                <Link href="/accounts" className="px-3 py-2 rounded-md text-sm font-medium bg-gray-800 text-white">
                  Accounts
                </Link>
                <Link href="/transactions" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white">
                  Transactions
                </Link>
                <Link href="/settings/rules" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white">
                  Settings
                </Link>
              </nav>
            </div>
            <div className="flex items-center">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="px-4 sm:px-0 flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Your Accounts</h2>
            <AddAccountButton />
          </div>

          <div className="px-4 sm:px-0">
            {accounts.length > 0 ? (
              <div className="overflow-hidden shadow ring-1 ring-white ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Institution
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Account
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Balance
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Available
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/50 divide-y divide-gray-700">
                    {accounts.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {account.institutionName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {account.name}{account.mask ? ` (${account.mask})` : ''}
                          {account.isManual && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-900 text-blue-300 rounded">Manual</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 capitalize">
                          {account.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-gray-200">
                          {account.balance != null
                            ? new Intl.NumberFormat("en-US", { style: "currency", currency: account.currency }).format(account.balance)
                            : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-gray-400">
                          {account.availableBalance != null
                            ? new Intl.NumberFormat("en-US", { style: "currency", currency: account.currency }).format(account.availableBalance)
                            : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <DeleteAccountButton
                            accountId={account.id}
                            accountName={`${account.name} (${account.institutionName})`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-800/50 rounded-lg shadow">
                <h3 className="text-lg font-medium text-white">
                  No accounts found.
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Get started by connecting a financial account.
                </p>
                <div className="mt-6">
                  <AddAccountButton />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}