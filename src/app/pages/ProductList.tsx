import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Edit2, Trash2, Eye, ImageIcon, MoreHorizontal } from 'lucide-react';
import { listProducts, deleteProduct, Product } from '../data/productsApi';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { FilterBar } from '../components/ui/filter-bar';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { toast } from 'sonner';

export default function ProductList() {
  const navigate = useNavigate();
  const { canCreate, canEdit, canDelete } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal States
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await listProducts({
      search: searchTerm,
      status: statusFilter,
      limit: 50
    });
    
    if (error) {
      toast.error("Failed to load products");
      console.error(error);
    } else if (data) {
      setProducts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, statusFilter]);

  const handleDelete = async () => {
    if (deleteConfirm) {
      const { error } = await deleteProduct(deleteConfirm);
      if (error) {
         toast.error("Failed to delete product");
      } else {
         toast.success("Product deleted successfully");
         fetchProducts();
      }
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      {!isSupabaseConfigured && (
        <div className="mb-6 rounded-md bg-amber-50 p-4 border border-amber-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Supabase Not Configured</h3>
              <div className="mt-2 text-sm text-amber-700">
                <p>The app is running in demo mode. Please set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to connect to your database.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
      </div>

      <FilterBar 
        onSearch={setSearchTerm} 
        searchPlaceholder="Search SKU or Name"
        onNew={canCreate ? () => navigate('/products/new') : undefined}
        newLabel="New Product"
      >
        <select 
          className="h-10 rounded-md border border-zinc-200 bg-white text-sm px-3 focus:outline-none focus:ring-2 focus:ring-zinc-950"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="draft">Draft</option>
        </select>
      </FilterBar>

      <div className="rounded-md border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">SKU Code</TableHead>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[80px]">UoM</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[120px]">Updated</TableHead>
              <TableHead>Attributes</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-zinc-500">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-zinc-500">
                  No products found.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const imageUrl = product.image_urls?.[0];
                const attributes = product.attributes || {};
                const attrEntries = Object.entries(attributes);

                return (
                  <TableRow key={product.id} className="group">
                    <TableCell className="font-mono text-xs font-medium text-zinc-600">
                      {product.sku_code}
                    </TableCell>
                    <TableCell>
                      <div 
                        className="h-10 w-10 rounded-md bg-zinc-100 border border-zinc-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
                        onClick={() => imageUrl && setPreviewImage(imageUrl)}
                      >
                        {imageUrl ? (
                          <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-zinc-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={product.name}>
                      {product.name}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">{product.uom}</TableCell>
                    <TableCell>
                      <Badge variant={product.status === 'active' ? 'default' : product.status === 'draft' ? 'draft' : 'secondary'}>
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {format(new Date(product.updated_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 cursor-pointer" onClick={() => setDetailsProduct(product)}>
                        {attrEntries.slice(0, 2).map(([key, value], idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                            {key}: {value}
                          </span>
                        ))}
                        {attrEntries.length > 2 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 hover:bg-zinc-200 transition-colors">
                            +{attrEntries.length - 2}
                          </span>
                        )}
                        {attrEntries.length === 0 && <span className="text-xs text-zinc-400 italic">No attributes</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/products/${product.id}/edit`)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirm(product.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Always show View icon if they can't edit? Or row click? The name/attr is clickable for details already. */}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <DialogDescription className="sr-only">Enlarged view of the product image</DialogDescription>
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full h-auto rounded-lg shadow-2xl" />
          )}
        </DialogContent>
      </Dialog>

      {/* Product Details Modal */}
      <Dialog open={!!detailsProduct} onOpenChange={(open) => !open && setDetailsProduct(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription className="sr-only">Detailed information about the product</DialogDescription>
          </DialogHeader>
          {detailsProduct && (
            <div className="grid gap-6 py-4">
              <div className="flex gap-6">
                <div className="h-32 w-32 shrink-0 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center">
                  {detailsProduct.image_urls?.[0] ? (
                    <img src={detailsProduct.image_urls[0]} alt={detailsProduct.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-zinc-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{detailsProduct.name}</h3>
                  <p className="text-sm font-mono text-zinc-500">{detailsProduct.sku_code}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{detailsProduct.uom}</Badge>
                    <Badge variant={detailsProduct.status === 'active' ? 'default' : 'secondary'}>{detailsProduct.status}</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">Updated {format(new Date(detailsProduct.updated_at), 'PPP p')}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Attributes</h4>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  {detailsProduct.attributes && Object.entries(detailsProduct.attributes).map(([key, value], i) => (
                    <div key={i} className="flex justify-between border-b border-zinc-100 pb-1">
                      <span className="text-sm text-zinc-500">{key}</span>
                      <span className="text-sm font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {detailsProduct.detail && (
                <div>
                   <h4 className="text-sm font-semibold mb-2">Description</h4>
                   <p className="text-sm text-zinc-600 bg-zinc-50 p-3 rounded-md whitespace-pre-wrap">{detailsProduct.detail}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription className="text-zinc-600 pt-2">
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Product</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
