// ./contexts/AuthContext.js
import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Alert } from "react-native";

const API_BASE_URL = "https://spinners-backend-1.onrender.com/api";
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Axios defaults
  axios.defaults.baseURL = API_BASE_URL;
  axios.defaults.headers.post["Content-Type"] = "application/json";

  // Axios auth header sync
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      async (config) => {
        if (token) config.headers.Authorization = `Bearer ${token}`;
        else delete config.headers.Authorization;
        return config;
      },
      (error) => Promise.reject(error)
    );
    return () => axios.interceptors.request.eject(interceptor);
  }, [token]);

  // Restore session
  useEffect(() => {
    const restore = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          console.log("🔄 Session restored:", parsedUser.email);
        }
      } catch (e) {
        console.log("⚠️ Session restore error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    restore();
  }, []);

  // =========================
  // REGISTER
  // =========================
  const register = async ({ fullName, email, phone, password }) => {
    setIsLoading(true);
    try {
      // ✅ Send correct fields to backend
      const res = await axios.post("/auth/register", {
        fullName,
        email,
        phone,
        password,
      });

      if (!res.data?.user) throw new Error("Invalid server response");

      console.log("🎉 Registration success:", res.data.user.email);

      // Auto-login after registration
      const loggedInUser = await login(email, password);
      return loggedInUser;
    } catch (err) {
      console.log("❌ Registration error:", err.response?.data || err.message);
      Alert.alert(
        "Registration Failed",
        err.response?.data?.error || err.message || "Something went wrong."
      );
      throw err.response?.data || err;
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // LOGIN
  // =========================
  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await axios.post("/auth/login", { email, password });
      const { token: newToken, user: loginUser } = res.data;

      if (!newToken || !loginUser) throw new Error("Invalid server response");

      const normalizedUser = {
        ...loginUser,
        role: loginUser.role?.toLowerCase() || "customer",
        _id: loginUser.id || loginUser._id,
        id: loginUser.id || loginUser._id,
      };

      await AsyncStorage.setItem("token", newToken);
      await AsyncStorage.setItem("user", JSON.stringify(normalizedUser));

      setToken(newToken);
      setUser(normalizedUser);

      console.log("✅ Logged in:", normalizedUser.email);
      Alert.alert(
        "Login Successful",
        `Welcome ${normalizedUser.fullName || normalizedUser.email}!`
      );

      return normalizedUser;
    } catch (err) {
      console.log("❌ Login error:", err.response?.data || err.message);
      Alert.alert(
        "Login Failed",
        err.response?.data?.error || "Invalid credentials"
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // LOGOUT
  // =========================
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(["token", "user"]);
      setUser(null);
      setToken(null);
      console.log("👋 Logged out");
    } catch (err) {
      Alert.alert("Error", "Failed to log out");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
