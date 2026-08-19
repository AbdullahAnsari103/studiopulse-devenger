import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Configured Axios client for making API requests to the backend.
 * Includes automatic retry interceptor for transient network/connection errors
 * during backend server startup.
 *
 * NOTE: The default timeout is 60s for most endpoints. Long-running operations
 * like video publishing should override this with a longer timeout (see useUpload).
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 60000, // 60s default — publish endpoint overrides with longer timeout
});

// Automatic retry interceptor for transient network errors (ERR_CONNECTION_REFUSED during server restart)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Check if network error (ERR_CONNECTION_REFUSED) and retry count < 3
    if (
      config &&
      (!error.response || error.code === "ERR_NETWORK" || error.code === "ECONNABORTED" || error.message.includes("Network Error")) &&
      (!config._retryCount || config._retryCount < 3)
    ) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delay = config._retryCount * 500; // 500ms, 1000ms, 1500ms
      await new Promise((resolve) => setTimeout(resolve, delay));
      return apiClient(config);
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
