import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { Auth } from './components/Auth';
import Home from './components/Home';
import { SocialAuth } from './components/SocialAuth';
import ProductPage from './pages/ProductPage';
import { Cart } from './components/Cart';
import GuestCheckout from './components/GuestCheckout';
import { AdminPanel } from './components/AdminPanel';
import OrderDetails from './components/OrderDetails';

// Componente para manejar el callback de autenticación
const AuthCallback = () => {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Forzar la inicialización del estado de autenticación cuando se llega al callback
    const handleCallback = async () => {
      await initialize();
    };

    handleCallback();
  }, [initialize]);

  // Este componente no renderiza nada, solo procesa el callback
  return null;
};

// Componente para rutas protegidas que requieren autenticación
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuthStore();

  // Si aún está cargando, mostrar un indicador de carga
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/auth" replace state={{ from: window.location }} />;
  }

  // Si la ruta es solo para admin y el usuario no es admin, redirigir a la página principal
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="" replace />;
  }

  // Si el usuario está autenticado y tiene los permisos necesarios, mostrar el contenido
  return children;
};

// Componente temporal para páginas todavía no implementadas - actualizado para mostrar contenido parcial
const NotImplementedPage = () => {
  const { pathname } = window.location;
  
  // Si estamos en la ruta de productos, mostrar la lista de productos
  if (pathname.includes('/products')) {
    return <ProductPage />;
  }
  
  // Si estamos en la ruta de administrador, mostrar panel de administración
  if (pathname.includes('/admin')) {
    return <AdminPanel />;
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Estamos trabajando en esta página</h1>
      <p className="text-gray-600 mb-4">El contenido estará disponible próximamente.</p>
      <a href="/" className="text-indigo-600 hover:text-indigo-800">
        Volver a la página principal
      </a>
    </div>
  );
};

function App() {
  const { initialize } = useAuthStore();

  // Inicializar el estado de autenticación al cargar la aplicación
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/products/:id" element={<ProductPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={
          <ProtectedRoute>
            <GuestCheckout />
          </ProtectedRoute>
        } />
        <Route path="/order-confirmation/:id" element={
          <ProtectedRoute>
            <OrderDetails />
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute>
            <NotImplementedPage />
          </ProtectedRoute>
        } />
        <Route path="/orders/:id" element={
          <ProtectedRoute>
            <OrderDetails />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <NotImplementedPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute adminOnly={true}>
            <AdminPanel />
          </ProtectedRoute>
        } />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<NotImplementedPage />} />
      </Routes>
    </Router>
  );
}

export default App;