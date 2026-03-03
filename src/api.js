const BASE_URL = 'http://localhost:8080';

export async function fetchAds() {
  const res = await fetch(`${BASE_URL}/ads`);
  if (!res.ok) throw new Error('Failed to fetch ads');
  return res.json();
}

export async function createAd(ad) {
  const res = await fetch(`${BASE_URL}/ads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ad),
  });
  if (!res.ok) throw new Error('Failed to create ad');
  return res.json();
}

export async function updateAd(ad) {
  const res = await fetch(`${BASE_URL}/ads/${ad.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ad),
  });
  if (!res.ok) throw new Error('Failed to update ad');
  return res.json();
}

export async function deleteAd(id) {
  const res = await fetch(`${BASE_URL}/ads/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete ad');
}

export async function trackImpression(adId) {
  await fetch(`${BASE_URL}/events/impression`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adId }),
  });
}

export async function trackClick(adId) {
  await fetch(`${BASE_URL}/events/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adId }),
  });
}

export async function fetchMetrics(adId) {
  const res = await fetch(`${BASE_URL}/metrics/${adId}`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}
