'use client';
import { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Edit2, Trash2, Check, X, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import ExcelJS from 'exceljs';
import { parseISO, format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { stdout } from 'process';


const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
const apiBack = process.env.NEXT_PUBLIC_API_BACK_URL
console.log("api_back", apiBack);

// Define TypeScript interfaces
interface Transaction {
  transaction_date: string;
  due_date: string;
  client_name: string;
  client_name_read:string;
  vch_type: string;
  vch_no: string;
  debit: number;
  credit: number;
  status: 'paid' | 'unpaid';
}

interface Client {
  client_name: string;
  credit_period: number;
}

interface PaginationData {
  count: number;
  next: string | null;
  previous: string | null;
  results: any[];
}

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null; // For server-side rendering
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

// Then modify your fetch calls to include the CSRF token
const fetchWithCSRF = async (url: string, options: RequestInit = {}) => {
  const csrfToken = getCookie('csrftoken');
  
  const headers = new Headers(options.headers || {});
  if (csrfToken) {
    headers.set('X-CSRFToken', csrfToken);
  }
  
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
};

// Main App Component
export default function App() {
  //normal state
  const [activeTab, setActiveTab] = useState<'transactions' | 'clients'>('transactions');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const router = useRouter();

  
  useEffect(() => {
    checkAuth();
    }, []);
    const checkAuth = async () => {
        try {
            const response = await fetchWithCSRF(`${apiBack}/api/session-check/`, {
            credentials: 'include', // Important for cookies
            });

            const getCookie = (name: string): string | null => {
              if (typeof document === 'undefined') return null; // For server-side rendering
              const value = `; ${document.cookie}`;
              const parts = value.split(`; ${name}=`);
              if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
              return null;
            };

            if (!response.ok) {
            // If not authenticated, redirect to login
            router.push('/');
            return;
            }
        }
        catch (err) {
            console.error('Authentication check failed:', err);
            router.push('/');
        }
    };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportStatus({ status: 'loading', message: 'Reading Excel file...' });

      // Create FormData object
      const formData = new FormData();
      formData.append('excel_file', file);

      // Upload the file and process on the server side
      setImportStatus({ status: 'loading', message: 'Uploading and processing file...' });
      const response = await fetchWithCSRF(`${apiBack}/import-excel/`, {
        method: 'POST',
        body: formData,
        credentials:'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error during import');
      }

      const result = await response.json();
      setImportStatus({
        status: 'success',
        message: result.message || `Successfully imported data`,
      });

      setTimeout(() => {
        setImportStatus({ status: 'idle', message: '' });
        if (activeTab === 'transactions') {
          window.dispatchEvent(new Event('refresh-transactions'));
        } else {
          window.dispatchEvent(new Event('refresh-clients'));
        }
      }, 2000);

    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred during import',
      });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
     window.location.reload();
  };
  
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-gray-50">
      {/* Mobile Sidebar Toggle */}
      <button 
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md md:hidden" 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside 
        className={`fixed md:static h-full z-40 bg-white/70 backdrop-blur-xl border-r border-gray-200/50 shadow-lg transition-all duration-300 ${
          isSidebarOpen ? 'w-64 left-0' : 'w-0 -left-64 md:w-16'
        }`}
      >
        <div className="p-4 flex items-center justify-between">
          <h1 className={`font-bold text-xl ${isSidebarOpen ? 'block' : 'hidden md:block'}`}>
            {isSidebarOpen ? 'Payment Tracker' : ''}
          </h1>
          <button 
            className="hidden md:block"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <ChevronLeft size={20} className={`transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>
        
        <nav className="mt-8">
          <ul>
            <li>
              <button
                className={`w-full flex items-center p-4 ${
                  activeTab === 'transactions' 
                    ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('transactions')}
              >
                <span className="material-icons mr-3"></span>
                {isSidebarOpen && <span>Transactions</span>}
              </button>
            </li>
            <li>
              <button
                className={`w-full flex items-center p-4 ${
                  activeTab === 'clients' 
                    ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('clients')}
              >
                <span className="material-icons mr-3"></span>
                {isSidebarOpen && <span>Clients</span>}
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`flex-grow p-6 transition-all duration-300 ${
        isSidebarOpen ? 'md:ml-0' : 'md:ml-0'
      }`}>
        {/* Import Alert Message */}
        {importStatus.status !== 'idle' && (
          <div className={`mb-4 p-3 rounded-md ${
            importStatus.status === 'loading' ? 'bg-blue-50 text-blue-700' :
            importStatus.status === 'success' ? 'bg-green-50 text-green-700' :
            'bg-red-50 text-red-700'
          }`}>
            {importStatus.status === 'loading' && (
              <div className="flex items-center">
                <div className="w-4 h-4 mr-2 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                {importStatus.message}
              </div>
            )}
            {importStatus.status === 'success' && importStatus.message}
            {importStatus.status === 'error' && importStatus.message}
          </div>
        )}
        
        {/* Top Bar with Import Button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{activeTab === 'transactions' ? 'Transactions' : 'Clients'}</h1>
          
          <div>
            <label className="relative inline-flex items-center px-4 py-2 bg-blue-600/90 text-white rounded-md cursor-pointer hover:bg-blue-700/90 transition-colors shadow-md backdrop-blur-sm">
              <span>Import Excel</span>
              <input 
                type="file" 
                accept=".xlsx,.xls"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleImportExcel}
                disabled={isImporting}
              />
            </label>
          </div>
        </div>
        
        {activeTab === 'transactions' ? <TransactionsTable /> : <ClientsTable />}
      </main>
    </div>
  );
}

// Transactions Table Component
function TransactionsTable() {
  //editing state
  const [editingVchNo, setEditingVchNo] = useState<string | null>(null);
  const [editedTransaction, setEditedTransaction] = useState<Partial<Transaction>>({});

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    count: number;
    page: number;
    pageSize: number;
  }>({
    count: 0,
    page: 1,
    pageSize: 5,
  });
  
  const [filters, setFilters] = useState({
    client_name: '',
    status: '',
    date_from: '',
    date_to: '',
  });
  
  const [sorting, setSorting] = useState({
    field: 'transaction_date',
    direction: 'desc'
  });

  useEffect(() => {
    fetchTransactions();
  }, [pagination.page, pagination.pageSize, sorting, filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Build URL with query parameters
      let url = new URL(`${apiBack}/api/transactions/`);
      
      // Add pagination
      url.searchParams.append('page', pagination.page.toString());
      url.searchParams.append('page_size', pagination.pageSize.toString());
      
      // Add sorting
      url.searchParams.append('ordering', 
        sorting.direction === 'asc' ? sorting.field : `-${sorting.field}`
      );
      
      // Add filters
      if (filters.client_name) {
        url.searchParams.append('client_name', filters.client_name);
      }
      
      if (filters.status) {
        url.searchParams.append('status', filters.status);
      }
      
      if (filters.date_from) {
        url.searchParams.append('date_from', filters.date_from);
      }
      
      if (filters.date_to) {
        url.searchParams.append('date_to', filters.date_to);
      }
      
      const response = await fetchWithCSRF(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials:'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data: PaginationData = await response.json();
      setTransactions(data.results as Transaction[]);
      setPagination(prev => ({
        ...prev,
        count: data.count,
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  //EDITING ROWS
  const handleSaveEdit = async (vch_no: string) => {
    try {
      const response = await fetchWithCSRF(`${apiBack}/api/transactions/${encodeURIComponent(vch_no)}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedTransaction),
        credentials:'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }

      setEditingVchNo(null);
      setEditedTransaction({});
      fetchTransactions();
    } catch (error) {
      console.error('Edit error:', error);
    }
  };



  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  //TRANSACTIONS PAYMENT STATUS TOGGLE FUNCTION
  const handleChangeStatus = async (vch_no: string, newStatus: 'paid' | 'unpaid') => {
    try {
      const response = await fetchWithCSRF(`${apiBack}/api/transactions/${encodeURIComponent(vch_no)}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
        credentials:'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to update transaction status');
      }
      
      // Update local state
      setTransactions(prev => 
        prev.map(t => t.vch_no === vch_no ? { ...t, status: newStatus } : t)
      );
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error updating transaction status:', err);
    }
  };

  //TRANSACTIONS DELETE FUNCTION
  const handleDelete = async (vch_no: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }
    
    try {
      const response = await fetchWithCSRF(`${apiBack}/api/transactions/${encodeURIComponent(vch_no)}/`, {
        method: 'DELETE',
        credentials:'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }
      
      // Remove from local state
      setTransactions(prev => prev.filter(t => t.vch_no !== vch_no));
      
      // Update count
      setPagination(prev => ({
        ...prev,
        count: prev.count - 1
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error deleting transaction:', err);
    }
  };

  const totalPages = Math.ceil(pagination.count / pagination.pageSize);

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/50">
      
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
          <div className="relative">
            <input
              type="text"
              name="client_name"
              placeholder="Filter by client"
              value={filters.client_name}
              onChange={handleFilterChange}
              className="w-full p-2 border border-gray-300 rounded-md pl-8"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="">All</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
          <input
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
          <input
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleFilterChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full bg-white/80 border border-gray-200/50 rounded-md overflow-hidden table-auto">
          <thead>
            <tr className="bg-blue-50/80 backdrop-blur-sm">
              <th className="px-2 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                <button 
                  onClick={() => handleSort('transaction_date')}
                  className="flex items-center focus:outline-none text-xs"
                >
                  <span className="truncate">Transaction Date</span>
                  {sorting.field === 'transaction_date' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : 
                    <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                  )}
                </button>
              </th>
              <th className="px-2 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                <button 
                  onClick={() => handleSort('due_date')}
                  className="flex items-center focus:outline-none text-xs"
                >
                  <span className="truncate">Due Date</span>
                  {sorting.field === 'due_date' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : 
                    <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                  )}
                </button>
              </th>
              <th className="px-2 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">
                <button 
                  onClick={() => handleSort('client_name')}
                  className="flex items-center focus:outline-none text-xs"
                >
                  <span className="truncate">Client Name</span>
                  {sorting.field === 'client_name' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : 
                    <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                  )}
                </button>
              </th>
              <th className="px-2 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                <button 
                  onClick={() => handleSort('vch_type')}
                  className="flex items-center focus:outline-none text-xs"
                >
                  <span className="truncate">Vch Type</span>
                  {sorting.field === 'vch_type' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : 
                    <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                  )}
                </button>
              </th>
              <th className="px-2 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                <button 
                  onClick={() => handleSort('vch_no')}
                  className="flex items-center focus:outline-none text-xs"
                >
                  <span className="truncate">Vch No</span>
                  {sorting.field === 'vch_no' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : 
                    <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                  )}
                </button>
              </th>
              <th className="px-2 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                <button 
                  onClick={() => handleSort('debit')}
                  className="flex items-center focus:outline-none text-xs"
                >
                  <span className="truncate">Debit</span>
                  {sorting.field === 'debit' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : 
                    <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                  )}
                </button>
              </th>
              <th className="px-2 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                <button 
                  onClick={() => handleSort('credit')}
                  className="flex items-center focus:outline-none text-xs"
                >
                  <span className="truncate">Credit</span>
                  {sorting.field === 'credit' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : 
                    <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                  )}
                </button>
              </th>
              <th className="px-2 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                <button 
                  onClick={() => handleSort('status')}
                  className="flex items-center focus:outline-none text-xs"
                >
                  <span className="truncate">Status</span>
                  {sorting.field === 'status' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={14} className="ml-1 flex-shrink-0" /> : 
                    <ChevronDown size={14} className="ml-1 flex-shrink-0" />
                  )}
                </button>
              </th>
              <th className="px-2 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.vch_no} className={`hover:bg-blue-50/50 ${transaction.status === 'paid' ? 'bg-green-50/30' : ''}`}>
                  <td className="px-2 py-3 whitespace-nowrap text-xs">
                    {transaction.transaction_date}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs">
                    {editingVchNo === transaction.vch_no ? (
                      <input
                        type="date"
                        value={editedTransaction.due_date || transaction.due_date}
                        onChange={(e) => setEditedTransaction(prev => ({ ...prev, due_date: e.target.value }))}
                        className="border px-1 py-1 rounded w-full text-xs"
                      />
                    ) : (
                      transaction.due_date
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs overflow-hidden text-ellipsis max-w-[12rem]">
                    <div className="truncate max-w-[12rem]">{transaction.client_name_read}</div>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs">
                    {editingVchNo === transaction.vch_no ? (
                      <input
                        type="date"
                        value={editedTransaction.vch_type || transaction.vch_type}
                        onChange={(e) => setEditedTransaction(prev => ({ ...prev, vch_type: e.target.value }))}
                        className="border px-1 py-1 rounded w-full text-xs"
                      />
                    ) : (
                      transaction.vch_type
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs">{transaction.vch_no}</td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs">
                    {editingVchNo === transaction.vch_no ? (
                      <input
                        type="text"
                        value={editedTransaction.debit || transaction.debit}
                        onChange={(e) => setEditedTransaction(prev => ({ ...prev, debit: parseFloat(e.target.value) }))}
                        className="border px-1 py-1 rounded w-full text-xs"
                      />
                    ) : (
                      <span className="text-red-600">₹ {transaction.debit.toLocaleString('en-IN')}</span>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs">
                    {editingVchNo === transaction.vch_no ? (
                      <input
                        type="text"
                        value={editedTransaction.credit || transaction.credit}
                        onChange={(e) => setEditedTransaction(prev => ({ ...prev, credit: parseFloat(e.target.value) }))}
                        className="border px-1 py-1 rounded w-full text-xs"
                      />
                    ) : (
                      <span className="text-green-600">₹ {transaction.credit.toLocaleString('en-IN')}</span>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs">
                    <span className={`px-1 py-0.5 text-xs rounded-full ${
                      transaction.status === 'paid' 
                        ? 'bg-green-100/70 text-green-800 border border-green-200' 
                        : 'bg-red-100/70 text-red-800 border border-red-200'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-xs">
                    <div className="flex space-x-1">
                      {editingVchNo === transaction.vch_no ? (
                        <>
                          <button 
                            title="Save"
                            onClick={() => handleSaveEdit(transaction.vch_no)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            title="Cancel"
                            onClick={() => {
                              setEditingVchNo(null);
                              setEditedTransaction({});
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            title="Edit"
                            onClick={() => {
                              setEditingVchNo(transaction.vch_no);
                              setEditedTransaction(transaction);
                            }}
                            className="text-blue-600 hover:text-blue-800 bg-blue-50/50 p-1 rounded-full hover:bg-blue-100/70"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button 
                            title={transaction.status === 'paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
                            className={transaction.status === 'paid' 
                              ? 'text-red-600 hover:text-red-800 bg-red-50/50 p-1 rounded-full hover:bg-red-100/70' 
                              : 'text-green-600 hover:text-green-800 bg-green-50/50 p-1 rounded-full hover:bg-green-100/70'}
                            onClick={() => handleChangeStatus(
                              transaction.vch_no,
                              transaction.status === 'paid' ? 'unpaid' : 'paid'
                            )}
                          >
                            {transaction.status === 'paid' ? <X size={14} /> : <Check size={14} />}
                          </button>

                          <button 
                            title="Delete"
                            onClick={() => handleDelete(transaction.vch_no)}
                            className="text-red-600 hover:text-red-800 bg-red-50/50 p-1 rounded-full hover:bg-red-100/70"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Page Size Selector */}
        <div className="flex items-center">
          <span className="text-sm text-gray-600 mr-2">Rows per page:</span>
          <select
            value={pagination.pageSize}
            onChange={(e) =>
              setPagination((prev) => ({
                ...prev,
                pageSize: Number(e.target.value),
              }))
            }
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
        
        {/* Centered Pagination Info */}
        <p className="text-sm text-gray-700 text-center flex-1">
          Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.count)} of {pagination.count} transactions
        </p>
        
        {/* Page Navigation */}
        <div className="flex space-x-2">
          <button
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
            className={`p-2 rounded-full ${
              pagination.page === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-100/50 backdrop-blur-sm'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          
          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNumber;
              
              // Calculate which page numbers to show
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (pagination.page <= 3) {
                pageNumber = i + 1;
              } else if (pagination.page >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = pagination.page - 2 + i;
              }
              
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`h-8 w-8 flex items-center justify-center rounded-full ${
                    pagination.page === pageNumber
                      ? 'bg-blue-600/90 text-white shadow-md'
                      : 'text-gray-700 hover:bg-blue-50/70 backdrop-blur-sm'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          
          <button
            disabled={pagination.page === totalPages}
            onClick={() => handlePageChange(pagination.page + 1)}
            className={`p-2 rounded ${
              pagination.page === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

//------------------------------------------------------------------------------------------------------------------------------------------------

// Clients Table Component
function ClientsTable() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState<string | null>(null);
  const [editedClient, setEditedClient] = useState<Partial<Client>>({});

  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    pageSize: 5,
  });
  
  const [filters, setFilters] = useState({
    client_name: '',
  });
  
  const [sorting, setSorting] = useState({
    field: 'client_name',
    direction: 'asc'
  });

  useEffect(() => {
    fetchClients();
  }, [pagination.page, pagination.pageSize, sorting, filters]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      
      // Build URL with query parameters
      let url = new URL(`${apiBack}/api/clients/`);
      
      // Add pagination
      url.searchParams.append('page', pagination.page.toString());
      url.searchParams.append('page_size', pagination.pageSize.toString());
      
      // Add sorting
      url.searchParams.append('ordering', 
        sorting.direction === 'asc' ? sorting.field : `-${sorting.field}`
      );
      
      // Add filters
      if (filters.client_name) {
        url.searchParams.append('client_name', filters.client_name);
      }
      
      const response = await fetchWithCSRF(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials:'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      
      const data: PaginationData = await response.json();
      setClients(data.results as Client[]);
      setPagination(prev => ({
        ...prev,
        count: data.count,
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };
  const handleClientDelete = async (client_name: string) => {
    if (!confirm('Are you sure you want to delete this client?')) {
      return;
    }
    
    try {
      const response = await fetchWithCSRF(`${apiBack}/api/clients/${client_name}/`, {
        method: 'DELETE',
        credentials:'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete client');
      }
      
      // Remove from local state
      setClients(prev => prev.filter(c => c.client_name !== client_name));
      
      // Update count
      setPagination(prev => ({
        ...prev,
        count: prev.count - 1
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error deleting client:', err);
    }
  };
  const handleClientEdit = async (client_name: string, updatedData: Partial<Client>) => {
  try {
    const response = await fetchWithCSRF(`${apiBack}/api/clients/${client_name}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedData),
      credentials:'include',
    });

    if (!response.ok) {
      throw new Error('Failed to update client');
    }

    const updatedClient = await response.json();

    // Update local state
    setClients(prev =>
      prev.map(c =>
        c.client_name === client_name ? { ...c, ...updatedClient } : c
      )
    );

  } catch (err) {
    setError(err instanceof Error ? err.message : 'An unknown error occurred');
    console.error('Error updating client:', err);
  }
};


  const totalPages = Math.ceil(pagination.count / pagination.pageSize);

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/50">
      {/* Filters */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            name="client_name"
            placeholder="Search clients..."
            value={filters.client_name}
            onChange={handleFilterChange}
            className="w-full md:w-64 p-2 border border-gray-300 rounded-md pl-8"
          />
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {/* Table */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full bg-white/80 border border-gray-200/50 rounded-md overflow-hidden">
          <thead>
            <tr className="bg-blue-50/80 backdrop-blur-sm">
              <th className="px-3 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                <button 
                  onClick={() => handleSort('client_name')}
                  className="flex items-center focus:outline-none"
                >
                  Client Name
                  {sorting.field === 'client_name' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={16} className="ml-1" /> : 
                    <ChevronDown size={16} className="ml-1" />
                  )}
                </button>
              </th>
              <th className="px-3 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                <button 
                  onClick={() => handleSort('credit_period')}
                  className="flex items-center focus:outline-none"
                >
                  Credit Period (Days)
                  {sorting.field === 'credit_period' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={16} className="ml-1" /> : 
                    <ChevronDown size={16} className="ml-1" />
                  )}
                </button>
              </th>
              <th className="px-3 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                  No clients found
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.client_name} className="hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="truncate max-w-xs">{client.client_name}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {editingClientName === client.client_name ? (
                      <input
                        type="number"
                        className="border px-2 py-1 rounded w-24"
                        value={editedClient.credit_period ?? client.credit_period}
                        onChange={(e) =>
                          setEditedClient(prev => ({ ...prev, credit_period: parseInt(e.target.value) }))
                        }
                      />
                    ) : (
                      client.credit_period
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {editingClientName === client.client_name ? (
                        <>
                          <button
                            title="Save"
                            className="text-green-600 hover:text-green-900 bg-green-50/50 p-1.5 rounded-full hover:bg-green-100/70"
                            onClick={() => {
                              handleClientEdit(client.client_name, editedClient);
                              setEditingClientName(null);
                              setEditedClient({});
                            }}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            title="Cancel"
                            className="text-red-600 hover:text-red-900 bg-red-50/50 p-1.5 rounded-full hover:bg-red-100/70"
                            onClick={() => {
                              setEditingClientName(null);
                              setEditedClient({});
                            }}
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            title="Edit"
                            className="text-blue-600 hover:text-blue-900 bg-blue-50/50 p-1.5 rounded-full hover:bg-blue-100/70"
                            onClick={() => {
                              setEditingClientName(client.client_name);
                              setEditedClient(client);
                            }}
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            title="Delete"
                            className="text-red-600 hover:text-red-900 bg-red-50/50 p-1.5 rounded-full hover:bg-red-100/70"
                            onClick={() => handleClientDelete(client.client_name)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      
      {/* Pagination */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Page Size Selector */}
        <div className="flex items-center">
          <span className="text-sm text-gray-600 mr-2">Records per page:</span>
          <select
            value={pagination.pageSize}
            onChange={(e) =>
              setPagination((prev) => ({
                ...prev,
                pageSize: Number(e.target.value),
              }))
            }
            className="rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
        
        {/* Centered Pagination Info */}
        <p className="text-sm text-gray-700 text-center flex-1">
          Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.count)} of {pagination.count} transactions
        </p>
        
        {/* Page Navigation */}
        <div className="flex space-x-2">
          <button
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
            className={`p-2 rounded-full ${
              pagination.page === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-100/50 backdrop-blur-sm'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          
          {/* Page Numbers */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNumber;
              
              // Calculate which page numbers to show
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (pagination.page <= 3) {
                pageNumber = i + 1;
              } else if (pagination.page >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = pagination.page - 2 + i;
              }
              
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`h-8 w-8 flex items-center justify-center rounded-full ${
                    pagination.page === pageNumber
                      ? 'bg-blue-600/90 text-white shadow-md'
                      : 'text-gray-700 hover:bg-blue-50/70 backdrop-blur-sm'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          
          <button
            disabled={pagination.page === totalPages}
            onClick={() => handlePageChange(pagination.page + 1)}
            className={`p-2 rounded ${
              pagination.page === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
