import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Warehouse, listWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../data/warehousesApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, X, Edit2, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function WarehouseList() {
  const { canCreate, canEdit, canDelete } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<{ name: string; code: string }>();

  // Watch name field for auto-generation
  const nameValue = watch('name');

  useEffect(() => {
    loadWarehouses();
  }, []);

  // Auto-generate code if not editing and name changes
  useEffect(() => {
    if (!editingId && nameValue) {
      const generatedCode = nameValue
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('code', generatedCode);
    }
  }, [nameValue, editingId, setValue]);

  const loadWarehouses = async () => {
    setLoading(true);
    const { data, error } = await listWarehouses();
    if (error) {
      toast.error("Failed to load warehouses");
      console.error(error);
    } else {
      setWarehouses(data || []);
    }
    setLoading(false);
  };

  const onSubmit = async (data: { name: string; code: string }) => {
    if (editingId) {
       // For update, we might want to allow code updates too? API supports it.
       const { error } = await updateWarehouse(editingId, data.name, data.code);
       if (error) {
          console.error('updateWarehouse error', error);
          toast.error(`Failed to update warehouse: ${error.message}`);
       } else {
          toast.success("Warehouse updated");
          loadWarehouses();
          closeDrawer();
       }
    } else {
       const { error } = await createWarehouse(data.name, data.code);
       if (error) {
          console.error('createWarehouse error', error);
          toast.error(`Failed to create warehouse: ${error.message}`);
       } else {
          toast.success("Warehouse created");
          loadWarehouses();
          closeDrawer();
       }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    const { error } = await deleteWarehouse(id);
    if (error) {
      console.error('deleteWarehouse error', error);
      toast.error(`Failed to delete warehouse: ${error.message}`);
    } else {
      toast.success("Warehouse deleted");
      loadWarehouses();
    }
  };

  const openDrawer = (wh?: Warehouse) => {
    if (wh) {
      setEditingId(wh.id);
      setValue('name', wh.name);
      setValue('code', wh.code);
    } else {
      setEditingId(null);
      reset();
    }
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    reset();
    setEditingId(null);
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Warehouses</h1>
        {canCreate && (
          <Button onClick={() => openDrawer()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Warehouse
          </Button>
        )}
      </div>

      <div className="rounded-md border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <div className="flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-zinc-400" /></div>
                </TableCell>
              </TableRow>
            ) : warehouses.length === 0 ? (
               <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                  No warehouses found.
                </TableCell>
              </TableRow>
            ) : (
              warehouses.map((wh) => (
                <TableRow key={wh.id}>
                  <TableCell className="font-mono text-xs font-medium">{wh.code}</TableCell>
                  <TableCell className="font-medium">{wh.name}</TableCell>
                  <TableCell>
                    <Badge variant={wh.status === 'active' ? 'success' : 'outline'}>
                      {wh.status || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {canEdit && (
                      <Button variant="ghost" size="icon" onClick={() => openDrawer(wh)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && (
                       <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(wh.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-in-out transform",
        isDrawerOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
            <h2 className="text-lg font-semibold">{editingId ? 'Edit Warehouse' : 'New Warehouse'}</h2>
            <Button variant="ghost" size="icon" onClick={closeDrawer}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto">
            <form id="wh-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Warehouse Name *</label>
                <Input 
                  {...register("name", { required: "Name is required" })} 
                  placeholder="e.g. New York Hub" 
                />
                {errors.name && <span className="text-red-500 text-xs">{errors.name.message}</span>}
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Warehouse Code *</label>
                <Input 
                  {...register("code", { required: "Code is required" })} 
                  placeholder="e.g. NEW-YORK-HUB" 
                />
                <p className="text-xs text-zinc-400 mt-1">
                  {editingId ? "Edit code manually." : "Auto-generated from name."}
                </p>
                {errors.code && <span className="text-red-500 text-xs">{errors.code.message}</span>}
              </div>
            </form>
          </div>

          <div className="p-6 border-t border-zinc-200 bg-zinc-50">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closeDrawer}>Cancel</Button>
              <Button type="submit" form="wh-form" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (editingId ? 'Update' : 'Create')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
