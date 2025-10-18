
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isValid } from 'date-fns';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { authedFetcher } from '@/lib/api';

interface DatePickerWithPresetsProps {
  startDate: string;
  endDate: string;
  onDatesChange: (startDate: string, endDate: string) => void;
}

const DatePresetPicker: React.FC<DatePickerWithPresetsProps> = ({ startDate, endDate, onDatesChange }) => {
  const { getToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // This local state holds the range while the user is actively selecting
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(() => {
    if (startDate && endDate) {
      const from = parseISO(startDate);
      const to = parseISO(endDate);
      if (isValid(from) && isValid(to)) {
        return { from, to };
      }
    }
    return undefined;
  });

  const [displayValue, setDisplayValue] = useState('Select a date range');

  const { data: years } = useSWR<number[]>(
    ['/api/v1/dashboard/transaction-years', getToken],
    ([url, getTokenFn]) => authedFetcher(url, getTokenFn)
  );

  // Sync local state and display value when props change from parent
  useEffect(() => {
    if (startDate && endDate) {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (isValid(start) && isValid(end)) {
        setLocalDateRange({ from: start, to: end });
        setDisplayValue(`${format(start, 'LLL dd, y')} - ${format(end, 'LLL dd, y')}`);
      } else {
        setDisplayValue('Select a date range');
      }
    } else {
      setLocalDateRange(undefined);
      setDisplayValue('Select a date range');
    }
  }, [startDate, endDate]);

  // Effect to handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [containerRef]);

  const handlePresetClick = (preset: string) => {
    let from: Date, to: Date;
    switch (preset) {
      case 'this_week': from = startOfWeek(new Date()); to = endOfWeek(new Date()); break;
      case 'this_month': from = startOfMonth(new Date()); to = endOfMonth(new Date()); break;
      case 'this_year': from = startOfYear(new Date()); to = endOfYear(new Date()); break;
      default:
        if (/^\d{4}$/.test(preset)) {
          const year = parseInt(preset, 10);
          from = startOfYear(new Date(year, 0, 1));
          to = endOfYear(new Date(year, 11, 31));
        } else return;
    }
    onDatesChange(format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleDoneClick = () => {
    if (localDateRange?.from) {
      const start = localDateRange.from;
      const end = localDateRange.to ?? localDateRange.from;
      onDatesChange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 text-left">
        {displayValue}
      </button>
      {isOpen && (
        <div className="absolute top-full mt-2 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-lg flex flex-col">
          <div className="flex">
            <div className="flex flex-col p-2 border-r border-gray-700 w-36">
              <button onClick={() => handlePresetClick('this_week')} className="text-left p-2 rounded hover:bg-gray-700">This Week</button>
              <button onClick={() => handlePresetClick('this_month')} className="text-left p-2 rounded hover:bg-gray-700">This Month</button>
              <button onClick={() => handlePresetClick('this_year')} className="text-left p-2 rounded hover:bg-gray-700">This Year</button>
              <div className="border-t border-gray-700 my-2"></div>
              {years?.map(year => (
                <button key={year} onClick={() => handlePresetClick(year.toString())} className="text-left p-2 rounded hover:bg-gray-700">{year}</button>
              ))}
            </div>
            <div>
              <DayPicker
                mode="range"
                selected={localDateRange}
                onSelect={setLocalDateRange}
                numberOfMonths={1}
              />
            </div>
          </div>
          <div className="p-2 border-t border-gray-700 flex justify-end">
            <button onClick={handleDoneClick} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePresetPicker;
