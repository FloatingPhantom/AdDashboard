import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Save, X, DollarSign, MapPin, Calendar, Megaphone } from 'lucide-react';

const AdFormModal = ({ isOpen, onClose, onSave, initial }) => {
  const [name, setName] = useState(initial?.name || '');
  const [dailyLimit, setDailyLimit] = useState(initial?.dailyLimit || '');
  const [startDate, setStartDate] = useState(initial?.startDate ? new Date(initial.startDate).toISOString().substr(0,10) : '');
  const [endDate, setEndDate] = useState(initial?.endDate ? new Date(initial.endDate).toISOString().substr(0,10) : '');
  const [type, setType] = useState(initial?.type || 'image');
  const [url, setUrl] = useState(initial?.url || '');
  const [geofences, setGeofences] = useState((initial?.geofences||[]).join(', '));

  useEffect(() => {
    setName(initial?.name || '');
    setDailyLimit(initial?.dailyLimit || '');
    setStartDate(initial?.startDate ? new Date(initial.startDate).toISOString().substr(0,10) : '');
    setEndDate(initial?.endDate ? new Date(initial.endDate).toISOString().substr(0,10) : '');
    setType(initial?.type || 'image');
    setUrl(initial?.url || '');
    setGeofences((initial?.geofences||[]).join(', '));
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const ad = {
      ...initial,
      name,
      dailyLimit: Number(dailyLimit),
      type,
      url,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      geofences: geofences.split(',').map(s => s.trim()).filter(Boolean),
    };
    onSave(ad);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" />
        
        {/* Modal Panel */}
        <div className="inline-block align-bottom bg-gray-900 rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-gray-700">
          
          {/* Header */}
          <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <Dialog.Title className="text-lg font-semibold text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-400"/>
              {initial ? 'Edit Campaign' : 'Create New Campaign'}
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Campaign Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer Sale 2026"
                className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-500"
              />
            </div>

            {/* Daily Limit Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Daily Limit</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="number"
                  min="0"
                  required
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-400"/> Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-gray-400"/> End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Type and URL Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Ad Type</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="image">Banner ($1 per click)</option>
                  <option value="video">Video ($2 per click)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Destination URL</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-500"
                />
              </div>
            </div>

            {/* Geofences Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-gray-400"/> Target Geofences
              </label>
              <input
                value={geofences}
                onChange={(e) => setGeofences(e.target.value)}
                placeholder="e.g. New York, London, Tokyo (leave blank for Global)"
                className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-500"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 mt-6 border-t border-gray-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-600 outline-none transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 outline-none transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Save className="w-4 h-4" /> Save Campaign
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default AdFormModal;