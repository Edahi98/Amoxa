export interface EvidenceItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  capturedAt: string;
  latitude?: number;
  longitude?: number;
  sha256?: string;
  verified?: boolean;
}
