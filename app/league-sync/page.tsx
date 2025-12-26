'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// 1. The inner component that reads the URL
function SyncStatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  useEffect(() => {
    // If successful, wait 2 seconds then go home
    if (status === 'success') {
      const timer = setTimeout(() => {
        router.push('/'); 
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  return (
    <div className="bg-gray-800 p-8 rounded-lg shadow-xl text-center border border-gray-700 max-w-md w-full">
      {status === 'success' ? (
        <>
          <h1 className="text-3xl font-bold text-green-400 mb-4">Sync Successful!</h1>
          <p className="text-gray-300">Your Yahoo leagues have been connected.</p>
          <p className="text-gray-500 text-sm mt-4">Redirecting you to the dashboard...</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold text-red-400 mb-4">Something went wrong</h1>
          <p className="text-gray-300">We couldn't sync your leagues.</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-6 bg-blue-600 px-6 py-2 rounded hover:bg-blue-700"
          >
            Return Home
          </button>
        </>
      )}
    </div>
  );
}

// 2. The main page that wraps everything in Suspense
export default function LeagueSyncPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <Suspense fallback={<div className="text-white">Loading sync status...</div>}>
        <SyncStatusContent />
      </Suspense>
    </div>
  );
}