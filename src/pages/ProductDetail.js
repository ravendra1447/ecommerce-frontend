import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { getImageUrl } from '../utils/config';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = React.useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [showZoomLens, setShowZoomLens] = useState(false);
  const [showZoomBox, setShowZoomBox] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [mobilePinchScale, setMobilePinchScale] = useState(1);
  const [mobilePanPosition, setMobilePanPosition] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState(null);
  const [showZoomHint, setShowZoomHint] = useState(false);
  const [showDesktopZoomHint, setShowDesktopZoomHint] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [lightboxZoomLevel, setLightboxZoomLevel] = useState(1);
  const [lightboxPanPosition, setLightboxPanPosition] = useState({ x: 0, y: 0 });
  const [lightboxTouchStart, setLightboxTouchStart] = useState({ x: 0, y: 0, time: 0 });
  const [lightboxTouchEnd, setLightboxTouchEnd] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedVariant] = useState(null); // For size+color variants
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [rangePrices, setRangePrices] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [variationQuantities, setVariationQuantities] = useState({}); // { "size::color": quantity }
  const [modalSelectedColors, setModalSelectedColors] = useState([]); // Array of selected colors (Alibaba style)
  const [expandedColor, setExpandedColor] = useState(null); // Currently expanded color (only one at a time)

  // Modal functions
  const openVariationModal = () => {
    // Auto-select only the first color when modal opens so sizes show by default
    if (product) {
      let availableColors = [];
      if (product.variants && product.variants.length > 0) {
        const colorMap = new Map();
        product.variants.forEach(variant => {
          if (variant.colorName && !colorMap.has(variant.colorName)) {
            colorMap.set(variant.colorName, variant.colorName);
          }
        });
        availableColors = Array.from(colorMap.values());
      } else if (product.colors && product.colors.length > 0) {
        availableColors = product.colors.map(c => c.colorName || c);
      }
      
      // Set only the first color as selected by default and expand it
      if (availableColors.length > 0) {
        const firstColor = availableColors[0];
        setModalSelectedColors([firstColor]);
        setExpandedColor(firstColor); // Expand first color by default
        
        // Initialize quantities for the first color only
        const newQuantities = {};
        let sizesForColor = [];
        if (product.variants && product.variants.length > 0) {
          const colorVariants = product.variants.filter(v => v.colorName === firstColor);
          sizesForColor = [...new Set(colorVariants.map(v => v.size))];
        } else {
          sizesForColor = product.sizes && product.sizes.length > 0 
            ? product.sizes.map(s => s.size)
            : ['One Size'];
        }
        
        sizesForColor.forEach(size => {
          const key = `${size}::${firstColor}`;
          newQuantities[key] = 0;
        });
        setVariationQuantities(newQuantities);
      } else {
        setModalSelectedColors([]);
        setVariationQuantities({});
        setExpandedColor(null);
      }
    } else {
      setModalSelectedColors([]);
      setVariationQuantities({});
    }
    setShowVariationModal(true);
  };

  useEffect(() => {
    fetchProduct();
    fetchRelatedProducts();
    trackRecentlyViewed();
    
    // Show zoom hint based on device
    if (window.innerWidth <= 968) {
      // Mobile hint
      const timer = setTimeout(() => {
        setShowZoomHint(true);
        setTimeout(() => setShowZoomHint(false), 3000);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Desktop hint
      const timer = setTimeout(() => {
        setShowDesktopZoomHint(true);
        setTimeout(() => setShowDesktopZoomHint(false), 3000);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showLightbox) return;
      
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft' && product.images && lightboxImageIndex > 0) {
        setLightboxImageIndex(lightboxImageIndex - 1);
        resetLightboxZoom();
      } else if (e.key === 'ArrowRight' && product.images && lightboxImageIndex < product.images.length - 1) {
        setLightboxImageIndex(lightboxImageIndex + 1);
        resetLightboxZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLightbox, lightboxImageIndex, product]);

  const openLightbox = (index) => {
    setLightboxImageIndex(index);
    setShowLightbox(true);
    setLightboxZoomLevel(1);
    setLightboxPanPosition({ x: 0, y: 0 });
    document.body.style.overflow = 'hidden';
    
    // Show swipe hint on mobile
    if (window.innerWidth <= 968 && product.images && product.images.length > 1) {
      setShowSwipeHint(true);
      setTimeout(() => setShowSwipeHint(false), 3000);
    }
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    setLightboxZoomLevel(1);
    setLightboxPanPosition({ x: 0, y: 0 });
    document.body.style.overflow = 'auto';
  };

  const resetLightboxZoom = () => {
    setLightboxZoomLevel(1);
    setLightboxPanPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setLightboxZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const zoomOut = () => {
    setLightboxZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) {
        setLightboxPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  // Auto-open variation modal ONLY if query parameter is present
  useEffect(() => {
    if (product) {
      const openModal = searchParams.get('openModal');
      const autoOpen = searchParams.get('autoOpen');
      
      // Open modal ONLY if:
      // 1. Query parameter openModal is present (addToCart/startOrder)
      // 2. Query parameter autoOpen is true (from home/products/productlanding pages via buttons)
      const shouldOpenModal = openModal && (openModal === 'addToCart' || openModal === 'startOrder');
      const shouldAutoOpen = autoOpen === 'true';
      
      if (shouldOpenModal || shouldAutoOpen) {
        // Small delay to ensure product data is fully loaded
        const timer = setTimeout(() => {
          openVariationModal();
          // Remove query parameters from URL
          if (openModal || autoOpen) {
            navigate(window.location.pathname, { replace: true });
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [product, searchParams, navigate, openVariationModal]);

  // Restore pending cart items when user logs in and returns to this page
  useEffect(() => {
    const restorePendingItems = async () => {
      if (!user || !product) return;
      
      // Check for pending cart items (in case login happened in another tab/window)
      const pendingCartItem = localStorage.getItem('pendingCartItem');
      const pendingCartItems = localStorage.getItem('pendingCartItems');
      const pendingProductId = localStorage.getItem('pendingProductId');
      
      if (pendingCartItem) {
        try {
          const cartData = JSON.parse(pendingCartItem);
          // Only restore if it's for this product
          if (cartData.productId === parseInt(id)) {
            await api.post('/cart/add', cartData);
            localStorage.removeItem('pendingCartItem');
            toast.success('Product added to cart!');
          }
        } catch (error) {
          console.error('Error restoring cart item:', error);
        }
      }
      
      if (pendingCartItems && pendingProductId && parseInt(pendingProductId) === parseInt(id)) {
        // This will be handled by Login.js, but we can clear it here if needed
        // The Login.js should have already handled it, but just in case
        localStorage.removeItem('pendingCartItems');
        localStorage.removeItem('pendingProductId');
      }
    };
    
    restorePendingItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, product, id]);

  // Reset quantity to minimum when size, color, or variant changes
  useEffect(() => {
    if (product) {
      // Reset to minimum sale quantity or 1
      const minQty = product.sale_min_qty || 1;
      setQuantity(minQty);
    }
  }, [selectedSize, selectedColor, selectedVariant, product]);

  const trackRecentlyViewed = async () => {
    if (user && id) {
      try {
        await api.post('/products/recently-viewed', { productId: id });
      } catch (error) {
        // Ignore errors
      }
    }
  };

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      console.log('📦 Product data received:', response.data);
      console.log('🎨 Product colors:', response.data.colors);
      if (response.data.colors && response.data.colors.length > 0) {
        console.log('🎨 Colors with prices:');
        response.data.colors.forEach(color => {
          console.log(`  - ${color.colorName}: ₹${color.price} (Stock: ${color.stock})`);
        });
      }
      setProduct(response.data);
      
      // Set range prices if available
      if (response.data.rangePrices && response.data.rangePrices.length > 0) {
        setRangePrices(response.data.rangePrices);
        console.log('💰 Range prices loaded:', response.data.rangePrices);
      }
      
      // Set initial quantity to minimum sale quantity
      const minQty = response.data.sale_min_qty || 1;
      setQuantity(minQty);
    } catch (error) {
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedProducts = async () => {
    try {
      console.log(`🔗 Fetching related products for ID: ${id}`);
      const response = await api.get(`/products/${id}/related?limit=8`);
      console.log('✅ Related products API response:', response.data);
      console.log('📊 Related products count:', response.data.length);
      setRelatedProducts(response.data);
      console.log('🔗 Related products state updated:', response.data.length);
    } catch (error) {
      console.error('❌ Failed to load related products:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      setRelatedProducts([]);
    }
  };

  // Get range price based on quantity
  // Logic: Find the highest min_qty that is <= selected quantity
  const getRangePriceForQuantity = (qty) => {
    if (!rangePrices || rangePrices.length === 0) return null;
    
    // Filter ranges where min_qty <= qty, then get the one with highest min_qty
    const applicableRanges = rangePrices.filter(range => range.min_qty <= qty);
    
    if (applicableRanges.length === 0) return null;
    
    // Sort by min_qty descending and take the first one
    const matchingRange = applicableRanges.sort((a, b) => b.min_qty - a.min_qty)[0];
    
    return matchingRange;
  };

  // Get current price based on selected variant, size, color, or quantity range
  const getCurrentPrice = () => {
    if (!product) return 0;
    
    let basePrice = 0;
    
    // Priority: Variant price > Size price > Color price > Base price
    if (selectedVariant && product.variants && product.variants.length > 0) {
      const variantObj = product.variants.find(v => 
        v.size === selectedVariant.size && v.colorName === selectedVariant.colorName
      );
      if (variantObj && variantObj.price !== null && variantObj.price !== undefined) {
        const price = Number(variantObj.price);
        if (!isNaN(price) && price > 0) {
          basePrice = price;
        }
      }
    }
    
    // Fallback to size price
    if (basePrice === 0 && selectedSize && product.sizes && product.sizes.length > 0) {
      const sizeObj = product.sizes.find(s => s.size === selectedSize);
      if (sizeObj && (sizeObj.price !== null && sizeObj.price !== undefined)) {
        const price = Number(sizeObj.price);
        if (!isNaN(price) && price > 0) {
          basePrice = price;
        }
      }
    }
    
    // Fallback to color price
    if (basePrice === 0 && selectedColor && product.colors && product.colors.length > 0) {
      const colorObj = product.colors.find(c => c.colorName === selectedColor);
      if (colorObj) {
        if (colorObj.price !== null && colorObj.price !== undefined && colorObj.price !== '') {
          const price = Number(colorObj.price);
          if (!isNaN(price) && price > 0) {
            basePrice = price;
          }
        }
      }
    }
    
    // Fallback to base product price
    if (basePrice === 0) {
      basePrice = Number(product.price) || 0;
    }
    
    // Check if range pricing applies based on quantity
    if (rangePrices && rangePrices.length > 0) {
      const rangePrice = getRangePriceForQuantity(quantity);
      if (rangePrice) {
        return Number(rangePrice.price);
      }
    }
    
    return basePrice;
  };

  // Get current stock based on selected variant, size, or color
  const getCurrentStock = () => {
    if (!product) return 0;
    
    // If stock maintenance type is Unlimited, return Infinity to indicate unlimited stock
    if (product.stock_maintane_type === 'Unlimited') {
      return Infinity;
    }
    
    // Priority: Variant stock > Size stock > Color stock > Base stock
    if (selectedVariant && product.variants && product.variants.length > 0) {
      const variantObj = product.variants.find(v => 
        v.size === selectedVariant.size && v.colorName === selectedVariant.colorName
      );
      if (variantObj) return variantObj.stock || 0;
    }
    
    // Fallback to size stock
    if (selectedSize && product.sizes) {
      const sizeObj = product.sizes.find(s => s.size === selectedSize);
      if (sizeObj) return sizeObj.stock;
    }
    
    // Fallback to color stock
    if (selectedColor && product.colors) {
      const colorObj = product.colors.find(c => c.colorName === selectedColor);
      if (colorObj) return colorObj.stock;
    }
    
    return product.stock || 0;
  };

  const closeVariationModal = () => {
    setShowVariationModal(false);
    setVariationQuantities({});
    setModalSelectedColors([]);
    setExpandedColor(null);
  };

  // Toggle color selection and expand/collapse size section
  const toggleColorSelection = (colorName) => {
    setModalSelectedColors(prev => {
      if (prev.includes(colorName)) {
        // If clicking on already selected color, toggle expansion
        if (expandedColor === colorName) {
          // Collapse if already expanded
          setExpandedColor(null);
        } else {
          // Expand this color
          setExpandedColor(colorName);
        }
        // Don't deselect, just toggle expansion
        return prev;
      } else {
        // Add color and initialize quantities for all sizes of this color (keep existing quantities)
        const newQuantities = { ...variationQuantities };
        
        // Get sizes available for this color
        let sizesForColor = [];
        if (product.variants && product.variants.length > 0) {
          const colorVariants = product.variants.filter(v => v.colorName === colorName);
          sizesForColor = [...new Set(colorVariants.map(v => v.size))];
        } else {
          sizesForColor = product.sizes && product.sizes.length > 0 
            ? product.sizes.map(s => s.size)
            : ['One Size'];
        }
        
        // Initialize quantities for this color (only if not already exists)
        sizesForColor.forEach(size => {
          const key = `${size}::${colorName}`;
          if (!(key in newQuantities)) {
            newQuantities[key] = 0;
          }
        });
        
        setVariationQuantities(newQuantities);
        // Expand this color when selected
        setExpandedColor(colorName);
        return [...prev, colorName]; // Add to selected colors
      }
    });
  };

  const updateVariationQuantity = (size, colorName, delta, maxStock = null) => {
    const key = `${size}::${colorName}`;
    setVariationQuantities(prev => {
      const current = prev[key] || 0;
      let newQty = Math.max(0, current + delta);
      // Limit to stock if maxStock is provided
      if (maxStock !== null && maxStock !== undefined) {
        newQty = Math.min(newQty, maxStock);
      }
      return { ...prev, [key]: newQty };
    });
  };

  const getVariationQuantity = (size, colorName) => {
    const key = `${size}::${colorName}`;
    return variationQuantities[key] || 0;
  };

  const getModalSubtotal = () => {
    if (!product) return { total: 0, pricePerItem: 0, totalQuantity: 0 };
    
    let total = 0;
    const totalQuantity = Object.values(variationQuantities).reduce((sum, qty) => sum + qty, 0);
    
    if (totalQuantity === 0) return { total: 0, pricePerItem: 0, totalQuantity: 0 };
    
    // Get base price
    let basePrice = Number(product.price) || 0;
    
    // Get price per item based on total quantity and range pricing
    let pricePerItem = basePrice;
    if (rangePrices && rangePrices.length > 0) {
      const rangePrice = getRangePriceForQuantity(totalQuantity);
      if (rangePrice) {
        pricePerItem = Number(rangePrice.price);
      }
    }
    
    // Calculate total for each variation
    Object.entries(variationQuantities).forEach(([key, qty]) => {
      if (qty > 0) {
        const [size, colorName] = key.split('::');
        let itemPrice = pricePerItem;
        
        // Check if size has specific price
        if (product.sizes && product.sizes.length > 0) {
          const sizeObj = product.sizes.find(s => s.size === size);
          if (sizeObj && sizeObj.price !== null && sizeObj.price !== undefined) {
            const price = Number(sizeObj.price);
            if (!isNaN(price) && price > 0) {
              itemPrice = price;
            }
          }
        }
        
        // Check if color has specific price
        if (product.colors && product.colors.length > 0) {
          const colorObj = product.colors.find(c => c.colorName === colorName);
          if (colorObj && colorObj.price !== null && colorObj.price !== undefined && colorObj.price !== '') {
            const price = Number(colorObj.price);
            if (!isNaN(price) && price > 0) {
              itemPrice = price;
            }
          }
        }
        
        // Apply range pricing if applicable
        if (rangePrices && rangePrices.length > 0) {
          const rangePrice = getRangePriceForQuantity(qty);
          if (rangePrice) {
            itemPrice = Number(rangePrice.price);
          }
        }
        
        total += itemPrice * qty;
      }
    });
    
    // Average price per item for display
    const avgPricePerItem = totalQuantity > 0 ? total / totalQuantity : pricePerItem;
    
    return { total, pricePerItem: avgPricePerItem, totalQuantity };
  };

  const handleModalAddToCart = async () => {
    if (!user) {
      // Store variation quantities and return URL before redirecting to login
      localStorage.setItem('pendingCartItems', JSON.stringify(variationQuantities));
      localStorage.setItem('pendingProductId', id.toString());
      localStorage.setItem('returnUrl', window.location.pathname + window.location.search);
      
      toast.info('Please login to add items to cart');
      navigate('/login');
      return;
    }

    const totalQuantity = Object.values(variationQuantities).reduce((sum, qty) => sum + qty, 0);
    if (totalQuantity === 0) {
      toast.error('Please select at least one item');
      return;
    }

    const minQty = product.sale_min_qty || 1;
    if (totalQuantity < minQty) {
      toast.error(`Minimum order quantity is ${minQty}`);
      return;
    }

    try {
      const subtotalData = getModalSubtotal();
      let successCount = 0;
      let errorMessages = [];
      
      // Add each size-color combination to cart
      for (const [key, qty] of Object.entries(variationQuantities)) {
        if (qty > 0) {
          try {
            const [size, colorName] = key.split('::');
            
            if (!size || !colorName) {
              console.error('Invalid key format:', key);
              errorMessages.push(`Invalid variation: ${key}`);
              continue;
            }
            
            // Calculate price for this specific variation
            let itemPrice = subtotalData.pricePerItem;
            
            // Check variant price first (if variants exist)
            if (product.variants && product.variants.length > 0) {
              const variant = product.variants.find(v => 
                v.size === size && v.colorName === colorName
              );
              if (variant && variant.price !== null && variant.price !== undefined) {
                const price = Number(variant.price);
                if (!isNaN(price) && price > 0) {
                  itemPrice = price;
                }
              }
            } else {
              // Check size price
              if (product.sizes && product.sizes.length > 0) {
                const sizeObj = product.sizes.find(s => s.size === size);
                if (sizeObj && sizeObj.price !== null && sizeObj.price !== undefined) {
                  const price = Number(sizeObj.price);
                  if (!isNaN(price) && price > 0) {
                    itemPrice = price;
                  }
                }
              }
              
              // Check color price
              if (product.colors && product.colors.length > 0) {
                const colorObj = product.colors.find(c => c.colorName === colorName);
                if (colorObj && colorObj.price !== null && colorObj.price !== undefined && colorObj.price !== '') {
                  const price = Number(colorObj.price);
                  if (!isNaN(price) && price > 0) {
                    itemPrice = price;
                  }
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
              productId: id,
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
      
      if (successCount > 0) {
        if (errorMessages.length > 0) {
          toast.warning(`Added ${successCount} item(s) to cart. Some items failed: ${errorMessages.join(', ')}`);
        } else {
          toast.success(`Added ${successCount} item(s) to cart!`);
        }
        closeVariationModal();
      } else {
        toast.error(errorMessages.length > 0 ? errorMessages.join(', ') : 'Failed to add items to cart');
      }
    } catch (error) {
      console.error('Error in handleModalAddToCart:', error);
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    }
  };

  const handleModalBuyNow = async () => {
    if (!user) {
      // Store variation quantities and return URL before redirecting to login
      localStorage.setItem('pendingCartItems', JSON.stringify(variationQuantities));
      localStorage.setItem('pendingProductId', id.toString());
      localStorage.setItem('returnUrl', window.location.pathname + window.location.search);
      localStorage.setItem('pendingBuyNow', 'true'); // Flag to indicate buy now after login
      
      toast.info('Please login to proceed with order');
      navigate('/login');
      return;
    }

    const totalQuantity = Object.values(variationQuantities).reduce((sum, qty) => sum + qty, 0);
    if (totalQuantity === 0) {
      toast.error('Please select at least one item');
      return;
    }

    const minQty = product.sale_min_qty || 1;
    if (totalQuantity < minQty) {
      toast.error(`Minimum order quantity is ${minQty}`);
      return;
    }

    try {
      const subtotalData = getModalSubtotal();
      let successCount = 0;
      let errorMessages = [];
      
      // Add each size-color combination to cart
      for (const [key, qty] of Object.entries(variationQuantities)) {
        if (qty > 0) {
          try {
            const [size, colorName] = key.split('::');
            
            if (!size || !colorName) {
              console.error('Invalid key format:', key);
              errorMessages.push(`Invalid variation: ${key}`);
              continue;
            }
            
            // Calculate price for this specific variation
            let itemPrice = subtotalData.pricePerItem;
            
            // Check variant price first (if variants exist)
            if (product.variants && product.variants.length > 0) {
              const variant = product.variants.find(v => 
                v.size === size && v.colorName === colorName
              );
              if (variant && variant.price !== null && variant.price !== undefined) {
                const price = Number(variant.price);
                if (!isNaN(price) && price > 0) {
                  itemPrice = price;
                }
              }
            } else {
              // Check size price
              if (product.sizes && product.sizes.length > 0) {
                const sizeObj = product.sizes.find(s => s.size === size);
                if (sizeObj && sizeObj.price !== null && sizeObj.price !== undefined) {
                  const price = Number(sizeObj.price);
                  if (!isNaN(price) && price > 0) {
                    itemPrice = price;
                  }
                }
              }
              
              // Check color price
              if (product.colors && product.colors.length > 0) {
                const colorObj = product.colors.find(c => c.colorName === colorName);
                if (colorObj && colorObj.price !== null && colorObj.price !== undefined && colorObj.price !== '') {
                  const price = Number(colorObj.price);
                  if (!isNaN(price) && price > 0) {
                    itemPrice = price;
                  }
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
              productId: id,
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
      
      if (successCount > 0) {
        closeVariationModal();
        toast.success(`Added ${successCount} item(s) to cart!`);
        // Navigate to checkout after a short delay
        setTimeout(() => {
          navigate('/checkout');
        }, 500);
      } else {
        toast.error(errorMessages.length > 0 ? errorMessages.join(', ') : 'Failed to add items to cart');
      }
    } catch (error) {
      console.error('Error in handleModalBuyNow:', error);
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info('Please login to submit a review');
      return;
    }

    try {
      await api.post(`/products/${id}/reviews`, review);
      toast.success('Review submitted successfully!');
      setReview({ rating: 5, comment: '' });
      fetchProduct();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!product) {
    return null;
  }

  // Debug: Log colors
  console.log('🔍 Product colors check:', {
    hasColors: !!product.colors,
    colorsLength: product.colors?.length,
    colors: product.colors,
    productId: product.id || product._id,
    fullProduct: product
  });
  
  // Ensure colors is always an array
  if (!product.colors) {
    product.colors = [];
  }

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div className="product-detail">
      {/* Breadcrumb */}
      <div className="breadcrumb-meesho">
        <Link to="/">Home</Link>
        <span> / </span>
        <Link to="/products">Products</Link>
        {product.category && (
          <>
            <span> / </span>
            <Link to={`/products?category=${product.category}`}>{product.category}</Link>
          </>
        )}
        <span> / </span>
        <span>{product.name}</span>
      </div>

      <div className="product-detail-container">
        <div className="product-images">
          <div className="image-container-wrapper">
            <div 
              className={`main-image ${showZoomLens ? 'zoom-lens-active' : ''}`}
              onMouseEnter={() => setShowZoomBox(true)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setZoomPosition({ x, y });
                setShowZoomLens(true);
              }}
              onMouseLeave={() => {
                setShowZoomLens(false);
                setShowZoomBox(false);
              }}
              onTouchStart={(e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                
                if (e.touches.length === 1) {
                  // Double tap detection
                  if (tapLength < 300 && tapLength > 0) {
                    e.preventDefault();
                    // Toggle zoom on double tap
                    if (mobilePinchScale === 1) {
                      setMobilePinchScale(2.5);
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.touches[0].clientX - rect.left;
                      const y = e.touches[0].clientY - rect.top;
                      setMobilePanPosition({ 
                        x: -(x * 1.5), 
                        y: -(y * 1.5) 
                      });
                    } else {
                      setMobilePinchScale(1);
                      setMobilePanPosition({ x: 0, y: 0 });
                    }
                  } else {
                    // Single touch for swipe
                    setTouchStart(e.touches[0].clientX);
                  }
                  setLastTap(currentTime);
                } else if (e.touches.length === 2) {
                  // Pinch zoom start
                  e.preventDefault();
                  const touch1 = e.touches[0];
                  const touch2 = e.touches[1];
                  const distance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                  );
                  setTouchDistance(distance);
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 2 && touchDistance) {
                  // Pinch zoom
                  e.preventDefault();
                  const touch1 = e.touches[0];
                  const touch2 = e.touches[1];
                  const distance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                  );
                  const scale = Math.min(Math.max((distance / touchDistance) * mobilePinchScale, 1), 4);
                  setMobilePinchScale(scale);
                } else if (e.touches.length === 1 && mobilePinchScale > 1) {
                  // Pan when zoomed
                  e.preventDefault();
                  if (touchStart !== null) {
                    const deltaX = e.touches[0].clientX - touchStart;
                    const deltaY = e.touches[0].clientY - (touchEnd || touchStart);
                    setMobilePanPosition(prev => ({
                      x: prev.x + deltaX,
                      y: prev.y + deltaY
                    }));
                  }
                  setTouchStart(e.touches[0].clientX);
                  setTouchEnd(e.touches[0].clientY);
                } else if (e.touches.length === 1) {
                  setTouchEnd(e.touches[0].clientX);
                }
              }}
              onTouchEnd={(e) => {
                if (e.touches.length === 0) {
                  setTouchDistance(null);
                  
                  // Handle swipe for image navigation (only if not zoomed)
                  if (touchStart !== null && touchEnd !== null && mobilePinchScale === 1) {
                    const distance = touchStart - touchEnd;
                    const isLeftSwipe = distance > 50;
                    const isRightSwipe = distance < -50;
                    
                    if (isLeftSwipe && product.images && selectedImage < product.images.length - 1) {
                      setSelectedImage(selectedImage + 1);
                    }
                    if (isRightSwipe && selectedImage > 0) {
                      setSelectedImage(selectedImage - 1);
                    }
                  }
                  
                  setTouchStart(null);
                  setTouchEnd(null);
                }
              }}
            >
              {product.images && product.images.length > 0 ? (
                <>
                  <img 
                    src={getImageUrl(product.images[selectedImage])} 
                    alt={product.name}
                    style={{
                      transform: mobilePinchScale > 1 
                        ? `scale(${mobilePinchScale}) translate(${mobilePanPosition.x / mobilePinchScale}px, ${mobilePanPosition.y / mobilePinchScale}px)`
                        : 'none',
                      transition: mobilePinchScale === 1 ? 'transform 0.3s ease' : 'none',
                      cursor: 'pointer'
                    }}
                    draggable={false}
                    onClick={() => {
                      if (mobilePinchScale === 1) {
                        openLightbox(selectedImage);
                      }
                    }}
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.onerror = null;
                      img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                  {showZoomLens && (
                    <div 
                      className="zoom-lens"
                      style={{
                        left: `${zoomPosition.x}%`,
                        top: `${zoomPosition.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="placeholder-image">No Image</div>
              )}
              {product.images && product.images.length > 1 && (
                <>
                  <button 
                    className="image-nav-btn prev-btn"
                    onClick={() => setSelectedImage(selectedImage > 0 ? selectedImage - 1 : product.images.length - 1)}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button 
                    className="image-nav-btn next-btn"
                    onClick={() => setSelectedImage(selectedImage < product.images.length - 1 ? selectedImage + 1 : 0)}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <div className="image-indicator">
                    {selectedImage + 1} / {product.images.length}
                  </div>
                </>
              )}
              {showZoomHint && (
                <div className="zoom-hint">
                  Double tap or pinch to zoom
                </div>
              )}
              {mobilePinchScale > 1 && (
                <div className="mobile-zoom-indicator">
                  {Math.round(mobilePinchScale * 100)}%
                </div>
              )}
              {showDesktopZoomHint && (
                <div className="desktop-zoom-hint">
                  🔍 Hover to zoom
                </div>
              )}
            </div>
            
            {/* Flipkart Style Zoom Box - Desktop Only */}
            {showZoomBox && product.images && product.images.length > 0 && (
              <div className="zoom-box-container">
                <div 
                  className="zoom-box"
                  style={{
                    backgroundImage: `url(${getImageUrl(product.images[selectedImage])})`,
                    backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    backgroundSize: '250%'
                  }}
                />
              </div>
            )}
          </div>
          
          {product.images && product.images.length > 1 && (
            <div className="thumbnail-images">
              {product.images.map((img, index) => (
                <img
                  key={index}
                  src={getImageUrl(img)}
                  alt={`${product.name} ${index + 1}`}
                  className={selectedImage === index ? 'active' : ''}
                  onClick={() => {
                    setSelectedImage(index);
                    setMobilePinchScale(1);
                    setMobilePanPosition({ x: 0, y: 0 });
                  }}
                  onDoubleClick={() => {
                    openLightbox(index);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="product-info-detail">
          {/* Badges */}
          {product.badge && (
            <div className="product-badges">
              <span className={`product-badge badge-${product.badge.toLowerCase()}`}>
                {product.badge}
              </span>
            </div>
          )}

          <h1 className="product-name">{product.name}</h1>
          
          <div className="product-rating-section">
            {product.rating && Number(product.rating) > 0 && (
              <span className="rating">⭐ {Number(product.rating).toFixed(1)}</span>
            )}
            <span className="reviews-count">({product.reviews ? product.reviews.length : 0} reviews)</span>
            {product.brand && (
              <div className="product-brand">
                <strong>Brand:</strong> {product.brand}
              </div>
            )}
          </div>

          <div className="product-price-section">
            <div className="price-container">
              <span className="current-price">₹{Number(getCurrentPrice()).toFixed(2)}</span>
              {product.originalPrice && !selectedVariant && !selectedSize && !selectedColor && (
                <>
                  <span className="original-price">₹{product.originalPrice}</span>
                  <span className="savings">You save ₹{(product.originalPrice - product.price).toFixed(2)}</span>
                </>
              )}
            </div>
            {product.originalPrice && !selectedVariant && !selectedSize && !selectedColor && discount > 0 && (
              <span className="discount-badge">{discount}% OFF</span>
            )}
          </div>

          {/* Range Pricing Table */}
          {rangePrices && rangePrices.length > 0 && (
            <div className="range-pricing-section" style={{ 
              marginTop: '20px', 
              marginBottom: '20px',
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              background: '#fff'
            }}>
              {/* Header with purple gradient */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{ fontSize: '24px' }}>💰</span>
                <h3 style={{ 
                  margin: 0,
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: '700',
                  flex: 1
                }}>
                  Bulk Pricing Available
                </h3>
              </div>
              
              {/* Subtitle */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '0 20px 16px 20px'
              }}>
                <p style={{ 
                  margin: 0,
                  fontSize: '14px', 
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  Get better prices when you buy more! <span style={{ fontSize: '16px' }}>🛒</span>
                </p>
              </div>

              {/* Table container with white background */}
              <div style={{ 
                overflowX: 'auto',
                background: '#fff',
                padding: '20px'
              }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  minWidth: '300px'
                }}>
                  <thead>
                    <tr>
                      <th style={{ 
                        padding: '12px', 
                        textAlign: 'left', 
                        borderBottom: '2px solid #e0e0e0',
                        color: '#1976d2',
                        fontWeight: '600',
                        fontSize: '14px',
                        background: '#f8f9fa'
                      }}>Quantity Range</th>
                      <th style={{ 
                        padding: '12px', 
                        textAlign: 'left', 
                        borderBottom: '2px solid #e0e0e0',
                        color: '#1976d2',
                        fontWeight: '600',
                        fontSize: '14px',
                        background: '#f8f9fa'
                      }}>Price per Item</th>
                      <th style={{ 
                        padding: '12px', 
                        textAlign: 'left', 
                        borderBottom: '2px solid #e0e0e0',
                        color: '#1976d2',
                        fontWeight: '600',
                        fontSize: '14px',
                        background: '#f8f9fa'
                      }}>You Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rangePrices.map((range, index) => {
                      const isActive = getRangePriceForQuantity(quantity)?.id === range.id;
                      const nextRange = rangePrices[index + 1];
                      const rangeText = nextRange 
                        ? `${range.min_qty} - ${nextRange.min_qty - 1} items`
                        : `${range.min_qty}+ items`;
                      const savings = index === 0 ? 0 : ((rangePrices[0].price - range.price) / rangePrices[0].price * 100);
                      
                      return (
                        <tr 
                          key={range.id} 
                          style={{ 
                            backgroundColor: isActive ? '#f1f8e9' : '#fff',
                            borderLeft: isActive ? '4px solid #4caf50' : '4px solid transparent',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <td style={{ 
                            padding: '14px 12px', 
                            borderBottom: '1px solid #f0f0f0',
                            color: isActive ? '#2e7d32' : '#333',
                            fontWeight: isActive ? '600' : '400',
                            fontSize: '14px'
                          }}>
                            {rangeText}
                            {isActive && <span style={{ 
                              marginLeft: '8px', 
                              color: '#4caf50', 
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>← Current</span>}
                          </td>
                          <td style={{ 
                            padding: '14px 12px', 
                            borderBottom: '1px solid #f0f0f0',
                            color: isActive ? '#2e7d32' : '#333',
                            fontWeight: isActive ? '600' : '500',
                            fontSize: '14px'
                          }}>
                            ₹{Number(range.price).toFixed(2)}
                          </td>
                          <td style={{ 
                            padding: '14px 12px', 
                            borderBottom: '1px solid #f0f0f0',
                            color: savings > 0 ? '#d32f2f' : '#666',
                            fontWeight: savings > 0 ? '600' : '400',
                            fontSize: '14px'
                          }}>
                            {savings > 0 ? `${savings.toFixed(0)}% OFF` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {getRangePriceForQuantity(quantity) && (
                <div style={{ 
                  marginTop: '15px', 
                  padding: '12px', 
                  background: 'rgba(76, 175, 80, 0.15)',
                  borderRadius: '8px',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  color: '#fff'
                }}>
                  <strong style={{ color: '#fff' }}>🎯 Your Price:</strong> ₹{Number(getCurrentPrice()).toFixed(2)} per item × {quantity} = <strong style={{ fontSize: '18px', color: '#fff' }}>₹{(getCurrentPrice() * quantity).toFixed(2)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Size Selection - Opens Modal on Click */}
          {product.variants && product.variants.length > 0 ? (
            <div className="size-selection">
              <label>
                Select Size: <span className="required">*</span>
              </label>
              <div className="size-buttons-container">
                {(() => {
                  // Get unique sizes from variants
                  const uniqueSizes = [...new Set(product.variants.map(v => v.size))];
                  
                  return uniqueSizes.map((size, index) => {
                    // Get all variants for this size
                    const sizeVariants = product.variants.filter(v => v.size === size);
                    // Calculate total stock for this size
                    const totalStock = sizeVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
                    // Get the minimum price for this size
                    const minPrice = Math.min(...sizeVariants.map(v => v.price || 0));
                    // Get the maximum price for this size
                    const maxPrice = Math.max(...sizeVariants.map(v => v.price || 0));
                    
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          // Open variation modal when size is clicked
                          openVariationModal();
                        }}
                        disabled={totalStock <= 0}
                        className={`size-button ${totalStock <= 0 ? 'disabled' : ''}`}
                      >
                        {size}
                        {totalStock <= 0 && (
                          <span className="size-out-of-stock-badge">×</span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <>
              {/* Size Selection (Fallback) */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="size-selection">
                  <label>
                    Select Size: <span className="required">*</span>
                  </label>
                  <div className="size-buttons-container">
                    {product.sizes.map((sizeItem, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setSelectedSize(sizeItem.size);
                          setQuantity(1);
                        }}
                        disabled={sizeItem.stock <= 0}
                        className={`size-button ${selectedSize === sizeItem.size ? 'selected' : ''}`}
                      >
                        {sizeItem.size}
                        {sizeItem.stock <= 0 && (
                          <span className="size-out-of-stock-badge">×</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Selection (Fallback) */}
              {product.colors && product.colors.length > 0 && (
                <div className="size-selection" style={{ marginTop: '20px' }}>
                  <label>
                    Select Color: <span className="required">*</span>
                  </label>
                  <div className="size-buttons-container">
                    {product.colors.map((colorItem, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setSelectedColor(colorItem.colorName);
                          setQuantity(1);
                        }}
                        disabled={colorItem.stock <= 0}
                        className={`size-button ${selectedColor === colorItem.colorName ? 'selected' : ''}`}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {colorItem.colorCode && (
                            <span
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: colorItem.colorCode,
                                border: '2px solid #ddd',
                                display: 'inline-block'
                              }}
                              title={colorItem.colorName}
                            />
                          )}
                          <span>{colorItem.colorName}</span>
                        </div>
                        {colorItem.stock <= 0 && (
                          <span className="size-out-of-stock-badge">×</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="product-description-section">
            <h3>Description</h3>
            <p className="product-description">{product.description}</p>
          </div>

          {product.tags && product.tags.length > 0 && (
            <div className="product-tags-section">
              <h3>Tags</h3>
              <div className="product-tags">
                {product.tags.map((tag, idx) => (
                  <span key={idx} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="product-stock">
            <span className={getCurrentStock() > 0 || getCurrentStock() === Infinity ? 'in-stock' : 'out-of-stock'}>
              {getCurrentStock() === Infinity 
                ? 'In Stock (Unlimited)' 
                : getCurrentStock() > 0 
                  ? `In Stock (${getCurrentStock()} available)` 
                  : 'Out of Stock'}
            </span>
          </div>

          {(getCurrentStock() > 0 || getCurrentStock() === Infinity) && (
            <div className="product-actions">
              {(product.colors && product.colors.length > 0) || (product.sizes && product.sizes.length > 0) ? (
                <button 
                  onClick={openVariationModal} 
                  className="btn-select-variations"
                  style={{
                    display: 'none',
                    padding: '1rem 2rem',
                    border: '2px solid #ff9800',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    background: 'white',
                    color: '#ff9800',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    marginBottom: '1rem',
                    width: '100%',
                   

                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ff9800';
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#ff9800';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  📦 Select Variations and Quantity
                </button>
              ) : null}
              <div className="product-actions-row">
                <div className="quantity-selector" style={{ display: 'none' }}>
                  <label>Quantity:</label>
                  <button onClick={() => {
                    const minQty = product.sale_min_qty || 1;
                    setQuantity(Math.max(minQty, quantity - 1));
                  }}>-</button>
                  <span>{quantity}</span>
                  <button onClick={() => {
                    const currentStock = getCurrentStock();
                    if (currentStock === Infinity) {
                      setQuantity(quantity + 1);
                    } else {
                      setQuantity(Math.min(currentStock, quantity + 1));
                    }
                  }}>+</button>
                  {product.sale_min_qty && product.sale_min_qty > 1 && (
                    <span style={{ marginLeft: '10px', fontSize: '12px', color: '#ff9800' }}>
                      Min: {product.sale_min_qty}
                    </span>
                  )}
                </div>
                <button onClick={openVariationModal} className="btn-add-cart">
                  🛒 Add to Cart
                </button>
                <button
                  onClick={openVariationModal}
                  className="btn-buy-now"
                >
                  ⚡ Order Now
                </button>
              </div>
              {rangePrices && rangePrices.length > 0 && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '10px', 
                  background: '#f5f5f5', 
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  <strong>Total Price:</strong> <span style={{ fontSize: '18px', color: '#667eea', fontWeight: 'bold' }}>₹{(getCurrentPrice() * quantity).toFixed(2)}</span>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    (₹{getCurrentPrice().toFixed(2)} × {quantity} items)
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="product-specs">
            <h3>Product Details</h3>
            <div className="spec-item">
              <span>Category:</span>
              <span>{product.category}</span>
            </div>
            {product.subcategory && (
              <div className="spec-item">
                <span>Subcategory:</span>
                <span>{product.subcategory}</span>
              </div>
            )}
          </div>
        </div>
      </div>

       {/* Related Products Section */}
      {(() => {
        console.log('🎨 Rendering related products section. Count:', relatedProducts?.length || 0);
        console.log('🎨 Related products data:', relatedProducts);
        return null;
      })()}
      {relatedProducts && relatedProducts.length > 0 && (
        <div className="related-products-section" style={{
          marginTop: '60px',
          padding: '40px 20px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '16px'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '30px',
            textAlign: 'center',
            color: '#2c3e50',
            position: 'relative',
            paddingBottom: '15px'
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Related Products
            </span>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80px',
              height: '4px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '2px'
            }}></div>
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '25px',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            {relatedProducts.map((relatedProduct) => (
              <Link
                key={relatedProduct.id}
                to={`/product/${relatedProduct.id}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  background: '#fff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                }}
              >
                <div style={{ position: 'relative', paddingTop: '100%', overflow: 'hidden', background: '#f8f9fa' }}>
                  {relatedProduct.images && relatedProduct.images.length > 0 ? (
                    <img
                      src={getImageUrl(relatedProduct.images[0])}
                      alt={relatedProduct.name}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                      }}
                    />
                  ) : (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                      fontSize: '14px'
                    }}>
                      No Image
                    </div>
                  )}
                  {relatedProduct.badge && (
                    <span style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: relatedProduct.badge === 'NEW' ? '#4caf50' : 
                                 relatedProduct.badge === 'SALE' ? '#f44336' : '#ff9800',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {relatedProduct.badge}
                    </span>
                  )}
                </div>
                
                <div style={{ padding: '16px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#2c3e50',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {relatedProduct.name}
                  </h3>
                  
                  {relatedProduct.brand && (
                    <p style={{
                      fontSize: '12px',
                      color: '#7f8c8d',
                      marginBottom: '8px'
                    }}>
                      {relatedProduct.brand}
                    </p>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <span style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#667eea'
                    }}>
                      ₹{relatedProduct.price.toFixed(2)}
                    </span>
                    {relatedProduct.originalPrice && (
                      <>
                        <span style={{
                          fontSize: '14px',
                          color: '#95a5a6',
                          textDecoration: 'line-through'
                        }}>
                          ₹{relatedProduct.originalPrice.toFixed(2)}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: '#27ae60',
                          fontWeight: '600'
                        }}>
                          {Math.round(((relatedProduct.originalPrice - relatedProduct.price) / relatedProduct.originalPrice) * 100)}% OFF
                        </span>
                      </>
                    )}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    color: '#7f8c8d'
                  }}>
                    {relatedProduct.rating > 0 && (
                      <span>⭐ {relatedProduct.rating.toFixed(1)}</span>
                    )}
                    <span style={{
                      color: relatedProduct.stock > 0 ? '#27ae60' : '#e74c3c',
                      fontWeight: '600'
                    }}>
                      {relatedProduct.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Product Features */}
      <div className="product-features-meesho">
        <div className="feature-item">
          <span className="feature-icon">↻</span>
          <div>
            <strong>7 Days Easy Return</strong>
            <p>Return or exchange within 7 days</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon">💵</span>
          <div>
            <strong>Cash on Delivery</strong>
            <p>Pay when you receive</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🚚</span>
          <div>
            <strong>Free Delivery</strong>
            <p>On orders above ₹499</p>
          </div>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🔒</span>
          <div>
            <strong>Secure Payment</strong>
            <p>100% secure transactions</p>
          </div>
        </div>
      </div>

      <div className="reviews-section">
        <h2>Customer Reviews</h2>
        
        {user && (
          <form onSubmit={handleSubmitReview} className="review-form">
            <div className="review-input-group">
              <label>Rating:</label>
              <select
                value={review.rating}
                onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })}
              >
                <option value={5}>5 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>
            </div>
            <textarea
              placeholder="Write your review..."
              value={review.comment}
              onChange={(e) => setReview({ ...review, comment: e.target.value })}
              required
            />
            <button type="submit">Submit Review</button>
          </form>
        )}

        <div className="reviews-list">
          {product.reviews && product.reviews.length > 0 ? (
            product.reviews.map((review, index) => (
              <div key={index} className="review-item">
                <div className="review-header">
                  <strong>{review.user?.name || 'Anonymous'}</strong>
                  <span className="review-rating">⭐ {review.rating}</span>
                </div>
                <p>{review.comment}</p>
                <small>{new Date(review.createdAt).toLocaleDateString()}</small>
              </div>
            ))
          ) : (
            <p>No reviews yet. Be the first to review!</p>
          )}
        </div>
      </div>

      {/* Variation Selection Modal */}
      {showVariationModal && (
        <div className="variation-modal-overlay" onClick={closeVariationModal}>
          <div className="variation-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="variation-modal-header">
              <h2>Select variations and quantity</h2>
              <button className="variation-modal-close" onClick={closeVariationModal}>×</button>
            </div>

            <div className="variation-modal-body">
              {/* Pricing Tiers */}
              {rangePrices && rangePrices.length > 0 && (
                <div className="modal-pricing-tiers">
                  <div className="pricing-badge">Lower priced than similar</div>
                  <div className="pricing-tiers-list">
                    {rangePrices.map((range, index) => {
                      const nextRange = rangePrices[index + 1];
                      const rangeText = nextRange 
                        ? `${range.min_qty} - ${nextRange.min_qty - 1} pieces`
                        : `>= ${range.min_qty} pieces`;
                      return (
                        <div key={range.id} className="pricing-tier-item">
                          <span className="tier-range">{rangeText}:</span>
                          <span className="tier-price">₹{Number(range.price).toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color Selection First (Alibaba Style) */}
              <div className="modal-color-selection">
                <label>Select Color:</label>
                <div className="modal-color-buttons">
                  {(() => {
                    // Get colors: from variants if available, otherwise from product.colors
                    let availableColors = [];
                    if (product.variants && product.variants.length > 0) {
                      const colorMap = new Map();
                      product.variants.forEach(variant => {
                        if (variant.colorName && !colorMap.has(variant.colorName)) {
                          colorMap.set(variant.colorName, {
                            colorName: variant.colorName,
                            colorCode: variant.colorCode || null,
                            imageUrl: variant.imageUrl || null
                          });
                        }
                      });
                      availableColors = Array.from(colorMap.values());
                    } else if (product.colors && product.colors.length > 0) {
                      availableColors = product.colors;
                    }
                    
                    if (availableColors.length === 0) return null;
                    
                    return availableColors.map((colorItem, index) => {
                      const isSelected = modalSelectedColors.includes(colorItem.colorName);
                      // Calculate total quantity for this color across all sizes
                      const totalQtyForColor = Object.entries(variationQuantities)
                        .filter(([key]) => key.endsWith(`::${colorItem.colorName}`))
                        .reduce((sum, [, qty]) => sum + (qty || 0), 0);
                      
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleColorSelection(colorItem.colorName)}
                          className={`modal-color-button ${isSelected ? 'selected' : ''}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            border: isSelected ? '2px solid #ff6700' : '1px solid #ddd',
                            borderRadius: '8px',
                            background: isSelected ? '#fff5f0' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                          }}
                        >
                          {colorItem.imageUrl ? (
                            <img
                              src={getImageUrl(colorItem.imageUrl)}
                              alt={colorItem.colorName}
                              style={{
                                width: '30px',
                                height: '30px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #e8e8e8'
                              }}
                            />
                          ) : colorItem.colorCode ? (
                            <span
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '4px',
                                backgroundColor: colorItem.colorCode,
                                border: '1px solid #e8e8e8',
                                display: 'inline-block'
                              }}
                            />
                          ) : null}
                          <span>{colorItem.colorName}</span>
                          {isSelected && totalQtyForColor > 0 && (
                            <span style={{
                              background: '#ff6700',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>× {totalQtyForColor}</span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Size Selection for Each Selected Color (Alibaba Style) - Show by default */}
              {(() => {
                // Get all available colors if none selected, otherwise use selected colors
                let colorsToShow = modalSelectedColors;
                if (colorsToShow.length === 0) {
                  // Get colors: from variants if available, otherwise from product.colors
                  if (product.variants && product.variants.length > 0) {
                    const colorMap = new Map();
                    product.variants.forEach(variant => {
                      if (variant.colorName && !colorMap.has(variant.colorName)) {
                        colorMap.set(variant.colorName, variant.colorName);
                      }
                    });
                    colorsToShow = Array.from(colorMap.values());
                  } else if (product.colors && product.colors.length > 0) {
                    colorsToShow = product.colors.map(c => c.colorName || c);
                  }
                }
                
                if (colorsToShow.length === 0) return null;
                // Get colors: from variants if available, otherwise from product.colors
                let availableColors = [];
                
                if (product.variants && product.variants.length > 0) {
                  // Extract unique colors from variants
                  const colorMap = new Map();
                  product.variants.forEach(variant => {
                    if (variant.colorName && !colorMap.has(variant.colorName)) {
                      colorMap.set(variant.colorName, {
                        colorName: variant.colorName,
                        colorCode: variant.colorCode || null,
                        imageUrl: variant.imageUrl || null,
                        price: variant.price || null
                      });
                    }
                  });
                  availableColors = Array.from(colorMap.values());
                } else if (product.colors && product.colors.length > 0) {
                  availableColors = product.colors;
                }
                
                if (availableColors.length === 0) return null;
                
                // Sort colors so expanded color appears first
                const sortedColors = [...colorsToShow].sort((a, b) => {
                  if (a === expandedColor) return -1;
                  if (b === expandedColor) return 1;
                  return 0;
                });
                
                return (
                  <div className="modal-variation-matrix">
                    <label>Select Sizes and Quantity for Selected Colors:</label>
                    <div className="variation-matrix-container">
                      {sortedColors.map((selectedColorName) => {
                        // Get color object
                        let colorItem = null;
                        if (product.variants && product.variants.length > 0) {
                          const variant = product.variants.find(v => v.colorName === selectedColorName);
                          if (variant) {
                            colorItem = {
                              colorName: variant.colorName,
                              colorCode: variant.colorCode || null,
                              imageUrl: variant.imageUrl || null,
                              price: variant.price || null
                            };
                          }
                        } else if (product.colors && product.colors.length > 0) {
                          colorItem = product.colors.find(c => c.colorName === selectedColorName);
                        }
                        
                        if (!colorItem) return null;
                        
                        // Get sizes available for this color
                        let sizesForColor = [];
                        if (product.variants && product.variants.length > 0) {
                          const colorVariants = product.variants.filter(v => v.colorName === selectedColorName);
                          sizesForColor = [...new Set(colorVariants.map(v => v.size))];
                        } else {
                          sizesForColor = product.sizes && product.sizes.length > 0 
                            ? product.sizes.map(s => s.size)
                            : ['One Size'];
                        }
                        
                        const totalQtyForColor = sizesForColor.reduce((sum, size) => {
                          return sum + getVariationQuantity(size, selectedColorName);
                        }, 0);
                        
                        const isExpanded = expandedColor === selectedColorName;
                        // Get selected sizes for this color (sizes with quantity > 0)
                        const selectedSizes = sizesForColor.filter(size => {
                          const qty = getVariationQuantity(size, selectedColorName);
                          return qty > 0;
                        });
                        
                        return (
                          <div key={selectedColorName} className="color-variation-group">
                            <div className="color-group-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {colorItem.imageUrl ? (
                                  <img
                                    src={getImageUrl(colorItem.imageUrl)}
                                    alt={colorItem.colorName}
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      objectFit: 'cover',
                                      borderRadius: '4px',
                                      border: '1px solid #e8e8e8'
                                    }}
                                  />
                                ) : colorItem.colorCode ? (
                                  <span
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '4px',
                                      backgroundColor: colorItem.colorCode,
                                      border: '1px solid #e8e8e8',
                                      display: 'inline-block'
                                    }}
                                  />
                                ) : null}
                                <span className="color-group-title">{selectedColorName}</span>
                                {selectedSizes.length > 0 && (
                                  <span style={{
                                    fontSize: '12px',
                                    color: '#ff6700',
                                    fontWeight: '500',
                                    marginLeft: '8px'
                                  }}>
                                    ({selectedSizes.length} size{selectedSizes.length > 1 ? 's' : ''} selected: {selectedSizes.join(', ')})
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {totalQtyForColor > 0 && (
                                  <span className="color-group-badge">Total: {totalQtyForColor}</span>
                                )}
                                <span style={{
                                  fontSize: '18px',
                                  color: '#666',
                                  cursor: 'pointer',
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.3s ease'
                                }}>
                                  ▼
                                </span>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="color-size-list">
                              {sizesForColor.map((size, sizeIndex) => {
                                const qty = getVariationQuantity(size, selectedColorName);
                                const subtotalData = getModalSubtotal();
                                
                                // Get price for this specific size-color combination
                                let pricePerItem = subtotalData.pricePerItem || getCurrentPrice();
                                let stockForSize = 0;
                                const isUnlimited = product.stock_maintane_type === 'Unlimited';
                                
                                if (!isUnlimited) {
                                  if (product.variants && product.variants.length > 0) {
                                    const variant = product.variants.find(v => 
                                      v.size === size && v.colorName === selectedColorName
                                    );
                                    if (variant) {
                                      if (variant.price !== null && variant.price !== undefined) {
                                        pricePerItem = parseFloat(variant.price);
                                      }
                                      if (variant.stock !== null && variant.stock !== undefined) {
                                        stockForSize = parseInt(variant.stock) || 0;
                                      }
                                    }
                                  } else if (colorItem.price !== null && colorItem.price !== undefined) {
                                    pricePerItem = parseFloat(colorItem.price);
                                    // Try to get stock from colorItem or size
                                    if (colorItem.stock !== null && colorItem.stock !== undefined) {
                                      stockForSize = parseInt(colorItem.stock) || 0;
                                    } else if (product.sizes && product.sizes.length > 0) {
                                      const sizeObj = product.sizes.find(s => s.size === size);
                                      if (sizeObj && sizeObj.stock !== null && sizeObj.stock !== undefined) {
                                        stockForSize = parseInt(sizeObj.stock) || 0;
                                      }
                                    }
                                  }
                                }
                                
                                const isFocused = qty > 0;
                                
                                return (
                                  <div 
                                    key={`${size}-${selectedColorName}-${sizeIndex}`} 
                                    className={`modal-size-item ${isFocused ? 'focused' : ''}`}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '12px',
                                      border: isFocused ? '2px solid #ff6700' : '1px solid #e8e8e8',
                                      borderRadius: '8px',
                                      background: isFocused ? '#fff5f0' : 'white',
                                      marginBottom: '8px'
                                    }}
                                  >
                                    <div className="size-price-stock-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <span className="size-text" style={{ fontWeight: '600', fontSize: '14px' }}>{size}</span>
                                      <span className="price-text" style={{ color: '#666', fontSize: '13px' }}>₹{pricePerItem.toFixed(2)}</span>
                                      {isUnlimited ? (
                                        <span className="stock-text" style={{ 
                                          color: '#52c41a', 
                                          fontSize: '12px',
                                          fontWeight: '500'
                                        }}>
                                          (Stock: Unlimited)
                                        </span>
                                      ) : stockForSize >= 0 && (
                                        <span className="stock-text" style={{ 
                                          color: stockForSize > 0 ? '#52c41a' : '#d32f2f', 
                                          fontSize: '12px',
                                          fontWeight: '500'
                                        }}>
                                          (Stock: {stockForSize})
                                        </span>
                                      )}
                                    </div>
                                    <div className="color-quantity-controls">
                                      <button
                                        type="button"
                                        onClick={() => updateVariationQuantity(size, selectedColorName, -1)}
                                        className="qty-btn minus"
                                        disabled={qty === 0}
                                      >
                                        −
                                      </button>
                                      <input
                                        type="number"
                                        value={qty}
                                        onChange={(e) => {
                                          const inputVal = parseInt(e.target.value) || 0;
                                          // Limit to stock available only if not unlimited
                                          const val = isUnlimited 
                                            ? Math.max(0, inputVal)
                                            : Math.max(0, Math.min(inputVal, stockForSize));
                                          const key = `${size}::${selectedColorName}`;
                                          setVariationQuantities(prev => ({ ...prev, [key]: val }));
                                        }}
                                        className="qty-input"
                                        min="0"
                                        max={isUnlimited ? undefined : stockForSize}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => updateVariationQuantity(size, selectedColorName, 1, isUnlimited ? null : stockForSize)}
                                        className="qty-btn plus"
                                        disabled={!isUnlimited && qty >= stockForSize}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Fallback: If no colors available */}
              {(!product.variants || product.variants.length === 0) && 
               (!product.colors || product.colors.length === 0) && (
                <div className="modal-no-colors-message">
                  <p>No color variations available for this product.</p>
                </div>
              )}

              {/* Subtotal */}
              <div className="modal-subtotal">
                <div className="subtotal-header">
                  <span>Subtotal</span>
                  <span className="subtotal-toggle">▼</span>
                </div>
                <div className="subtotal-details">
                  {(() => {
                    const subtotalData = getModalSubtotal();
                    return (
                      <>
                        <div className="subtotal-amount">
                          ₹{subtotalData.total.toFixed(2)} (₹{subtotalData.pricePerItem.toFixed(2)}/piece)
                        </div>
                        <div className="subtotal-quantity">
                          Total: {subtotalData.totalQuantity} piece(s)
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div className="variation-modal-footer">
              <button onClick={handleModalAddToCart} className="btn-add-to-cart-modal">
                🛒 Add to Cart
              </button>
              <button onClick={handleModalBuyNow} className="btn-buy-now-modal">
                ⚡ Buy Now
              </button>
              <div className="modal-footer-secondary">
                <button onClick={closeVariationModal} className="btn-chat-now">
                  Chat now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flipkart Style Image Lightbox Modal */}
      {showLightbox && product.images && product.images.length > 0 && (
        <div className="image-lightbox-overlay" onClick={closeLightbox}>
          <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button className="lightbox-close-btn" onClick={closeLightbox} aria-label="Close">
              ✕
            </button>

            {/* Zoom Controls */}
            <div className="lightbox-zoom-controls">
              <button 
                className="lightbox-zoom-btn" 
                onClick={zoomOut}
                disabled={lightboxZoomLevel <= 1}
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="lightbox-zoom-level">{Math.round(lightboxZoomLevel * 100)}%</span>
              <button 
                className="lightbox-zoom-btn" 
                onClick={zoomIn}
                disabled={lightboxZoomLevel >= 3}
                aria-label="Zoom in"
              >
                +
              </button>
            </div>

            {/* Swipe Hint for Mobile */}
            {showSwipeHint && (
              <div className="lightbox-swipe-hint">
                ← Swipe to change images →
              </div>
            )}

            {/* Swipe Indicators */}
            {swipeDirection && (
              <div className={`lightbox-swipe-indicator ${swipeDirection}`}>
                {swipeDirection === 'left' ? '→' : '←'}
              </div>
            )}

            {/* Swipe Edge Indicators - Mobile Only */}
            {window.innerWidth <= 968 && lightboxZoomLevel === 1 && product.images && product.images.length > 1 && (
              <>
                {lightboxImageIndex > 0 && (
                  <div className="lightbox-swipe-edge left">
                    <span>‹</span>
                  </div>
                )}
                {lightboxImageIndex < product.images.length - 1 && (
                  <div className="lightbox-swipe-edge right">
                    <span>›</span>
                  </div>
                )}
              </>
            )}

            {/* Image Container */}
            <div className="lightbox-image-wrapper">
              <img
                src={getImageUrl(product.images[lightboxImageIndex])}
                alt={`${product.name} ${lightboxImageIndex + 1}`}
                className="lightbox-image"
                style={{
                  transform: `scale(${lightboxZoomLevel}) translate(${lightboxPanPosition.x / lightboxZoomLevel}px, ${lightboxPanPosition.y / lightboxZoomLevel}px)`,
                  cursor: lightboxZoomLevel > 1 ? 'move' : 'zoom-in'
                }}
                onClick={(e) => {
                  if (lightboxZoomLevel === 1) {
                    zoomIn();
                  }
                }}
                onMouseDown={(e) => {
                  if (lightboxZoomLevel > 1) {
                    e.preventDefault();
                    const startX = e.clientX - lightboxPanPosition.x;
                    const startY = e.clientY - lightboxPanPosition.y;

                    const handleMouseMove = (moveEvent) => {
                      setLightboxPanPosition({
                        x: moveEvent.clientX - startX,
                        y: moveEvent.clientY - startY
                      });
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 2) {
                    // Pinch zoom start
                    e.preventDefault();
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const distance = Math.hypot(
                      touch2.clientX - touch1.clientX,
                      touch2.clientY - touch1.clientY
                    );
                    setTouchDistance(distance);
                  } else if (e.touches.length === 1 && lightboxZoomLevel > 1) {
                    // Pan start when zoomed
                    setTouchStart(e.touches[0].clientX);
                    setTouchEnd(e.touches[0].clientY);
                  } else if (e.touches.length === 1) {
                    // Record touch start for swipe detection
                    const currentTime = new Date().getTime();
                    const tapLength = currentTime - lastTap;
                    
                    setLightboxTouchStart({
                      x: e.touches[0].clientX,
                      y: e.touches[0].clientY,
                      time: currentTime
                    });
                    
                    // Double tap for zoom
                    if (tapLength < 300 && tapLength > 0) {
                      e.preventDefault();
                      if (lightboxZoomLevel === 1) {
                        setLightboxZoomLevel(2);
                      } else {
                        resetLightboxZoom();
                      }
                    }
                    setLastTap(currentTime);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 2 && touchDistance) {
                    // Pinch zoom
                    e.preventDefault();
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const distance = Math.hypot(
                      touch2.clientX - touch1.clientX,
                      touch2.clientY - touch1.clientY
                    );
                    const scale = Math.min(Math.max((distance / touchDistance) * lightboxZoomLevel, 1), 3);
                    setLightboxZoomLevel(scale);
                  } else if (e.touches.length === 1 && lightboxZoomLevel > 1 && touchStart !== null && touchEnd !== null) {
                    // Pan when zoomed
                    e.preventDefault();
                    const deltaX = e.touches[0].clientX - touchStart;
                    const deltaY = e.touches[0].clientY - touchEnd;
                    setLightboxPanPosition(prev => ({
                      x: prev.x + deltaX,
                      y: prev.y + deltaY
                    }));
                    setTouchStart(e.touches[0].clientX);
                    setTouchEnd(e.touches[0].clientY);
                  } else if (e.touches.length === 1 && lightboxZoomLevel === 1) {
                    // Track touch movement for swipe when not zoomed
                    setLightboxTouchEnd({
                      x: e.touches[0].clientX,
                      y: e.touches[0].clientY
                    });
                  }
                }}
                onTouchEnd={(e) => {
                  // Handle swipe gesture when not zoomed
                  if (lightboxZoomLevel === 1 && lightboxTouchStart.x !== 0) {
                    const deltaX = lightboxTouchEnd.x - lightboxTouchStart.x;
                    const deltaY = Math.abs(lightboxTouchEnd.y - lightboxTouchStart.y);
                    const timeElapsed = new Date().getTime() - lightboxTouchStart.time;
                    
                    // Swipe detection: horizontal movement > 50px, vertical < 100px, time < 500ms
                    const isSwipe = Math.abs(deltaX) > 50 && deltaY < 100 && timeElapsed < 500;
                    
                    if (isSwipe && product.images && product.images.length > 1) {
                      if (deltaX > 0 && lightboxImageIndex > 0) {
                        // Swipe right - previous image
                        setSwipeDirection('right');
                        setTimeout(() => setSwipeDirection(null), 300);
                        setLightboxImageIndex(lightboxImageIndex - 1);
                        resetLightboxZoom();
                      } else if (deltaX < 0 && lightboxImageIndex < product.images.length - 1) {
                        // Swipe left - next image
                        setSwipeDirection('left');
                        setTimeout(() => setSwipeDirection(null), 300);
                        setLightboxImageIndex(lightboxImageIndex + 1);
                        resetLightboxZoom();
                      }
                    }
                  }
                  
                  // Reset touch states
                  setTouchDistance(null);
                  setTouchStart(null);
                  setTouchEnd(null);
                  setLightboxTouchStart({ x: 0, y: 0, time: 0 });
                  setLightboxTouchEnd({ x: 0, y: 0 });
                }}
                draggable={false}
              />
            </div>

            {/* Navigation Arrows */}
            {product.images.length > 1 && (
              <>
                <button
                  className="lightbox-nav-btn lightbox-prev-btn"
                  onClick={() => {
                    if (lightboxImageIndex > 0) {
                      setLightboxImageIndex(lightboxImageIndex - 1);
                      resetLightboxZoom();
                    }
                  }}
                  disabled={lightboxImageIndex === 0}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  className="lightbox-nav-btn lightbox-next-btn"
                  onClick={() => {
                    if (lightboxImageIndex < product.images.length - 1) {
                      setLightboxImageIndex(lightboxImageIndex + 1);
                      resetLightboxZoom();
                    }
                  }}
                  disabled={lightboxImageIndex === product.images.length - 1}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}

            {/* Image Counter */}
            <div className="lightbox-counter">
              {lightboxImageIndex + 1} / {product.images.length}
            </div>

            {/* Keyboard Shortcuts Hint (Desktop Only) */}
            <div className="lightbox-keyboard-hint">
              <span>ESC to close</span>
              {product.images.length > 1 && <span>← → to navigate</span>}
            </div>

            {/* Thumbnail Strip */}
            {product.images.length > 1 && (
              <div className="lightbox-thumbnails">
                {product.images.map((img, index) => (
                  <img
                    key={index}
                    src={getImageUrl(img)}
                    alt={`Thumbnail ${index + 1}`}
                    className={`lightbox-thumbnail ${index === lightboxImageIndex ? 'active' : ''}`}
                    onClick={() => {
                      setLightboxImageIndex(index);
                      resetLightboxZoom();
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
     
    </div>
  );
};

export default ProductDetail;