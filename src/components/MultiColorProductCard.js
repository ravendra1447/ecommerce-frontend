import React from 'react';
import ProductCard from './ProductCard';
import './MultiColorProductCard.css';

const MultiColorProductCard = ({ product, showWishlist = true, showThumbnails = true }) => {
  if (!product) return null;

  console.log('🔍 MultiColorProductCard - Product:', product);
  console.log('🔍 Product variants:', product.variants);
  console.log('🔍 Product colors:', product.colors);

  // Function to extract unique colors from product
  const getColorVariants = () => {
    // Check if product has variants with colors
    if (product.variants && product.variants.length > 0) {
      console.log('🎨 Found variants with colors');
      const colorMap = new Map();
      
      product.variants.forEach(variant => {
        console.log('🔍 Processing variant:', variant);
        if (variant.colorName && !colorMap.has(variant.colorName)) {
          colorMap.set(variant.colorName, {
            colorName: variant.colorName,
            colorCode: variant.colorCode || null,
            imageUrl: variant.imageUrl || null,
            price: variant.price || product.price,
            stock: variant.stock || product.stock
          });
        }
      });
      
      const result = Array.from(colorMap.values());
      console.log('🎨 Color variants from variants:', result);
      return result;
    }
    
    // Check if product has colors array
    if (product.colors && product.colors.length > 0) {
      console.log('🎨 Found colors array');
      const result = product.colors.map(color => ({
        colorName: color.colorName || color,
        colorCode: color.colorCode || null,
        imageUrl: color.imageUrl || null,
        price: color.price || product.price,
        stock: color.stock || product.stock
      }));
      console.log('🎨 Color variants from colors array:', result);
      return result;
    }
    
    // If no color variants, return single variant with original product
    console.log('🎨 No color variants found, returning single');
    return [{
      colorName: null,
      colorCode: null,
      imageUrl: null,
      price: product.price,
      stock: product.stock
    }];
  };

  const colorVariants = getColorVariants();
  console.log('🎨 Final color variants count:', colorVariants.length);

  // If only one color variant (or no colors), show regular product card
  if (colorVariants.length <= 1) {
    console.log('🎨 Showing single card');
    return <ProductCard product={product} showWishlist={showWishlist} />;
  }

  console.log('🎨 Showing multiple cards for', colorVariants.length, 'colors');

  // Create separate product cards for each color variant
  const createColorVariantProduct = (colorVariant) => {
    const modifiedProduct = { ...product };
    
    // Update name to include color if color exists
    if (colorVariant.colorName) {
      modifiedProduct.name = `${product.name} (${colorVariant.colorName})`;
    }
    
    // Update price if color has specific price
    if (colorVariant.price) {
      modifiedProduct.price = colorVariant.price;
    }
    
    // Update stock if color has specific stock, but only if not unlimited stock type
    if (colorVariant.stock !== undefined && colorVariant.stock !== null && product.stock_maintane_type !== 'Unlimited') {
      modifiedProduct.stock = colorVariant.stock;
    }
    
    // Update images to prioritize color-specific image
    if (colorVariant.imageUrl) {
      modifiedProduct.images = [colorVariant.imageUrl, ...(product.images || []).filter(img => img !== colorVariant.imageUrl)];
    }
    
    // Add color info for reference
    modifiedProduct.selectedColor = colorVariant.colorName;
    modifiedProduct.colorCode = colorVariant.colorCode;
    
    console.log('🎨 Created variant product:', modifiedProduct);
    return modifiedProduct;
  };

  return (
    <div className="multi-color-product-cards">
      {colorVariants.map((colorVariant, index) => {
        const variantProduct = createColorVariantProduct(colorVariant);
        console.log(`🎨 Rendering card ${index + 1} for color:`, colorVariant.colorName);
        
        return (
          <div key={`${product.id || product._id}-color-${index}`} className="color-variant-card">
            <ProductCard 
              product={variantProduct} 
              showWishlist={showWishlist}
              showThumbnails={showThumbnails}
            />
            {colorVariant.colorName && (
              <div className="color-indicator">
                {colorVariant.colorCode ? (
                  <span 
                    className="color-dot" 
                    style={{ backgroundColor: colorVariant.colorCode }}
                    title={colorVariant.colorName}
                  />
                ) : (
                  <span className="color-label" title={colorVariant.colorName}>
                    {colorVariant.colorName}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MultiColorProductCard;
