import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import ProductDetail from './components/ProductDetail'
import Cart from './components/Cart'
import { Auth } from './components/Auth'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/auth" element={<Auth />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App