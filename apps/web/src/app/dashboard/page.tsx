
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import AddAccountButton from "@/components/add-account-button";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default function DashboardPage() {
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
          </div>

          {/* Client-side wrapper for the main dashboard grid */}
          <div className="px-4 sm:px-0">
            <DashboardClient />
          </div>
        </div>
      </main>
    </div>
  );
}
