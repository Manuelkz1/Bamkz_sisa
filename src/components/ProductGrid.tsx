import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Search, Filter, X, Tag } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import type { Product, Promotion } from '../types';

export function ProductGrid() {
  const navigate = useNavigate();
  const cartStore = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [productPromotions, setProductPromotions] = useState<{[key: string]: Promotion}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'newest'>('newest');

  useEffect(() => {
    loadProducts();
  }, [searchTerm, selectedCategory, sortBy]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('products')
        .select('*');

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      switch (sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!data) {
        throw new Error('No se recibieron datos del servidor');
      }

      // Filter products based on allowed payment methods
      const filteredProducts = data.filter(product => {
        const methods = product.allowed_payment_methods || {
          cash_on_delivery: true,
          card: true
        };
        return methods.cash_on_delivery || methods.card;
      });

      setProducts(filteredProducts);
      const uniqueCategories = Array.from(new Set(data.map(p => p.category).filter(Boolean)));
      setCategories(uniqueCategories);
      
      // Cargar promociones activas para todos los productos
      if (filteredProducts.length > 0) {
        const productIds = filteredProducts.map(p => p.id);
        
        const { data: promotionsData, error: promotionsError } = await supabase
          .from('promotion_products')
          .select(`
            product_id,
            promotion:promotions(
              id, name, type, buy_quantity, get_quantity, total_price, is_active, 
              start_date, end_date, created_at, updated_at
            )
          `)
          .in('product_id', productIds)
          .filter('promotion.is_active', 'eq', true)
          .filter('promotion.start_date', 'lte', new Date().toISOString())
          .filter('promotion.end_date', 'gte', new Date().toISOString());
          
        if (!promotionsError && promotionsData) {
          const promotionsMap: {[key: string]: Promotion} = {};
          
          promotionsData.forEach((item: any) => {
            if (item.promotion && item.product_id) {
              promotionsMap[item.product_id] = item.promotion;
            }
          });
          
          setProductPromotions(promotionsMap);
        }
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
      setError('Error al cargar los productos');
      toast.error('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product, event: React.MouseEvent) => {
    event.preventDefault();
    cartStore.addItem(product, 1);
    toast.success('Producto agregado al carrito');
  };

  const handleBuyNow = (product: Product, event: React.MouseEvent) => {
    event.preventDefault();
    navigate(`/product/${product.id}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSortBy('newest');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-1/3 h-12 bg-gray-200 rounded-md animate-pulse"></div>
          <div className="w-full sm:w-1/3 h-12 bg-gray-200 rounded-md animate-pulse"></div>
          <div className="w-full sm:w-1/3 h-12 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
              <div className="h-48 bg-gray-200 rounded-md mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 p-4 rounded-lg inline-block">
          <p className="text-red-800 mb-4">{error}</p>
          <button
            onClick={loadProducts}
            className="bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar productos..."
            className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Todas las categorías</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="newest">Más recientes</option>
          <option value="price_asc">Precio: Menor a mayor</option>
          <option value="price_desc">Precio: Mayor a menor</option>
        </select>
        {(searchTerm || selectedCategory || sortBy !== 'newest') && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
          >
            <X className="h-5 w-5 mr-1" />
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105"
          >
            <div className="relative">
              <img
                src={product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80'}
                alt={product.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
                }}
              />
              {product.available_colors && product.available_colors.length > 0 && (
                <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 shadow-md">
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-1">
                      {product.available_colors.slice(0, 3).map((color, index) => (
                        <div
                          key={`${product.id}-${color}`}
                          className="w-3 h-3 rounded-full ring-1 ring-white"
                          style={{
                            backgroundColor: getColorHex(color),
                            zIndex: product.available_colors!.length - index
                          }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  {productPromotions[product.id] ? (
                    <>
                      {productPromotions[product.id].type === '2x1' || productPromotions[product.id].type === '3x1' || productPromotions[product.id].type === '3x2' ? (
                        <>
                          <span className="text-2xl font-bold text-indigo-600">${product.price.toFixed(2)}</span>
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Tag className="h-3 w-3 mr-1" />
                            {productPromotions[product.id].type === '2x1' && 'Compra 2, paga 1'}
                            {productPromotions[product.id].type === '3x1' && 'Compra 3, paga 1'}
                            {productPromotions[product.id].type === '3x2' && 'Compra 3, paga 2'}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500 line-through mr-2">${product.price.toFixed(2)}</span>
                            <span className="text-2xl font-bold text-red-600">
                              ${productPromotions[product.id].total_price ? productPromotions[product.id].total_price.toFixed(2) : (product.price * 0.8).toFixed(2)}
                            </span>
                          </div>
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Tag className="h-3 w-3 mr-1" />
                            {productPromotions[product.id].total_price ? 'Precio especial' : '20% de descuento'}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-indigo-600">${product.price.toFixed(2)}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleAddToCart(product, e)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => handleBuyNow(product, e)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Comprar
                  </button>
                </div>
              </div>
              {product.available_colors && product.available_colors.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {product.available_colors.map(color => (
                    <span
                      key={`${product.id}-${color}-tag`}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                    >
                      <div
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: getColorHex(color) }}
                      />
                      {color}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function getColorHex(colorName: string): string {
  const colorMap: { [key: string]: string } = {
    'Rojo': '#EF4444',
    'Azul': '#3B82F6',
    'Verde': '#10B981',
    'Negro': '#111827',
    'Blanco': '#F9FAFB',
    'Gris': '#6B7280',
    'Amarillo': '#F59E0B',
    'Naranja': '#F97316',
    'Morado': '#8B5CF6',
    'Rosa': '#EC4899',
    'Marrón': '#92400E',
    'Beige': '#FDE68A'
  };
  return colorMap[colorName] || '#CBD5E1';
}