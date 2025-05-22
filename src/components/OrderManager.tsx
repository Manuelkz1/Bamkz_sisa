import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Order } from '../types';
import { 
  Trash2, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  TruckIcon, 
  CheckCircle, 
  XCircle, 
  CreditCard 
} from 'lucide-react';
import { format } from 'date-fns';

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

const OrderManager: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

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
      
      console.log('Pedidos cargados:', ordersData.length);
      
      // Procesar los datos de los pedidos para asegurar compatibilidad
      const processedOrders = ordersData.map(order => {
        // Extraer información del cliente del objeto shipping_address o guest_info
        const customerName = order.shipping_address?.full_name || 
                            order.guest_info?.full_name || 
                            'N/A';
                            
        const customerEmail = order.guest_info?.email || 
                             (order.user_id ? 'Usuario registrado' : 'N/A');
                             
        // Asegurar que los campos requeridos estén presentes
        return {
          ...order,
          // Añadir campos para compatibilidad
          customer_name: customerName,
          customer_email: customerEmail,
          total_amount: order.total || 0,
          notes: 'Sin notas adicionales',
          // Asegurar que order_items existe
          order_items: [],
          // Convertir objetos a strings para visualización si es necesario
          shipping_address: typeof order.shipping_address === 'object' 
            ? `${order.shipping_address.full_name}, ${order.shipping_address.address}, ${order.shipping_address.city}` 
            : order.shipping_address || 'No disponible'
        };
      });
      
      // Establecer los pedidos con información procesada
      setOrders(processedOrders);
      
      // Limpiar selecciones
      setSelectedOrders([]);
      setSelectAll(false);
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error general al cargar pedidos:', error);
      setError('Error general: ' + error.message);
      toast.error('Error al cargar los pedidos');
      setLoading(false);
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

  const handleDeleteSelectedOrders = async () => {
    setShowDeleteConfirmation(false);
    
    if (selectedOrders.length === 0) {
      toast.error('No hay pedidos seleccionados para eliminar');
      return;
    }

    try {
      setLoading(true);
      
      // Primero eliminamos los items de los pedidos seleccionados
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', selectedOrders);

      if (itemsError) throw itemsError;

      // Luego eliminamos los pedidos
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', selectedOrders);

      if (error) throw error;
      
      toast.success(`${selectedOrders.length} pedidos eliminados exitosamente`);
      
      // Recargar pedidos y limpiar selecciones
      await loadOrders();
      
    } catch (error: any) {
      console.error('Error deleting orders:', error);
      toast.error('Error al eliminar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Estado del pedido actualizado');
      loadOrders();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error('Error al actualizar el estado del pedido');
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
        customer_name: orderData.shipping_address?.full_name || 
                      orderData.guest_info?.full_name || 
                      'N/A',
        customer_email: orderData.guest_info?.email || 
                       (orderData.user_id ? 'Usuario registrado' : 'N/A'),
        customer_phone: orderData.shipping_address?.phone || 
                       orderData.guest_info?.phone || 
                       'N/A',
        total_amount: orderData.total || 0,
        shipping_address: typeof orderData.shipping_address === 'object' 
          ? `${orderData.shipping_address.full_name}, ${orderData.shipping_address.address}, ${orderData.shipping_address.city}` 
          : orderData.shipping_address || 'No disponible',
        notes: 'Sin notas adicionales',
        items: orderItems || []
      };
      
      console.log('Pedido completo cargado:', completeOrder);
      setSelectedOrder(completeOrder);
      setShowOrderDetailModal(true);
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

  const handleSelectOrder = (orderId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
      setSelectAll(false);
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    setSelectAll(isChecked);
    if (isChecked) {
      setSelectedOrders(orders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const formatOrderDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return 'Fecha inválida';
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Pedidos ({orders.length})
        </h2>
        
        {selectedOrders.length > 0 && (
          <button
            onClick={() => setShowDeleteConfirmation(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Eliminar seleccionados ({selectedOrders.length})
          </button>
        )}
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

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="p-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No hay pedidos disponibles</h3>
            <p className="mt-1 text-sm text-gray-500">
              No se ha encontrado ningún pedido en el sistema.
            </p>
            <div className="mt-6">
              <button
                onClick={loadOrders}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Actualizar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-2 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pedido
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <React.Fragment key={order.id}>
                  <tr className={expandedOrderId === order.id ? 'bg-gray-50' : ''}>
                    <td className="px-2 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{order.id.substring(0, 8)}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${order.total_amount ? Number(order.total_amount).toFixed(2) : (order.total ? Number(order.total).toFixed(2) : 'N/A')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {order.customer_name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.customer_email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ORDER_STATUS_MAP[order.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {ORDER_STATUS_MAP[order.status]?.label || order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${PAYMENT_STATUS_MAP[order.payment_status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {PAYMENT_STATUS_MAP[order.payment_status]?.label || order.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatOrderDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewOrderDetails(order)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => toggleOrderExpand(order.id)}
                        className="text-gray-600 hover:text-gray-900 mr-3"
                      >
                        {expandedOrderId === order.id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                  {expandedOrderId === order.id && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-gray-50">
                        <div className="text-sm text-gray-900 mb-2">
                          <strong>Dirección de envío:</strong> {order.shipping_address || 'No disponible'}
                        </div>
                        <div className="text-sm text-gray-900 mb-2">
                          <strong>Método de pago:</strong> {order.payment_method || 'No disponible'}
                        </div>
                        <div className="text-sm text-gray-900 mb-4">
                          <strong>Notas:</strong> {order.notes || 'Sin notas'}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'pending')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Pendiente
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'processing')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Procesando
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                          >
                            <TruckIcon className="h-4 w-4 mr-1" />
                            Enviado
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Entregado
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancelado
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmación para eliminar múltiples pedidos */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmar eliminación
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              ¿Estás seguro de que quieres eliminar {selectedOrders.length} pedidos? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSelectedOrders}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="h-5 w-5 mr-2" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de detalles del pedido */}
      {showOrderDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles del Pedido #{selectedOrder.id.substring(0, 8)}
              </h3>
              <button
                onClick={() => setShowOrderDetailModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="border-t border-gray-200 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Información del Cliente</h4>
                  <p className="text-sm text-gray-900">Nombre: {selectedOrder.customer_name || 'N/A'}</p>
                  <p className="text-sm text-gray-900">Email: {selectedOrder.customer_email || 'N/A'}</p>
                  <p className="text-sm text-gray-900">Teléfono: {selectedOrder.customer_phone || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Información del Pedido</h4>
                  <p className="text-sm text-gray-900">Fecha: {formatOrderDate(selectedOrder.created_at)}</p>
                  <p className="text-sm text-gray-900">Estado: <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ORDER_STATUS_MAP[selectedOrder.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {ORDER_STATUS_MAP[selectedOrder.status]?.label || selectedOrder.status}
                  </span></p>
                  <p className="text-sm text-gray-900">Pago: <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${PAYMENT_STATUS_MAP[selectedOrder.payment_status]?.color || 'bg-gray-100 text-gray-800'}`}>
                    {PAYMENT_STATUS_MAP[selectedOrder.payment_status]?.label || selectedOrder.payment_status}
                  </span></p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 py-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Dirección de Envío</h4>
              <p className="text-sm text-gray-900">{selectedOrder.shipping_address || 'No disponible'}</p>
            </div>

            <div className="border-t border-gray-200 py-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Productos</h4>
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Precio
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {item.products?.images && item.products.images[0] && (
                                <div className="flex-shrink-0 h-10 w-10 mr-4">
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={item.products.images[0]}
                                    alt={item.products?.name || 'Producto'}
                                  />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {item.products?.name || 'Producto desconocido'}
                                </div>
                                {item.selected_color && (
                                  <div className="text-xs text-gray-500">
                                    Color: {item.selected_color}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.quantity || 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.price_at_time?.toFixed(2) || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          Total:
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${(selectedOrder.total_amount || selectedOrder.total || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No hay productos disponibles para este pedido.</p>
              )}
            </div>

            <div className="border-t border-gray-200 py-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Notas</h4>
              <p className="text-sm text-gray-900">{selectedOrder.notes || 'Sin notas'}</p>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowOrderDetailModal(false)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManager;