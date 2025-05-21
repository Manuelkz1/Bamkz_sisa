// OrderManager.vue
<template>
  <div class="order-manager">
    <h2 class="text-2xl font-bold mb-4">Gestión de Pedidos</h2>
    
    <!-- Acciones masivas -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center">
          <input 
            type="checkbox" 
            :checked="allSelected"
            @change="toggleSelectAll"
            class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label class="ml-2 text-sm text-gray-700">Seleccionar todos</label>
        </div>
        
        <div class="flex items-center">
          <span class="mr-2 text-sm text-gray-700">{{ selectedCount }} pedidos seleccionados</span>
          <button 
            @click="confirmDeleteSelected"
            :disabled="selectedCount === 0"
            :class="[
              'px-4 py-2 rounded-md text-sm font-medium',
              selectedCount > 0 
                ? 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            ]"
          >
            Eliminar seleccionados
          </button>
        </div>
      </div>
    </div>
    
    <!-- Lista de pedidos -->
    <div class="bg-white rounded-lg shadow">
      <div v-if="loading" class="text-center py-8">
        <p>Cargando pedidos...</p>
      </div>
      
      <div v-else-if="orders.length === 0" class="text-center py-8">
        <p>No hay pedidos registrados.</p>
      </div>
      
      <div v-else>
        <!-- Vista móvil: tarjetas -->
        <div class="md:hidden">
          <div v-for="order in orders" :key="order.id" class="border-b border-gray-200 p-4">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  :checked="isSelected(order.id)"
                  @change="toggleSelect(order.id)"
                  class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span class="ml-2 font-medium">Pedido #{{ order.id.substring(0, 8) }}</span>
              </div>
              <span 
                :class="[
                  'px-2 py-1 text-xs font-semibold rounded-full',
                  getStatusClass(order.status)
                ]"
              >
                {{ getStatusName(order.status) }}
              </span>
            </div>
            
            <div class="text-sm text-gray-600 mb-1">
              <span>{{ formatDate(order.created_at) }}</span>
            </div>
            
            <div class="text-sm font-medium mb-1">
              Total: ${{ order.total.toFixed(2) }}
            </div>
            
            <div class="text-sm text-gray-600 mb-3">
              {{ order.products.length }} productos
            </div>
            
            <div class="flex justify-end space-x-2">
              <button 
                @click="deleteOrder(order.id)" 
                class="px-3 py-1 bg-red-100 text-red-800 rounded-md text-sm hover:bg-red-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
        
        <!-- Vista desktop: tabla -->
        <div class="hidden md:block overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                  <input 
                    type="checkbox" 
                    :checked="allSelected"
                    @change="toggleSelectAll"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="order in orders" :key="order.id">
                <td class="px-6 py-4 whitespace-nowrap">
                  <input 
                    type="checkbox" 
                    :checked="isSelected(order.id)"
                    @change="toggleSelect(order.id)"
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ order.id.substring(0, 8) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(order.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${{ order.total.toFixed(2) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ order.products.length }} items
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                      getStatusClass(order.status)
                    ]"
                  >
                    {{ getStatusName(order.status) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    @click="deleteOrder(order.id)" 
                    class="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Modal de confirmación -->
    <div v-if="showConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Confirmar eliminación</h3>
        <p class="text-sm text-gray-500 mb-6">
          ¿Estás seguro de que deseas eliminar {{ selectedCount }} pedidos? Esta acción no se puede deshacer.
        </p>
        <div class="flex justify-end space-x-3">
          <button 
            @click="showConfirmModal = false" 
            class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button 
            @click="deleteSelected" 
            class="px-4 py-2 bg-red-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useOrderStore } from '../../stores/orderStore';

// Estado
const orderStore = useOrderStore();
const loading = ref(false);
const showConfirmModal = ref(false);

// Computed
const orders = computed(() => orderStore.getOrders());
const selectedOrders = computed(() => orderStore.getSelectedOrders());
const selectedCount = computed(() => selectedOrders.value.length);
const allSelected = computed(() => {
  return orders.value.length > 0 && selectedCount.value === orders.value.length;
});

// Métodos
const fetchOrders = async () => {
  loading.value = true;
  await orderStore.fetchOrders();
  loading.value = false;
};

const isSelected = (id: string) => {
  return selectedOrders.value.includes(id);
};

const toggleSelect = (id: string) => {
  orderStore.selectOrder(id, !isSelected(id));
};

const toggleSelectAll = (event) => {
  orderStore.selectAllOrders(event.target.checked);
};

const confirmDeleteSelected = () => {
  if (selectedCount.value > 0) {
    showConfirmModal.value = true;
  }
};

const deleteSelected = async () => {
  loading.value = true;
  showConfirmModal.value = false;
  
  try {
    const result = await orderStore.deleteMultipleOrders(selectedOrders.value);
    
    if (result.success) {
      alert(`${selectedCount.value} pedidos eliminados correctamente`);
    } else {
      alert(`Error al eliminar pedidos: ${result.error}`);
    }
  } catch (error) {
    console.error('Error al eliminar pedidos:', error);
    alert('Ocurrió un error al eliminar los pedidos');
  } finally {
    loading.value = false;
  }
};

const deleteOrder = async (id: string) => {
  if (!confirm('¿Estás seguro de que deseas eliminar este pedido?')) {
    return;
  }
  
  loading.value = true;
  
  try {
    const result = await orderStore.deleteOrder(id);
    
    if (result.success) {
      alert('Pedido eliminado correctamente');
    } else {
      alert(`Error al eliminar el pedido: ${result.error}`);
    }
  } catch (error) {
    console.error('Error al eliminar el pedido:', error);
    alert('Ocurrió un error al eliminar el pedido');
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getStatusName = (status: string): string => {
  const statuses = {
    'preparation': 'En preparación',
    'shipped': 'Enviado',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado'
  };
  
  return statuses[status] || status;
};

const getStatusClass = (status: string): string => {
  const classes = {
    'preparation': 'bg-yellow-100 text-yellow-800',
    'shipped': 'bg-blue-100 text-blue-800',
    'delivered': 'bg-green-100 text-green-800',
    'cancelled': 'bg-red-100 text-red-800'
  };
  
  return classes[status] || 'bg-gray-100 text-gray-800';
};

// Ciclo de vida
onMounted(async () => {
  await fetchOrders();
});
</script>

<style scoped>
/* Estilos específicos para móvil */
@media (max-width: 768px) {
  .order-manager {
    padding-bottom: 80px; /* Espacio para evitar que los botones flotantes tapen contenido */
  }
}
</style>
