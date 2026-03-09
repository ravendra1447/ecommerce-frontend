import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import './ResellerDashboard.css';

const ResellerDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/partners/reseller/dashboard');
      setDashboardData(response.data);
      if (response.data.message) {
        toast.info(response.data.message);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message || 
                           'Failed to load dashboard';
      toast.error(errorMessage);
      // Set empty data to show error message
      setDashboardData({
        reseller: null,
        referrals: [],
        stats: { totalReferrals: 0, totalEarnings: 0, commissionRate: 5.00 }
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (dashboardData?.reseller?.referral_code) {
      navigator.clipboard.writeText(dashboardData.reseller.referral_code);
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!dashboardData) {
    return <div className="error">Loading dashboard data...</div>;
  }

  const { reseller, referrals, stats } = dashboardData;

  // Show message if reseller profile not found
  if (!reseller) {
    return (
      <div className="reseller-dashboard">
        <div className="dashboard-container">
          <div className="error-message">
            <h2>Reseller Profile Not Found</h2>
            <p>Your reseller profile is being set up. Please contact support if this persists.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reseller-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Reseller Dashboard</h1>
        </div>

        {/* Referral Code Section */}
        <div className="referral-section">
          <h2>Your Referral Code</h2>
          <div className="referral-code-box">
            <code className="referral-code">{reseller.referral_code}</code>
            <button onClick={copyReferralCode} className="btn-copy">
              {copied ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>
          <p className="referral-info">
            Share this code with your friends. When they sign up and make a purchase, you'll earn a commission!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Referrals</h3>
            <p className="stat-value">{stats.totalReferrals}</p>
          </div>
          <div className="stat-card">
            <h3>Total Earnings</h3>
            <p className="stat-value">₹{stats.totalEarnings.toFixed(2)}</p>
          </div>
          <div className="stat-card">
            <h3>Commission Rate</h3>
            <p className="stat-value">{stats.commissionRate}%</p>
          </div>
        </div>

        {/* Referrals List */}
        <div className="referrals-section">
          <h2>Referral History</h2>
          {referrals.length === 0 ? (
            <div className="empty-state">
              <p>No referrals yet. Start sharing your referral code to earn commissions!</p>
            </div>
          ) : (
            <div className="referrals-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Referred User</th>
                    <th>Order Amount</th>
                    <th>Commission</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr key={referral.id}>
                      <td>{new Date(referral.created_at).toLocaleDateString()}</td>
                      <td>
                        {referral.referred_user_name || 'N/A'}
                        <br />
                        <small>{referral.referred_user_email}</small>
                      </td>
                      <td>₹{referral.order_id ? (referral.total_amount || 0).toFixed(2) : 'N/A'}</td>
                      <td>₹{parseFloat(referral.commission_amount || 0).toFixed(2)}</td>
                      <td>
                        <span className={`status-badge status-${referral.status}`}>
                          {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResellerDashboard;

