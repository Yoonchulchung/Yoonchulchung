import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface RetryConfig {
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: AxiosError) => boolean;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private client: AxiosInstance;
  private retryConfig: RetryConfig = {
    retries: 3,
    retryDelay: 1000,
    retryCondition: (error) => {
      // Retry on network errors or 5xx server errors
      return !error.response || (error.response.status >= 500 && error.response.status < 600);
    },
  };

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response.data, // Return data.data directly
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        // Handle retry logic
        if (
          this.retryConfig.retryCondition &&
          this.retryConfig.retryCondition(error) &&
          originalRequest &&
          !originalRequest._retry &&
          (!originalRequest._retryCount || originalRequest._retryCount < (this.retryConfig.retries || 0))
        ) {
          originalRequest._retry = true;
          originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

          await this.delay(this.retryConfig.retryDelay || 1000);
          return this.client(originalRequest);
        }

        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }

        // Transform error to ApiError
        const apiError = this.transformError(error);
        return Promise.reject(apiError);
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private transformError(error: AxiosError): ApiError {
    if (error.response) {
      const data: any = error.response.data;
      return new ApiError(
        error.response.status,
        data?.errorCode || 'UNKNOWN_ERROR',
        data?.message || error.message,
        data?.details,
      );
    } else if (error.request) {
      return new ApiError(0, 'NETWORK_ERROR', 'Network error occurred');
    } else {
      return new ApiError(0, 'UNKNOWN_ERROR', error.message);
    }
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  async register(data: { email: string; password: string; username: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(data: { email: string; password: string }) {
    const response = await this.client.post('/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }

  async logout() {
    await this.client.post('/auth/logout');
    this.clearToken();
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async getProjects(published?: boolean) {
    const params = published !== undefined ? { published } : {};
    const response = await this.client.get('/projects', { params });
    return response.data;
  }

  async getProject(id: string) {
    const response = await this.client.get(`/projects/${id}`);
    return response.data;
  }

  async createProject(data: any) {
    const response = await this.client.post('/projects', data);
    return response.data;
  }

  async updateProject(id: string, data: any) {
    const response = await this.client.put(`/projects/${id}`, data);
    return response.data;
  }

  async deleteProject(id: string) {
    await this.client.delete(`/projects/${id}`);
  }

  async getPortfolios(published?: boolean) {
    const params = published !== undefined ? { published } : {};
    const response = await this.client.get('/portfolios', { params });
    return response.data;
  }

  async getPublishedPortfolio() {
    const response = await this.client.get('/portfolios/published');
    return response.data;
  }

  async getPortfolio(id: string) {
    const response = await this.client.get(`/portfolios/${id}`);
    return response.data;
  }

  async createPortfolio(data: any) {
    const response = await this.client.post('/portfolios', data);
    return response.data;
  }

  async updatePortfolio(id: string, data: any) {
    const response = await this.client.put(`/portfolios/${id}`, data);
    return response.data;
  }

  async deletePortfolio(id: string) {
    await this.client.delete(`/portfolios/${id}`);
  }

  // Generic HTTP methods for use by other API modules
  async get(url: string, config?: AxiosRequestConfig) {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put(url, data, config);
  }

  async patch(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.patch(url, data, config);
  }

  async delete(url: string, config?: AxiosRequestConfig) {
    return this.client.delete(url, config);
  }
}

export const apiClient = new ApiClient();
