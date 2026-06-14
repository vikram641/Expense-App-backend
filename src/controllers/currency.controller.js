const { sendSuccess } = require('../utils/response');

// Static rates (fallback — replace with Open Exchange Rates API if you have a key)
const STATIC_RATES = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
  JPY: 1.79,
  AED: 0.044,
  SGD: 0.016,
  CAD: 0.016,
  AUD: 0.018
};

exports.getRates = async (req, res) => {
  const base  = (req.query.base || 'INR').toUpperCase();
  const baseRate = STATIC_RATES[base] || 1;

  // Convert all rates relative to requested base
  const rates = {};
  Object.entries(STATIC_RATES).forEach(([currency, rate]) => {
    rates[currency] = parseFloat((rate / baseRate).toFixed(6));
  });

  sendSuccess(res, {
    base,
    timestamp: new Date().toISOString(),
    rates
  });
};

exports.getSupportedCurrencies = async (req, res) => {
  sendSuccess(res, {
    currencies: Object.keys(STATIC_RATES)
  });
};
