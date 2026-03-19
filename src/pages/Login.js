import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, loginMobile } = useContext(AuthContext);
  const [loginType, setLoginType] = useState('email'); // 'email' or 'mobile'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    mobileCredential: '', // Single field for both MPIN and password
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-detect MPIN vs Password for mobile login
    if (name === 'mobileCredential') {
      // Allow only digits for MPIN (3-6 digits), anything else for password
      const isDigitsOnly = /^\d*$/.test(value);
      
      if (isDigitsOnly && value.length >= 3 && value.length <= 6) {
        // Likely MPIN
        setFormData({
          ...formData,
          [name]: value
        });
      } else if (value.length <= 6) {
        // Could be password or short MPIN
        setFormData({
          ...formData,
          [name]: value
        });
      }
      // Don't allow more than 6 characters for mobile credential
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (loginType === 'email') {
        await login(formData.email, formData.password);
      } else {
        // Auto-detect MPIN vs Password
        const credential = formData.mobileCredential;
        const isDigitsOnly = /^\d+$/.test(credential);
        
        console.log('Auto-detecting credential type:', {
          credential: credential,
          isDigitsOnly: isDigitsOnly,
          length: credential.length
        });
        
        // If it's 6 digits, try PASSWORD first (most common case)
        if (credential.length === 6 && isDigitsOnly) {
          console.log('Trying password login first (6 digits)...');
          try {
            await loginMobile(formData.phone, null, credential);
            console.log('Password login successful!');
          } catch (passwordError) {
            console.log('Password login failed, trying MPIN...', passwordError.response?.data?.message);
            // If password fails, try MPIN
            await loginMobile(formData.phone, credential, null);
          }
        } else if (isDigitsOnly && credential.length >= 3 && credential.length <= 6) {
          // 3-5 digits, likely MPIN
          console.log('Trying MPIN login...');
          await loginMobile(formData.phone, credential, null);
        } else {
          // Non-digits or other length, password
          console.log('Trying password login...');
          await loginMobile(formData.phone, null, credential);
        }
      }
      toast.success('Login successful!');
      
      // Restore pending cart items
      await restorePendingCartItems();
      
      // Get return URL from localStorage or default to home
      const returnUrl = localStorage.getItem('returnUrl') || '/';
      localStorage.removeItem('returnUrl');
      
      // Navigate to return URL
      navigate(returnUrl);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const restorePendingCartItems = async () => {
    try {
      // Check for single pending cart item
      const pendingCartItem = localStorage.getItem('pendingCartItem');
      if (pendingCartItem) {
        const cartData = JSON.parse(pendingCartItem);
        await api.post('/cart/add', cartData);
        localStorage.removeItem('pendingCartItem');
        toast.success('Product added to cart!');
      }
      
      // Check for multiple pending cart items (from variation modal)
      const pendingCartItems = localStorage.getItem('pendingCartItems');
      const pendingProductId = localStorage.getItem('pendingProductId');
      
      if (pendingCartItems && pendingProductId) {
        const variationQuantities = JSON.parse(pendingCartItems);
        const productId = parseInt(pendingProductId);
        
        let successCount = 0;
        const errorMessages = [];
        
        // Get product details to calculate prices
        const productResponse = await api.get(`/products/${productId}`);
        const product = productResponse.data;
        const rangePrices = product.range_prices || [];
        
        // Helper function to get range price
        const getRangePriceForQuantity = (qty) => {
          if (!rangePrices || rangePrices.length === 0) return null;
          const applicableRanges = rangePrices.filter(range => range.min_qty <= qty);
          if (applicableRanges.length === 0) return null;
          return applicableRanges.reduce((max, range) => 
            range.min_qty > max.min_qty ? range : max
          );
        };
        
        // Add each variation to cart
        for (const [key, qty] of Object.entries(variationQuantities)) {
          if (qty > 0) {
            try {
              const [size, colorName] = key.split('::');
              
              let itemPrice = parseFloat(product.price);
              
              // Check variant price
              if (product.variants && product.variants.length > 0) {
                const variant = product.variants.find(v => 
                  v.size === size && v.colorName === colorName
                );
                if (variant && variant.price) {
                  itemPrice = Number(variant.price);
                }
              } else {
                // Check size price
                if (size && product.sizes && product.sizes.length > 0) {
                  const sizeObj = product.sizes.find(s => s.size === size);
                  if (sizeObj && sizeObj.price) {
                    itemPrice = Number(sizeObj.price);
                  }
                }
                
                // Check color price
                if (colorName && product.colors && product.colors.length > 0) {
                  const colorObj = product.colors.find(c => c.colorName === colorName);
                  if (colorObj && colorObj.price) {
                    itemPrice = Number(colorObj.price);
                  }
                }
              }
              
              // Apply range pricing
              if (rangePrices && rangePrices.length > 0) {
                const rangePrice = getRangePriceForQuantity(qty);
                if (rangePrice) {
                  itemPrice = Number(rangePrice.price);
                }
              }
              
              const cartData = {
                productId: productId,
                quantity: qty,
                price: itemPrice,
                color: colorName || null,
                size: size && size !== 'One Size' ? size : null
              };
              
              await api.post('/cart/add', cartData);
              successCount += qty;
            } catch (itemError) {
              console.error('Error adding item to cart:', itemError);
              const errorMsg = itemError.response?.data?.message || `Failed to add ${key}`;
              errorMessages.push(errorMsg);
            }
          }
        }
        
        localStorage.removeItem('pendingCartItems');
        localStorage.removeItem('pendingProductId');
        
        if (successCount > 0) {
          if (errorMessages.length > 0) {
            toast.warning(`Added ${successCount} item(s) to cart. Some items failed: ${errorMessages.join(', ')}`);
          } else {
            toast.success(`Added ${successCount} item(s) to cart!`);
          }
        } else if (errorMessages.length > 0) {
          toast.error(errorMessages.join(', '));
        }
      }
    } catch (error) {
      console.error('Error restoring cart items:', error);
      // Don't show error to user, just log it
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Login</h2>
        
        {/* Login Type Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${loginType === 'email' ? 'active' : ''}`}
            onClick={() => setLoginType('email')}
          >
            Email/Password
          </button>
          <button
            type="button"
            className={`auth-tab ${loginType === 'mobile' ? 'active' : ''}`}
            onClick={() => setLoginType('mobile')}
          >
            Mobile/MPIN
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {loginType === 'email' ? (
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
                <label>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="Enter your password"
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
              </div>
              
              <div className="form-group">
                <label>MPIN or Password</label>
                <input
                  type="password"
                  name="mobileCredential"
                  value={formData.mobileCredential}
                  onChange={handleChange}
                  required
                  placeholder="Enter your MPIN (3-6 digits) or Password"
                  maxLength="6"
                />
                <small className="form-help">
                  Enter 3-6 digit MPIN or your password
                </small>
              </div>
            </>
          )}
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

