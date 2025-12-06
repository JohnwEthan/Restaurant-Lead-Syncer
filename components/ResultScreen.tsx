import React, { useState } from 'react';
import { CheckCircle, XCircle, ChevronLeft, Save, UserCheck, Bug } from 'lucide-react';
import { Customer } from '../types';
import { getRecordCount } from '../services/backend';

interface ResultScreenProps {
  isValid: boolean;
  message: string;
  customer?: Customer;
  onConfirm: (finalPay: number) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ 
  isValid, 
  message, 
  customer, 
  onConfirm, 
  onCancel,
  isProcessing
}) => {
  const [billAmount, setBillAmount] = useState<string>(''); // Start empty
  const [showDebug, setShowDebug] = useState(false);

  // Calculate totals
  const bill = parseInt(billAmount) || 0;
  const discount = customer?.discount || 0;
  
  // If bill is 0, final pay is 0. If bill exists, apply discount (min 0)
  const finalPay = bill > 0 ? Math.max(0, bill - discount) : 0;
  
  // Determine Event Type for UI Feedback
  const isPurchase = bill > 0;

  const handleConfirmClick = () => {
    onConfirm(bill); // Pass the raw bill amount (backend handles 0 vs >0)
  };

  if (isValid && customer) {
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Valid Header */}
        <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 p-8 text-white rounded-b-[2.5rem] shadow-xl text-center mb-6">
          <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <CheckCircle size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-1">VALID OFFER</h1>
          <p className="text-xl font-hindi opacity-90">मान्य ऑफर</p>
        </div>

        {/* Card Content */}
        <div className="flex-1 px-6 max-w-lg mx-auto w-full">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 mb-6">
            
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
              <div>
                <p className="text-slate-500 text-sm">Customer Name / नाम</p>
                <p className="text-2xl font-bold text-slate-800">{customer.name}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-sm">Discount / छूट</p>
                <div className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg font-bold text-xl">
                  ₹{customer.discount} OFF
                </div>
              </div>
            </div>

            {/* Bill Calculator Section */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                 <label className="text-slate-600 font-medium">Original Bill / बिल</label>
                 <div className="flex items-center gap-1">
                   <span className="text-slate-400">₹</span>
                   <input 
                      type="number" 
                      value={billAmount}
                      onChange={(e) => setBillAmount(e.target.value)}
                      placeholder="0"
                      className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-right font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-slate-300"
                   />
                 </div>
              </div>
              
              {isPurchase ? (
                <>
                  <div className="flex items-center justify-between text-emerald-600">
                     <label className="font-medium">Discount / छूट</label>
                     <span className="font-bold">- ₹{discount}</span>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-slate-800 font-bold text-lg">Customer Pays</span>
                        <span className="text-slate-500 text-xs font-hindi">भुगतान करें</span>
                     </div>
                     <span className="text-3xl font-bold text-slate-900">₹{finalPay}</span>
                  </div>
                </>
              ) : (
                <div className="border-t border-slate-200 pt-3 text-center">
                  <span className="text-slate-400 text-sm italic">Enter bill amount to calculate final pay</span>
                </div>
              )}
            </div>

          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pb-8">
            <button
              onClick={handleConfirmClick}
              disabled={isProcessing}
              className={`w-full h-20 text-white rounded-xl text-xl font-bold shadow-lg active:scale-[0.98] transition-all flex flex-col items-center justify-center
                ${isPurchase 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
            >
              {isProcessing ? 'Processing...' : (
                <>
                  <span className="flex items-center gap-2">
                    {isPurchase ? <Save size={20}/> : <UserCheck size={20}/>} 
                    {isPurchase ? 'CONFIRM PURCHASE' : 'CONFIRM WALK-IN'}
                  </span>
                  <span className="text-sm font-hindi font-normal opacity-90">
                    {isPurchase ? 'खरीद की पुष्टि करें' : 'वॉक-इन की पुष्टि करें'}
                  </span>
                </>
              )}
            </button>
            
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full h-16 bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-lg font-semibold flex flex-col items-center justify-center"
            >
              <span>Cancel</span>
              <span className="text-xs font-hindi font-normal">वापस जाएं</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // INVALID SCREEN
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300 bg-red-50">
      <div className="bg-gradient-to-b from-red-500 to-red-600 p-8 text-white rounded-b-[2.5rem] shadow-xl text-center mb-8">
        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
          <XCircle size={48} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-1">INVALID</h1>
        <p className="text-xl font-hindi opacity-90">अमान्य</p>
      </div>

      <div className="flex-1 px-8 max-w-lg mx-auto w-full text-center">
         <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 mb-8">
            <p className="text-xl text-slate-800 font-medium whitespace-pre-line leading-relaxed mb-6">
              {message}
            </p>
            <div className="p-4 bg-slate-100 rounded-xl">
              <p className="text-slate-500 text-sm mb-1">Charge full bill / पूरा बिल लें</p>
              <p className="text-3xl font-bold text-slate-900">₹{billAmount || '0'}</p>
            </div>
         </div>

         <button
            onClick={onCancel}
            className="w-full h-20 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xl font-bold shadow-lg flex flex-col items-center justify-center active:scale-[0.98] transition-all"
          >
            <span className="flex items-center gap-2"><ChevronLeft size={24}/> GO BACK</span>
            <span className="text-sm font-hindi font-normal opacity-70">वापस जाएं</span>
          </button>

          <div className="mt-6 flex justify-center">
             <button onClick={() => setShowDebug(!showDebug)} className="text-xs text-red-300 flex items-center gap-1 hover:text-red-500">
               <Bug size={12}/> {showDebug ? 'Hide' : 'Show'} Debug Info
             </button>
          </div>
          
          {showDebug && (
            <div className="mt-2 text-xs text-left text-slate-500 bg-slate-100 p-4 rounded overflow-auto max-h-32 font-mono">
              Records Loaded: {getRecordCount()} <br/>
              (If Records = 1, sync failed. Click sync button)<br/>
              Sheet URL Check: Check deployment permissions.
            </div>
          )}
      </div>
    </div>
  );
};

export default ResultScreen;