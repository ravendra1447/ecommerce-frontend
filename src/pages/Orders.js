import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { getImageUrl } from '../utils/config';
import './Orders.css';

const Orders = () => {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrder(id);
    } else {
      fetchOrders();
    }
  }, [id]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/my-orders');
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrder = async (orderId) => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch order');
      console.error('Order fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    try {
      await api.put(`/orders/${orderId}/cancel`);
      toast.success('Order cancelled successfully');
      if (id) {
        fetchOrder(id);
      } else {
        fetchOrders();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const downloadInvoice = async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}/invoice`, {
        responseType: 'blob'
      });
      
      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
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

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (id && order) {
    return (
      <div className="order-detail-page">
        <div className="order-detail-container">
          <Link to="/orders" className="back-link">← Back to Orders</Link>
          <h2>Order Details</h2>
          
          <div className="order-info-section">
            <div className="info-row">
              <span>Order ID:</span>
              <span>{order._id || order.id}</span>
            </div>
            <div className="order-detail-actions">
              <Link to={`/orders/tracking/${order._id || order.id}`} className="track-order-link">
                📍 Track Order
              </Link>
              {/* <button 
                onClick={() => downloadInvoice(order._id || order.id)} 
                className="btn-download-invoice"
              >
                📄 Download Invoice
              </button> */}
            </div>
            <div className="info-row">
              <span>Order Date:</span>
              <span>{new Date(order.orderDate || order.order_date).toLocaleDateString()}</span>
            </div>
            <div className="info-row">
              <span>Status:</span>
              <span style={{ color: getStatusColor(order.orderStatus || order.order_status) }}>
                {order.orderStatus || order.order_status}
              </span>
            </div>
            <div className="info-row">
              <span>Payment Method:</span>
              <span>{(order.paymentMethod || order.payment_method) === 'COD' ? 'After Confirmation' : (order.paymentMethod || order.payment_method)}</span>
            </div>
            <div className="info-row">
              <span>Payment Status:</span>
              <span>{order.paymentStatus || order.payment_status}</span>
            </div>
          </div>

          <div className="shipping-section">
            <h3>Shipping Address</h3>
            <p>
              {order.shippingAddress.street},<br />
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
            </p>
            {order.shippingAddress.phone && (
              <p><strong>Phone:</strong> {order.shippingAddress.phone}</p>
            )}
          </div>

          <div className="order-items-section">
            <h3>Order Items</h3>
            {order.items.map((item, index) => (
              <div key={index} className="order-item-detail">
                <div className="item-image">
                  {item.product.images && item.product.images.length > 0 ? (() => {
                    const imagePath = item.product.images[0];
                    let imageUrl = imagePath;
                    if (!imagePath.startsWith('http')) {
                      const path = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
                      imageUrl = getImageUrl(path);
                    }
                    return (
                      <img 
                        src={imageUrl}
                        alt={item.product.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/150x150?text=No+Image';
                        }}
                      />
                    );
                  })() : (
                    <div className="placeholder-image">No Image</div>
                  )}
                </div>
                <div className="item-details">
                  <h4>{item.product.name}</h4>
                  <div className="item-variants">
                    {item.size && (
                      <span className="variant-badge">Size: {item.size}</span>
                    )}
                    {item.color && (
                      <span className="variant-badge">Color: {item.color}</span>
                    )}
                  </div>
                  <p>Quantity: {item.quantity}</p>
                  <p>Price: ₹{item.price}</p>
                </div>
                <div className="item-total">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div className="order-total-section">
            <div className="total-row">
              <span>Total Amount:</span>
              <span className="total-amount">₹{Number(order.totalAmount || order.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>

          {(order.orderStatus || order.order_status) !== 'Delivered' && (order.orderStatus || order.order_status) !== 'Cancelled' && (
            <button
              onClick={() => handleCancelOrder(order._id || order.id)}
              className="btn-cancel-order"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <h2>My Orders</h2>
        
        {orders.length === 0 ? (
          <div className="no-orders">
            <p>You haven't placed any orders yet.</p>
            <Link to="/products" className="btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order._id || order.id} className="order-card">
                <div className="order-header">
                  <div>
                    <p className="order-id">Order #{String(order._id || order.id).slice(-8)}</p>
                    <p className="order-date">
                      {new Date(order.orderDate || order.order_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className="order-status"
                    style={{ color: getStatusColor(order.orderStatus || order.order_status) }}
                  >
                    {order.orderStatus || order.order_status}
                  </span>
                </div>
                
                <div className="order-items-preview">
                  {order.items.slice(0, 3).map((item, index) => (
                    <div key={index} className="preview-item">
                      {item.product.images && item.product.images.length > 0 ? (() => {
                        const imagePath = item.product.images[0];
                        let imageUrl = imagePath;
                        if (!imagePath.startsWith('http')) {
                          const path = imagePath.startsWith('/') ? imagePath : '/' + imagePath;
                          imageUrl = getImageUrl(path);
                        }
                        return (
                          <img 
                            src={imageUrl}
                            alt={item.product.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                            }}
                          />
                        );
                      })() : (
                        <div className="placeholder-image-small">No Image</div>
                      )}
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="more-items">+{order.items.length - 3} more</div>
                  )}
                </div>

                <div className="order-footer">
                  <span className="order-total">₹{Number(order.totalAmount || order.total_amount || 0).toFixed(2)}</span>
                  <div className="order-actions">
                    <Link 
                      to={`/orders/${String(order._id || order.id)}`} 
                      className="btn-view-order"
                    >
                      View Details
                    </Link>
                    <Link 
                      to={`/orders/tracking/${String(order._id || order.id)}`} 
                      className="track-order-btn"
                    >
                      📍 Track
                    </Link>
                    {/* <button 
                      onClick={() => downloadInvoice(order._id || order.id)} 
                      className="btn-download-invoice-small"
                    >
                      📄 Invoice
                    </button> */}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;

