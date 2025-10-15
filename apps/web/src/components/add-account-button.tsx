"use client";

import React from 'react';
import { useTellerConnect } from 'teller-connect-react';
import { useAuth } from '@clerk/nextjs';

const AddAccountButton = () => {
  const auth = useAuth();
  console.log('Auth object from useAuth() on the client:', auth);
  const { getToken } = auth;
  const [isConnecting, setIsConnecting] = React.useState(false);

  const { open, ready } = useTellerConnect({
    applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID!,
    environment: process.env.NEXT_PUBLIC_TELLER_ENV as "sandbox" | "development" | "production" | undefined,
    onSuccess: async (enrollment) => {
      const token = await getToken();
      if (!token) {
        console.error('User is not authenticated');
        alert('Authentication error. Please try again.');
        return;
      }

      try {
        setIsConnecting(true);
        console.log('Saving connection and syncing accounts...');

        const response = await fetch('/api/v1/connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            accessToken: enrollment.accessToken,
            tellerId: enrollment.enrollment.id,
            institutionName: enrollment.enrollment.institution.name,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save connection');
        }

        alert('Account connected successfully! Your accounts will now be synced.');

        // Refresh the page to show new accounts, or navigate to the accounts page
        window.location.reload();

      } catch (error) {
        console.error('Error saving connection:', error);
        alert('Failed to connect account. Please try again.');
      } finally {
        setIsConnecting(false);
      }
    },
  });

  return (
    <button
      onClick={() => open()}
      disabled={!ready || isConnecting}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
    >
      {isConnecting ? 'Connecting...' : 'Add Account'}
    </button>
  );
};

export default AddAccountButton;
