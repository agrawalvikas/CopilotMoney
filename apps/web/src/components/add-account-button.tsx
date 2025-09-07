"use client";

import React from 'react';
import { useTellerConnect } from 'teller-connect-react';
import { useAuth } from '@clerk/nextjs';

const AddAccountButton = () => {
  const { getToken } = useAuth();
  const { open, ready } = useTellerConnect({
    applicationId: process.env.NEXT_PUBLIC_TELLER_APP_ID!,
    onSuccess: async (enrollment) => {
      const token = await getToken();
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/connections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          accessToken: enrollment.accessToken,
          institutionName: enrollment.institution.name,
          tellerId: enrollment.id,
        }),
      });
    },
  });

  return (
    <button onClick={() => open()} disabled={!ready}>
      Add Account
    </button>
  );
};

export default AddAccountButton;
