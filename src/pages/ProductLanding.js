import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import ProductCardSlider from '../components/ProductCardSlider';
import MultiColorProductCard from '../components/MultiColorProductCard';
import './ProductLanding.css';

const ProductLanding = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mainProduct, setMainProduct] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [similarLowerPrices, setSimilarLowerPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isCatalogBased, setIsCatalogBased] = useState(false);
  const loadingRef = useRef(false);

  const fetchProductAndCategory = useCallback(async (loadMore = false) => {
    // Prevent duplicate calls
    if (loadingRef.current && loadMore) return;
    
    try {
      loadingRef.current = true;
      if (!loadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Fetch the main product first (only on initial load)
      if (!loadMore) {
        const productResponse = await api.get(`/products/${id}`);
        const product = productResponse.data;
        setMainProduct(product);
        setIsCatalogBased(!!product.catalog_id);
      }

      // Fetch products from same catalog/category
      const currentOffset = loadMore ? offset : 0;
      const categoryResponse = await api.get(`/products/landing/${id}`, {
        params: {
          limit: 20,
          offset: currentOffset
        }
      });
      
      const newProducts = categoryResponse.data.categoryProducts || [];
      if (loadMore) {
        setCategoryProducts(prev => [...prev, ...newProducts]);
        setOffset(prev => prev + newProducts.length);
      } else {
        setCategoryProducts(newProducts);
        setOffset(newProducts.length);
      }
      
      setHasMore(categoryResponse.data.hasMore || false);
      
      // Fetch similar products with lower prices (only on initial load)
      if (!loadMore) {
        try {
          const similarResponse = await api.get(`/products/${id}/similar-lower-prices`);
          setSimilarLowerPrices(similarResponse.data || []);
        } catch (error) {
          console.error('Error fetching similar products with lower prices:', error);
          setSimilarLowerPrices([]);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      if (!loadMore) {
        toast.error('Product not found');
        navigate('/products');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [id, offset, navigate]);

  useEffect(() => {
    // Reset on product change
    setCategoryProducts([]);
    setOffset(0);
    setHasMore(false);
    setLoading(true);
    loadingRef.current = false;
    fetchProductAndCategory();
  }, [id, fetchProductAndCategory]);

  // Infinite scroll handler - only for catalog-based products
  useEffect(() => {
    if (!isCatalogBased || !hasMore || loadingMore || loadingRef.current) return;

    const handleScroll = () => {
      if (loadingRef.current || !hasMore || loadingMore) return;
      
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Load more when user is 300px from bottom
      if (scrollTop + windowHeight >= documentHeight - 300) {
        fetchProductAndCategory(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isCatalogBased, hasMore, loadingMore, fetchProductAndCategory]);


  if (loading) {
    return (
      <div className="landing-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!mainProduct) {
    return (
      <div className="landing-error">
        <h2>Product not found</h2>
        <button onClick={() => navigate('/products')} className="btn-primary">
          <span>Browse Products</span>
        </button>
      </div>
    );
  }

  return (
    <div className="product-landing-page">
      {/* Hero Section - Main Product */}
      <section className="hero-product-section">
        <div className="container">
          <div className="hero-product-wrapper">
            <div className="hero-badge">Featured Product</div>
            <ProductCardSlider product={mainProduct} isHero={true} />
          </div>
        </div>
      </section>

      {/* Similar Items with Lower Prices */}
      {similarLowerPrices.length > 0 && (
        <section className="similar-lower-prices-section">
          <div className="container">
            <div className="section-header-similar">
              <span className="arrow-down-icon">🔻</span>
              <h2 className="section-title-similar">Similar items with lower prices</h2>
            </div>
            <div className="similar-products-slider">
              {similarLowerPrices.map((product) => (
                <ProductCardSlider key={product.id} product={product} compact={true} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Products from Same Catalog/Category */}
      {categoryProducts.length > 0 && (
        <section className="related-products-section">
          <div className="container">
            <h2 className="section-title">
              {mainProduct.catalog_name 
                ? `More from ${mainProduct.catalog_name}` 
                : `More from ${mainProduct.category}`}
            </h2>
            <p className="section-subtitle">
              {mainProduct.catalog_name 
                ? `Explore other products in this catalog`
                : `Explore other products in this category`}
            </p>

            <div className="products-grid">
              {categoryProducts.map((product) => (
                <MultiColorProductCard key={product.id} product={product} showWishlist={true} />
              ))}
            </div>
            
            {loadingMore && (
              <div className="loading-more" style={{ textAlign: 'center', padding: '20px' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
                <p>Loading more products...</p>
              </div>
            )}
            
            {!hasMore && categoryProducts.length > 0 && (
              <div className="no-more-products" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                <p>No more products to show</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2>Didn't find what you're looking for?</h2>
            <p>Browse our complete product catalog</p>
            <button onClick={() => navigate('/products')} className="btn-browse-all">
              <span>Browse All Products</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductLanding;

