
"use client";

import React from 'react';

interface AmountFilterProps {
  operator: string;
  amount: string;
  onOperatorChange: (op: string) => void;
  onAmountChange: (amount: string) => void;
}

const AmountFilter: React.FC<AmountFilterProps> = ({ operator, amount, onOperatorChange, onAmountChange }) => {
  return (
    <div className="flex items-center gap-2">
      <select
        value={operator}
        onChange={(e) => onOperatorChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-1/3 p-2.5"
      >
        <option value="">Operator</option>
        <option value="eq">=</option>
        <option value="gt">&gt;</option>
        <option value="lt">&lt;</option>
        <option value="gte">&gt;=</option>
        <option value="lte">&lt;=</option>
      </select>
      <input
        type="number"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="e.g., 50.00"
        className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-2/3 p-2.5"
        disabled={!operator}
      />
    </div>
  );
};

export default AmountFilter;
