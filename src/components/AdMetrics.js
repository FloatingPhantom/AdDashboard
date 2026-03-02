import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAds, fetchMetrics } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  
  const computeCPC = (impressions, clicks, dailyLimit) => {
    if (!clicks) return 0;
    return dailyLimit / clicks; // Assuming dailyLimit represents total spend for this example
  };

  if (loading) return <div className="p-8 text-center text-gray-400 animate-pulse">Loading metrics dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500 bg-red-900/20 rounded-lg">{error}</div>;
  if (!ad) return null;

  const impressions = ad.metrics?.impressions || 0;
  const clicks = ad.metrics?.clicks || 0;
  const ctr = ad.metrics?.ctr !== undefined ? ad.metrics.ctr.toFixed(2) : computeCTR(impressions, clicks).toFixed(2);
  const cpc = ad.metrics?.cpc !== undefined ? ad.metrics.cpc.toFixed(2) : computeCPC(impressions, clicks, ad.dailyLimit || 0).toFixed(2);

  // MOCK DATA: Replace this with real time-series data from your backend later
  const mockChartData = [
    { day: 'Mon', impressions: Math.max(0, impressions - 500), clicks: Math.max(0, clicks - 20) },
    { day: 'Tue', impressions: Math.max(0, impressions - 400), clicks: Math.max(0, clicks - 15) },
    { day: 'Wed', impressions: Math.max(0, impressions - 200), clicks: Math.max(0, clicks - 5) },
    { day: 'Thu', impressions: Math.max(0, impressions - 50), clicks: Math.max(0, clicks - 2) },
    { day: 'Fri', impressions: impressions, clicks: clicks }, // Current totals
  ];

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
        <p className="text-gray-400 mt-1">Real-time metrics and historical trends.</p>
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
      </div>

      {/* Chart Section */}
      <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-6">Impressions Trend</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="day" stroke="#9ca3af" tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} tickFormatter={(value) => value >= 1000 ? `${value/1000}k` : value} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f3f4f6' }}
                itemStyle={{ color: '#60a5fa' }}
              />
              <Area 
                type="monotone" 
                dataKey="impressions" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorImpressions)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
    </div>
  );
};

export default AdMetrics;