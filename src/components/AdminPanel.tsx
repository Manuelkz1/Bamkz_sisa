import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import {
  Package,
  Users,
  Settings,
  ShoppingBag,
  Plus,
  X,
  Edit,
  Trash2,
  Save,
  ArrowLeft,
  Check,
  XCircle,
  Clock,
  TruckIcon,
  CheckCircle,
  CreditCard,
  Link as LinkIcon,
  Eye,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { CompanySettings } from './CompanySettings';
import PromotionManager from './PromotionManager';
import OrderManager from './OrderManager';
import type { Product, Order, User } from '../types';
import { format } from 'date-fns';

type Tab = 'products' | 'orders' | 'users' | 'settings' | 'promotions';

const ORDER_STATUS_MAP = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'Procesando', color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Enviado', color: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Entregado', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
};

const PAYMENT_STATUS_MAP = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Pagado', color: 'bg-green-100 text-green-800' },
  failed: { label: 'Fallido', color: 'bg-red-100 text-red-800' }
};

export function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
  
  // Inicialización del componente
  useEffect(() => {
    console.log("AdminPanel inicializado");
    // Cargar datos iniciales según la pestaña activa
    loadInitialData();
  }, []);

  // Función para cargar datos iniciales
  const loadInitialData = () => {
    console.log("Cargando datos iniciales para la pestaña:", activeTab);
    try {
      switch (activeTab) {
        case 'products':
          loadProducts();
          break;
        case 'orders':
          loadOrders();
          break;
        case 'users':
          loadUsers();
          break;
        case 'settings':
          // CompanySettings maneja su propia carga
          setLoading(false);
          break;
        case 'promotions':
          // PromotionManager maneja su propia carga
          setLoading(false);
          break;
        default:
          setLoading(false);
          break;
      }
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error);
      setError("Error al cargar datos iniciales. Por favor, intente nuevamente.");
      setLoading(false);
    }
  };

  // Efecto para cambiar de pestaña
  useEffect(() => {
    console.log("Cambio de pestaña a:", activeTab);
    setLoading(true);
    setError(null);
    
    try {
      switch (activeTab) {
        case 'products':
          loadProducts();
          break;
        case 'orders':
          loadOrders();
          break;
        case 'users':
          loadUsers();
          break;
        case 'settings':
          // CompanySettings maneja su propia carga
          setLoading(false);
          break;
        case 'promotions':
          // PromotionManager maneja su propia carga
          setLoading(false);
          break;
        default:
          setLoading(false);
          break;
      }
    } catch (error) {
      console.error("Error al cambiar de pestaña:", error);
      setError("Error al cargar datos. Por favor, intente nuevamente.");
      setLoading(false);
    }
  }, [activeTab]);

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

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Consulta básica para obtener solo los pedidos
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error al cargar pedidos:', ordersError);
        setError('Error al cargar pedidos: ' + ordersError.message);
        toast.error('Error al cargar los pedidos');
        setLoading(false);
        return;
      }
      
      // Si no hay pedidos, establecer array vacío y terminar
      if (!ordersData || ordersData.length === 0) {
        console.log('No se encontraron pedidos');
        setOrders([]);
        setLoading(false);
        return;
      }
      
      // Establecer los pedidos con información básica
      const basicOrders = ordersData.map(order => ({
        ...order,
        order_items: []
      }));
      
      // Actualizar el estado con la información básica primero
      setOrders(basicOrders);
      
      // Cargar los items de pedidos
      setLoading(false);
    } catch (error: any) {
      console.error('Error general al cargar pedidos:', error);
      setError('Error general: ' + error.message);
      toast.error('Error al cargar los pedidos');
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('No se pudo obtener la sesión del usuario');
      }

      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.users) {
        throw new Error('Respuesta inválida del servidor');
      }

      setUsers(data.users);
      setError(null);
    } catch (error: any) {
      console.error('Error loading users:', error);
      setError(error.message);
      toast.error(`Error al cargar los usuarios: ${error.message}`);
      
      if (error.message.includes('Authentication failed') || error.message.includes('No hay sesión activa')) {
        navigate('/login');
      }
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

  const handleProductSubmit = async (e: React.FormEvent) => {
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
        // Primero verificamos si el producto todavía existe
        const { data: existingProduct, error: checkError } = await supabase
          .from('products')
          .select('id')
          .eq('id', editingProduct.id)
          .maybeSingle();
        
        if (checkError) {
          console.error('Error al verificar si el producto existe:', checkError);
          throw new Error('Error al verificar si el producto existe');
        }
        
        if (!existingProduct) {
          console.error('El producto ya no existe en la base de datos');
          throw new Error('El producto ya no existe');
        }
        
        // Si el producto existe, procedemos con la actualización
        const { error: updateError } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (updateError) {
          console.error('Error al actualizar el producto:', updateError);
          throw updateError;
        }
        
        toast.success('Producto actualizado exitosamente');
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([{
            ...productData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select();

        if (error) {
          console.error('Error detallado de Supabase:', error);
          throw error;
        }
        
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
      loadProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      // Mostrar mensaje de error más específico si está disponible
      if (error.message) {
        toast.error(`Error al guardar el producto: ${error.message}`);
      } else {
        toast.error('Error al guardar el producto');
      }
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
      toast.success('Producto eliminado exitosamente');
      loadProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error('Error al eliminar el producto');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // Primero eliminamos los items del pedido
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // Luego eliminamos el pedido
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success('Pedido eliminado exitosamente');
      loadOrders();
      
      // Si el pedido eliminado es el que estaba seleccionado, cerramos el modal
      if (selectedOrder?.id === orderId) {
        setShowOrderDetailModal(false);
        setSelectedOrder(null);
      }
    } catch (error: any) {
      console.error('Error deleting order:', error);
      toast.error('Error al eliminar el pedido');
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

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetailModal(true);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success(`Estado del pedido actualizado a: ${ORDER_STATUS_MAP[status as keyof typeof ORDER_STATUS_MAP]?.label || status}`);
      
      // Actualizar el estado local
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status } : order
      ));
      
      // Si es el pedido seleccionado, actualizar también
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status } : null);
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado del pedido');
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, payment_status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status })
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success(`Estado de pago actualizado a: ${PAYMENT_STATUS_MAP[payment_status as keyof typeof PAYMENT_STATUS_MAP]?.label || payment_status}`);
      
      // Actualizar el estado local
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, payment_status } : order
      ));
      
      // Si es el pedido seleccionado, actualizar también
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, payment_status } : null);
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast.error('Error al actualizar el estado de pago');
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const renderProductsTab = () => {
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

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 text-gray-500 px-4 py-8 rounded text-center">
            No hay productos disponibles. Crea tu primer producto con el botón "Nuevo Producto".
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
                {products.map(product => (
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

                <form onSubmit={handleProductSubmit} className="space-y-6">
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
                    />
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
                        className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
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
                        className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
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
                          <div key={colorIndex} className="border border-gray-200 rounded-md p-3">
                            <h4 className="font-medium text-gray-800 mb-2">{color}</h4>
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
                                className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Agregar imagen para {color}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        <label htmlFor="cash_on_delivery" className="ml-2 block text-sm text-gray-700">
                          Pago contra entrega
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="card_payment"
                          checked={productForm.allowed_payment_methods.card}
                          onChange={(e) => handlePaymentMethodChange('card', e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="card_payment" className="ml-2 block text-sm text-gray-700">
                          Pago con tarjeta
                        </label>
                      </div>
                      
                      {productForm.allowed_payment_methods.card && (
                        <div className="mt-2 pl-6">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            URL de pago (opcional)
                          </label>
                          <input
                            type="text"
                            value={productForm.allowed_payment_methods.payment_url}
                            onChange={(e) => handlePaymentUrlChange(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="https://ejemplo.com/pago"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Si se proporciona, los clientes serán redirigidos a esta URL para completar el pago.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowProductModal(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
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
  };

  const renderOrdersTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Pedidos</h2>
        </div>

        <OrderManager />
      </div>
    );
  };

  const renderUsersTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Usuarios</h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 text-gray-500 px-4 py-8 rounded text-center">
            No hay usuarios registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de registro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.user_metadata?.full_name || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {user.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                      <div className="text-xs text-gray-500">
                        {user.email_confirmed_at ? 'Verificado' : 'No verificado'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy HH:mm') : 'Desconocido'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'dd/MM/yyyy HH:mm') : 'Nunca'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderSettingsTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Configuración</h2>
        </div>
        
        <CompanySettings />
      </div>
    );
  };

  const renderPromotionsTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Promociones</h2>
        </div>
        
        <PromotionManager />
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-white rounded-lg shadow-md p-4">
          <h1 className="text-xl font-bold mb-6 text-indigo-700">Panel de Administración</h1>
          
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'products'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Package className="mr-3 h-5 w-5" />
              Productos
            </button>
            
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'orders'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="mr-3 h-5 w-5" />
              Pedidos
            </button>
            
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'users'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Users className="mr-3 h-5 w-5" />
              Usuarios
            </button>
            
            <button
              onClick={() => setActiveTab('promotions')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'promotions'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Tag className="mr-3 h-5 w-5" />
              Promociones
            </button>
            
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'settings'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Settings className="mr-3 h-5 w-5" />
              Configuración
            </button>
          </nav>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md"
            >
              <ArrowLeft className="mr-3 h-5 w-5" />
              Volver a la tienda
            </button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="flex-1 bg-white rounded-lg shadow-md p-6">
          {activeTab === 'products' && renderProductsTab()}
          {activeTab === 'orders' && renderOrdersTab()}
          {activeTab === 'users' && renderUsersTab()}
          {activeTab === 'settings' && renderSettingsTab()}
          {activeTab === 'promotions' && renderPromotionsTab()}
        </div>
      </div>
    </div>
  );
}
