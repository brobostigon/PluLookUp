export type PLUCategory = 'Produce' | 'Bakery' | 'Nuts' | 'Other';

export interface PLUItem {
  id: string;
  plu: string;
  name: string;
  category: PLUCategory;
  visualDescription: string;
  imageUrl?: string; // Reference photo to help identify scanned items
  price?: number; // Price in currency units
  priceUnit?: 'kg' | 'unit'; // per kg or per unit
  barcode?: string;
  notes?: string;
  updatedAt: string;
  active: boolean;
}

export interface CandidateMatch {
  plu: string;
  itemName: string;
  category: PLUCategory;
  confidence: number;
  reason: string;
  imageUrl?: string;
}

export interface LookupResult {
  matched: boolean;
  plu: string;
  itemName: string;
  category: PLUCategory;
  confidence: number;
  visualCues: string;
  ripeness?: string; // Freshness & ripeness indicator (e.g. Ready to eat, Fresh, Firm)
  referenceImage?: string; // Reference image from the store database for visual comparison
  alternatives: CandidateMatch[];
  inferenceTimeMs?: number;
  isCached?: boolean;
  modelUsed?: string;
  speedMode?: 'turbo' | 'balanced';
  timing?: {
    clientPrepMs?: number;
    networkMs?: number;
    inferenceMs?: number;
    totalMs?: number;
    payloadKb?: number;
  };
}

export interface AdminSession {
  email: string;
  token: string;
  verifiedAt: string;
  expiresAt: string;
}

export type SyncEventType = 'initial' | 'create' | 'update' | 'delete' | 'reset';

export interface SyncMessage {
  type: SyncEventType;
  item?: PLUItem;
  items?: PLUItem[];
  timestamp: string;
  count: number;
  message?: string;
  author?: string;
}

export interface ScannedRecord {
  id: string;
  plu: string;
  name: string;
  category: PLUCategory;
  timestamp: string;
  confidence: number;
  imageThumbnail?: string;
  referenceImage?: string;
  quantity: number;
  weightKg?: number;
  price?: number;
  priceUnit?: 'kg' | 'unit';
}
