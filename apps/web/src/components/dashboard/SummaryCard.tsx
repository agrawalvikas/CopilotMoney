
"use client";

import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
  // You can add more props like icon, trend, etc. later
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value }) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md">
      <h3 className="text-sm font-medium text-gray-400">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
};

export default SummaryCard;
