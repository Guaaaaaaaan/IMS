import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getProduct, listProducts, Product } from '../data/productsApi';
import { listInventoryBalances, listLedger, InventoryBalance, LedgerEntry } from '../data/inventoryApi';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ArrowLeft, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs';

export default function SKUDetail() {
  const { id } = useParams(); // Note: This might be ID or SKU depending on route. Let's assume ID first, or SKU. 
  // Previous code used ID to fetch product, but then used product.sku_code for inventory.
  // Ideally route is /product/:id. 
  
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [inventory, setInventory] = useState<InventoryBalance[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
       if (!id) {
          setError("Product not found");
          setLoading(false);
          return;
       }
       setLoading(true);
       
       try {
          // 1. Fetch Product (try by ID, if fail try by SKU)
          let fetchedProduct: Product | null = null;
          
          // Simple heuristic for UUID
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          
          if (isUuid) {
             const { data, error } = await getProduct(id);
             if (error) throw error;
             fetchedProduct = data;
          } else {
             const { data, error } = await listProducts({ search: id });
             if (error) throw error;
             fetchedProduct = data?.find(p => p.sku_code === id) || data?.[0] || null;
          }

          if (!fetchedProduct) {
             setError("Product not found");
             return;
          }

          setProduct(fetchedProduct);
          
          // 2. Fetch Inventory & Ledger using SKU
          const sku = fetchedProduct.sku_code;
          
          const [invRes, ledRes] = await Promise.all([
             listInventoryBalances({ search: sku }),
             listLedger({ sku: sku })
          ]);
          
          // Filter strictly for SKU in case search was fuzzy
          const strictInv = (invRes.data || []).filter(i => i.sku === sku);
          const strictLedger = (ledRes.data || []).filter(l => l.sku === sku);
          
          setInventory(strictInv);
          setLedger(strictLedger);
       } catch (e: any) {
          console.error(e);
          setError(e?.message || "Failed to load product");
       } finally {
          setLoading(false);
       }
    }
    
    loadData();
  }, [id]);

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-zinc-300" /></div>;
  if (error || !product) return <div className="p-10 text-center text-red-500">{error || "Product not found"}</div>;

  const totalOnHand = inventory.reduce((sum, item) => sum + item.on_hand, 0);
  const totalAvailable = totalOnHand; // Simpler logic for now

  const imageUrl = product.image_urls?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
           <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
             <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>{product.status}</Badge>
           </div>
           <p className="text-zinc-500 font-mono mt-1">{product.sku_code} • {product.uom}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                     <div className="text-sm font-medium text-zinc-500">Total On Hand</div>
                     <div className="text-2xl font-bold">{totalOnHand}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                     <div className="text-sm font-medium text-zinc-500">Total Available</div>
                     <div className="text-2xl font-bold">{totalAvailable}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                     <div className="text-sm font-medium text-zinc-500">Warehouses</div>
                     <div className="text-2xl font-bold">{inventory.length}</div>
                  </CardContent>
                </Card>
             </div>

             <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {product.detail && (
                        <div>
                            <h4 className="text-sm font-semibold mb-1">Description</h4>
                            <p className="text-sm text-zinc-600 bg-zinc-50 p-3 rounded-md whitespace-pre-wrap">{product.detail}</p>
                        </div>
                    )}
                    
                    {product.attributes && (
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Attributes</h4>
                            <div className="grid grid-cols-2 gap-y-2 gap-x-8">
                                {Object.entries(product.attributes).map(([key, value]) => (
                                    <div key={key} className="flex justify-between border-b border-zinc-100 pb-1">
                                        <span className="text-sm text-zinc-500">{key}</span>
                                        <span className="text-sm font-medium">{String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
             </Card>

             <Tabs defaultValue="balances" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4 bg-zinc-100 p-1 rounded-lg">
                  <TabsTrigger value="balances" className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">Balances</TabsTrigger>
                  <TabsTrigger value="ledger" className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm">Ledger History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="balances" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Stock by Warehouse</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                       <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Warehouse</TableHead>
                            <TableHead className="text-right">On Hand</TableHead>
                            <TableHead className="text-right">Reserved</TableHead>
                            <TableHead className="text-right">Available</TableHead>
                            <TableHead>Last Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventory.map(item => (
                            <TableRow key={item.warehouse_id}>
                              <TableCell className="font-medium">{item.warehouses?.name || item.warehouse_id}</TableCell>
                              <TableCell className="text-right">{item.on_hand}</TableCell>
                              <TableCell className="text-right text-zinc-500">0</TableCell>
                              <TableCell className="text-right font-bold">{item.on_hand}</TableCell>
                              <TableCell className="text-xs text-zinc-500">{item.updated_at ? format(new Date(item.updated_at), 'MMM d, HH:mm') : '-'}</TableCell>
                            </TableRow>
                          ))}
                          {inventory.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-4 text-zinc-500">No stock records</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="ledger">
                  <Card>
                     <CardHeader>
                      <CardTitle>Transaction History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                       <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Warehouse</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                            <TableHead className="text-right">Doc No</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ledger.map(entry => (
                            <TableRow key={entry.id}>
                              <TableCell className="text-xs text-zinc-500">{format(new Date(entry.created_at), 'MMM d, HH:mm')}</TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px] uppercase">{entry.doc_type}</Badge></TableCell>
                              <TableCell className="text-sm">{entry.warehouses?.name || entry.warehouse_id}</TableCell>
                              <TableCell className={cn("text-right font-bold", entry.delta > 0 ? "text-green-600" : entry.delta < 0 ? "text-red-600" : "")}>
                                 {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                              </TableCell>
                              <TableCell className="font-mono text-xs">{entry.doc_id.split('-')[0]}...</TableCell>
                              <TableCell className="text-sm text-zinc-500">{entry.description}</TableCell>
                            </TableRow>
                          ))}
                           {ledger.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-zinc-500">No transactions yet</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
             </Tabs>
          </div>

          {/* Sidebar / Image */}
          <div className="space-y-6">
              <Card>
                  <CardContent className="p-4">
                      <div className="aspect-square bg-zinc-100 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-200">
                          {imageUrl ? (
                              <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                              <ImageIcon className="h-12 w-12 text-zinc-300" />
                          )}
                      </div>
                  </CardContent>
              </Card>
              
              <Card>
                 <CardContent className="p-4">
                    <Button className="w-full mb-3" onClick={() => navigate(`/products/${product.id}/edit`)}>
                        Edit Product
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate('/documents/receipts/new')}>
                        Create Receipt
                    </Button>
                 </CardContent>
              </Card>
          </div>
      </div>
    </div>
  );
}
