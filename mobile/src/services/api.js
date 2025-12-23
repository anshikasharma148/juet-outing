import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// User APIs
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  updatePushToken: (data) => api.put('/users/push-token', data),
  getHistory: () => api.get('/users/history'),
  getStatistics: () => api.get('/users/statistics'),
};

// Outing APIs
export const outingAPI = {
  createRequest: (data) => api.post('/outings', data),
  getRequests: (params) => api.get('/outings', { params }),
  getMyRequests: () => api.get('/outings/my-requests'),
  getRequest: (id) => api.get(`/outings/${id}`),
  cancelRequest: (id) => api.put(`/outings/${id}/cancel`),
};

// Matching APIs
export const matchingAPI = {
  joinRequest: (requestId) => api.post(`/matching/join/${requestId}`),
  getSuggestions: () => api.get('/matching/suggestions'),
  autoMatch: () => api.post('/matching/auto-match'),
  getActiveGroup: () => api.get('/matching/active-group'),
};

// Message APIs
export const messageAPI = {
  getMessages: (groupId) => api.get(`/messages/${groupId}`),
  sendMessage: (data) => api.post('/messages', data),
};

// Location APIs
export const locationAPI = {
  checkIn: (data) => api.post('/location/checkin', data),
  checkOut: (data) => api.post('/location/checkout', data),
  getGateStatus: (groupId) => api.get(`/location/gate-status/${groupId}`),
};

export default api;

