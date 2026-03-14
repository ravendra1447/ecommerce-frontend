import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../utils/config';
import './ProductCardSlider.css';

const ProductCardSlider = ({ product, compact = false, isHero = false, hideCategory = false, hideSeller = false }) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [thumbnailScrollPosition, setThumbnailScrollPosition] = useState(0);
  const thumbnailContainerRef = React.useRef(null);

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

  // DISABLED: Auto-scroll images - Now only manual interaction allowed
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

  // Debug: Log when images change
  useEffect(() => {
    console.log('🖼️ Images updated:', {
      count: images?.length || 0,
      images: images?.slice(0, 3)
    });
  }, [images]);


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
    if (!imagePath) return '/placeholder.png';
    if (imagePath.startsWith('http')) return imagePath;
    return getImageUrl(imagePath);
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
            
            {/* Color Display with Thumbnail */}
            {(() => {
              const getCurrentColorInfo = () => {
                if (images && images[currentImageIndex]) {
                  const currentImage = images[currentImageIndex];
                  
                  // DEBUG: Log product data
                  console.log('🔍 DEBUG ProductCardSlider:', {
                    productId: product.id,
                    productName: product.name,
                    currentImageIndex,
                    currentImage,
                    hasVariants: !!product.variants,
                    variantsCount: product.variants?.length || 0,
                    hasColors: !!product.colors,
                    colorsCount: product.colors?.length || 0,
                    firstVariant: product.variants?.[0],
                    firstColor: product.colors?.[0]
                  });
                  
                  // FIRST PRIORITY: Use variants data to get exact color from product.variants (EXACT same as ProductDetail)
                  if (product.variants && product.variants.length > 0) {
                    console.log('📋 Available variants:', product.variants);
                    console.log('🔍 Current image index:', currentImageIndex);
                    console.log('🖼️ Current image:', currentImage);
                    
                    // Try to find variant by matching image index
                    let matchingVariant = product.variants[currentImageIndex];
                    console.log('🎯 Variant by index:', matchingVariant);
                    
                    // If direct index match doesn't work, try to find by image URL
                    if (!matchingVariant && currentImage) {
                      console.log('🔍 Trying to find variant by image URL...');
                      matchingVariant = product.variants.find(variant => {
                        console.log('🔍 Checking variant:', variant);
                        console.log('🔍 Comparing:', {
                          variantImageUrl: variant.imageUrl,
                          variantImage: variant.image,
                          currentImage,
                          match1: variant.imageUrl === currentImage,
                          match2: variant.image === currentImage,
                          match3: (Array.isArray(product.images) && product.images[currentImageIndex] === variant.image)
                        });
                        return (
                          variant.imageUrl === currentImage || 
                          variant.image === currentImage ||
                          (Array.isArray(product.images) && product.images[currentImageIndex] === variant.image)
                        );
                      });
                      console.log('🎯 Variant by URL:', matchingVariant);
                    }
                    
                    if (matchingVariant) {
                      // EXACT same as ProductDetail logic
                      const exactColorName = matchingVariant.colorName || matchingVariant.color;
                      console.log('✅ Found variant color:', exactColorName, 'from:', matchingVariant);
                      console.log('🔍 Color fields:', {
                        colorName: matchingVariant.colorName,
                        color: matchingVariant.color,
                        colorCode: matchingVariant.colorCode,
                        imageUrl: matchingVariant.imageUrl,
                        image: matchingVariant.image
                      });
                      return {
                        name: exactColorName,
                        colorCode: matchingVariant.colorCode || null,
                        imageUrl: matchingVariant.imageUrl || matchingVariant.image || null
                      };
                    } else {
                      console.log('❌ No matching variant found!');
                    }
                  } else {
                    console.log('❌ No variants data available!');
                  }
                  
                  // SECOND PRIORITY: Check if product has colors array
                  if (product.colors && product.colors.length > 0) {
                    let colorObj = product.colors[currentImageIndex];
                    
                    if (!colorObj && currentImage) {
                      colorObj = product.colors.find(color => 
                        color.imageUrl === currentImage || 
                        color.image === currentImage ||
                        (Array.isArray(product.images) && product.images[currentImageIndex] === color.image)
                      );
                    }
                    
                    if (colorObj) {
                      const exactColorName = colorObj.colorName || colorObj.color;
                      console.log('✅ Found colors array color:', exactColorName);
                      return {
                        name: exactColorName,
                        colorCode: colorObj.colorCode || null,
                        imageUrl: colorObj.imageUrl || colorObj.image || currentImage
                      };
                    }
                  }
                  
                  // THIRD PRIORITY: Check if image has color property
                  if (currentImage.color) {
                    console.log('✅ Found image color:', currentImage.color);
                    return {
                      name: currentImage.color,
                      colorCode: currentImage.colorCode || null,
                      imageUrl: currentImage.imageUrl || null
                    };
                  }
                  
                  // LAST PRIORITY: Fallback - Try to get color from image filename or use generic names
                  const colorNames = ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Purple', 'Orange', 'Brown', 'Gray', 'Navy'];
                  const fallbackName = colorNames[currentImageIndex % colorNames.length];
                  console.log('⚠️ Using fallback color:', fallbackName);
                  
                  return {
                    name: fallbackName,
                    colorCode: null,
                    imageUrl: currentImage
                  };
                }
                return null;
              };
              
              const colorInfo = getCurrentColorInfo();
              console.log('🎨 Final colorInfo:', colorInfo);
              
              // EXACT same as ProductDetail thumbnail design - MULTIPLE THUMBNAILS
              if (images && images.length > 0) {
                return (
                  <div className="thumbnail-images-container" style={{
                    marginTop: '8px',
                    marginBottom: '8px',
                    position: 'relative',
                    width: '100%',
                    maxWidth: '350px',
                    overflow: 'hidden'
                  }}>
                    {/* Thumbnail Navigation Buttons */}
                    {images.length > 3 && (
                      <>
                        <button
                          className="thumbnail-nav-btn thumbnail-prev-btn"
                          onClick={() => handleThumbnailScroll('left')}
                          aria-label="Previous thumbnails"
                        >
                          ‹
                        </button>
                        <button
                          className="thumbnail-nav-btn thumbnail-next-btn"
                          onClick={() => handleThumbnailScroll('right')}
                          aria-label="Next thumbnails"
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
                      {images.map((img, index) => {
                        // WORKING SOLUTION: Parse string variations and use color names
                        const getColorName = () => {
                          console.log(`🔍 VARIATIONS STRING PARSING:`, {
                            hasVariations: !!product.variations,
                            variations: product.variations,
                            variationsType: typeof product.variations
                          });
                          
                          let parsedVariations = [];
                          
                          // Parse variations if it's a string
                          if (typeof product.variations === 'string') {
                            try {
                              parsedVariations = JSON.parse(product.variations);
                              console.log(`✅ PARSED VARIATIONS:`, parsedVariations);
                            } catch (e) {
                              console.log(`❌ JSON PARSE ERROR:`, e);
                              return `Color ${index + 1}`;
                            }
                          } else if (Array.isArray(product.variations)) {
                            parsedVariations = product.variations;
                          }
                          
                          // Use parsed variations
                          if (parsedVariations.length > 0) {
                            const variation = parsedVariations[index] || parsedVariations[0];
                            const colorName = variation.name || `Color ${index + 1}`;
                            console.log(`✅ WORKING COLOR NAME:`, colorName, 'for index:', index);
                            return colorName;
                          }
                          
                          console.log(`❌ NO VARIATIONS - Fallback: Color ${index + 1}`);
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
                              src={getImageUrlLocal(img)}
                              alt={`${product.name} ${index + 1}`}
                              className={currentImageIndex === index ? 'active' : ''}
                              onClick={() => {
                                // Change the main image when thumbnail clicked
                                handleThumbnailClick(index);
                                console.log('Selected thumbnail:', index, getColorName());
                              }}
                              style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                objectPosition: 'center',
                                border: currentImageIndex === index ? '2px solid #ff6b00' : '1px solid #e0e0e0',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                backgroundColor: '#f8f8f8',
                                padding: '0px'
                              }}
                              onMouseEnter={(e) => {
                                if (currentImageIndex !== index) {
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                  e.currentTarget.style.borderColor = '#ff6b00';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (currentImageIndex !== index) {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.borderColor = '#e0e0e0';
                                }
                              }}
                            />
                            {/* Color name below thumbnail - EXACT same as ProductDetail */}
                            <div className="thumbnail-color-name" style={{
                              fontSize: '0.65rem',
                              color: '#333',
                              textAlign: 'center',
                              lineHeight: '1.2',
                              maxWidth: '60px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: '600',
                              marginTop: '2px',
                              background: '#f8f8f8',
                              padding: '2px 4px',
                              borderRadius: '3px',
                              border: '1px solid #e0e0e0'
                            }}>
                              {getColorName()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
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

