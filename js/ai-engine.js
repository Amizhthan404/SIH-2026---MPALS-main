/**
 * MPALS Platform — UI Formatting & Presentation Helpers
 * Notice: All statistical anomaly scoring and risk assessment is computed
 * authoritatively on the backend server (AIEngineService) and returned via REST APIs.
 */

const AIEngine = (() => {
  function formatAmount(n) {
    const num = Number(n) || 0;
    if (num >= 1e7) return '₹' + (num / 1e7).toFixed(2) + ' Cr';
    if (num >= 1e5) return '₹' + (num / 1e5).toFixed(2) + ' Lakh';
    return '₹' + num.toLocaleString('en-IN');
  }

  function formatAmountShort(n) {
    const num = Number(n) || 0;
    if (num >= 1e7) return (num / 1e7).toFixed(1) + ' Cr';
    if (num >= 1e5) return (num / 1e5).toFixed(1) + ' L';
    return num.toLocaleString('en-IN');
  }

  return {
    formatAmount,
    formatAmountShort,

    getRiskColor(level) {
      const map = { critical: '#ef4444', high: '#f43f5e', medium: '#f97316', low: '#22c55e' };
      return map[level?.toLowerCase()] || '#94a3b8';
    },

    getRiskBadgeClass(level) {
      const map = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };
      return map[level?.toLowerCase()] || 'badge-neutral';
    }
  };
})();
