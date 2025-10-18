
"use client";

import React from 'react';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { authedFetcher } from '@/lib/api';

interface Category {
  id: string;
  name: string;
}

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ value, onChange }) => {
  const { getToken } = useAuth();

  const { data: categories, error } = useSWR<Category[]>(
    ['/api/v1/categories', getToken],
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
    >
      <option value="">All Categories</option>
      {error && <option>Failed to load</option>}
      {!categories && <option>Loading...</option>}
      {categories?.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </select>
  );
};

export default CategorySelect;
