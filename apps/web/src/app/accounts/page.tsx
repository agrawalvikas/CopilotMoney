
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import axios from 'axios';

type Account = {
  id: string;
  name: string;
  mask: string;
  type: string;
  balance: number;
  currency: string;
  institutionName: string;
};

async function getAccounts(userId: string, token: string): Promise<Account[]> {
  try {
    const response = await axios.get("http://127.0.0.1:3001/api/v1/accounts", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch accounts:", error);
    return [];
  }
}

export default async function AccountsPage() {
  const { userId, getToken } = await auth();

  if (!userId) {
    return (
      <div className="p-8">
        <p>You are not logged in. Please <Link href="/sign-in" className="underline">sign in</Link>.</p>
      </div>
    );
  }

  const token = await getToken();

  if (!token) {
    return (
      <div className="p-8">
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
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {accounts.length > 0 ? (
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Institution
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Account Name
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Type
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accounts.map((account) => (
                      <tr key={account.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {account.institutionName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {account.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {account.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: account.currency,
                          }).format(account.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 px-4 sm:px-6 lg:px-8 bg-white rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900">
                  No accounts found.
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by connecting a financial account.
                </p>
                <div className="mt-6">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add an Account
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
