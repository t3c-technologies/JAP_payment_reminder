'use client';
import { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Edit2, Trash2, Check, X, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

// Define TypeScript interfaces
interface Transaction {
  id: number;
  transaction_date: string;
  due_date: string;
  client_name: string;
  vch_type: string;
  vch_no: string;
  debit: number;
  credit: number;
  status: 'paid' | 'unpaid';
}

interface Client {
  id: number;
  client_name: string;
  credit_period: number;
}

interface PaginationData {
  count: number;
  next: string | null;
  previous: string | null;
  results: any[];
}

// Main App Component
export default function App() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'clients'>('transactions');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Sidebar Toggle */}
      <button 
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md md:hidden" 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside 
        className={`fixed md:static h-full z-40 bg-white shadow-lg transition-all duration-300 ${
          isSidebarOpen ? 'w-64 left-0' : 'w-0 -left-64 md:w-16'
        }`}
      >
        <div className="p-4 flex items-center justify-between">
          <h1 className={`font-bold text-xl ${isSidebarOpen ? 'block' : 'hidden md:block'}`}>
            {isSidebarOpen ? 'Finance App' : 'FA'}
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
        {activeTab === 'transactions' ? <TransactionsTable /> : <ClientsTable />}
      </main>
    </div>
  );
}

// Transactions Table Component
function TransactionsTable() {
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
    pageSize: 10,
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
      let url = new URL('http://localhost:3002/api/transactions/');
      
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
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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
      page: newPage
    }));
  };

  const handleChangeStatus = async (id: number, newStatus: 'paid' | 'unpaid') => {
    try {
      const response = await fetch(`http://localhost:3002/api/transactions/${id}/status/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update transaction status');
      }
      
      // Update local state
      setTransactions(prev => 
        prev.map(t => t.id === id ? { ...t, status: newStatus } : t)
      );
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error updating transaction status:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3002/api/transactions/${id}/`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }
      
      // Remove from local state
      setTransactions(prev => prev.filter(t => t.id !== id));
      
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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-6">Transactions</h2>
      
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
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('transaction_date')}
                  className="flex items-center focus:outline-none"
                >
                  Transaction Date
                  {sorting.field === 'transaction_date' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={16} className="ml-1" /> : 
                    <ChevronDown size={16} className="ml-1" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('due_date')}
                  className="flex items-center focus:outline-none"
                >
                  Due Date
                  {sorting.field === 'due_date' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={16} className="ml-1" /> : 
                    <ChevronDown size={16} className="ml-1" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('vch_type')}
                  className="flex items-center focus:outline-none"
                >
                  Vch Type
                  {sorting.field === 'vch_type' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={16} className="ml-1" /> : 
                    <ChevronDown size={16} className="ml-1" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('vch_no')}
                  className="flex items-center focus:outline-none"
                >
                  Vch No
                  {sorting.field === 'vch_no' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={16} className="ml-1" /> : 
                    <ChevronDown size={16} className="ml-1" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('debit')}
                  className="flex items-center focus:outline-none"
                >
                  Debit
                  {sorting.field === 'debit' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={16} className="ml-1" /> : 
                    <ChevronDown size={16} className="ml-1" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('credit')}
                  className="flex items-center focus:outline-none"
                >
                  Credit
                  {sorting.field === 'credit' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={16} className="ml-1" /> : 
                    <ChevronDown size={16} className="ml-1" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('status')}
                  className="flex items-center focus:outline-none"
                >
                  Status
                  {sorting.field === 'status' && (
                    sorting.direction === 'asc' ? 
                    <ChevronUp size={16} className="ml-1" /> : 
                    <ChevronDown size={16} className="ml-1" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.transaction_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.due_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.client_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.vch_type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{transaction.vch_no}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {Number(transaction.debit).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {Number(transaction.credit).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      transaction.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button 
                        title="Edit"
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => window.location.href = `/edit-transaction/${transaction.id}`}
                      >
                        <Edit2 size={18} />
                      </button>
                      
                      <button 
                        title={transaction.status === 'paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
                        className={transaction.status === 'paid' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                        onClick={() => handleChangeStatus(
                          transaction.id, 
                          transaction.status === 'paid' ? 'unpaid' : 'paid'
                        )}
                      >
                        {transaction.status === 'paid' ? <X size={18} /> : <Check size={18} />}
                      </button>
                      
                      <button 
                        title="Delete"
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDelete(transaction.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.count)} of {pagination.count} transactions
        </p>
        
        <div className="flex space-x-2">
          <button
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
            className={`p-2 rounded ${
              pagination.page === 1 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-600 hover:bg-blue-50'
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
                  className={`h-8 w-8 flex items-center justify-center rounded ${
                    pagination.page === pageNumber
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-blue-50'
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

// Clients Table Component
function ClientsTable() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    pageSize: 10,
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
      let url = new URL('http://localhost:3002/api/clients/');
      
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
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this client?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3002/api/clients/${id}/`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete client');
      }
      
      // Remove from local state
      setClients(prev => prev.filter(c => c.id !== id));
      
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

  const totalPages = Math.ceil(pagination.count / pagination.pageSize);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-semibold mb-6">Clients</h2>
      
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
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
              <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                  No clients found
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{client.client_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{client.credit_period}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button 
                        title="Edit"
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => window.location.href = `/edit-client/${client.id}`}
                      >
                        <Edit2 size={18} />
                      </button>
                      
                      <button 
                        title="Delete"
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDelete(client.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.count)} of {pagination.count} clients
        </p>
        
        <div className="flex space-x-2">
          <button
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(pagination.page - 1)}
            className={`p-2 rounded ${
              pagination.page === 1 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-600 hover:bg-blue-50'
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
                  className={`h-8 w-8 flex items-center justify-center rounded ${
                    pagination.page === pageNumber
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-blue-50'
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