import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend base URL
const BASE_URL = 'https://spinners-backend-1.onrender.com/api'; // your backend IP + port

const API = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10s timeout
});

// Attach token automatically if present
API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export default API;
