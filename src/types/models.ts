// User profile stored in Firestore > users/{uid}
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role?: 'USER' | 'ADMIN'; // Phân quyền người dùng
  photoURL?: string;
  phone?: string;
  address?: string;
  ecoPoints: number;
  totalRecycled: number; // kg
  createdAt: Date;
  updatedAt: Date;
}

// QR Code
export interface QRCode {
  id: string;
  batchId: string;
  businessName: string;
  pointsValue: number;
  status: 'ACTIVE' | 'CONSUMED' | 'EXPIRED';
  consumedAt?: Date;
}

// Transaction
export interface Transaction {
  id: string;
  userId: string;
  type: 'EARN' | 'REDEEM' | 'ORDER';
  amount: number;
  kg?: number;
  description: string;
  qrId?: string;
  rewardId?: string;
  requestId?: string;
  status?: 'PROCESSING' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  createdAt: Date;
  expireAt?: Date;
  approvedAt?: Date;
}

// Collection Point
export interface CollectionPoint {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  hours: string;
  phone?: string;
  acceptedTypes: WasteType[];
  isOpen: boolean;
}

// Waste Types
export type WasteType = 'plastic' | 'paper' | 'glass' | 'metal' | 'electronics' | 'organic';

// Reward / Voucher
export interface Reward {
  id: string;
  title: string;
  description: string;
  brand: string;
  imageUrl?: string;
  pointsRequired: number;
  value: string; // e.g. "50.000 VND"
  category: 'food' | 'transport' | 'shopping' | 'entertainment';
  expiresAt: Date;
  quantity: number;
  isActive: boolean;
}

// Collection Request
export interface CollectionRequest {
  id: string;
  userId: string;
  address: string;
  scheduledAt: Date;
  wasteTypes: WasteType[];
  estimatedWeight: number;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: Date;
}
