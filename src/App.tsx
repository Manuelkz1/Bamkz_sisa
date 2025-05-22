import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import { Auth } from './components/Auth';
import { AdminPanel } from './components/AdminPanel';
import GuestCheckout from './components/GuestCheckout';
import { PaymentStatus } from './components/PaymentStatus';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/checkout" element={<GuestCheckout onBack={() => history.back()} onSuccess={() => {}} />} />
          <Route path="/pago" element={<PaymentStatus />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;