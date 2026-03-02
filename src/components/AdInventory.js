import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trackImpression, trackClick } from '../api';

const AdInventory = ({ ads, onEdit, onDelete, onToggleStatus }) => {
  useEffect(() => {
    // track impressions for ads when component mounts or ads list changes
    ads.forEach(a => {
      trackImpression(a.id).catch(() => {});
    });
  }, [ads]);

  return (
    <div className="mt-6">
      <div className="overflow-x-auto">
        <table className="min-w-full bg-gray-800">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ad Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Daily Limit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Schedule</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Geofences</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {ads.map((ad) => (
              <tr key={ad.id} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={`/ads/${ad.id}`}
                    className="text-blue-400 hover:underline"
                    onClick={() => trackClick(ad.id)}
                  >
                    {ad.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ad.status === 'Active'}
                      onChange={() => onToggleStatus(ad.id)}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                    <span className="ml-2">{ad.status}</span>
                  </label>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={ad.dailyLimit === 0 ? 'text-red-500' : ''}>${ad.dailyLimit}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : '-'}
                  {' '}→{' '}
                  {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(ad.geofences || []).join(', ')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button
                    onClick={() => onEdit(ad)}
                    className="px-3 py-1 bg-yellow-500 rounded hover:bg-yellow-400"
                  >Edit</button>
                  <button
                    onClick={() => onDelete(ad)}
                    className="px-3 py-1 bg-red-600 rounded hover:bg-red-500"
                  >Delete</button>
                </td>
              </tr>
            ))}
            {ads.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-gray-400">
                  No ads created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdInventory;