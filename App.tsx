import React, { useState, useEffect } from 'react';
import { Users, CheckCircle2, Loader2, Search, TrendingUp, Clock, BadgeCheck, AlertCircle, ShoppingBag, X, ArrowRight, UserCheck, ChevronRight } from 'lucide-react';
import { API_URL } from './constants';

export default function App() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [purchaseValue, setPurchaseValue] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [stats, setStats] = useState({ today: 0, total: 0, pending: 0 });
  
  const [successData, setSuccessData] = useState<{
    eventType: string;
    amount: string;
    customerName: string;
  } | null>(null);

  const isDemoMode = !API_URL || API_URL.includes('YOUR_APPS_SCRIPT_URL');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3 * 60 * 1000);
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
      const response = await fetch(`${API_URL}?action=getData`, { credentials: 'omit' });
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
      await new Promise(resolve => setTimeout(resolve, 400));

      const normalizedPhone = phoneNumber.slice(-10);
      const customer = customers.find(c => {
        const custPhone = String(c.phone).replace(/\D/g, '').slice(-10);
        return custPhone === normalizedPhone;
      });

      if (!customer) {
        setResult({
          type: 'new',
          message: 'New Customer',
          subMessage: 'First time visit',
          phone: phoneNumber
        });
      } else if (customer.status === 'used') {
        setResult({
          type: 'returning',
          message: 'Returning Customer',
          subMessage: 'Offer already redeemed',
          customer: customer,
          hadOffer: true
        });
      } else {
        setResult({
          type: 'valid',
          message: 'Active Offer',
          subMessage: 'Campaign offer available',
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
        setSuccessData({
          eventType: purchaseValue ? 'Purchase' : 'Visit',
          amount: purchaseValue,
          customerName: result.customer?.name || 'New Customer'
        });
        setTimeout(() => {
          setSuccessData(null);
          handleReset();
        }, 2500);
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
        credentials: 'omit',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        throw new Error(`Server returned invalid response.`);
      }

      if (data.success) {
        const eventType = purchaseValue ? 'Purchase' : 'Visit';
        setSuccessData({
          eventType,
          amount: purchaseValue,
          customerName: result.customer?.name || 'New Customer'
        });
        loadData();
        setTimeout(() => {
          setSuccessData(null);
          handleReset();
        }, 2500);
      } else {
        throw new Error(data.error || 'Unknown server error');
      }

    } catch (err: any) {
      alert(`❌ Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setPhoneNumber('');
    setPurchaseValue('');
    setResult(null);
  }

  // --- ATTIO-INSPIRED COMPONENTS ---

  const StatItem = ({ label, value }: { label: string, value: number }) => (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">{label}</span>
      <span className="text-sm font-semibold text-zinc-900">{value}</span>
    </div>
  );

  const Divider = () => <div className="w-px h-8 bg-zinc-200 mx-4" />;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20 h-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 leading-tight">Musaaz Walk-In Tracker</h1>
              <p className="text-[10px] text-zinc-400 font-medium">Workspace</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-1.5 shadow-sm">
            <StatItem label="Today" value={stats.today} />
            <Divider />
            <StatItem label="Active" value={stats.pending} />
            <Divider />
            <StatItem label="Total" value={stats.total} />
          </div>
          
          <div className="sm:hidden flex items-center gap-2">
             <div className="bg-zinc-100 px-2 py-1 rounded text-xs font-medium">{stats.today} Today</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start pt-12 pb-12 px-4 sm:px-6">
        
        {/* Container */}
        <div className="w-full max-w-lg transition-all duration-300 ease-in-out">
          
          {successData ? (
             /* SUCCESS VIEW */
             <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-green-50/50">
                   <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 mb-1">{successData.eventType} Recorded</h2>
                <p className="text-zinc-500 text-sm mb-6">{successData.customerName}</p>
                
                {Number(successData.amount) > 0 && (
                   <div className="bg-zinc-50 border border-zinc-100 rounded-lg px-6 py-3">
                      <span className="text-xs text-zinc-400 uppercase tracking-wide font-medium block mb-1">Total Amount</span>
                      <span className="text-2xl font-semibold text-zinc-900 tracking-tight">₹{successData.amount}</span>
                   </div>
                )}
             </div>

          ) : !result ? (
            /* SEARCH VIEW */
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
              <div className="p-1">
                <div className="bg-zinc-50/50 p-6 sm:p-8 border-b border-zinc-100">
                   <h2 className="text-lg font-semibold text-zinc-900 mb-1">Customer Check-in</h2>
                   <p className="text-sm text-zinc-500">Search for a customer by their phone number to verify offers.</p>
                </div>
                
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Phone Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex justify-between">
                      <span>Phone Number</span>
                      {phoneNumber.length > 0 && (
                        <span className={phoneNumber.length === 10 ? 'text-green-600' : 'text-zinc-400'}>
                          {phoneNumber.length} / 10
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        placeholder="Search phone..."
                        className="w-full pl-4 pr-10 py-3 bg-white border border-zinc-200 rounded-lg text-lg text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all font-mono tracking-tight"
                        autoFocus
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                        {phoneNumber.length === 10 ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Search className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Purchase Amount <span className="text-zinc-300 font-normal ml-1">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-serif">₹</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={purchaseValue}
                        onChange={handlePurchaseChange}
                        placeholder="0.00"
                        className="w-full pl-9 pr-4 py-3 bg-white border border-zinc-200 rounded-lg text-lg text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <button
                    onClick={searchCustomer}
                    disabled={phoneNumber.length !== 10 || loading}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-300 text-white font-medium py-3 rounded-lg transition-all shadow-sm active:scale-[0.99]"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Find Customer</span>}
                    {!loading && <ArrowRight className="w-4 h-4 opacity-50" />}
                  </button>
                </div>
              </div>
              <div className="bg-zinc-50 px-6 py-3 border-t border-zinc-200 flex items-center justify-between text-xs text-zinc-400">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500"></div>
                   <span>System Operational</span>
                 </div>
                 <span>Last synced {lastSync ? lastSync.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
              </div>
            </div>
          ) : (
            /* RESULT VIEW */
            <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Header Status */}
              <div className={`px-6 py-6 border-b border-zinc-100 flex items-start justify-between ${
                 result.type === 'valid' ? 'bg-green-50/30' : 
                 result.type === 'returning' ? 'bg-blue-50/30' : 'bg-zinc-50/50'
              }`}>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       {result.type === 'valid' && <BadgeCheck className="w-5 h-5 text-green-600" />}
                       {result.type === 'returning' && <TrendingUp className="w-5 h-5 text-blue-600" />}
                       {result.type === 'new' && <UserCheck className="w-5 h-5 text-zinc-500" />}
                       <h2 className={`text-lg font-semibold ${
                          result.type === 'valid' ? 'text-green-700' : 
                          result.type === 'returning' ? 'text-blue-700' : 'text-zinc-700'
                       }`}>{result.message}</h2>
                    </div>
                    <p className="text-sm text-zinc-500">{result.subMessage}</p>
                 </div>
                 
                 {/* Badge */}
                 <div className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                    result.type === 'valid' ? 'bg-green-100 text-green-700 border-green-200' : 
                    result.type === 'returning' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                    'bg-zinc-100 text-zinc-600 border-zinc-200'
                 }`}>
                    {result.type === 'valid' ? 'ACTIVE' : result.type === 'returning' ? 'RETURNING' : 'NEW'}
                 </div>
              </div>

              <div className="p-6 space-y-6">
                 {/* Customer Info Grid */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 bg-zinc-50 border border-zinc-100 rounded-lg p-3">
                       <label className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wide block mb-1">Customer Name</label>
                       <div className="text-base font-medium text-zinc-900">{result.customer?.name || 'New Customer'}</div>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3">
                       <label className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wide block mb-1">Phone</label>
                       <div className="text-base font-mono text-zinc-900">{phoneNumber}</div>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-3">
                       <label className="text-[10px] uppercase text-zinc-400 font-semibold tracking-wide block mb-1">Bill Amount</label>
                       <div className="text-base font-mono text-zinc-900">{purchaseValue ? `₹${purchaseValue}` : '-'}</div>
                    </div>
                 </div>

                 {result.type === 'valid' && (
                    <div className="flex gap-3 items-start p-3 bg-green-50 rounded-lg border border-green-100">
                       <AlertCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                       <p className="text-xs text-green-800 leading-relaxed">
                          This customer has a valid campaign offer. Apply discount according to current campaign rules.
                       </p>
                    </div>
                 )}

                 <div className="flex items-center gap-3 pt-2">
                    <button 
                       onClick={handleReset}
                       className="px-5 py-2.5 rounded-lg border border-zinc-200 text-zinc-600 font-medium text-sm hover:bg-zinc-50 transition-colors"
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={confirmVisit}
                       disabled={loading}
                       className="flex-1 px-5 py-2.5 rounded-lg bg-zinc-900 text-white font-medium text-sm hover:bg-zinc-800 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                       {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                       Confirm Check-in
                    </button>
                 </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Demo Banner */}
      {isDemoMode && (
         <div className="fixed bottom-4 right-4 bg-amber-50 border border-amber-200 shadow-sm rounded-lg px-3 py-2 z-50 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-xs font-medium text-amber-900">Demo Mode</span>
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
