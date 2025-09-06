import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <main className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Welcome to the Finance Tracker
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Your personal finance companion.
        </p>
        <div className="space-x-4">
          <Link
            href="/dashboard"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/sign-in"
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Sign Up
          </Link>
        </div>
      </main>
    </div>
  );
}
