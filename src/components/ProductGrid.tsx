import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../stores/cartStore';
import { Product } from '../types/index';

export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cartStore = useCartStore();

  const loadProducts = async () => {
    try {
      setError(null);
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

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
    } catch (error: any) {
      console.error('Error loading products:', error);
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={loadProducts}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          <Link to={`/product/${product.id}`} className="block">
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 truncate">
                {product.name}
              </h3>
              <p className="text-xl font-bold text-blue-600 mt-2">
                ${product.price.toFixed(2)}
              </p>
              
              {product.reviewCount > 0 && (
                <div className="flex items-center mt-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-lg ${
                          star <= Math.round(product.averageRating)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="ml-2 text-sm text-gray-600">
                    {product.averageRating.toFixed(1)} ({product.reviewCount})
                  </span>
                </div>
              )}

              {product.stock > 0 ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    cartStore.addItem(product, 1);
                  }}
                  className="w-full mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
                >
                  Agregar al carrito
                </button>
              ) : (
                <p className="w-full mt-4 text-center text-red-500 py-2">
                  Agotado
                </p>
              )}
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}