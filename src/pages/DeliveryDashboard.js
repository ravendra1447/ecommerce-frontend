import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import './DeliveryDashboard.css';

const DeliveryDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/partners/delivery/dashboard');
      setDashboardData(response.data);
      if (response.data.message) {
        toast.info(response.data.message);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Failed to load dashboard';
      toast.error(errorMessage);
      // Set empty data to show error message
      setDashboardData({
        partner: null,
        assignedOrders: [],
        stats: { totalDeliveries: 0, totalEarnings: 0, completedDeliveries: 0, pendingEarnings: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      // Capitalize first letter to match database ENUM values
      const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1);
      await api.put(`/partners/delivery/order/${orderId}/status`, { status: capitalizedStatus });
      toast.success('Order status updated successfully');
      fetchDashboard();
    } catch (error) {
      toast.error('Failed to update order status');
      console.error(error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!dashboardData) {
    return <div className="error">Loading dashboard data...</div>;
  }

  const { partner, assignedOrders, stats } = dashboardData;

  // Show message if delivery partner profile not found
  if (!partner) {
    return (
      <div className="delivery-dashboard">
        <div className="dashboard-container">
          <div className="error-message">
            <h2>Delivery Partner Profile Not Found</h2>
            <p>Your delivery partner profile is being set up. Please wait for admin approval or contact support.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Delivery Partner Dashboard</h1>
        </div>

        {/* Status Banner */}
        <div className={`status-banner status-${partner.status}`}>
          <p>
            <strong>Status:</strong> {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
            {partner.status === 'pending' && ' - Waiting for admin approval'}
            {partner.status === 'approved' && ' - You can now receive delivery assignments'}
            {partner.status === 'active' && ' - Active and receiving orders'}
            {partner.status === 'rejected' && ' - Please contact admin for more information'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Deliveries</h3>
            <p className="stat-value">{stats.totalDeliveries}</p>
          </div>
          <div className="stat-card">
            <h3>Completed Today</h3>
            <p className="stat-value">{stats.completedDeliveries}</p>
          </div>
          <div className="stat-card">
            <h3>Total Earnings</h3>
            <p className="stat-value">₹{stats.totalEarnings.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h3>Pending Earnings</h3>
            <p className="stat-value">₹{stats.pendingEarnings.toFixed(2)}</p>
          </div>
        </div>

        {/* Partner Info */}
        <div className="info-section">
          <h2>Partner Information</h2>
          <div className="info-grid">
            <div>
              <strong>Vehicle Type:</strong> {partner.vehicle_type || 'N/A'}
            </div>
            {partner.vehicle_number && (
              <div>
                <strong>Vehicle Number:</strong> {partner.vehicle_number}
              </div>
            )}
            <div>
              <strong>License Number:</strong> {partner.license_number}
            </div>
            {partner.service_area && (
              <div>
                <strong>Service Area:</strong> {partner.service_area}
              </div>
            )}
          </div>
        </div>

        {/* Assigned Orders */}
        <div className="orders-section">
          <h2>Assigned Orders ({assignedOrders.length})</h2>
          {assignedOrders.length === 0 ? (
            <div className="empty-state">
              <p>No orders assigned yet. Orders will appear here once admin assigns them to you.</p>
            </div>
          ) : (
            <div className="orders-list">
              {assignedOrders.map((order) => {
                const orderStatus = order.order_status || order.status || 'Unknown';
                const statusLower = orderStatus.toLowerCase();
                return (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <div>
                      <h3>Order #{order.id}</h3>
                      <p className="order-date">
                        {new Date(order.created_at || order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`order-status status-${statusLower}`}>
                      {orderStatus}
                    </span>
                  </div>
                  
                  <div className="order-details">
                    <div className="detail-row">
                      <strong>Customer:</strong> {order.customer_name}
                    </div>
                    <div className="detail-row">
                      <strong>Phone:</strong> {order.customer_phone}
                    </div>
                    <div className="detail-row">
                      <strong>Delivery Address:</strong>
                      <p className="address">{order.delivery_address}</p>
                    </div>
                    <div className="detail-row">
                      <strong>Order Amount:</strong> ₹{parseFloat(order.total_amount || 0).toFixed(2)}
                    </div>
                  </div>

                  <div className="order-actions">
                    {orderStatus === 'Processing' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'shipped')}
                        className="btn-action btn-ship"
                      >
                        Mark as Shipped
                      </button>
                    )}
                    {orderStatus === 'Shipped' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                        className="btn-action btn-deliver"
                      >
                        Mark as Delivered
                      </button>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryDashboard;

