import { apiPost } from '../services/api.service';

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export const authApi = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiPost('auth/login', data);
    // Store token
    if (response.accessToken) {
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiPost('auth/signup', data);
    // Store token
    if (response.accessToken) {
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  async logout(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};
