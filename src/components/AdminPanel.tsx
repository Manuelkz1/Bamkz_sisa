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
  ChevronUp
} from 'lucide-react';
import { CompanySettings } from './CompanySettings';
import type { Product, Order, User } from '../types';
import { format } from 'date-fns';

type Tab = 'products' | 'orders' | 'users' | 'settings';

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

  useEffect(() => {
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
    }
  }, [activeTab]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
      setError(error.message);
      toast.error('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log('Cargando pedidos...');
      
      // Primero obtenemos todos los pedidos
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      
      if (!ordersData || ordersData.length === 0) {
        console.log('No se encontraron pedidos');
        setOrders([]);
        setLoading(false);
        return;
      }
      
      console.log(`Se encontraron ${ordersData.length} pedidos`);
      
      // Para cada pedido, obtenemos sus items
      const ordersWithItems = await Promise.all(
        ordersData.map(async (order) => {
          try {
            const { data: itemsData, error: itemsError } = await supabase
              .from('order_items')
              .select(`
                id,
                quantity,
                selected_color,
                product_id
              `)
              .eq('order_id', order.id);
              
            if (itemsError) {
              console.error(`Error al cargar items del pedido ${order.id}:`, itemsError);
              return {
                ...order,
                order_items: []
              };
            }
            
            // Para cada item, obtenemos el nombre del producto
            const itemsWithProductNames = await Promise.all(
              (itemsData || []).map(async (item) => {
                if (!item.product_id) {
                  return {
                    ...item,
                    products: { name: 'Producto sin nombre' }
                  };
                }
                
                try {
                  const { data: productData, error: productError } = await supabase
                    .from('products')
                    .select('name')
                    .eq('id', item.product_id)
                    .single();
                    
                  if (productError || !productData) {
                    console.error(`Error al cargar producto ${item.product_id}:`, productError);
                    return {
                      ...item,
                      products: { name: 'Producto no encontrado' }
                    };
                  }
                  
                  return {
                    ...item,
                    products: { name: productData.name }
                  };
                } catch (err) {
                  console.error(`Error al procesar producto ${item.product_id}:`, err);
                  return {
                    ...item,
                    products: { name: 'Error al cargar producto' }
                  };
                }
              })
            );
            
            return {
              ...order,
              order_items: itemsWithProductNames
            };
          } catch (err) {
            console.error(`Error al procesar items del pedido ${order.id}:`, err);
            return {
              ...order,
              order_items: []
            };
          }
        })
      );
      
      console.log('Pedidos procesados correctamente');
      setOrders(ordersWithItems);
    } catch (error: any) {
      console.error('Error loading orders:', error);
      setError(error.message);
      toast.error('Error al cargar los pedidos');
    } finally {
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
      const productData = {
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        category: productForm.category,
        stock: parseInt(productForm.stock),
        images: productForm.images,
        available_colors: productForm.available_colors.filter(Boolean),
        color_images: productForm.color_images.filter(item => item.color && item.image),
        allowed_payment_methods: {
          ...productForm.allowed_payment_methods,
          payment_url: productForm.allowed_payment_methods.card ? productForm.allowed_payment_methods.payment_url : ''
        }
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id)
          .select();

        if (error) throw error;
        toast.success('Producto actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData])
          .select();

        if (error) throw error;
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
        allowed_payment_methods: {
          cash_on_delivery: true,
          card: true,
          payment_url: ''
        }
      });
      loadProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error('Error al guardar el producto');
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
    const newColorImages = [...productForm.color_images];
    const index = newColorImages.findIndex(ci => ci.color === color);
    
    if (index >= 0) {
      newColorImages[index].image = image;
    } else {
      newColorImages.push({ color, image });
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

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetailModal(true);
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

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Categoría
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={product.images?.[0] || 'https://via.placeholder.com/100'}
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
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-h-20 overflow-y-auto">
                              {product.description}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              ${product.price}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {product.stock}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {product.category}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Pedidos
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Productos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pago
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <React.Fragment key={order.id}>
                          <tr 
                            className={`${expandedOrderId === order.id ? 'bg-gray-50' : ''} cursor-pointer hover:bg-gray-50`}
                            onClick={() => toggleOrderExpand(order.id)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {order.id.slice(0, 8)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {order.is_guest
                                  ? order.guest_info?.full_name + ' (Invitado)'
                                  : order.shipping_address.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {order.is_guest
                                  ? order.guest_info?.email
                                  : order.shipping_address.phone}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {order.order_items?.map((item) => (
                                  <div key={item.id} className="mb-1">
                                    {item.products?.name || 'Producto'} x{item.quantity}
                                    {item.selected_color && ` (${item.selected_color})`}
                                  </div>
                                )) || 'Sin productos'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                ${order.total}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ORDER_STATUS_MAP[order.status].color}`}>
                                {ORDER_STATUS_MAP[order.status].label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${PAYMENT_STATUS_MAP[order.payment_status].color}`}>
                                {PAYMENT_STATUS_MAP[order.payment_status].label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <select
                                  value={order.status}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleUpdateOrderStatus(order.id, e.target.value as Order['status']);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                >
                                  <option value="pending">Pendiente</option>
                                  <option value="processing">Procesando</option>
                                  <option value="shipped">Enviado</option>
                                  <option value="delivered">Entregado</option>
                                  <option value="cancelled">Cancelado</option>
                                </select>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewOrderDetails(order);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900 p-1"
                                  title="Ver detalles"
                                >
                                  <Eye className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteOrder(order.id);
                                  }}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  title="Eliminar pedido"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                                {expandedOrderId === order.id ? (
                                  <ChevronUp className="h-5 w-5 text-gray-500" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-gray-500" />
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandedOrderId === order.id && (
                            <tr>
                              <td colSpan={8} className="px-6 py-4 bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">Información del Cliente</h3>
                                    <div className="bg-white p-4 rounded-md shadow-sm">
                                      {order.is_guest ? (
                                        <>
                                          <p className="text-sm text-gray-700"><span className="font-medium">Nombre:</span> {order.guest_info?.full_name} (Invitado)</p>
                                          <p className="text-sm text-gray-700"><span className="font-medium">Email:</span> {order.guest_info?.email}</p>
                                          <p className="text-sm text-gray-700"><span className="font-medium">Teléfono:</span> {order.guest_info?.phone}</p>
                                        </>
                                      ) : (
                                        <>
                                          <p className="text-sm text-gray-700"><span className="font-medium">Nombre:</span> {order.shipping_address.full_name}</p>
                                          <p className="text-sm text-gray-700"><span className="font-medium">Email:</span> {order.user_email}</p>
                                          <p className="text-sm text-gray-700"><span className="font-medium">Teléfono:</span> {order.shipping_address.phone}</p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">Dirección de Envío</h3>
                                    <div className="bg-white p-4 rounded-md shadow-sm">
                                      <p className="text-sm text-gray-700"><span className="font-medium">Dirección:</span> {order.shipping_address.address}</p>
                                      <p className="text-sm text-gray-700"><span className="font-medium">Ciudad:</span> {order.shipping_address.city}</p>
                                      <p className="text-sm text-gray-700"><span className="font-medium">Estado/Provincia:</span> {order.shipping_address.state}</p>
                                      <p className="text-sm text-gray-700"><span className="font-medium">Código Postal:</span> {order.shipping_address.postal_code}</p>
                                      <p className="text-sm text-gray-700"><span className="font-medium">País:</span> {order.shipping_address.country}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">Detalles del Pedido</h3>
                                    <div className="bg-white p-4 rounded-md shadow-sm">
                                      <p className="text-sm text-gray-700"><span className="font-medium">ID del Pedido:</span> {order.id}</p>
                                      <p className="text-sm text-gray-700"><span className="font-medium">Fecha:</span> {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</p>
                                      <p className="text-sm text-gray-700"><span className="font-medium">Método de Pago:</span> {order.payment_method === 'cash_on_delivery' ? 'Contra entrega' : 'Tarjeta'}</p>
                                      <p className="text-sm text-gray-700"><span className="font-medium">Estado del Pago:</span> {PAYMENT_STATUS_MAP[order.payment_status].label}</p>
                                      <p className="text-sm text-gray-700"><span className="font-medium">Estado del Pedido:</span> {ORDER_STATUS_MAP[order.status].label}</p>
                                      {order.payment_id && (
                                        <p className="text-sm text-gray-700"><span className="font-medium">ID de Pago:</span> {order.payment_id}</p>
                                      )}
                                      {order.notes && (
                                        <p className="text-sm text-gray-700"><span className="font-medium">Notas:</span> {order.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">Productos</h3>
                                    <div className="bg-white p-4 rounded-md shadow-sm">
                                      <div className="space-y-2">
                                        {order.order_items?.map((item) => (
                                          <div key={item.id} className="flex justify-between">
                                            <span className="text-sm text-gray-700">
                                              {item.products.name} x{item.quantity}
                                              {item.selected_color && ` (${item.selected_color})`}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="flex justify-between">
                                          <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                                          <span className="text-sm text-gray-700">${order.subtotal}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-sm font-medium text-gray-700">Envío:</span>
                                          <span className="text-sm text-gray-700">${order.shipping_cost}</span>
                                        </div>
                                        <div className="flex justify-between font-medium">
                                          <span className="text-sm text-gray-900">Total:</span>
                                          <span className="text-sm text-gray-900">${order.total}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Usuarios
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rol
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Último acceso
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || 'Sin nombre'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={user.role}
                              onChange={(e) => handleUpdateUserRole(user.id, e.target.value as User['role'])}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            >
                              <option value="customer">Cliente</option>
                              <option value="admin">Administrador</option>
                              <option value="fulfillment">Fulfillment</option>
                              <option value="dropshipping">Dropshipping</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.email_confirmed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.email_confirmed ? 'Verificado' : 'Pendiente'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.last_sign_in
                              ? format(new Date(user.last_sign_in), 'dd/MM/yyyy HH:mm')
                              : 'Nunca'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => {
                                toast.info('Función en desarrollo');
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Ver detalles
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'settings' && <CompanySettings />}
          </div>
        </div>
      </div>

      {/* Modal de Detalle de Pedido */}
      {showOrderDetailModal && selectedOrder && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowOrderDetailModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Detalles del Pedido #{selectedOrder.id.slice(0, 8)}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowOrderDetailModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Información del Cliente</h4>
                    <div className="bg-gray-50 p-4 rounded-md">
                      {selectedOrder.is_guest ? (
                        <>
                          <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Nombre:</span> {selectedOrder.guest_info?.full_name} (Invitado)</p>
                          <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Email:</span> {selectedOrder.guest_info?.email}</p>
                          <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Teléfono:</span> {selectedOrder.guest_info?.phone}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Nombre:</span> {selectedOrder.shipping_address.full_name}</p>
                          <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Email:</span> {selectedOrder.user_email}</p>
                          <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Teléfono:</span> {selectedOrder.shipping_address.phone}</p>
                        </>
                      )}
                    </div>

                    <h4 className="text-sm font-medium text-gray-900 mt-4 mb-2">Dirección de Envío</h4>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Dirección:</span> {selectedOrder.shipping_address.address}</p>
                      <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Ciudad:</span> {selectedOrder.shipping_address.city}</p>
                      <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Estado/Provincia:</span> {selectedOrder.shipping_address.state}</p>
                      <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Código Postal:</span> {selectedOrder.shipping_address.postal_code}</p>
                      <p className="text-sm text-gray-700 mb-2"><span className="font-medium">País:</span> {selectedOrder.shipping_address.country}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Detalles del Pedido</h4>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="text-sm text-gray-700 mb-2"><span className="font-medium">ID del Pedido:</span> {selectedOrder.id}</p>
                      <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Fecha:</span> {format(new Date(selectedOrder.created_at), 'dd/MM/yyyy HH:mm')}</p>
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Método de Pago:</span> {selectedOrder.payment_method === 'cash_on_delivery' ? 'Contra entrega' : 'Tarjeta'}
                      </p>
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Estado del Pago:</span> 
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${PAYMENT_STATUS_MAP[selectedOrder.payment_status].color}`}>
                          {PAYMENT_STATUS_MAP[selectedOrder.payment_status].label}
                        </span>
                      </p>
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-medium">Estado del Pedido:</span>
                        <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ORDER_STATUS_MAP[selectedOrder.status].color}`}>
                          {ORDER_STATUS_MAP[selectedOrder.status].label}
                        </span>
                      </p>
                      {selectedOrder.payment_id && (
                        <p className="text-sm text-gray-700 mb-2"><span className="font-medium">ID de Pago:</span> {selectedOrder.payment_id}</p>
                      )}
                      {selectedOrder.notes && (
                        <p className="text-sm text-gray-700 mb-2"><span className="font-medium">Notas:</span> {selectedOrder.notes}</p>
                      )}
                    </div>

                    <h4 className="text-sm font-medium text-gray-900 mt-4 mb-2">Productos</h4>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="space-y-2 mb-4">
                        {selectedOrder.order_items?.map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span className="text-sm text-gray-700">
                              {item.products.name} x{item.quantity}
                              {item.selected_color && ` (${item.selected_color})`}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                          <span className="text-sm text-gray-700">${selectedOrder.subtotal}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Envío:</span>
                          <span className="text-sm text-gray-700">${selectedOrder.shipping_cost}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span className="text-sm text-gray-900">Total:</span>
                          <span className="text-sm text-gray-900">${selectedOrder.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowOrderDetailModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Eliminar Pedido
                </button>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateOrderStatus(selectedOrder.id, e.target.value as Order['status'])}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  <option value="pending">Pendiente</option>
                  <option value="processing">Procesando</option>
                  <option value="shipped">Enviado</option>
                  <option value="delivered">Entregado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setShowProductModal(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleProductSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowProductModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nombre
                      </label>
                      <input
                        type="text"
                        required
                        value={productForm.name}
                        onChange={(e) =>
                          setProductForm((prev) => ({
                            ...prev,
                            name: e.target.value
                          }))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Descripción
                      </label>
                      <textarea
                        required
                        value={productForm.description}
                        onChange={(e) =>
                          setProductForm((prev) => ({
                            ...prev,
                            description: e.target.value
                          }))
                        }
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Precio
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) =>
                            setProductForm((prev) => ({
                              ...prev,
                              price: e.target.value
                            }))
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Stock
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={productForm.stock}
                          onChange={(e) =>
                            setProductForm((prev) => ({
                              ...prev,
                              stock: e.target.value
                            }))
                          }
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Categoría
                      </label>
                      <input
                        type="text"
                        value={productForm.category}
                        onChange={(e) =>
                          setProductForm((prev) => ({
                            ...prev,
                            category: e.target.value
                          }))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Imágenes
                      </label>
                      {productForm.images.map((url, index) => (
                        <div key={index} className="flex mb-2">
                          <input
                            type="url"
                            value={url}
                            onChange={(e) =>
                              handleImageUrlChange(index, e.target.value)
                            }
                            placeholder="URL de la imagen"
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleImageUrlRemove(index)}
                            className="ml-2 text-red-600 hover:text-red-800"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleImageUrlAdd}
                        className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Agregar URL de imagen
                      </button>
                    </div>
                  </div>
                </div>

                {/* Color options */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colores disponibles
                  </label>
                  {productForm.available_colors.map((color, index) => (
                    <div key={index} className="flex flex-col mb-4 p-3 border border-gray-200 rounded-md">
                      <div className="flex items-center mb-2">
                        <input
                          type="text"
                          value={color}
                          onChange={(e) => handleColorChange(index, e.target.value)}
                          placeholder="Nombre del color"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleColorRemove(index)}
                          className="ml-2 inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Imagen asociada al color */}
                      {color && (
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Imagen para {color}
                          </label>
                          <div className="flex items-center">
                            <input
                              type="text"
                              value={productForm.color_images.find(ci => ci.color === color)?.image || ''}
                              onChange={(e) => handleColorImageChange(color, e.target.value)}
                              placeholder="URL de la imagen para este color"
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                            {productForm.color_images.some(ci => ci.color === color) ? (
                              <button
                                type="button"
                                onClick={() => handleColorImageRemove(color)}
                                className="ml-2 inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleColorImageAdd(color)}
                                className="ml-2 inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {productForm.color_images.find(ci => ci.color === color)?.image && (
                            <div className="mt-2">
                              <img 
                                src={productForm.color_images.find(ci => ci.color === color)?.image} 
                                alt={`Vista previa de ${color}`} 
                                className="h-20 w-20 object-cover rounded-md"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleColorAdd}
                    className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar color
                  </button>
                </div>

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
                        onChange={(e) =>
                          setProductForm((prev) => ({
                            ...prev,
                            allowed_payment_methods: {
                              ...prev.allowed_payment_methods,
                              cash_on_delivery: e.target.checked
                            }
                          }))
                        }
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="cash_on_delivery"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Pago contra entrega
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="card"
                        checked={productForm.allowed_payment_methods.card}
                        onChange={(e) =>
                          setProductForm((prev) => ({
                            ...prev,
                            allowed_payment_methods: {
                              ...prev.allowed_payment_methods,
                              card: e.target.checked
                            }
                          }))
                        }
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="card"
                        className="ml-2 block text-sm text-gray-700"
                      >
                        Tarjeta de crédito/débito
                      </label>
                    </div>
                    {/* Se eliminó la opción de URL de pago personalizada por no estar en uso */}
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {editingProduct ? 'Guardar cambios' : 'Crear producto'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
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
