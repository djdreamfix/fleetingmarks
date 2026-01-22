import React, { useEffect, useMemo, useState } from 'react';
import MapView from './components/MapView';
import ColorDialog from './components/ColorDialog';
import { io, Socket } from 'socket.io-client';

type MarkColor = 'blue' | 'green' | 'split';
type Mark = {
  id: string;
  lat: number;
  lng: number;
  color: MarkColor;
  street?: string;
  createdAt: string;
  expiresAt: string;
};

const API_URL = import.meta.env.VITE_API_URL; // e.g. https://your-api.onrender.com
const WS_URL = import.meta.env.VITE_WS_URL || API_URL;

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [pendingClick, setPendingClick] = useState<{ lat: number; lng: number } | null>(null);
  const [center, setCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCenter([pos.coords.latitude, pos.coords.longitude]),
      () => setCenter([49.233, 28.467]) // fallback: Vinnytsia region
    );
  }, []);

  useEffect(() => {
    const s = io(WS_URL, { transports: ['websocket'] });
    setSocket(s);
    s.on('mark.created', (m: Mark) => setMarks((prev) => [...prev, m]));
    s.on('mark.expired', ({ id }: { id: string }) => setMarks((prev) => prev.filter((x) => x.id !== id)));
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/marks`)
      .then((r) => r.json())
      .then((list: Mark[]) => setMarks(list));
  }, []);

  // countdown recompute each second
  useEffect(() => {
    const t = setInterval(() => {
      setMarks((prev) => [...prev]); // trigger re-render
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const onMapClick = (lat: number, lng: number) => setPendingClick({ lat, lng });

  const confirmColor = async (color: MarkColor) => {
    if (!pendingClick) return;
    const res = await fetch(`${API_URL}/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: pendingClick.lat, lng: pendingClick.lng, color })
    });
    const m: Mark = await res.json();
    setPendingClick(null);
    setMarks((prev) => [...prev, m]);
  };

  const cancelDialog = () => setPendingClick(null);

  return (
    <>
      <div className="header">
        <div>Fleeting Marks</div>
        <button
          className="btn"
          onClick={async () => {
            const reg = await navigator.serviceWorker.ready;
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') return;
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY)
            });
            await fetch(`${API_URL}/push/subscribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sub)
            });
            alert('Підписка на пуш‑повідомлення активована.');
          }}
        >
          Увімкнути пуш
        </button>
      </div>

      {center && (
        <MapView center={center} marks={marks} onClick={onMapClick} />
      )}

      <ColorDialog
        open={!!pendingClick}
        onClose={cancelDialog}
        onSelect={confirmColor}
      />
    </>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
