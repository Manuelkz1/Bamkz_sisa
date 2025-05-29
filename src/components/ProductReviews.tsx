import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Review } from '../types/index';
import { Star, StarHalf } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCanReview, setUserCanReview] = useState(false);
  const [userReviewed, setUserReviewed] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: ''
  });

  useEffect(() => {
    loadReviews();
    if (user) {
      checkUserCanReview();
    }
  }, [productId, user]);

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);

      if (user) {
        const { data: userReview } = await supabase
          .from('reviews')
          .select('*')
          .eq('product_id', productId)
          .eq('user_id', user.id)
          .single();

        setUserReviewed(!!userReview);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Error al cargar las reseñas');
    } finally {
      setLoading(false);
    }
  };

  const checkUserCanReview = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_items!inner (
            product_id
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'delivered')
        .eq('order_items.product_id', productId);

      if (error) throw error;
      setUserCanReview(data && data.length > 0);
    } catch (error) {
      console.error('Error checking if user can review:', error);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userCanReview) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          product_id: productId,
          user_id: user.id,
          name: user.full_name || 'Usuario',
          rating: newReview.rating,
          comment: newReview.comment,
          approved: false
        });

      if (error) throw error;

      toast.success('Tu reseña ha sido enviada y está pendiente de aprobación');
      setUserReviewed(true);
      setNewReview({ rating: 5, comment: '' });
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Error al enviar la reseña');
    }
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
    : 0;

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Opiniones de clientes
      </h3>

      {reviews.length > 0 ? (
        <div>
          <div className="flex items-center mb-4">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-5 w-5 ${
                    star <= Math.round(averageRating)
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-sm text-gray-600">
              {averageRating.toFixed(1)} de 5 ({reviews.length} opiniones)
            </span>
          </div>

          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-200 pb-4">
                <div className="flex items-center mb-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= review.rating
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {review.name || 'Usuario'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{review.comment}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(review.created_at), 'dd/MM/yyyy')}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-gray-500">
          Este producto aún no tiene reseñas.
        </p>
      )}

      {user && !userReviewed && userCanReview && (
        <div className="mt-8 border-t border-gray-200 pt-8">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Deja tu opinión
          </h4>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calificación
              </label>
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= newReview.rating
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label
                htmlFor="comment"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Comentario
              </label>
              <textarea
                id="comment"
                rows={3}
                value={newReview.comment}
                onChange={(e) =>
                  setNewReview(prev => ({ ...prev, comment: e.target.value }))
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Enviar reseña
            </button>
          </form>
        </div>
      )}

      {user && !userCanReview && !userReviewed && (
        <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Solo los clientes que han comprado este producto pueden dejar una reseña.
              </p>
            </div>
          </div>
        </div>
      )}

      {!user && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-4">
          <p className="text-sm text-gray-600">
            Debes iniciar sesión para poder dejar una reseña.{' '}
            <a href="/auth" className="text-indigo-600 hover:text-indigo-500">
              Iniciar sesión
            </a>
          </p>
        </div>
      )}
    </div>
  );
}