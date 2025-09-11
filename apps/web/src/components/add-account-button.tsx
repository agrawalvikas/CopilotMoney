"use client";

import React from 'react';
import { useAuth } from '@clerk/nextjs';

const AddAccountButton = () => {
  const { getToken } = useAuth();
  return (
    <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
      Add Account
    </button>
  );
};

export default AddAccountButton;
