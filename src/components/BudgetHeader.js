import React from 'react';

const BudgetHeader = ({ balance, ads }) => {
  const activeSum = ads.reduce((sum, ad) => sum + Number(ad.dailyLimit || 0), 0);
  const remaining = balance - activeSum;

  return (
    <div className="bg-gray-800 p-4 flex justify-between items-center">
      <div>
        <div className="text-sm text-gray-400">Total Account Balance</div>
        <div className="text-xl font-semibold">${balance.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-sm text-gray-400">Remaining Daily Capacity</div>
        <div className="text-xl font-semibold">${remaining.toLocaleString()}</div>
      </div>
    </div>
  );
};

export default BudgetHeader;