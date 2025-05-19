import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Promotion, Product } from '../types';

interface PromotionManagerProps {
  onPromotionCreated?: () => void;
}

const PromotionManager: React.FC<PromotionManagerProps> = ({ onPromotionCreated }) => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [promotionForm, setPromotionForm] = useState({
    name: '',
    description: '',
    type: 'percentage', // 'percentage', 'fixed', '2x1', '3x2'
    value: 0,
    start_date: '',
    end_date: '',
    active: true,
    products: [] as string[]
  });

  useEffect(() => {
    fetchPromotions();
    fetchProducts();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*, products(*)');
      
      if (error) throw error;
      
      setPromotions(data || []);
    } catch (error) {
      console.error('Error al cargar promociones:', error);
      toast.error('Error al cargar promociones');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      
      if (error) throw error;
      
      setProducts(data || []);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast.error('Error al cargar los productos');
    }
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    
    // Extraer IDs de productos asociados
    const productIds = promotion.products?.map(product => product.id) || [];
    
    setPromotionForm({
      name: promotion.name || '',
      description: promotion.description || '',
      type: promotion.type || 'percentage',
      value: promotion.value || 0,
      start_date: promotion.start_date ? new Date(promotion.start_date).toISOString().split('T')[0] : '',
      end_date: promotion.end_date ? new Date(promotion.end_date).toISOString().split('T')[0] : '',
      active: promotion.active !== false,
      products: productIds
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
      products: []
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setPromotionForm(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'value') {
      setPromotionForm(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setPromotionForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProductSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setPromotionForm(prev => ({ ...prev, products: selectedOptions }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const promotionData = {
        name: promotionForm.name,
        description: promotionForm.description,
        type: promotionForm.type,
        value: promotionForm.value,
        start_date: promotionForm.start_date,
        end_date: promotionForm.end_date,
        active: promotionForm.active
      };
      
      let result;
      
      if (editingPromotion) {
        // Actualizar promoción existente
        result = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id);
      } else {
        // Crear nueva promoción
        result = await supabase
          .from('promotions')
          .insert([promotionData])
          .select();
      }
      
      if (result.error) throw result.error;
      
      // Obtener el ID de la promoción (existente o recién creada)
      const promotionId = editingPromotion ? editingPromotion.id : result.data?.[0]?.id;
      
      if (promotionId) {
        // Primero eliminar todas las relaciones existentes
        await supabase
          .from('promotion_products')
          .delete()
          .eq('promotion_id', promotionId);
        
        // Luego crear las nuevas relaciones
        if (promotionForm.products.length > 0) {
          const productRelations = promotionForm.products.map(productId => ({
            promotion_id: promotionId,
            product_id: productId
          }));
          
          const { error } = await supabase
            .from('promotion_products')
            .insert(productRelations);
          
          if (error) throw error;
        }
      }
      
      toast.success(editingPromotion ? 'Promoción actualizada' : 'Promoción creada');
      fetchPromotions();
      handleNewPromotion();
      
      if (onPromotionCreated) {
        onPromotionCreated();
      }
    } catch (error) {
      console.error('Error al guardar promoción:', error);
      toast.error('Error al guardar la promoción');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromotion = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta promoción?')) return;
    
    setLoading(true);
    try {
      // Primero eliminar las relaciones con productos
      await supabase
        .from('promotion_products')
        .delete()
        .eq('promotion_id', id);
      
      // Luego eliminar la promoción
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Promoción eliminada');
      fetchPromotions();
    } catch (error) {
      console.error('Error al eliminar promoción:', error);
      toast.error('Error al eliminar la promoción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="promotion-manager">
      <h2 className="text-2xl font-bold mb-4">Gestión de Promociones</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-3">
            {editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                name="name"
                value={promotionForm.name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea
                name="description"
                value={promotionForm.description}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Promoción</label>
              <select
                name="type"
                value={promotionForm.type}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              >
                <option value="percentage">Porcentaje de descuento</option>
                <option value="fixed">Valor fijo de descuento</option>
                <option value="2x1">2x1</option>
                <option value="3x2">3x2</option>
                <option value="3x1">3x1</option>
              </select>
            </div>
            
            {(promotionForm.type === 'percentage' || promotionForm.type === 'fixed') && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {promotionForm.type === 'percentage' ? 'Porcentaje (%)' : 'Valor ($)'}
                </label>
                <input
                  type="number"
                  name="value"
                  value={promotionForm.value}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  min="0"
                  max={promotionForm.type === 'percentage' ? "100" : undefined}
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de inicio</label>
              <input
                type="date"
                name="start_date"
                value={promotionForm.start_date}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de fin</label>
              <input
                type="date"
                name="end_date"
                value={promotionForm.end_date}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="active"
                checked={promotionForm.active}
                onChange={e => setPromotionForm(prev => ({ ...prev, active: e.target.checked }))}
                className="mr-2"
              />
              <label>Activa</label>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Productos</label>
              <select
                multiple
                name="products"
                value={promotionForm.products}
                onChange={handleProductSelection}
                className="w-full p-2 border rounded"
                size={5}
              >
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Mantén presionado Ctrl para seleccionar múltiples productos
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Guardando...' : editingPromotion ? 'Actualizar' : 'Crear'}
              </button>
              
              {editingPromotion && (
                <button
                  type="button"
                  onClick={handleNewPromotion}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold mb-3">Promociones Existentes</h3>
          
          {loading && <p>Cargando...</p>}
          
          {!loading && promotions.length === 0 && (
            <p className="text-gray-500">No hay promociones creadas</p>
          )}
          
          <div className="space-y-4">
            {promotions.map(promotion => (
              <div key={promotion.id} className="border p-4 rounded">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold">{promotion.name}</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditPromotion(promotion)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeletePromotion(promotion.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">{promotion.description}</p>
                
                <div className="mt-2 text-sm">
                  <p>
                    <span className="font-medium">Tipo:</span>{' '}
                    {promotion.type === 'percentage' ? 'Porcentaje' :
                     promotion.type === 'fixed' ? 'Valor fijo' :
                     promotion.type === '2x1' ? '2x1' :
                     promotion.type === '3x2' ? '3x2' :
                     promotion.type === '3x1' ? '3x1' : promotion.type}
                  </p>
                  
                  {(promotion.type === 'percentage' || promotion.type === 'fixed') && (
                    <p>
                      <span className="font-medium">Valor:</span>{' '}
                      {promotion.type === 'percentage' ? `${promotion.value}%` : `$${promotion.value}`}
                    </p>
                  )}
                  
                  {promotion.start_date && (
                    <p>
                      <span className="font-medium">Inicia:</span>{' '}
                      {new Date(promotion.start_date).toLocaleDateString()}
                    </p>
                  )}
                  
                  {promotion.end_date && (
                    <p>
                      <span className="font-medium">Termina:</span>{' '}
                      {new Date(promotion.end_date).toLocaleDateString()}
                    </p>
                  )}
                  
                  <p>
                    <span className="font-medium">Estado:</span>{' '}
                    <span className={promotion.active ? 'text-green-600' : 'text-red-600'}>
                      {promotion.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </p>
                  
                  {promotion.products && promotion.products.length > 0 && (
                    <div className="mt-2">
                      <span className="font-medium">Productos:</span>
                      <ul className="list-disc list-inside ml-2">
                        {promotion.products.map((product: any) => (
                          <li key={product.id} className="text-xs">
                            {product.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionManager;