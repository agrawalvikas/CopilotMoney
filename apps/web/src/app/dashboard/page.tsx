import { UserButton } from "@clerk/nextjs";
import AddAccountButton from "@/components/add-account-button";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4 text-center">
              <h2 className="text-2xl font-semibold text-gray-700">
                Welcome to your dashboard!
              </h2>
              <p className="mt-2 text-gray-600">
                This page is protected and only accessible to authenticated
                users.
              </p>
              <div className="mt-6 flex justify-center items-center space-x-4">
                <AddAccountButton />
                <Link
                  href="/accounts"
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  View Accounts
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
