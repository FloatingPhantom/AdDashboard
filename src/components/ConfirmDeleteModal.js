import React from 'react';
import { Dialog } from '@headlessui/react';

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, adName }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-50" />
        <div className="bg-gray-800 rounded-lg max-w-md mx-auto p-6 z-20">
          <Dialog.Title className="text-lg font-medium">Confirm Delete</Dialog.Title>
          <p className="mt-2">Are you sure you want to delete <strong>{adName}</strong>?</p>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default ConfirmDeleteModal;