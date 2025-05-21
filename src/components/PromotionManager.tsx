import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Promotion, Product } from '../types';
import { usePromotionStore } from '../stores/promotionStore';

interface PromotionManagerProps {
  onPromotionCreated?: () => void;
}

const PromotionManager: React.FC<PromotionManagerProps> = ({ onPromotionCreated }) => {
  const promotionStore = usePromotionStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [promotionForm, setPromotionForm] = useState({
    name: '',
    description: '',
    type: 'percentage' as Promotion['type'],
    value: 0,
    start_date: '',
    end_date: '',
    active: true,
    product_ids: [] as string[],
    buy_quantity: 1,
    get_quantity: 1
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        promotionStore.fetchPromotions(),
        fetchProducts()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error al cargar los productos');
    }
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setPromotionForm({
      name: promotion.name,
      description: promotion.description || '',
      type: promotion.type,
      value: promotion.value || 0,
      start_date: promotion.start_date ? new Date(promotion.start_date).toISOString().split('T')[0] : '',
      end_date: promotion.end_date ? new Date(promotion.end_date).toISOString().split('T')[0] : '',
      active: promotion.active,
      product_ids: promotion.product_ids || [],
      buy_quantity: promotion.buy_quantity || 1,
      get_quantity: promotion.get_quantity || 1
    });
  };

  const handleNewPromotion = () => {
    setEditingPromotion(null);
    setPromotionForm({
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      start_date: '',
      end_date: '',
      active: true,
      product_ids: [],
      buy_quantity: 1,
      get_quantity: 1
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!promotionForm.name.trim()) {
        toast.error('El nombre de la promoción es obligatorio');
        return;
      }

      if (promotionForm.type === 'percentage' && (promotionForm.value <= 0 || promotionForm.value > 100)) {
        toast.error('El porcentaje debe estar entre 1 y 100');
        return;
      }

      if (promotionForm.type === 'fixed' && promotionForm.value <= 0) {
        toast.error('El valor del descuento debe ser mayor que 0');
        return;
      }

      if (promotionForm.product_ids.length === 0) {
        toast.error('Debes seleccionar al menos un producto');
        return;
      }

      const promotionData: Promotion = {
        name: promotionForm.name.trim(),
        description: promotionForm.description.trim(),
        type: promotionForm.type,
        value: promotionForm.value,
        active: promotionForm.active,
        start_date: promotionForm.start_date || undefined,
        end_date: promotionForm.end_date || undefined,
        product_ids: promotionForm.product_ids,
        buy_quantity: promotionForm.buy_quantity,
        get_quantity: promotionForm.get_quantity
      };

      let result;
      if (editingPromotion) {
        result = await promotionStore.updatePromotion(editingPromotion.id!, promotionData);
      } else {
        result = await promotionStore.createPromotion(promotionData);
      }

      if (result.success) {
        toast.success(editingPromotion ? 'Promoción actualizada' : 'Promoción creada');
        handleNewPromotion();
        if (onPromotionCreated) {
          onPromotionCreated();
        }
      } else {
        toast.error(result.error || 'Error al guardar la promoción');
      }
    } catch (error: any) {
      console.error('Error saving promotion:', error);
      toast.error('Error al guardar la promoción');
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta promoción?')) {
      return;
    }

    try {
      const result = await promotionStore.deletePromotion(id);
      if (result.success) {
        toast.success('Promoción eliminada');
      } else {
        toast.error(result.error || 'Error al eliminar la promoción');
      }
    } catch (error) {
      console.error('Error deleting promotion:', error);
      toast.error('Error al eliminar la promoción');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Gestión de Promociones</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={promotionForm.name}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                value={promotionForm.description}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Promoción</label>
              <select
                value={promotionForm.type}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, type: e.target.value as Promotion['type'] }))}
                className="w-full p-2 border rounded"
              >
                <option value="percentage">Porcentaje de descuento</option>
                <option value="fixed">Descuento fijo</option>
                <option value="2x1">2x1</option>
                <option value="3x2">3x2</option>
                <option value="3x1">3x1</option>
              </select>
            </div>

            {(promotionForm.type === 'percentage' || promotionForm.type === 'fixed') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {promotionForm.type === 'percentage' ? 'Porcentaje de descuento' : 'Valor del descuento'}
                </label>
                <input
                  type="number"
                  value={promotionForm.value}
                  onChange={(e) => setPromotionForm(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  max={promotionForm.type === 'percentage' ? "100" : undefined}
                  step="0.01"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            )}

            {['2x1', '3x2', '3x1'].includes(promotionForm.type) && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Comprar (cantidad)</label>
                  <input
                    type="number"
                    value={promotionForm.buy_quantity}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, buy_quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    min="1"
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Llevar (cantidad)</label>
                  <input
                    type="number"
                    value={promotionForm.get_quantity}
                    onChange={(e) => setPromotionForm(prev => ({ ...prev, get_quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                    min="1"
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Fecha de inicio</label>
              <input
                type="date"
                value={promotionForm.start_date}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fecha de fin</label>
              <input
                type="date"
                value={promotionForm.end_date}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Productos</label>
              <select
                multiple
                value={promotionForm.product_ids}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setPromotionForm(prev => ({ ...prev, product_ids: values }));
                }}
                className="w-full p-2 border rounded"
                size={5}
              >
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - ${product.price}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Mantén presionada la tecla Ctrl para seleccionar múltiples productos
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={promotionForm.active}
                onChange={(e) => setPromotionForm(prev => ({ ...prev, active: e.target.checked }))}
                className="mr-2"
              />
              <label className="text-sm font-medium">Promoción activa</label>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingPromotion ? 'Actualizar' : 'Crear'} Promoción
              </button>
              
              {editingPromotion && (
                <button
                  type="button"
                  onClick={handleNewPromotion}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Promociones Existentes</h3>
          
          <div className="space-y-4">
            {promotionStore.promotions.map(promotion => (
              <div
                key={promotion.id}
                className="border rounded p-4 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{promotion.name}</h4>
                    {promotion.description && (
                      <p className="text-sm text-gray-600">{promotion.description}</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditPromotion(promotion)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletePromotion(promotion.id!)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="text-sm">
                  <p>
                    Tipo: {promotion.type === 'percentage' ? `${promotion.value}% de descuento` :
                          promotion.type === 'fixed' ? `$${promotion.value} de descuento` :
                          promotion.type === '2x1' ? `Lleva ${promotion.get_quantity}, paga ${promotion.buy_quantity}` :
                          promotion.type === '3x2' ? `Lleva ${promotion.get_quantity}, paga ${promotion.buy_quantity}` :
                          `Lleva ${promotion.get_quantity}, paga ${promotion.buy_quantity}`}
                  </p>
                  <p>
                    Estado: <span className={promotion.active ? 'text-green-600' : 'text-red-600'}>
                      {promotion.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </p>
                  {promotion.start_date && (
                    <p>Inicio: {new Date(promotion.start_date).toLocaleDateString()}</p>
                  )}
                  {promotion.end_date && (
                    <p>Fin: {new Date(promotion.end_date).toLocaleDateString()}</p>
                  )}
                  <p>
                    Productos: {promotion.product_ids?.length || 0} seleccionados
                  </p>
                </div>
              </div>
            ))}

            {promotionStore.promotions.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No hay promociones creadas
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionManager;