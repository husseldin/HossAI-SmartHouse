/**
 * API Client using Axios
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ApiResponse,
  PaginatedResponse,
  User,
  AuthResponse,
  Device,
  NetworkDevice,
  ScanJob,
  Alert,
  Vulnerability,
  AutomationRule,
  Integration,
  DeviceState,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // =================================================================
  // AUTHENTICATION
  // =================================================================

  async login(username: string, password: string): Promise<AuthResponse> {
    const { data } = await this.client.post<ApiResponse<AuthResponse>>('/api/auth/login', {
      username,
      password,
    });
    return data.data!;
  }

  async register(username: string, email: string, password: string): Promise<{ user: User }> {
    const { data } = await this.client.post<ApiResponse<{ user: User }>>('/api/auth/register', {
      username,
      email,
      password,
    });
    return data.data!;
  }

  async logout(): Promise<void> {
    await this.client.post('/api/auth/logout');
  }

  async verifyToken(): Promise<{ user: User }> {
    const { data } = await this.client.get<ApiResponse<{ user: User }>>('/api/auth/verify');
    return data.data!;
  }

  // =================================================================
  // DEVICES
  // =================================================================

  async getDevices(params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
    room?: string;
    search?: string;
  }): Promise<PaginatedResponse<Device>> {
    const { data } = await this.client.get<ApiResponse<PaginatedResponse<Device>>>('/api/devices', {
      params,
    });
    return data.data!;
  }

  async getDevice(id: string): Promise<Device> {
    const { data } = await this.client.get<ApiResponse<Device>>(`/api/devices/${id}`);
    return data.data!;
  }

  async createDevice(device: Partial<Device>): Promise<Device> {
    const { data } = await this.client.post<ApiResponse<Device>>('/api/devices', device);
    return data.data!;
  }

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
    const { data } = await this.client.patch<ApiResponse<Device>>(`/api/devices/${id}`, updates);
    return data.data!;
  }

  async deleteDevice(id: string): Promise<void> {
    await this.client.delete(`/api/devices/${id}`);
  }

  async controlDevice(id: string, capability: string, value: any): Promise<void> {
    await this.client.post(`/api/devices/${id}/control`, { capability, value });
  }

  async getDeviceStates(id: string, limit?: number): Promise<DeviceState[]> {
    const { data } = await this.client.get<ApiResponse<DeviceState[]>>(
      `/api/devices/${id}/states`,
      { params: { limit } }
    );
    return data.data!;
  }

  // =================================================================
  // NETWORK
  // =================================================================

  async getNetworkDevices(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<NetworkDevice>> {
    const { data } = await this.client.get<ApiResponse<PaginatedResponse<NetworkDevice>>>(
      '/api/network/devices',
      { params }
    );
    return data.data!;
  }

  async getNetworkDevice(id: string): Promise<NetworkDevice> {
    const { data } = await this.client.get<ApiResponse<NetworkDevice>>(
      `/api/network/devices/${id}`
    );
    return data.data!;
  }

  async getScans(params?: {
    page?: number;
    pageSize?: number;
    scanType?: string;
    status?: string;
  }): Promise<PaginatedResponse<ScanJob>> {
    const { data } = await this.client.get<ApiResponse<PaginatedResponse<ScanJob>>>(
      '/api/network/scans',
      { params }
    );
    return data.data!;
  }

  async getScan(id: string): Promise<ScanJob> {
    const { data } = await this.client.get<ApiResponse<ScanJob>>(`/api/network/scans/${id}`);
    return data.data!;
  }

  async createScan(scanType: string, targets: string[]): Promise<ScanJob> {
    const { data } = await this.client.post<ApiResponse<ScanJob>>('/api/network/scans', {
      scanType,
      targets,
    });
    return data.data!;
  }

  // =================================================================
  // SECURITY
  // =================================================================

  async getAlerts(params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    severity?: string;
    acknowledged?: boolean;
  }): Promise<PaginatedResponse<Alert>> {
    const { data } = await this.client.get<ApiResponse<PaginatedResponse<Alert>>>(
      '/api/security/alerts',
      { params }
    );
    return data.data!;
  }

  async acknowledgeAlert(id: string): Promise<Alert> {
    const { data } = await this.client.patch<ApiResponse<Alert>>(
      `/api/security/alerts/${id}/acknowledge`
    );
    return data.data!;
  }

  async getVulnerabilities(params?: {
    page?: number;
    pageSize?: number;
    severity?: string;
    acknowledged?: boolean;
  }): Promise<PaginatedResponse<Vulnerability>> {
    const { data } = await this.client.get<ApiResponse<PaginatedResponse<Vulnerability>>>(
      '/api/security/vulnerabilities',
      { params }
    );
    return data.data!;
  }

  // =================================================================
  // AUTOMATION
  // =================================================================

  async getAutomations(params?: {
    page?: number;
    pageSize?: number;
    enabled?: boolean;
  }): Promise<PaginatedResponse<AutomationRule>> {
    const { data } = await this.client.get<ApiResponse<PaginatedResponse<AutomationRule>>>(
      '/api/automations',
      { params }
    );
    return data.data!;
  }

  async getAutomation(id: string): Promise<AutomationRule> {
    const { data } = await this.client.get<ApiResponse<AutomationRule>>(
      `/api/automations/${id}`
    );
    return data.data!;
  }

  async createAutomation(automation: Partial<AutomationRule>): Promise<AutomationRule> {
    const { data } = await this.client.post<ApiResponse<AutomationRule>>(
      '/api/automations',
      automation
    );
    return data.data!;
  }

  async updateAutomation(
    id: string,
    updates: Partial<AutomationRule>
  ): Promise<AutomationRule> {
    const { data } = await this.client.patch<ApiResponse<AutomationRule>>(
      `/api/automations/${id}`,
      updates
    );
    return data.data!;
  }

  async deleteAutomation(id: string): Promise<void> {
    await this.client.delete(`/api/automations/${id}`);
  }

  async executeAutomation(id: string): Promise<void> {
    await this.client.post(`/api/automations/${id}/execute`);
  }

  // =================================================================
  // INTEGRATIONS
  // =================================================================

  async getIntegrations(params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    enabled?: boolean;
  }): Promise<PaginatedResponse<Integration>> {
    const { data } = await this.client.get<ApiResponse<PaginatedResponse<Integration>>>(
      '/api/integrations',
      { params }
    );
    return data.data!;
  }

  async getIntegration(id: string): Promise<Integration> {
    const { data } = await this.client.get<ApiResponse<Integration>>(
      `/api/integrations/${id}`
    );
    return data.data!;
  }

  async createIntegration(integration: Partial<Integration>): Promise<Integration> {
    const { data } = await this.client.post<ApiResponse<Integration>>(
      '/api/integrations',
      integration
    );
    return data.data!;
  }

  async updateIntegration(id: string, updates: Partial<Integration>): Promise<Integration> {
    const { data } = await this.client.patch<ApiResponse<Integration>>(
      `/api/integrations/${id}`,
      updates
    );
    return data.data!;
  }

  async deleteIntegration(id: string): Promise<void> {
    await this.client.delete(`/api/integrations/${id}`);
  }

  async testIntegration(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await this.client.post<ApiResponse<{ success: boolean; message: string }>>(
      `/api/integrations/${id}/test`
    );
    return data.data!;
  }

  // =================================================================
  // HEALTH
  // =================================================================

  async healthCheck(): Promise<any> {
    const { data } = await this.client.get('/health');
    return data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
