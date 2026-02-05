import React, { createContext, useContext, useState, useEffect } from 'react';
import { format } from 'date-fns';

// --- Types ---

export type ProductStatus = 'active' | 'inactive' | 'draft' | 'archived';
export type DocStatus = 'draft' | 'posted';
export type DocType = 'receipt' | 'shipment' | 'adjustment' | 'count';

export interface Attribute {
  key: string;
  value: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  uom: string;
  status: ProductStatus;
  category: string;
  image: string;
  updatedAt: string;
  attributes: Attribute[];
  price?: number;
  cost?: number;
  tags?: string[];
  vendor?: string;
  barcode?: string;
  weight?: string;
  dimensions?: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'disabled';
}

export interface InventoryItem {
  sku: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  sku: string;
  warehouseId: string;
  timestamp: string;
  type: DocType;
  docId: string;
  delta: number;
  onHandAfter: number;
  reason?: string;
  user: string;
}

export interface DocLine {
  id: string;
  sku: string;
  qty: number;
  note?: string;
}

export interface Document {
  id: string;
  type: DocType;
  warehouseId: string;
  status: DocStatus;
  lines: DocLine[];
  createdAt: string;
  postedAt?: string;
  note?: string;
  reference?: string;
}

// --- Initial Data ---

const MOCK_WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', code: 'MAIN', name: 'Main Distribution Center', status: 'active' },
  { id: 'wh-2', code: 'EAST', name: 'East Coast Hub', status: 'active' },
  { id: 'wh-3', code: 'WEST', name: 'West Coast Hub', status: 'active' },
];

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    sku: 'WID-IND-001',
    name: 'Industrial Widget A (Heavy Duty)',
    description: 'Standard industrial widget for heavy machinery.',
    uom: 'EA',
    status: 'active',
    category: 'Components',
    image: 'https://images.unsplash.com/photo-1758873263428-f4b2edb45fe1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    updatedAt: new Date().toISOString(),
    attributes: [
      { key: 'Material', value: 'Steel' },
      { key: 'Grade', value: '304' },
      { key: 'Finish', value: 'Matte' }
    ],
    tags: ['heavy', 'metal'],
    weight: '2.5kg'
  },
  {
    id: 'p-2',
    sku: 'BOLT-SET-PREM',
    name: 'Premium Bolt Set (50pcs)',
    description: 'High tensile strength bolt set.',
    uom: 'SET',
    status: 'active',
    category: 'Hardware',
    image: 'https://images.unsplash.com/photo-1625773084965-5ccf71e1df51?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    attributes: [
      { key: 'Count', value: '50' },
      { key: 'Thread', value: 'M8' }
    ],
    tags: ['fasteners']
  },
  {
    id: 'p-3',
    sku: 'PKG-TAPE-BRN',
    name: 'Packaging Tape 50m (Brown)',
    description: 'Standard adhesive tape for boxes.',
    uom: 'ROLL',
    status: 'active',
    category: 'Packaging',
    image: 'https://images.unsplash.com/photo-1570615541379-e6b7ab6d4eb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    attributes: [
      { key: 'Length', value: '50m' },
      { key: 'Width', value: '48mm' }
    ],
    tags: ['supplies']
  },
  {
    id: 'p-4',
    sku: 'GLOVE-SAFE-M',
    name: 'Safety Gloves (Medium)',
    description: 'Cut-resistant work gloves.',
    uom: 'PAIR',
    status: 'active',
    category: 'Safety',
    image: 'https://images.unsplash.com/photo-1625562888409-14b30c2b17b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    attributes: [
      { key: 'Size', value: 'M' },
      { key: 'Level', value: '5' }
    ],
    tags: ['ppe']
  },
  {
    id: 'p-5',
    sku: 'GOGGLE-STD',
    name: 'Safety Goggles Standard',
    description: 'Anti-fog safety eyewear.',
    uom: 'EA',
    status: 'inactive',
    category: 'Safety',
    image: 'https://images.unsplash.com/photo-1489348557694-c552c1eee72d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
    updatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    attributes: [
      { key: 'Lens', value: 'Clear' }
    ],
    tags: ['ppe']
  },
   {
    id: 'p-6',
    sku: 'CLEAN-FLUID-5L',
    name: 'Industrial Cleaner 5L',
    description: 'Heavy duty degreaser.',
    uom: 'UNIT',
    status: 'active',
    category: 'Janitorial',
    image: '', // No image test
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    attributes: [
      { key: 'Volume', value: '5L' },
      { key: 'Ph', value: 'Alkaline' }
    ],
    tags: ['chemical']
  }
];

// Generate initial inventory
const generateInventory = (products: Product[], warehouses: Warehouse[]) => {
  const inv: InventoryItem[] = [];
  products.forEach(p => {
    warehouses.forEach(w => {
      // Random stock
      const qty = Math.floor(Math.random() * 500);
      inv.push({
        sku: p.sku,
        warehouseId: w.id,
        onHand: qty,
        reserved: 0,
        available: qty,
        updatedAt: new Date().toISOString()
      });
    });
  });
  return inv;
};

// --- Context ---

interface StoreContextType {
  products: Product[];
  warehouses: Warehouse[];
  inventory: InventoryItem[];
  ledger: LedgerEntry[];
  documents: Document[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addWarehouse: (warehouse: Warehouse) => void;
  addDocument: (doc: Document) => void;
  postDocument: (docId: string) => void;
  getInventory: (sku: string, warehouseId?: string) => InventoryItem | undefined;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [warehouses, setWarehouses] = useState<Warehouse[]>(MOCK_WAREHOUSES);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Init inventory once
  useEffect(() => {
    if (inventory.length === 0) {
      setInventory(generateInventory(products, warehouses));
    }
  }, []);

  const addProduct = (product: Product) => {
    setProducts(prev => [product, ...prev]);
    // Init inventory for new product
    const newInv = warehouses.map(w => ({
      sku: product.sku,
      warehouseId: w.id,
      onHand: 0,
      reserved: 0,
      available: 0,
      updatedAt: new Date().toISOString()
    }));
    setInventory(prev => [...prev, ...newInv]);
  };

  const updateProduct = (updated: Product) => {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addWarehouse = (wh: Warehouse) => {
    setWarehouses(prev => [...prev, wh]);
  };

  const addDocument = (doc: Document) => {
    setDocuments(prev => [doc, ...prev]);
  };

  const postDocument = (docId: string) => {
    const docIndex = documents.findIndex(d => d.id === docId);
    if (docIndex === -1) return;
    const doc = documents[docIndex];
    if (doc.status === 'posted') return;

    // Apply changes
    const timestamp = new Date().toISOString();
    const newLedgerEntries: LedgerEntry[] = [];
    const newInventory = [...inventory];

    doc.lines.forEach(line => {
      let delta = 0;
      if (doc.type === 'receipt') delta = line.qty;
      else if (doc.type === 'shipment') delta = -line.qty;
      else if (doc.type === 'adjustment') delta = line.qty; // Assume signed qty in line for adjustment, or just simplistic
      else if (doc.type === 'count') {
         // Complex: Count replaces stock. Logic: Delta = New - Old. 
         // For simplicity, let's assume 'adjustment' is additive and 'count' is handled by calculation
         // but here we will simplify: Adjustment adds/subtracts. 
      }

      // Find inventory record
      let invIdx = newInventory.findIndex(i => i.sku === line.sku && i.warehouseId === doc.warehouseId);
      
      // If not found (should not happen if init correctly), create it
      if (invIdx === -1) {
        newInventory.push({
          sku: line.sku,
          warehouseId: doc.warehouseId,
          onHand: 0,
          reserved: 0,
          available: 0,
          updatedAt: timestamp
        });
        invIdx = newInventory.length - 1;
      }

      const currentOnHand = newInventory[invIdx].onHand;
      
      // Handle Count Logic
      if (doc.type === 'count') {
        delta = line.qty - currentOnHand;
      }

      const newOnHand = currentOnHand + delta;

      // Update Inventory
      newInventory[invIdx] = {
        ...newInventory[invIdx],
        onHand: newOnHand,
        available: newOnHand - newInventory[invIdx].reserved, // Simple logic
        updatedAt: timestamp
      };

      // Add Ledger
      newLedgerEntries.push({
        id: Math.random().toString(36).substr(2, 9),
        sku: line.sku,
        warehouseId: doc.warehouseId,
        timestamp,
        type: doc.type,
        docId: doc.id,
        delta,
        onHandAfter: newOnHand,
        reason: doc.note || doc.type,
        user: 'Admin'
      });
    });

    // Update State
    setInventory(newInventory);
    setLedger(prev => [...newLedgerEntries, ...prev]); // Newest first
    
    // Update Document Status
    const updatedDoc = { ...doc, status: 'posted' as DocStatus, postedAt: timestamp };
    const newDocs = [...documents];
    newDocs[docIndex] = updatedDoc;
    setDocuments(newDocs);
  };

  const getInventory = (sku: string, warehouseId?: string) => {
    if (warehouseId) {
      return inventory.find(i => i.sku === sku && i.warehouseId === warehouseId);
    }
    // Aggregate? For now return undefined if no WH
    return undefined;
  };

  return (
    <StoreContext.Provider value={{
      products, warehouses, inventory, ledger, documents,
      addProduct, updateProduct, deleteProduct, addWarehouse, addDocument, postDocument, getInventory
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
