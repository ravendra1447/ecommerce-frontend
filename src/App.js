import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import ProductLanding from './pages/ProductLanding';
import CatalogLanding from './pages/CatalogLanding';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import OrderTracking from './pages/OrderTracking';
import AdminDashboard from './pages/AdminDashboard';
import AddProduct from './pages/AddProduct';
import AdminCoupons from './pages/AdminCoupons';
import AdminBanners from './pages/AdminBanners';
import Wishlist from './pages/Wishlist';
import RegisterSupplier from './pages/RegisterSupplier';
import RegisterReseller from './pages/RegisterReseller';
import RegisterDelivery from './pages/RegisterDelivery';
import SupplierDashboard from './pages/SupplierDashboard';
import ResellerDashboard from './pages/ResellerDashboard';
import DeliveryDashboard from './pages/DeliveryDashboard';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  // Block React Router's default scroll restoration
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductLanding />} />
            <Route path="/catalog/:id" element={<CatalogLanding />} />
            <Route path="/product-detail/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/cart" element={<PrivateRoute><Cart /></PrivateRoute>} />
            <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/orders/:id?" element={<PrivateRoute><Orders /></PrivateRoute>} />
            <Route path="/orders/tracking/:id" element={<PrivateRoute><OrderTracking /></PrivateRoute>} />
            <Route path="/wishlist" element={<PrivateRoute><Wishlist /></PrivateRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/add-product" element={<AdminRoute><AddProduct /></AdminRoute>} />
            <Route path="/admin/coupons" element={<AdminRoute><AdminCoupons /></AdminRoute>} />
            <Route path="/admin/banners" element={<AdminRoute><AdminBanners /></AdminRoute>} />
            <Route path="/register/supplier" element={<RegisterSupplier />} />
            <Route path="/register/reseller" element={<RegisterReseller />} />
            <Route path="/register/delivery" element={<RegisterDelivery />} />
            <Route path="/supplier/dashboard" element={<PrivateRoute><SupplierDashboard /></PrivateRoute>} />
            <Route path="/supplier/add-product" element={<PrivateRoute><AddProduct /></PrivateRoute>} />
            <Route path="/reseller/dashboard" element={<PrivateRoute><ResellerDashboard /></PrivateRoute>} />
            <Route path="/delivery/dashboard" element={<PrivateRoute><DeliveryDashboard /></PrivateRoute>} />
          </Routes>
          <ToastContainer position="top-right" autoClose={3002} />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

