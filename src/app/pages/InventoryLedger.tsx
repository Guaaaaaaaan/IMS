import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FilterBar } from '../components/ui/filter-bar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { listLedger, LedgerEntry } from '../data/inventoryApi';
import { listWarehouses, Warehouse } from '../data/warehousesApi';
import { Loader2 } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '../components/ui/pagination';

export default function InventoryLedger() {
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Dependencies
  useEffect(() => {
    async function loadData() {
       const wRes = await listWarehouses();
       if (wRes.data) setWarehouses(wRes.data);
    }
    loadData();
  }, []);

  // Load Ledger
  useEffect(() => {
     let cancelled = false;
     
     async function loadLedger() {
        setLoading(true);
        // "search" term usage depends on backend capabilities. 
        // listLedger currently supports 'sku' filter.
        // We'll treat search term as SKU filter for now.
        const { data, count } = await listLedger({
           warehouseId: warehouseFilter === 'all' ? undefined : warehouseFilter,
           sku: searchTerm || undefined,
           limit: itemsPerPage,
           offset: (currentPage - 1) * itemsPerPage,
        });
        
        if (!cancelled && data) {
           setLedger(data);
           setTotalCount(count ?? 0);
        }
        setLoading(false);
     }
     
     // Debounce could be good, but direct for now
     loadLedger();
     return () => { cancelled = true; };
  }, [warehouseFilter, searchTerm, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / itemsPerPage));
  const canPrevious = currentPage > 1;
  const canNext = currentPage < totalPages;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Inventory Ledger</h1>
      </div>

      <FilterBar 
        onSearch={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }} 
        searchPlaceholder="Search SKU"
      >
        <select 
          className="h-10 rounded-md border border-zinc-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          value={warehouseFilter}
          onChange={(e) => {
            setWarehouseFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">All Warehouses</option>
          {warehouses.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </FilterBar>

      <div className="rounded-md border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead>Doc No</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                 <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-zinc-400" /></div>
                 </TableCell>
              </TableRow>
            ) : ledger.length === 0 ? (
               <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                  No ledger entries found.
                </TableCell>
              </TableRow>
            ) : (
              ledger.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-zinc-500 whitespace-nowrap">
                    {format(new Date(entry.created_at), 'MMM d, HH:mm:ss')}
                  </TableCell>
                  <TableCell className="font-mono font-medium">{entry.sku}</TableCell>
                  <TableCell className="text-sm">{entry.warehouses?.name || entry.warehouse_id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-[10px]">{entry.doc_type}</Badge>
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-bold",
                    entry.delta > 0 ? "text-green-600" : entry.delta < 0 ? "text-red-600" : "text-zinc-500"
                  )}>
                    {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                  </TableCell>
                  <TableCell className="text-sm font-mono text-zinc-600">{entry.doc_id.split('-')[0]}...</TableCell>
                  <TableCell className="text-sm text-zinc-500 max-w-[200px] truncate">{entry.description || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <span>Items per page</span>
          <select
            className="h-9 rounded-md border border-zinc-200 bg-white text-sm px-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-950"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600">Page {currentPage} of {totalPages}</span>
          <Pagination className="w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className={!canPrevious ? "pointer-events-none opacity-50" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (canPrevious) setCurrentPage((p) => p - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className={!canNext ? "pointer-events-none opacity-50" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (canNext) setCurrentPage((p) => p + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
