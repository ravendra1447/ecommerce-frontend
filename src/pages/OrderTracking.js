import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import './OrderTracking.css';

const OrderTracking = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTracking = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/tracking/${id}`);
      setOrder(response.data.order);
      setTracking(response.data.tracking);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch tracking information');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return '📦';
      case 'Processing':
        return '⚙️';
      case 'Shipped':
        return '🚚';
      case 'Delivered':
        return '✅';
      case 'Cancelled':
        return '❌';
      default:
        return '📋';
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

  const getStatusSteps = () => {
    const steps = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    const currentStatusIndex = steps.indexOf(order?.status);
    
    return steps.map((step, index) => {
      const trackingEntry = tracking.find(t => t.status === step);
      const isCompleted = index <= currentStatusIndex;
      const isCurrent = index === currentStatusIndex;
      
      return {
        step,
        isCompleted,
        isCurrent,
        trackingEntry,
        icon: getStatusIcon(step),
        color: getStatusColor(step)
      };
    });
  };

  if (loading) {
    return <div className="loading">Loading tracking information...</div>;
  }

  if (!order) {
    return (
      <div className="tracking-error">
        <h2>Order not found</h2>
        <Link to="/orders">Go back to Orders</Link>
      </div>
    );
  }

  const statusSteps = getStatusSteps();

  return (
    <div className="order-tracking-page">
      <div className="tracking-container">
        <Link to="/orders" className="back-link">← Back to Orders</Link>
        
        <div className="tracking-header">
          <h2>Order Tracking</h2>
          <div className="order-info-card">
            <div className="info-item">
              <span className="info-label">Order ID:</span>
              <span className="info-value">#{order.id || order.orderId}</span>
            </div>
            {order.trackingNumber && (
              <div className="info-item">
                <span className="info-label">Tracking Number:</span>
                <span className="info-value">{order.trackingNumber}</span>
              </div>
            )}
            {order.carrier && (
              <div className="info-item">
                <span className="info-label">Carrier:</span>
                <span className="info-value">{order.carrier}</span>
              </div>
            )}
            {order.estimatedDelivery && (
              <div className="info-item">
                <span className="info-label">Estimated Delivery:</span>
                <span className="info-value">{new Date(order.estimatedDelivery).toLocaleDateString('en-IN')}</span>
              </div>
            )}
            <div className="info-item">
              <span className="info-label">Current Status:</span>
              <span 
                className="info-value status-badge"
                style={{ color: getStatusColor(order.status) }}
              >
                {getStatusIcon(order.status)} {order.status}
              </span>
            </div>
          </div>
        </div>

        <div className="tracking-timeline">
          <h3>Order Status Timeline</h3>
          
          <div className="timeline-container">
            {statusSteps.map((step, index) => (
              <div key={step.step} className="timeline-item">
                <div className="timeline-line" style={{
                  backgroundColor: step.isCompleted ? step.color : '#e0e0e0'
                }}></div>
                
                <div className={`timeline-dot ${step.isCompleted ? 'completed' : ''} ${step.isCurrent ? 'current' : ''}`}
                     style={{
                       backgroundColor: step.isCompleted ? step.color : '#e0e0e0',
                       borderColor: step.color
                     }}>
                  <span className="timeline-icon">{step.icon}</span>
                </div>
                
                <div className="timeline-content">
                  <div className="timeline-status">
                    <h4 style={{ color: step.isCompleted ? step.color : '#666' }}>
                      {step.step}
                    </h4>
                    {step.trackingEntry && (
                      <div className="timeline-details">
                        <p className="timeline-message">{step.trackingEntry.message}</p>
                        <p className="timeline-location">
                          📍 {step.trackingEntry.location}
                        </p>
                        <p className="timeline-time">
                          {step.trackingEntry.date} at {step.trackingEntry.time}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tracking-history">
          <h3>Detailed History</h3>
          {tracking.length === 0 ? (
            <p className="no-history">No tracking history available yet.</p>
          ) : (
            <div className="history-list">
              {tracking.map((entry, index) => (
                <div key={index} className="history-item">
                  <div className="history-icon" style={{ color: getStatusColor(entry.status) }}>
                    {getStatusIcon(entry.status)}
                  </div>
                  <div className="history-content">
                    <h4>{entry.status}</h4>
                    <p className="history-message">{entry.message}</p>
                    <div className="history-meta">
                      <span className="history-location">📍 {entry.location}</span>
                      <span className="history-time">
                        {entry.date} at {entry.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shipping-address-card">
          <h3>Shipping Address</h3>
          <div className="address-details">
            <p>{order.shippingAddress?.street}</p>
            <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}</p>
            {order.shippingAddress?.phone && (
              <p><strong>Phone:</strong> {order.shippingAddress.phone}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;

