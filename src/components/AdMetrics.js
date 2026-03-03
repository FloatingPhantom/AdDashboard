import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAds, fetchMetrics } from '../api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Eye, MousePointerClick, TrendingUp, DollarSign, ArrowLeft } from 'lucide-react';

const AdMetrics = () => {
  const { id } = useParams();
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAds(), fetchMetrics(id)])
      .then(([list, metrics]) => {
        const found = list.find((a) => a.id === id);
        if (found) {
          setAd({ ...found, metrics });
        } else {
          setError('Ad not found');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const computeCTR = (impressions, clicks) => {
    if (!impressions) return 0;
    return (clicks / impressions) * 100;
  };
  
  const computeCPC = (spend, clicks) => {
    if (!clicks || clicks === 0) return 0;
    return spend / clicks; 
  };

  if (loading) return <div className="p-8 text-center text-gray-400 animate-pulse">Loading metrics dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500 bg-red-900/20 rounded-lg">{error}</div>;
  if (!ad) return null;

  const impressions = ad.metrics?.impressions || 0;
  const clicks = ad.metrics?.clicks || 0;
  
  // 1. Calculate CTR
  const ctr = ad.metrics?.ctr !== undefined 
    ? ad.metrics.ctr.toFixed(2) 
    : computeCTR(impressions, clicks).toFixed(2);

  // 2. Calculate Spend FIRST (as a raw number so we can use it for math)
  const rawSpend = ad.metrics?.spend !== undefined 
    ? ad.metrics.spend 
    : (impressions * 0.001) + (clicks * (ad.type === 'video' ? 2 : 1)); // e.g., $2 for video, $1 for image
  
  const spend = rawSpend.toFixed(2); // Format for display

  // 3. NOW calculate CPC using the actual spend
  const cpc = computeCPC(rawSpend, clicks).toFixed(2);

  // 4. Calculate Balance
  const balance = ad.metrics?.balance !== undefined 
    ? ad.metrics.balance.toFixed(2) 
    : Math.max(0, (ad.dailyLimit || 0) - rawSpend).toFixed(2); // Added Math.max so balance doesn't go negative visually!

  // Calculate slices for the Pie/Donut Chart
  const unclicked = Math.max(0, impressions - clicks);
  
  const pieData = impressions > 0 
    ? [
        { name: 'Total Clicks', value: clicks },
        { name: 'Unclicked Impressions', value: unclicked }
      ]
    : [
        { name: 'No Data Yet', value: 1 } // Fallback if 0 impressions
      ];

  // Purple for clicks (matches your click card), dark gray for the rest of the impressions
  const COLORS = impressions > 0 ? ['#a855f7', '#374151'] : ['#1f2937'];

  return (
    <div className="p-6 max-w-6xl mx-auto text-gray-100">
      {/* Header */}
      <div className="mb-8">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to inventory
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Performance: {ad.name}</h2>
        <p className="text-gray-400 mt-1">Real-time engagement breakdown.</p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Impressions Card */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl hover:bg-gray-800 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-400">Impressions</div>
            <Eye className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-white">{impressions.toLocaleString()}</div>
        </div>

        {/* Clicks Card */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl hover:bg-gray-800 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-400">Clicks</div>
            <MousePointerClick className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-white">{clicks.toLocaleString()}</div>
        </div>

        {/* CTR Card */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl hover:bg-gray-800 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-400">Avg. CTR</div>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-white">{ctr}%</div>
        </div>

        {/* CPC Card */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl hover:bg-gray-800 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-400">Est. CPC</div>
            <DollarSign className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-white">${cpc}</div>
        </div>

        {/* Spend Card */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl hover:bg-gray-800 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-400">Total Spend</div>
            <DollarSign className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-white">${spend}</div>
        </div>

        {/* Balance Card */}
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl hover:bg-gray-800 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-400">Remaining Balance</div>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-white">${balance}</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl flex flex-col items-center">
        <div className="w-full text-left mb-2">
          <h3 className="text-lg font-semibold">Click-Through Rate (CTR) Breakdown</h3>
          <p className="text-sm text-gray-400">Comparing total clicks against overall impressions.</p>
        </div>
        
        <div className="h-[350px] w-full max-w-lg">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={90}  // Adding an inner radius makes it a Donut chart!
                outerRadius={130}
                paddingAngle={5}  // Adds a sleek gap between slices
                dataKey="value"
                stroke="none"     // Removes the ugly default white borders
              >
                {(pieData || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => value.toLocaleString()}
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
    </div>
  );
};

export default AdMetrics;