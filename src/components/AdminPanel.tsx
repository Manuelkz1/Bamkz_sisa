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
import PromotionManager from '../views/admin/PromotionManager.vue';
import OrderManager from '../views/admin/OrderManager.vue';
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
        const { data, error } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id)
          .select();

        if (error) {
          console.error('Error detallado de Supabase:', error);
          throw error;
        }
        
        toast.success('Producto actualizado exitosamente');
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([productData])
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
    
    // Eliminar también la asociación color-imagen si existe
    const newColorImages = productForm.color_images.filter(ci => ci.color !== colorToRemove);
    
    setProductForm(prev => ({
      ...prev,
      available_colors: prev.available_colors.filter((_, i) => i !== index),
      color_images: newColorImages
    }));
  };
  
  const handleColorImageAdd = (color: string) => {
    // Si ya existe una asociación para este color, no hacer nada
    if (productForm.color_images.some(ci => ci.color === color)) {
      return;
    }
    
    setProductForm(prev => ({
      ...prev,
      color_images: [...prev.color_images, { color, image: '' }]
    }));
  };
  
  const handleColorImageChange = (color: string, image: string) => {
    // Validar que la URL de la imagen no esté vacía
    if (!image || image.trim() === '') {
      toast.error(`Debe ingresar una URL de imagen válida para el color ${color}`);
      return;
    }
    
    const newColorImages = [...productForm.color_images];
    const index = newColorImages.findIndex(ci => ci.color === color);
    
    if (index >= 0) {
      newColorImages[index].image = image.trim();
    } else {
      newColorImages.push({ color, image: image.trim() });
    }
    
    setProductForm(prev => ({
      ...prev,
      color_images: newColorImages
    }));
  };
  
  const handleColorImageRemove = (color: string) => {
    setProductForm(prev => ({
      ...prev,
      color_images: prev.color_images.filter(ci => ci.color !== color)
    }));
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Estado del pedido actualizado');
      loadOrders();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado del pedido');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: User['role']) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('No se pudo obtener la sesión del usuario');
      }

      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, newRole })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el rol');
      }

      toast.success('Rol actualizado exitosamente');
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast.error(error.message || 'Error al actualizar el rol');
      
      if (error.message.includes('Authentication failed') || error.message.includes('No hay sesión activa')) {
        navigate('/login');
      }
    }
  };
  
  const handleViewOrderDetails = async (order: Order) => {
    console.log('Visualizando detalles del pedido:', order.id);
    
    try {
      // Cargar datos completos del pedido para asegurar que tenemos toda la información
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single();
        
      if (orderError) {
        console.error('Error al cargar detalles del pedido:', orderError);
        toast.error('Error al cargar detalles del pedido');
        return;
      }
      
      // Cargar items del pedido si existen
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*, products(*)')
        .eq('order_id', order.id);
        
      if (itemsError) {
        console.error('Error al cargar items del pedido:', itemsError);
      }
      
      // Combinar datos y establecer el pedido seleccionado
      const completeOrder = {
        ...orderData,
        items: orderItems || [],
      };
      
      console.log('Pedido completo cargado:', completeOrder);
      setSelectedOrder(completeOrder);
    } catch (error) {
      console.error('Error general al cargar detalles del pedido:', error);
      toast.error('Error al cargar detalles del pedido');
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Panel de Administración
          </h1>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('products')}
                className={`${
                  activeTab === 'products'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center justify-center`}
              >
                <Package className="h-5 w-5 mr-2" />
                Productos
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`${
                  activeTab === 'orders'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center justify-center`}
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Pedidos
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`${
                  activeTab === 'users'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center justify-center`}
              >
                <Users className="h-5 w-5 mr-2" />
                Usuarios
              </button>
              <button
                onClick={() => setActiveTab('promotions')}
                className={`${
                  activeTab === 'promotions'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center justify-center`}
              >
                <Tag className="h-5 w-5 mr-2" />
                Promociones
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`${
                  activeTab === 'settings'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center justify-center`}
              >
                <Settings className="h-5 w-5 mr-2" />
                Configuración
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'products' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Productos
                  </h2>
                  <button
                    onClick={() => {
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
                      setShowProductModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Nuevo Producto
                  </button>
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <XCircle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No hay productos disponibles.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Producto
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Precio
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoría
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={product.images?.[0] || 'https://via.placeholder.com/150'}
                                    alt={product.name}
                                  />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {product.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                ${product.price.toFixed(2)}
                              </div>
                              {product.original_price && (
                                <div className="text-xs text-gray-500 line-through">
                                  ${product.original_price.toFixed(2)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {product.stock}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {product.category || 'Sin categoría'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <OrderManager />
            )}

            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Usuarios
                </h2>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <XCircle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {users.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No hay usuarios registrados.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usuario
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rol
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha de registro
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.user_metadata?.full_name || 'Usuario'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {user.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                value={user.role || 'customer'}
                                onChange={(e) => handleUpdateUserRole(user.id, e.target.value as User['role'])}
                                className="text-sm text-gray-900 border border-gray-300 rounded-md p-1"
                              >
                                <option value="admin">Administrador</option>
                                <option value="fulfillment">Fulfillment</option>
                                <option value="customer">Cliente</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy') : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {/* Acciones de usuario */}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'promotions' && (
              <PromotionManager />
            )}

            {activeTab === 'settings' && (
              <CompanySettings />
            )}
          </div>
        </div>
      </div>

      {/* Modal de producto */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nombre del producto
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Categoría
                  </label>
                  <input
                    type="text"
                    id="category"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    Precio
                  </label>
                  <input
                    type="number"
                    id="price"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                    Stock
                  </label>
                  <input
                    type="number"
                    id="stock"
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  id="description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imágenes del producto
                </label>
                {productForm.images.map((url, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => handleImageUrlChange(index, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="URL de la imagen"
                    />
                    <button
                      type="button"
                      onClick={() => handleImageUrlRemove(index)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleImageUrlAdd}
                  className="mt-1 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir imagen
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Colores disponibles
                </label>
                {productForm.available_colors.map((color, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => handleColorChange(index, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Nombre del color (ej: Rojo, Azul, etc.)"
                    />
                    <button
                      type="button"
                      onClick={() => handleColorRemove(index)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleColorAdd}
                  className="mt-1 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir color
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Imágenes por color
                </label>
                {productForm.available_colors.length > 0 ? (
                  <div className="space-y-4">
                    {productForm.available_colors.map((color) => {
                      const colorImage = productForm.color_images.find(ci => ci.color === color);
                      return (
                        <div key={color} className="border border-gray-200 rounded-md p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{color}</span>
                            {colorImage ? (
                              <button
                                type="button"
                                onClick={() => handleColorImageRemove(color)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleColorImageAdd(color)}
                                className="text-indigo-600 hover:text-indigo-800"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {colorImage && (
                            <div className="flex items-center">
                              <input
                                type="text"
                                value={colorImage.image}
                                onChange={(e) => handleColorImageChange(color, e.target.value)}
                                className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="URL de la imagen para este color"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Primero añade colores disponibles para poder asignar imágenes por color.
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Métodos de pago permitidos
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="cash_on_delivery"
                      type="checkbox"
                      checked={productForm.allowed_payment_methods.cash_on_delivery}
                      onChange={(e) => setProductForm({
                        ...productForm,
                        allowed_payment_methods: {
                          ...productForm.allowed_payment_methods,
                          cash_on_delivery: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="cash_on_delivery" className="ml-2 block text-sm text-gray-900">
                      Pago contra entrega
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="card"
                      type="checkbox"
                      checked={productForm.allowed_payment_methods.card}
                      onChange={(e) => setProductForm({
                        ...productForm,
                        allowed_payment_methods: {
                          ...productForm.allowed_payment_methods,
                          card: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="card" className="ml-2 block text-sm text-gray-900">
                      Tarjeta de crédito/débito
                    </label>
                  </div>
                  {productForm.allowed_payment_methods.card && (
                    <div className="ml-6 mt-2">
                      <label htmlFor="payment_url" className="block text-sm font-medium text-gray-700">
                        URL de pago (opcional)
                      </label>
                      <input
                        type="text"
                        id="payment_url"
                        value={productForm.allowed_payment_methods.payment_url}
                        onChange={(e) => setProductForm({
                          ...productForm,
                          allowed_payment_methods: {
                            ...productForm.allowed_payment_methods,
                            payment_url: e.target.value
                          }
                        })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {editingProduct ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
