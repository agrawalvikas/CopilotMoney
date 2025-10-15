import { UserButton } from "@clerk/nextjs";
import AddAccountButton from "@/components/add-account-button";
import Link from "next/link";

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
            <h2 className="text-3xl font-bold">Welcome to your Dashboard</h2>
            <AddAccountButton />
          </div>

          {/* Placeholder for Dashboard Widgets */}
          <div className="px-4 py-6 sm:px-0">
            <div className="border-2 border-dashed border-gray-700 rounded-lg h-96 p-4 text-center flex items-center justify-center">
              <div className="text-gray-500">
                <h3 className="text-xl font-semibold">
                  Dashboard Widgets Coming Soon
                </h3>
                <p className="mt-2">
                  Charts and financial summaries will be displayed here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}