import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import './Auth.css';

const RegisterSupplier = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    businessName: '',
    legalBusinessName: '',
    gstNumber: '',
    gstCertificate: null,
    businessRegistrationProof: null,
    panNumber: '',
    businessAddress: '',
    bankAccount: '',
    ifscCode: '',
    bankName: '',
    upiId: '',
    preferredPayoutCycle: 'monthly',
    domainName: '',
    webUrl: '',
    dnsRecordType: '',
    hostName: '',
    pointsToTarget: '',
    ttl: '',
    sellerType: 'individual'
  });
  const [loading, setLoading] = useState(false);
  const [gstCertificatePreview, setGstCertificatePreview] = useState(null);
  const [registrationProofPreview, setRegistrationProofPreview] = useState(null);

  const handleChange = (e) => {
    if (e.target.type === 'file') {
      const file = e.target.files[0];
      if (file) {
        setFormData({
          ...formData,
          [e.target.name]: file
        });
        // Create preview for images
        const reader = new FileReader();
        reader.onloadend = () => {
          if (e.target.name === 'gstCertificate') {
            setGstCertificatePreview(reader.result);
          } else if (e.target.name === 'businessRegistrationProof') {
            setRegistrationProofPreview(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Create FormData for file uploads
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          submitData.append(key, formData[key]);
        }
      });

      const response = await api.post('/partners/supplier/register', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success(response.data.message || 'Registration successful!');
      navigate('/supplier/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Registration failed';
      toast.error(errorMessage);
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => {
          toast.error(err.msg || err.message);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Become a Supplier</h2>
        <p className="auth-subtitle">Join ShriMart as a supplier and start selling your products</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Personal Information Section */}
          <div className="form-section">
            <h3>Personal Information</h3>
            
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 XXXXX XXXXX"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                required
                minLength="6"
              />
            </div>
          </div>

          {/* Business Information Section */}
          <div className="form-section">
            <h3>Business Information</h3>
            
            <div className="form-group">
              <label>Business Name *</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Your business name"
                required
                maxLength="255"
              />
            </div>

            <div className="form-group">
              <label>Legal Business Name</label>
              <textarea
                name="legalBusinessName"
                value={formData.legalBusinessName}
                onChange={handleChange}
                placeholder="Enter your legal business name as per registration"
                rows="2"
              />
            </div>

            <div className="form-group">
              <label>Seller Type *</label>
              <select
                name="sellerType"
                value={formData.sellerType}
                onChange={handleChange}
                required
              >
                <option value="individual">Individual</option>
                <option value="proprietorship">Proprietorship</option>
                <option value="partnership">Partnership</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>GST Number</label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleChange}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength="50"
                />
              </div>

              <div className="form-group">
                <label>PAN Number</label>
                <input
                  type="text"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleChange}
                  placeholder="ABCDE1234F"
                  maxLength="50"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>GST Certificate</label>
                <input
                  type="file"
                  name="gstCertificate"
                  onChange={handleChange}
                  accept="image/*,.pdf"
                />
                {gstCertificatePreview && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={gstCertificatePreview} alt="GST Certificate Preview" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Business Registration Proof</label>
                <input
                  type="file"
                  name="businessRegistrationProof"
                  onChange={handleChange}
                  accept="image/*,.pdf"
                />
                {registrationProofPreview && (
                  <div style={{ marginTop: '10px' }}>
                    <img src={registrationProofPreview} alt="Registration Proof Preview" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Business Address</label>
              <textarea
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleChange}
                placeholder="Enter your complete business address"
                rows="3"
              />
            </div>
          </div>

          {/* Banking Details Section */}
          <div className="form-section">
            <h3>Banking Details</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  placeholder="e.g., State Bank of India"
                />
              </div>

              <div className="form-group">
                <label>Bank Account Number</label>
                <input
                  type="text"
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleChange}
                  placeholder="Your account number"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>IFSC Code</label>
                <input
                  type="text"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  placeholder="SBIN0001234"
                  maxLength="11"
                />
              </div>

              <div className="form-group">
                <label>UPI ID</label>
                <input
                  type="text"
                  name="upiId"
                  value={formData.upiId}
                  onChange={handleChange}
                  placeholder="yourname@upi"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Preferred Payout Cycle *</label>
              <select
                name="preferredPayoutCycle"
                value={formData.preferredPayoutCycle}
                onChange={handleChange}
                required
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Domain Information Section */}
          <div className="form-section">
            <h3>Domain Information (Optional)</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Domain Name</label>
                <input
                  type="text"
                  name="domainName"
                  value={formData.domainName}
                  onChange={handleChange}
                  placeholder="yourbusiness.com"
                  maxLength="255"
                />
              </div>

              <div className="form-group">
                <label>Web URL</label>
                <input
                  type="url"
                  name="webUrl"
                  value={formData.webUrl}
                  onChange={handleChange}
                  placeholder="https://www.yourbusiness.com"
                  maxLength="255"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Host Name</label>
                <input
                  type="text"
                  name="hostName"
                  value={formData.hostName}
                  onChange={handleChange}
                  placeholder="shop.yourbusiness.com"
                  maxLength="255"
                />
              </div>

              <div className="form-group">
                <label>DNS Record Type</label>
                <input
                  type="text"
                  name="dnsRecordType"
                  value={formData.dnsRecordType}
                  onChange={handleChange}
                  placeholder="A, CNAME, MX, etc."
                  maxLength="255"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Points To Target</label>
                <input
                  type="text"
                  name="pointsToTarget"
                  value={formData.pointsToTarget}
                  onChange={handleChange}
                  placeholder="IP address or domain"
                  maxLength="255"
                />
              </div>

              <div className="form-group">
                <label>TTL (Time To Live)</label>
                <input
                  type="text"
                  name="ttl"
                  value={formData.ttl}
                  onChange={handleChange}
                  placeholder="3600"
                  maxLength="255"
                />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register as Supplier'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterSupplier;

