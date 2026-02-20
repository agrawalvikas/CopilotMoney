import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { api } from '@/lib/api';
import type { Account } from '@/lib/types';
import AddAccountButton from "@/components/add-account-button";
import DeleteAccountButton from "@/components/accounts/DeleteAccountButton";

// Account types that represent money owed (liabilities)
const LIABILITY_TYPES = new Set(['credit', 'loan']);

function isLiability(type: string) {
  return LIABILITY_TYPES.has(type.toLowerCase());
}

const TYPE_META: Record<string, { label: string; className: string }> = {
  checking:   { label: 'Checking',    className: 'bg-blue-900/50 text-blue-300' },
  savings:    { label: 'Savings',     className: 'bg-emerald-900/50 text-emerald-300' },
  credit:     { label: 'Credit Card', className: 'bg-orange-900/50 text-orange-300' },
  investment: { label: 'Investment',  className: 'bg-purple-900/50 text-purple-300' },
  loan:       { label: 'Loan',        className: 'bg-red-900/50 text-red-300' },
  other:      { label: 'Other',       className: 'bg-gray-700 text-gray-300' },
};

function typeMeta(type: string) {
  return TYPE_META[type.toLowerCase()] ?? { label: type, className: 'bg-gray-700 text-gray-300' };
}

const formatCurrency = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

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

/** One table row for an account. Uses `group` so the trash icon fades in on hover. */
function AccountRow({ account }: { account: Account }) {
  const meta = typeMeta(account.type);
  return (
    <tr className="group hover:bg-gray-800/60 transition-colors">
      {/* Institution avatar + name */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-gray-300">
            {account.institutionName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-white">{account.institutionName}</span>
        </div>
      </td>
      {/* Account name + mask + manual badge */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
        {account.name}{account.mask ? <span className="text-gray-500"> •••{account.mask}</span> : ''}
        {account.isManual && (
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-900 text-blue-300 rounded">Manual</span>
        )}
      </td>
      {/* Type badge */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${meta.className}`}>
          {meta.label}
        </span>
      </td>
      {/* Balance */}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono font-semibold">
        {account.balance != null
          ? <span className={isLiability(account.type) ? 'text-red-400' : 'text-white'}>
              {formatCurrency(Number(account.balance), account.currency)}
            </span>
          : <span className="text-gray-600">—</span>}
      </td>
      {/* Available balance */}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-mono text-gray-400">
        {account.availableBalance != null
          ? formatCurrency(Number(account.availableBalance), account.currency)
          : <span className="text-gray-600">—</span>}
      </td>
      {/* Delete (trash icon, fades in on row hover) */}
      <td className="px-4 py-4 whitespace-nowrap text-right">
        <DeleteAccountButton
          accountId={account.id}
          accountName={`${account.name} (${account.institutionName})`}
        />
      </td>
    </tr>
  );
}

/** Shared table shell used for both Assets and Liabilities sections. */
function AccountTable({ accounts, availableLabel = 'Available' }: { accounts: Account[]; availableLabel?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-800">
      <table className="min-w-full divide-y divide-gray-800">
        <thead className="bg-gray-800/60">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Institution</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">{availableLabel}</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60 bg-gray-900/40">
          {accounts.map((account) => (
            <AccountRow key={account.id} account={account} />
          ))}
        </tbody>
      </table>
    </div>
  );
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
        <p>Could not retrieve authentication token. Please <Link href="/sign-in" className="underline">sign in</Link> again.</p>
      </div>
    );
  }

  const accounts = await getAccounts(userId, token);

  // Separate assets and liabilities
  const assets      = accounts.filter(a => !isLiability(a.type));
  const liabilities = accounts.filter(a =>  isLiability(a.type));

  // Prisma Decimal fields serialize as strings in JSON — coerce to number before summing
  const totalAssets      = assets.reduce((sum, a) => sum + Number(a.balance ?? 0), 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + Number(a.balance ?? 0), 0);
  const netWorth         = totalAssets - totalLiabilities;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold tracking-tight">Copilot Money</h1>
              <nav className="hidden md:flex space-x-4">
                <Link href="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white">Dashboard</Link>
                <Link href="/accounts" className="px-3 py-2 rounded-md text-sm font-medium bg-gray-800 text-white">Accounts</Link>
                <Link href="/transactions" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white">Transactions</Link>
                <Link href="/settings/rules" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white">Settings</Link>
              </nav>
            </div>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Accounts</h2>
            <p className="text-sm text-gray-500 mt-1">{accounts.length} account{accounts.length !== 1 ? 's' : ''} connected</p>
          </div>
          <AddAccountButton />
        </div>

        {accounts.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/30 rounded-xl border border-gray-800">
            <p className="text-lg font-medium text-white">No accounts found</p>
            <p className="mt-1 text-sm text-gray-400">Connect a financial account to get started.</p>
            <div className="mt-6"><AddAccountButton /></div>
          </div>
        ) : (
          <>
            {/* ── Net Worth Summary ─────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-800">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Assets</p>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalAssets)}</p>
                <p className="text-xs text-gray-500 mt-1">{assets.length} account{assets.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-800">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Liabilities</p>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(totalLiabilities)}</p>
                <p className="text-xs text-gray-500 mt-1">{liabilities.length} account{liabilities.length !== 1 ? 's' : ''}</p>
              </div>
              <div className={`rounded-xl p-5 border ${netWorth >= 0 ? 'bg-blue-950/40 border-blue-800/50' : 'bg-red-950/30 border-red-800/40'}`}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Net Worth</p>
                <p className={`text-2xl font-bold ${netWorth >= 0 ? 'text-blue-300' : 'text-red-400'}`}>
                  {formatCurrency(netWorth)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Assets − Liabilities</p>
              </div>
            </div>

            {/* ── Assets ───────────────────────────────────────────── */}
            {assets.length > 0 && (
              <section className="mb-8">
                <div className="flex items-baseline gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Assets</h3>
                  <span className="text-xs text-gray-500">Checking · Savings · Investments</span>
                  <span className="ml-auto text-sm font-semibold text-emerald-400">{formatCurrency(totalAssets)}</span>
                </div>
                <AccountTable accounts={assets} availableLabel="Available" />
              </section>
            )}

            {/* ── Liabilities ──────────────────────────────────────── */}
            {liabilities.length > 0 && (
              <section>
                <div className="flex items-baseline gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Liabilities</h3>
                  <span className="text-xs text-gray-500">Credit Cards · Loans</span>
                  <span className="ml-auto text-sm font-semibold text-red-400">{formatCurrency(totalLiabilities)}</span>
                </div>
                <AccountTable accounts={liabilities} availableLabel="Credit Limit" />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
