// PromotionManager.vue
<template>
  <div class="promotion-manager">
    <h2 class="text-2xl font-bold mb-4">Gestión de Promociones</h2>
    
    <!-- Formulario de creación/edición -->
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <h3 class="text-lg font-semibold mb-3">{{ isEditing ? 'Editar Promoción' : 'Crear Nueva Promoción' }}</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input 
            v-model="form.name" 
            type="text" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre de la promoción"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select 
            v-model="form.type" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="percentage">Porcentaje de descuento</option>
            <option value="fixed">Descuento fijo</option>
            <option value="discount">Descuento general</option>
            <option value="2x1">2x1</option>
            <option value="3x2">3x2</option>
            <option value="3x1">3x1</option>
          </select>
        </div>
        
        <div v-if="['percentage', 'fixed', 'discount'].includes(form.type)">
          <label class="block text-sm font-medium text-gray-700 mb-1">Valor</label>
          <input 
            v-model.number="form.value" 
            type="number" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Valor del descuento"
            min="0"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea 
            v-model="form.description" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descripción de la promoción"
            rows="2"
          ></textarea>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
          <input 
            v-model="form.start_date" 
            type="date" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Fecha de fin</label>
          <input 
            v-model="form.end_date" 
            type="date" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div class="flex items-center">
          <input 
            v-model="form.active" 
            type="checkbox" 
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label class="ml-2 block text-sm text-gray-900">Activa</label>
        </div>
      </div>
      
      <div class="mt-4 flex justify-end space-x-3">
        <button 
          v-if="isEditing"
          @click="cancelEdit" 
          class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancelar
        </button>
        <button 
          @click="savePromotion" 
          class="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          :disabled="loading"
        >
          {{ isEditing ? 'Actualizar' : 'Crear' }} Promoción
        </button>
      </div>
    </div>
    
    <!-- Lista de promociones -->
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="text-lg font-semibold mb-3">Promociones Existentes</h3>
      
      <div v-if="loading" class="text-center py-4">
        <p>Cargando promociones...</p>
      </div>
      
      <div v-else-if="promotions.length === 0" class="text-center py-4">
        <p>No hay promociones creadas.</p>
      </div>
      
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="promotion in promotions" :key="promotion.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ promotion.name }}</div>
                <div class="text-sm text-gray-500">{{ promotion.description }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">{{ getPromotionTypeName(promotion.type) }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span v-if="['percentage', 'discount'].includes(promotion.type)" class="text-sm text-gray-900">
                  {{ promotion.value }}%
                </span>
                <span v-else-if="promotion.type === 'fixed'" class="text-sm text-gray-900">
                  ${{ promotion.value }}
                </span>
                <span v-else class="text-sm text-gray-900">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                    promotion.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ promotion.active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div v-if="promotion.start_date">Desde: {{ formatDate(promotion.start_date) }}</div>
                <div v-if="promotion.end_date">Hasta: {{ formatDate(promotion.end_date) }}</div>
                <div v-if="!promotion.start_date && !promotion.end_date">Sin límite de fechas</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button 
                  @click="editPromotion(promotion)" 
                  class="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Editar
                </button>
                <button 
                  @click="togglePromotionStatus(promotion.id)" 
                  class="text-yellow-600 hover:text-yellow-900 mr-3"
                >
                  {{ promotion.active ? 'Desactivar' : 'Activar' }}
                </button>
                <button 
                  @click="deletePromotion(promotion.id)" 
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
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { usePromotionStore, type Promotion } from '../../stores/promotionStore';

// Estado
const promotionStore = usePromotionStore();
const loading = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);

// Formulario
const form = ref<Promotion>({
  name: '',
  description: '',
  type: 'percentage',
  value: 0,
  active: true,
  start_date: '',
  end_date: '',
  product_ids: [],
  category_ids: []
});

// Computed
const promotions = computed(() => promotionStore.getPromotions());

// Métodos
const resetForm = () => {
  form.value = {
    name: '',
    description: '',
    type: 'percentage',
    value: 0,
    active: true,
    start_date: '',
    end_date: '',
    product_ids: [],
    category_ids: []
  };
  isEditing.value = false;
  editingId.value = null;
};

const savePromotion = async () => {
  loading.value = true;
  
  try {
    if (isEditing.value && editingId.value) {
      // Actualizar promoción existente
      const result = await promotionStore.updatePromotion(editingId.value, form.value);
      
      if (result.success) {
        alert('Promoción actualizada correctamente');
        resetForm();
      } else {
        alert(`Error al actualizar la promoción: ${result.error}`);
      }
    } else {
      // Crear nueva promoción
      const result = await promotionStore.createPromotion(form.value);
      
      if (result.success) {
        alert('Promoción creada correctamente');
        resetForm();
      } else {
        alert(`Error al crear la promoción: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('Error al guardar la promoción:', error);
    alert('Ocurrió un error al guardar la promoción');
  } finally {
    loading.value = false;
  }
};

const editPromotion = (promotion: Promotion) => {
  form.value = { ...promotion };
  isEditing.value = true;
  editingId.value = promotion.id;
};

const cancelEdit = () => {
  resetForm();
};

const deletePromotion = async (id: string) => {
  if (!confirm('¿Estás seguro de que deseas eliminar esta promoción?')) {
    return;
  }
  
  loading.value = true;
  
  try {
    const result = await promotionStore.deletePromotion(id);
    
    if (result.success) {
      alert('Promoción eliminada correctamente');
    } else {
      alert(`Error al eliminar la promoción: ${result.error}`);
    }
  } catch (error) {
    console.error('Error al eliminar la promoción:', error);
    alert('Ocurrió un error al eliminar la promoción');
  } finally {
    loading.value = false;
  }
};

const togglePromotionStatus = async (id: string) => {
  loading.value = true;
  
  try {
    const result = await promotionStore.togglePromotionStatus(id);
    
    if (result.success) {
      alert('Estado de la promoción actualizado correctamente');
    } else {
      alert(`Error al actualizar el estado de la promoción: ${result.error}`);
    }
  } catch (error) {
    console.error('Error al actualizar el estado de la promoción:', error);
    alert('Ocurrió un error al actualizar el estado de la promoción');
  } finally {
    loading.value = false;
  }
};

const getPromotionTypeName = (type: string): string => {
  const types = {
    percentage: 'Porcentaje',
    fixed: 'Monto fijo',
    discount: 'Descuento',
    '2x1': '2x1',
    '3x2': '3x2',
    '3x1': '3x1'
  };
  
  return types[type] || type;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Ciclo de vida
onMounted(async () => {
  loading.value = true;
  await promotionStore.fetchPromotions();
  loading.value = false;
});
</script>
