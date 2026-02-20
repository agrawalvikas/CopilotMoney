
"use client";

import React from 'react';
import Link from 'next/link';

interface SummaryCardProps {
  title: string;
  value: string;
  href?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, href }) => {
  const inner = (
    <>
      <h3 className="text-sm font-medium text-gray-400">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="bg-gray-800/50 p-6 rounded-lg shadow-md block hover:bg-gray-700/50 transition-colors">
        {inner}
      </Link>
    );
  }

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-md">
      {inner}
    </div>
  );
};

export default SummaryCard;
