import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer-meesho">
      <div className="footer-container">
        {/* Top Section - Quick Links */}
        <div className="footer-top">
          <div className="footer-section">
            <h4>Shop Non-Stop on Bangkok Mart</h4>
            <p>Trusted by more than 1 Crore Indians</p>
            <p>Cash on Delivery | Free Delivery</p>
          </div>
          
          <div className="footer-section">
            <h4>Careers</h4>
            <Link to="/register/supplier">Become a Supplier</Link>
            <Link to="/register/reseller">Become a Reseller</Link>
            <Link to="/register/delivery">Become a Delivery Partner</Link>
          </div>
          
          <div className="footer-section">
            <h4>About Us</h4>
            <Link to="/about">About Bangkok Mart</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/blog">Blog</Link>
          </div>
          
          <div className="footer-section">
            <h4>Help & Support</h4>
            <Link to="/help">FAQs</Link>
            <Link to="/help">Report a Product</Link>
            <Link to="/help">Track Your Order</Link>
            <Link to="/help">Return & Refund</Link>
          </div>
          
          <div className="footer-section">
            <h4>Legal</h4>
            <Link to="/legal">Terms & Conditions</Link>
            <Link to="/legal">Privacy Policy</Link>
            <Link to="/legal">Security</Link>
            <Link to="/legal">Grievance Officer</Link>
          </div>
        </div>

        {/* Middle Section - Contact & Address */}
        <div className="footer-middle">
          <div className="footer-contact">
            <h4>Contact Us</h4>
            <div className="contact-info">
              <p>
                <strong>Email:</strong> support@bangkokmart.com
              </p>
              <p>
                <strong>Phone:</strong> +91 1800-123-4567
              </p>
              <p>
                <strong>WhatsApp:</strong> +91 98765 43210
              </p>
            </div>
          </div>
          
          <div className="footer-address">
            <h4>Registered Office Address</h4>
            <p>
              Bangkok Mart E-Commerce Private Limited,<br />
              Building No. 123, Sector 45,<br />
              Noida, Uttar Pradesh - 201301,<br />
              India
            </p>
          </div>
          
          <div className="footer-social">
            <h4>Follow Us</h4>
            <div className="social-links">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link">
                <span>📘</span> Facebook
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link">
                <span>🐦</span> Twitter
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link">
                <span>📷</span> Instagram
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-link">
                <span>▶️</span> YouTube
              </a>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="footer-payments">
          <h4>We Accept</h4>
          <div className="payment-methods">
            <div className="payment-icons-container">
              <div className="payment-icon">💳</div>
              <div className="payment-icon">🏦</div>
              <div className="payment-icon">💵</div>
            </div>
            <div className="payment-text">
              Credit/Debit Cards, UPI, COD
            </div>
          </div>
        </div>

        {/* Bottom Section - Copyright */}
        <div className="footer-bottom">
          <div className="footer-copyright">
            <p>&copy; 2025 Bangkok Mart E-Commerce Private Limited. All rights reserved.</p>
            <p className="footer-disclaimer">
              All product names, trademarks and registered trademarks are property of their respective owners.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

