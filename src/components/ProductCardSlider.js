import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../utils/config';
import './ProductCardSlider.css';

const ProductCardSlider = ({ product, compact = false, isHero = false, hideCategory = false, hideSeller = false }) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get MOQ from different possible field names (calculate before hooks)
  // Check for sale_min_qty in different possible formats
  let moq = 1; // Default to 1 if not found
  if (product) {
    const moqRaw = product.sale_min_qty !== undefined && product.sale_min_qty !== null ? product.sale_min_qty : 
                   (product.saleMinQty !== undefined && product.saleMinQty !== null ? product.saleMinQty : 
                   (product.min_qty !== undefined && product.min_qty !== null ? product.min_qty : 
                   (product.minQty !== undefined && product.minQty !== null ? product.minQty : null)));
    
    // Parse to integer, handle string numbers, default to 1 if not found
    if (moqRaw !== null && moqRaw !== undefined && moqRaw !== '' && moqRaw !== 0) {
      const parsed = parseInt(moqRaw, 10);
      if (!isNaN(parsed) && parsed > 0) {
        moq = parsed;
      }
    }
  }

  // Handle images - could be array, string, or null/undefined (calculate before hooks)
  const images = useMemo(() => {
    let resultImages = [];
    if (product && product.images) {
      if (Array.isArray(product.images)) {
        resultImages = product.images.filter(img => img && (typeof img === 'string' ? img.trim() !== '' : true));
      } else if (typeof product.images === 'string') {
        // Try to parse if it's a JSON string
        try {
          const parsed = JSON.parse(product.images);
          resultImages = Array.isArray(parsed) ? parsed.filter(img => img && (typeof img === 'string' ? img.trim() !== '' : true)) : [product.images];
        } catch {
          // If not JSON, treat as single image
          resultImages = product.images.trim() !== '' ? [product.images] : [];
        }
      }
    }
    // Fallback to product.image if images array is empty
    if (resultImages.length === 0 && product && product.image) {
      resultImages = [product.image];
    }
    return resultImages;
  }, [product]);

  // Auto-scroll images
  useEffect(() => {
    if (images && images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => 
          prev === images.length - 1 ? 0 : prev + 1
        );
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [images]);

  // Debug: Log MOQ data (remove in production)
  useEffect(() => {
    if (product) {
      console.log('ProductCardSlider MOQ Debug:', {
        productId: product.id || product._id,
        productName: product.name,
        sale_min_qty: product.sale_min_qty,
        saleMinQty: product.saleMinQty,
        min_qty: product.min_qty,
        minQty: product.minQty,
        moq: moq,
        hasMoq: moq !== null
      });
    }
  }, [product, moq]);
  
  // Debug: Log images data
  useEffect(() => {
    if (product) {
      console.log('ProductCardSlider Images Debug:', {
        productId: product.id || product._id,
        productName: product.name,
        rawImages: product.images,
        processedImages: images,
        imagesLength: images.length,
        hasMultipleImages: images.length > 1,
        currentImageIndex: currentImageIndex
      });
    }
  }, [product, images, currentImageIndex]);

  const getImageUrlLocal = (imagePath) => {
    if (!imagePath) return '/placeholder.png';
    if (imagePath.startsWith('http')) return imagePath;
    return getImageUrl(imagePath);
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    if (images && images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? images.length - 1 : prev - 1
      );
    }
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    if (images && images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handleDotClick = (e, index) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  const handleCardClick = () => {
    navigate(`/product-detail/${product.id}`);
  };

  const handleChatNow = (e) => {
    e.stopPropagation();
    // Add chat functionality here
    console.log('Chat now clicked for product:', product.id);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    // Navigate to product detail page with query parameter to open variation modal
    navigate(`/product-detail/${product.id}?autoOpen=true`);
  };

  const handleStartOrder = (e) => {
    e.stopPropagation();
    // Navigate to product detail page with query parameter to open variation modal
    navigate(`/product-detail/${product.id}?autoOpen=true`);
  };

  if (!product) return null;

  const hasVideo = product.video_url || false;
  const views = product.viewCount || product.view_count || product.views || 0;

  // Compact mode for similar items
  if (compact) {
    return (
      <div className={`product-card-slider ${compact ? 'compact-mode' : ''}`} onClick={handleCardClick}>
        {/* Image */}
        <div className="product-image-slider compact-image">
          <img
            src={getImageUrlLocal(images[0])}
            alt={product.name}
            className="product-slider-image"
          />
        </div>

        {/* Compact Info - Only Price and Views */}
        <div className="product-card-info compact-info">
          <div className="compact-price">
            <span className="price-symbol">₹</span>
            {product.price ? product.price.toFixed(2) : '0.00'}
          </div>
          <div className="compact-views">
            {views >= 10 ? `${views}+ views` : `${views} views`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`product-card-slider ${isHero ? 'hero-card' : ''}`} onClick={handleCardClick}>
      {/* Image Slider Section */}
      <div className="product-image-slider">
        <img
          src={getImageUrlLocal(images[currentImageIndex] || images[0])}
          alt={product.name}
          className="product-slider-image"
        />

        {/* Play Button for Video */}
        {hasVideo && currentImageIndex === 0 && (
          <div className="play-button-overlay">
            <div className="play-icon"></div>
          </div>
        )}

        {/* Similar Products Badge */}
        {images.length > 1 && (
          <div className="similar-products-badge">
            <svg className="similar-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
            </svg>
            Similar products
          </div>
        )}

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            {/* Previous/Next Navigation Buttons */}
            <button
              className="slider-nav-btn slider-prev-btn"
              onClick={handlePrevImage}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              className="slider-nav-btn slider-next-btn"
              onClick={handleNextImage}
              aria-label="Next image"
            >
              ›
            </button>
          </>
        )}
        
        {/* Image Dots Indicator - Always show when there are images */}
        {images.length > 0 && (
          <div className="slider-image-dots">
            {images.map((_, index) => (
              <span
                key={index}
                className={`slider-dot ${index === currentImageIndex ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (images.length > 1) {
                    handleDotClick(e, index);
                  }
                }}
                title={`Image ${index + 1} of ${images.length}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Info Section */}
      <div className="product-card-info">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <h3 className="product-card-title" style={{ flex: 1, margin: 0 }}>{product.name}</h3>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/product-detail/${product.id}`);
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

        {/* Price Section */}
        <div className="product-price-section">
          <div className="product-card-price-wrapper">
            {product.originalPrice && product.originalPrice > 0 && product.originalPrice > product.price && (
              <span className="original-price-striked">
                ₹{product.originalPrice.toFixed(2)}
              </span>
            )}
            <div className="product-card-price">
              <span className="price-symbol">₹</span>
              {product.price ? product.price.toFixed(2) : '0.00'}
            </div>
          </div>
          {product.originalPrice && product.originalPrice > 0 && product.originalPrice > product.price && (
            <div className="lower-price-badge">
              Lower priced than similar
            </div>
          )}
        </div>

        {/* MOQ, Sold, Dispatch */}
        <div className="product-meta-info">
          {moq > 0 && (
            <div className="moq-info">
              <span className="moq-label">MOQ:</span>
              <span className="moq-value">{moq}</span>
            </div>
          )}
          {product.sold_count > 0 && (
            <div className="sold-info">
              {product.sold_count} sold
            </div>
          )}
          <div className="dispatch-info">
            ✔{product.dispatch_time || '5'}-day dispatch
          </div>
        </div>

        {/* Seller Information */}
        {!hideSeller && (
          <div className="supplier-info">
            <span className="supplier-location">
              {product.seller_years || '1'} yr {product.seller_country || 'CN'} {product.seller_name || product.seller?.name || 'Company Name'}
            </span>
          </div>
        )}

        {/* Views */}
        <div className="views-info">
          <span>👁️ {views} views</span>
        </div>

        {/* Action Buttons */}
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
      </div>
    </div>
  );
};

export default ProductCardSlider;

