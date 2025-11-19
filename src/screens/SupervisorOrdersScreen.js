// ./src/screens/SupervisorOrdersScreen.js
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Dimensions,
} from "react-native";
import axios from "axios";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { AuthContext } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get('window');

export default function SupervisorOrdersScreen() {
  const { authToken } = useContext(AuthContext);
  const navigation = useNavigation();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  const ORDERS_URL = "https://spinners-backend-1.onrender.com/api/orders";

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(ORDERS_URL, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.data.success) {
        setOrders(res.data.orders);
        setFilteredOrders(res.data.orders);
      } else {
        setOrders([]);
        setFilteredOrders([]);
        console.warn("Fetch failed:", res.data.message);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  /* 🔍 SEARCH FILTER */
  const handleSearch = (text) => {
    setSearch(text);
    if (!text) {
      setFilteredOrders(orders);
      return;
    }

    const filtered = orders.filter((order) => {
      const productName = order.productId?.name?.toLowerCase() || "";
      const customerName =
        order.userId?.fullName?.toLowerCase() ||
        order.userId?.full_name?.toLowerCase() ||
        "";
      const status = order.orderStatus?.toLowerCase() || "";
      const paymentStatus = order.paymentStatus?.toLowerCase() || "";
      const orderId = order._id?.toLowerCase() || "";
      
      return (
        productName.includes(text.toLowerCase()) ||
        customerName.includes(text.toLowerCase()) ||
        status.includes(text.toLowerCase()) ||
        paymentStatus.includes(text.toLowerCase()) ||
        orderId.includes(text.toLowerCase())
      );
    });

    setFilteredOrders(filtered);
  };

  // Clear search
  const clearSearch = () => {
    setSearch("");
    setFilteredOrders(orders);
  };

  /* ✅ MARK AS COMPLETE */
  const handleMarkAsComplete = async (orderId) => {
    Alert.alert(
      "Confirm Completion",
      "Are you sure you want to mark this order as complete?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Complete",
          onPress: async () => {
            try {
              const response = await axios.put(
                `${ORDERS_URL}/${orderId}/mark-complete`,
                {},
                { headers: { Authorization: `Bearer ${authToken}` } }
              );

              if (response.data.success) {
                Alert.alert("✅ Success", "Order marked as complete!");
                // Auto-refresh the orders list
                fetchOrders();
              } else {
                Alert.alert("⚠️ Error", response.data.message || "Failed to update order.");
              }
            } catch (err) {
              console.error("❌ Mark as complete error:", err.response?.data || err.message);
              Alert.alert("Error", "Failed to mark order as complete.");
            }
          },
        },
      ]
    );
  };

  /* 🧾 GENERATE PROFESSIONAL PDF RECEIPT */
  const handleGenerateReceipt = async () => {
    if (!filteredOrders.length) {
      Alert.alert("No Orders", "There are no orders to include in the receipt.");
      return;
    }

    setGeneratingReceipt(true);
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
          <title>Supervisor Orders Report</title>
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
            
            .report-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
              padding: 20px;
              background: #f8fafc;
              border-radius: 12px;
            }
            
            .info-item {
              margin-bottom: 10px;
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
            
            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #1a3a8f;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e2e8f0;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 12px;
            }
            
            th {
              background: #1a3a8f;
              color: white;
              padding: 12px 8px;
              text-align: left;
              font-weight: 600;
            }
            
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #e2e8f0;
            }
            
            tr:nth-child(even) {
              background: #f8fafc;
            }
            
            .status-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
            }
            
            .status-completed {
              background: #dcfce7;
              color: #166534;
            }
            
            .status-pending {
              background: #fef3c7;
              color: #92400e;
            }
            
            .status-received {
              background: #dbeafe;
              color: #1e40af;
            }
            
            .summary-section {
              background: #f0f9ff;
              padding: 25px;
              border-radius: 12px;
              margin-top: 30px;
              text-align: center;
            }
            
            .summary-title {
              font-size: 16px;
              font-weight: 600;
              color: #1a3a8f;
              margin-bottom: 10px;
            }
            
            .summary-value {
              font-size: 24px;
              font-weight: 700;
              color: #1a3a8f;
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
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="receipt-header">
              <div class="company-name">MOMBASA FERRY SERVICES</div>
              <div class="receipt-title">SUPERVISOR ORDERS REPORT</div>
            </div>
            
            <div class="receipt-body">
              <div class="report-info">
                <div class="info-item">
                  <div class="info-label">REPORT DATE</div>
                  <div class="info-value">${currentDate}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">REPORT TIME</div>
                  <div class="info-value">${currentTime}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">TOTAL ORDERS</div>
                  <div class="info-value">${filteredOrders.length}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">GENERATED BY</div>
                  <div class="info-value">Supervisor</div>
                </div>
              </div>
              
              <div class="section-title">ORDERS SUMMARY</div>
              
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Order ID</th>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Qty</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredOrders
                    .map(
                      (order, index) => `
                      <tr>
                        <td>${index + 1}</td>
                        <td>${order._id?.substring(0, 8)}...</td>
                        <td>${order.productId?.name || "N/A"}</td>
                        <td>${order.userId?.fullName || order.userId?.full_name || "N/A"}</td>
                        <td>${order.quantity}</td>
                        <td>
                          <span class="status-badge status-${order.orderStatus?.toLowerCase()}">
                            ${order.orderStatus}
                          </span>
                        </td>
                        <td>${order.paymentStatus}</td>
                        <td>KES ${order.totalPrice?.toLocaleString() || "0"}</td>
                      </tr>`
                    )
                    .join("")}
                </tbody>
              </table>
              
              <div class="summary-section">
                <div class="summary-title">TOTAL ORDER VALUE</div>
                <div class="summary-value">
                  KES ${filteredOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toLocaleString()}
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div class="thank-you">Supervisor Orders Report</div>
              <div>This report contains ${filteredOrders.length} order(s) as of ${currentDate}</div>
              <div style="margin-top: 15px; font-size: 12px;">
                Generated automatically by Mombasa Ferry Services System
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Supervisor Orders Report",
        UTI: 'com.adobe.pdf'
      });
      
    } catch (error) {
      console.error("❌ PDF generation error:", error);
      Alert.alert("Error", "Failed to generate PDF report.");
    } finally {
      setGeneratingReceipt(false);
    }
  };

  // Calculate statistics
  const stats = {
    total: filteredOrders.length,
    completed: filteredOrders.filter(order => order.orderStatus?.toLowerCase() === 'completed').length,
    pending: filteredOrders.filter(order => order.orderStatus?.toLowerCase() === 'pending').length,
    received: filteredOrders.filter(order => order.orderStatus?.toLowerCase() === 'received').length,
  };

  // Dashboard Card Component
  const DashboardCard = ({ title, value, subtitle, icon, color }) => (
    <View style={[styles.dashboardCard, { borderLeftColor: color }]}>
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <Ionicons name={icon} size={20} color="#fff" />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardValue}>{value}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );

  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>{item.productId?.name || "Unnamed Product"}</Text>
          <View style={[styles.statusBadge, 
            { backgroundColor: 
              item.orderStatus?.toLowerCase() === 'completed' ? '#10b981' : 
              item.orderStatus?.toLowerCase() === 'received' ? '#3b82f6' : '#f59e0b' 
            }]}>
            <Text style={styles.statusText}>{item.orderStatus?.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.orderPrice}>KES {item.totalPrice?.toLocaleString()}</Text>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={14} color="#64748b" />
          <Text style={styles.detailText}>
            {item.userId?.fullName || item.userId?.full_name || "N/A"}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cube-outline" size={14} color="#64748b" />
          <Text style={styles.detailText}>Quantity: {item.quantity}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={14} color="#64748b" />
          <Text style={styles.detailText}>
            Payment: 
            <Text style={[
              styles.paymentStatus,
              { color: item.paymentStatus?.toLowerCase() === 'paid' ? '#10b981' : '#f59e0b' }
            ]}>
              {item.paymentStatus}
            </Text>
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.detailsButton]}
          onPress={() =>
            navigation.navigate("SupervisorOrderDetails", { orderId: item._id })
          }
        >
          <Ionicons name="eye-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>

        {item.orderStatus?.toLowerCase() === "received" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleMarkAsComplete(item._id)}
          >
            <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Mark Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a3a8f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Supervisor Orders</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#1a3a8f" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders by product, customer, status..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a3a8f" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Dashboard Stats */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Orders Overview</Text>
            <View style={styles.statsGrid}>
              <DashboardCard
                title="Total"
                value={stats.total}
                subtitle="All orders"
                icon="list"
                color="#1a3a8f"
              />
              <DashboardCard
                title="Completed"
                value={stats.completed}
                subtitle="Finished orders"
                icon="checkmark-done"
                color="#10b981"
              />
              <DashboardCard
                title="Received"
                value={stats.received}
                subtitle="Awaiting completion"
                icon="time"
                color="#3b82f6"
              />
              <DashboardCard
                title="Pending"
                value={stats.pending}
                subtitle="In progress"
                icon="hourglass"
                color="#f59e0b"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={styles.pdfButton} 
              onPress={handleGenerateReceipt}
              disabled={generatingReceipt}
            >
              {generatingReceipt ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                  <Text style={styles.pdfButtonText}>Generate Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Orders List */}
          <View style={styles.ordersSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {search ? "Search Results" : "All Orders"} ({filteredOrders.length})
              </Text>
            </View>

            {filteredOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons 
                  name={search ? "search-outline" : "cube-outline"} 
                  size={64} 
                  color="#cbd5e1" 
                />
                <Text style={styles.emptyStateTitle}>
                  {search ? "No Orders Found" : "No Orders Available"}
                </Text>
                <Text style={styles.emptyStateText}>
                  {search 
                    ? `No orders found for "${search}". Try a different search term.`
                    : "There are no orders to display at the moment."
                  }
                </Text>
                {search && (
                  <TouchableOpacity style={styles.emptyStateButton} onPress={clearSearch}>
                    <Text style={styles.emptyStateButtonText}>Clear Search</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8fafc" 
  },
  header: {
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a3a8f',
  },
  refreshButton: {
    padding: 4,
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
  statsSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  actionSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a3a8f',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  pdfButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
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
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  detailsButton: {
    backgroundColor: '#1a3a8f',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
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