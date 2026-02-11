import { Home, ArrowLeft } from 'lucide-react';

/**
 * FIX #41: 404 Not Found page component
 */
export default function NotFound({ onNavigateHome }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 p-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white text-5xl font-bold">L</span>
        </div>

        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          <button
            onClick={onNavigateHome || (() => window.location.href = '/')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
          >
            <Home size={18} />
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
