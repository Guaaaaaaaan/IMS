import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { ArrowLeft, Plus, Trash2, Save, CheckCircle, Loader2 } from 'lucide-react';
import { 
  Document, 
  DocType, 
  createDocument, 
  getDocument, 
  updateDocument, 
  postDocument as apiPostDocument,
  DocumentLine
} from '../data/documentsApi';
import { listWarehouses, Warehouse } from '../data/warehousesApi';
import { listProducts, Product } from '../data/productsApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { StickySaveBar } from '../components/ui/sticky-save-bar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

interface DocumentFormData {
  id?: string;
  type: DocType;
  warehouse_id: string;
  status: string;
  note?: string;
  lines: {
    sku: string;
    qty: number;
    note?: string;
  }[];
}

export default function DocumentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { canEdit, canCreate } = useAuth();
  
  // Data State
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Determine type
  const pathType = location.pathname.split('/')[2]?.replace(/s$/, '') as DocType; // receipts -> receipt
  const isNew = !id;

  const { register, control, handleSubmit, reset, watch, setValue, formState: { isDirty, isSubmitting } } = useForm<DocumentFormData>({
    defaultValues: {
      type: pathType,
      status: 'draft',
      warehouse_id: '',
      note: '',
      lines: [{ sku: '', qty: 1, note: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lines"
  });

  // Load Dependencies
  useEffect(() => {
    async function loadDeps() {
      try {
        const [wRes, pRes] = await Promise.all([
          listWarehouses(),
          listProducts({ limit: 1000, status: 'active' }) // Fetch active products
        ]);
        setWarehouses(wRes.data || []);
        setProducts(pRes.data || []);

        if (wRes.data && wRes.data.length > 0) {
           // Set default warehouse if new
           if (isNew) {
             setValue('warehouse_id', wRes.data[0].id);
           }
        }
      } catch (e) {
        console.error("Failed to load dependencies", e);
      }
    }
    loadDeps();
  }, [isNew, setValue]);

  // Load Document
  useEffect(() => {
    async function loadDoc() {
      if (!isNew && id) {
        setLoading(true);
        const { data, error } = await getDocument(id);
        if (error || !data) {
          toast.error("Document not found");
          navigate(`/documents/${pathType}s`);
        } else {
          setDoc(data);
          reset({
            id: data.id,
            type: data.type,
            warehouse_id: data.warehouse_id,
            status: data.status,
            note: data.note || '',
            lines: data.lines?.map(l => ({
              sku: l.sku,
              qty: l.qty,
              note: l.note || ''
            })) || []
          });
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    }
    loadDoc();
  }, [id, isNew, navigate, pathType, reset]);

  const docType = doc?.type || pathType || 'receipt';
  const isPosted = doc?.status === 'posted';

  const onSubmit = async (data: DocumentFormData) => {
    try {
      if (isNew) {
        const { data: newDoc, error } = await createDocument(
          {
            type: docType,
            warehouse_id: data.warehouse_id,
            status: 'draft',
            note: data.note
          },
          data.lines
        );

        if (error) {
             console.error("Create error details:", error);
             throw error;
        }
        
        toast.success("Draft saved");
        navigate(`/documents/${docType}s/${newDoc?.id}`);
      } else if (id) {
        // Only update header for now
        const { error } = await updateDocument(id, {
          warehouse_id: data.warehouse_id,
          note: data.note
        });

        if (error) throw error;
        toast.success("Document updated (Header only)");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to save document");
    }
  };

  const handlePost = async () => {
    if (!id || !doc) return;
    
    let confirmMsg = "Posting will permanently update inventory levels. Continue?";
    if (docType === 'count') {
        confirmMsg = "Posting a COUNT will overwrite inventory on-hand quantities with these values. Continue?";
    }
    
    if (!window.confirm(confirmMsg)) return;

    try {
       const { error } = await apiPostDocument(id);
       if (error) {
           console.error("Post error", error);
           throw new Error(typeof error === 'string' ? error : error.message);
       }
       
       toast.success("Document Posted successfully");
       // Reload
       window.location.reload();
    } catch (e: any) {
       console.error(e);
       toast.error(e.message || "Failed to post document");
    }
  };

  const getProduct = (sku: string) => products.find(p => p.sku_code === sku);

  // Dynamic Text
  const getQtyLabel = () => {
      switch (docType) {
          case 'count': return 'Counted Qty';
          case 'receipt': return 'Qty Received';
          case 'shipment': return 'Qty Shipped';
          case 'adjustment': return 'Adjustment Qty';
          default: return 'Quantity';
      }
  }

  if (loading) {
     return <div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-zinc-300" /></div>;
  }

  return (
    <div className="pb-24 relative">
      {!isPosted && (
         <StickySaveBar 
           show={isDirty || isNew} 
           onSave={handleSubmit(onSubmit)} 
           onDiscard={() => navigate(-1)}
           isLoading={isSubmitting} 
         />
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/documents/${docType}s`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-2xl font-bold tracking-tight capitalize">
                  {isNew ? `New ${docType}` : `${docType} ${doc?.id?.split('-')[0]}...`}
               </h1>
               {!isNew && (
                  <Badge variant={isPosted ? 'success' : 'draft'}>{doc?.status}</Badge>
               )}
            </div>
            {!isNew && doc && (
               <p className="text-sm text-zinc-500 mt-1">
                 Created {format(new Date(doc.created_at), 'PP p')}
                 {doc.posted_at && ` • Posted ${format(new Date(doc.posted_at), 'PP p')}`}
               </p>
            )}
          </div>
        </div>

        {!isNew && !isPosted && canEdit && (
           <Button onClick={handlePost} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="mr-2 h-4 w-4" />
              Post Document
           </Button>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="text-sm font-medium mb-1.5 block">Warehouse</label>
                  <Controller
                    name="warehouse_id"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                      <select 
                         {...field} 
                         disabled={isPosted}
                         className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 disabled:bg-zinc-100 disabled:opacity-70"
                      >
                        <option value="">Select Warehouse</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    )}
                  />
               </div>
               <div>
                  <label className="text-sm font-medium mb-1.5 block">Note</label>
                  <Input {...register("note")} placeholder="Optional note..." disabled={isPosted} />
               </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items</CardTitle>
            {!isPosted && (
                <Button size="sm" variant="outline" onClick={() => append({ sku: '', qty: 1 })}>
                   <Plus className="h-4 w-4 mr-2" />
                   Add Line
                </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead className="w-[300px]">Product</TableHead>
                   <TableHead className="w-[120px]">{getQtyLabel()}</TableHead>
                   <TableHead>Note</TableHead>
                   {!isPosted && <TableHead className="w-[50px]"></TableHead>}
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {fields.map((field, index) => (
                   <TableRow key={field.id}>
                     <TableCell>
                        {isPosted ? (
                           <div className="flex items-center gap-3">
                              {(() => {
                                 const p = getProduct(watch(`lines.${index}.sku`));
                                 return p ? (
                                    <>
                                       <div className="h-8 w-8 rounded bg-zinc-100 border border-zinc-200 overflow-hidden">
                                          {p.image_urls && p.image_urls[0] && <img src={p.image_urls[0]} className="h-full w-full object-cover" />}
                                       </div>
                                       <div>
                                          <div className="font-medium text-sm">{p.name}</div>
                                          <div className="text-xs text-zinc-500 font-mono">{p.sku_code}</div>
                                       </div>
                                    </>
                                 ) : <span className="font-mono">{watch(`lines.${index}.sku`)}</span>
                              })()}
                           </div>
                        ) : (
                           <select 
                             {...register(`lines.${index}.sku`, { required: true })}
                             className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950"
                           >
                             <option value="">Select Product...</option>
                             {products.map(p => (
                               <option key={p.id} value={p.sku_code}>{p.sku_code} - {p.name}</option>
                             ))}
                           </select>
                        )}
                     </TableCell>
                     <TableCell>
                        <Input 
                           type="number" 
                           {...register(`lines.${index}.qty`, { 
                               valueAsNumber: true, 
                               // Only enforce min=1 for Receipts/Shipments. Adjustments can be negative.
                               min: docType === 'adjustment' ? undefined : 0 
                           })} 
                           disabled={isPosted}
                        />
                     </TableCell>
                     <TableCell>
                        <Input {...register(`lines.${index}.note`)} disabled={isPosted} placeholder="Line note" />
                     </TableCell>
                     {!isPosted && (
                        <TableCell>
                           <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                              <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
                           </Button>
                        </TableCell>
                     )}
                   </TableRow>
                 ))}
                 {fields.length === 0 && (
                    <TableRow>
                       <TableCell colSpan={4} className="text-center h-24 text-zinc-500">No items added.</TableCell>
                    </TableRow>
                 )}
               </TableBody>
             </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
