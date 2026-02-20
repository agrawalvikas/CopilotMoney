"use client";

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface DeleteAccountButtonProps {
  accountId: string;
  accountName: string;
}

const DeleteAccountButton: React.FC<DeleteAccountButtonProps> = ({ accountId, accountName }) => {
  const { getToken } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${accountName}"? This will permanently remove the account and all its transactions.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const token = await getToken();
      await api.delete(`/api/v1/accounts/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      router.refresh(); // Re-run the server component to reflect the deletion
    } catch {
      alert('Failed to delete account.');
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-3 py-1 text-sm font-medium text-white bg-red-700 rounded-md hover:bg-red-800 disabled:bg-gray-500 disabled:cursor-not-allowed"
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  );
};

export default DeleteAccountButton;
