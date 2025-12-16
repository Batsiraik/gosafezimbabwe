import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-nexryde-yellow-darker flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="text-6xl mb-4">404</div>
          <h1 className="text-2xl font-bold text-white mb-4">Page Not Found</h1>
          <p className="text-white/80 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-nexryde-yellow text-white py-3 px-6 rounded-xl font-semibold hover:bg-nexryde-yellow-dark transition-all duration-200"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

