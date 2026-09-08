const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

export const get = (endpoint) => apiCall(endpoint);
export const post = (endpoint, data) => apiCall(endpoint, { method: 'POST', body: JSON.stringify(data) });
export const put = (endpoint, data) => apiCall(endpoint, { method: 'PUT', body: JSON.stringify(data) });
