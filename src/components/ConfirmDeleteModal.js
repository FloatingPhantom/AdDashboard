import React from 'react';
import { Dialog } from '@headlessui/react';
import { AlertTriangle, Trash2 } from 'lucide-react';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, adName }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 text-center">
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" />
        
        <div className="inline-block align-bottom bg-gray-900 rounded-xl text-center overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm w-full border border-gray-700 p-6">
          
          {/* Big Warning Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
          </div>
          
          <Dialog.Title className="text-xl font-bold text-white mb-2">
            Delete Campaign
          </Dialog.Title>
          
          <div className="mt-2 text-sm text-gray-400">
            Are you sure you want to delete <span className="font-semibold text-gray-200">"{adName}"</span>? 
            This action cannot be undone and all associated metrics will be permanently removed.
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 focus:ring-2 focus:ring-gray-600 outline-none transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose(); // Good practice to close modal on confirm
              }}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 outline-none transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
            >
              <Trash2 className="w-4 h-4" /> Delete Campaign
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default ConfirmDeleteModal;