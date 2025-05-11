import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Auth } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import { ProductDetail } from './components/ProductDetail';
import { GuestCheckout } from './components/GuestCheckout';
import { DropshipperCheckout } from './components/DropshipperCheckout';
import { PaymentStatus } from './components/PaymentStatus';
import { useAuthStore } from './stores/authStore';
import { useCartStore } from './stores/cartStore';
import { Home } from './components/Home';

export default function App() {
  const { user, loading, error, checkAuth } = useAuthStore();
  const cartStore = useCartStore();

  useEffect(() => {
    checkAuth();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Error de conexión
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => checkAuth()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/pago" element={<PaymentStatus />} />
        <Route
          path="/admin"
          element={
            user?.role === 'admin' || user?.role === 'fulfillment' ? (
              <AdminPanel />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/checkout"
          element={
            user?.role === 'fulfillment' ? (
              <Navigate to="/admin?tab=orders" replace />
            ) : user?.role === 'dropshipping' ? (
              <DropshipperCheckout
                items={cartStore.items}
                total={cartStore.total}
                onBack={() => window.history.back()}
                onSuccess={cartStore.clearCart}
              />
            ) : (
              <GuestCheckout
                items={cartStore.items}
                total={cartStore.total}
                onBack={() => window.history.back()}
                onSuccess={cartStore.clearCart}
              />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}