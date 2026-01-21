export type MarkColor = 'blue' | 'green' | 'split';
export interface Mark {
  id: string;
  lat: number;
  lng: number;
  color: MarkColor;
  street?: string;
  createdAt: string;
  expiresAt: string;
}
