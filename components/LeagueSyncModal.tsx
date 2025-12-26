"use client";

import React from "react";

// This prop allows the parent page to close the modal if needed
interface LeagueSyncModalProps {
  onClose?: () => void;
}

export default function LeagueSyncModal({ onClose }: LeagueSyncModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
        
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Sync Your League</h2>
        <p className="text-gray-600 mb-8">
          Connect your Yahoo Fantasy account to import your leagues and rosters automatically.
        </p>

        {/* THE MAGIC BUTTON */}
        <a
          href="/api/auth/yahoo/login"
          className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition duration-200"
        >
          Connect Yahoo Account
        </a>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="mt-4 text-gray-500 hover:text-gray-700 text-sm underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}