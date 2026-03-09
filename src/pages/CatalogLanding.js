import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import ProductCardSlider from '../components/ProductCardSlider';
import './ProductLanding.css';
import './CatalogLanding.css';

const CatalogLanding = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    // Reset on catalog change
    setProducts([]);
    setOffset(0);
    setHasMore(false);
    setLoading(true);
    loadingRef.current = false;
    fetchCatalogAndProducts();
  }, [id, fetchCatalogAndProducts]);

  const fetchCatalogAndProducts = useCallback(async (loadMore = false) => {
    // Prevent duplicate calls
    if (loadingRef.current && loadMore) return;
    
    try {
      loadingRef.current = true;
      if (!loadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Fetch catalog and products
      const currentOffset = loadMore ? offset : 0;
      const response = await api.get(`/catalog/${id}/products`, {
        params: {
          limit: 20,
          offset: currentOffset
        }
      });
      
      if (!loadMore) {
        setCatalog(response.data.catalog);
      }
      
      const newProducts = response.data.products || [];
      if (loadMore) {
        setProducts(prev => [...prev, ...newProducts]);
        setOffset(prev => prev + newProducts.length);
      } else {
        setProducts(newProducts);
        setOffset(newProducts.length);
      }
      
      setHasMore(response.data.hasMore || false);
    } catch (error) {
      console.error('Error fetching catalog:', error);
      console.error('Error details:', error.response?.data || error.message);
      if (!loadMore) {
        if (error.response?.status === 404) {
          toast.error('Catalog not found');
        } else {
          toast.error('Error loading catalog. Please try again.');
        }
        // Don't navigate away immediately, let user see the error
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [id, offset]);

  // Infinite scroll handler
  useEffect(() => {
    if (!hasMore || loadingMore || loadingRef.current) return;

    const handleScroll = () => {
      if (loadingRef.current || !hasMore || loadingMore) return;
      
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Load more when user is 300px from bottom
      if (scrollTop + windowHeight >= documentHeight - 300) {
        fetchCatalogAndProducts(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, fetchCatalogAndProducts]);

  if (loading) {
    return (
      <div className="landing-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="landing-error">
        <h2>Catalog not found</h2>
        <button onClick={() => navigate('/products')} className="btn-primary">
          <span>Browse Products</span>
        </button>
      </div>
    );
  }

  return (
    <div className="catalog-app-page">
      {/* App-like Header */}
      <div className="catalog-app-header">
        <button className="app-back-btn" onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="app-header-content">
          <h1 className="app-header-title">{catalog.catalog_name}</h1>
          {catalog.description && (
            <p className="app-header-subtitle">{catalog.description}</p>
          )}
        </div>
      </div>

      {/* Catalog Header Section - Similar to Hero Section */}
      <section className="hero-product-section catalog-hero-section">
        <div className="container">
          <div className="hero-product-wrapper">
            <div className="hero-badge">Catalog</div>
            <div className="catalog-header-content">
              <h1 className="catalog-title">{catalog.catalog_name}</h1>
              {catalog.description && (
                <p className="catalog-description">{catalog.description}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid Section - Same as "More from" section */}
      {products.length > 0 && (
        <section className="related-products-section">
          <div className="container">
            <h2 className="section-title">
              Products in {catalog.catalog_name}
            </h2>
            <p className="section-subtitle">
              Explore all products in this catalog
            </p>

            <div className="products-grid">
              {products.map((product) => (
                <ProductCardSlider key={product.id} product={product} hideCategory={true} hideSeller={true} />
              ))}
            </div>
            
            {loadingMore && (
              <div className="loading-more" style={{ textAlign: 'center', padding: '20px' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
                <p>Loading more products...</p>
              </div>
            )}
            
            {!hasMore && products.length > 0 && (
              <div className="no-more-products" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                <p>No more products to show</p>
              </div>
            )}
          </div>
        </section>
      )}

      {products.length === 0 && !loading && (
        <section className="related-products-section">
          <div className="container">
            <div className="landing-error">
              <h2>No products found</h2>
              <p>This catalog doesn't have any products yet.</p>
              <button onClick={() => navigate('/products')} className="btn-primary">
                <span>Browse All Products</span>
              </button>
            </div>
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

export default CatalogLanding;
