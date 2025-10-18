
"use client";

import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ currentPage, totalPages, onPageChange, limit, onLimitChange }) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null; // Don't render controls if there's only one page
  }

  return (
    <div className="flex items-center justify-between mt-6">
      {/* Per Page Dropdown */}
      <div className="flex items-center gap-2">
        <label htmlFor="limit-select" className="text-sm text-gray-400">Per Page:</label>
        <select
          id="limit-select"
          value={limit}
          onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Page Info and Nav */}
      <div className="flex items-center gap-4">
        <p className="text-sm text-gray-400">
          Page <span className="font-medium text-white">{currentPage}</span> of <span className="font-medium text-white">{totalPages}</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevious}
            disabled={currentPage <= 1}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-700 disabled:bg-gray-800/50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaginationControls;
