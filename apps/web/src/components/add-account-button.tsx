"use client";

import React from 'react';
import { useTellerConnect } from 'teller-connect-react';
import { useAuth } from '@clerk/nextjs';

const AddAccountButton = () => {
  const { getToken } = useAuth();
  const { open, ready } = useTellerConnect({
    applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID!,
    environment: 'development',
    onSuccess: async (enrollment) => {
      const token = await getToken();
      if (!token) {
        console.error('User is not authenticated');
        return;
      }

      try {
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

        console.log('Successfully saved connection');
      } catch (error) {
        console.error('Error saving connection:', error);
      }
    },
  });

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
    >
      Add Account
    </button>
  );
};

export default AddAccountButton;
