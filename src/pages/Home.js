import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';
import RecentlyViewedSection from '../components/RecentlyViewed';
import Footer from '../components/Footer';
import { getImageUrl } from '../utils/config';
import './Home.css';

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCategories, setShowCategories] = useState(window.innerWidth > 768);

  // Utility function to ensure products have valid image URLs
  const processProducts = (products) => {
    if (!Array.isArray(products)) return [];
    
    return products.map(product => {
      // Ensure images array exists and filter out invalid URLs
      let validImages = [];
      if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        validImages = product.images.filter(img => 
          img && 
          typeof img === 'string' && 
          img.trim() !== '' &&
          !img.includes('via.placeholder.com') && // Remove external placeholder URLs
          !img.includes('placeholder.com')
        );
      }
      
      // Return product with processed images
      return {
        ...product,
        images: validImages.length > 0 ? validImages : [] // Empty array instead of placeholder URL
      };
    });
  };

  const fetchData = useCallback(async () => {
    try {
      const [categoriesRes, featuredRes, trendingRes, newRes] = await Promise.allSettled([
        api.get('/products/categories/list'),
        api.get('/products?limit=12&sortBy=rating'),
        api.get('/products?limit=12&sortBy=rating'),
        api.get('/products?limit=12&sortBy=newest')
      ]);
      
      if (categoriesRes.status === 'fulfilled') {
        setCategories(categoriesRes.value.data || []);
      }
      
      if (featuredRes.status === 'fulfilled') {
        const products = featuredRes.value.data?.products || featuredRes.value.data || [];
        setFeaturedProducts(processProducts(products));
      }
      
      if (trendingRes.status === 'fulfilled') {
        const products = trendingRes.value.data?.products || trendingRes.value.data || [];
        setTrendingProducts(processProducts(products));
      }
      
      if (newRes.status === 'fulfilled') {
        const products = newRes.value.data?.products || newRes.value.data || [];
        setNewArrivals(processProducts(products));
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home-alibaba">
      {/* Welcome Section - Alibaba Style */}
      <div className="welcome-section-alibaba">
        <div className="welcome-container-alibaba">
          <h2 className="welcome-title-alibaba">Welcome to Bangkok Mart</h2>
          <div className="welcome-links-alibaba">
            <Link to="/products" className="welcome-link-alibaba">
              Request for Quotation
            </Link>
            <Link to="/products?sortBy=rating" className="welcome-link-alibaba">
              Top Ranking
            </Link>
            <Link to="/products" className="welcome-link-alibaba">
              Fast customization
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Section - Categories + Products */}
      <div className="main-content-alibaba">
        <div className="main-container-alibaba">
          {/* Left Column - Categories List */}
          <div className="categories-sidebar-alibaba">
            <button 
              className="categories-toggle-mobile"
              onClick={() => setShowCategories(!showCategories)}
            >
              <h2 className="categories-title-alibaba">Categories for you</h2>
              <span className="categories-toggle-icon">{showCategories ? '▼' : '▶'}</span>
            </button>
            <h2 className="categories-title-alibaba categories-title-desktop">Categories for you</h2>
            <div className={`categories-list-alibaba ${showCategories ? 'categories-open' : 'categories-closed'}`}>
              {categories.map(category => (
                <Link
                  key={category}
                  to={`/products?category=${category}`}
                  className="category-item-alibaba"
                  onClick={() => setShowCategories(false)}
                >
                  <span className="category-text-alibaba">{category}</span>
                  <span className="category-arrow-alibaba">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Column - Products */}
          <div className="products-main-alibaba">
            {/* Recommended for your business Section - Alibaba Style */}
            <div className="recommended-business-alibaba">
              <h2 className="recommended-title-alibaba">Recommended for your business</h2>
              
              <div className="recommended-cards-alibaba">
                {/* India Local Stock Card */}
                <div className="recommended-card-alibaba us-local-card">
                  <div className="recommended-card-header">
                    <span className="card-flag-icon">🇮🇳</span>
                    <span className="card-title-text">India local stock</span>
                  </div>
                  <div className="recommended-benefits">
                    <div className="benefit-item">
                      <span className="check-icon">✓</span>
                      <span>Fastest delivery in 5 days</span>
                    </div>
                    <div className="benefit-item">
                      <span className="check-icon">✓</span>
                      <span>No import charges</span>
                    </div>
                  </div>
                  <div className="recommended-products-grid">
                    {featuredProducts.slice(0, 3).map(product => (
                      <Link
                        key={product._id || product.id}
                        to={`/product/${product._id || product.id}`}
                        className="recommended-product-item"
                      >
                        <div className="recommended-product-image">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={getImageUrl(product.images[0])}
                              alt={product.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                              }}
                            />
                          ) : (
                            <div className="placeholder-image">No Image</div>
                          )}
                          <span className="local-tag">Local</span>
                        </div>
                        <div className="recommended-product-info">
                          <div className="recommended-product-price">₹{product.price ? product.price.toFixed(2) : '0.00'}</div>
                          <div className="recommended-product-moq">MOQ: {product.sale_min_qty || 1}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link to="/products" className="explore-now-btn">Explore now</Link>
                </div>

                {/* Bangkok Mart Guaranteed Card */}
                <div className="recommended-card-alibaba guaranteed-card">
                  <div className="recommended-card-header">
                    <span className="card-title-text">Bangkok Mart Guaranteed</span>
                  </div>
                  <div className="recommended-benefits">
                    <div className="benefit-item">
                      <span className="check-icon">✓</span>
                      <span>Quick order and pay</span>
                    </div>
                    <div className="benefit-item">
                      <span className="check-icon">✓</span>
                      <span>On-time delivery</span>
                    </div>
                    <div className="benefit-item">
                      <span className="check-icon">✓</span>
                      <span>Money-back guarantee</span>
                    </div>
                  </div>
                  <div className="recommended-products-grid">
                    {trendingProducts.slice(0, 3).map(product => (
                      <Link
                        key={product._id || product.id}
                        to={`/product/${product._id || product.id}`}
                        className="recommended-product-item"
                      >
                        <div className="recommended-product-image">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={getImageUrl(product.images[0])}
                              alt={product.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                              }}
                            />
                          ) : (
                            <div className="placeholder-image">No Image</div>
                          )}
                        </div>
                        <div className="recommended-product-info">
                          <div className="recommended-product-price">₹{product.price ? product.price.toFixed(2) : '0.00'}</div>
                          <div className="recommended-product-moq">MOQ: {product.sale_min_qty || 1}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link to="/products" className="explore-now-btn">Explore now</Link>
                </div>

                {/* Fast Customization Card */}
                <div className="recommended-card-alibaba customization-card">
                  <div className="recommended-card-header">
                    <span className="card-icon">⚙️</span>
                    <span className="card-title-text">Fast customization</span>
                  </div>
                  <div className="recommended-benefits">
                    <div className="benefit-item">
                      <span className="check-icon">✓</span>
                      <span>Low MOQ</span>
                    </div>
                    <div className="benefit-item">
                      <span className="check-icon">✓</span>
                      <span>14-day dispatch</span>
                    </div>
                    <div className="benefit-item">
                      <span className="check-icon">✓</span>
                      <span>True to design</span>
                    </div>
                  </div>
                  <div className="recommended-products-grid">
                    {newArrivals.slice(0, 3).map(product => (
                      <Link
                        key={product._id || product.id}
                        to={`/product/${product._id || product.id}`}
                        className="recommended-product-item"
                      >
                        <div className="recommended-product-image">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={getImageUrl(product.images[0])}
                              alt={product.name}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
                              }}
                            />
                          ) : (
                            <div className="placeholder-image">No Image</div>
                          )}
                          <span className="customization-tag">Packaging</span>
                        </div>
                        <div className="recommended-product-info">
                          <div className="recommended-product-price">₹{product.price ? product.price.toFixed(2) : '0.00'}</div>
                          <div className="recommended-product-moq">MOQ: {product.sale_min_qty || 1}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link to="/products" className="explore-now-btn">Explore now</Link>
                </div>
              </div>
            </div>

            {/* Top Deals Section - Horizontal Scroll */}
            {featuredProducts.length > 0 && (
              <div className="products-section-alibaba">
                <div className="section-header-alibaba">
                  <div>
                    <h2 className="section-title-alibaba">Top Deals</h2>
                    <p className="section-subtitle-alibaba">Score the lowest prices on Bangkok Mart</p>
                  </div>
                  <Link to="/products" className="view-all-alibaba">View more →</Link>
                </div>
                <div className="products-scroll-alibaba">
                  {featuredProducts.slice(0, 12).map(product => (
                    <div key={product._id || product.id} className="product-scroll-item">
                      <ProductCard product={product} showWishlist={true} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Ranking Section - Horizontal Scroll */}
            {trendingProducts.length > 0 && (
              <div className="products-section-alibaba">
                <div className="section-header-alibaba">
                  <div>
                    <h2 className="section-title-alibaba">Top Ranking</h2>
                    <p className="section-subtitle-alibaba">Navigate trends with data-driven rankings</p>
                  </div>
                  <Link to="/products?sortBy=rating" className="view-all-alibaba">View more →</Link>
                </div>
                <div className="products-scroll-alibaba">
                  {trendingProducts.slice(0, 12).map(product => (
                    <div key={product._id || product.id} className="product-scroll-item">
                      <ProductCard product={product} showWishlist={true} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Arrivals Section - Horizontal Scroll */}
            {newArrivals.length > 0 && (
              <div className="products-section-alibaba">
                <div className="section-header-alibaba">
                  <div>
                    <h2 className="section-title-alibaba">New Arrivals</h2>
                    <p className="section-subtitle-alibaba">Stay ahead with the latest offerings</p>
                  </div>
                  <Link to="/products?sortBy=newest" className="view-all-alibaba">View more →</Link>
                </div>
                <div className="products-scroll-alibaba">
                  {newArrivals.slice(0, 12).map(product => (
                    <div key={product._id || product.id} className="product-scroll-item">
                      <ProductCard product={product} showWishlist={true} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recently Viewed */}
      <RecentlyViewedSection />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Home;

