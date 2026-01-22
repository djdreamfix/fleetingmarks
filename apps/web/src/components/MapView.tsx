import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MarkColor = "blue" | "green" | "split";
type Mark = {
  id: string;
  lat: number;
  lng: number;
  color: MarkColor;
  createdAt: string;
  expiresAt: string;
  street?: string;
};

function minutesLeft(expiresAtISO: string, nowMs: number) {
  const ms = new Date(expiresAtISO).getTime() - nowMs;
  return Math.max(0, Math.ceil(ms / 60000));
}

function bubbleClass(color: MarkColor, mins: number) {
  const warn = mins <= 5 && mins > 0;
  const expired = mins <= 0;
  return [
    "fm-bubble",
    `fm-bubble--${color}`,
    warn ? "fm-bubble--warn" : "",
    expired ? "fm-bubble--expired" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildBubbleIcon(color: MarkColor, mins: number) {
  const html = `
    <div class="${bubbleClass(color, mins)}" aria-label="Мітка, лишилось ${mins} хвилин">
      <div class="fm-bubble__ring"></div>
      <div class="fm-bubble__inner">
        <span class="fm-bubble__num">${mins}</span>
        <span class="fm-bubble__unit">хв</span>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "fm-marker",
    html,
    iconSize: [44, 44],
    iconAnchor: [22, 22], // центр
  });
}

export default function MapView({
  center,
  marks,
  onClick,
}: {
  center: [number, number];
  marks: Mark[];
  onClick: (lat: number, lng: number) => void;
}) {
  // Production-поведінка: оновлюємо тільки цифри раз на 10с (достатньо і не “жере” батарею)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  // dedupe по id (щоб не було дублювань у DOM)
  const uniqMarks = useMemo(() => {
    const m = new Map<string, Mark>();
    for (const x of marks) m.set(x.id, x);
    return Array.from(m.values());
  }, [marks]);

  return (
    <MapContainer center={center} zoom={14} style={{ height: "100vh", width: "100vw" }}>
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickCatcher onClick={onClick} />

      {uniqMarks.map((m) => {
        const mins = minutesLeft(m.expiresAt, now);
        const icon = buildBubbleIcon(m.color, mins);

        return (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={icon}>
            <Popup>
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Мітка</div>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ opacity: 0.75 }}>Локація:</span>{" "}
                  {m.street ? m.street : `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}`}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ opacity: 0.75 }}>Лишилось:</span> {mins} хв
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  Створено: {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

function ClickCatcher({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}
