import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { getImageUrl } from '../utils/config';
import './Cart.css';

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await api.get('/cart');
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      const response = await api.put(`/cart/update/${itemId}`, { quantity: newQuantity });
      setCart(response.data);
      toast.success('Cart updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update cart');
    }
  };

  const removeItem = async (itemId) => {
    try {
      const response = await api.delete(`/cart/remove/${itemId}`);
      setCart(response.data);
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const calculateTotal = () => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((total, item) => {
      return total + (Number(item.product.price || 0) * item.quantity);
    }, 0);
  };

  if (loading) {
    return <div className="loading">Loading cart...</div>;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="cart-page">
        <div className="breadcrumb-meesho">
          <Link to="/">Home</Link>
          <span> / </span>
          <span>Shopping Cart</span>
        </div>
        <div className="cart-container">
          <div className="empty-cart">
            <div className="empty-cart-icon">🛒</div>
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added anything to your cart yet</p>
            <Link to="/products" className="continue-shopping-btn">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      {/* Breadcrumb */}
      <div className="breadcrumb-meesho">
        <Link to="/">Home</Link>
        <span> / </span>
        <span>Shopping Cart</span>
      </div>

      <div className="cart-container">
        <div className="cart-items-section">
          <h2 className="cart-title">Shopping Cart ({cart.items.length} items)</h2>
          {cart.items.map(item => (
            <div key={item._id} className="cart-item">
              <div className="cart-item-image">
                <Link to={`/product/${item.product._id || item.product.id}`}>
                  {item.product.images && item.product.images.length > 0 ? (
                    <img 
                      src={getImageUrl(item.product.images[0])} 
                      alt={item.product.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/150x150?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="placeholder-image">No Image</div>
                  )}
                </Link>
              </div>
              <div className="cart-item-info">
                <Link to={`/product/${item.product._id || item.product.id}`}>
                  <h3>{item.product.name}</h3>
                </Link>
                <p className="cart-item-price">₹{Number(item.product.price || 0).toFixed(2)}</p>
                {item.product.stock < item.quantity && (
                  <p className="stock-warning">Only {item.product.stock} available</p>
                )}
              </div>
              <div className="cart-item-actions">
                <div className="quantity-controls">
                  <button onClick={() => updateQuantity(item._id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item._id)}
                  className="btn-remove"
                  title="Remove item"
                >
                  Remove
                </button>
                <div className="cart-item-total">
                  ₹{(Number(item.product.price || 0) * item.quantity).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <h3>Order Summary</h3>
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>₹{calculateTotal().toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping:</span>
            <span>Free</span>
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span>₹{calculateTotal().toFixed(2)}</span>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="btn-checkout"
          >
            Proceed to Checkout
          </button>
          <Link to="/products" className="btn-continue">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;

