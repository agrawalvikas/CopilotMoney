
import Link from "next/link";
import { ArrowRight } from "lucide-react"; // Assuming lucide-react for icons, will need to be installed

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Copilot Money</h1>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-gray-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up" className="bg-white text-gray-900 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors font-semibold">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Glow Effects */}
      <main className="flex-grow flex items-center justify-center relative">
        <div className="relative z-10 text-center px-4 glow-1 glow-2">
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 leading-tight">
            The smartest way to manage your money.
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            An intelligent, automated, and secure platform to track your spending, grow your savings, and build wealth.
          </p>
          <div className="flex justify-center">
            <Link
              href="/dashboard"
              className="group inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 text-lg font-semibold shadow-lg shadow-blue-500/30"
            >
              Get Started
              {/* This icon is a placeholder, as I can't add new dependencies like lucide-react myself */}
              <span className="ml-2 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Copilot Money. All rights reserved.</p>
      </footer>
    </div>
  );
}
