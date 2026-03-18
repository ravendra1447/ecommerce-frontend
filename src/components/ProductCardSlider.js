import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../utils/config';
import ProductCard from './ProductCard';
import './ProductCardSlider.css';
import './MultiColorProductCard.css';

const ProductCardSlider = ({ product, compact = false, isHero = false, hideCategory = false, hideSeller = false }) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [thumbnailScrollPosition, setThumbnailScrollPosition] = useState(0);
  const thumbnailContainerRef = React.useRef(null);

  // All hooks must be called before any early returns
  const hasVideo = product?.video_url || false;
  const views = product?.viewCount || product?.view_count || product?.views || 0;
  
  // Get MOQ from different possible field names (calculate before hooks)
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

  // Get images with proper fallback
  const images = useMemo(() => {
    if (!product) return [];
    
    // Priority: variant images > product images > empty array
    let productImages = [];
    
    // Check for variant images first
    if (product.variants && product.variants.length > 0) {
      const variantImages = product.variants
        .filter(v => v.image || v.imageUrl)
        .map(v => v.image || v.imageUrl);
      
      if (variantImages.length > 0) {
        productImages = [...new Set(variantImages)]; // Remove duplicates
      }
    }
    
    // Fallback to product images if no variant images
    if (productImages.length === 0 && product.images && product.images.length > 0) {
      productImages = product.images;
    }
    
    console.log('🖼️ ProductCardSlider - Final images:', productImages);
    return productImages;
  }, [product]);

  // Debug: Log when images change
  useEffect(() => {
    console.log('🖼️ Images updated:', {
      count: images?.length || 0,
      images: images?.slice(0, 3)
    });
  }, [images]);

  // Auto-rotate images every 3 seconds (disabled for manual control)
  /*
  useEffect(() => {
    if (images.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [images]);
  */

  // Early returns after all hooks are called
  if (!product) return null;

  // Check for color variants and show multiple cards if they exist
  const getColorVariants = () => {
    console.log('🔍 ProductCardSlider - Checking for color variants in product:', product.name);
    console.log('🔍 Product data:', {
      hasVariants: !!product.variants,
      variantsCount: product.variants?.length || 0,
      hasColors: !!product.colors,
      colorsCount: product.colors?.length || 0,
      imagesCount: images?.length || 0,
      variants: product.variants,
      colors: product.colors
    });
    
    // FIRST PRIORITY: Use variants data to get exact color information
    if (product.variants && product.variants.length > 0) {
      console.log('📋 Using product.variants array');
      const result = product.variants.map((variant, index) => ({
        colorName: variant.colorName || variant.color || `Color ${index + 1}`,
        colorCode: variant.colorCode || null,
        imageUrl: variant.imageUrl || variant.image || (images && images[index]) || null
      }));
      console.log('🎨 Color variants from variants array:', result);
      return result;
    }
    
    // SECOND PRIORITY: Use product.colors array
    if (product.colors && product.colors.length > 0) {
      console.log('� Using product.colors array');
      const result = product.colors.map((color, index) => ({
        colorName: color.colorName || color.color || `Color ${index + 1}`,
        colorCode: color.colorCode || null,
        imageUrl: color.imageUrl || color.image || (images && images[index]) || null
      }));
      console.log('🎨 Color variants from colors array:', result);
      return result;
    }
    
    // THIRD PRIORITY: Parse variations string/array
    if (product.variations) {
      console.log('� Using variations data');
      let parsedVariations = [];
      
      // Parse variations if it's a string
      if (typeof product.variations === 'string') {
        try {
          parsedVariations = JSON.parse(product.variations);
          console.log('✅ Parsed variations:', parsedVariations);
        } catch (e) {
          console.log('❌ Failed to parse variations:', e);
        }
      } else if (Array.isArray(product.variations)) {
        parsedVariations = product.variations;
      }
      
      // Use parsed variations - ONLY return actual variations, not all images
      if (parsedVariations.length > 0) {
        const result = parsedVariations.map((v, index) => ({
          colorName: v.color || v.name || v.colorName || v.value || `Color ${index + 1}`,
          colorCode: v.colorCode || v.color || null,
          imageUrl: v.imageUrl || v.image || (images && images[index]) || null
        }));
        console.log('🎨 Color variants from variations:', result);
        return result;
      }
    }
    
    console.log('🎨 No color variants found');
    return [];
  };

  const colorVariants = getColorVariants();
  console.log('🎨 ProductCardSlider - Color variants:', colorVariants.length);

  // If we have color variants, Create cards based on actual colors from variations, not total images
  if (colorVariants.length > 0) {
    console.log('🎨 Creating cards for color variants:', colorVariants.length);
    
    return (
      <div className="color-variants-container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        width: '100%'
      }}>
        {colorVariants.map((colorVariant, index) => {
          console.log(`🎨 Creating card ${index} for color:`, colorVariant);
          
          // Create variant product with only this color's image
          const variantProduct = { ...product };
          variantProduct.images = [colorVariant.imageUrl]; // Only this variant's image
          variantProduct.selectedColor = colorVariant.colorName;
          variantProduct.colorCode = colorVariant.colorCode;
          
          return (
            <div key={`${product.id || product._id}-color-${index}`} className="color-variant-card">
              <ProductCard 
                product={{
                  ...variantProduct,
                  name: product.name, // Keep original product name
                  images: [colorVariant.imageUrl] // Only show this variant's image
                }} 
                showWishlist={true}
              />
              {colorVariant.colorName && (
                <div className="color-indicator">
                  {colorVariant.colorCode ? (
                    <span 
                      className="color-dot" 
                      style={{ backgroundColor: colorVariant.colorCode }}
                      title={colorVariant.colorName}
                    />
                  ) : (
                    <span className="color-label" title={colorVariant.colorName}>
                      {colorVariant.colorName}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Images should ONLY change when user manually clicks navigation buttons or dots
  // NO automatic carousel functionality
  /*
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
  */

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
    setCurrentImageIndex(index);
    // Scroll the thumbnail into view
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

  const getImageUrlLocal = (imagePath) => {
    if (!imagePath) return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE0MCIgcj0iMzAiIGZpbGw9IiNkZGRkZGQiLz48cmVjdCB4PSIxMzAiIHk9IjE4MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQiIGZpbGw9IiNkZGRkZGQiLz48cmVjdCB4PSIxMjAiIHk9IjE5MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjQiIGZpbGw9IiNkZGRkZGQiLz48cmVjdCB4PSIxMzAiIHk9IjIwMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQiIGZpbGw9IiNkZGRkZGQiLz48dGV4dCB4PSIxNTAiIHk9IjI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
    if (imagePath.startsWith('http')) return imagePath;
    const url = getImageUrl(imagePath);
    return url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE0MCIgcj0iMzAiIGZpbGw9IiNkZGRkZGQiLz48cmVjdCB4PSIxMzAiIHk9IjE4MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQiIGZpbGw9IiNkZGRkZGQiLz48cmVjdCB4PSIxMjAiIHk9IjE5MCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjQiIGZpbGw9IiNkZGRkZGQiLz48cmVjdCB4PSIxMzAiIHk9IjIwMCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQiIGZpbGw9IiNkZGRkZGQiLz48dGV4dCB4PSIxNTAiIHk9IjI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5OTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';
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
    // Navigate to product detail page
    navigate(`/product-detail/${product.id}`);
  };

  const handleStartOrder = (e) => {
    e.stopPropagation();
    // Navigate to product detail page
    navigate(`/product-detail/${product.id}`);
  };

  if (!product) return null;

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

        {/* Play Button Overlay for Videos */}
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
          <div style={{ flex: 1 }}>
            <h3 className="product-card-title" style={{ margin: '0 0 8px 0' }}>{product.name}</h3>
          </div>
          
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

