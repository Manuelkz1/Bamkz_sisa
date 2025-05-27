import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import {
  Plus,
  X,
  Edit,
  Trash2,
  Save,
  Search
} from 'lucide-react';
import type { Product } from '../types/index';

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: '',
    images: [] as string[],
    available_colors: [] as string[],
    color_images: [] as {color: string, image: string}[],
    allowed_payment_methods: {
      cash_on_delivery: true,
      card: true,
      payment_url: ''
    }
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Cargando productos...");
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error en la consulta de productos:', error);
        throw error;
      }
      
      console.log(`Productos cargados: ${data?.length || 0}`);
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
      setError(error.message || "Error al cargar los productos");
      toast.error('Error al cargar los productos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category || '',
      stock: product.stock.toString(),
      images: product.images || [],
      available_colors: product.available_colors || [],
      color_images: product.color_images || [],
      allowed_payment_methods: {
        cash_on_delivery: product.allowed_payment_methods?.cash_on_delivery ?? true,
        card: product.allowed_payment_methods?.card ?? true,
        payment_url: product.allowed_payment_methods?.payment_url || ''
      }
    });
    setShowProductModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validación de campos obligatorios
      if (!productForm.name.trim()) {
        toast.error('El nombre del producto es obligatorio');
        return;
      }
      
      if (!productForm.description.trim()) {
        toast.error('La descripción del producto es obligatoria');
        return;
      }
      
      if (!productForm.price || isNaN(parseFloat(productForm.price)) || parseFloat(productForm.price) <= 0) {
        toast.error('El precio debe ser un número válido mayor que cero');
        return;
      }
      
      if (!productForm.stock || isNaN(parseInt(productForm.stock)) || parseInt(productForm.stock) < 0) {
        toast.error('El stock debe ser un número válido no negativo');
        return;
      }
      
      // Filtrar imágenes vacías
      const filteredImages = productForm.images.filter(img => img.trim() !== '');
      
      // Validar que haya al menos una imagen
      if (filteredImages.length === 0) {
        toast.error('Debe agregar al menos una imagen del producto');
        return;
      }
      
      // Filtrar colores vacíos y asegurar que no haya duplicados
      const filteredColors = [...new Set(productForm.available_colors.filter(color => color.trim() !== ''))];
      
      // Validar y limpiar color_images
      let validColorImages = [];
      if (filteredColors.length > 0) {
        // Solo incluir color_images para colores que existen en available_colors
        validColorImages = productForm.color_images
          .filter(item => 
            item.color && 
            item.image && 
            item.color.trim() !== '' && 
            item.image.trim() !== '' &&
            filteredColors.includes(item.color)
          );
      }
      
      const productData = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: parseFloat(productForm.price),
        category: productForm.category.trim(),
        stock: parseInt(productForm.stock),
        images: filteredImages,
        available_colors: filteredColors,
        color_images: validColorImages,
        allowed_payment_methods: {
          ...productForm.allowed_payment_methods,
          payment_url: productForm.allowed_payment_methods.card ? 
            productForm.allowed_payment_methods.payment_url.trim() : 
            ''
        }
      };

      console.log('Guardando producto con datos:', JSON.stringify(productData, null, 2));

      if (editingProduct) {
        // Primero actualizamos el producto
        const { error: updateError } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (updateError) {
          console.error('Error al actualizar el producto:', updateError);
          throw new Error(`Error al actualizar el producto: ${updateError.message}`);
        }
        
        // Luego obtenemos el producto actualizado en una consulta separada
        const { data: updatedProduct, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('id', editingProduct.id)
          .single();
        
        if (fetchError) {
          console.error('Error al obtener el producto actualizado:', fetchError);
          throw new Error('Error al obtener el producto actualizado');
        }
        
        if (!updatedProduct) {
          throw new Error('No se pudo encontrar el producto actualizado');
        }
        
        // Actualizamos el producto en el estado local
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p.id === editingProduct.id ? updatedProduct : p
          )
        );
        
        toast.success('Producto actualizado exitosamente');
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([{
            ...productData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) {
          console.error('Error al crear el producto:', error);
          throw new Error(`Error al crear el producto: ${error.message}`);
        }
        
        if (!data) {
          throw new Error('No se pudo crear el producto. Por favor, intente nuevamente.');
        }
        
        // Añadimos el nuevo producto al estado local
        setProducts(prevProducts => [data, ...prevProducts]);
        
        toast.success('Producto creado exitosamente');
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: '',
        category: '',
        stock: '',
        images: [],
        available_colors: [],
        color_images: [],
        allowed_payment_methods: {
          cash_on_delivery: true,
          card: true,
          payment_url: ''
        }
      });
      
      // Recargamos los productos para asegurar que tenemos los datos más actualizados
      await loadProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Error al guardar el producto');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      
      // Actualizamos el estado local para reflejar los cambios inmediatamente
      setProducts(prevProducts => prevProducts.filter(p => p.id !== productId));
      
      toast.success('Producto eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar el producto');
    }
  };

  const handleImageUrlAdd = () => {
    setProductForm(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  const handleImageUrlChange = (index: number, value: string) => {
    const newImages = [...productForm.images];
    newImages[index] = value;
    setProductForm(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const handleImageUrlRemove = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleColorAdd = () => {
    setProductForm(prev => ({
      ...prev,
      available_colors: [...prev.available_colors, ''],
      color_images: [...prev.color_images]
    }));
  };

  const handleColorChange = (index: number, value: string) => {
    const newColors = [...productForm.available_colors];
    newColors[index] = value;
    
    // Actualizar también el color en color_images si existe
    const newColorImages = [...productForm.color_images];
    const existingColorImageIndex = newColorImages.findIndex(ci => ci.color === productForm.available_colors[index]);
    if (existingColorImageIndex >= 0) {
      newColorImages[existingColorImageIndex].color = value;
    }
    
    setProductForm(prev => ({
      ...prev,
      available_colors: newColors,
      color_images: newColorImages
    }));
  };

  const handleColorRemove = (index: number) => {
    const colorToRemove = productForm.available_colors[index];
    
    // Eliminar también las imágenes asociadas a este color
    const newColorImages = productForm.color_images.filter(ci => ci.color !== colorToRemove);
    
    setProductForm(prev => ({
      ...prev,
      available_colors: prev.available_colors.filter((_, i) => i !== index),
      color_images: newColorImages
    }));
  };

  const handleColorImageAdd = (color: string) => {
    setProductForm(prev => ({
      ...prev,
      color_images: [...prev.color_images, { color, image: '' }]
    }));
  };

  const handleColorImageChange = (index: number, value: string) => {
    const newColorImages = [...productForm.color_images];
    newColorImages[index].image = value;
    setProductForm(prev => ({
      ...prev,
      color_images: newColorImages
    }));
  };

  const handleColorImageRemove = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      color_images: prev.color_images.filter((_, i) => i !== index)
    }));
  };

  const handlePaymentMethodChange = (method: 'cash_on_delivery' | 'card', checked: boolean) => {
    setProductForm(prev => ({
      ...prev,
      allowed_payment_methods: {
        ...prev.allowed_payment_methods,
        [method]: checked
      }
    }));
  };

  const handlePaymentUrlChange = (url: string) => {
    setProductForm(prev => ({
      ...prev,
      allowed_payment_methods: {
        ...prev.allowed_payment_methods,
        payment_url: url
      }
    }));
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Productos</h2>
        <button
          onClick={() => {
            setEditingProduct(null);
            setProductForm({
              name: '',
              description: '',
              price: '',
              category: '',
              stock: '',
              images: [''],
              available_colors: [],
              color_images: [],
              allowed_payment_methods: {
                cash_on_delivery: true,
                card: true,
                payment_url: ''
              }
            });
            setShowProductModal(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar productos..."
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-indigo-500 focus:border-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 text-gray-500 px-4 py-8 rounded text-center">
          {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda.' : 'No hay productos disponibles. Crea tu primer producto con el botón "Nuevo Producto".'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img
                          className="h-10 w-10 rounded-md object-cover"
                          src={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/150'}
                          alt={product.name}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">${product.price.toLocaleString()}</div>
                    {product.original_price && product.original_price > product.price && (
                      <div className="text-xs text-gray-500 line-through">${product.original_price.toLocaleString()}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {product.stock}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{product.category || 'Sin categoría'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-red-600 hover:text-red-900 flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de producto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del producto *
                    </label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Ej: Camiseta de algodón"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría
                    </label>
                    <input
                      type="text"
                      value={productForm.category}
                      onChange={(e) => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Ej: Ropa, Electrónica, etc."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio *
                    </label>
                    <input
                      type="number"
                      value={productForm.price}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Ej: 29.99"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock *
                    </label>
                    <input
                      type="number"
                      value={productForm.stock}
                      onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Ej: 100"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción *
                  </label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Describe el producto..."
                    rows={4}
                    required
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Imágenes del producto *
                  </label>
                  <div className="space-y-2">
                    {productForm.images.map((url, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => handleImageUrlChange(index, e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="URL de la imagen"
                        />
                        <button
                          type="button"
                          onClick={() => handleImageUrlRemove(index)}
                          className="p-2 text-red-600 hover:text-red-800"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleImageUrlAdd}
                      className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar imagen
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colores disponibles
                  </label>
                  <div className="space-y-2">
                    {productForm.available_colors.map((color, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={color}
                          onChange={(e) => handleColorChange(index, e.target.value)}
                          className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Nombre del color (ej: Rojo, Azul, etc.)"
                        />
                        <button
                          type="button"
                          onClick={() => handleColorRemove(index)}
                          className="p-2 text-red-600 hover:text-red-800"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleColorAdd}
                      className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar color
                    </button>
                  </div>
                </div>

                {productForm.available_colors.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Imágenes por color
                    </label>
                    <div className="space-y-4">
                      {productForm.available_colors.map((color, colorIndex) => (
                        <div key={colorIndex} className="border border-gray-200 rounded-md p-4">
                          <h4 className="font-medium mb-2">{color}</h4>
                          <div className="space-y-2">
                            {productForm.color_images
                              .filter(ci => ci.color === color)
                              .map((ci, imageIndex) => {
                                const index = productForm.color_images.findIndex(item => item === ci);
                                return (
                                  <div key={index} className="flex items-center space-x-2">
                                    <input
                                      type="text"
                                      value={ci.image}
                                      onChange={(e) => handleColorImageChange(index, e.target.value)}
                                      className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                      placeholder={`URL de imagen para ${color}`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleColorImageRemove(index)}
                                      className="p-2 text-red-600 hover:text-red-800"
                                    >
                                      <X className="w-5 h-5" />
                                    </button>
                                  </div>
                                );
                              })}
                            <button
                              type="button"
                              onClick={() => handleColorImageAdd(color)}
                              className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Agregar imagen para {color}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Métodos de pago permitidos
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="cash_on_delivery"
                        checked={productForm.allowed_payment_methods.cash_on_delivery}
                        onChange={(e) => handlePaymentMethodChange('cash_on_delivery', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="cash_on_delivery" className="ml-2 block text-sm text-gray-900">
                        Pago contra entrega
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="card"
                        checked={productForm.allowed_payment_methods.card}
                        onChange={(e) => handlePaymentMethodChange('card', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="card" className="ml-2 block text-sm text-gray-900">
                        Pago con tarjeta
                      </label>
                    </div>
                    {productForm.allowed_payment_methods.card && (
                      <div className="mt-2">
                        <label htmlFor="payment_url" className="block text-sm text-gray-700 mb-1">
                          URL de pago (opcional)
                        </label>
                        <input
                          type="text"
                          id="payment_url"
                          value={productForm.allowed_payment_methods.payment_url}
                          onChange={(e) => handlePaymentUrlChange(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="URL para el pago con tarj
eta"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}