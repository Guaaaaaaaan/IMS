import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { ArrowLeft, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { getProduct, createProduct, updateProduct, deleteProduct, Product } from '../data/productsApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { StickySaveBar } from '../components/ui/sticky-save-bar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

interface AttributeItem {
  key: string;
  value: string;
}

interface ImageItem {
  url: string;
}

interface ProductFormData {
  sku_code: string;
  name: string;
  detail: string;
  uom: string;
  status: 'active' | 'inactive' | 'draft' | 'archived';
  images: ImageItem[];
  attributes: AttributeItem[];
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, reset, watch, formState: { isDirty, errors } } = useForm<ProductFormData>({
    defaultValues: {
      status: 'active',
      attributes: [],
      images: [],
      detail: ''
    }
  });

  const { fields: attrFields, append: appendAttr, remove: removeAttr } = useFieldArray({
    control,
    name: "attributes"
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control,
    name: "images"
  });

  // Load data for edit
  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      getProduct(id).then(({ data, error }) => {
        if (data) {
          const loadedAttrs = data.attributes 
            ? Object.entries(data.attributes).map(([key, value]) => ({ key, value }))
            : [];
          
          const loadedImages = data.image_urls 
            ? data.image_urls.map(url => ({ url }))
            : [];

          reset({
            sku_code: data.sku_code,
            name: data.name,
            detail: data.detail || '',
            uom: data.uom,
            status: data.status as any,
            attributes: loadedAttrs,
            images: loadedImages
          });
        } else {
          toast.error("Product not found");
          navigate('/products');
        }
        setLoading(false);
      });
    }
  }, [isEdit, id, reset, navigate]);

  const onSubmit = async (data: ProductFormData) => {
    // Convert attributes array to Record
    const attributesRecord: Record<string, string> = {};
    data.attributes.forEach(attr => {
      if (attr.key) attributesRecord[attr.key] = attr.value;
    });

    // Convert images array to string array
    const imageUrls = data.images.map(img => img.url).filter(url => url);

    const payload: Partial<Product> = {
      sku_code: data.sku_code,
      name: data.name,
      detail: data.detail,
      uom: data.uom,
      status: data.status,
      attributes: attributesRecord,
      image_urls: imageUrls,
    };

    let result;
    if (isEdit && id) {
      result = await updateProduct(id, payload);
    } else {
      result = await createProduct(payload);
    }

    if (result.error) {
      toast.error(`Error: ${result.error.message}`);
    } else {
      toast.success(isEdit ? "Product updated" : "Product created");
      navigate('/products');
    }
  };

  const handleDelete = async () => {
    if (isEdit && id && confirm("Are you sure you want to delete this product?")) {
      const { error } = await deleteProduct(id);
      if (error) {
        toast.error("Failed to delete");
      } else {
        toast.success("Product deleted");
        navigate('/products');
      }
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="pb-20 relative">
      <StickySaveBar 
        show={isDirty || !isEdit} 
        onSave={handleSubmit(onSubmit)} 
        onDiscard={() => navigate('/products')} 
      />

      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h1>
          {isEdit && <p className="text-sm text-zinc-500">{watch('name')}</p>}
        </div>
        {isEdit && (
            <Badge variant={watch('status') === 'active' ? 'default' : 'secondary'} className="ml-2">
                {watch('status')}
            </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Main) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Product Name *</label>
                <Input {...register("name", { required: true })} placeholder="e.g. Industrial Widget A" />
                {errors.name && <span className="text-red-500 text-xs mt-1">Required</span>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Detail / Description</label>
                <textarea 
                  className="flex min-h-[120px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                  {...register("detail")}
                  placeholder="Enter product details..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>Add image URLs for this product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {imageFields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-center">
                  <div className="h-10 w-10 shrink-0 bg-zinc-100 rounded overflow-hidden flex items-center justify-center border border-zinc-200">
                     {watch(`images.${index}.url`) ? (
                       <img src={watch(`images.${index}.url`)} alt="" className="h-full w-full object-cover" />
                     ) : (
                       <UploadCloud className="h-4 w-4 text-zinc-400" />
                     )}
                  </div>
                  <Input {...register(`images.${index}.url` as const)} placeholder="https://..." className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => removeImage(index)}>
                    <X className="h-4 w-4 text-zinc-500" />
                  </Button>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => appendImage({ url: '' })}
              >
                <Plus className="h-3 w-3 mr-2" />
                Add Image URL
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attributes</CardTitle>
              <CardDescription>Custom characteristics (Material, Weight, etc.)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {attrFields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 mb-1 block">Name</label>
                    <Input {...register(`attributes.${index}.key` as const)} placeholder="Name" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 mb-1 block">Value</label>
                    <Input {...register(`attributes.${index}.value` as const)} placeholder="Value" />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeAttr(index)} className="mb-0.5">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => appendAttr({ key: '', value: '' })}
                className="mt-2"
              >
                <Plus className="h-3 w-3 mr-2" />
                Add Attribute
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Secondary) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <select 
                    {...field}
                    className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Essentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">SKU Code *</label>
                <Input {...register("sku_code", { required: true })} placeholder="e.g. WID-IND-001" />
                 {errors.sku_code && <span className="text-red-500 text-xs mt-1">Required</span>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Unit of Measure (UoM) *</label>
                <Input {...register("uom", { required: true })} placeholder="e.g. EA, SET, KG" />
                 {errors.uom && <span className="text-red-500 text-xs mt-1">Required</span>}
              </div>
            </CardContent>
          </Card>
          
          {isEdit && (
            <Card className="border-red-100 bg-red-50/10">
              <CardHeader>
                 <CardTitle className="text-red-600">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                 <Button variant="destructive" className="w-full" onClick={handleDelete}>
                    Delete Product
                 </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
