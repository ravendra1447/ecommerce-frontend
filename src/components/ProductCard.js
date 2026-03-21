import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { getImageUrl as getImageUrlHelper } from '../utils/config';
import './ProductCard.css';

const ProductCard = ({ product, showWishlist = true, showThumbnails = true }) => {
  const { user } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [inWishlist, setInWishlist] = useState(false);
  const [checkingWishlist, setCheckingWishlist] = useState(false);
  const thumbnailContainerRef = React.useRef(null);

  console.log('🔍 ProductCard Props:', {
    productName: product?.name,
    showThumbnails,
    showWishlist
  });

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

  const handleThumbnailScroll = (direction) => {
    if (!thumbnailContainerRef.current) {
      console.log('❌ No container ref found');
      return;
    }
    
    const container = thumbnailContainerRef.current;
    console.log('🔍 Container:', container);
    console.log('🔍 Scroll width:', container.scrollWidth, 'Client width:', container.clientWidth);
    
    // Calculate scroll amount based on thumbnail width
    const thumbnailWidth = 66; // 50px image + 8px gap + padding
    const scrollAmount = thumbnailWidth * 2; // Scroll by 2 thumbnails
    
    if (direction === 'left') {
      console.log('⬅️ Scrolling left by:', scrollAmount);
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      console.log('➡️ Scrolling right by:', scrollAmount);
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleThumbnailClick = (index) => {
    console.log('🖱️ Thumbnail clicked:', index);
    // For ProductCard, just log the selection and scroll into view
    if (thumbnailContainerRef.current) {
      const thumbnailElements = thumbnailContainerRef.current.querySelectorAll('.thumbnail-wrapper');
      console.log('🔍 Found thumbnail elements:', thumbnailElements.length);
      if (thumbnailElements[index]) {
        console.log('✅ Scrolling to thumbnail:', index);
        thumbnailElements[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    } else {
      console.log('❌ No container ref for click');
    }
    console.log('Selected thumbnail:', index);
  };

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
    // Navigate to product detail page
    navigate(`/product-detail/${product._id || product.id}`);
  };

  const handleStartOrder = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate to product detail page
    navigate(`/product-detail/${product._id || product.id}`);
  };

  // Get image URL with proper fallback
  const getImageUrl = () => {
    // Check for color-specific image first
    if (product.selectedColor && product.images && product.images.length > 0) {
      const img = product.images[0];
      if (img && !img.includes('via.placeholder.com') && !img.includes('placeholder.com')) {
        return getImageUrlHelper(img);
      }
    }
    
    // Regular image handling
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

  // Base64 encoded placeholder image (better quality)
  const placeholderImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE0MCIgcj0iMzAiIGZpbGw9IiNkZGRkZGQiLz48cmVjdCB4PSIxMzAiIHk9IjE4MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQiIGZpbGw9IiNkZGRkZGQiLz48cmVjdCB4PSIxMjAiIHk9IjE5MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjQiIGZpbGw9IiNkZGRkZGQiLz48cmVjdCB4PSIxMzAiIHk9IjIwMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQiIGZpbGw9IiNkZGRkZGQiLz48dGV4dCB4PSIxNTAiIHk9IjI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
  
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
            <div style={{ flex: 1 }}>
              <h3 className="product-card-title" style={{ margin: '0 0 8px 0' }}>{product.name}</h3>
              
              {/* Thumbnail section - ProductDetail style slider */}
              {(() => {
                console.log('🔍 Thumbnail render check:', {
                  productName: product.name,
                  showThumbnails,
                  shouldRender: showThumbnails !== false && product.images && product.images.length > 0,
                  imagesCount: product.images?.length || 0
                });
                return showThumbnails !== false && product.images && product.images.length > 0;
              })() && (
                <>
                  {/* Debug logging */}
                  {console.log('🔍 ProductCard Thumbnail Debug:', {
                    productName: product.name,
                    selectedColor: product.selectedColor,
                    imagesCount: product.images?.length || 0,
                    images: product.images
                  })}
                  <div className="thumbnail-images-container" style={{
                    marginTop: '8px',
                    marginBottom: '8px',
                    position: 'relative',
                    width: '100%',
                    maxWidth: '350px',
                    overflow: 'hidden'
                  }}>
                    {/* Thumbnail Navigation Buttons */}
                    {product.images.length > 3 && (
                      <>
                        <button
                          className="thumbnail-nav-btn thumbnail-prev-btn"
                          onClick={() => handleThumbnailScroll('left')}
                          aria-label="Previous thumbnails"
                          style={{
                            position: 'absolute',
                            left: '0',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(255, 103, 0, 0.8)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            zIndex: '10',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ‹
                        </button>
                        <button
                          className="thumbnail-nav-btn thumbnail-next-btn"
                          onClick={() => handleThumbnailScroll('right')}
                          aria-label="Next thumbnails"
                          style={{
                            position: 'absolute',
                            right: '0',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(255, 103, 0, 0.8)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            zIndex: '10',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ›
                        </button>
                      </>
                    )}
                    <div className="thumbnail-images" ref={thumbnailContainerRef} style={{
                      display: 'flex',
                      gap: '8px',
                      overflowX: 'scroll',
                      overflowY: 'hidden',
                      padding: '4px 0',
                      scrollBehavior: 'smooth',
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#ff6b00 #f1f1f1',
                      scrollSnapType: 'x mandatory',
                      width: '100%',
                      flexWrap: 'nowrap',
                      height: '80px'
                    }}>
                      {product.images.map((img, index) => {
                        console.log(`🖼️ Rendering thumbnail ${index}:`, img);
                        
                        const getColorName = () => {
                          if (product.selectedColor) {
                            return `${product.selectedColor}`;
                          }
                          return `Color ${index + 1}`;
                        };
                        
                        return (
                          <div key={index} className="thumbnail-wrapper" style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            flexShrink: 0
                          }}>
                            <img
                              src={getImageUrl(img)}
                              alt={`${product.name} ${index + 1}`}
                              className={index === 0 ? 'active' : ''}
                              onClick={() => handleThumbnailClick(index)}
                              style={{
                                width: '50px',
                                height: '50px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '2px solid #e0e0e0',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                flexShrink: 0
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.borderColor = '#ff6700';
                                e.target.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.borderColor = '#e0e0e0';
                                e.target.style.transform = 'scale(1)';
                              }}
                            />
                            <span style={{
                              fontSize: '10px',
                              color: '#666',
                              textAlign: 'center',
                              maxWidth: '60px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {getColorName()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
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
          {(() => {
            // Check if product has unlimited stock maintenance type
            if (product.stock_maintane_type === 'Unlimited') {
              return null; // Don't show out of stock for unlimited stock products
            }
            // Show out of stock only if stock is 0 and not unlimited
            return product.stock === 0 ? (
              <div className="out-of-stock">Out of Stock</div>
            ) : null;
          })()}

          {/* Action Buttons */}
          {(() => {
            // Show action buttons if stock is greater than 0 OR if stock maintenance type is Unlimited
            if (product.stock > 0 || product.stock_maintane_type === 'Unlimited') {
              return (
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
              );
            }
            return null;
          })()}
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;

