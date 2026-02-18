import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-indigo-600 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-gray-800 mb-1">Page not found</h2>
      <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
      <Link
        href="/home"
        className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
      >
        Go to Home
      </Link>
    </div>
  );
}
