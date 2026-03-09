import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import './Wishlist.css';

const Wishlist = () => {
  const { user } = React.useContext(AuthContext);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const response = await api.get('/wishlist');
      setWishlist(response.data.items || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await api.delete(`/wishlist/remove/${productId}`);
      toast.success('Removed from wishlist');
      fetchWishlist();
    } catch (error) {
      toast.error('Failed to remove from wishlist');
    }
  };

  const handleAddToCart = async (productId) => {
    try {
      await api.post('/cart/add', { productId, quantity: 1 });
      toast.success('Added to cart!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    }
  };

  if (!user) {
    return (
      <div className="wishlist-page">
        <div className="wishlist-empty">
          <h2>Please login to view your wishlist</h2>
          <Link to="/login" className="btn-login">Login</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="wishlist-page">
      <div className="wishlist-container">
        <h1>My Wishlist</h1>
        
        {wishlist.length === 0 ? (
          <div className="wishlist-empty">
            <div className="empty-icon">❤️</div>
            <h2>Your wishlist is empty</h2>
            <p>Start adding products you love!</p>
            <Link to="/products" className="btn-shop">Browse Products</Link>
          </div>
        ) : (
          <>
            <div className="wishlist-header">
              <p>{wishlist.length} item(s) in wishlist</p>
            </div>
            
            <div className="wishlist-grid">
              {wishlist.map((item) => {
                const product = item.product;
                const imageUrl = product.images && product.images.length > 0
                  ? (product.images[0].startsWith('http') 
                      ? product.images[0] 
                      : `http://184.168.126.71:5002${product.images[0]}`)
                  : 'https://via.placeholder.com/300x300?text=No+Image';
                
                return (
                  <div key={item._id} className="wishlist-item">
                    <button
                      className="btn-remove-wishlist"
                      onClick={() => handleRemoveFromWishlist(product._id || product.id)}
                      title="Remove from wishlist"
                    >
                      ×
                    </button>
                    
                    <Link to={`/product/${product._id || product.id}`} className="wishlist-item-link">
                      <div className="wishlist-item-image">
                        <img
                          src={imageUrl}
                          alt={product.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
                          }}
                        />
                      </div>
                      
                      <div className="wishlist-item-info">
                        <h3>{product.name}</h3>
                        <div className="wishlist-item-price">
                          <span className="price">₹{product.price}</span>
                          {product.originalPrice && (
                            <span className="original-price">₹{product.originalPrice}</span>
                          )}
                        </div>
                        <div className={`stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                          {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </div>
                      </div>
                    </Link>
                    
                    <button
                      className="btn-add-cart-wishlist"
                      onClick={() => handleAddToCart(product._id || product.id)}
                      disabled={product.stock <= 0}
                    >
                      Add to Cart
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Wishlist;

