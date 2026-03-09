import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../utils/api';
import { getImageUrl } from '../utils/config';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'orders';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [partners, setPartners] = useState({
    suppliers: [],
    resellers: [],
    deliveryPartners: []
  });
  const [catalogs, setCatalogs] = useState([]);
  const [catalogForm, setCatalogForm] = useState({
    catalog_code: '',
    catalog_name: '',
    description: '',
    status: 'A'
  });
  const [editingCatalog, setEditingCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    category: 'Fashion',
    subcategory: '',
    stock: '',
    images: [],
    hasSizes: false,
    sizes: [] // [{size: 'S', price: 299, stock: 10}, ...]
  });
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    const tab = searchParams.get('tab') || 'orders';
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        const response = await api.get('/orders');
        setOrders(response.data.orders || response.data);
      } else if (activeTab === 'products') {
        const response = await api.get('/products?limit=100');
        setProducts(response.data.products || response.data);
      } else if (activeTab === 'analytics') {
        await fetchAnalytics();
      } else if (activeTab === 'partners') {
        await fetchPartners();
      } else if (activeTab === 'catalogs') {
        await fetchCatalogs();
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Try to fetch from analytics endpoint first
      try {
        const analyticsRes = await api.get('/orders/analytics');
        setAnalytics(analyticsRes.data);
      } catch (error) {
        // Fallback: calculate from orders
        console.log('Analytics endpoint not available, calculating from orders...');
        const ordersRes = await api.get('/orders');
        const ordersData = ordersRes.data.orders || ordersRes.data;
        
        const totalSales = ordersData.reduce((sum, order) => sum + (parseFloat(order.total_amount || order.totalAmount) || 0), 0);
        const totalOrders = ordersData.length;
        const pendingOrders = ordersData.filter(o => (o.order_status || o.orderStatus) === 'Pending').length;
        const processingOrders = ordersData.filter(o => (o.order_status || o.orderStatus) === 'Processing').length;
        const shippedOrders = ordersData.filter(o => (o.order_status || o.orderStatus) === 'Shipped').length;
        const completedOrders = ordersData.filter(o => (o.order_status || o.orderStatus) === 'Delivered').length;
        const cancelledOrders = ordersData.filter(o => (o.order_status || o.orderStatus) === 'Cancelled').length;
        
        setAnalytics({
          totalSales,
          totalOrders,
          pendingOrders,
          processingOrders,
          shippedOrders,
          completedOrders,
          cancelledOrders,
          averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics');
    }
  };

  const fetchPartners = async () => {
    try {
      const [suppliersRes, resellersRes, deliveryRes] = await Promise.allSettled([
        api.get('/partners/admin/suppliers'),
        api.get('/partners/admin/resellers'),
        api.get('/partners/admin/delivery-partners')
      ]);

      setPartners({
        suppliers: suppliersRes.status === 'fulfilled' ? suppliersRes.value.data : [],
        resellers: resellersRes.status === 'fulfilled' ? resellersRes.value.data : [],
        deliveryPartners: deliveryRes.status === 'fulfilled' ? deliveryRes.value.data : []
      });
    } catch (error) {
      console.error('Error fetching partners:', error);
      toast.error('Failed to fetch partners data');
    }
  };

  const handleSupplierStatusChange = async (supplierId, status) => {
    try {
      await api.put(`/partners/admin/suppliers/${supplierId}/status`, { status });
      toast.success(`Supplier ${status} successfully`);
      fetchPartners();
    } catch (error) {
      toast.error('Failed to update supplier status');
    }
  };

  const handleDeliveryPartnerStatusChange = async (partnerId, status) => {
    try {
      await api.put(`/partners/admin/delivery-partners/${partnerId}/status`, { status });
      toast.success(`Delivery partner ${status} successfully`);
      fetchPartners();
    } catch (error) {
      toast.error('Failed to update delivery partner status');
    }
  };

  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { orderStatus: newStatus });
      toast.success('Order status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const fetchCatalogs = async () => {
    try {
      const response = await api.get('/catalog');
      setCatalogs(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch catalogs');
    }
  };

  const handleCatalogSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCatalog) {
        await api.put(`/catalog/${editingCatalog.id}`, catalogForm);
        toast.success('Catalog updated successfully');
      } else {
        await api.post('/catalog', catalogForm);
        toast.success('Catalog created successfully');
      }
      setCatalogForm({ catalog_code: '', catalog_name: '', description: '', status: 'A' });
      setEditingCatalog(null);
      fetchCatalogs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save catalog');
    }
  };

  const handleEditCatalog = (catalog) => {
    setEditingCatalog(catalog);
    setCatalogForm({
      catalog_code: catalog.catalog_code,
      catalog_name: catalog.catalog_name,
      description: catalog.description || '',
      status: catalog.status
    });
  };

  const handleDeleteCatalog = async (catalogId) => {
    if (!window.confirm('Are you sure you want to delete this catalog?')) {
      return;
    }
    try {
      await api.delete(`/catalog/${catalogId}`);
      toast.success('Catalog deleted successfully');
      fetchCatalogs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete catalog');
    }
  };

  const addSize = () => {
    setProductForm({
      ...productForm,
      sizes: [...productForm.sizes, { size: '', price: productForm.price || '', stock: '' }]
    });
  };

  const removeSize = (index) => {
    const newSizes = productForm.sizes.filter((_, i) => i !== index);
    setProductForm({ ...productForm, sizes: newSizes });
  };

  const updateSize = (index, field, value) => {
    const newSizes = [...productForm.sizes];
    newSizes[index][field] = value;
    setProductForm({ ...productForm, sizes: newSizes });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    
    Object.keys(productForm).forEach(key => {
      if (key === 'images') {
        productForm.images.forEach((file, index) => {
          formData.append('images', file);
        });
      } else if (key === 'sizes') {
        // Send sizes as JSON string
        formData.append('sizes', JSON.stringify(productForm.sizes));
      } else {
        formData.append(key, productForm[key]);
      }
    });

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product created successfully');
      }
      setProductForm({
        name: '',
        description: '',
        price: '',
        originalPrice: '',
        category: 'Fashion',
        subcategory: '',
        stock: '',
        images: [],
        hasSizes: false,
        sizes: []
      });
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleEditProduct = async (product) => {
    setEditingProduct(product);
    // Fetch product sizes if available
    let productSizes = [];
    try {
      const response = await api.get(`/products/${product._id || product.id}`);
      if (response.data.sizes && response.data.sizes.length > 0) {
        productSizes = response.data.sizes;
      }
    } catch (error) {
      console.error('Error fetching product sizes:', error);
    }
    
    setProductForm({
      name: product.name,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice || product.original_price || '',
      category: product.category,
      subcategory: product.subcategory || '',
      stock: product.stock,
      images: [],
      hasSizes: productSizes.length > 0,
      sizes: productSizes
    });
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleImageChange = (e) => {
    setProductForm({
      ...productForm,
      images: Array.from(e.target.files)
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
        return '#4caf50';
      case 'Cancelled':
        return '#f44336';
      case 'Shipped':
        return '#2196f3';
      case 'Processing':
        return '#ff9800';
      default:
        return '#666';
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-container">
        <h2>Admin Dashboard</h2>
        
        <div className="admin-tabs">
          <button
            className={activeTab === 'orders' ? 'active' : ''}
            onClick={() => {
              setActiveTab('orders');
              setSearchParams({ tab: 'orders' });
            }}
          >
            Orders
          </button>
          <button
            className={activeTab === 'products' ? 'active' : ''}
            onClick={() => {
              setActiveTab('products');
              setSearchParams({ tab: 'products' });
            }}
          >
            Products
          </button>
          <button
            className={activeTab === 'analytics' ? 'active' : ''}
            onClick={() => {
              setActiveTab('analytics');
              setSearchParams({ tab: 'analytics' });
            }}
          >
            Analytics
          </button>
          <button
            className={activeTab === 'partners' ? 'active' : ''}
            onClick={() => {
              setActiveTab('partners');
              setSearchParams({ tab: 'partners' });
            }}
          >
            Partners
          </button>
          <button
            className={activeTab === 'catalogs' ? 'active' : ''}
            onClick={() => {
              setActiveTab('catalogs');
              setSearchParams({ tab: 'catalogs' });
            }}
          >
            Catalogs
          </button>
          <Link to="/admin/coupons" className="admin-tab-link">
            Coupons
          </Link>
          <Link to="/admin/banners" className="admin-tab-link">
            Banners
          </Link>
        </div>

        {activeTab === 'orders' && (
          <div className="admin-section">
            <h3>All Orders</h3>
            {loading ? (
              <div className="loading">Loading...</div>
            ) : orders.length === 0 ? (
              <p>No orders found</p>
            ) : (
              <div className="orders-table">
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Address</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                      <th>View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const address = order.shippingAddress || order.shipping_address;
                      const addressText = address 
                        ? `${address.street || ''}, ${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`
                        : 'N/A';
                      return (
                        <tr key={order._id || order.id}>
                          <td>{String(order._id || order.id).slice(-8)}</td>
                          <td>{order.user?.name || order.user?.email || 'N/A'}</td>
                          <td style={{ maxWidth: '250px', fontSize: '12px' }} title={addressText}>
                            {addressText.length > 50 ? `${addressText.substring(0, 50)}...` : addressText}
                          </td>
                          <td>{new Date(order.orderDate || order.order_date).toLocaleDateString()}</td>
                          <td>₹{Number(order.totalAmount || order.total_amount || 0).toFixed(2)}</td>
                          <td>
                            <span style={{ color: getStatusColor(order.orderStatus || order.order_status) }}>
                              {order.orderStatus || order.order_status}
                            </span>
                          </td>
                          <td>
                            <select
                              value={order.orderStatus || order.order_status}
                              onChange={(e) => handleOrderStatusChange(order._id || order.id, e.target.value)}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Processing">Processing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td>
                            <Link 
                              to={`/orders/${String(order._id || order.id)}`}
                              className="btn-view-order"
                              style={{ 
                                display: 'inline-block',
                                padding: '6px 12px',
                                backgroundColor: '#2196f3',
                                color: 'white',
                                textDecoration: 'none',
                                borderRadius: '4px',
                                fontSize: '12px',
                                marginLeft: '8px'
                              }}
                            >
                              View Order
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="admin-section">
            <div className="products-admin">
              <div className="products-list-admin">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>All Products</h3>
                  <Link to="/admin/add-product" className="btn-add-new-product">
                    + Add New Product
                  </Link>
                </div>
                {loading ? (
                  <div className="loading">Loading...</div>
                ) : products.length === 0 ? (
                  <p>No products found</p>
                ) : (
                  <div className="products-grid-admin">
                    {products.map(product => (
                      <div key={product._id} className="product-card-admin">
                        <div className="product-image-admin">
                          {product.images && product.images.length > 0 ? (
                            <img 
                              src={getImageUrl(product.images[0])} 
                              alt={product.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                              }}
                            />
                          ) : (
                            <div className="placeholder-image">No Image</div>
                          )}
                        </div>
                        <div className="product-info-admin">
                          <h4>{product.name}</h4>
                          <p>₹{product.price}</p>
                          <p>Stock: {product.stock}</p>
                          <div className="product-actions-admin">
                            <button
                              onClick={() => navigate('/admin/add-product', { state: { product, productId: product._id || product.id } })}
                              className="btn-edit-product"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product._id)}
                              className="btn-delete-product"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="product-form-admin">
                <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                <form onSubmit={handleProductSubmit}>
                  <div className="form-group">
                    <label>Product Name</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      required
                      rows="4"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Original Price (Optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.originalPrice}
                        onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        required
                      >
                        <option value="Fashion">Fashion</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Home">Home</option>
                        <option value="Beauty">Beauty</option>
                        <option value="Sports">Sports</option>
                        <option value="Books">Books</option>
                        <option value="Toys">Toys</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Stock</label>
                      <input
                        type="number"
                        value={productForm.stock}
                        onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                        required
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Subcategory (Optional)</label>
                    <input
                      type="text"
                      value={productForm.subcategory}
                      onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })}
                    />
                  </div>
                  
                  {/* Size Management */}
                  <div className="form-group">
                    <label className="size-checkbox-label">
                      <input
                        type="checkbox"
                        checked={productForm.hasSizes}
                        onChange={(e) => {
                          const hasSizes = e.target.checked;
                          setProductForm({
                            ...productForm,
                            hasSizes,
                            sizes: hasSizes && productForm.sizes.length === 0 
                              ? [{ size: '', price: productForm.price || '', stock: '' }]
                              : productForm.sizes
                          });
                        }}
                      />
                      Enable Size Options (for Fashion, Shoes, etc.)
                    </label>
                    
                    {productForm.hasSizes && (
                      <div className="size-management-container">
                        <div className="size-management-header">
                          <strong>Sizes & Prices:</strong>
                          <button
                            type="button"
                            onClick={addSize}
                            className="btn-add-size"
                          >
                            + Add Size
                          </button>
                        </div>
                        
                        {productForm.sizes.map((sizeItem, index) => (
                          <div key={index} className="size-item-row">
                            <input
                              type="text"
                              placeholder="Size (e.g., S, M, L, XL, 38, 40)"
                              value={sizeItem.size}
                              onChange={(e) => updateSize(index, 'size', e.target.value)}
                              required
                              className="size-item-input"
                            />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              value={sizeItem.price}
                              onChange={(e) => updateSize(index, 'price', e.target.value)}
                              required
                              className="size-item-input"
                            />
                            <input
                              type="number"
                              placeholder="Stock"
                              value={sizeItem.stock}
                              onChange={(e) => updateSize(index, 'stock', e.target.value)}
                              required
                              min="0"
                              className="size-item-input"
                            />
                            <button
                              type="button"
                              onClick={() => removeSize(index)}
                              className="btn-remove-size"
                              title="Remove Size"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        
                        {productForm.sizes.length === 0 && (
                          <p className="size-empty-message">
                            Click "Add Size" to add size options with different prices
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>Product Images</label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      required={!editingProduct}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-save">
                      {editingProduct ? 'Update Product' : 'Add Product'}
                    </button>
                    {editingProduct && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setProductForm({
                            name: '',
                            description: '',
                            price: '',
                            originalPrice: '',
                            category: 'Fashion',
                            subcategory: '',
                            stock: '',
                            images: []
                          });
                        }}
                        className="btn-cancel"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="admin-section">
            <h3>Analytics Dashboard</h3>
            {loading ? (
              <div className="loading">Loading analytics...</div>
            ) : analytics ? (
              <>
                <div className="analytics-grid">
                  <div className="analytics-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    <h3>Total Sales</h3>
                    <p className="analytics-value">₹{Number(analytics.totalSales || 0).toFixed(2)}</p>
                  </div>
                  <div className="analytics-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                    <h3>Total Orders</h3>
                    <p className="analytics-value">{analytics.totalOrders || 0}</p>
                  </div>
                  <div className="analytics-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                    <h3>Completed Orders</h3>
                    <p className="analytics-value">{analytics.completedOrders || 0}</p>
                  </div>
                  <div className="analytics-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                    <h3>Pending Orders</h3>
                    <p className="analytics-value">{analytics.pendingOrders || 0}</p>
                  </div>
                  <div className="analytics-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                    <h3>Processing Orders</h3>
                    <p className="analytics-value">{analytics.processingOrders || 0}</p>
                  </div>
                  <div className="analytics-card" style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
                    <h3>Shipped Orders</h3>
                    <p className="analytics-value">{analytics.shippedOrders || 0}</p>
                  </div>
                  <div className="analytics-card" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
                    <h3>Average Order Value</h3>
                    <p className="analytics-value">₹{Number(analytics.averageOrderValue || 0).toFixed(2)}</p>
                  </div>
                  {analytics.cancelledOrders !== undefined && (
                    <div className="analytics-card" style={{ background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' }}>
                      <h3>Cancelled Orders</h3>
                      <p className="analytics-value">{analytics.cancelledOrders || 0}</p>
                    </div>
                  )}
                </div>

                {/* Charts Section */}
                <div className="charts-container">
                  {/* Revenue Trend Chart */}
                  {analytics.revenueData && analytics.revenueData.length > 0 && (
                    <div className="chart-card">
                      <h4>Revenue Trend (Last 30 Days)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
                            labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString('en-IN')}`}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#667eea" 
                            strokeWidth={2}
                            name="Revenue"
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Orders by Status Pie Chart */}
                  <div className="chart-card">
                    <h4>Orders by Status</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Delivered', value: analytics.completedOrders || 0 },
                            { name: 'Pending', value: analytics.pendingOrders || 0 },
                            { name: 'Processing', value: analytics.processingOrders || 0 },
                            { name: 'Shipped', value: analytics.shippedOrders || 0 },
                            { name: 'Cancelled', value: analytics.cancelledOrders || 0 }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[
                            { name: 'Delivered', value: analytics.completedOrders || 0 },
                            { name: 'Pending', value: analytics.pendingOrders || 0 },
                            { name: 'Processing', value: analytics.processingOrders || 0 },
                            { name: 'Shipped', value: analytics.shippedOrders || 0 },
                            { name: 'Cancelled', value: analytics.cancelledOrders || 0 }
                          ].filter(item => item.value > 0).map((entry, index) => {
                            const colors = ['#4caf50', '#ff9800', '#2196f3', '#9c27b0', '#f44336'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Daily Orders Chart */}
                  {analytics.ordersByDate && analytics.ordersByDate.length > 0 && (
                    <div className="chart-card">
                      <h4>Daily Orders (Last 30 Days)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.ordersByDate}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value) => [value, 'Orders']}
                            labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString('en-IN')}`}
                          />
                          <Legend />
                          <Bar dataKey="count" fill="#f093fb" name="Orders" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Revenue by Category */}
                  {analytics.categoryRevenue && analytics.categoryRevenue.length > 0 && (
                    <div className="chart-card">
                      <h4>Revenue by Category</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.categoryRevenue} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                          <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={100} />
                          <Tooltip 
                            formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
                          />
                          <Legend />
                          <Bar dataKey="revenue" fill="#4facfe" name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Top Products */}
                  {analytics.topProducts && analytics.topProducts.length > 0 && (
                    <div className="chart-card">
                      <h4>Top 10 Products by Sales</h4>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={analytics.topProducts} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            tick={{ fontSize: 11 }} 
                            width={150}
                            tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value}
                          />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'quantity') return [value, 'Quantity Sold'];
                              if (name === 'revenue') return [`₹${Number(value).toFixed(2)}`, 'Revenue'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="quantity" fill="#43e97b" name="Quantity Sold" />
                          <Bar dataKey="revenue" fill="#667eea" name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Monthly Revenue */}
                  {analytics.monthlyRevenue && analytics.monthlyRevenue.length > 0 && (
                    <div className="chart-card">
                      <h4>Monthly Revenue (Last 6 Months)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.monthlyRevenue}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => {
                              const [year, month] = value.split('-');
                              return new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                            }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                          />
                          <Tooltip 
                            formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
                            labelFormatter={(label) => {
                              const [year, month] = label.split('-');
                              return `Month: ${new Date(year, month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
                            }}
                          />
                          <Legend />
                          <Bar dataKey="revenue" fill="#30cfd0" name="Revenue" />
                          <Bar dataKey="orders" fill="#fa709a" name="Orders" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p>No analytics data available</p>
            )}
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="admin-section">
            <h3>Partners Management</h3>
            
            {/* Suppliers Section */}
            <div className="partners-section">
              <h4>Suppliers ({partners.suppliers.length})</h4>
              {loading ? (
                <p>Loading suppliers...</p>
              ) : partners.suppliers.length === 0 ? (
                <p>No suppliers found</p>
              ) : (
                <div className="partners-table">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Business Name</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.suppliers.map(supplier => (
                        <tr key={supplier.id}>
                          <td>{supplier.id}</td>
                          <td>{supplier.name}</td>
                          <td>{supplier.email}</td>
                          <td>{supplier.business_name}</td>
                          <td>
                            <span className={`status-badge status-${supplier.status}`}>
                              {supplier.status}
                            </span>
                          </td>
                          <td>
                            {supplier.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleSupplierStatusChange(supplier.id, 'approved')}
                                  className="btn-approve"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleSupplierStatusChange(supplier.id, 'rejected')}
                                  className="btn-reject"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {supplier.status === 'approved' && (
                              <>
                                <button
                                  onClick={() => handleSupplierStatusChange(supplier.id, 'inactive')}
                                  className="btn-deactivate"
                                  title="Deactivate supplier"
                                >
                                  Deactivate
                                </button>
                                <span className="status-text" style={{ marginLeft: '0.5rem' }}>Active</span>
                              </>
                            )}
                            {supplier.status === 'inactive' && (
                              <>
                                <button
                                  onClick={() => handleSupplierStatusChange(supplier.id, 'approved')}
                                  className="btn-activate"
                                  title="Activate supplier"
                                >
                                  Activate
                                </button>
                                <span className="status-text" style={{ marginLeft: '0.5rem' }}>Inactive</span>
                              </>
                            )}
                            {supplier.status === 'rejected' && (
                              <span className="status-text">Rejected</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Delivery Partners Section */}
            <div className="partners-section">
              <h4>Delivery Partners ({partners.deliveryPartners.length})</h4>
              {loading ? (
                <p>Loading delivery partners...</p>
              ) : partners.deliveryPartners.length === 0 ? (
                <p>No delivery partners found</p>
              ) : (
                <div className="partners-table">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Vehicle Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.deliveryPartners.map(partner => (
                        <tr key={partner.id}>
                          <td>{partner.id}</td>
                          <td>{partner.name}</td>
                          <td>{partner.email}</td>
                          <td>{partner.vehicle_type || 'N/A'}</td>
                          <td>
                            <span className={`status-badge status-${partner.status}`}>
                              {partner.status}
                            </span>
                          </td>
                          <td>
                            {partner.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleDeliveryPartnerStatusChange(partner.id, 'approved')}
                                  className="btn-approve"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleDeliveryPartnerStatusChange(partner.id, 'rejected')}
                                  className="btn-reject"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {partner.status === 'approved' && (
                              <button
                                onClick={() => handleDeliveryPartnerStatusChange(partner.id, 'active')}
                                className="btn-activate"
                              >
                                Activate
                              </button>
                            )}
                            {partner.status === 'active' && (
                              <span className="status-text">Active</span>
                            )}
                            {partner.status === 'rejected' && (
                              <span className="status-text">Rejected</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Resellers Section */}
            <div className="partners-section">
              <h4>Resellers ({partners.resellers.length})</h4>
              {loading ? (
                <p>Loading resellers...</p>
              ) : partners.resellers.length === 0 ? (
                <p>No resellers found</p>
              ) : (
                <div className="partners-table">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Referral Code</th>
                        <th>Total Referrals</th>
                        <th>Total Earnings</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partners.resellers.map(reseller => (
                        <tr key={reseller.id}>
                          <td>{reseller.id}</td>
                          <td>{reseller.name}</td>
                          <td>{reseller.email}</td>
                          <td><code>{reseller.referral_code}</code></td>
                          <td>{reseller.total_referrals || 0}</td>
                          <td>₹{parseFloat(reseller.total_earnings || 0).toFixed(2)}</td>
                          <td>
                            <span className={`status-badge status-${reseller.status}`}>
                              {reseller.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'catalogs' && (
          <div className="admin-section">
            <h3>Catalog Management</h3>
            
            {/* Catalog Form */}
            <div className="catalog-form-section" style={{ marginBottom: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
              <h4>{editingCatalog ? 'Edit Catalog' : 'Create New Catalog'}</h4>
              <form onSubmit={handleCatalogSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <label>Catalog Code <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      value={catalogForm.catalog_code}
                      onChange={(e) => setCatalogForm({ ...catalogForm, catalog_code: e.target.value })}
                      required
                      disabled={!!editingCatalog}
                      placeholder="e.g., CAT001"
                    />
                  </div>
                  <div>
                    <label>Catalog Name <span style={{ color: 'red' }}>*</span></label>
                    <input
                      type="text"
                      value={catalogForm.catalog_name}
                      onChange={(e) => setCatalogForm({ ...catalogForm, catalog_name: e.target.value })}
                      required
                      placeholder="e.g., Summer Collection 2024"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>Description</label>
                  <textarea
                    value={catalogForm.description}
                    onChange={(e) => setCatalogForm({ ...catalogForm, description: e.target.value })}
                    rows="3"
                    placeholder="Catalog description (optional)"
                  />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label>Status</label>
                  <select
                    value={catalogForm.status}
                    onChange={(e) => setCatalogForm({ ...catalogForm, status: e.target.value })}
                  >
                    <option value="A">Active</option>
                    <option value="I">Inactive</option>
                  </select>
                </div>
                <div>
                  <button type="submit" className="btn-primary">
                    {editingCatalog ? 'Update Catalog' : 'Create Catalog'}
                  </button>
                  {editingCatalog && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatalog(null);
                        setCatalogForm({ catalog_code: '', catalog_name: '', description: '', status: 'A' });
                      }}
                      style={{ marginLeft: '10px', padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Catalogs List */}
            <div className="catalogs-list">
              <h4>All Catalogs ({catalogs.length})</h4>
              {loading ? (
                <p>Loading catalogs...</p>
              ) : catalogs.length === 0 ? (
                <p>No catalogs found. Create your first catalog above.</p>
              ) : (
                <div className="catalogs-table">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Created At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogs.map(catalog => (
                        <tr key={catalog.id}>
                          <td>{catalog.id}</td>
                          <td><code>{catalog.catalog_code}</code></td>
                          <td>{catalog.catalog_name}</td>
                          <td>{catalog.description || '-'}</td>
                          <td>
                            <span className={`status-badge ${catalog.status === 'A' ? 'status-approved' : 'status-inactive'}`}>
                              {catalog.status === 'A' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{new Date(catalog.created_at).toLocaleDateString()}</td>
                          <td>
                            <button
                              onClick={() => handleEditCatalog(catalog)}
                              className="btn-edit"
                              style={{ marginRight: '5px', padding: '5px 10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCatalog(catalog.id)}
                              className="btn-delete"
                              style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

