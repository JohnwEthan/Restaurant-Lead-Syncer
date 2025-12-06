import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, Loader2, Search, TrendingUp, Clock, BadgeCheck, AlertCircle } from 'lucide-react';
import { API_URL } from './constants';

export default function App() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [purchaseValue, setPurchaseValue] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [stats, setStats] = useState({ today: 0, total: 0, pending: 0 });

  // Basic check to see if URL is configured
  const isDemoMode = !API_URL || API_URL.includes('YOUR_APPS_SCRIPT_URL');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3 * 60 * 1000); // Sync every 3 minutes
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    if (isDemoMode) {
      setCustomers(DEMO_CUSTOMERS);
      setLastSync(new Date());
      calculateStats(DEMO_CUSTOMERS);
      return;
    }

    try {
      const response = await fetch(`${API_URL}?action=getData`);
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      const customerList = Array.isArray(data) ? data : [];
      setCustomers(customerList);
      setLastSync(new Date());
      calculateStats(customerList);
      
      localStorage.setItem('cached_customers', JSON.stringify(customerList));
    } catch (err) {
      console.error('Load error:', err);
      const cached = localStorage.getItem('cached_customers');
      if (cached) {
        const customerList = JSON.parse(cached);
        setCustomers(customerList);
        calculateStats(customerList);
      }
    }
  }

  function calculateStats(customerList: any[]) {
    const today = new Date().toDateString();
    
    const todayVisits = customerList.filter(c => {
      // Need a valid date string in used_date
      if (!c.used_date || c.status !== 'used') return false;
      try {
        const d = new Date(c.used_date);
        return !isNaN(d.getTime()) && d.toDateString() === today;
      } catch {
        return false;
      }
    }).length;

    setStats({
      today: todayVisits,
      total: customerList.filter(c => c.status === 'used').length,
      pending: customerList.filter(c => c.status === 'pending').length
    });
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(value);
  }

  function handlePurchaseChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/[^\d.]/g, '');
    setPurchaseValue(value);
  }

  async function searchCustomer() {
    if (phoneNumber.length !== 10) return;

    setLoading(true);
    setResult(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 400)); // Smooth UX

      const normalizedPhone = phoneNumber.slice(-10);
      const customer = customers.find(c => {
        const custPhone = String(c.phone).replace(/\D/g, '').slice(-10);
        return custPhone === normalizedPhone;
      });

      if (!customer) {
        setResult({
          type: 'new',
          message: 'New Walk-In Customer',
          phone: phoneNumber
        });
      } else if (customer.status === 'used') {
        setResult({
          type: 'returning',
          message: 'Returning Customer',
          customer: customer,
          hadOffer: true
        });
      } else {
        setResult({
          type: 'valid',
          message: 'Customer with Active Offer',
          customer: customer
        });
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function confirmVisit() {
    if (!result) return;

    setLoading(true);

    try {
      if (isDemoMode) {
        await new Promise(resolve => setTimeout(resolve, 800));
        alert(`✅ Walk-in recorded!\n\nCustomer: ${result.customer?.name || 'New Customer'}\nPhone: ${phoneNumber}\nBill: ₹${purchaseValue || '0'}`);
        handleReset();
        return;
      }

      const payload = {
        phone: phoneNumber,
        purchaseValue: purchaseValue ? Number(purchaseValue) : 0,
        eventId: 'evt_' + Date.now(),
        leadId: result.customer?.lead_id || '',
        metaData: result.customer?.meta_data || '{}'
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        // Optimistic update for stats
        const eventType = purchaseValue ? 'Purchase' : 'Visit';
        alert(`✅ Success!\n\nWalk-in recorded\nEvent: ${eventType}\n${purchaseValue ? `Amount: ₹${purchaseValue}` : 'No purchase value'}`);
        
        // Refresh data to get updated stats
        await loadData();
        handleReset();
      } else {
        throw new Error(data.message || 'Failed to record visit');
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setPhoneNumber('');
    setPurchaseValue('');
    setResult(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Walk-In Tracker</h1>
                <p className="text-xs text-slate-500 font-medium">by Musaaz</p>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
              <div className="text-center min-w-[60px]">
                <div className="text-2xl font-bold text-slate-900 leading-none">{stats.today}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1">Today</div>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="text-center min-w-[60px]">
                <div className="text-2xl font-bold text-slate-900 leading-none">{stats.pending}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1">Active</div>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="text-center min-w-[60px]">
                <div className="text-2xl font-bold text-slate-900 leading-none">{stats.total}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-1">Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {!result ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search Section */}
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Search Customer</h2>
              </div>

              {/* Phone Input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone Number
                </label>
                <div className="relative group">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full px-4 py-4 text-xl border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 font-mono tracking-wide"
                    autoFocus
                  />
                  <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${phoneNumber.length === 10 ? 'text-green-500' : 'text-slate-300'}`}>
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                   <span className="text-slate-500">Enter customer's registered mobile</span>
                   <span className={`${phoneNumber.length === 10 ? 'text-green-600 font-medium' : 'text-slate-400'}`}>{phoneNumber.length}/10 digits</span>
                </div>
              </div>

              {/* Purchase Value Input (Optional) */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Purchase Amount <span className="text-slate-400 font-normal ml-1">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl font-medium">₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={purchaseValue}
                    onChange={handlePurchaseChange}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 text-lg border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Search Button */}
              <button
                onClick={searchCustomer}
                disabled={phoneNumber.length !== 10 || loading}
                className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all flex items-center justify-center gap-2 ${
                  phoneNumber.length === 10 && !loading
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-6 h-6" />
                    <span>Search Customer</span>
                  </>
                )}
              </button>
            </div>

            {/* Footer Info */}
            <div className="bg-slate-50/80 px-8 py-4 border-t border-slate-200 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Last sync: {lastSync ? lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  {customers.length} customers
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Result Card */
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Status Card */}
            <div className={`rounded-2xl shadow-xl border overflow-hidden ${
              result.type === 'valid' 
                ? 'bg-gradient-to-br from-white to-green-50/50 border-green-200 shadow-green-100' 
                : result.type === 'returning'
                ? 'bg-gradient-to-br from-white to-blue-50/50 border-blue-200 shadow-blue-100'
                : 'bg-gradient-to-br from-white to-slate-50/50 border-slate-200 shadow-slate-100'
            }`}>
              <div className="p-6 sm:p-8">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    {result.type === 'valid' ? (
                      <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30">
                        <BadgeCheck className="w-8 h-8 text-white" />
                      </div>
                    ) : result.type === 'returning' ? (
                      <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <TrendingUp className="w-8 h-8 text-white" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-slate-400 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-400/30">
                        <Users className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div>
                      <h3 className={`text-2xl font-bold ${
                        result.type === 'valid' ? 'text-green-700' :
                        result.type === 'returning' ? 'text-blue-700' : 'text-slate-700'
                      }`}>{result.message}</h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        {result.type === 'valid' && 'Campaign offer available'}
                        {result.type === 'returning' && 'Welcome back!'}
                        {result.type === 'new' && 'First visit recorded'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid gap-4 mb-8">
                  <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col">
                    <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Customer Name</span>
                    <span className="text-xl font-bold text-slate-800">
                      {result.customer?.name || 'New Customer'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col">
                      <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Phone</span>
                      <span className="text-lg font-mono font-semibold text-slate-800">
                        {phoneNumber}
                      </span>
                    </div>

                    {purchaseValue && (
                      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col">
                        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Amount</span>
                        <span className="text-lg font-bold text-green-600">
                          ₹{purchaseValue}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Banners */}
                {result.type === 'valid' && (
                  <div className="mb-8 bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-800 leading-relaxed">
                      <strong>Valid Offer:</strong> This customer originated from the Meta campaign. 
                      Please apply the standard discount.
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    onClick={handleReset}
                    className="px-6 py-4 rounded-xl font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmVisit}
                    disabled={loading}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Confirm Visit
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-amber-100 border border-amber-200 text-amber-800 px-6 py-3 rounded-full shadow-lg z-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold text-sm">Demo Mode Active</span>
          </div>
        </div>
      )}
    </div>
  );
}

const DEMO_CUSTOMERS = [
  { phone: '9876543210', name: 'Rahul Kumar', status: 'pending', lead_id: '123', created_date: '2024-12-01' },
  { phone: '9988776655', name: 'Priya Singh', status: 'pending', lead_id: '124', created_date: '2024-12-02' },
  { phone: '9123456789', name: 'Amit Patel', status: 'used', lead_id: '125', created_date: '2024-12-03', used_date: new Date().toDateString() },
  { phone: '8765432109', name: 'Sneha Sharma', status: 'pending', lead_id: '126', created_date: '2024-12-04' },
];