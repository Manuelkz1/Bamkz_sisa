import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import {
  Plus,
  X,
  Edit,
  Trash2,
  Calendar,
  Tag,
  Package,
  ToggleLeft,
  ToggleRight,
  Save,
  ArrowLeft,
  Search
} from 'lucide-react';
import type { Product, Promotion } from '../types';
import { format } from 'date-fns';

export function PromotionManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const [promotionForm, setPromotionForm] = useState({
    name: '',
    type: '2x1' as '2x1' | '3x1' | '3x2',
    buy_quantity: 2,
    get_quantity: 1,
    total_price: '',
    is_active: true,
    start_date: '',
    end_date: '',
    products: [] as string[]
  });

  useEffect(() => {
    loadPromotions();
    loadProducts();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotions')
        .select(`
          *,
          products:promotion_products(
            product:products(id, name, price, images)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transformar los datos para que coincidan con la estructura esperada
      const formattedPromotions = data?.map(promo => {
        const productsList = promo.products?.map((item: any) => item.product) || [];
        return {
          ...promo,
          products: productsList
        };
      }) || [];
      
      setPromotions(formattedPromotions);
    } catch (error: any) {
      console.error('Error loading promotions:', error);
      toast.error('Error al cargar las promociones');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, images')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast.error('Error al cargar los productos');
    }
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    
    // Extraer IDs de productos asociados
    const productIds = promotion.products?.map(product => product.id) || [];
    
    setPromotionForm({
      name: promotion.name,
      type: promotion.type,
      buy_quantity: promotion.buy_quantity,
      get_quantity: promotion.get_quantity,
      total_price: promotion.total_price?.toString() || '',
      is_active: promotion.is_active,
      start_date: promotion.start_date ? new Date(promotion.start_date).toISOString().split('T')[0] : '',
      end_date: promotion.end_date ? new Date(promotion.end_date).toISOString().split('T')[0] : '',
      products: productIds
    });
    
    setSelectedProducts(productIds);
    setShowPromotionModal(true);
  };

  const handleNewPromotion = () => {
    setEditingPromotion(null);
    setPromotionForm({
      name: '',
      type: '2x1',
      buy_quantity: 2,
      get_quantity: 1,
      total_price: '',
      is_active: true,
      start_date: '',
      end_date: '',
      products: []
    });
    setSelectedProducts([]);
    setShowPromotionModal(true);
  };

  const handlePromotionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validaciones
      if (!promotionForm.name.trim()) {
        toast.error('El nombre de la promoción es obligatorio');
        return;
      }
      
      if (selectedProducts.length === 0) {
        toast.error('Debe seleccionar al menos un producto');
        return;
      }
      
      // Preparar datos para guardar
      const promotionData = {
        name: promotionForm.name.trim(),
        type: promotionForm.type,
        buy_quantity: parseInt(promotionForm.buy_quantity.toString()),
        get_quantity: parseInt(promotionForm.get_quantity.toString()),
        total_price: promotionForm.total_price ? parseFloat(promotionForm.total_price) : null,
        is_active: promotionForm.is_active,
        start_date: promotionForm.start_date || null,
        end_date: promotionForm.end_date || null,
      };

      let promotionId: string;
      
      if (editingPromotion) {
        // Actualizar promoción existente
        const { data, error } = await supabase
          .from('promotions')
          .update({
            ...promotionData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPromotion.id)
          .select();

        if (error) throw error;
        promotionId = editingPromotion.id;
        
        // Eliminar asociaciones de productos existentes
        const { error: deleteError } = await supabase
          .from('promotion_products')
          .delete()
          .eq('promotion_id', promotionId);
          
        if (deleteError) throw deleteError;
        
        toast.success('Promoción actualizada exitosamente');
      } else {
        // Crear nueva promoción
        const { data, error } = await supabase
          .from('promotions')
          .insert([promotionData])
          .select();

        if (error) throw error;
        promotionId = data[0].id;
        toast.success('Promoción creada exitosamente');
      }
      
      // Crear asociaciones de productos
      const productAssociations = selectedProducts.map(productId => ({
        promotion_id: promotionId,
        product_id: productId
      }));
      
      const { error: associationError } = await supabase
        .from('promotion_products')
        .insert(productAssociations);
        
      if (associationError) throw associationError;

      setShowPromotionModal(false);
      loadPromotions();
    } catch (error: any) {
      console.error('Error saving promotion:', error);
      toast.error(`Error al guardar la promoción: ${error.message}`);
    }
  };

  const handleDeletePromotion = async (promotionId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta promoción?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', promotionId);

      if (error) throw error;
      toast.success('Promoción eliminada exitosamente');
      loadPromotions();
    } catch (error: any) {
      console.error('Error deleting promotion:', error);
      toast.error('Error al eliminar la promoción');
    }
  };

  const handleToggleActive = async (promotion: Promotion) => {
    try {
      const { error } = await supabase
        .from('promotions')
        .update({ 
          is_active: !promotion.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', promotion.id);

      if (error) throw error;
      
      toast.success(`Promoción ${promotion.is_active ? 'desactivada' : 'activada'} exitosamente`);
      loadPromotions();
    } catch (error: any) {
      console.error('Error toggling promotion status:', error);
      toast.error('Error al cambiar el estado de la promoción');
    }
  };

  const handleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPromotionTypeLabel = (type: string) => {
    switch (type) {
      case '2x1': return 'Compra 2, paga 1';
      case '3x1': return 'Compra 3, paga 1';
      case '3x2': return 'Compra 3, paga 2';
      default: return type;
    }
  };

  const updateBuyGetQuantities = (type: '2x1' | '3x1' | '3x2') => {
    switch (type) {
      case '2x1':
        setPromotionForm(prev => ({ ...prev, buy_quantity: 2, get_quantity: 1 }));
        break;
      case '3x1':
        setPromotionForm(prev => ({ ...prev, buy_quantity: 3, get_quantity: 1 }));
        break;
      case '3x2':
        setPromotionForm(prev => ({ ...prev, buy_quantity: 3, get_quantity: 2 }));
        break;
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gestión de Promociones</h2>
        <button
          onClick={handleNewPromotion}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus size={18} className="mr-1" /> Nueva Promoción
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Cargando promociones...</div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No hay promociones creadas</p>
          <button
            onClick={handleNewPromotion}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Crear primera promoción
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fechas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promotions.map((promotion) => (
                <tr key={promotion.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{promotion.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getPromotionTypeLabel(promotion.type)}
                    </span>
                    {promotion.total_price && (
                      <div className="text-xs text-gray-500 mt-1">
                        Precio total: ${promotion.total_price}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {promotion.products && promotion.products.length > 0 ? (
                        <div>
                          <span className="font-medium">{promotion.products.length}</span> productos
                          <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                            {promotion.products.slice(0, 3).map(p => p.name).join(', ')}
                            {promotion.products.length > 3 && '...'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Sin productos</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {promotion.start_date || promotion.end_date ? (
                      <div className="text-sm text-gray-900">
                        {promotion.start_date && (
                          <div>Desde: {format(new Date(promotion.start_date), 'dd/MM/yyyy')}</div>
                        )}
                        {promotion.end_date && (
                          <div>Hasta: {format(new Date(promotion.end_date), 'dd/MM/yyyy')}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Sin fechas definidas</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        promotion.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {promotion.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleToggleActive(promotion)}
                      className={`text-blue-600 hover:text-blue-900 mr-3`}
                      title={promotion.is_active ? 'Desactivar' : 'Activar'}
                    >
                      {promotion.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                    <button
                      onClick={() => handleEditPromotion(promotion)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeletePromotion(promotion.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Promoción */}
      {showPromotionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  {editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
                </h3>
                <button
                  onClick={() => setShowPromotionModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <form onSubmit={handlePromotionSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre de la promoción
                    </label>
                    <input
                      type="text"
                      value={promotionForm.name}
                      onChange={(e) => setPromotionForm({ ...promotionForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Ej: Oferta de Verano 2x1"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de promoción
                    </label>
                    <select
                      value={promotionForm.type}
                      onChange={(e) => {
                        const type = e.target.value as '2x1' | '3x1' | '3x2';
                        setPromotionForm({ ...promotionForm, type });
                        updateBuyGetQuantities(type);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="2x1">2x1 (Compra 2, paga 1)</option>
                      <option value="3x1">3x1 (Compra 3, paga 1)</option>
                      <option value="3x2">3x2 (Compra 3, paga 2)</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio total (opcional)
                    </label>
                    <input
                      type="number"
                      value={promotionForm.total_price}
                      onChange={(e) => setPromotionForm({ ...promotionForm, total_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Precio total para la promoción"
                      step="0.01"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Si se establece, este precio reemplazará el cálculo automático basado en cantidades
                    </p>
                  </div>
                  
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de inicio (opcional)
                      </label>
                      <input
                        type="date"
                        value={promotionForm.start_date}
                        onChange={(e) => setPromotionForm({ ...promotionForm, start_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de fin (opcional)
                      </label>
                      <input
                        type="date"
                        value={promotionForm.end_date}
                        onChange={(e) => setPromotionForm({ ...promotionForm, end_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={promotionForm.is_active}
                        onChange={(e) => setPromotionForm({ ...promotionForm, is_active: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Promoción activa</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Productos en promoción
                    </label>
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                      <div className="p-2 bg-gray-50 border-b border-gray-300">
                        <div className="flex items-center">
                          <Search size={16} className="text-gray-400 mr-2" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full border-none focus:ring-0 text-sm"
                            placeholder="Buscar productos..."
                          />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2">
                        {filteredProducts.length === 0 ? (
                          <p className="text-center text-gray-500 py-4">No se encontraron productos</p>
                        ) : (
                          filteredProducts.map((product) => (
                            <div key={product.id} className="flex items-center py-2 border-b border-gray-100 last:border-b-0">
                              <input
                                type="checkbox"
                                id={`product-${product.id}`}
                                checked={selectedProducts.includes(product.id)}
                                onChange={() => handleProductSelection(product.id)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                              />
                              <label htmlFor={`product-${product.id}`} className="ml-2 flex items-center cursor-pointer">
                                {product.images && product.images.length > 0 && (
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-10 h-10 object-cover rounded mr-2"
                                  />
                                )}
                                <div>
                                  <div className="text-sm font-medium">{product.name}</div>
                                  <div className="text-xs text-gray-500">${product.price}</div>
                                </div>
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="p-2 bg-gray-50 border-t border-gray-300 text-sm">
                        {selectedProducts.length} productos seleccionados
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPromotionModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editingPromotion ? 'Actualizar Promoción' : 'Crear Promoción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
