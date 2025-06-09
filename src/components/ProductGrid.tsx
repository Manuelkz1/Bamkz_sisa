import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../stores/cartStore';
import { Product } from '../types/index';
import { toast } from 'react-hot-toast';
import { Search, Filter, X, Tag, ShoppingCart, Star, Truck } from 'lucide-react';
import { useDebounce } from 'use-debounce';

export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm] = useDebounce(searchInput, 300);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'newest'>('newest');
  const cartStore = useCartStore();

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

      const { data: productsData, error: productsError } = await query;

      if (productsError) throw productsError;

      // Fetch reviews for all products
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('product_id, rating')
        .eq('approved', true);

      if (reviewsError) throw reviewsError;

      // Calculate average ratings
      const productRatings = reviewsData.reduce((acc, review) => {
        if (!acc[review.product_id]) {
          acc[review.product_id] = { total: 0, count: 0 };
        }
        acc[review.product_id].total += review.rating;
        acc[review.product_id].count += 1;
        return acc;
      }, {} as Record<string, { total: number; count: number }>);

      // Add ratings to products
      const productsWithRatings = productsData.map(product => ({
        ...product,
        averageRating: productRatings[product.id] 
          ? productRatings[product.id].total / productRatings[product.id].count 
          : 0,
        reviewCount: productRatings[product.id]?.count || 0
      }));

      setProducts(productsWithRatings);

      // Get unique categories
      const uniqueCategories = Array.from(new Set(productsData.map(p => p.category).filter(Boolean)));
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

  const clearFilters = () => {
    setSearchInput('');
    setSelectedCategory('');
    setSortBy('newest');
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

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {products.map((product) => (
          <Link
            key={product.id}
            to={`/product/${product.id}`}
            className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105"
          >
            <div className="relative">
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-32 sm:h-48 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                }}
              />
              {product.available_colors && product.available_colors.length > 0 && (
                <div className="absolute top-2 right-2 bg-white rounded-full px-2 py-1 text-xs font-medium">
                  {product.available_colors.length} colores
                </div>
              )}
            </div>
            <div className="p-2 sm:p-4">
              <h3 className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
                {product.name}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                {product.description}
              </p>
              
              <div className="mt-2">
                {product.promotion ? (
                  <>
                    <span className="text-sm text-gray-500 line-through">
                      ${product.price.toFixed(2)}
                    </span>
                    <span className="text-lg font-bold text-red-600 ml-2">
                      ${product.promotion.total_price?.toFixed(2) || product.price.toFixed(2)}
                    </span>
                    {product.promotion.type && (
                      <div className="inline-flex items-center px-2 py-1 mt-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Tag className="h-3 w-3 mr-1" />
                        {product.promotion.type === '2x1' && 'Lleva 2, paga 1'}
                        {product.promotion.type === '3x1' && 'Lleva 3, paga 1'}
                        {product.promotion.type === '3x2' && 'Lleva 3, paga 2'}
                        {product.promotion.type === 'discount' && `${product.promotion.discount_percent || 20}% OFF`}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-lg font-bold text-gray-900">
                    ${product.price.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Días de envío */}
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <Truck className="h-4 w-4 mr-1 text-indigo-500" />
                <span>
                  Llega en {product.shipping_days || 3} días
                </span>
              </div>

              {product.reviewCount > 0 && (
                <div className="flex items-center mt-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(product.averageRating)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">
                    {product.averageRating.toFixed(1)} ({product.reviewCount})
                  </span>
                </div>
              )}

              {product.stock > 0 ? (
                <button
                  onClick={(e) => handleAddToCart(product, e)}
                  className="w-full mt-2 sm:mt-4 bg-indigo-600 text-white py-1 sm:py-2 px-2 sm:px-4 rounded hover:bg-indigo-700 transition-colors flex items-center justify-center text-xs sm:text-sm"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Agregar al carrito
                </button>
              ) : (
                <button
                  disabled
                  className="w-full mt-2 sm:mt-4 bg-gray-200 text-gray-500 py-1 sm:py-2 px-2 sm:px-4 rounded cursor-not-allowed flex items-center justify-center text-xs sm:text-sm"
                >
                  Agotado
                </button>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}