export type MarkColor = 'blue' | 'green' | 'split';

export interface Mark {
  id: string;
  lat: number;
  lng: number;
  color: MarkColor;
  street?: string;
  createdAt: string;   // ISO timestamp
  expiresAt: string;   // ISO timestamp
}

export interface PushSubscriptionRecord {
  id: string; // uuid
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}
