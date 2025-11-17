import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = \`Bearer \${token}\`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
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
    const response = await this.client.get(\`/projects/\${id}\`);
    return response.data;
  }

  async createProject(data: any) {
    const response = await this.client.post('/projects', data);
    return response.data;
  }

  async updateProject(id: string, data: any) {
    const response = await this.client.put(\`/projects/\${id}\`, data);
    return response.data;
  }

  async deleteProject(id: string) {
    await this.client.delete(\`/projects/\${id}\`);
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
    const response = await this.client.get(\`/portfolios/\${id}\`);
    return response.data;
  }

  async createPortfolio(data: any) {
    const response = await this.client.post('/portfolios', data);
    return response.data;
  }

  async updatePortfolio(id: string, data: any) {
    const response = await this.client.put(\`/portfolios/\${id}\`, data);
    return response.data;
  }

  async deletePortfolio(id: string) {
    await this.client.delete(\`/portfolios/\${id}\`);
  }
}

export const apiClient = new ApiClient();
