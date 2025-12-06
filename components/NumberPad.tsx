import React from 'react';
import { Delete, ArrowRight } from 'lucide-react'; // Assuming lucide-react is available or use SVG

interface NumberPadProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const NumberPad: React.FC<NumberPadProps> = ({ value, onChange, onSubmit, isLoading }) => {
  
  const handleNumClick = (num: string) => {
    if (value.length < 10) {
      onChange(value + num);
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Display Screen */}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 mb-6 shadow-sm">
        <div className="text-slate-500 text-sm font-medium mb-1 flex justify-between">
            <span>Customer Phone Number</span>
            <span className="font-hindi">ग्राहक का फोन नंबर</span>
        </div>
        <div className="h-16 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
          <span className={`text-4xl font-mono font-bold tracking-widest ${value ? 'text-slate-900' : 'text-slate-300'}`}>
            {value || '__________'}
          </span>
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumClick(num.toString())}
            className="h-20 bg-white border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 hover:bg-slate-50 rounded-xl text-3xl font-bold text-slate-700 transition-all flex items-center justify-center shadow-sm"
          >
            {num}
          </button>
        ))}
        
        <button
          onClick={handleBackspace}
          className="h-20 bg-slate-100 border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 hover:bg-slate-200 rounded-xl text-slate-600 transition-all flex items-center justify-center font-bold text-lg"
        >
          ⌫
        </button>
        
        <button
          onClick={() => handleNumClick('0')}
          className="h-20 bg-white border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 hover:bg-slate-50 rounded-xl text-3xl font-bold text-slate-700 transition-all flex items-center justify-center shadow-sm"
        >
          0
        </button>

        <button
          onClick={handleClear}
          className="h-20 bg-red-50 border-b-4 border-red-100 active:border-b-0 active:translate-y-1 hover:bg-red-100 rounded-xl text-red-600 transition-all flex flex-col items-center justify-center font-bold leading-none"
        >
          <span>C</span>
          <span className="text-xs font-normal">Clear</span>
        </button>
      </div>

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={value.length !== 10 || isLoading}
        className={`w-full h-24 rounded-2xl text-white font-bold text-2xl flex flex-col items-center justify-center shadow-lg transition-all
          ${value.length === 10 && !isLoading 
            ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 translate-y-0' 
            : 'bg-slate-300 cursor-not-allowed shadow-none'
          }`}
      >
        {isLoading ? (
          <span className="animate-pulse">Checking...</span>
        ) : (
          <>
            <span className="flex items-center gap-2">CHECK OFFER <ArrowRight size={24}/></span>
            <span className="text-sm font-hindi font-normal opacity-90">ऑफर चेक करें</span>
          </>
        )}
      </button>
    </div>
  );
};

export default NumberPad;