import React, { useState, useEffect } from 'react';
import NumberPad from './components/NumberPad';
import ResultScreen from './components/ResultScreen';
import Toast from './components/Toast'; 
import { checkOffer, confirmOfferUsage, initializeDatabase, getLastSyncTime, syncData, getRecordCount } from './services/backend';
import { VerificationResult } from './types';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Database, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [screen, setScreen] = useState<'input' | 'result'>('input');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [recordCount, setRecordCount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Initial Sync and Connection Check
    initializeDatabase().then((success) => {
      setLastSync(getLastSyncTime());
      setRecordCount(getRecordCount());
      setServerStatus(success ? 'connected' : 'error');
      if (!success && navigator.onLine) {
        showToast('Cannot connect to Google Sheet.', 'error');
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const interval = setInterval(() => setLastSync(getLastSyncTime()), 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const handleManualSync = async () => {
    if (!isOnline) return;
    setSyncing(true);
    const success = await syncData();
    setLastSync(getLastSyncTime());
    setRecordCount(getRecordCount());
    setServerStatus(success ? 'connected' : 'error');
    setSyncing(false);
    
    if (success) {
      showToast(`Synced ${getRecordCount()} records!`, 'success');
    } else {
      showToast('Sync Failed. Server not reachable.', 'error');
    }
  };

  const handleCheckOffer = async () => {
    setLoading(true);
    try {
      const res = await checkOffer(phoneNumber);
      setResult(res);
      setScreen('result');
    } catch (error) {
      showToast('Error checking offer', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (purchaseValue: number) => {
    if (!result?.customer?.phone) return;
    
    setProcessing(true);
    try {
      // Pass the entire customer object (contains lead_id)
      const success = await confirmOfferUsage(result.customer.phone, purchaseValue, result.customer);
      
      if (success) {
        if (purchaseValue > 0) {
          showToast(`Purchase Confirmed! Value: ₹${purchaseValue}`, 'success');
        } else {
          showToast('Walk-in Verified Successfully!', 'success');
        }
        resetApp();
      } else {
        showToast('Failed to confirm. Please try again.', 'error');
      }
    } catch (e) {
      showToast('Error processing request', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const resetApp = () => {
    setPhoneNumber('');
    setResult(null);
    setScreen('input');
    setLastSync(getLastSyncTime());
    setRecordCount(getRecordCount());
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* STATUS BAR */}
      <div className={`px-4 py-3 flex justify-between items-center text-xs font-medium shadow-sm z-10 transition-colors duration-300 ${
        !isOnline ? 'bg-red-600 text-white' : 
        serverStatus === 'error' ? 'bg-amber-600 text-white' : 
        'bg-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center gap-3">
          {/* Network Status */}
          <div className="flex items-center gap-1.5">
            {isOnline ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} />}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>

          <div className="h-3 w-px bg-slate-600/50"></div>

          {/* Record Count */}
          <div className="flex items-center gap-1.5">
            <Database size={14} className={recordCount > 1 ? "text-emerald-400" : "text-amber-400"} />
            <span>Records: {recordCount}</span>
          </div>

          <div className="h-3 w-px bg-slate-600/50"></div>

          {/* Server Status */}
          {isOnline && (
             <div className="flex items-center gap-1.5">
               {serverStatus === 'checking' && <RefreshCw size={14} className="animate-spin text-blue-400"/>}
               {serverStatus === 'connected' && <CheckCircle2 size={14} className="text-emerald-400"/>}
               {serverStatus === 'error' && <AlertCircle size={14} className="text-white"/>}
               <span className="hidden sm:inline">
                 {serverStatus === 'checking' ? 'Connecting' : 
                  serverStatus === 'connected' ? 'Server OK' : 'Server Error'}
               </span>
             </div>
          )}
        </div>
        
        <button 
          onClick={handleManualSync}
          className="flex items-center gap-2 active:opacity-70 disabled:opacity-50 hover:text-white transition-colors"
          disabled={!isOnline || syncing}
        >
          {syncing ? <RefreshCw size={14} className="animate-spin text-white"/> : <RefreshCw size={14}/>}
          <span>{syncing ? 'Syncing...' : lastSync === 'Not Synced' ? 'Sync Now' : lastSync}</span>
        </button>
      </div>

      {/* Warning if 0 records */}
      {serverStatus === 'connected' && recordCount <= 1 && (
        <div className="bg-amber-100 text-amber-800 text-xs px-4 py-2 text-center border-b border-amber-200 flex justify-center items-center gap-2">
           <AlertTriangle size={14}/>
           <span>Connected to sheet, but found 0 leads. Check "Leads" tab name and column headers.</span>
        </div>
      )}

      <div className="flex-1 flex flex-col relative max-w-xl mx-auto w-full bg-white shadow-2xl min-h-0">
        {screen === 'input' && (
          <div className="flex-1 flex flex-col p-6 animate-in fade-in duration-300">
             <div className="text-center mb-8 mt-4">
               <h1 className="text-2xl font-bold text-slate-800">Offer Checker</h1>
               <p className="text-slate-500 font-hindi">ऑफर चेक करें</p>
             </div>
             <div className="flex-1 flex items-center">
                <NumberPad 
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  onSubmit={handleCheckOffer}
                  isLoading={loading}
                />
             </div>
             <div className="text-center text-xs text-slate-400 mt-4">
               Enter 10-digit Customer Mobile Number
             </div>
          </div>
        )}

        {screen === 'result' && result && (
          <ResultScreen 
            isValid={result.valid}
            message={result.message}
            customer={result.customer}
            onConfirm={handleConfirm}
            onCancel={resetApp}
            isProcessing={processing}
          />
        )}
      </div>
    </div>
  );
};

export default App;