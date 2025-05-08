import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Welcome to PC Portal</h1>
        <p className="text-gray-600 mb-8 text-center">
          The comprehensive project management solution for your business.
        </p>
        <div className="flex justify-center">
          <Link 
            href="/login"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Login to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 