// Currency and percentage display formatters for the dashboard

/**
 * Formats a raw numeric value to a localized USD string with suffixes (T, B, M).
 * @param {number} value - The numeric value.
 * @returns {string} The formatted currency string.
 */
export const formatUSD = (value) => {
  if (!value) return "$0.00";
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  } else if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  return `$${value.toLocaleString()}`;
};

/**
 * Formats a ratio value (e.g. 0.034) to a percentage representation (e.g. 3.40%).
 * @param {number} val - The ratio value.
 * @returns {string} The formatted percentage.
 */
export const formatPercent = (val) => {
  if (val === null || val === undefined) return "N/A";
  return `${(val * 100).toFixed(2)}%`;
};

/**
 * Formats large share numbers with suffix (B, M).
 * @param {number} value - The share count.
 * @returns {string} The formatted count.
 */
export const formatShares = (value) => {
  if (!value) return "0";
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  }
  return value.toLocaleString();
};
