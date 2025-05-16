import React from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { Order } from '../types';

interface OrderDetailsProps {
  order: Order;
  onClose: () => void;
}

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

export function OrderDetails({ order, onClose }: OrderDetailsProps) {
  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Detalles del Pedido #{order.id.slice(0, 8)}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información general del pedido */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Información General</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">ID:</span>
                    <span className="text-sm font-medium">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Fecha:</span>
                    <span className="text-sm font-medium">
                      {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total:</span>
                    <span className="text-sm font-medium">${order.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Estado:</span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ORDER_STATUS_MAP[order.status].color}`}>
                      {ORDER_STATUS_MAP[order.status].label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Estado de Pago:</span>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${PAYMENT_STATUS_MAP[order.payment_status].color}`}>
                      {PAYMENT_STATUS_MAP[order.payment_status].label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Método de Pago:</span>
                    <span className="text-sm font-medium">
                      {order.payment_method === 'cash_on_delivery' ? 'Efectivo contra entrega' : 'MercadoPago'}
                    </span>
                  </div>
                  {order.payment_url && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">URL de Pago:</span>
                      <a 
                        href={order.payment_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Ver enlace de pago
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Información del cliente */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Información del Cliente</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Tipo:</span>
                    <span className="text-sm font-medium">
                      {order.is_guest ? 'Invitado' : 'Usuario Registrado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Nombre:</span>
                    <span className="text-sm font-medium">
                      {order.is_guest
                        ? order.guest_info?.full_name
                        : order.shipping_address.full_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Email:</span>
                    <span className="text-sm font-medium">
                      {order.is_guest
                        ? order.guest_info?.email
                        : 'No disponible'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Teléfono:</span>
                    <span className="text-sm font-medium">
                      {order.is_guest
                        ? order.guest_info?.phone
                        : order.shipping_address.phone}
                    </span>
                  </div>
                  {order.user_id && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">ID de Usuario:</span>
                      <span className="text-sm font-medium">{order.user_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dirección de envío */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Dirección de Envío</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Dirección:</span>
                    <span className="text-sm font-medium">{order.shipping_address.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Ciudad:</span>
                    <span className="text-sm font-medium">{order.shipping_address.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Código Postal:</span>
                    <span className="text-sm font-medium">{order.shipping_address.postal_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">País:</span>
                    <span className="text-sm font-medium">{order.shipping_address.country}</span>
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Productos</h4>
                <div className="space-y-3">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <div>
                        <div className="text-sm font-medium">{item.products.name}</div>
                        <div className="text-xs text-gray-500">
                          Cantidad: {item.quantity}
                          {item.selected_color && ` - Color: ${item.selected_color}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
