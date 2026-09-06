/**
 * MPALS Platform — API Client & Data Service Layer
 * Connects the vanilla JS frontend with the Express REST API (/api/mps, /api/works, /api/alerts, /api/states, /api/data)
 */

const ApiClient = (() => {
  // Determine API base URL
  const BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL)
    ? window.API_BASE_URL
    : (window.location.port === '5000' || !window.location.port)
      ? ''
      : 'http://localhost:5000';

  const TOKEN_KEY = 'mpals_auth_token';
  const USER_KEY = 'mpals_auth_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setSession(token, user) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  function getCurrentUser() {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}/api${endpoint}`;
    const token = getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        let errMessage = `HTTP Error ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData && errData.error) errMessage = errData.error;
        } catch {
          // fallback
        }
        throw new Error(errMessage);
      }

      return await response.json();
    } catch (err) {
      console.warn(`[ApiClient] Request to ${url} failed:`, err.message);
      throw err;
    }
  }

  return {
    BASE_URL,
    getToken,
    getCurrentUser,
    setSession,

    /**
     * User Authentication
     */
    async login(email, password) {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.success && res.data.token) {
        setSession(res.data.token, res.data.user);
      }
      return res.data;
    },

    logout() {
      setSession(null, null);
    },

    async getMe() {
      const res = await request('/auth/me');
      return res.data;
    },

    async getUsers() {
      const res = await request('/auth/users');
      return res.data;
    },

    /**
     * Fetch complete dataset bundle (pre-scored server-side intelligence)
     */
    async fetchFullData() {
      const res = await request('/data');
      return res.data;
    },

    /**
     * Query MPs with optional filters
     */
    async getMPs(filters = {}) {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/mps${query ? '?' + query : ''}`);
      return res.data;
    },

    /**
     * Get specific MP details with related works and alerts
     */
    async getMPById(id) {
      const res = await request(`/mps/${encodeURIComponent(id)}`);
      return res.data;
    },

    /**
     * Get explainable risk breakdown for an MP
     */
    async getMPRiskExplanation(id) {
      const res = await request(`/mps/${encodeURIComponent(id)}/risk`);
      return res.data;
    },

    /**
     * Query Works with optional anomaly/state/status filters
     */
    async getWorks(filters = {}) {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/works${query ? '?' + query : ''}`);
      return res.data;
    },

    /**
     * Get Works statistical anomaly summary
     */
    async getWorksSummary() {
      const res = await request('/works/summary');
      return res.data;
    },

    /**
     * Get single work details including payments and asset verifications
     */
    async getWorkById(id) {
      const res = await request(`/works/${encodeURIComponent(id)}`);
      return res.data;
    },

    /**
     * Query Alerts with severity/type/state filters
     */
    async getAlerts(filters = {}) {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/alerts${query ? '?' + query : ''}`);
      return res.data;
    },

    /**
     * Get alerts breakdown by severity and resolution status
     */
    async getAlertsSummary() {
      const res = await request('/alerts/summary');
      return res.data;
    },

    /**
     * Update alert status (Open, Under Review, Resolved, False Positive)
     */
    async updateAlertStatus(id, status) {
      const res = await request(`/alerts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      return res.data;
    },

    /**
     * Get State-level aggregated metrics
     */
    async getStates() {
      const res = await request('/states');
      return res.data;
    },

    /**
     * Get State details
     */
    async getStateDetails(state) {
      const res = await request(`/states/${encodeURIComponent(state)}`);
      return res.data;
    },

    /**
     * Get Districts list
     */
    async getDistricts(state) {
      const query = state ? `?state=${encodeURIComponent(state)}` : '';
      const res = await request(`/districts${query}`);
      return res.data;
    },

    /**
     * Get Payments for a work
     */
    async getPayments(workId) {
      const query = workId ? `?work_id=${encodeURIComponent(workId)}` : '';
      const res = await request(`/payments${query}`);
      return res.data;
    },

    /**
     * Get Assets
     */
    async getAssets(filters = {}) {
      const query = new URLSearchParams(filters).toString();
      const res = await request(`/assets${query ? '?' + query : ''}`);
      return res.data;
    },

    /**
     * Get executive dashboard KPIs summary
     */
    async getSummary() {
      const res = await request('/summary');
      return res.data;
    },

    /**
     * API health check
     */
    async health() {
      return await request('/health');
    }
  };
})();

// Global reference placeholder
let MPLADS_DATA = null;
