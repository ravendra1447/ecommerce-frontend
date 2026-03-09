import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import './AdminBanners.css';

const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    tagline: '',
    buttonText: 'Shop Now',
    buttonLink: '/products',
    qrText: 'Scan now to install',
    highlightText: '',
    isActive: 1
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await api.get('/banners');
      setBanners(response.data);
    } catch (error) {
      toast.error('Failed to fetch banners');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await api.put(`/banners/${editingBanner.id}`, formData);
        toast.success('Banner updated successfully');
      } else {
        await api.post('/banners', formData);
        toast.success('Banner created successfully');
      }
      setShowForm(false);
      setEditingBanner(null);
      resetForm();
      fetchBanners();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save banner');
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      tagline: banner.tagline || '',
      buttonText: banner.button_text || 'Shop Now',
      buttonLink: banner.button_link || '/products',
      qrText: banner.qr_text || 'Scan now to install',
      highlightText: banner.highlight_text || '',
      isActive: banner.is_active || 1
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) {
      return;
    }
    try {
      await api.delete(`/banners/${id}`);
      toast.success('Banner deleted successfully');
      fetchBanners();
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      tagline: '',
      buttonText: 'Shop Now',
      buttonLink: '/products',
      qrText: 'Scan now to install',
      highlightText: '',
      isActive: 1
    });
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-banners-page">
      <div className="admin-banners-container">
        <div className="banners-header">
          <h2>Manage Banners</h2>
          <button 
            onClick={() => {
              setShowForm(true);
              setEditingBanner(null);
              resetForm();
            }}
            className="btn-add-banner"
          >
            + Add New Banner
          </button>
        </div>

        {showForm && (
          <div className="banner-form-section">
            <h3>{editingBanner ? 'Edit Banner' : 'Create New Banner'}</h3>
            <form onSubmit={handleSubmit} className="banner-form">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Upto 35% OFF on 1st app order"
                  required
                />
              </div>

              <div className="form-group">
                <label>Subtitle *</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g., Smart Shopping"
                  required
                />
              </div>

              <div className="form-group">
                <label>Tagline</label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g., Trusted by Millions"
                />
              </div>

              <div className="form-group">
                <label>Highlight Text</label>
                <input
                  type="text"
                  value={formData.highlightText}
                  onChange={(e) => setFormData({ ...formData, highlightText: e.target.value })}
                  placeholder="e.g., 35% OFF"
                />
                <small>Text to highlight in the title (will be shown in orange)</small>
              </div>

              <div className="form-group">
                <label>Button Text</label>
                <input
                  type="text"
                  value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                  placeholder="Shop Now"
                />
              </div>

              <div className="form-group">
                <label>Button Link</label>
                <input
                  type="text"
                  value={formData.buttonLink}
                  onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                  placeholder="/products"
                />
              </div>

              <div className="form-group">
                <label>QR Text</label>
                <input
                  type="text"
                  value={formData.qrText}
                  onChange={(e) => setFormData({ ...formData, qrText: e.target.value })}
                  placeholder="Scan now to install"
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isActive === 1}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked ? 1 : 0 })}
                  />
                  Active (Only one active banner will be shown on homepage)
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-save">
                  {editingBanner ? 'Update Banner' : 'Create Banner'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingBanner(null);
                    resetForm();
                  }}
                  className="btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="banners-list">
          {banners.length === 0 ? (
            <div className="no-banners">
              <p>No banners found. Create your first banner!</p>
            </div>
          ) : (
            banners.map(banner => (
              <div key={banner.id} className="banner-card">
                <div className="banner-card-header">
                  <div>
                    <h4>{banner.title}</h4>
                    <span className={`banner-status ${banner.is_active ? 'active' : 'inactive'}`}>
                      {banner.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="banner-actions">
                    <button onClick={() => handleEdit(banner)} className="btn-edit">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(banner.id)} className="btn-delete">
                      Delete
                    </button>
                  </div>
                </div>
                <div className="banner-card-content">
                  <p><strong>Subtitle:</strong> {banner.subtitle}</p>
                  <p><strong>Tagline:</strong> {banner.tagline || 'N/A'}</p>
                  <p><strong>Button:</strong> {banner.button_text} → {banner.button_link}</p>
                  <p><strong>QR Text:</strong> {banner.qr_text}</p>
                  {banner.highlight_text && (
                    <p><strong>Highlight:</strong> {banner.highlight_text}</p>
                  )}
                  <p><strong>Created:</strong> {new Date(banner.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBanners;

