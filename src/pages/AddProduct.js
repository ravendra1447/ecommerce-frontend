import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { getImageUrl } from '../utils/config';
import './AddProduct.css';

const AddProduct = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // Product ID from URL if editing
  const { user } = useContext(AuthContext);
  const isSupplier = user?.role === 'supplier';
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);
  const [masterAttributes, setMasterAttributes] = useState([]); // Master attributes list
  const [selectedAttributes, setSelectedAttributes] = useState([]); // Selected attribute IDs
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    category: 'Fashion',
    subcategory: '',
    stock: '',
    images: [],
    hasVariants: false,
    variants: [], // [{ size: 'L', colorName: 'Red', colorCode: '#FF0000', price: 599, stock: 10 }]
    badge: '',
    brand: '',
    tags: '',
    isFeatured: false,
    sale_min_qty: 1,
    stock_maintane_type: 'Simple',
    catalog_id: ''
  });
  
  const [rangePrices, setRangePrices] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  
  // Simple variant management - direct add
  const addVariant = () => {
    setProductForm({
      ...productForm,
      variants: [...productForm.variants, {
        size: '',
        colorName: '',
        colorCode: '',
        price: productForm.price || '',
        stock: ''
      }]
    });
  };

  // Update variant
  const updateVariant = (index, field, value) => {
    const newVariants = [...productForm.variants];
    newVariants[index][field] = value;
    setProductForm({ ...productForm, variants: newVariants });
  };

  // Remove variant
  const removeVariant = (index) => {
    const newVariants = productForm.variants.filter((_, i) => i !== index);
    setProductForm({ ...productForm, variants: newVariants });
  };
  
  // Range Price management
  const addRangePrice = () => {
    setRangePrices([...rangePrices, {
      min_qty: '',
      price: '',
      status: 'active'
    }]);
  };
  
  const updateRangePrice = (index, field, value) => {
    const newRangePrices = [...rangePrices];
    newRangePrices[index][field] = value;
    setRangePrices(newRangePrices);
  };
  
  const removeRangePrice = (index) => {
    const newRangePrices = rangePrices.filter((_, i) => i !== index);
    setRangePrices(newRangePrices);
  };

  const [existingImages, setExistingImages] = useState([]);

  // Fetch master attributes on component mount
  useEffect(() => {
    const fetchMasterAttributes = async () => {
      try {
        const response = await api.get('/products/attributes/master');
        setMasterAttributes(response.data || []);
      } catch (error) {
        console.error('Error fetching master attributes:', error);
        // Don't show error toast, just log it
      }
    };
    fetchMasterAttributes();
  }, []);

  // Fetch catalogs on component mount
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        // Use /active endpoint for public access (no auth required)
        const response = await api.get('/catalog/active');
        setCatalogs(response.data || []);
      } catch (error) {
        console.error('Error fetching catalogs:', error);
        // Don't show error toast, just log it
      }
    };
    fetchCatalogs();
  }, []);
 
  // Fetch product data if editing
  useEffect(() => {
    const fetchProductData = async () => {
      // Check if product ID is in URL or location state
      const productId = id || location.state?.productId;
      const productData = location.state?.product;
      
      if (productId || productData) {
        setIsEditing(true);
        setFetchingProduct(true);
        
        try {
          // If product data is passed via state, use it; otherwise fetch
          let product = productData;
          if (!product && productId) {
            const response = await api.get(`/products/${productId}`);
            product = response.data;
          }
          
          if (product) {
            // Fetch full product details including sizes and colors
            const fullProduct = product.id || product._id ? 
              (await api.get(`/products/${product.id || product._id}`)).data : product;
            
            // Get variants from backend
            let variants = [];
            if (fullProduct.variants && Array.isArray(fullProduct.variants) && fullProduct.variants.length > 0) {
              // If variants already exist, use them
              variants = fullProduct.variants.map(v => ({
                size: v.size || '',
                colorName: v.colorName || '',
                colorCode: v.colorCode || '',
                price: v.price !== null && v.price !== undefined ? String(v.price) : '',
                stock: v.stock !== null && v.stock !== undefined ? String(v.stock) : ''
              }));
              console.log('✅ Loaded variants from backend:', variants);
            } else {
              console.log('⚠️ No variants found in product data');
              variants = [];
            }
            
            setProductForm({
              name: fullProduct.name || '',
              description: fullProduct.description || '',
              price: fullProduct.price || '',
              originalPrice: fullProduct.originalPrice || fullProduct.original_price || '',
              category: fullProduct.category || 'Fashion',
              catalog_id: fullProduct.catalog_id || fullProduct.catalogId || '',
              subcategory: fullProduct.subcategory || '',
              stock: fullProduct.stock || '',
              images: [], // Existing images are shown separately
              hasVariants: variants.length > 0,
              variants: variants,
              badge: fullProduct.badge || '',
              brand: fullProduct.brand || '',
              tags: fullProduct.tags ? (Array.isArray(fullProduct.tags) ? fullProduct.tags.join(', ') : fullProduct.tags) : '',
              isFeatured: fullProduct.isFeatured || fullProduct.is_featured || false,
              sale_min_qty: fullProduct.sale_min_qty || 1,
              stock_maintane_type: fullProduct.stock_maintane_type || 'Simple'
            });
            
            // Load range prices if available
            if (fullProduct.rangePrices && Array.isArray(fullProduct.rangePrices)) {
              setRangePrices(fullProduct.rangePrices);
            } else {
              // Try to fetch range prices separately if not included
              try {
                const rangeResponse = await api.get(`/products/${fullProduct.id || fullProduct._id}/range-prices`);
                if (rangeResponse.data && Array.isArray(rangeResponse.data)) {
                  setRangePrices(rangeResponse.data);
                }
              } catch (error) {
                console.log('No range prices found or error loading them:', error.message);
                setRangePrices([]);
              }
            }
            
            console.log('📦 Product form set. Variants count:', variants.length);
            
            // Store existing images for display
            if (fullProduct.images && fullProduct.images.length > 0) {
              setExistingImages(fullProduct.images);
            }
            
            // Load selected attributes from productAttributes
            if (fullProduct.productAttributes && fullProduct.productAttributes.length > 0) {
              const attrIds = fullProduct.productAttributes.map(attr => attr.attributes_id);
              setSelectedAttributes(attrIds);
            }
          }
        } catch (error) {
          console.error('Error fetching product:', error);
          toast.error('Failed to load product data');
          navigate(isSupplier ? '/supplier/dashboard' : '/admin?tab=products');
        } finally {
          setFetchingProduct(false);
        }
      }
    };
    
    fetchProductData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, location.state]);
  
  // Handle attribute checkbox change
  const handleAttributeChange = (attributeId) => {
    setSelectedAttributes(prev => {
      if (prev.includes(attributeId)) {
        return prev.filter(id => id !== attributeId);
      } else {
        return [...prev, attributeId];
      }
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setProductForm({ ...productForm, images: files });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData();
    
    Object.keys(productForm).forEach(key => {
      if (key === 'images') {
        productForm.images.forEach((file) => {
          formData.append('images', file);
        });
      } else if (key === 'variants') {
        formData.append('variants', JSON.stringify(productForm.variants));
      } else if (key === 'hasVariants') {
        // Skip this boolean flag, it's handled separately
      } else {
        formData.append(key, productForm[key]);
      }
    });
    
    formData.append('badge', productForm.badge || '');
    formData.append('brand', productForm.brand || '');
    formData.append('tags', productForm.tags || '');
    formData.append('isFeatured', productForm.isFeatured ? 'true' : 'false');
    formData.append('sale_min_qty', productForm.sale_min_qty || 1);
    formData.append('stock_maintane_type', productForm.stock_maintane_type || 'Simple');
    
    // Add selected attributes as JSON array of IDs
    if (selectedAttributes.length > 0) {
      formData.append('attributes', JSON.stringify(selectedAttributes));
    }
    
    // Add range prices
    if (rangePrices.length > 0) {
      formData.append('rangePrices', JSON.stringify(rangePrices));
      console.log('💰 Sending range prices:', rangePrices);
    } else {
      console.log('⚠️ No range prices to send');
    }

    try {
      const productId = id || location.state?.productId;
      
      console.log('📦 Submitting product form:', {
        isEditing: !!productId,
        productId: productId,
        userRole: user?.role,
        isSupplier: isSupplier,
        productName: productForm.name,
        rangePricesCount: rangePrices.length
      });
      
      let response;
      if (productId) {
        // Update existing product
        response = await api.put(`/products/${productId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('✅ Product updated successfully:', response.data);
        toast.success('Product updated successfully!');
      } else {
        // Create new product
        response = await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('✅ Product created successfully:', response.data);
        toast.success('Product created successfully!');
      }
      
      // Navigate based on user role
      if (isSupplier) {
        navigate('/supplier/dashboard');
      } else {
        navigate('/admin?tab=products');
      }
    } catch (error) {
      console.error('❌ Product creation error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Failed to create product';
      toast.error(errorMessage);
      
      // Show additional error details if available
      if (error.response?.data?.yourRole) {
        toast.info(`Your role: ${error.response.data.yourRole}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Navigate based on user role
    if (isSupplier) {
      navigate('/supplier/dashboard');
    } else {
      navigate('/admin?tab=products');
    }
  };

  return (
    <div className="add-product-page">
      <div className="add-product-container">
        <div className="add-product-header">
          <h1>Add New Product</h1>
          <button onClick={handleCancel} className="btn-back">
            ← Back {isSupplier ? 'to Dashboard' : 'to Admin'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-product-form">
          <div className="form-section">
            <h2>Basic Information</h2>
            
            <div className="form-group">
              <label>Product Name <span className="required">*</span></label>
              <input
                type="text"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                required
                placeholder="Enter product name"
              />
            </div>

            <div className="form-group">
              <label>Description <span className="required">*</span></label>
              <textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                required
                rows="5"
                placeholder="Enter product description"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Price (₹) <span className="required">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  required
                  min="0"
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label>Original Price (₹) <span className="optional">(Optional)</span></label>
                <input
                  type="number"
                  step="0.01"
                  value={productForm.originalPrice}
                  onChange={(e) => setProductForm({ ...productForm, originalPrice: e.target.value })}
                  min="0"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category <span className="required">*</span></label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  required
                >
                  <option value="Fashion">Fashion</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Home">Home</option>
                  <option value="Beauty">Beauty</option>
                  <option value="Sports">Sports</option>
                  <option value="Books">Books</option>
                  <option value="Toys">Toys</option>
                  <option value="Others">Others</option>
                </select>
              </div>
              <div className="form-group">
                <label>Subcategory <span className="optional">(Optional)</span></label>
                <input
                  type="text"
                  value={productForm.subcategory}
                  onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })}
                  placeholder="e.g., T-Shirts, Mobile Phones"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Catalog <span className="optional">(Optional)</span></label>
              <select
                value={productForm.catalog_id}
                onChange={(e) => setProductForm({ ...productForm, catalog_id: e.target.value })}
              >
                <option value="">Select a catalog</option>
                {catalogs.map(catalog => (
                  <option key={catalog.id} value={catalog.id}>
                    {catalog.catalog_name} ({catalog.catalog_code})
                  </option>
                ))}
              </select>
              {productForm.catalog_id && (
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Product will be linked to selected catalog and notification map will be created automatically.
                </p>
              )}
            </div>

            <div className="form-group">
              <label>Stock <span className="required">*</span></label>
              <input
                type="number"
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                required
                min="0"
                placeholder="0"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Minimum Sale Quantity <span className="optional">(Optional)</span></label>
                <input
                  type="number"
                  value={productForm.sale_min_qty}
                  onChange={(e) => setProductForm({ ...productForm, sale_min_qty: e.target.value })}
                  min="1"
                  placeholder="1"
                />
              </div>
              <div className="form-group">
                <label>Stock Maintenance Type <span className="optional">(Optional)</span></label>
                <select
                  value={productForm.stock_maintane_type}
                  onChange={(e) => setProductForm({ ...productForm, stock_maintane_type: e.target.value })}
                >
                  <option value="Simple">Simple</option>
                  <option value="Unlimited">Unlimited</option>
                  <option value="Size_Color_Wise">Size & Color Wise</option>
                  <option value="">None</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Range Pricing <span className="optional">(Optional)</span></h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              Set different prices based on minimum quantity thresholds. Upper limit is automatically the next slab's min qty - 1.
            </p>
            <div style={{ fontSize: '13px', color: '#f57c00', marginBottom: '15px', padding: '10px', background: '#fff3e0', borderRadius: '5px' }}>
              <strong>💡 How it works:</strong> If you set min_qty=10 with price=₹90, it applies to qty 10 until the next slab starts.
            </div>
            
            {rangePrices.map((rangePrice, index) => (
              <div key={index} className="variant-item" style={{ marginBottom: '15px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                  <div className="form-group">
                    <label>Min Quantity</label>
                    <input
                      type="number"
                      value={rangePrice.min_qty}
                      onChange={(e) => updateRangePrice(index, 'min_qty', e.target.value)}
                      min="1"
                      placeholder="1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={rangePrice.price}
                      onChange={(e) => updateRangePrice(index, 'price', e.target.value)}
                      min="0"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={rangePrice.status}
                      onChange={(e) => updateRangePrice(index, 'status', e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRangePrice(index)}
                    className="btn-remove"
                    style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
                {index < rangePrices.length - 1 && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    <strong>Applied to:</strong> Qty {rangePrice.min_qty} to {rangePrices[index + 1].min_qty ? rangePrices[index + 1].min_qty - 1 : '∞'}
                  </div>
                )}
                {index === rangePrices.length - 1 && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                    <strong>Applied to:</strong> Qty {rangePrice.min_qty} and above
                  </div>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={addRangePrice}
              className="btn-add-variant"
              style={{ marginTop: '10px', padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              + Add Range Price
            </button>
          </div>

          <div className="form-section">
            <h2>Product Badge & Brand</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label>Badge <span className="optional">(Optional)</span></label>
                <select
                  value={productForm.badge}
                  onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                >
                  <option value="">None</option>
                  <option value="New">New</option>
                  <option value="Sale">Sale</option>
                  <option value="Popular">Popular</option>
                  <option value="Best Seller">Best Seller</option>
                  <option value="Hot">Hot</option>
                </select>
              </div>
              <div className="form-group">
                <label>Brand <span className="optional">(Optional)</span></label>
                <input
                  type="text"
                  value={productForm.brand}
                  onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                  placeholder="e.g., Nike, Samsung"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Tags <span className="optional">(Optional, comma separated)</span></label>
              <input
                type="text"
                value={productForm.tags}
                onChange={(e) => setProductForm({ ...productForm, tags: e.target.value })}
                placeholder="e.g., trendy, comfortable, premium"
              />
            </div>

            <div className="form-group">
              <label className="size-checkbox-label">
                <input
                  type="checkbox"
                  checked={productForm.isFeatured}
                  onChange={(e) => setProductForm({ ...productForm, isFeatured: e.target.checked })}
                />
                Feature this product on homepage
              </label>
            </div>
          </div>

          <div className="form-section">
            <h2>Product Attributes</h2>
            
            <div className="form-group">
              <label>Select Attributes <span className="optional">(Optional)</span></label>
              {masterAttributes.length > 0 ? (
                <div className="attributes-checkbox-container" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '10px',
                  marginTop: '10px',
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  background: '#f9f9f9'
                }}>
                  {masterAttributes.map((attr) => (
                    <label 
                      key={attr.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '4px',
                        background: selectedAttributes.includes(attr.id) ? '#e3f2fd' : 'white',
                        border: selectedAttributes.includes(attr.id) ? '2px solid #2196F3' : '1px solid #ddd',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAttributes.includes(attr.id)}
                        onChange={() => handleAttributeChange(attr.id)}
                        style={{ 
                          width: '18px', 
                          height: '18px', 
                          cursor: 'pointer' 
                        }}
                      />
                      <span style={{ 
                        fontWeight: selectedAttributes.includes(attr.id) ? '600' : '400',
                        color: selectedAttributes.includes(attr.id) ? '#1976D2' : '#333'
                      }}>
                        {attr.attributes_name}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#999', fontStyle: 'italic', marginTop: '10px' }}>
                  No attributes available. Please add attributes in master table first.
                </p>
              )}
              {selectedAttributes.length > 0 && (
                <p style={{ 
                  marginTop: '10px', 
                  fontSize: '12px', 
                  color: '#666',
                  padding: '8px',
                  background: '#e8f5e9',
                  borderRadius: '4px'
                }}>
                  Selected: {selectedAttributes.length} attribute(s) - IDs: [{selectedAttributes.join(', ')}]
                </p>
              )}
            </div>
          </div>

          <div className="form-section">
            <h2>Size + Color Variants</h2>
            
            <div className="form-group">
              <label className="size-checkbox-label">
                <input
                  type="checkbox"
                  checked={productForm.hasVariants}
                  onChange={(e) => {
                    const hasVariants = e.target.checked;
                    setProductForm({
                      ...productForm,
                      hasVariants,
                      variants: hasVariants && productForm.variants.length === 0 ? [] : productForm.variants
                    });
                  }}
                />
                Enable Size + Color Variants (e.g., L+Red, M+Blue)
              </label>
              
              {productForm.hasVariants && (
                <div className="size-management-container" style={{ marginTop: '15px' }}>
                  <div className="size-management-header" style={{ marginBottom: '15px' }}>
                    <strong>Size + Color Variants:</strong>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="btn-add-size"
                    >
                      + Add Variant
                    </button>
                  </div>
                  
                  {productForm.variants.length > 0 ? (
                    <div style={{ marginTop: '10px' }}>
                      {/* Header Row */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '100px 120px 200px 120px 100px 40px',
                        gap: '10px',
                        marginBottom: '10px',
                        padding: '8px',
                        background: '#f8f9fa',
                        borderRadius: '5px',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#666'
                      }}>
                        <div>Size</div>
                        <div>Color Name</div>
                        <div>Color Code</div>
                        <div>Price</div>
                        <div>Stock</div>
                        <div></div>
                      </div>
                      
                      {/* Variant Rows */}
                      {productForm.variants.map((variant, index) => (
                        <div 
                          key={index} 
                          style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '100px 120px 200px 120px 100px 40px',
                            gap: '10px',
                            marginBottom: '10px',
                            alignItems: 'center'
                          }}
                        >
                          <input
                            type="text"
                            placeholder="L, M, XL"
                            value={variant.size}
                            onChange={(e) => updateVariant(index, 'size', e.target.value)}
                            required
                            className="size-item-input"
                            style={{ width: '100%' }}
                          />
                          <input
                            type="text"
                            placeholder="Red, Blue"
                            value={variant.colorName}
                            onChange={(e) => updateVariant(index, 'colorName', e.target.value)}
                            required
                            className="size-item-input"
                            style={{ width: '100%' }}
                          />
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', width: '100%' }}>
                            <input
                              type="color"
                              value={variant.colorCode && variant.colorCode.startsWith('#') ? variant.colorCode : '#FF0000'}
                              onChange={(e) => {
                                // If multiple colors (comma-separated), update first one
                                const currentCodes = variant.colorCode ? variant.colorCode.split(',') : [];
                                if (currentCodes.length > 1) {
                                  currentCodes[0] = e.target.value;
                                  updateVariant(index, 'colorCode', currentCodes.join(','));
                                } else {
                                  updateVariant(index, 'colorCode', e.target.value);
                                }
                              }}
                              style={{
                                width: '40px',
                                height: '35px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                flexShrink: 0
                              }}
                              title="Select Color"
                            />
                            <input
                              type="text"
                              placeholder="#FF0000 or #FF0000,#0000FF"
                              value={variant.colorCode}
                              onChange={(e) => updateVariant(index, 'colorCode', e.target.value)}
                              className="size-item-input"
                              style={{ flex: 1, width: '100%' }}
                            />
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="599"
                            value={variant.price}
                            onChange={(e) => updateVariant(index, 'price', e.target.value)}
                            required
                            className="size-item-input"
                            style={{ width: '100%' }}
                          />
                          <input
                            type="number"
                            placeholder="10"
                            value={variant.stock}
                            onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                            required
                            min="0"
                            className="size-item-input"
                            style={{ width: '100%' }}
                          />
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="btn-remove-size"
                            title="Remove Variant"
                            style={{ 
                              width: '32px', 
                              height: '32px', 
                              padding: '0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="size-empty-message" style={{ marginTop: '10px', textAlign: 'center', padding: '20px', color: '#999' }}>
                      Click "Add Variant" to add size + color combinations with prices and stock
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h2>Product Images</h2>
            
            {/* Show existing images if editing */}
            {isEditing && existingImages.length > 0 && (
              <div className="form-group">
                <label>Current Images:</label>
                <div className="existing-images" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                  {existingImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', border: '1px solid #ddd', borderRadius: '5px', padding: '5px' }}>
                      <img 
                        src={getImageUrl(img)} 
                        alt={`Product ${idx + 1}`}
                        style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '5px' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/100x100?text=Image';
                        }}
                      />
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                  Current images will be kept. Upload new images to add more.
                </p>
              </div>
            )}
            
            <div className="form-group">
              <label>Upload Images {!isEditing && <span className="required">*</span>}</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                required={!isEditing}
                className="file-input"
              />
              <p className="file-hint">
                You can select multiple images (up to 5). First image will be the main product image.
                {isEditing && ' Leave empty to keep existing images.'}
              </p>
              {productForm.images.length > 0 && (
                <div className="selected-images">
                  <p>Selected: {productForm.images.length} new image(s)</p>
                </div>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-cancel"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Product' : 'Create Product')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProduct;

