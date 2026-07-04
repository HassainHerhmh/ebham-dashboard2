export const OPERATIONS_CSS = `
  .input {
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid #ccc;
    background: #fff;
    color: #111827;
  }
  .input:disabled {
    background: #f3f4f6;
    color: #374151;
  }
  .dark .input {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
  .dark .input:disabled {
    background: #1f2937;
    color: #9ca3af;
  }
  .btn-green {
    background: #14532d;
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
  }
  .dark .btn-green {
    background: #166534;
  }
  .btn-gray {
    background: #e5e7eb;
    color: #111827;
    padding: 8px 16px;
    border-radius: 8px;
  }
  .dark .btn-gray {
    background: #374151;
    color: #f9fafb;
  }
  .btn-red {
    background: #dc2626;
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
  }
`;

export const opsActionBar =
  "flex justify-between items-center bg-[#e9efe6] dark:bg-slate-800 p-4 rounded-lg";

export const opsTableWrap =
  "bg-white dark:bg-gray-800 rounded shadow overflow-x-auto";

export const opsTableHead = "bg-green-600 dark:bg-green-900 text-white ops-table-head";

export const opsRowBase = "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/60";

export const opsRowSelected =
  "bg-green-100 dark:bg-green-900/40";

export const opsModalShell =
  "bg-[#eef3ee] dark:bg-gray-800 dark:border dark:border-gray-700 w-[760px] rounded-xl p-6 space-y-4";

export const opsModalShellSm =
  "bg-white dark:bg-gray-800 dark:border dark:border-gray-700 w-[720px] rounded-xl p-6 space-y-4";

export const opsPanel =
  "bg-[#eef3ea] dark:bg-slate-800 dark:border dark:border-gray-700 p-4 rounded-lg space-y-3";

export const opsFilterLabel = "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300";

export const opsDropdown =
  "absolute z-50 bg-white dark:bg-gray-800 dark:border-gray-700 border rounded-lg mt-1 w-full max-h-48 overflow-y-auto shadow-lg";

export const opsDropdownItem =
  "px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-gray-100";

export const opsEmptyCell = "py-6 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700";

export const opsTd = "border border-gray-200 dark:border-gray-700 px-2 py-1";

export const opsTh = "border border-gray-200 dark:border-gray-700 px-2 py-1";
