// Base URL configuration
export const BASE_URL = process.env.REACT_APP_BASE_URL || 'https://bangkokmart.in';

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  if (imagePath.startsWith('http')) return imagePath;
  // Ensure imagePath starts with /
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${BASE_URL}${path}`;
};
