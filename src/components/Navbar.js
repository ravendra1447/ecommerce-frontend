import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [showAppDropdown, setShowAppDropdown] = useState(false);
  const [showOrderProtectionDropdown, setShowOrderProtectionDropdown] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (user) {
      fetchCartCount();
      // Refresh cart count on window focus
      const handleFocus = () => fetchCartCount();
      window.addEventListener('focus', handleFocus);
      
      // Refresh cart count every 5 seconds
      const interval = setInterval(fetchCartCount, 5000);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
      };
    } else {
      setCartCount(0);
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/products/categories/list');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCartCount = async () => {
    try {
      const response = await api.get('/cart');
      if (response.data && response.data.items) {
        const totalItems = response.data.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        setCartCount(totalItems);
      } else {
        setCartCount(0);
      }
    } catch (error) {
      // If cart is empty or error, set count to 0
      setCartCount(0);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setCartCount(0);
  };

  // Category icons mapping
  const getCategoryIcon = (category) => {
    const iconMap = {
      'Apparel & Accessories': '👔',
      'Consumer Electronics': '📱',
      'Shoes & Accessories': '👟',
      'Parents, Kids & Toys': '🧸',
      'Commercial Equipment & Machinery': '🏭',
      'Home & Garden': '🏠',
      'Sports & Entertainment': '⚽',
      'Sportswear & Outdoor Apparel': '👕',
      'Beauty': '💄',
      'Jewelry, Eyewear & Watches': '💍',
      'Electronics': '📱',
      'Clothing': '👕',
      'Footwear': '👟',
      'Home': '🏠',
      'Sports': '⚽',
      'Toys': '🧸',
      'Beauty & Personal Care': '💄',
      'Jewelry': '💍'
    };
    return iconMap[category] || '📦';
  };

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="navbar-top-bar">
        <div className="navbar-top-container">
          {/* Add announcement content here if needed */}
        </div>
      </div>

      <nav className="navbar">
        {/* Main Header */}
        <div className="navbar-header">
          <div className="navbar-header-container">
            <Link to="/" className="navbar-logo">
              <h1>Bangkok Mart</h1>
            </Link>
            
            <div className="navbar-header-right">
              <div className="navbar-utility">
                <div className="utility-item">
                  <span>Deliver to:</span>
                  <span className="flag-icon">🇮🇳</span>
                  <span>IN</span>
                </div>
                <div className="utility-item">
                  <span className="globe-icon">🌐</span>
                  <span>English-INR</span>
                </div>
                <Link to="/cart" className="utility-item cart-utility" style={{ position: 'relative' }}>
                  <span className="cart-icon">🛒</span>
                  {cartCount > 0 && (
                    <span className="cart-badge">{cartCount}</span>
                  )}
                </Link>
                {user ? (
                  <>
                    <Link to="/profile" className="utility-item">
                      <span className="user-icon">👤</span>
                      <span>{user.name || 'Account'}</span>
                    </Link>
                    <button onClick={handleLogout} className="utility-item">
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="utility-item">
                      <span className="user-icon">👤</span>
                      <span>Sign in</span>
                    </Link>
                    <Link to="/register" className="btn-create-account">
                      Create account
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Navigation */}
          <div className="navbar-secondary">
            <div className="navbar-secondary-container">
              <Link to="/help" className="secondary-link">Help Center</Link>
              <div 
                className="secondary-link-wrapper"
                onMouseEnter={() => setShowAppDropdown(true)}
                onMouseLeave={() => setShowAppDropdown(false)}
              >
                <Link 
                  to="/app" 
                  className="secondary-link active" 
                  onClick={(e) => {
                    const isMobile = window.innerWidth <= 768;
                    if (isMobile) {
                      e.preventDefault();
                      setShowAppDropdown(!showAppDropdown);
                    }
                  }}
                >
                  App
                </Link>
                {showAppDropdown && (
                  <div className="app-dropdown">
                    <div className="app-dropdown-content">
                      {/* Get the App Section */}
                      <div className="app-dropdown-section">
                        <h3 className="app-dropdown-title">Get the Bangkok Mart app</h3>
                        <p className="app-dropdown-description">
                          Find products, communicate with suppliers, and manage and pay for your orders with the Bangkok Mart app anytime, anywhere.
                        </p>
                        <div className="app-download-buttons">
                          <button className="app-store-btn" onClick={(e) => e.preventDefault()}>
                            <span className="app-store-icon">🍎</span>
                            <div className="app-store-text">
                              <span className="app-store-label">Download on the</span>
                              <span className="app-store-name">App Store</span>
                            </div>
                          </button>
                          <button className="google-play-btn" onClick={(e) => e.preventDefault()}>
                            <span className="google-play-icon">▶</span>
                            <div className="google-play-text">
                              <span className="google-play-label">GET IT ON</span>
                              <span className="google-play-name">Google Play</span>
                            </div>
                          </button>
                        </div>
                        <div className="qr-code-container">
                          <div className="qr-code-placeholder">
                            <div className="qr-code-text">QR Code</div>
                          </div>
                        </div>
                      </div>

                      {/* Alibaba Lens Section */}
                      <div className="app-dropdown-section bangkok-mart-lens-section">
                        <h3 className="app-dropdown-title">Discover Bangkok Mart Lens</h3>
                        <p className="app-dropdown-description">
                          Use this image search extension to find and compare similar products with wholesale prices and customization options anywhere online.
                        </p>
                        <button className="learn-more-link" onClick={(e) => e.preventDefault()}>
                          Learn more
                        </button>
                        <button className="add-to-chrome-btn" onClick={(e) => e.preventDefault()}>
                          <span className="chrome-icon">🌐</span>
                          <span>Add to Chrome</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <Link to="/sell" className="secondary-link">Sell on Bangkok Mart</Link>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="navbar-main">
          <div className="navbar-container">
            {/* Categories Dropdown */}
            <div 
              className="navbar-categories"
              onMouseEnter={() => setShowCategoriesDropdown(true)}
              onMouseLeave={() => setShowCategoriesDropdown(false)}
            >
              <button className="categories-trigger">
                <span className="hamburger-icon">☰</span>
                <span>All Categories</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              {showCategoriesDropdown && categories.length > 0 && (
                <div className="categories-dropdown">
                  <div className="categories-dropdown-content">
                    {categories.map((category, index) => (
                      <Link
                        key={index}
                        to={`/products?category=${encodeURIComponent(category)}`}
                        className="category-dropdown-item"
                        onClick={() => setShowCategoriesDropdown(false)}
                      >
                        <span className="category-icon">{getCategoryIcon(category)}</span>
                        <span className="category-name">{category}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Links */}
            <div className="navbar-nav-links">
              <Link to="/products?featured=true" className="nav-main-link">Featured selections</Link>
              <div 
                className="nav-main-link-wrapper"
                onMouseEnter={() => setShowOrderProtectionDropdown(true)}
                onMouseLeave={() => setShowOrderProtectionDropdown(false)}
              >
                <Link 
                  to="/order-protection" 
                  className="nav-main-link"
                  onClick={(e) => {
                    const isMobile = window.innerWidth <= 768;
                    if (isMobile) {
                      e.preventDefault();
                      setShowOrderProtectionDropdown(!showOrderProtectionDropdown);
                    }
                  }}
                >
                  Order protections
                </Link>
                {showOrderProtectionDropdown && (
                  <div className="order-protection-dropdown">
                    <div className="order-protection-dropdown-content">
                      {/* Left Section - Trade Assurance Banner */}
                      <div className="order-protection-banner">
                        <div className="trade-assurance-icon">🛡️</div>
                        <h3 className="trade-assurance-title">Trade Assurance</h3>
                        <p className="trade-assurance-headline">Enjoy protection from payment to delivery</p>
                        <button className="learn-more-btn" onClick={(e) => e.preventDefault()}>
                          Learn more
                        </button>
                      </div>

                      {/* Right Section - Protection Features Grid */}
                      <div className="protection-features-grid">
                        <div className="protection-feature-card">
                          <div className="protection-icon">✓</div>
                          <span className="protection-text">Safe & easy payments</span>
                          <span className="protection-arrow">→</span>
                        </div>
                        <div className="protection-feature-card">
                          <div className="protection-icon">💰</div>
                          <span className="protection-text">Money-back policy</span>
                          <span className="protection-arrow">→</span>
                        </div>
                        <div className="protection-feature-card">
                          <div className="protection-icon">🚢</div>
                          <span className="protection-text">Shipping & logistics services</span>
                          <span className="protection-arrow">→</span>
                        </div>
                        <div className="protection-feature-card">
                          <div className="protection-icon">🔧</div>
                          <span className="protection-text">After-sales protections</span>
                          <span className="protection-arrow">→</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="navbar-search">
              <input
                type="text"
                placeholder="Try Saree, Kurti or Search by Product Code"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    navigate(`/products?search=${e.target.value}`);
                  }
                }}
              />
            </div>

            <div className="navbar-menu">
              {user && (
                <>
                  <Link to="/orders" className="nav-link">
                    <span>My Orders</span>
                  </Link>
                  <Link to="/wishlist" className="nav-link">
                    <span>Wishlist</span>
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="nav-link">
                      <span>Admin</span>
                    </Link>
                  )}
                  {user.role === 'supplier' && (
                    <Link to="/supplier/dashboard" className="nav-link">
                      <span>Supplier</span>
                    </Link>
                  )}
                  {user.role === 'reseller' && (
                    <Link to="/reseller/dashboard" className="nav-link">
                      <span>Reseller</span>
                    </Link>
                  )}
                  {user.role === 'delivery_partner' && (
                    <Link to="/delivery/dashboard" className="nav-link">
                      <span>Delivery</span>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;

