import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { FilterBar } from "../components/ui/filter-bar";
import { 
  listDocuments, 
  Document, 
  DocType,
  DocStatus
} from "../data/documentsApi";
import { listWarehouses, Warehouse } from "../data/warehousesApi";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "../components/ui/pagination";

export default function DocumentList() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine type from URL or default
  const currentType = (location.pathname.split("/").pop()?.replace(/s$/, "") ??
    "receipt") as DocType;
  const displayType: DocType = (["receipt", "shipment", "adjustment", "count"] as const).includes(
    currentType as any
  )
    ? (currentType as DocType)
    : "receipt";

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { canCreate } = useAuth();

  const handleTabChange = (val: string) => {
    navigate(`/documents/${val}s`); // pluralize for url
  };

  // Load warehouses once
  useEffect(() => {
    (async () => {
      const { data, error } = await listWarehouses();
      if (error) {
        console.error("load warehouses error", error);
        setErrorMsg("Failed to load warehouses");
      } else {
        setWarehouses(data || []);
      }
    })();
  }, []);

  // Load documents
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error, count } = await listDocuments({
         type: displayType,
         status: statusFilter === 'all' ? undefined : statusFilter as DocStatus,
         warehouseId: warehouseFilter === 'all' ? undefined : warehouseFilter,
         search: searchTerm,
         limit: itemsPerPage,
         offset: (currentPage - 1) * itemsPerPage,
      });

      if (cancelled) return;

      if (error) {
        console.error("load documents error", error);
        setDocuments([]);
        setTotalCount(0);
        setErrorMsg("Failed to load documents");
      } else {
        setDocuments(data || []);
        setTotalCount(count ?? 0);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [displayType, statusFilter, warehouseFilter, searchTerm, currentPage, itemsPerPage]);

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
        <h1 className="text-2xl font-bold tracking-tight capitalize">
          {displayType}s
        </h1>
      </div>

      <div className="mb-6">
        <div className="grid w-full grid-cols-4 max-w-[500px] bg-zinc-100 p-1 rounded-lg">
          {["receipt", "shipment", "adjustment", "count"].map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`
                rounded-md px-3 py-1.5 text-sm font-medium transition-all capitalize
                ${
                  displayType === (t as DocType)
                    ? "bg-white shadow-sm text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-700"
                }
              `}
            >
              {t}s
            </button>
          ))}
        </div>
      </div>

      <FilterBar
        onSearch={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search Document ID"
        onNew={canCreate ? () => navigate(`/documents/${displayType}s/new`) : undefined}
        newLabel={`New ${displayType.charAt(0).toUpperCase() + displayType.slice(1)}`}
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
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        <select
          className="h-10 rounded-md border border-zinc-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="posted">Posted</option>
        </select>
      </FilterBar>

      {errorMsg && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="rounded-md border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doc No</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Posted</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                   <div className="flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-zinc-400" /></div>
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
               <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                  No documents found.
                </TableCell>
              </TableRow>
            ) : (
               documents.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={() => navigate(`/documents/${doc.type}s/${doc.id}`)}
                >
                  <TableCell className="font-mono font-medium text-xs">{doc.id.split('-')[0]}...</TableCell>
                  <TableCell>{doc.warehouses?.name || doc.warehouse_id}</TableCell>
                  <TableCell>
                    <Badge variant={doc.status === "posted" ? "success" : "draft"}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {format(new Date(doc.created_at), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {doc.posted_at ? format(new Date(doc.posted_at), "MMM d, HH:mm") : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500 max-w-[200px] truncate">
                    {doc.note || "-"}
                  </TableCell>
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
