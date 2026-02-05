import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FilterBar } from '../components/ui/filter-bar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { listInventoryBalances, InventoryBalance } from '../data/inventoryApi';
import { listWarehouses, Warehouse } from '../data/warehousesApi';
import { Loader2 } from 'lucide-react';

export default function InventoryBalances() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [showZero, setShowZero] = useState(false);
  
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
       const wRes = await listWarehouses();
       if (wRes.data) setWarehouses(wRes.data);
    }
    loadData();
  }, []);

  useEffect(() => {
     let cancelled = false;
     
     async function loadBalances() {
        setLoading(true);
        const { data } = await listInventoryBalances({
           warehouseId: warehouseFilter,
           search: searchTerm
        });
        
        if (!cancelled && data) {
           setBalances(data);
        }
        setLoading(false);
     }
     
     loadBalances();
     return () => { cancelled = true; };
  }, [warehouseFilter, searchTerm]);

  // Client-side filtering for zero stock (could be server-side if huge)
  const filteredBalances = balances.filter(item => {
     if (!showZero && item.on_hand <= 0) return false;
     return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Inventory Balances</h1>
      </div>

      <FilterBar 
        onSearch={setSearchTerm} 
        searchPlaceholder="Search SKU or Product Name"
      >
        <select 
          className="h-10 rounded-md border border-zinc-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
        >
          <option value="all">All Warehouses</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
        
        <div className="flex items-center gap-2 px-3 h-10 border border-zinc-200 rounded-md bg-white">
          <input 
            type="checkbox" 
            id="showZero"
            checked={showZero} 
            onChange={e => setShowZero(e.target.checked)}
            className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
          />
          <label htmlFor="showZero" className="text-sm text-zinc-700">Show Zero Stock</label>
        </div>
      </FilterBar>

      <div className="rounded-md border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">On Hand</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                 <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-zinc-400" /></div>
                 </TableCell>
              </TableRow>
            ) : filteredBalances.length === 0 ? (
               <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                  {balances.length === 0 ? "No inventory records found." : "No matching records."}
                </TableCell>
              </TableRow>
            ) : (
              filteredBalances.map((item, idx) => (
                <TableRow 
                  key={`${item.sku}-${item.warehouse_id}`} 
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={() => navigate(`/inventory/product/${item.sku}`)}
                >
                  <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                  <TableCell>{item.products?.name || '-'}</TableCell>
                  <TableCell className="text-zinc-500">{item.warehouses?.name || item.warehouse_id}</TableCell>
                  <TableCell className="text-right font-medium">{item.on_hand}</TableCell>
                  <TableCell className="text-right text-zinc-500">0</TableCell>
                  <TableCell className="text-right font-bold text-zinc-900">{item.on_hand}</TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {item.updated_at ? format(new Date(item.updated_at), 'MMM d, HH:mm') : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
