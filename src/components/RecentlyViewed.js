import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import ProductCard from './ProductCard';
import './RecentlyViewed.css';

const RecentlyViewedSection = () => {
  const { user } = React.useContext(AuthContext);
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecentlyViewed();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchRecentlyViewed = async () => {
    try {
      const response = await api.get('/products/recently-viewed');
      setRecentProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching recently viewed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return null; // Don't show loading, just return null
  }

  if (recentProducts.length === 0) {
    return null; // Don't show section if no products
  }

  return (
    <div className="recently-viewed-section-alibaba">
      <div className="recently-viewed-container-alibaba">
        <div className="products-section-alibaba">
          <div className="section-header-alibaba">
            <div>
              <h2 className="section-title-alibaba">Recently Viewed</h2>
              <p className="section-subtitle-alibaba">Continue browsing from where you left off</p>
            </div>
          </div>
          <div className="products-scroll-alibaba">
            {recentProducts.map(product => (
              <div key={product._id} className="product-scroll-item">
                <ProductCard product={product} showWishlist={true} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentlyViewedSection;

