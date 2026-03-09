import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import './AdminCoupons.css';

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minPurchase: '',
    maxDiscount: '',
    usageLimit: '',
    validFrom: '',
    validUntil: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const response = await api.get('/coupons');
      setCoupons(response.data.coupons || []);
    } catch (error) {
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/coupons', formData);
      toast.success('Coupon created successfully');
      setShowForm(false);
      setFormData({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        minPurchase: '',
        maxDiscount: '',
        usageLimit: '',
        validFrom: '',
        validUntil: ''
      });
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create coupon');
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await api.put(`/coupons/${id}`, { isActive: !currentStatus });
      toast.success('Coupon updated');
      fetchCoupons();
    } catch (error) {
      toast.error('Failed to update coupon');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) {
      return;
    }
    try {
      await api.delete(`/coupons/${id}`);
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-coupons-page">
      <div className="admin-coupons-container">
        <div className="coupons-header">
          <h1>Coupon Management</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-add-coupon"
          >
            {showForm ? 'Cancel' : '+ Create Coupon'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="coupon-form">
            <h2>Create New Coupon</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label>Coupon Code <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  placeholder="SAVE10"
                />
              </div>
              <div className="form-group">
                <label>Discount Type <span className="required">*</span></label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  required
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Discount Value <span className="required">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  required
                  min="0"
                  placeholder={formData.discountType === 'percentage' ? '10' : '100'}
                />
              </div>
              <div className="form-group">
                <label>Min Purchase (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.minPurchase}
                  onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            {formData.discountType === 'percentage' && (
              <div className="form-group">
                <label>Max Discount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  min="0"
                  placeholder="No limit"
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Usage Limit</label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  min="0"
                  placeholder="Unlimited"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Special offer coupon"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Valid From <span className="required">*</span></label>
                <input
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Valid Until <span className="required">*</span></label>
                <input
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save">Create Coupon</button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="coupons-list">
          <h2>All Coupons ({coupons.length})</h2>
          
          {coupons.length === 0 ? (
            <p className="no-coupons">No coupons created yet</p>
          ) : (
            <table className="coupons-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min Purchase</th>
                  <th>Usage</th>
                  <th>Valid Period</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map(coupon => {
                  const now = new Date();
                  const validFrom = new Date(coupon.valid_from);
                  const validUntil = new Date(coupon.valid_until);
                  const isExpired = now > validUntil;
                  const isActive = coupon.is_active === 1 && !isExpired;
                  
                  return (
                    <tr key={coupon.id}>
                      <td>
                        <strong>{coupon.code}</strong>
                        {coupon.description && (
                          <div className="coupon-desc">{coupon.description}</div>
                        )}
                      </td>
                      <td>
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}%`
                          : `₹${coupon.discount_value}`}
                        {coupon.max_discount && coupon.discount_type === 'percentage' && (
                          <div className="coupon-max">Max: ₹{coupon.max_discount}</div>
                        )}
                      </td>
                      <td>₹{coupon.min_purchase || 0}</td>
                      <td>
                        {coupon.usage_limit 
                          ? `${coupon.used_count}/${coupon.usage_limit}`
                          : `${coupon.used_count} (Unlimited)`}
                      </td>
                      <td>
                        <div>{formatDate(coupon.valid_from)}</div>
                        <div>to {formatDate(coupon.valid_until)}</div>
                        {isExpired && <span className="expired-badge">Expired</span>}
                      </td>
                      <td>
                        <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="coupon-actions">
                          <button
                            onClick={() => handleToggleActive(coupon.id, coupon.is_active)}
                            className={`btn-toggle ${isActive ? 'deactivate' : 'activate'}`}
                          >
                            {isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            className="btn-delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCoupons;

