export interface Bin {
  id: string;
  label: string;
  location: string;
  qrCode: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  quantity: number;
  minQuantity?: number | null;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BinItem {
  binId: string;
  itemId: string;
  quantity: number;
  addedAt: Date;
  notes?: string | null;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  path: string[];
} 