"use client";

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
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
      router.refresh();
    } catch {
      alert('Failed to delete account.');
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      title={`Delete ${accountName}`}
      className="p-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed rounded"
    >
      <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-pulse' : ''}`} />
    </button>
  );
};

export default DeleteAccountButton;
