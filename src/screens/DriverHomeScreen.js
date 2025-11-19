// ./src/screens/DriverHomeScreen.js
import React, { useEffect, useState, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SIDEBAR_WIDTH = 280;

const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

export default function DriverHomeScreen() {
  const { token, user, logout } = useContext(AuthContext);
  const navigation = useNavigation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const DRIVER_ORDERS_URL = "https://spinners-backend-1.onrender.com/api/orders/driver";

  const fetchOrders = async () => {
    setLoading(true);
    try {
      if (!token) {
        Alert.alert("Unauthorized", "No token found. Please login again.");
        logout();
        return;
      }

      const res = await axios.get(DRIVER_ORDERS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const safeOrders = Array.isArray(res.data.orders)
          ? res.data.orders.filter((o) => o._id && isValidObjectId(o._id))
          : [];
        setOrders(safeOrders);
      } else {
        setOrders([]);
        Alert.alert("Access Denied", res.data.message || "Cannot fetch orders.");
      }
    } catch (error) {
      console.error("Driver Fetch Orders Error:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.message || "Server error while fetching orders.");
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // ✅ Updated function: mark order as delivered
  const markAsDelivered = async (orderId) => {
    if (!isValidObjectId(orderId)) {
      Alert.alert("Error", "Cannot mark order: invalid order ID.");
      return;
    }

    try {
      const res = await axios.put(
        `https://spinners-backend-1.onrender.com/api/orders/update-status/${orderId}`,
        { status: "delivered" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        // Update UI immediately without refetch
        setOrders((prevOrders) =>
          prevOrders.map((o) =>
            o._id === orderId ? { ...o, orderStatus: "delivered" } : o
          )
        );
        Alert.alert("Success", "Order marked as delivered.");
      } else {
        Alert.alert("Error", res.data.message || "Failed to update order.");
      }
    } catch (error) {
      console.error("Mark Delivered Error:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.message || "Server error.");
    }
  };

  const toggleSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: sidebarOpen ? -SIDEBAR_WIDTH : 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setSidebarOpen(!sidebarOpen));
  };

  // Calculate dashboard stats
  const dashboardStats = {
    totalOrders: orders.length,
    pendingDeliveries: orders.filter(order => 
      order.orderStatus === 'pending' || order.orderStatus === 'approved'
    ).length,
    completedDeliveries: orders.filter(order => order.orderStatus === 'delivered').length,
    urgentDeliveries: orders.filter(order => 
      (order.orderStatus === 'pending' || order.orderStatus === 'approved') && 
      order.priority === 'high'
    ).length,
    todaysDeliveries: orders.filter(order => {
      const today = new Date().toDateString();
      const orderDate = new Date(order.createdAt).toDateString();
      return orderDate === today;
    }).length,
  };

  // Dashboard Cards Component
  const DashboardCard = ({ title, value, subtitle, icon, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.dashboardCard, { borderLeftColor: color }]} 
      onPress={onPress}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <Ionicons name={icon} size={24} color="#fff" />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardValue}>{value}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render each order card
  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>{item.productId?.name || "Unnamed Product"}</Text>
          <View style={[styles.statusBadge, 
            { backgroundColor: item.orderStatus === 'delivered' ? '#10b981' : 
                            item.orderStatus === 'approved' ? '#3b82f6' : '#f59e0b' }]}>
            <Text style={styles.statusText}>{item.orderStatus?.toUpperCase() || "PENDING"}</Text>
          </View>
        </View>
        <Text style={styles.orderPrice}>KES {item.totalPrice}</Text>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>{item.userId?.fullName || item.userId?.full_name || "N/A"}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cube-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>Qty: {item.quantity || "N/A"}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>{item.deliveryAddress || "Address not specified"}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>Payment: {item.paymentStatus || "N/A"}</Text>
        </View>
      </View>

      {item.orderStatus !== "delivered" && (
        <TouchableOpacity 
          style={styles.deliverButton}
          onPress={() => markAsDelivered(item._id)}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.deliverButtonText}>Mark as Delivered</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar}>
            <Ionicons name="menu-outline" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Dashboard</Text>
          <TouchableOpacity onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a3a8f" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar}>
          <Ionicons name="menu-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {showOrders ? `My Deliveries (${orders.length})` : "Driver Dashboard"}
        </Text>
        <TouchableOpacity onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { left: slideAnim }]}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Driver Menu</Text>
          <Text style={styles.sidebarSubtitle}>{user?.email || "Driver"}</Text>
        </View>
        
        <ScrollView style={styles.sidebarContent}>
          <TouchableOpacity 
            style={[styles.sidebarItem, !showOrders && styles.activeSidebarItem]} 
            onPress={() => {
              setShowOrders(false);
              toggleSidebar();
            }}
          >
            <Ionicons name="speedometer" size={20} color="#fff" />
            <Text style={styles.sidebarText}>Dashboard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.sidebarItem, showOrders && styles.activeSidebarItem]}
            onPress={() => {
              setShowOrders(true);
              toggleSidebar();
            }}
          >
            <Ionicons name="cube" size={20} color="#fff" />
            <Text style={styles.sidebarText}>My Deliveries</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sidebarItem}
            onPress={() => {
              navigation.navigate("DriverDeliveryScreen");
              toggleSidebar();
            }}
          >
            <Ionicons name="navigate" size={20} color="#fff" />
            <Text style={styles.sidebarText}>Delivery Management</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => {
            navigation.navigate("About");
            toggleSidebar();
          }}>
            <Ionicons name="information-circle" size={20} color="#fff" />
            <Text style={styles.sidebarText}>About Us</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => {
            navigation.navigate("Contact");
            toggleSidebar();
          }}>
            <Ionicons name="call" size={20} color="#fff" />
            <Text style={styles.sidebarText}>Contact Us</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity style={styles.sidebarLogout} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.sidebarLogoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <TouchableOpacity 
          style={styles.overlay}
          onPress={toggleSidebar}
          activeOpacity={1}
        />
      )}

      {/* Main Content */}
      {!showOrders ? (
        // Dashboard View
        <ScrollView style={styles.dashboardContainer} showsVerticalScrollIndicator={false}>
          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>Welcome back, Driver! 🚚</Text>
              <Text style={styles.welcomeMessage}>
                You have {dashboardStats.totalOrders} assigned deliveries. 
                {dashboardStats.urgentDeliveries > 0 && ` ${dashboardStats.urgentDeliveries} require urgent attention.`}
              </Text>
            </View>
            <View style={styles.welcomeIcon}>
              <Ionicons name="car-sport" size={40} color="#1a3a8f" />
            </View>
          </View>

          {/* Stats Overview */}
          <Text style={styles.sectionTitle}>Delivery Overview</Text>
          <View style={styles.statsGrid}>
            <DashboardCard
              title="Total Orders"
              value={dashboardStats.totalOrders}
              subtitle="All assigned"
              icon="list"
              color="#1a3a8f"
              onPress={() => setShowOrders(true)}
            />
            <DashboardCard
              title="Pending"
              value={dashboardStats.pendingDeliveries}
              subtitle="To be delivered"
              icon="time"
              color="#f59e0b"
              onPress={() => setShowOrders(true)}
            />
            <DashboardCard
              title="Completed"
              value={dashboardStats.completedDeliveries}
              subtitle="Successfully delivered"
              icon="checkmark-done"
              color="#10b981"
              onPress={() => setShowOrders(true)}
            />
            <DashboardCard
              title="Today's"
              value={dashboardStats.todaysDeliveries}
              subtitle="Due today"
              icon="today"
              color="#8b5cf6"
              onPress={() => setShowOrders(true)}
            />
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => setShowOrders(true)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#1a3a8f' }]}>
                <Ionicons name="cube" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>View All Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("DriverDeliveryScreen")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#10b981' }]}>
                <Ionicons name="navigate" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>Delivery Management</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={onRefresh}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="refresh" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>Refresh Data</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => navigation.navigate("About")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="information-circle" size={24} color="#fff" />
              </View>
              <Text style={styles.quickActionText}>About Us</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Deliveries Preview */}
          {orders.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Deliveries</Text>
                <TouchableOpacity onPress={() => setShowOrders(true)}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              {orders.slice(0, 3).map((order) => (
                <TouchableOpacity 
                  key={order._id} 
                  style={styles.previewCard}
                  onPress={() => setShowOrders(true)}
                >
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle} numberOfLines={1}>
                      {order.productId?.name || "Unnamed Product"}
                    </Text>
                    <View style={[styles.previewStatus, 
                      { backgroundColor: order.orderStatus === 'delivered' ? '#10b981' : 
                                      order.orderStatus === 'approved' ? '#3b82f6' : '#f59e0b' }]}>
                      <Text style={styles.previewStatusText}>{order.orderStatus}</Text>
                    </View>
                  </View>
                  <Text style={styles.previewAddress} numberOfLines={1}>
                    {order.deliveryAddress || "No address specified"}
                  </Text>
                  <Text style={styles.previewCustomer}>
                    Customer: {order.userId?.fullName || order.userId?.full_name || "N/A"}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        // Orders List View
        <View style={styles.ordersContainer}>
          <View style={styles.ordersHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowOrders(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#1a3a8f" />
              <Text style={styles.backButtonText}>Back to Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={24} color="#1a3a8f" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={orders}
            keyExtractor={(item) => item._id}
            renderItem={renderOrder}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#1a3a8f']}
              />
            }
            contentContainerStyle={styles.ordersList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={64} color="#cbd5e1" />
                <Text style={styles.emptyStateTitle}>No Assigned Deliveries</Text>
                <Text style={styles.emptyStateText}>
                  You don't have any deliveries assigned to you at the moment.
                </Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={onRefresh}>
                  <Text style={styles.emptyStateButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8fafc" 
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a3a8f",
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerTitle: { 
    color: "#fff", 
    fontSize: 20, 
    fontWeight: "bold" 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#1a3a8f",
    zIndex: 1000,
    elevation: 10,
  },
  sidebarHeader: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#2d4ba8',
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sidebarSubtitle: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  sidebarContent: {
    flex: 1,
    padding: 10,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginVertical: 4,
    borderRadius: 8,
  },
  activeSidebarItem: {
    backgroundColor: '#2d4ba8',
  },
  sidebarText: { 
    color: "#fff", 
    fontWeight: "600", 
    fontSize: 16,
    marginLeft: 12,
  },
  sidebarLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2d4ba8',
    backgroundColor: '#dc2626',
  },
  sidebarLogoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 12,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  dashboardContainer: {
    flex: 1,
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  welcomeMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  welcomeIcon: {
    marginLeft: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#1a3a8f',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: (SCREEN_WIDTH - 48) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: (SCREEN_WIDTH - 48) / 2,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  previewStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  previewStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  previewAddress: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  previewCustomer: {
    fontSize: 12,
    color: '#64748b',
  },
  ordersContainer: {
    flex: 1,
  },
  ordersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#1a3a8f',
    fontWeight: '600',
    marginLeft: 4,
  },
  refreshButton: {
    padding: 4,
  },
  ordersList: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a3a8f',
  },
  orderDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  deliverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
  },
  deliverButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#1a3a8f',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});