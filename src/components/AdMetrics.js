import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAds, fetchMetrics } from '../api';

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
    return dailyLimit / clicks;
  };

  if (loading) return <p className="p-6">Loading metrics...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;
  if (!ad) return null;

  const impressions = ad.metrics?.impressions || 0;
  const clicks = ad.metrics?.clicks || 0;
  const ctr = ad.metrics?.ctr !== undefined ? ad.metrics.ctr.toFixed(2) : computeCTR(impressions, clicks).toFixed(2);
  const cpc = ad.metrics?.cpc !== undefined ? ad.metrics.cpc.toFixed(2) : computeCPC(impressions, clicks, ad.dailyLimit || 0).toFixed(2);

  return (
    <div className="p-6">
      <Link to="/" className="text-blue-400 hover:underline">← Back to inventory</Link>
      <h2 className="text-2xl font-semibold mt-4">Metrics for {ad.name}</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 max-w-md">
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">Impressions</div>
          <div className="text-xl font-bold">{impressions}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">Clicks</div>
          <div className="text-xl font-bold">{clicks}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">CTR</div>
          <div className="text-xl font-bold">{ctr}%</div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-sm text-gray-400">CPC</div>
          <div className="text-xl font-bold">${cpc}</div>
        </div>
      </div>
    </div>
  );
};

export default AdMetrics;
