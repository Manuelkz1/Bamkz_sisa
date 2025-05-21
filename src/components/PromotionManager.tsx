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
      console.log("Cargando promociones...");
      
      // Primero obtenemos las promociones
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select('*');
      
      if (promotionsError) throw promotionsError;
      
      if (!promotionsData || promotionsData.length === 0) {
        console.log("No se encontraron promociones");
        setPromotions([]);
        setLoading(false);
        return;
      }
      
      console.log(`Promociones encontradas: ${promotionsData.length}`);
      
      // Para cada promoción, obtenemos sus productos asociados
      const promotionsWithProducts = await Promise.all(
        promotionsData.map(async (promotion) => {
          // Obtenemos las relaciones promoción-producto
          const { data: relationData, error: relationError } = await supabase
            .from('promotion_products')
            .select('product_id')
            .eq('promotion_id', promotion.id);
            
          if (relationError) {
            console.error(`Error al obtener relaciones para promoción ${promotion.id}:`, relationError);
            return { ...promotion, products: [] };
          }
          
          if (!relationData || relationData.length === 0) {
            return { ...promotion, products: [] };
          }
          
          // Obtenemos los detalles de los productos
          const productIds = relationData.map(rel => rel.product_id);
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .in('id', productIds);
            
          if (productsError) {
            console.error(`Error al obtener productos para promoción ${promotion.id}:`, productsError);
            return { ...promotion, products: [] };
          }
          
          return { ...promotion, products: productsData || [] };
        })
      );
      
      console.log("Promociones con productos:", promotionsWithProducts);
      setPromotions(promotionsWithProducts);
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
      console.log("Guardando promoción con datos:", promotionForm);
      
      // Validar datos obligatorios
      if (!promotionForm.name.trim()) {
        toast.error('El nombre de la promoción es obligatorio');
        setLoading(false);
        return;
      }
      
      if ((promotionForm.type === 'percentage' || promotionForm.type === 'fixed') && 
          (isNaN(promotionForm.value) || promotionForm.value <= 0)) {
        toast.error('El valor del descuento debe ser mayor que cero');
        setLoading(false);
        return;
      }
      
      // Preparar datos para guardar
      const promotionData = {
        name: promotionForm.name.trim(),
        description: promotionForm.description.trim(),
        type: promotionForm.type,
        value: promotionForm.value,
        start_date: promotionForm.start_date || null,
        end_date: promotionForm.end_date || null,
        active: promotionForm.active,
        updated_at: new Date().toISOString()
      };
      
      let promotionId;
      
      if (editingPromotion) {
        // Actualizar promoción existente
        console.log(`Actualizando promoción existente ID: ${editingPromotion.id}`);
        const { error } = await supabase
          .from('promotions')
          .update(promotionData)
          .eq('id', editingPromotion.id);
        
        if (error) {
          console.error("Error al actualizar promoción:", error);
          throw error;
        }
        
        promotionId = editingPromotion.id;
      } else {
        // Crear nueva promoción
        console.log("Creando nueva promoción");
        const { data, error } = await supabase
          .from('promotions')
          .insert([{
            ...promotionData,
            created_at: new Date().toISOString()
          }])
          .select();
        
        if (error) {
          console.error("Error al crear promoción:", error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error("No se recibió ID de la promoción creada");
        }
        
        promotionId = data[0].id;
        console.log(`Nueva promoción creada con ID: ${promotionId}`);
      }
      
      // Gestionar relaciones con productos
      if (promotionId) {
        // Primero eliminar todas las relaciones existentes
        console.log(`Eliminando relaciones existentes para promoción ID: ${promotionId}`);
        const { error: deleteError } = await supabase
          .from('promotion_products')
          .delete()
          .eq('promotion_id', promotionId);
        
        if (deleteError) {
          console.error("Error al eliminar relaciones existentes:", deleteError);
          throw deleteError;
        }
        
        // Luego crear las nuevas relaciones
        if (promotionForm.products.length > 0) {
          console.log(`Creando ${promotionForm.products.length} nuevas relaciones con productos`);
          const productRelations = promotionForm.products.map(productId => ({
            promotion_id: promotionId,
            product_id: productId
          }));
          
          const { error: insertError } = await supabase
            .from('promotion_products')
            .insert(productRelations);
          
          if (insertError) {
            console.error("Error al crear relaciones con productos:", insertError);
            throw insertError;
          }
        }
      }
      
      toast.success(editingPromotion ? 'Promoción actualizada exitosamente' : 'Promoción creada exitosamente');
      
      // Recargar promociones para actualizar la lista
      await fetchPromotions();
      
      // Limpiar formulario
      handleNewPromotion();
      
      if (onPromotionCreated) {
        onPromotionCreated();
      }
    } catch (error) {
      console.error('Error al guardar promoción:', error);
      toast.error('Error al guardar la promoción. Por favor, intente nuevamente.');
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
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4 text-indigo-700 border-b pb-2">
            {editingPromotion ? '✏️ Editar Promoción' : '✨ Nueva Promoción'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Nombre de la promoción</label>
              <input
                type="text"
                name="name"
                value={promotionForm.name}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ej: Descuento de verano"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Descripción</label>
              <textarea
                name="description"
                value={promotionForm.description}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Describe brevemente esta promoción..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Tipo de Promoción</label>
              <select
                name="type"
                value={promotionForm.type}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="percentage">Porcentaje de descuento (%)</option>
                <option value="fixed">Valor fijo de descuento ($)</option>
                <option value="2x1">2x1 (Lleva 2, paga 1)</option>
                <option value="3x2">3x2 (Lleva 3, paga 2)</option>
                <option value="3x1">3x1 (Lleva 3, paga 1)</option>
              </select>
            </div>
            
            {(promotionForm.type === 'percentage' || promotionForm.type === 'fixed') && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  {promotionForm.type === 'percentage' ? 'Porcentaje de descuento (%)' : 'Valor del descuento ($)'}
                </label>
                <input
                  type="number"
                  name="value"
                  value={promotionForm.value}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                  max={promotionForm.type === 'percentage' ? "100" : undefined}
                  placeholder={promotionForm.type === 'percentage' ? "Ej: 20" : "Ej: 1000"}
                  required
                />
                {promotionForm.type === 'percentage' && promotionForm.value > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Esto aplicará un {promotionForm.value}% de descuento a los productos seleccionados.
                  </p>
                )}
                {promotionForm.type === 'fixed' && promotionForm.value > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Esto descontará ${promotionForm.value} del precio de los productos seleccionados.
                  </p>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Fecha de inicio</label>
                <input
                  type="date"
                  name="start_date"
                  value={promotionForm.start_date}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Dejar en blanco para activar inmediatamente</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Fecha de fin</label>
                <input
                  type="date"
                  name="end_date"
                  value={promotionForm.end_date}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Dejar en blanco para no establecer fecha de caducidad</p>
              </div>
            </div>
            
            <div className="flex items-center bg-gray-50 p-3 rounded-md">
              <input
                type="checkbox"
                id="active-checkbox"
                name="active"
                checked={promotionForm.active}
                onChange={e => setPromotionForm(prev => ({ ...prev, active: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="active-checkbox" className="ml-2 text-sm text-gray-700">
                Promoción activa
              </label>
              <div className={`ml-2 w-3 h-3 rounded-full ${promotionForm.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Productos aplicables</label>
              <div className="border border-gray-300 rounded-md p-1 bg-white">
                <select
                  multiple
                  name="products"
                  value={promotionForm.products}
                  onChange={handleProductSelection}
                  className="w-full p-2 border-0 focus:ring-0 focus:outline-none"
                  size={6}
                >
                  {products.map(product => (
                    <option key={product.id} value={product.id} className="p-2 hover:bg-gray-100">
                      {product.name} - ${product.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-gray-500">
                  Mantén presionado Ctrl (o Cmd en Mac) para seleccionar múltiples productos
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {promotionForm.products.length === 0 
                  ? "No hay productos seleccionados" 
                  : `${promotionForm.products.length} producto(s) seleccionado(s)`}
              </p>
            </div>
            
            <div className="flex space-x-3 pt-3 border-t">
              <button
                type="submit"
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </span>
                ) : (
                  <span>{editingPromotion ? 'Actualizar promoción' : 'Crear promoción'}</span>
                )}
              </button>
              
              {editingPromotion && (
                <button
                  type="button"
                  onClick={handleNewPromotion}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold mb-4 text-indigo-700 border-b pb-2">Promociones Existentes</h3>
          
          {loading && (
            <div className="flex justify-center items-center h-40">
              <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
          
          {!loading && promotions.length === 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">No hay promociones creadas</p>
              <p className="text-sm text-gray-400 mt-1">Crea tu primera promoción usando el formulario</p>
            </div>
          )}
          
          <div className="space-y-4">
            {promotions.map(promotion => (
              <div key={promotion.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className={`px-4 py-2 ${promotion.active ? 'bg-green-50' : 'bg-red-50'} border-b border-gray-200 flex justify-between items-center`}>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${promotion.active ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                    <span className={`text-sm font-medium ${promotion.active ? 'text-green-700' : 'text-red-700'}`}>
                      {promotion.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {promotion.start_date && promotion.end_date ? (
                      `${new Date(promotion.start_date).toLocaleDateString()} - ${new Date(promotion.end_date).toLocaleDateString()}`
                    ) : promotion.start_date ? (
                      `Desde ${new Date(promotion.start_date).toLocaleDateString()}`
                    ) : promotion.end_date ? (
                      `Hasta ${new Date(promotion.end_date).toLocaleDateString()}`
                    ) : (
                      'Sin fechas definidas'
                    )}
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg text-gray-800">{promotion.name}</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditPromotion(promotion)}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeletePromotion(promotion.id)}
                        className="text-red-600 hover:text-red-800 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                  
                  {promotion.description && (
                    <p className="text-sm text-gray-600 mt-1">{promotion.description}</p>
                  )}
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {promotion.type === 'percentage' ? `${promotion.value}% de descuento` :
                       promotion.type === 'fixed' ? `$${promotion.value} de descuento` :
                       promotion.type === '2x1' ? '2x1' :
                       promotion.type === '3x2' ? '3x2' :
                       promotion.type === '3x1' ? '3x1' : promotion.type}
                    </span>
                    
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {promotion.products?.length || 0} producto(s)
                    </span>
                  </div>
                  
                  {promotion.products && promotion.products.length > 0 && (
                    <div className="mt-3 bg-gray-50 p-3 rounded-md">
                      <p className="text-xs font-medium text-gray-700 mb-1">Productos con esta promoción:</p>
                      <div className="max-h-24 overflow-y-auto">
                        {promotion.products.map((product: any) => (
                          <div key={product.id} className="text-xs py-1 border-b border-gray-100 last:border-0 flex justify-between">
                            <span>{product.name}</span>
                            <span className="text-gray-500">${product.price?.toFixed(2) || '0.00'}</span>
                          </div>
                        ))}
                      </div>
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