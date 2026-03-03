import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trackImpression, trackClick } from '../api';
import { 
  Edit2, 
  Trash2, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Activity,
  Megaphone
} from 'lucide-react';

const AdInventory = ({ ads, onEdit, onDelete, onToggleStatus }) => {
  useEffect(() => {
    // Track impressions for ads when component mounts or ads list changes
    ads.forEach(a => {
      trackImpression(a.id).catch(() => {});
    });
  }, [ads]);

  // Helper to format dates nicely
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString));
  };

  return (
    <div className="mt-8 bg-gray-800/40 border border-gray-700 rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-700">
            <tr>
              <th className="px-6 py-4 font-medium tracking-wider"><div className="flex items-center gap-2"><Megaphone className="w-4 h-4"/> Ad Name</div></th>
              <th className="px-6 py-4 font-medium tracking-wider"><div className="flex items-center gap-2"><Activity className="w-4 h-4"/> Status</div></th>
              <th className="px-6 py-4 font-medium tracking-wider"><div className="flex items-center gap-2"><DollarSign className="w-4 h-4"/> Daily Limit</div></th>
              <th className="px-6 py-4 font-medium tracking-wider"><div className="flex items-center gap-2"><Megaphone className="w-4 h-4"/> Type</div></th>
              <th className="px-6 py-4 font-medium tracking-wider"><div className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Schedule</div></th>
              <th className="px-6 py-4 font-medium tracking-wider"><div className="flex items-center gap-2"><MapPin className="w-4 h-4"/> Geofences</div></th>
              <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {ads.map((ad) => {
              const isActive = ad.status === 'Active';
              
              return (
                <tr key={ad.id} className="hover:bg-gray-750 transition-colors group">
                  {/* Ad Name Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/ads/${ad.id}`}
                      className="text-blue-400 font-medium hover:text-blue-300 hover:underline flex items-center gap-2"
                      onClick={() => trackClick(ad.id)}
                    >
                      {ad.name}
                    </Link>
                  </td>

                  {/* Status Toggle Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => onToggleStatus(ad.id)}
                      className="flex items-center gap-2 focus:outline-none"
                    >
                      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                      </div>
                      <span className={`text-xs font-semibold ${isActive ? 'text-emerald-400' : 'text-gray-400'}`}>
                        {ad.status}
                      </span>
                    </button>
                  </td>

                  {/* Daily Limit Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ad.dailyLimit === 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                      ${ad.dailyLimit}
                    </span>
                  </td>

                  {/* Type Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {ad.type}
                  </td>

                  {/* Schedule Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                    <div className="flex flex-col text-xs">
                      <span>{formatDate(ad.startDate)}</span>
                      <span className="text-gray-500">to {formatDate(ad.endDate)}</span>
                    </div>
                  </td>

                  {/* Geofences Column (Micro-visualization with Chips) */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {(ad.geofences || []).length > 0 ? (
                        ad.geofences.map((gf, idx) => (
                          <span key={idx} className="px-2 py-1 text-[10px] font-medium bg-gray-700 text-gray-300 rounded-md truncate max-w-[100px]" title={gf}>
                            {gf}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-xs italic">Global</span>
                      )}
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(ad)}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                        title="Edit Ad"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(ad)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                        title="Delete Ad"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Empty State Redesign */}
            {ads.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Megaphone className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-lg text-gray-400 font-medium">No ads created yet</p>
                    <p className="text-sm mt-1">Click 'Create Ad' to launch your first campaign.</p>
                  </div>
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