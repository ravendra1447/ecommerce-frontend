import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import './SupplierDashboard.css';

const SupplierDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/partners/supplier/dashboard');
      setDashboardData(response.data);
      if (response.data.message) {
        if (response.data.needsRegistration) {
          toast.warning(response.data.message + ' Please complete your registration.');
        } else {
          toast.info(response.data.message);
        }
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Failed to load dashboard';
      
      if (error.response?.status === 404 && error.response?.data?.needsRegistration) {
        toast.warning(errorMessage);
        setDashboardData({
          supplier: null,
          products: [],
          stats: { totalProducts: 0, totalOrders: 0, totalSales: 0, totalEarnings: 0 },
          needsRegistration: true
        });
      } else {
        toast.error(errorMessage);
        // Set empty data to show error message
        setDashboardData({
          supplier: null,
          products: [],
          stats: { totalProducts: 0, totalOrders: 0, totalSales: 0, totalEarnings: 0 }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!dashboardData) {
    return <div className="error">Loading dashboard data...</div>;
  }

  const { supplier, products, stats } = dashboardData;

  // Show message if supplier profile not found
  if (!supplier) {
    return (
      <div className="supplier-dashboard">
        <div className="dashboard-container">
          <div className="error-message">
            <h2>Supplier Profile Not Found</h2>
            {dashboardData?.needsRegistration ? (
              <>
                <p>Your supplier account exists but the profile is incomplete. Please complete your registration.</p>
                <Link to="/register/supplier" className="btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
                  Complete Registration
                </Link>
              </>
            ) : (
              <p>Your supplier profile is being set up. Please wait for admin approval or contact support.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="supplier-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Supplier Dashboard</h1>
          {supplier.status === 'approved' ? (
            <Link to="/supplier/add-product" className="btn-add-product">
              + Add New Product
            </Link>
          ) : (
            <button className="btn-add-product" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              + Add New Product
            </button>
          )}
        </div>

        {/* Status Banner */}
        <div className={`status-banner status-${supplier.status}`}>
          <p>
            <strong>Status:</strong> {supplier.status.charAt(0).toUpperCase() + supplier.status.slice(1)}
            {supplier.status === 'pending' && ' - Waiting for admin approval'}
            {supplier.status === 'approved' && ' - You can now add and manage products'}
            {supplier.status === 'inactive' && ' - Your account is inactive. Please contact admin to activate.'}
            {supplier.status === 'rejected' && ' - Please contact admin for more information'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Products</h3>
            <p className="stat-value">{stats.totalProducts}</p>
          </div>
          <div className="stat-card">
            <h3>Total Orders</h3>
            <p className="stat-value">{stats.totalOrders}</p>
          </div>
          <div className="stat-card">
            <h3>Total Sales</h3>
            <p className="stat-value">₹{stats.totalSales.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h3>Total Earnings</h3>
            <p className="stat-value">₹{stats.totalEarnings.toFixed(2)}</p>
          </div>
        </div>

        {/* Supplier Info */}
        <div className="info-section">
          <h2>Business Information</h2>
          <div className="info-grid">
            <div>
              <strong>Business Name:</strong> {supplier.business_name}
            </div>
            {supplier.gst_number && (
              <div>
                <strong>GST Number:</strong> {supplier.gst_number}
              </div>
            )}
            {supplier.pan_number && (
              <div>
                <strong>PAN Number:</strong> {supplier.pan_number}
              </div>
            )}
            <div>
              <strong>Commission Rate:</strong> {supplier.commission_rate}%
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="products-section">
          <h2>My Products ({products.length})</h2>
          {products.length === 0 ? (
            <div className="empty-state">
              <p>No products yet. Add your first product to get started!</p>
              {supplier.status === 'approved' ? (
                <Link to="/supplier/add-product" className="btn-primary">
                  Add Product
                </Link>
              ) : (
                <button className="btn-primary" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                  Add Product
                </button>
              )}
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p className="product-price">₹{product.price}</p>
                    <p className="product-stock">Stock: {product.stock}</p>
                    <p className={`product-status ${product.is_active ? 'active' : 'inactive'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="product-actions">
                    <Link to={`/product/${product.id}`} className="btn-view">
                      View
                    </Link>
                    <Link 
                      to="/supplier/add-product" 
                      state={{ product, productId: product.id }}
                      className="btn-edit"
                      style={{ marginLeft: '10px', padding: '8px 16px', background: '#667eea', color: 'white', textDecoration: 'none', borderRadius: '5px' }}
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;

