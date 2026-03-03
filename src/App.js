import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BudgetHeader from './components/BudgetHeader';
import AdInventory from './components/AdInventory';
import AdFormModal from './components/AdFormModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import AdMetrics from './components/AdMetrics';
import { fetchAds, createAd, updateAd, deleteAd } from './api';

function App() {
  const [ads, setAds] = useState([]);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [adToDelete, setAdToDelete] = useState(null);
  const balance = 5000;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchAds()
      .then((data) => setAds(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const remainingCapacity = () => {
    const list = ads || [];
    const sum = list.reduce((acc, ad) => acc + Number(ad.dailyLimit || 0), 0);
    return balance - sum;
  };

  const handleAddClick = () => {
    setEditingAd(null);
    setFormOpen(true);
  };

  const handleSave = async (ad) => {
    // validate
    if (!ad.name) return;
    if (ad.dailyLimit > remainingCapacity() && !editingAd) {
      alert('Daily limit exceeds remaining capacity');
      return;
    }
    try {
      if (editingAd) {
        const updated = await updateAd(ad);
        setAds((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        const created = await createAd(ad);
        setAds((prev) => [...prev, created]);
      }
    } catch (err) {
      alert(err.message);
    }
    setFormOpen(false);
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setFormOpen(true);
  };

  const handleDelete = (ad) => {
    setAdToDelete(ad);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteAd(adToDelete.id);
      setAds((prev) => prev.filter((a) => a.id !== adToDelete.id));
    } catch (err) {
      alert(err.message);
    }
    setDeleteOpen(false);
  };

  const toggleStatus = async (id) => {
    const ad = ads.find((a) => a.id === id);
    if (!ad) return;
    const updated = { ...ad, status: ad.status === 'Active' ? 'Paused' : 'Active' };
    try {
      const res = await updateAd(updated);
      setAds((prev) => prev.map((a) => (a.id === res.id ? res : a)));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <BudgetHeader balance={balance} ads={(ads || []).filter(a => a.status==='Active')} />
        <main className="flex-grow p-6">
          <Routes>
            <Route path="/" element={
              <>
                <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-semibold">Ad Inventory</h1>
                  <button
                    onClick={handleAddClick}
                    className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500"
                  >
                    Add Ad
                  </button>
                </div>
                {loading && <p className="mt-4 text-gray-400">Loading ads...</p>}
                {error && <p className="mt-4 text-red-500">Error: {error}</p>}
                {!loading && !error && (
                  <AdInventory
                    ads={ads || []}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleStatus={toggleStatus}
                  />
                )}
              </>
            } />
            <Route path="/ads/:id" element={<AdMetrics />} />
          </Routes>
        </main>
        <AdFormModal
          isOpen={isFormOpen}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
          initial={editingAd}
        />
        <ConfirmDeleteModal
          isOpen={isDeleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={confirmDelete}
          adName={adToDelete?.name}
        />
      </div>
    </Router>
  );
}

export default App;