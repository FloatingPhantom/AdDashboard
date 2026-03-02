import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';

const AdFormModal = ({ isOpen, onClose, onSave, initial }) => {
  const [name, setName] = useState(initial?.name || '');
  const [dailyLimit, setDailyLimit] = useState(initial?.dailyLimit || '');
  const [startDate, setStartDate] = useState(initial?.startDate ? new Date(initial.startDate).toISOString().substr(0,10) : '');
  const [endDate, setEndDate] = useState(initial?.endDate ? new Date(initial.endDate).toISOString().substr(0,10) : '');
  const [geofences, setGeofences] = useState((initial?.geofences||[]).join(','));

  useEffect(() => {
    setName(initial?.name || '');
    setDailyLimit(initial?.dailyLimit || '');
    setStartDate(initial?.startDate ? new Date(initial.startDate).toISOString().substr(0,10) : '');
    setEndDate(initial?.endDate ? new Date(initial.endDate).toISOString().substr(0,10) : '');
    setGeofences((initial?.geofences||[]).join(','));
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const ad = {
      ...initial,
      name,
      dailyLimit: Number(dailyLimit),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      geofences: geofences.split(',').map(s => s.trim()).filter(Boolean),
    };
    onSave(ad);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-50" />
        <div className="bg-gray-800 rounded-lg max-w-md mx-auto p-6 z-20">
          <Dialog.Title className="text-lg font-medium">{initial ? 'Edit Ad' : 'Add Ad'}</Dialog.Title>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm">Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm">Daily Limit</label>
              <input
                type="number"
                min="0"
                required
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm">Geofences (comma separated)</label>
              <input
                value={geofences}
                onChange={(e) => setGeofences(e.target.value)}
                className="w-full mt-1 p-2 bg-gray-700 rounded text-white"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
};

export default AdFormModal;