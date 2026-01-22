import React from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerBubble from './MarkerBubble';

type MarkColor = 'blue' | 'green' | 'split';
type Mark = {
  id: string;
  lat: number;
  lng: number;
  color: MarkColor;
  createdAt: string;
  expiresAt: string;
  street?: string;
};

const icon = L.divIcon({ className: '', html: '<div></div>', iconSize: [0, 0] });

export default function MapView({
  center,
  marks,
  onClick
}: {
  center: [number, number];
  marks: Mark[];
  onClick: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer center={center} zoom={14} style={{ height: '100vh', width: '100vw' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCatcher onClick={onClick} />
      {Array.from(new Map(marks.map(m => [m.id, m])).values()).map(m => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={icon}>
          <MarkerBubble color={m.color} createdAt={m.createdAt} expiresAt={m.expiresAt} street={m.street} />
        </Marker>
      ))}
    </MapContainer>
  );
}

function ClickCatcher({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}
