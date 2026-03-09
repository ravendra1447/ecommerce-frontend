import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register, registerMobile } = useContext(AuthContext);
  const [registerType, setRegisterType] = useState('email'); // 'email' or 'mobile'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    mpin: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (registerType === 'email') {
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
    } else {
      if (formData.mpin.length < 4 || formData.mpin.length > 6) {
        toast.error('MPIN must be 4-6 digits');
        return;
      }
      if (!/^\d+$/.test(formData.mpin)) {
        toast.error('MPIN must contain only numbers');
        return;
      }
    }

    setLoading(true);

    try {
      if (registerType === 'email') {
        await register(formData);
      } else {
        await registerMobile({
          phone: formData.phone,
          mpin: formData.mpin,
          name: formData.name,
          email: formData.email || undefined
        });
      }
      toast.success('Registration successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Register</h2>
        
        {/* Register Type Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${registerType === 'email' ? 'active' : ''}`}
            onClick={() => setRegisterType('email')}
          >
            Email/Password
          </button>
          <button
            type="button"
            className={`auth-tab ${registerType === 'mobile' ? 'active' : ''}`}
            onClick={() => setRegisterType('mobile')}
          >
            Mobile/MPIN
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your name"
            />
          </div>
          
          {registerType === 'email' ? (
            <>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label>Phone (Optional)</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password (min 6 characters)"
                  minLength="6"
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="Enter your phone number (e.g., 919999480404)"
                  pattern="[0-9]{10,12}"
                />
                <small>Enter 10-12 digit phone number (with country code)</small>
              </div>
              <div className="form-group">
                <label>MPIN</label>
                <input
                  type="password"
                  name="mpin"
                  value={formData.mpin}
                  onChange={handleChange}
                  required
                  placeholder="Enter 4-6 digit MPIN"
                  minLength="4"
                  maxLength="6"
                  pattern="[0-9]{4,6}"
                />
                <small>Enter 4-6 digit MPIN (numbers only)</small>
              </div>
              <div className="form-group">
                <label>Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email (optional)"
                />
              </div>
            </>
          )}
          
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

