// ./src/screens/DriverDeliveryScreen.js
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Dimensions,
  TextInput,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const { width } = Dimensions.get('window');

// Validate MongoDB ObjectId
const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

export default function DriverDeliveryScreen() {
  const { token, logout, user } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const DRIVER_ORDERS_URL = "https://spinners-backend-1.onrender.com/api/orders/driver";

  // Fetch assigned orders
  const fetchAssignedOrders = async () => {
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
        const assignedOrders = Array.isArray(res.data.orders)
          ? res.data.orders.filter((o) => o._id && isValidObjectId(o._id))
          : [];
        setOrders(assignedOrders);
        setFilteredOrders(assignedOrders);
      } else {
        setOrders([]);
        setFilteredOrders([]);
        Alert.alert("Access Denied", res.data.message || "Cannot fetch assigned orders.");
      }
    } catch (error) {
      console.error("Fetch Assigned Orders Error:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.message || "Server error while fetching orders.");
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAssignedOrders();
  }, []);

  // Filter orders based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order =>
        order.productId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.userId?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.deliveryAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderStatus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.paymentStatus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order._id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrders(filtered);
    }
  }, [searchQuery, orders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAssignedOrders();
  };

  // Mark order as delivered
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
        // Update UI immediately
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId ? { ...order, orderStatus: "delivered" } : order
          )
        );
        Alert.alert("✅ Success", "Order marked as delivered successfully!");
      } else {
        Alert.alert("Error", res.data.message || "Failed to update order.");
      }
    } catch (error) {
      console.error("Mark Delivered Error:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.message || "Server error.");
    }
  };

  // Generate Professional PDF receipt
  const generateReceipt = async (order) => {
    setGeneratingReceipt(order._id);
    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Delivery Receipt - ${order._id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Inter', sans-serif;
              line-height: 1.6;
              color: #333;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
              min-height: 100vh;
            }
            
            .receipt-container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            
            .receipt-header {
              background: linear-gradient(135deg, #1a3a8f 0%, #2563eb 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            
            .company-name {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 5px;
            }
            
            .receipt-title {
              font-size: 18px;
              font-weight: 400;
              opacity: 0.9;
            }
            
            .receipt-body {
              padding: 40px;
            }
            
            .section {
              margin-bottom: 30px;
            }
            
            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #1a3a8f;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            
            .info-item {
              margin-bottom: 12px;
            }
            
            .info-label {
              font-weight: 600;
              color: #64748b;
              font-size: 14px;
              margin-bottom: 4px;
            }
            
            .info-value {
              font-weight: 500;
              color: #1e293b;
              font-size: 15px;
            }
            
            .status-badge {
              display: inline-block;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            }
            
            .status-delivered {
              background: #dcfce7;
              color: #166534;
            }
            
            .status-pending {
              background: #fef3c7;
              color: #92400e;
            }
            
            .payment-status {
              background: #dbeafe;
              color: #1e40af;
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              display: inline-block;
            }
            
            .total-section {
              background: #f8fafc;
              padding: 25px;
              border-radius: 12px;
              text-align: center;
              margin-top: 30px;
            }
            
            .total-amount {
              font-size: 32px;
              font-weight: 700;
              color: #1a3a8f;
              margin: 10px 0;
            }
            
            .footer {
              text-align: center;
              padding: 30px;
              background: #f1f5f9;
              color: #64748b;
              font-size: 14px;
            }
            
            .thank-you {
              font-size: 16px;
              font-weight: 600;
              color: #1a3a8f;
              margin-bottom: 8px;
            }
            
            .driver-info {
              background: #f0f9ff;
              padding: 20px;
              border-radius: 12px;
              margin-top: 20px;
            }
            
            .signature-section {
              margin-top: 40px;
              border-top: 2px dashed #e2e8f0;
              padding-top: 20px;
            }
            
            .signature-line {
              border-top: 1px solid #cbd5e1;
              width: 200px;
              margin: 30px auto 10px;
            }
            
            .signature-label {
              text-align: center;
              color: #64748b;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="receipt-header">
              <div class="company-name">MOMBASA FERRY SERVICES</div>
              <div class="receipt-title">DELIVERY RECEIPT & PROOF OF DELIVERY</div>
            </div>
            
            <div class="receipt-body">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">RECEIPT NUMBER</div>
                  <div class="info-value">${order._id}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">DELIVERY DATE</div>
                  <div class="info-value">${currentDate}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">DELIVERY TIME</div>
                  <div class="info-value">${currentTime}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">ORDER STATUS</div>
                  <div class="status-badge ${order.orderStatus === 'delivered' ? 'status-delivered' : 'status-pending'}">
                    ${order.orderStatus?.toUpperCase() || 'PENDING'}
                  </div>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">CUSTOMER INFORMATION</div>
                <div class="info-item">
                  <div class="info-label">FULL NAME</div>
                  <div class="info-value">${order.userId?.fullName || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">DELIVERY ADDRESS</div>
                  <div class="info-value">${order.deliveryAddress || 'Address not specified'}</div>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">ORDER DETAILS</div>
                <div class="info-item">
                  <div class="info-label">PRODUCT NAME</div>
                  <div class="info-value">${order.productId?.name || 'Unnamed Product'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">QUANTITY</div>
                  <div class="info-value">${order.quantity || 'N/A'} units</div>
                </div>
                <div class="info-item">
                  <div class="info-label">PAYMENT STATUS</div>
                  <div class="payment-status">${order.paymentStatus?.toUpperCase() || 'PENDING'}</div>
                </div>
              </div>
              
              <div class="driver-info">
                <div class="section-title">DRIVER INFORMATION</div>
                <div class="info-item">
                  <div class="info-label">DRIVER NAME</div>
                  <div class="info-value">${user?.fullName || 'Delivery Driver'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">CONTACT</div>
                  <div class="info-value">${user?.email || 'N/A'}</div>
                </div>
              </div>
              
              <div class="total-section">
                <div class="info-label">TOTAL AMOUNT</div>
                <div class="total-amount">KES ${order.totalPrice?.toLocaleString() || '0'}</div>
                <div class="info-label">Amount in Kenya Shillings</div>
              </div>
              
              <div class="signature-section">
                <div class="signature-line"></div>
                <div class="signature-label">Customer Signature</div>
              </div>
            </div>
            
            <div class="footer">
              <div class="thank-you">Thank you for choosing Mombasa Ferry Services!</div>
              <div>For any inquiries, please contact our customer service</div>
              <div>Email: support@mombasaferry.com | Phone: +254 700 000 000</div>
              <div style="margin-top: 15px; font-size: 12px;">
                This is an computer-generated receipt. No signature required.
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ 
        html: htmlContent,
        base64: false
      });
      
      await Sharing.shareAsync(uri, { 
        mimeType: "application/pdf",
        dialogTitle: `Delivery Receipt - ${order._id}`,
        UTI: 'com.adobe.pdf'
      });
      
    } catch (error) {
      console.error("PDF Generation Error:", error);
      Alert.alert("Error", "Failed to generate receipt PDF. Please try again.");
    } finally {
      setGeneratingReceipt(null);
    }
  };

  // Calculate dashboard stats based on filtered orders
  const dashboardStats = {
    totalOrders: filteredOrders.length,
    pendingDeliveries: filteredOrders.filter(order => 
      order.orderStatus === 'pending' || order.orderStatus === 'approved'
    ).length,
    completedDeliveries: filteredOrders.filter(order => order.orderStatus === 'delivered').length,
    todaysDeliveries: filteredOrders.filter(order => {
      const today = new Date().toDateString();
      const orderDate = new Date(order.createdAt).toDateString();
      return orderDate === today;
    }).length,
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setSearchFocused(false);
  };

  // Dashboard Card Component
  const DashboardCard = ({ title, value, subtitle, icon, color }) => (
    <View style={[styles.dashboardCard, { borderLeftColor: color }]}>
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
    </View>
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
        <Text style={styles.orderPrice}>KES {item.totalPrice?.toLocaleString()}</Text>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>{item.userId?.fullName || "N/A"}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cube-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>Quantity: {item.quantity || "N/A"}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>{item.deliveryAddress || "Address not specified"}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>
            Payment: 
            <Text style={[
              styles.paymentStatus,
              { color: item.paymentStatus === 'paid' ? '#10b981' : '#f59e0b' }
            ]}>
              {item.paymentStatus || "N/A"}
            </Text>
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#64748b" />
          <Text style={styles.detailText}>
            Ordered: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        {item.orderStatus !== "delivered" && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.deliverButton]} 
            onPress={() => markAsDelivered(item._id)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Mark Delivered</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.receiptButton]}
          onPress={() => generateReceipt(item)}
          disabled={generatingReceipt === item._id}
        >
          {generatingReceipt === item._id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="receipt-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Generate Receipt</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery Management</Text>
        <Text style={styles.headerSubtitle}>Manage your assigned deliveries</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a3a8f" />
          <Text style={styles.loadingText}>Loading your deliveries...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Search Bar */}
          <View style={styles.searchSection}>
            <View style={[
              styles.searchContainer,
              searchFocused && styles.searchContainerFocused
            ]}>
              <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search deliveries..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
                  <Ionicons name="close-circle" size={20} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Search Results Info */}
            {searchQuery.length > 0 && (
              <View style={styles.searchResultsInfo}>
                <Text style={styles.searchResultsText}>
                  Found {filteredOrders.length} delivery{filteredOrders.length !== 1 ? 's' : ''} for "{searchQuery}"
                </Text>
                <TouchableOpacity onPress={clearSearch}>
                  <Text style={styles.clearSearchText}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Dashboard Stats */}
          <View style={styles.statsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Overview</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <Ionicons name="refresh" size={20} color="#1a3a8f" />
              </TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
              <DashboardCard
                title="Total Orders"
                value={dashboardStats.totalOrders}
                subtitle={searchQuery ? "Filtered" : "All assigned"}
                icon="list"
                color="#1a3a8f"
              />
              <DashboardCard
                title="Pending"
                value={dashboardStats.pendingDeliveries}
                subtitle="To be delivered"
                icon="time"
                color="#f59e0b"
              />
              <DashboardCard
                title="Completed"
                value={dashboardStats.completedDeliveries}
                subtitle="Successfully delivered"
                icon="checkmark-done"
                color="#10b981"
              />
              <DashboardCard
                title="Today's"
                value={dashboardStats.todaysDeliveries}
                subtitle="Due today"
                icon="today"
                color="#8b5cf6"
              />
            </View>
          </View>

          {/* Orders List */}
          <View style={styles.ordersSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {searchQuery ? "Search Results" : "Assigned Deliveries"} ({filteredOrders.length})
              </Text>
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.cancelSearchButton}>
                  <Text style={styles.cancelSearchText}>Cancel Search</Text>
                </TouchableOpacity>
              )}
            </View>

            {filteredOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons 
                  name={searchQuery ? "search-outline" : "cube-outline"} 
                  size={64} 
                  color="#cbd5e1" 
                />
                <Text style={styles.emptyStateTitle}>
                  {searchQuery ? "No Deliveries Found" : "No Assigned Deliveries"}
                </Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery 
                    ? `No deliveries found for "${searchQuery}". Try a different search term.`
                    : "You don't have any deliveries assigned to you at the moment."
                  }
                </Text>
                {searchQuery ? (
                  <TouchableOpacity style={styles.emptyStateButton} onPress={clearSearch}>
                    <Text style={styles.emptyStateButtonText}>Clear Search</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.emptyStateButton} onPress={onRefresh}>
                    <Text style={styles.emptyStateButtonText}>Refresh</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={filteredOrders}
                keyExtractor={(item) => item._id}
                renderItem={renderOrder}
                scrollEnabled={false}
                refreshControl={
                  <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={onRefresh}
                    colors={['#1a3a8f']}
                  />
                }
                contentContainerStyle={styles.ordersList}
              />
            )}
          </View>
        </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a3a8f',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  content: {
    flex: 1,
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
  searchSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchContainerFocused: {
    borderColor: '#1a3a8f',
    backgroundColor: '#fff',
    shadowColor: '#1a3a8f',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  searchResultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  searchResultsText: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  clearSearchText: {
    color: '#1a3a8f',
    fontWeight: '600',
    fontSize: 14,
  },
  statsSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 8,
  },
  cancelSearchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  cancelSearchText: {
    color: '#64748b',
    fontWeight: '500',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: (width - 48) / 2,
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
  ordersSection: {
    flex: 1,
    padding: 16,
  },
  ordersList: {
    paddingBottom: 20,
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
  paymentStatus: {
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  deliverButton: {
    backgroundColor: '#10b981',
  },
  receiptButton: {
    backgroundColor: '#1a3a8f',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
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
    lineHeight: 20,
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