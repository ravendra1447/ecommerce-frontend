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
  const [formErrors, setFormErrors] = useState({});
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUPIQR, setShowUPIQR] = useState(false);
  const [upiQRCode, setUpiQRCode] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [showCouponSection, setShowCouponSection] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(true);
  const [saveAddress, setSaveAddress] = useState(true);
  const [hasSavedAddress, setHasSavedAddress] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [notificationShown, setNotificationShown] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  useEffect(() => {
    fetchCart();
    // Only fetch user profile once
    const timer = setTimeout(() => {
      fetchUserProfile();
    }, 100); // Small delay to prevent race conditions
    return () => clearTimeout(timer);
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
    // Prevent multiple calls
    if (notificationShown) {
      console.log('🚫 Notification already shown, skipping fetchUserProfile');
      return;
    }
    
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
        setHasSavedAddress(true);
        setShowAddressForm(false); // Hide form if address exists
        setNotificationShown(true); // Mark notification as shown immediately
        // Show a single notification that address was auto-filled
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
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear errors for this field
    setFormErrors(prev => ({
      ...prev,
      [name]: ''
    }));
    
    // Address suggestions for pincode
    if (name === 'pincode' && value.length === 6) {
      fetchAddressSuggestions(value);
    } else {
      setShowSuggestions(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.street.trim()) {
      errors.street = 'Street address is required';
    }
    
    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }
    
    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }
    
    if (!formData.pincode.trim()) {
      errors.pincode = 'Pincode is required';
    } else if (!/^[0-9]{6}$/.test(formData.pincode)) {
      errors.pincode = 'Please enter a valid 6-digit pincode';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchAddressSuggestions = async (pincode) => {
    try {
      // Mock API call - replace with actual API
      const mockSuggestions = [
        { street: 'Main Road', city: formData.city || 'New Delhi', state: 'Delhi', pincode },
        { street: 'Cross Street', city: formData.city || 'Mumbai', state: 'Maharashtra', pincode },
        { street: 'Park Avenue', city: formData.city || 'Bangalore', state: 'Karnataka', pincode }
      ];
      setAddressSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    }
  };

  const handleEditAddress = () => {
    setShowAddressForm(true);
    setIsEditingAddress(true);
  };

  const handleCancelEdit = () => {
    if (hasSavedAddress) {
      setShowAddressForm(false);
      setIsEditingAddress(false);
    }
  };

  const handleSaveAddress = () => {
    if (validateForm()) {
      setShowAddressForm(false);
      setIsEditingAddress(false);
      // Show a single notification that address was updated
      toast.info('✓ Address updated successfully!', { 
        autoClose: 3000,
        position: 'top-center'
      });
    }
  };

  const selectAddressSuggestion = (suggestion) => {
    setFormData({
      ...formData,
      street: suggestion.street,
      city: suggestion.city,
      state: suggestion.state,
      pincode: suggestion.pincode
    });
    setShowSuggestions(false);
    setFormErrors({});
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
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
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
          {/* Hide shipping address section completely on mobile */}
          <div className="desktop-only">
            <h2>Shipping Address</h2>
            
            {/* Show saved address card if address exists and form is hidden */}
            {hasSavedAddress && !showAddressForm && (
              <div className="saved-address-card">
                <div className="address-display">
                  <div className="address-info">
                    <h4>📍 Delivery Address</h4>
                    <p><strong>{formData.street}</strong></p>
                    <p>{formData.city}, {formData.state} - {formData.pincode}</p>
                    <p>📱 {formData.phone}</p>
                  </div>
                  <button 
                    type="button"
                    className="btn-edit-address"
                    onClick={handleEditAddress}
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            )}

            {/* Show address form when needed */}
            {(!hasSavedAddress || showAddressForm) && (
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
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label>Pincode</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      required
                      pattern="[0-9]{6}"
                      maxLength="6"
                      className={formErrors.pincode ? 'error' : ''}
                    />
                    {formErrors.pincode && (
                      <span className="error-message">{formErrors.pincode}</span>
                    )}
                    {showSuggestions && addressSuggestions.length > 0 && (
                      <div className="address-suggestions">
                        <div className="suggestions-header">📍 Suggested Addresses</div>
                        {addressSuggestions.map((suggestion, index) => (
                          <div 
                            key={index} 
                            className="suggestion-item"
                            onClick={() => selectAddressSuggestion(suggestion)}
                          >
                            <div className="suggestion-street">{suggestion.street}</div>
                            <div className="suggestion-details">
                              {suggestion.city}, {suggestion.state} - {suggestion.pincode}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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

                {hasSavedAddress && (
                  <div className="form-group">
                    <button
                      type="button"
                      className="btn-cancel-edit"
                      onClick={handleCancelEdit}
                    >
                      ❌ Cancel Edit
                    </button>
                  </div>
                )}

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

                <div className="desktop-order-actions">
                  <button
                    type="button"
                    className="btn-show-total-desktop"
                    onClick={() => setShowOrderSummary(!showOrderSummary)}
                  >
                    Total: ₹{calculateTotal().toFixed(2)}
                  </button>
                  <button
                    type="submit"
                    className="btn-place-order-desktop"
                    disabled={orderLoading}
                  >
                    {orderLoading ? 'Placing Order...' : 'Place Order'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="checkout-summary">
          <div className="order-summary-header" onClick={() => setShowOrderSummary(!showOrderSummary)}>
            <h3>Order Summary</h3>
            <span className="order-summary-toggle-icon">{showOrderSummary ? '▲' : '▼'}</span>
          </div>
          {showOrderSummary && (
            <div className="order-summary-content">
              {/* Order Items Section */}
              <div className="order-items" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)', padding: '1.25rem', borderRadius: '16px', border: '2px solid #f0f0f0', marginBottom: '1.25rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🛒 Order Items ({cart.items.length})
                </h3>
                {cart.items.map(item => (
                  <div key={item._id} className="order-item" style={{ padding: '1rem 0', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="order-item-image" style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #f0f0f0', background: '#fff' }}>
                      {item.product.images && item.product.images.length > 0 ? (
                        <img 
                          src={getImageUrl(item.product.images[0])} 
                          alt={item.product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/100x100?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="placeholder-image" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#999', fontSize: '0.8rem' }}>No Image</div>
                      )}
                    </div>
                    <div className="order-item-info" style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '1rem', fontWeight: '700', lineHeight: '1.4' }}>{item.product.name}</h4>
                      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>Qty: {item.quantity} × ₹{item.product.price}</p>
                    </div>
                    <div className="order-item-total" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#333', minWidth: '80px', textAlign: 'right' }}>
                      ₹{(item.product.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping Address Section */}
              {isEditingAddress ? (
                <div className="shipping-address-summary">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#333', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      ✏️ Edit Delivery Address
                    </h4>
                    <button 
                      type="button"
                      onClick={handleCancelEdit}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
                        e.target.style.transform = 'translateY(-2px)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      ❌ Cancel
                    </button>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)', padding: '1rem', borderRadius: '12px', border: '2px solid #f0f0f0', marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontSize: '0.9rem', fontWeight: '600' }}>Street Address</label>
                      <input
                        type="text"
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        required
                        placeholder="House/Flat No., Street"
                        style={{
                          width: '100%',
                          padding: '0.875rem 1rem',
                          fontSize: '16px',
                          borderRadius: '8px',
                          border: '1px solid #ddd',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontSize: '0.9rem', fontWeight: '600' }}>City</label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          required
                          style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontSize: '0.9rem', fontWeight: '600' }}>State</label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          required
                          style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontSize: '0.9rem', fontWeight: '600' }}>Pincode</label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleInputChange}
                          required
                          pattern="[0-9]{6}"
                          maxLength="6"
                          style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontSize: '0.9rem', fontWeight: '600' }}>Phone</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          pattern="[0-9]{10}"
                          maxLength="10"
                          style={{
                            width: '100%',
                            padding: '0.875rem 1rem',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={handleSaveAddress}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 15px rgba(22, 163, 74, 0.3)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #15803d 0%, #14532d 100%)';
                        e.target.style.transform = 'translateY(-2px)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      💾 Save Address
                    </button>
                  </div>
                </div>
              ) : (
                <div className="shipping-address-summary">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#333', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      📍 Delivery Address
                    </h4>
                    <button 
                      type="button"
                      onClick={handleEditAddress}
                      style={{
                        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #15803d 0%, #14532d 100%)';
                        e.target.style.transform = 'translateY(-2px)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                  <div className="address-summary-info" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)', padding: '1rem', borderRadius: '12px', border: '2px solid #f0f0f0' }}>
                    <p style={{ margin: '0.375rem 0', color: '#1e293b', fontSize: '0.9rem', fontWeight: '700' }}>
                      <strong>{formData.street}</strong>
                    </p>
                    <p style={{ margin: '0.375rem 0', color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                      {formData.city}, {formData.state} - {formData.pincode}
                    </p>
                    <p style={{ margin: '0.375rem 0', color: '#6b7280', fontSize: '0.9rem', fontWeight: '500' }}>
                      📱 {formData.phone}
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Method Section */}
              <div className="payment-method-summary">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: '#333', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    💳 Payment Method
                  </h4>
                </div>
                <div className="payment-summary-info" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)', padding: '1rem', borderRadius: '12px', border: '2px solid #f0f0f0' }}>
                  {formData.paymentMethod === 'COD' ? (
                    <div className="payment-method-display" style={{ background: 'linear-gradient(135deg, #81c784 0%, #a5d6a7 100%)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', color: 'white', fontWeight: '600', boxShadow: '0 4px 15px rgba(129, 199, 132, 0.2)' }}>
                      <span className="payment-icon" style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(255, 255, 255, 0.3))' }}>💵</span>
                      <span>Cash on Delivery</span>
                    </div>
                  ) : formData.paymentMethod === 'QR Code' ? (
                    <div className="payment-method-display" style={{ background: 'linear-gradient(135deg, #81c784 0%, #a5d6a7 100%)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', color: 'white', fontWeight: '600', boxShadow: '0 4px 15px rgba(129, 199, 132, 0.2)' }}>
                      <span className="payment-icon" style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(255, 255, 255, 0.3))' }}>📷</span>
                      <span>QR Code Payment</span>
                    </div>
                  ) : formData.paymentMethod === 'UPI' ? (
                    <div className="payment-method-display" style={{ background: 'linear-gradient(135deg, #81c784 0%, #a5d6a7 100%)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', color: 'white', fontWeight: '600', boxShadow: '0 4px 15px rgba(129, 199, 132, 0.2)' }}>
                      <span className="payment-icon" style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(255, 255, 255, 0.3))' }}>📱</span>
                      <span>UPI Payment</span>
                    </div>
                  ) : (
                    <div className="payment-method-display" style={{ background: 'linear-gradient(135deg, #81c784 0%, #a5d6a7 100%)', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem', color: 'white', fontWeight: '600', boxShadow: '0 4px 15px rgba(129, 199, 132, 0.2)' }}>
                      <span className="payment-icon" style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 2px 4px rgba(255, 255, 255, 0.3))' }}>💳</span>
                      <span>{formData.paymentMethod}</span>
                    </div>
                  )}
                </div>
              </div>

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

              {/* Price Summary Section */}
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
                  <span>Delivery charges as per Confirmation </span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <div className="order-summary-actions">
                <button
                  type="submit"
                  className="btn-place-order-summary"
                  disabled={orderLoading}
                  onClick={handleSubmit}
                >
                  {orderLoading ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkout;

