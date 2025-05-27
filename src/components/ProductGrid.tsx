import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ShoppingCart, Search, Filter, X, Tag } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import type { Product } from '../types/index';
import { useDebounce } from 'use-debounce';

export function ProductGrid() {
  const navigate = useNavigate();
  const cartStore = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm] = useDebounce(searchInput, 300);
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

      // Load promotions for products
      const productIds = filteredProducts.map(p => p.id);
      
      try {
        const { data: promotionProducts, error: promotionError } = await supabase
          .from('promotion_products')
          .select(`
            product_id,
            promotion:promotions(*)
          `)
          .in('product_id', productIds)
          .filter('promotion.active', 'eq', true)
          .filter('promotion.start_date', 'lte', new Date().toISOString())
          .filter('promotion.end_date', 'gte', new Date().toISOString());
          
        if (!promotionError && promotionProducts) {
          // Add promotion data to products
          const productsWithPromotions = filteredProducts.map(product => {
            const productPromotion = promotionProducts.find(pp => pp.product_id === product.id);
            if (productPromotion && productPromotion.promotion) {
              return {
                ...product,
                promotion: productPromotion.promotion
              };
            }
            return product;
          });
          
          setProducts(productsWithPromotions);
        } else {
          setProducts(filteredProducts);
        }
      } catch (error) {
        console.error('Error loading promotions:', error);
        setProducts(filteredProducts);
      }

      const uniqueCategories = Array.from(new Set(data.map(p => p.category).filter(Boolean)));
      setCategories(uniqueCategories);
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
    setSearchInput('');
    setSelectedCategory('');
    setSortBy('newest');
  };

  const getPromotionalPrice = (product: Product) => {
    if (!product.promotion) return null;

    if (product.promotion.type === 'discount' && product.promotion.total_price) {
      return product.promotion.total_price;
    }

    return null;
  };

  const getPromotionLabel = (product: Product) => {
    if (!product.promotion) return null;

    switch (product.promotion.type) {
      case '2x1':
        return 'Lleva 2, paga 1';
      case '3x1':
        return 'Lleva 3, paga 1';
      case '3x2':
        return 'Lleva 3, paga 2';
      case 'discount':
        if (product.promotion.total_price) {
          const discount = Math.round((1 - (product.promotion.total_price / product.price)) * 100);
          return `${discount}% OFF`;
        }
        return null;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
            <div className="h-48 bg-gray-200 rounded-md mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
        {(searchInput || selectedCategory || sortBy !== 'newest') && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
          >
            <X className="h-5 w-5 mr-1" />
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105"
          >
            <div className="relative">
              <img
                src={product.images?.[0]}
                alt={product.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                }}
              />
              {product.available_colors && product.available_colors.length > 0 && (
                <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-xs">
                  {product.available_colors.length} colores
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  {product.promotion ? (
                    <>
                      <span className="text-sm text-gray-500 line-through">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className="text-lg font-bold text-red-600">
                        ${getPromotionalPrice(product)?.toFixed(2) || product.price.toFixed(2)}
                      </span>
                      {getPromotionLabel(product) && (
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Tag className="h-3 w-3 mr-1" />
                          {getPromotionLabel(product)}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      ${product.price.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => handleAddToCart(product, e)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => handleBuyNow(product, e)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Comprar
                  </button>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}