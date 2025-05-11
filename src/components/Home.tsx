import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { ShoppingBag, User, LogOut, ShoppingCart, Package } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { ProductGrid } from './ProductGrid';
import { Cart } from './Cart';
import { useCompanySettings } from '../hooks/useCompanySettings';

export function Home() {
  const { user, signOut } = useAuthStore();
  const cartStore = useCartStore();
  const navigate = useNavigate();
  const { settings } = useCompanySettings();

  const handleOrdersClick = () => {
    navigate('/admin?tab=orders');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                {settings?.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt={settings.name}
                    style={{
                      width: `${settings.logo_width}px`,
                      height: `${settings.logo_height}px`
                    }}
                    className="object-contain"
                  />
                ) : (
                  <ShoppingBag className="h-8 w-8 text-indigo-600" />
                )}
                <span className="ml-2 text-xl font-bold text-gray-900">
                  {settings?.name || 'Calidad Premium'}
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="text-gray-700 hover:text-indigo-600 transition-colors"
                    >
                      Panel Admin
                    </Link>
                  )}
                  {user.role === 'fulfillment' && (
                    <button
                      onClick={handleOrdersClick}
                      className="flex items-center px-4 py-2 text-gray-700 hover:text-indigo-600 transition-colors rounded-md hover:bg-gray-50"
                    >
                      <Package className="h-5 w-5 mr-2" />
                      Gestionar Pedidos
                    </button>
                  )}
                  <div className="relative group">
                    <button className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600">
                      <User className="h-5 w-5" />
                      <span>{user.full_name || user.email}</span>
                    </button>
                    <div className="absolute right-0 w-48 mt-2 py-2 bg-white rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <button
                        onClick={() => signOut()}
                        className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-indigo-600 w-full"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center text-gray-700 hover:text-indigo-600 transition-colors"
                >
                  <User className="h-5 w-5 mr-1" />
                  Iniciar sesión
                </Link>
              )}
              {(!user || user.role !== 'fulfillment') && (
                <button
                  onClick={() => cartStore.toggleCart()}
                  className="flex items-center text-gray-700 hover:text-indigo-600 relative transition-colors"
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cartStore.items.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      {cartStore.items.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">
              {user?.role === 'fulfillment' 
                ? 'Gestión de Pedidos'
                : settings?.hero_title || 'Productos de Calidad Premium'}
            </h1>
            <p className="mt-4 text-xl text-indigo-100">
              {user?.role === 'fulfillment'
                ? 'Administra y gestiona todos los pedidos de manera eficiente'
                : settings?.hero_subtitle || 'Descubre nuestra selección de productos exclusivos con la mejor calidad garantizada'}
            </p>
            {user?.role === 'fulfillment' && (
              <button
                onClick={handleOrdersClick}
                className="mt-8 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-700 focus:ring-white"
              >
                <Package className="h-5 w-5 mr-2" />
                Ver Pedidos Pendientes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user?.role === 'fulfillment' ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Panel de Gestión de Pedidos
            </h2>
            <p className="text-gray-600 mb-8">
              Bienvenido al panel de gestión de pedidos. Aquí podrás ver y gestionar todos los pedidos.
            </p>
            <button
              onClick={handleOrdersClick}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Package className="h-5 w-5 mr-2" />
              Ir a Gestión de Pedidos
            </button>
          </div>
        ) : (
          <ProductGrid />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2025 {settings?.name || 'Calidad Premium'}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {(!user || user.role !== 'fulfillment') && <Cart />}
    </div>
  );
}