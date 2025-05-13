'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, CreditCard, Mail, Lock, User, ArrowRight } from 'lucide-react';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
const apiBack = process.env.NEXT_PUBLIC_API_BACK_URL

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

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // For registration, check if passwords match
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/api/login/' : '/api/register/';

      const response = await fetchWithCSRF(`${apiBack}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for cookies
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // On successful login/register, redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="w-full bg-white shadow-sm py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-blue-700" />
            <div>
              <h1 className="font-bold text-lg text-blue-900">J.A. Paramanantham & Bros.</h1>
              <p className="text-xs text-gray-500">EST. SINCE 1994</p>
            </div>
          </div>
          <div className="hidden md:block text-sm text-gray-500">
            354, Rangai Gowder Street, Coimbatore
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="grid md:grid-cols-2 w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-xl">
          {/* Left side - decorative */}
          <div className="hidden md:flex flex-col bg-blue-700 text-white p-12 justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-6">CREDIT SALES NOVA REGISTER</h2>
              <p className="text-blue-100 mb-8">Streamline your credit sales management with our advanced digital register system</p>
              
              <div className="space-y-4 mt-12">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-2 rounded-full">
                    <CreditCard className="h-5 w-5 text-blue-100" />
                  </div>
                  <p>Effortless credit tracking</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-2 rounded-full">
                    <User className="h-5 w-5 text-blue-100" />
                  </div>
                  <p>Customer management</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-2 rounded-full">
                    <ArrowRight className="h-5 w-5 text-blue-100" />
                  </div>
                  <p>Transaction history</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - form */}
          <div className="p-8 md:p-12">
            <div className="mb-8 text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-800">
                {isLogin ? 'Welcome Back!' : 'Create Your Account'}
              </h2>
              <p className="text-gray-500 mt-2">
                {isLogin ? 'Sign in to access your account' : 'Join our platform to manage your credit sales'}
              </p>
            </div>

            {error && (
              <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 rounded-lg border-l-4 border-red-500">
                <div className="font-medium">Authentication Error</div>
                <div>{error}</div>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-end">
                  <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800">
                    Forgot password?
                  </Link>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg shadow transition duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{isLogin ? 'Sign in' : 'Create Account'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm">
            &copy; {currentYear} J.A. Paramanantham & Bros. | 354, Rangai Gowder Street, Coimbatore
          </p>
        </div>
      </footer>
    </div>
  );
}