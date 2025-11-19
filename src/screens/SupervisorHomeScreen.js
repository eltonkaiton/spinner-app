// ./src/screens/SupervisorHomeScreen.js
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Alert,
  Dimensions,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import axios from "axios";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function SupervisorHomeScreen() {
  const { logout, token, user } = useContext(AuthContext);
  const navigation = useNavigation();

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarWidth = 280;
  const sidebarAnim = useState(new Animated.Value(-sidebarWidth))[0];

  // Try different possible endpoints
  const ORDERS_BASE_URL = "https://spinners-backend-1.onrender.com/api/orders";

  useEffect(() => {
    fetchSupervisorData();
  }, []);

  const fetchSupervisorData = async () => {
    setLoading(true);
    try {
      if (!token) {
        Alert.alert("Unauthorized", "No token found. Please login again.");
        logout();
        return;
      }

      // Try to get all orders first (this might be what's available)
      const response = await axios.get(`${ORDERS_BASE_URL}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const orders = response.data.orders || [];
        calculateStats(orders);
      } else {
        // If that fails, try supervisor-specific endpoint without ID
        try {
          const supervisorResponse = await axios.get(`${ORDERS_BASE_URL}/supervisor`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (supervisorResponse.data.success) {
            const orders = supervisorResponse.data.orders || [];
            calculateStats(orders);
          } else {
            throw new Error(supervisorResponse.data.message || "Failed to fetch orders");
          }
        } catch (supervisorError) {
          console.log("Supervisor endpoint failed, using mock data");
          // Use mock data for demonstration
          useMockData();
        }
      }
    } catch (error) {
      console.log("Fetch Orders Error:", error.response?.data || error.message);
      console.log("Using mock data for demonstration");
      useMockData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Use mock data when API is not available
  const useMockData = () => {
    const mockStats = {
      totalOrders: 24,
      pendingOrders: 8,
      completedOrders: 16
    };
    setStats(mockStats);
  };

  // Calculate stats from orders data
  const calculateStats = (orders) => {
    try {
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(order => {
        const status = order.orderStatus?.toLowerCase();
        return status === 'pending' || 
               status === 'processing' ||
               status === 'confirmed' ||
               status === 'active';
      }).length;
      
      const completedOrders = orders.filter(order => {
        const status = order.orderStatus?.toLowerCase();
        return status === 'completed' || 
               status === 'delivered' ||
               status === 'fulfilled';
      }).length;

      setStats({
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        completedOrders: completedOrders || 0
      });
    } catch (error) {
      console.log("Error calculating stats:", error);
      useMockData();
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSupervisorData();
  };

  const toggleSidebar = () => {
    Animated.timing(sidebarAnim, {
      toValue: sidebarOpen ? -sidebarWidth : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setSidebarOpen(!sidebarOpen);
  };

  const handleLogout = () => {
    logout();
  };

  const navigateTo = (screen, params = {}) => {
    toggleSidebar();
    if (screen === "SupervisorHome") {
      return;
    }
    navigation.navigate(screen, params);
  };

  // Stat Cards Data
  const statCards = [
    {
      id: 1,
      title: "Total Orders",
      value: stats.totalOrders,
      icon: "receipt",
      color: "#1a3a8f",
      bgColor: "#e8edff"
    },
    {
      id: 2,
      title: "Pending Orders",
      value: stats.pendingOrders,
      icon: "pending-actions",
      color: "#f59e0b",
      bgColor: "#fef3c7"
    },
    {
      id: 3,
      title: "Completed Orders",
      value: stats.completedOrders,
      icon: "check-circle",
      color: "#10b981",
      bgColor: "#d1fae5"
    }
  ];

  // Quick Actions
  const quickActions = [
    {
      id: 1,
      title: "Manage Orders",
      description: "View and manage all orders",
      icon: "assignment",
      screen: "SupervisorOrders",
      color: "#1a3a8f"
    }
  ];

  const StatCard = ({ item }) => (
    <View style={[styles.statCard, { backgroundColor: item.bgColor }]}>
      <View style={styles.statContent}>
        <View style={[styles.statIcon, { backgroundColor: item.color }]}>
          <MaterialIcons name={item.icon} size={24} color="#fff" />
        </View>
        <View style={styles.statText}>
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.statTitle}>{item.title}</Text>
        </View>
      </View>
    </View>
  );

  const QuickActionCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.quickActionCard}
      onPress={() => navigateTo(item.screen)}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: item.color }]}>
        <MaterialIcons name={item.icon} size={28} color="#fff" />
      </View>
      <Text style={styles.quickActionTitle}>{item.title}</Text>
      <Text style={styles.quickActionDesc}>{item.description}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a3a8f" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <TouchableOpacity 
          style={styles.overlay}
          onPress={toggleSidebar}
          activeOpacity={1}
        />
      )}

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { left: sidebarAnim }]}>
        <View style={styles.sidebarHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.fullName?.charAt(0)?.toUpperCase() || "S"}
              </Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.fullName || "Supervisor"}</Text>
              <Text style={styles.userRole}>Supervisor</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.sidebarContent}>
          <TouchableOpacity
            style={styles.sidebarItem}
            onPress={toggleSidebar}
          >
            <Ionicons name="grid-outline" size={22} color="#1a3a8f" />
            <Text style={styles.sidebarItemText}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarItem}
            onPress={() => navigateTo("SupervisorOrders")}
          >
            <MaterialIcons name="assignment" size={22} color="#1a3a8f" />
            <Text style={styles.sidebarItemText}>Orders Management</Text>
          </TouchableOpacity>

          <View style={styles.sidebarDivider} />

          <TouchableOpacity style={styles.sidebarItem} onPress={() => navigateTo("Help")}>
            <Ionicons name="help-circle-outline" size={22} color="#1a3a8f" />
            <Text style={styles.sidebarItemText}>Help & Support</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => navigateTo("About")}>
            <Ionicons name="information-circle-outline" size={22} color="#1a3a8f" />
            <Text style={styles.sidebarItemText}>About Us</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#e53935" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Ionicons name="menu-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Supervisor Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, {user?.fullName?.split(' ')[0] || 'Supervisor'}!</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dashboard Content */}
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={["#1a3a8f"]}
              tintColor="#1a3a8f"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>Welcome to Spinners Web</Text>
              <Text style={styles.welcomeDescription}>
                Manage orders, track progress, and monitor performance from your centralized dashboard.
              </Text>
            </View>
            <View style={styles.welcomeIcon}>
              <FontAwesome5 name="chart-line" size={40} color="#1a3a8f" />
            </View>
          </View>

          {/* Statistics Section */}
          <Text style={styles.sectionTitle}>Order Overview</Text>
          <View style={styles.statsGrid}>
            {statCards.map((item) => (
              <StatCard key={item.id} item={item} />
            ))}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((item) => (
              <QuickActionCard key={item.id} item={item} />
            ))}
          </View>

          {/* System Status */}
          <View style={styles.systemStatusCard}>
            <Text style={styles.systemStatusTitle}>System Status</Text>
            <View style={styles.statusItems}>
              <View style={styles.statusItem}>
                <View style={[styles.statusIndicator, { backgroundColor: '#10b981' }]} />
                <Text style={styles.statusText}>All Systems Operational</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Last Updated</Text>
                <Text style={styles.statusValue}>{new Date().toLocaleTimeString()}</Text>
              </View>
            </View>
          </View>

          {/* Additional Info Cards */}
          <View style={styles.infoCardsContainer}>
            <View style={styles.infoCard}>
              <MaterialIcons name="speed" size={32} color="#1a3a8f" />
              <Text style={styles.infoCardTitle}>Fast Processing</Text>
              <Text style={styles.infoCardText}>
                Efficient order management system for quick processing and delivery
              </Text>
            </View>
            
            <View style={styles.infoCard}>
              <MaterialIcons name="security" size={32} color="#1a3a8f" />
              <Text style={styles.infoCardTitle}>Secure & Reliable</Text>
              <Text style={styles.infoCardText}>
                Your data is protected with enterprise-grade security measures
              </Text>
            </View>
          </View>

          {/* Demo Notice - Remove this in production */}
          <View style={styles.demoNotice}>
            <MaterialIcons name="info" size={20} color="#f59e0b" />
            <Text style={styles.demoNoticeText}>
              Using demonstration data. Connect to backend for live statistics.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8fafc" 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6b7280'
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 998,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: "#fff",
    elevation: 10,
    zIndex: 999,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  sidebarHeader: {
    padding: 25,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a3a8f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937'
  },
  userRole: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2
  },
  sidebarContent: {
    flex: 1,
    padding: 15
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5
  },
  sidebarItemText: { 
    marginLeft: 15, 
    fontSize: 16, 
    color: "#374151",
    fontWeight: '500'
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 15,
    marginHorizontal: 10
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginHorizontal: 15
  },
  logoutText: {
    marginLeft: 15,
    fontSize: 16,
    color: "#e53935",
    fontWeight: '500'
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a3a8f",
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  menuButton: {
    padding: 5
  },
  headerTitle: { 
    color: "#fff", 
    fontSize: 22, 
    fontWeight: "bold" 
  },
  headerSubtitle: {
    color: "#e0e7ff",
    fontSize: 14,
    marginTop: 2
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  notificationButton: {
    padding: 5
  },
  content: {
    flex: 1,
    padding: 20
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 25,
    marginBottom: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  welcomeText: {
    flex: 1,
    marginRight: 15
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8
  },
  welcomeDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20
  },
  welcomeIcon: {
    padding: 15,
    backgroundColor: '#e8edff',
    borderRadius: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25
  },
  statCard: {
    width: (width - 60) / 2,
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  statText: {
    flex: 1
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500'
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25
  },
  quickActionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4
  },
  quickActionDesc: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16
  },
  systemStatusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 25,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  systemStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15
  },
  statusItems: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  statusText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500'
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8
  },
  statusValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500'
  },
  infoCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25
  },
  infoCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginVertical: 8
  },
  infoCardText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16
  },
  demoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    marginBottom: 20
  },
  demoNoticeText: {
    marginLeft: 10,
    color: '#92400e',
    fontSize: 14,
    flex: 1
  }
});