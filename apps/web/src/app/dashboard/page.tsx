import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { api } from "@/lib/api";
import AddAccountButton from "@/components/add-account-button";
import DashboardClient from "@/components/dashboard/DashboardClient";

// Define types for the summary data
interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  spendingByCategory: { name: string; total: number }[];
}

// Server-side data fetching function
async function getDashboardSummary(token: string): Promise<SummaryData> {
  try {
    // We use the regular api client here, not axios directly, as this is a server-side fetch.
    // The underlying fetch is patched by Next.js to handle caching.
    // We add a revalidation tag to control caching.
    const response = await api.get("/api/v1/dashboard/summary", {
      headers: { Authorization: `Bearer ${token}` },
      // @ts-ignore
      next: { revalidate: 3600 }, // Revalidate every hour
    });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch dashboard summary:", error);
    // Return a default/empty state in case of error
    return {
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      spendingByCategory: [],
    };
  }
}

export default async function DashboardPage() {
  const { getToken } = await auth();
  const token = await getToken();

  if (!token) {
    return <div>Not authenticated</div>; // Should be handled by middleware, but as a fallback
  }

  const summaryData = await getDashboardSummary(token);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold tracking-tight">Copilot Money</h1>
              <nav className="hidden md:flex space-x-4">
                <Link href="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium bg-gray-800 text-white">
                  Dashboard
                </Link>
                <Link href="/accounts" className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white">
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
        <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="px-4 sm:px-0 flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <AddAccountButton />
          </div>

          {/* Client-side wrapper for the main dashboard grid */}
          <div className="px-4 sm:px-0">
            <DashboardClient summaryData={summaryData} />
          </div>
        </div>
      </main>
    </div>
  );
}