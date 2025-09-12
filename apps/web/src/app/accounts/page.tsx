import { UserButton } from "@clerk/nextjs";
import AccountList from "@/components/account-list";

export default function AccountsPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <AccountList />
          </div>
        </div>
      </main>
    </div>
  );
}
