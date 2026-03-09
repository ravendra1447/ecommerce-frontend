import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { getImageUrl } from '../utils/config';
import './Checkout.css';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = React.useContext(AuthContext);
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    paymentMethod: 'COD',
    upiId: ''
  });
  const [showUPIQR, setShowUPIQR] = useState(false);
  const [upiQRCode, setUpiQRCode] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showCouponSection, setShowCouponSection] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(true);
  const [saveAddress, setSaveAddress] = useState(true);

  useEffect(() => {
    fetchCart();
    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCart = async () => {
    try {
      const response = await api.get('/cart');
      setCart(response.data);
      if (!response.data.items || response.data.items.length === 0) {
        toast.info('Your cart is empty');
        navigate('/cart');
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/users/profile');
      if (response.data.address && response.data.address.street) {
        setFormData(prev => ({
          ...prev,
          street: response.data.address.street || '',
          city: response.data.address.city || '',
          state: response.data.address.state || '',
          pincode: response.data.address.pincode || '',
          phone: response.data.phone || ''
        }));
        // Show a subtle notification that address was auto-filled
        toast.info('✓ Address auto-filled from your profile', { 
          autoClose: 3000,
          position: 'top-center'
        });
        console.log('✅ Address auto-filled from saved profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePaymentMethodChange = async (method) => {
    setFormData({ ...formData, paymentMethod: method });
    setShowUPIQR(false);
    
    if (method === 'QR Code') {
      await generateUPIQR();
    }
  };

  const generateUPIQR = async () => {
    try {
      const total = calculateTotal();
      const response = await api.post('/payment/generate-upi-qr', {
        amount: total,
        orderId: `temp_${Date.now()}`,
        upiId: 'ravisrivastava278@okicici' // Your UPI ID
      });
      setUpiQRCode(response.data.qrCode);
      setShowUPIQR(true);
      console.log('QR Code generated for UPI:', response.data.upiId, 'Amount:', response.data.amount);
    } catch (error) {
      console.error('QR Code generation error:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const openRazorpayPopup = (paymentData, orderId, total, isMockPayment = false) => {
    try {
      console.log('Opening Razorpay popup with data:', { ...paymentData, key: '***', isMockPayment });
      
      if (!window.Razorpay) {
        console.error('Razorpay SDK still not available');
        toast.error('Payment gateway not loaded. Please refresh the page.');
        navigate(`/orders/${orderId}`);
        return;
      }

      // For mock payment, don't use order_id - Razorpay will reject invalid order IDs
      // Instead use direct payment without order_id
      const options = {
        key: paymentData.key || 'rzp_test_1DP5mmOlF5G5ag',
        amount: paymentData.amount,
        currency: paymentData.currency || 'INR',
        name: 'ShriMart',
        description: `Order Payment - ₹${total.toFixed(2)}${isMockPayment ? ' (Test Mode)' : ''}`,
        // Only include order_id if it exists and is not mock mode
        ...(isMockPayment || !paymentData.orderId ? {} : { order_id: paymentData.orderId }),
        handler: async function (paymentResponse) {
          try {
            console.log('Payment successful:', paymentResponse);
            
            if (isMockPayment) {
              console.log('Mock payment - skipping verification');
              toast.success('Payment form submitted! (Test mode - order already created)');
              navigate(`/orders/${orderId}`);
              return;
            }
            
            toast.success('Payment successful! Verifying...');
            
            await api.post('/payment/verify-payment', {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
              orderId: orderId
            });
            
            toast.success('Payment verified! Order placed successfully.');
            navigate(`/orders/${orderId}`);
          } catch (error) {
            console.error('Payment verification error:', error);
            if (isMockPayment) {
              toast.info('Test mode - Order already created');
            } else {
              toast.error('Payment verification failed. Please contact support.');
            }
            navigate(`/orders/${orderId}`);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: formData.phone || ''
        },
        theme: {
          color: '#2196f3'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment popup closed by user');
            toast.info('Payment cancelled. Order created. You can complete payment later.');
            // Don't navigate immediately - let user see the message
            setTimeout(() => {
              navigate(`/orders/${orderId}`);
            }, 2000);
          }
        },
        // Enable all payment methods - Razorpay will show based on selection preference
        method: {
          card: true,  // Always show card option
          upi: true,   // Always show UPI option
          netbanking: false,
          wallet: false
        },
        // Add retry option
        retry: {
          enabled: true,
          max_count: 3
        }
      };

      console.log('Razorpay options:', { ...options, key: '***' });
      
      try {
        const razorpay = new window.Razorpay(options);
        
        razorpay.on('payment.failed', function (response) {
          console.error('Payment failed:', response);
          const errorMsg = response.error?.description || response.error?.reason || 'Payment failed';
          console.error('Payment error details:', response.error);
          toast.error(errorMsg);
          setTimeout(() => {
            navigate(`/orders/${orderId}`);
          }, 3000);
        });
        
        // Open Razorpay popup
        razorpay.open();
        console.log('✅ Razorpay popup opened successfully');
        
        // Add a small delay to ensure popup is fully loaded
        setTimeout(() => {
          console.log('Razorpay popup should be visible now');
        }, 500);
      } catch (error) {
        console.error('Error creating Razorpay instance:', error);
        toast.error('Failed to open payment gateway: ' + error.message);
        navigate(`/orders/${orderId}`);
      }
      
    } catch (error) {
      console.error('Razorpay initialization error:', error);
      toast.error('Failed to open payment gateway. Please try again.');
      navigate(`/orders/${orderId}`);
    }
  };

  const saveAddressToProfile = async () => {
    if (!saveAddress) {
      console.log('User chose not to save address');
      return;
    }
    
    try {
      const addressData = {
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        },
        phone: formData.phone
      };
      
      await api.put('/users/profile', addressData);
      console.log('✅ Address saved to user profile successfully');
      toast.success('Address saved for future orders!', { autoClose: 2000 });
    } catch (error) {
      console.error('❌ Error saving address to profile:', error);
      // Don't block order if address save fails
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.street || !formData.city || !formData.state || !formData.pincode) {
      toast.error('Please fill in all address fields');
      return;
    }

    setOrderLoading(true);
    
    try {
      // Save address to user profile first
      await saveAddressToProfile();
      
      // Create order first (without payment processing)
      const orderData = {
        shippingAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          phone: formData.phone
        },
        paymentMethod: formData.paymentMethod
      };

      console.log('Creating order with payment method:', formData.paymentMethod);
      const response = await api.post('/orders', orderData);
      const orderId = response.data._id || response.data.id;
      console.log('Order created with ID:', orderId);

      // Process payment based on method
      if (formData.paymentMethod === 'COD') {
        // COD - no payment processing needed
        toast.success('Order placed successfully! Pay on delivery.');
        navigate(`/orders/${orderId}`);
      } else if (formData.paymentMethod === 'QR Code') {
        // QR Code - order created, user will scan QR
        toast.success('Order created! Please scan QR code to complete payment.');
        navigate(`/orders/${orderId}`);
      } else if (['Credit Card', 'Debit Card', 'UPI'].includes(formData.paymentMethod)) {
        // Online payment - open Razorpay popup
        try {
          console.log('Processing online payment for order:', orderId);
          
          const total = calculateTotal();
          
          // Wait a bit for order to be saved
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Create payment order
          const paymentOrderResponse = await api.post('/payment/create-order', {
            amount: total,
            orderId: orderId
          });
          
          console.log('Payment order response:', paymentOrderResponse.data);
          
          // Check if mock payment
          const isMockPayment = paymentOrderResponse.data.message && 
                                paymentOrderResponse.data.message.includes('mock');
          
          if (isMockPayment) {
            console.log('Mock payment mode detected - opening Razorpay popup for testing');
            toast.info('Test mode: Razorpay popup will open but payment won\'t process');
          }
          
          // Check if Razorpay is available
          if (!window.Razorpay) {
            console.error('Razorpay SDK not loaded - trying to load...');
            // Try to load Razorpay script if not loaded
            if (!document.querySelector('script[src*="razorpay"]')) {
              const script = document.createElement('script');
              script.src = 'https://checkout.razorpay.com/v1/checkout.js';
              script.onload = () => {
                console.log('Razorpay script loaded');
                setTimeout(() => {
                  openRazorpayPopup(paymentOrderResponse.data, orderId, total, isMockPayment);
                }, 500);
              };
              script.onerror = () => {
                console.error('Failed to load Razorpay script');
                toast.error('Payment gateway not available. Please refresh the page.');
                navigate(`/orders/${orderId}`);
              };
              document.body.appendChild(script);
              return;
            } else {
              // Script exists but Razorpay not available - wait a bit
              setTimeout(() => {
                if (window.Razorpay) {
                  openRazorpayPopup(paymentOrderResponse.data, orderId, total, isMockPayment);
                } else {
                  toast.error('Payment gateway not available. Please refresh the page.');
                  navigate(`/orders/${orderId}`);
                }
              }, 1000);
              return;
            }
          }
          
          // Open Razorpay popup (even in mock mode for testing)
          console.log('Opening Razorpay payment popup...');
          openRazorpayPopup(paymentOrderResponse.data, orderId, total, isMockPayment);
          
        } catch (paymentError) {
          console.error('Payment processing error:', paymentError);
          const errorMsg = paymentError.response?.data?.message || paymentError.message || 'Payment failed';
          
          toast.error(errorMsg);
          navigate(`/orders/${orderId}`);
        }
      } else {
        // Default - just navigate
        toast.success('Order placed successfully!');
        navigate(`/orders/${orderId}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setOrderLoading(false);
    }
  };

  const calculateSubtotal = () => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return Math.max(0, subtotal - discountAmount);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    try {
      const subtotal = calculateSubtotal();
      const response = await api.post('/coupons/verify', {
        code: couponCode.trim(),
        amount: subtotal
      });

      if (response.data.valid) {
        setAppliedCoupon(response.data.coupon);
        setDiscountAmount(response.data.coupon.discount);
        toast.success(`Coupon applied! ₹${response.data.coupon.discount} discount`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid coupon code');
      setAppliedCoupon(null);
      setDiscountAmount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setDiscountAmount(0);
    toast.info('Coupon removed');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return null;
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-form-section">
          <h2>Shipping Address</h2>
          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="form-group">
              <label>Street Address</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                required
                placeholder="House/Flat No., Street"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  required
                  pattern="[0-9]{6}"
                  maxLength="6"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  pattern="[0-9]{10}"
                  maxLength="10"
                />
              </div>
            </div>

            <div className="form-group save-address-group">
              <label className="save-address-checkbox">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                />
                <span className="save-address-text">
                  💾 Save this address for future orders
                </span>
              </label>
              <p className="save-address-hint">
                Your address will be auto-filled next time you checkout
              </p>
            </div>

            <div className="form-group payment-method-group">
              <label className="payment-method-label">Payment Method</label>
              <div className="payment-methods">
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={formData.paymentMethod === 'COD'}
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  <div className="payment-option-content">
                    <div className="payment-option-header">
                      <span className="payment-icon">💵</span>
                    </div>
                    <div className="payment-option-description">
                      When you place an order, it will be sent to WhatsApp. When we send the payment QR via WhatsApp, the customer will receive a message.
                    </div>
                  </div>
                </label>
                
                {/* Hidden payment options - kept for future use */}
                <div style={{ display: 'none' }}>
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Credit Card"
                      checked={formData.paymentMethod === 'Credit Card'}
                      onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    />
                    <span>💳 Credit Card</span>
                  </label>
                  
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Debit Card"
                      checked={formData.paymentMethod === 'Debit Card'}
                      onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    />
                    <span>💳 Debit Card</span>
                  </label>
                  
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="UPI"
                      checked={formData.paymentMethod === 'UPI'}
                      onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    />
                    <span>📱 UPI</span>
                  </label>
                  
                  <label className="payment-option">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="QR Code"
                      checked={formData.paymentMethod === 'QR Code'}
                      onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    />
                    <span>📷 QR Code</span>
                  </label>
                </div>
              </div>

              {/* Hidden UPI and Payment Info sections - kept for future use */}
              <div style={{ display: 'none' }}>
                {/* UPI ID Input */}
                {(formData.paymentMethod === 'UPI') && (
                  <div className="upi-input-container" style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Enter UPI ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="yourname@upi or yourname@paytm"
                      value={formData.upiId || ''}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '5px' }}
                    />
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>
                      If not provided, default UPI ID will be used
                    </p>
                  </div>
                )}

                {/* QR Code Display */}
                {showUPIQR && upiQRCode && (
                  <div className="upi-qr-container">
                    <h4>Scan QR Code to Pay</h4>
                    <img src={upiQRCode} alt="UPI QR Code" style={{ maxWidth: '300px', margin: '10px 0' }} />
                    <p>Amount: ₹{calculateTotal().toFixed(2)}</p>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      Scan this QR code with any UPI app to complete payment
                    </p>
                  </div>
                )}

                {/* Payment Info */}
                {(formData.paymentMethod === 'Credit Card' || formData.paymentMethod === 'Debit Card' || formData.paymentMethod === 'UPI') && (
                  <div className="payment-info" style={{ marginTop: '1rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px', fontSize: '14px' }}>
                    <p style={{ margin: 0, color: '#1976d2' }}>
                      {formData.paymentMethod === 'UPI' 
                        ? '📱 UPI payment will open in a popup. Enter your UPI ID if needed.'
                        : '💳 Card details will be asked in payment popup. Enter card number, CVV, and expiry date.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn-place-order"
              disabled={orderLoading}
            >
              {orderLoading ? 'Placing Order...' : 'Place Order'}
            </button>
          </form>
        </div>

        <div className="checkout-summary">
          <div className="order-summary-header" onClick={() => setShowOrderSummary(!showOrderSummary)}>
            <h3>Order Summary</h3>
            <span className="order-summary-toggle-icon">{showOrderSummary ? '▲' : '▼'}</span>
          </div>
          {showOrderSummary && (
            <div className="order-summary-content">
          {/* Coupon Section - Toggle Style */}
          {appliedCoupon ? (
            <div className="coupon-applied-badge">
              <div className="coupon-badge-content">
                <div className="coupon-badge-info">
                  <span className="coupon-badge-code">✓ {appliedCoupon.code}</span>
                  <span className="coupon-badge-discount">-₹{discountAmount.toFixed(2)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCoupon();
                }}
                className="btn-remove-coupon-badge"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="coupon-toggle-section">
              <button
                type="button"
                className="coupon-toggle-btn"
                onClick={() => setShowCouponSection(!showCouponSection)}
              >
                <span>Have a coupon?</span>
                <span className="coupon-toggle-icon">{showCouponSection ? '▲' : '▼'}</span>
              </button>
              {showCouponSection && (
                <div className="coupon-input-container">
                  <div className="coupon-input-group">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="coupon-input"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="btn-apply-coupon"
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="order-items">
            {cart.items.map(item => (
              <div key={item._id} className="order-item">
                <div className="order-item-image">
                  {item.product.images && item.product.images.length > 0 ? (
                    <img 
                      src={getImageUrl(item.product.images[0])} 
                      alt={item.product.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="placeholder-image">No Image</div>
                  )}
                </div>
                <div className="order-item-info">
                  <h4>{item.product.name}</h4>
                  <p>Qty: {item.quantity} × ₹{item.product.price}</p>
                </div>
                <div className="order-item-total">
                  ₹{(item.product.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div className="order-summary-total">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{calculateSubtotal().toFixed(2)}</span>
            </div>
            {appliedCoupon && (
              <div className="summary-row discount-row">
                <span>Discount ({appliedCoupon.code}):</span>
                <span className="discount-amount">-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Shipping:</span>
              <span>Free</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>₹{calculateTotal().toFixed(2)}</span>
            </div>
          </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;

