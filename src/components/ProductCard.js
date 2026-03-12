import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { getImageUrl as getImageUrlHelper } from '../utils/config';
import './ProductCard.css';

const ProductCard = ({ product, showWishlist = true }) => {
  const { user } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [inWishlist, setInWishlist] = useState(false);
  const [checkingWishlist, setCheckingWishlist] = useState(false);

  const checkWishlistStatus = async () => {
    try {
      const response = await api.get(`/wishlist/check/${product._id || product.id}`);
      setInWishlist(response.data.inWishlist);
    } catch (error) {
      // Ignore errors
    }
  };

  useEffect(() => {
    if (user && showWishlist) {
      checkWishlistStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, product._id, showWishlist]);

  // Debug: Log MOQ data (remove in production)
  useEffect(() => {
    if (product && product.sale_min_qty !== undefined) {
      console.log('Product MOQ:', {
        productId: product._id || product.id,
        productName: product.name,
        sale_min_qty: product.sale_min_qty,
        type: typeof product.sale_min_qty
      });
    }
  }, [product]);

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.info('Please login to add to wishlist');
      return;
    }

    setCheckingWishlist(true);
    try {
      if (inWishlist) {
        await api.delete(`/wishlist/remove/${product._id || product.id}`);
        setInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await api.post('/wishlist/add', { productId: product._id || product.id });
        setInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update wishlist');
    } finally {
      setCheckingWishlist(false);
    }
  };

  const handleChatNow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Add chat functionality here
    console.log('Chat now clicked for product:', product._id || product.id);
    toast.info('Chat feature coming soon!');
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate to product detail page with query parameter to open variation modal
    navigate(`/product-detail/${product._id || product.id}?autoOpen=true`);
  };

  const handleStartOrder = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate to product detail page with query parameter to open variation modal
    navigate(`/product-detail/${product._id || product.id}?autoOpen=true`);
  };

  // Get image URL with proper fallback
  const getImageUrl = () => {
    if (product.images && product.images.length > 0 && product.images[0]) {
      const img = product.images[0];
      // Skip external placeholder URLs
      if (img.includes('via.placeholder.com') || img.includes('placeholder.com')) {
        return null;
      }
      // Return full URL if it's already a full URL, otherwise prepend server URL
      return getImageUrlHelper(img);
    }
    return null;
  };

  // Base64 encoded placeholder image (simple gray square with text)
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
  
  const imageUrl = getImageUrl() || placeholderImage;

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const getBadgeClass = (badge) => {
    const badgeClasses = {
      'New': 'badge-new',
      'Sale': 'badge-sale',
      'Popular': 'badge-popular',
      'Best Seller': 'badge-bestseller',
      'Hot': 'badge-hot'
    };
    return badgeClasses[badge] || 'badge-default';
  };

  if (!product) return null;

  return (
    <div className="product-card-wrapper">
      <Link to={`/product-detail/${product._id || product.id}`} className="product-card">
        <div className="product-image-container">
          <div className="product-image">
            <img
              src={imageUrl}
              alt={product.name || 'Product'}
              onError={(e) => {
                // Prevent infinite loop - if already showing placeholder, stop
                if (e.target.src === placeholderImage) {
                  e.target.onerror = null;
                  return;
                }
                e.target.onerror = null;
                e.target.src = placeholderImage;
              }}
              loading="lazy"
            />
          </div>
          
          {product.badge && (
            <span className={`product-badge ${getBadgeClass(product.badge)}`}>
              {product.badge}
            </span>
          )}
          
          {showWishlist && user && (
            <button
              className={`wishlist-btn ${inWishlist ? 'active' : ''}`}
              onClick={handleWishlistToggle}
              disabled={checkingWishlist}
              title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              {inWishlist ? '❤️' : '🤍'}
            </button>
          )}
          
          {discount > 0 && (
            <span className="discount-badge">{discount}% OFF</span>
          )}
        </div>
        
        <div className="product-info">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <h3 className="product-card-title" style={{ flex: 1, margin: 0 }}>{product.name}</h3>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/product-detail/${product._id || product.id}`);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#ff6700',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
              }}
              title="View product details"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="#ff6700" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          {/* MOQ and Views */}
          <div className="product-meta-info">
            {(() => {
              // Check for sale_min_qty in different possible formats
              const moqRaw = product.sale_min_qty !== undefined ? product.sale_min_qty : 
                            (product.saleMinQty !== undefined ? product.saleMinQty : 
                            (product.min_qty !== undefined ? product.min_qty : 
                            (product.minQty !== undefined ? product.minQty : null)));
              
              // Parse to integer, handle string numbers, default to 1 if not found
              let moqValue = 1; // Default to 1
              if (moqRaw !== null && moqRaw !== undefined && moqRaw !== '' && moqRaw !== 0) {
                const parsed = parseInt(moqRaw, 10);
                if (!isNaN(parsed) && parsed > 0) {
                  moqValue = parsed;
                }
              }
              
              // Always show MOQ (default is 1)
              return (
                <div className="moq-info">
                  <span className="moq-label">MOQ:</span>
                  <span className="moq-value">{moqValue} pieces</span>
                </div>
              );
            })()}
            <div className="views-info">
              <span>👁️  {product.viewCount || product.view_count || 0} views</span>
            </div>
          </div>

          {/* Category and SubCategory Info */}
          {(product.category || product.subcategory) && (
            <div className="supplier-info">
              <span className="supplier-location">
                {product.category || 'Category'}
                {product.subcategory && ` • ${product.subcategory}`}
              </span>
            </div>
          )}

          {/* Price and Rating */}
          <div className="product-card-price-rating">
            <div className="product-card-price">
              <span className="price-symbol">₹</span>
              {product.price ? product.price.toFixed(2) : '0.00'}
              {product.originalPrice && (
                <span className="original-price" style={{ 
                  fontSize: '0.75rem', 
                  color: '#999', 
                  textDecoration: 'line-through',
                  marginLeft: '6px',
                  fontWeight: '400'
                }}>
                  ₹{product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            
            {/* Rating - Modern Star Rating */}
            {(() => {
              const ratingValue = product.rating !== null && product.rating !== undefined 
                ? Number(product.rating) 
                : 0;
              return !isNaN(ratingValue) && ratingValue >= 3 && ratingValue > 0 && (
                <div className="product-card-rating">
                  <div className="modern-rating">
                    <div className="rating-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= Math.round(ratingValue) ? 'star-filled' : 'star-empty'}>
                          {star <= Math.round(ratingValue) ? '⭐' : '☆'}
                        </span>
                      ))}
                    </div>
                    <span className="rating-count">{Number(product.rating).toFixed(1)}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Stock Status */}
          {product.stock === 0 && (
            <div className="out-of-stock">Out of Stock</div>
          )}

          {/* Action Buttons */}
          {product.stock > 0 && (
            <div className="product-card-actions">
              <button className="card-btn card-btn-secondary" onClick={handleChatNow}>
                Chat now
              </button>
              <button className="card-btn card-btn-secondary" onClick={handleAddToCart}>
                Add to cart
              </button>
              <button className="card-btn card-btn-primary" onClick={handleStartOrder}>
                Start order
              </button>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;

