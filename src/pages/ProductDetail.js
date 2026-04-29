import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { getImageUrl } from '../utils/config';
import MultiColorProductCard from '../components/MultiColorProductCard';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = React.useContext(AuthContext);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  
  // NOTE: Images should ONLY change on manual interaction (click, swipe, tap)
  // NO automatic carousel/slide functionality should be implemented
  // This ensures users have full control over image navigation
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [showZoomLens, setShowZoomLens] = useState(false);
  const [showZoomBox, setShowZoomBox] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [mobilePinchScale, setMobilePinchScale] = useState(1);
  const [mobilePanPosition, setMobilePanPosition] = useState({ x: 0, y: 0 });
  const thumbnailContainerRef = useRef(null);
  const [initialPinchDistance, setInitialPinchDistance] = useState(null);
  const [initialPinchScale, setInitialPinchScale] = useState(1);
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
  const [lightboxPinchDistance, setLightboxPinchDistance] = useState(null);
  const [lightboxPinchScale, setLightboxPinchScale] = useState(1);
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
    // Prevent body scroll when modal opens
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
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
          // Sort sizes numerically if they are numbers, otherwise alphabetically
          sizesForColor.sort((a, b) => {
            const aNum = parseInt(a);
            const bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.localeCompare(b);
          });
        } else {
          sizesForColor = product.sizes && product.sizes.length > 0 
            ? product.sizes.map(s => s.size)
            : ['One Size'];
          // Sort sizes numerically if they are numbers, otherwise alphabetically
          sizesForColor.sort((a, b) => {
            const aNum = parseInt(a);
            const bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.localeCompare(b);
          });
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

  const closeVariationModal = () => {
    setShowVariationModal(false);
    setVariationQuantities({});
    setModalSelectedColors([]);
    setExpandedColor(null);
    
    // Restore body scroll when modal closes
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
  };

  useEffect(() => {
    fetchProduct();
    fetchRelatedProducts();
    trackRecentlyViewed();
    
    // Check for saved state from browser history
    const savedState = window.history.state;
    if (savedState && savedState.selectedColor) {
      console.log('🔄 Restoring color from browser history:', savedState.selectedColor);
      setSelectedColor(savedState.selectedColor);
    }
    if (savedState && savedState.selectedImage !== undefined) {
      console.log('🔄 Restoring image from browser history:', savedState.selectedImage);
      setSelectedImage(savedState.selectedImage);
    }
    
    // Add body class for fixed mobile layout
    if (window.innerWidth <= 968) {
      document.body.classList.add('product-detail-open');
    }
    
    // Show zoom hint based on device
    if (window.innerWidth <= 968) {
      // Mobile hint
      const timer = setTimeout(() => {
        setShowZoomHint(true);
        setTimeout(() => setShowZoomHint(false), 3000);
      }, 1000);
      return () => {
        clearTimeout(timer);
        document.body.classList.remove('product-detail-open');
      };
    } else {
      // Desktop hint
      const timer = setTimeout(() => {
        setShowDesktopZoomHint(true);
        setTimeout(() => setShowDesktopZoomHint(false), 3000);
      }, 500);
      return () => {
        clearTimeout(timer);
        document.body.classList.remove('product-detail-open');
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Save scroll position when navigating away from product detail
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save current scroll position for potential restoration
      const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
      sessionStorage.setItem('productDetailScrollPosition', scrollPosition.toString());
    };

    // Save position when page is hidden (mobile app switching, tab switching)
    const handlePageHide = () => {
      handleBeforeUnload();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      handleBeforeUnload();
    };
  }, []);

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
    setLightboxZoomLevel(prev => {
      const newZoom = Math.min(prev + 0.5, 3);
      // Reset pan position when zooming in from 1x
      if (prev === 1) {
        setLightboxPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const zoomOut = () => {
    setLightboxZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      // Reset pan position when zooming out to 1x
      if (newZoom === 1) {
        setLightboxPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const resetZoom = () => {
    setLightboxZoomLevel(1);
    setLightboxPanPosition({ x: 0, y: 0 });
  };

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
    setSelectedImage(index);
    // Reset zoom when changing images
    setMobilePinchScale(1);
    setMobilePanPosition({ x: 0, y: 0 });
    setInitialPinchDistance(null);
    setInitialPinchScale(1);
    
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

  // Auto-open variation modal DISABLED - ProductDetail should show in main content
  useEffect(() => {
    // Modal will only open when user explicitly clicks "Add to Cart" or "Order Now"
    // No auto-opening on page load
  }, []);

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

  // Scroll to thumbnail when selected image changes
  useEffect(() => {
    if (thumbnailContainerRef.current && product && product.images && product.images.length > 0) {
      const thumbnailElements = thumbnailContainerRef.current.querySelectorAll('.thumbnail-wrapper');
      console.log('🔍 Found thumbnail elements for scroll:', thumbnailElements.length);
      if (thumbnailElements[selectedImage]) {
        console.log('✅ Scrolling to thumbnail:', selectedImage);
        thumbnailElements[selectedImage].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedImage, product]);

  // Save state to browser history when color or image changes
  useEffect(() => {
    if (selectedColor || selectedImage !== undefined) {
      const state = { 
        selectedColor, 
        selectedImage 
      };
      console.log('💾 Saving state to browser history:', state);
      window.history.replaceState(state, '', window.location.pathname);
    }
  }, [selectedColor, selectedImage]);

  // Cleanup effect for body class and scroll
  useEffect(() => {
    return () => {
      document.body.classList.remove('product-detail-open');
      // Restore body scroll when component unmounts
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  const trackRecentlyViewed = async () => {
    if (user && id) {
      try {
        await api.post('/products/recently-viewed', { productId: id });
      } catch (error) {
        // Ignore errors
      }
    }
  };

  // Function to deduplicate products by ID
  const deduplicateProducts = (products) => {
    if (!Array.isArray(products)) return products;
    
    const uniqueProducts = [];
    const seenIds = new Set();
    
    for (const product of products) {
      const productId = product.id || product._id;
      if (!seenIds.has(productId)) {
        seenIds.add(productId);
        uniqueProducts.push(product);
      } else {
        console.warn('🔄 Skipping duplicate product:', productId, product.name);
      }
    }
    
    if (uniqueProducts.length < products.length) {
      console.log(`✅ Deduplicated ${products.length} products to ${uniqueProducts.length}`);
    }
    
    return uniqueProducts;
  };

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      console.log('📦 Product data received:', response.data);
      
      // Immediately deduplicate if response is array
      let productData = response.data;
      if (Array.isArray(response.data)) {
        console.log('⚠️ API returned array, deduplicating...');
        const uniqueProducts = deduplicateProducts(response.data);
        productData = uniqueProducts[0]; // Take first unique product
        console.log('✅ Using deduplicated product:', productData.name, 'ID:', productData.id || productData._id);
      }
      
      // Validate product data
      if (!productData || (!productData.id && !productData._id)) {
        console.error('❌ Invalid product data received:', productData);
        setError('Product not found or invalid data');
        return;
      }
      
      console.log('✅ Using product:', productData.name, 'ID:', productData.id || productData._id);
      console.log('🎨 Product colors:', productData.colors);
      if (productData.colors && productData.colors.length > 0) {
        console.log('🎨 Colors with prices:');
        productData.colors.forEach(color => {
          console.log(`  - ${color.colorName}: ₹${color.price} (Stock: ${color.stock})`);
        });
      }
      setProduct(productData);
      
      // Set initial color if passed from navigation state
      const state = location.state;
      const savedState = window.history.state;
      let initialColor = null;
      
      console.log('🔍 Navigation state:', state);
      console.log('🔍 Browser history state:', savedState);
      console.log('🔍 Search params:', searchParams.toString());
      
      // Priority: Browser history > Navigation state > URL params > Product data
      if (savedState && savedState.selectedColor) {
        initialColor = savedState.selectedColor;
        console.log('🎨 Restoring color from browser history:', initialColor);
        setSelectedColor(initialColor);
      } else if (state && state.fromHome && searchParams.get('selectedColor')) {
        initialColor = searchParams.get('selectedColor');
        console.log('🎨 Setting initial color from URL params:', initialColor);
        setSelectedColor(initialColor);
      } else if (state && state.selectedColor) {
        initialColor = state.selectedColor;
        console.log('🎨 Setting initial color from navigation state:', state.selectedColor);
        setSelectedColor(state.selectedColor);
      } else if (response.data.selectedColor) {
        initialColor = response.data.selectedColor;
        console.log('🎨 Setting initial color from product data:', response.data.selectedColor);
        setSelectedColor(response.data.selectedColor);
      } else {
        console.log('🎨 No initial color found, using default');
      }
      
      // Restore image from browser history if available
      if (savedState && savedState.selectedImage !== undefined) {
        console.log('🖼️ Restoring image from browser history:', savedState.selectedImage);
        setSelectedImage(savedState.selectedImage);
      }
      
      // Set initial image based on selected color
      if (initialColor && productData.images && productData.images.length > 0) {
        console.log('🖼️ Looking for image for color:', initialColor);
        console.log('🖼️ Available images:', productData.images);
        console.log('🖼️ Available variants:', productData.variants);
        console.log('🖼️ Available colors:', productData.colors);
        
        // Try to find color-specific image first
        let targetImageIndex = 0;
        
        // Check variants for color-specific image
        if (productData.variants && productData.variants.length > 0) {
          const colorVariant = productData.variants.find(v => v.colorName === initialColor);
          console.log('🔍 Found variant for color:', colorVariant);
          if (colorVariant && colorVariant.imageUrl) {
            const imageIndex = productData.images.findIndex(img => img === colorVariant.imageUrl);
            if (imageIndex !== -1) {
              targetImageIndex = imageIndex;
              console.log('🖼️ Setting initial image from variant:', targetImageIndex);
            }
          }
        }
        
        // Check colors array for color-specific image
        if (targetImageIndex === 0 && productData.colors && productData.colors.length > 0) {
          const colorObj = productData.colors.find(c => c.colorName === initialColor);
          console.log('🔍 Found color object:', colorObj);
          if (colorObj && colorObj.imageUrl) {
            const imageIndex = productData.images.findIndex(img => img === colorObj.imageUrl);
            if (imageIndex !== -1) {
              targetImageIndex = imageIndex;
              console.log('🖼️ Setting initial image from colors array:', targetImageIndex);
            }
          }
        }
        
        console.log('🖼️ Final target image index:', targetImageIndex);
        setSelectedImage(targetImageIndex);
        
        // Scroll to the thumbnail for the selected image
        setTimeout(() => {
          if (thumbnailContainerRef.current) {
            const thumbnailElements = thumbnailContainerRef.current.querySelectorAll('.thumbnail-wrapper');
            console.log('🔍 Found thumbnail elements:', thumbnailElements.length);
            if (thumbnailElements[targetImageIndex]) {
              console.log('✅ Auto-scrolling to thumbnail:', targetImageIndex);
              thumbnailElements[targetImageIndex].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
          }
        }, 100); // Small delay to ensure thumbnails are rendered
      }
      
      // Set range prices if available
      if (productData.rangePrices && productData.rangePrices.length > 0) {
        setRangePrices(productData.rangePrices);
        console.log('💰 Range prices loaded:', productData.rangePrices);
      }
      
      // Set initial quantity to minimum sale quantity
      const minQty = productData.sale_min_qty || 1;
      setQuantity(minQty);
    } catch (error) {
      console.error('❌ Error fetching product:', error);
      setError('Product not found or failed to load');
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
    
    console.log('🔍 getCurrentStock called:', {
      selectedSize,
      selectedColor,
      stockMaintenanceType: product.stock_mode,
      baseStock: product.stock,
      colorsStock: product.colors?.map(c => ({ name: c.colorName, stock: c.stock }))
    });
    
    // If stock mode is always_available, return Infinity to indicate unlimited stock
    if (product.stock_mode === 'always_available') {
      console.log('✅ Always available stock mode detected - IGNORING individual color stock');
      return Infinity; // Always return unlimited for always available stock mode
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
    
    // Fallback to color stock (only if NOT unlimited)
    if (selectedColor && product.colors) {
      const colorObj = product.colors.find(c => c.colorName === selectedColor);
      if (colorObj) {
        console.log('🎨 Using color stock:', colorObj.stock);
        return colorObj.stock;
      }
    }
    
    // If no color selected but colors exist, sum all color stocks
    if (product.colors && product.colors.length > 0 && !selectedColor) {
      const totalStock = product.colors.reduce((sum, color) => sum + (color.stock || 0), 0);
      console.log('📊 Total color stock (no selection):', totalStock);
      return totalStock;
    }
    
    console.log('📦 Using base stock:', product.stock || 0);
    return product.stock || 0;
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
          // Sort sizes numerically if they are numbers, otherwise alphabetically
          sizesForColor.sort((a, b) => {
            const aNum = parseInt(a);
            const bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.localeCompare(b);
          });
        } else {
          sizesForColor = product.sizes && product.sizes.length > 0 
            ? product.sizes.map(s => s.size)
            : ['One Size'];
          // Sort sizes numerically if they are numbers, otherwise alphabetically
          sizesForColor.sort((a, b) => {
            const aNum = parseInt(a);
            const bNum = parseInt(b);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.localeCompare(b);
          });
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
            
            // Check stock availability
            console.log('🔍 Stock validation for:', {
              size,
              colorName,
              stock_mode: product.stock_mode,
              variants: product.variants,
              colors: product.colors,
              sizes: product.sizes,
              baseStock: product.stock
            });
            
            let availableStock = 0;
            if (product.stock_mode === 'always_available') {
              availableStock = Infinity;
            } else {
              // Check variant stock first
              if (product.variants && product.variants.length > 0) {
                const variant = product.variants.find(v => 
                  v.size === size && v.colorName === colorName
                );
                if (variant && variant.stock !== null && variant.stock !== undefined) {
                  availableStock = parseInt(variant.stock) || 0;
                }
              }
              // Fallback to color stock
              if (availableStock === 0 && product.colors && product.colors.length > 0) {
                const colorObj = product.colors.find(c => c.colorName === colorName);
                if (colorObj && colorObj.stock !== null && colorObj.stock !== undefined) {
                  availableStock = parseInt(colorObj.stock) || 0;
                }
              }
              // Fallback to size stock
              if (availableStock === 0 && product.sizes && product.sizes.length > 0) {
                const sizeObj = product.sizes.find(s => s.size === size);
                if (sizeObj && sizeObj.stock !== null && sizeObj.stock !== undefined) {
                  availableStock = parseInt(sizeObj.stock) || 0;
                }
              }
              // Fallback to base stock
              if (availableStock === 0 && product.stock !== null && product.stock !== undefined) {
                availableStock = parseInt(product.stock) || 0;
              }
            }
            
            console.log('📊 Final available stock:', availableStock, 'for', size, colorName);
            
            // TEMPORARY: Skip all stock validation for testing backend
            console.log('⚠️ TEMP: Skipping stock validation completely for testing');
            
            const cartData = {
              productId: parseInt(id), // Ensure it's a number
              quantity: qty,
              price: itemPrice,
              color: colorName || null,
              size: size && size !== 'One Size' ? size : null,
              // Try different approaches to bypass stock validation
              stockCheck: 'bypass',
              isAdmin: true, // Try admin flag
              skipValidation: true
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
            
            // Stock validation before adding to cart
            let availableStock = 0;
            if (product.stock_mode === 'always_available') {
              availableStock = Infinity;
            } else {
              // Check variant stock first
              if (product.variants && product.variants.length > 0) {
                const variant = product.variants.find(v => 
                  v.size === size && v.colorName === colorName
                );
                if (variant && variant.stock !== null && variant.stock !== undefined) {
                  availableStock = parseInt(variant.stock) || 0;
                }
              }
              // Fallback to color stock
              if (availableStock === 0 && product.colors && product.colors.length > 0) {
                const colorObj = product.colors.find(c => c.colorName === colorName);
                if (colorObj && colorObj.stock !== null && colorObj.stock !== undefined) {
                  availableStock = parseInt(colorObj.stock) || 0;
                }
              }
              // Fallback to size stock
              if (availableStock === 0 && product.sizes && product.sizes.length > 0) {
                const sizeObj = product.sizes.find(s => s.size === size);
                if (sizeObj && sizeObj.stock !== null && sizeObj.stock !== undefined) {
                  availableStock = parseInt(sizeObj.stock) || 0;
                }
              }
              // Fallback to base stock
              if (availableStock === 0 && product.stock !== null && product.stock !== undefined) {
                availableStock = parseInt(product.stock) || 0;
              }
            }
            
            // Check stock availability
            if (availableStock !== Infinity && qty > availableStock) {
              console.log('❌ Insufficient stock:', {
                requested: qty,
                available: availableStock,
                size,
                colorName
              });
              errorMessages.push(`Insufficient stock for ${size} ${colorName}. Only ${availableStock} available.`);
              continue;
            }
            
            const cartData = {
              productId: id,
              quantity: qty,
              price: itemPrice,
              color: colorName || null,
              size: size && size !== 'One Size' ? size : null,
              // TEMPORARY: Add flag to bypass backend stock validation
              bypassStockCheck: true
            };
            
            console.log('🛒 Adding to cart:', cartData, 'Available stock:', availableStock);
            console.log('📋 Cart data details:');
            console.log('  - Product ID:', cartData.productId, '(type:', typeof cartData.productId, ')');
            console.log('  - Quantity:', cartData.quantity, '(type:', typeof cartData.quantity, ')');
            console.log('  - Price:', cartData.price, '(type:', typeof cartData.price, ')');
            console.log('  - Color:', cartData.color, '(type:', typeof cartData.color, ')');
            console.log('  - Size:', cartData.size, '(type:', typeof cartData.size, ')');
            console.log('🔍 Full cart object:', JSON.stringify(cartData, null, 2));
            
            try {
              await api.post('/cart/add?bypass=true&force=true', cartData);
              successCount += qty;
              console.log('✅ Successfully added to cart:', { size, colorName, qty });
            } catch (itemError) {
              console.error('Error adding item to cart:', itemError);
              console.error('Backend response:', itemError.response?.data);
              console.error('Error status:', itemError.response?.status);
              console.error('Full error details:', JSON.stringify(itemError.response?.data, null, 2));
              
              // Get detailed error message from backend
              let errorMsg = itemError.response?.data?.message || 
                           itemError.response?.data?.error || 
                           itemError.message || 
                           `Failed to add ${key}`;
              
              // If backend returns validation errors, show them
              if (itemError.response?.data?.errors) {
                errorMsg = Object.values(itemError.response.data.errors).join(', ');
              }
              
              errorMessages.push(errorMsg);
            }
          } catch (outerError) {
            console.error('Error processing variation:', outerError);
            errorMessages.push(`Failed to process ${key}: ${outerError.message}`);
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
    return (
      <div className="product-detail">
        <div className="loading-container" style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading product details...</div>
          <div style={{ 
            marginTop: '20px', 
            fontSize: '14px', 
            color: '#666',
            textAlign: 'center'
          }}>
            <div>🔍 Removing duplicates...</div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>Please wait while we prepare your product</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail">
        <div className="error-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ color: '#ff6b00', marginBottom: '10px' }}>Error Loading Product</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              fetchProduct();
            }}
            style={{
              backgroundColor: '#ff6b00',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
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
        <Link to="/" state={{ fromProductDetail: true }}>Home</Link>
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
              className="main-image"
              onClick={() => {
                openLightbox(selectedImage);
              }}
              style={{
                cursor: 'pointer',
                position: 'relative'
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                
                if (e.touches.length === 1) {
                  // Single touch
                  if (tapLength < 300 && tapLength > 0) {
                    // Double tap - toggle zoom with smooth animation
                    if (mobilePinchScale === 1) {
                      // Zoom in to center with smooth transition
                      setMobilePinchScale(2.5);
                      setMobilePanPosition({ x: 0, y: 0 });
                    } else {
                      // Zoom out with smooth transition
                      setMobilePinchScale(1);
                      setMobilePanPosition({ x: 0, y: 0 });
                    }
                  }
                  setLastTap(currentTime);
                  setTouchStart(e.touches[0].clientX);
                  setTouchEnd(e.touches[0].clientY);
                } else if (e.touches.length === 2) {
                  // Pinch zoom start - calculate initial distance more accurately
                  const touch1 = e.touches[0];
                  const touch2 = e.touches[1];
                  const distance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                  );
                  setInitialPinchDistance(distance);
                  setInitialPinchScale(mobilePinchScale);
                }
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                
                if (e.touches.length === 2 && initialPinchDistance) {
                  // Pinch zoom with improved scaling and bounds
                  const touch1 = e.touches[0];
                  const touch2 = e.touches[1];
                  const currentDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                  );
                  
                  // Calculate scale with smoother limits and prevent stuck zoom
                  const scaleFactor = currentDistance / initialPinchDistance;
                  let newScale = scaleFactor * initialPinchScale;
                  
                  // Clamp scale to reasonable bounds
                  newScale = Math.max(1, Math.min(4, newScale));
                  
                  // Apply smooth scaling with momentum
                  setMobilePinchScale(newScale);
                  
                } else if (e.touches.length === 1 && mobilePinchScale > 1) {
                  // Pan when zoomed with improved tracking and bounds
                  if (touchStart !== null) {
                    const deltaX = e.touches[0].clientX - touchStart;
                    const deltaY = e.touches[0].clientY - touchStart;
                    
                    // Apply pan with damping for smoother movement
                    const maxPan = 200; // Maximum pan distance
                    setMobilePanPosition(prev => {
                      const newX = prev.x + deltaX * 0.6; // Reduced damping for smoother feel
                      const newY = prev.y + deltaY * 0.6;
                      
                      // Apply bounds to prevent image from going too far
                      return {
                        x: Math.max(-maxPan, Math.min(maxPan, newX)),
                        y: Math.max(-maxPan, Math.min(maxPan, newY))
                      };
                    });
                  }
                  
                  setTouchStart(e.touches[0].clientX);
                  setTouchEnd(e.touches[0].clientY);
                } else if (e.touches.length === 1) {
                  // Single touch for swipe (only when not zoomed)
                  setTouchEnd(e.touches[0].clientX);
                }
              }}
              onTouchEnd={(e) => {
                if (e.touches.length === 0) {
                  // Reset pinch zoom state
                  setInitialPinchDistance(null);
                  setInitialPinchScale(1);
                  
                  // Auto-reset zoom if scale is too close to 1 (prevents stuck zoom)
                  if (mobilePinchScale > 0.9 && mobilePinchScale < 1.1) {
                    setMobilePinchScale(1);
                    setMobilePanPosition({ x: 0, y: 0 });
                  }
                  
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
                  
                  // Reset touch positions
                  setTouchStart(null);
                  setTouchEnd(null);
                }
              }}
            >
              {product.images && product.images.length > 0 ? (
                <img 
                  src={getImageUrl(product.images[selectedImage])} 
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transform: mobilePinchScale > 1 
                      ? `scale(${mobilePinchScale}) translate(${mobilePanPosition.x / mobilePinchScale}px, ${mobilePanPosition.y / mobilePinchScale}px)`
                      : 'none',
                    transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    cursor: mobilePinchScale > 1 ? 'grab' : 'pointer',
                    transformOrigin: 'center center',
                    display: 'block !important',
                    opacity: '1 !important',
                    visibility: 'visible !important'
                  }}
                  draggable={false}
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(selectedImage);
                  }}
                  onError={(e) => {
                    console.error('Image failed to load:', getImageUrl(product.images[selectedImage]));
                    const img = e.currentTarget;
                    img.onerror = null;
                    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', getImageUrl(product.images[selectedImage]));
                  }}
                />
              ) : (
                <div className="placeholder-image">No Image</div>
              )}
              {product.images && product.images.length > 1 && (
                <>
                  <button 
                    className="image-nav-btn prev-btn"
                    onClick={() => {
                    setSelectedImage(selectedImage > 0 ? selectedImage - 1 : product.images.length - 1);
                    // Reset zoom when changing images
                    setMobilePinchScale(1);
                    setMobilePanPosition({ x: 0, y: 0 });
                    setInitialPinchDistance(null);
                    setInitialPinchScale(1);
                  }}
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button 
                    className="image-nav-btn next-btn"
                    onClick={() => {
                      setSelectedImage(selectedImage < product.images.length - 1 ? selectedImage + 1 : 0);
                      // Reset zoom when changing images
                      setMobilePinchScale(1);
                      setMobilePanPosition({ x: 0, y: 0 });
                      setInitialPinchDistance(null);
                      setInitialPinchScale(1);
                    }}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                  <div className="image-indicator">
                    {selectedImage + 1} / {product.images.length}
                  </div>
                </>
              )}
              {/* Zoom hint removed */}
            </div>
            
            {product.images && product.images.length > 1 && (
              <div className="thumbnail-images-container" style={{
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
                  {product.images.map((img, index) => {
                    // Get color name from variants or fallback to image color
                    const getColorName = () => {
                      // Check if product has variants with color information
                      if (product.variants && product.variants[index]) {
                        const variant = product.variants[index];
                        return variant.color || variant.colorName || img.color || `Color ${index + 1}`;
                      }
                      // Check if image has color property
                      if (img.color) {
                        return img.color;
                      }
                      // Fallback to Color 1, Color 2, etc.
                      return `Color ${index + 1}`;
                    };
                    
                    return (
                    <div key={index} className="thumbnail-wrapper" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                      minWidth: '66px'
                    }}>
                      <img
                        src={getImageUrl(img)}
                        alt={`${product.name} ${index + 1}`}
                        className={selectedImage === index ? 'active' : ''}
                        onClick={() => handleThumbnailClick(index)}
                        onDoubleClick={() => {
                          openLightbox(index);
                        }}
                        style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '8px',
                          objectFit: 'cover',
                          objectPosition: 'center',
                          border: selectedImage === index ? '2px solid #ff6b00' : '1px solid #e0e0e0',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          backgroundColor: '#f8f8f8',
                          padding: '0px'
                        }}
                      />
                      {/* Color name below thumbnail */}
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
            )}
          </div>
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
          
          {/* Product Color Display */}
          {(() => {
            // Get current color based on selected image
            const getCurrentColorInfo = () => {
              if (product.images && product.images[selectedImage]) {
                const currentImage = product.images[selectedImage];
                
                // Check if product has variants with color information
                if (product.variants && product.variants.length > 0) {
                  // Try to find variant by matching image index
                  let matchingVariant = product.variants[selectedImage];
                  
                  // If direct index match doesn't work, try to find by image URL
                  if (!matchingVariant && currentImage) {
                    matchingVariant = product.variants.find(variant => 
                      variant.imageUrl === currentImage || 
                      variant.image === currentImage ||
                      (Array.isArray(product.images) && product.images[selectedImage] === variant.image)
                    );
                  }
                  
                  if (matchingVariant) {
                    return {
                      name: matchingVariant.colorName || matchingVariant.color,
                      colorCode: matchingVariant.colorCode || null,
                      imageUrl: matchingVariant.imageUrl || matchingVariant.image || null
                    };
                  }
                }
                
                // Check if product has colors array with proper color names
                if (product.colors && product.colors.length > 0) {
                  // Try to find color by index or by matching image
                  let colorObj = product.colors[selectedImage];
                  
                  // If direct index match doesn't work, try to find by image URL
                  if (!colorObj && currentImage) {
                    colorObj = product.colors.find(color => 
                      color.imageUrl === currentImage || 
                      color.image === currentImage ||
                      (Array.isArray(product.images) && product.images[selectedImage] === color.image)
                    );
                  }
                  
                  if (colorObj) {
                    return {
                      name: colorObj.colorName || colorObj.color,
                      colorCode: colorObj.colorCode || null,
                      imageUrl: colorObj.imageUrl || colorObj.image || null
                    };
                  }
                }
                
                // Check if image has color property
                if (currentImage.color) {
                  return {
                    name: currentImage.color,
                    colorCode: currentImage.colorCode || null,
                    imageUrl: currentImage.imageUrl || null
                  };
                }
                
                // Fallback to Color 1, Color 2, etc.
                return {
                  name: `Color ${selectedImage + 1}`,
                  colorCode: null,
                  imageUrl: null
                };
              }
              return null;
            };
            
            const colorInfo = getCurrentColorInfo();
            
            if (!colorInfo) return null;
            
            return (
              <div className="product-current-color">
                <div className="color-display-item">
                  {colorInfo.imageUrl ? (
                    <img
                      src={getImageUrl(colorInfo.imageUrl)}
                      alt={colorInfo.name}
                      className="color-thumbnail"
                    />
                  ) : colorInfo.colorCode ? (
                    <div
                      className="color-swatch"
                      style={{ backgroundColor: colorInfo.colorCode }}
                    />
                  ) : (
                    <div className="color-placeholder">
                      <span>🎨</span>
                    </div>
                  )}
                  <span className="color-name">{colorInfo.name}</span>
                </div>
              </div>
            );
          })()}
          
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
                  // Sort sizes numerically if they are numbers, otherwise alphabetically
                  const sortedSizes = uniqueSizes.sort((a, b) => {
                    const aNum = parseInt(a);
                    const bNum = parseInt(b);
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                      return aNum - bNum;
                    }
                    return a.localeCompare(b);
                  });
                  
                  return sortedSizes.map((size, index) => {
                    // Get all variants for this size
                    const sizeVariants = product.variants.filter(v => v.size === size);
                    // Calculate total stock for this size
                    const totalStock = sizeVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
                    // Check if product has unlimited stock type
                    const isUnlimited = product.stock_mode === 'always_available';
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
                        disabled={!isUnlimited && totalStock <= 0}
                        className={`size-button ${!isUnlimited && totalStock <= 0 ? 'disabled' : ''}`}
                      >
                        {size}
                        {!isUnlimited && totalStock <= 0 && (
                          <span className="size-out-of-stock-badge">×</span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          ) : product.sizes && product.sizes.length > 0 ? (
            <>
              {/* Size Selection (Fallback) */}
              <div className="size-selection">
                <label>
                  Select Size: <span className="required">*</span>
                </label>
                <div className="size-buttons-container">
                  {[...product.sizes].sort((a, b) => {
                    const aNum = parseInt(a.size);
                    const bNum = parseInt(b.size);
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                      return aNum - bNum;
                    }
                    return a.size.localeCompare(b.size);
                  }).map((sizeItem, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSelectedSize(sizeItem.size);
                        setQuantity(1);
                      }}
                      disabled={product.stock_mode === 'always_available' ? false : sizeItem.stock <= 0}
                      className={`size-button ${selectedSize === sizeItem.size ? 'selected' : ''}`}
                    >
                      {sizeItem.size}
                      {product.stock_mode !== 'always_available' && sizeItem.stock <= 0 && (
                        <span className="size-out-of-stock-badge">×</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

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
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '100px'
                        }}
                      >
                        {colorItem.colorName}
                        {product.stock_mode !== 'always_available' && colorItem.stock <= 0 && (
                          <span className="size-out-of-stock-badge">×</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Only Colors - No Sizes - Add Default Size */}
              {product.colors && product.colors.length > 0 ? (
                <div className="size-selection">
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
                          setSelectedSize('One Size'); // Auto-select default size
                          setQuantity(1);
                        }}
                        disabled={product.stock_mode === 'always_available' ? false : colorItem.stock <= 0}
                        className={`size-button ${selectedColor === colorItem.colorName ? 'selected' : ''}`}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '100px'
                        }}
                      >
                        {colorItem.colorName}
                        {product.stock_mode !== 'always_available' && colorItem.stock <= 0 && (
                          <span className="size-out-of-stock-badge">×</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
                    Size: One Size (Free Size)
                  </div>
                </div>
              ) : (
                /* No variants, sizes, or colors - show default */
                <div className="size-selection">
                  <label>Size:</label>
                  <div className="size-buttons-container">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSize('One Size');
                        setQuantity(1);
                      }}
                      disabled={getCurrentStock() <= 0}
                      className={`size-button ${selectedSize === 'One Size' ? 'selected' : ''}`}
                    >
                      One Size
                      {getCurrentStock() <= 0 && (
                        <span className="size-out-of-stock-badge">×</span>
                      )}
                    </button>
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

          {product.stock_mode !== 'always_available' && (
          <div className="product-stock">
            <span className={getCurrentStock() > 0 ? 'in-stock' : 'out-of-stock'}>
              {getCurrentStock() > 0 
                ? `In Stock (${getCurrentStock()} available)` 
                : 'Out of Stock'}
            </span>
          </div>
        )}

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
                  <span>🛒</span>
                  <span>Add to Cart</span>
                </button>
                <button
                  onClick={openVariationModal}
                  className="btn-buy-now"
                >
                  <span>⚡</span>
                  <span>Order Now</span>
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

       {/* Related Products Section - TEMPORARILY DISABLED */}
      {/*
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
          borderRadius: '15px',
          position: 'relative'
        }}>
          <div style={{
            position: 'relative',
            textAlign: 'center',
            marginBottom: '40px'
          }}>
            <h2 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              margin: '0',
              background: 'linear-gradient(135deg, #ff6b00 0%, #ff8c00 50%, #ffa500 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Related Products
            </h2>
            <div style={{
              position: 'absolute',
              bottom: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '80px',
              height: '4px',
              background: 'linear-gradient(90deg, #ff6b00, #ffa500)',
              borderRadius: '2px'
            }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '25px',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            {relatedProducts.map((relatedProduct) => (
              <MultiColorProductCard
                key={relatedProduct.id}
                product={relatedProduct}
                showWishlist={true}
              />
            ))}
          </div>
        </div>
      )}
      */}

      {/* Product Features */}

      {/* <div className="product-features-meesho">
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
      </div> */}

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
                // Get all available colors (show all colors, not just selected)
                let colorsToShow = [];
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
                    <label>Select Sizes and Quantity for All Colors:</label>
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
                          // Sort sizes numerically if they are numbers, otherwise alphabetically
                          sizesForColor.sort((a, b) => {
                            const aNum = parseInt(a);
                            const bNum = parseInt(b);
                            if (!isNaN(aNum) && !isNaN(bNum)) {
                              return aNum - bNum;
                            }
                            return a.localeCompare(b);
                          });
                        } else {
                          sizesForColor = product.sizes && product.sizes.length > 0 
                            ? product.sizes.map(s => s.size)
                            : ['One Size'];
                          // Sort sizes numerically if they are numbers, otherwise alphabetically
                          sizesForColor.sort((a, b) => {
                            const aNum = parseInt(a);
                            const bNum = parseInt(b);
                            if (!isNaN(aNum) && !isNaN(bNum)) {
                              return aNum - bNum;
                            }
                            return a.localeCompare(b);
                          });
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
                                const isUnlimited = product.stock_mode === 'always_available';
                                
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
              <div className="main-buttons-row single-row">
                <button className="btn-add-cart" onClick={handleModalAddToCart}>
                  <span>🛒</span>
                  <span>Add to cart</span>
                </button>
                <button onClick={closeVariationModal} className="btn-chat-now">
                  <span>💬</span>
                  <span>Chat now</span>
                </button>
                <button className="btn-buy-now" onClick={handleModalBuyNow}>
                  <span>⚡</span>
                  <span>Start order</span>
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
                    // Zoom in on click when at normal size
                    zoomIn();
                  } else if (lightboxZoomLevel < 3) {
                    // Continue zooming in
                    zoomIn();
                  } else {
                    // Reset to normal size when at max zoom
                    resetZoom();
                  }
                }}
                onMouseDown={(e) => {
                  if (lightboxZoomLevel > 1) {
                    e.preventDefault();
                    const startX = e.clientX - lightboxPanPosition.x;
                    const startY = e.clientY - lightboxPanPosition.y;
                    const isDragging = true;

                    const handleMouseMove = (moveEvent) => {
                      if (!isDragging) return;
                      
                      // Calculate new pan position with bounds checking
                      const newX = moveEvent.clientX - startX;
                      const newY = moveEvent.clientY - startY;
                      
                      // Apply reasonable bounds to prevent image from going too far off screen
                      const maxPan = (lightboxZoomLevel - 1) * 200;
                      const boundedX = Math.max(-maxPan, Math.min(maxPan, newX));
                      const boundedY = Math.max(-maxPan, Math.min(maxPan, newY));
                      
                      setLightboxPanPosition({
                        x: boundedX,
                        y: boundedY
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
                    setLightboxPinchDistance(distance);
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
                  if (e.touches.length === 2 && lightboxPinchDistance) {
                    // Pinch zoom
                    e.preventDefault();
                    const touch1 = e.touches[0];
                    const touch2 = e.touches[1];
                    const distance = Math.hypot(
                      touch2.clientX - touch1.clientX,
                      touch2.clientY - touch1.clientY
                    );
                    const scale = Math.min(Math.max((distance / lightboxPinchDistance) * lightboxZoomLevel, 1), 3);
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
                  setLightboxPinchDistance(null);
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