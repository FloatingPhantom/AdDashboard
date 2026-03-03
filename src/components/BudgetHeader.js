import React from 'react';
import { Wallet, TrendingUp, AlertCircle } from 'lucide-react';

const BudgetHeader = ({ balance, ads }) => {
  const list = ads || [];
  // daily usage = sum of (dailyLimit - current balance) for each ad
  const dailyUsage = list.reduce((sum, ad) => {
    const dl = Number(ad.dailyLimit || 0);
    const bal = Number(ad.balance || dl);
    return sum + Math.max(0, dl - bal);
  }, 0);

  // Calculate percentage used of account balance
  const percentUsed = balance > 0 ? Math.min((dailyUsage / balance) * 100, 100) : 0;
  const isWarning = percentUsed > 85;

  return (
    <div className="bg-gray-800/40 border border-gray-700 p-6 rounded-xl shadow-lg mb-8">
      <div className="flex flex-col md:flex-row justify-between gap-6">
        
        {/* Total Balance */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Wallet className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-400">Total Account Balance</div>
            <div className="text-2xl font-bold text-white">${balance.toLocaleString()}</div>
          </div>
        </div>

        {/* Daily Usage */}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg border ${isWarning ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
            <TrendingUp className={`w-6 h-6 ${isWarning ? 'text-amber-400' : 'text-emerald-400'}`} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-400">Daily Usage</div>
            <div className="text-2xl font-bold text-white">${dailyUsage.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-400">Capacity Used</span>
          <span className={isWarning ? 'text-amber-400 font-medium' : 'text-gray-400'}>
            {percentUsed.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-700/50 rounded-full h-2.5 overflow-hidden flex">
          <div 
            className={`h-2.5 rounded-full transition-all duration-500 ${isWarning ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-gradient-to-r from-emerald-400 to-blue-500'}`}
            style={{ width: `${percentUsed}%` }}
          ></div>
        </div>
        {isWarning && (
          <div className="flex items-center gap-1 mt-2 text-amber-400 text-xs">
            <AlertCircle className="w-3 h-3" /> Warning: Approaching maximum daily limit.
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetHeader;