// ./src/screens/FinanceHomeScreen.js
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
  Modal,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const { width, height } = Dimensions.get("window");

const ALL_ORDERS_URL = "https://spinners-backend-1.onrender.com/api/orders";
const UPDATE_PAYMENT_STATUS_URL = "https://spinners-backend-1.onrender.com/api/orders/update-payment-status";

export default function FinanceHomeScreen() {
  const navigation = useNavigation();
  const { logout } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [orderFilter, setOrderFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalPayments: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
  });

  const sidebarAnimation = useState(new Animated.Value(sidebarVisible ? 1 : 0))[0];

  useEffect(() => {
    Animated.timing(sidebarAnimation, {
      toValue: sidebarVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [sidebarVisible]);

  useEffect(() => {
    if (activeTab === "Orders") fetchOrders();
    else fetchSummaryOrders();
  }, [activeTab]);

  const toggleSidebar = () => setSidebarVisible(prev => !prev);
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarVisible(false);
  };

  const fetchSummaryOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(ALL_ORDERS_URL);
      if (res.data.success) {
        const fetchedOrders = res.data.orders || [];
        setOrders(fetchedOrders);

        const approved = fetchedOrders.filter((o) => o.paymentStatus === "approved").length;
        const rejected = fetchedOrders.filter((o) => o.paymentStatus === "rejected").length;
        const pending = fetchedOrders.filter((o) => o.paymentStatus === "pending").length;
        const totalPayments = fetchedOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

        setSummary({
          totalOrders: fetchedOrders.length,
          totalPayments,
          approved,
          rejected,
          pending,
        });
      }
    } catch {
      Alert.alert("Error", "Unable to fetch finance data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOrders = async (status = "all") => {
    setLoading(true);
    try {
      const res = await axios.get(ALL_ORDERS_URL);
      if (res.data.success) {
        let fetchedOrders = res.data.orders || [];
        if (status !== "all") fetchedOrders = fetchedOrders.filter((o) => o.paymentStatus === status);
        setOrders(fetchedOrders);
      } else setOrders([]);
    } catch {
      setOrders([]);
      Alert.alert("Error", "Unable to fetch orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === "Orders") fetchOrders(orderFilter);
    else fetchSummaryOrders();
  };

  const updatePaymentStatus = async (status) => {
    if (!selectedOrder) return;

    setUpdating(true);
    try {
      const { data } = await axios.put(
        `${UPDATE_PAYMENT_STATUS_URL}/${selectedOrder._id}`,
        { paymentStatus: status }
      );

      if (data.success) {
        Alert.alert("Success ✅", `Payment ${status} successfully!`);
        setModalVisible(false);
        onRefresh();
      }
    } catch {
      Alert.alert("Error", "Failed to update payment status");
    } finally {
      setUpdating(false);
    }
  };

  const generateReceiptPdf = async (order) => {
    try {
      setGeneratingReceipt(true);
      
      // Calculate unit price if not available
      const unitPrice = order.unitPrice || (order.totalPrice / (order.quantity || 1));
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Sales Receipt - ${order._id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 25px; 
              color: #333;
              background-color: #fff;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #1a3a8f; 
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name { 
              font-size: 32px; 
              font-weight: bold; 
              color: #1a3a8f; 
              margin-bottom: 8px;
            }
            .receipt-title { 
              font-size: 24px; 
              color: #333; 
              margin: 12px 0;
              font-weight: bold;
            }
            .receipt-subtitle {
              font-size: 16px;
              color: #666;
              margin-bottom: 10px;
            }
            .receipt-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 25px;
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .info-section {
              flex: 1;
            }
            .section { 
              margin: 25px 0; 
            }
            .section-title { 
              font-weight: bold; 
              color: #1a3a8f; 
              border-bottom: 2px solid #1a3a8f; 
              padding-bottom: 10px;
              margin-bottom: 20px;
              font-size: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 14px;
            }
            th {
              background-color: #1a3a8f;
              color: white;
              padding: 15px;
              text-align: left;
              border: 1px solid #ddd;
              font-weight: bold;
            }
            td {
              padding: 15px;
              border: 1px solid #ddd;
              vertical-align: top;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .total-row {
              background-color: #e8f4fd !important;
              font-weight: bold;
              font-size: 16px;
            }
            .grand-total-row {
              background-color: #1a3a8f !important;
              color: white;
              font-size: 18px;
              font-weight: bold;
            }
            .status-badge { 
              display: inline-block; 
              padding: 8px 16px; 
              border-radius: 6px; 
              color: white; 
              font-size: 14px;
              font-weight: bold;
            }
            .footer { 
              margin-top: 50px; 
              text-align: center; 
              color: #666; 
              font-size: 14px;
              border-top: 2px solid #ddd;
              padding-top: 25px;
              line-height: 1.6;
            }
            .signature-area {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              text-align: center;
              width: 45%;
            }
            .signature-line {
              border-top: 2px solid #333;
              margin: 50px 0 15px 0;
              width: 100%;
            }
            .amount-highlight {
              font-size: 24px;
              font-weight: bold;
              color: #059669;
              text-align: center;
              background: #f0fdf4;
              padding: 20px;
              border-radius: 8px;
              margin: 15px 0;
              border: 2px solid #059669;
            }
            .notes-box {
              background: #fff7ed;
              padding: 20px;
              border-radius: 8px;
              margin: 15px 0;
              border-left: 6px solid #f59e0b;
              font-size: 14px;
              line-height: 1.5;
            }
            .customer-info {
              background: #f0f9ff;
              padding: 20px;
              border-radius: 8px;
              margin: 15px 0;
              border-left: 6px solid #0ea5e9;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 5px 0;
            }
            .info-label {
              font-weight: bold;
              color: #1e293b;
            }
            .info-value {
              color: #475569;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">ARTISAN SUPPLY CO.</div>
            <div class="receipt-title">SALES RECEIPT</div>
            <div class="receipt-subtitle">Goods Purchase Confirmation</div>
          </div>

          <div class="receipt-info">
            <div class="info-section">
              <table>
                <tr><td><strong>Receipt No:</strong></td><td>SR-${order._id.substring(0, 8).toUpperCase()}</td></tr>
                <tr><td><strong>Issue Date:</strong></td><td>${new Date().toLocaleDateString()}</td></tr>
                <tr><td><strong>Time:</strong></td><td>${new Date().toLocaleTimeString()}</td></tr>
              </table>
            </div>
            <div class="info-section">
              <table>
                <tr><td><strong>Order ID:</strong></td><td>${order._id}</td></tr>
                <tr><td><strong>Order Date:</strong></td><td>${new Date(order.createdAt).toLocaleDateString()}</td></tr>
                <tr><td><strong>Payment Status:</strong></td>
                  <td>
                    <span class="status-badge" style="background-color: ${getPaymentStatusColor(order.paymentStatus)};">
                      ${getStatusText(order.paymentStatus)}
                    </span>
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <div class="customer-info">
            <div class="info-row">
              <span class="info-label">Customer Name:</span>
              <span class="info-value">${order.userId?.fullName || "Customer"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Customer Email:</span>
              <span class="info-value">${order.userId?.email || order.userEmail || "N/A"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Order Type:</span>
              <span class="info-value">${order.orderType === 'inventory' ? 'Inventory Purchase' : 'Goods Purchase'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">PRODUCT DETAILS</div>
            <table>
              <thead>
                <tr>
                  <th>Product Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>${order.productId?.name || "Product"}</strong>
                    ${order.productId?.description ? `<br><small>${order.productId.description}</small>` : ''}
                  </td>
                  <td>${order.quantity || 1} ${order.quantity > 1 ? 'units' : 'unit'}</td>
                  <td>${formatCurrency(unitPrice)}</td>
                  <td>${formatCurrency(order.totalPrice)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; padding-right: 20px;"><strong>SUBTOTAL:</strong></td>
                  <td><strong>${formatCurrency(order.totalPrice)}</strong></td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; padding-right: 20px;"><strong>TAX (0%):</strong></td>
                  <td><strong>${formatCurrency(0)}</strong></td>
                </tr>
                <tr class="grand-total-row">
                  <td colspan="3" style="text-align: right; padding-right: 20px;"><strong>GRAND TOTAL:</strong></td>
                  <td><strong>${formatCurrency(order.totalPrice)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="amount-highlight">
            TOTAL AMOUNT PAID: ${formatCurrency(order.totalPrice)}
          </div>

          <div class="section">
            <div class="section-title">PAYMENT INFORMATION</div>
            <table>
              <tr>
                <td style="width: 30%;"><strong>Payment Method:</strong></td>
                <td style="width: 70%;">${getPaymentMethodText(order.paymentMethod || "cash")}</td>
              </tr>
              <tr>
                <td><strong>Payment Date:</strong></td>
                <td>${order.paidAt ? new Date(order.paidAt).toLocaleDateString() : 'Pending'}</td>
              </tr>
              <tr>
                <td><strong>Transaction Reference:</strong></td>
                <td>TX-${order._id.substring(0, 8).toUpperCase()}</td>
              </tr>
              <tr>
                <td><strong>Order Status:</strong></td>
                <td>
                  <span class="status-badge" style="background-color: ${getOrderStatusColor(order.orderStatus)};">
                    ${getStatusText(order.orderStatus)}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          ${order.notes ? `
          <div class="notes-box">
            <strong>Additional Notes:</strong><br>
            ${order.notes}
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">TERMS & CONDITIONS</div>
            <div style="font-size: 12px; color: #666; line-height: 1.5;">
              <p>1. This receipt is proof of purchase and should be retained for reference.</p>
              <p>2. Goods sold are non-refundable unless otherwise specified.</p>
              <p>3. For any queries regarding this purchase, contact our customer service.</p>
              <p>4. Prices include all applicable taxes where shown.</p>
            </div>
          </div>

          <div class="signature-area">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div style="font-weight: bold; margin-top: 10px;">Customer's Signature</div>
              <div>${order.userId?.fullName || "Customer"}</div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">Date: ${new Date().toLocaleDateString()}</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div style="font-weight: bold; margin-top: 10px;">Authorized Signature</div>
              <div>Artisan Supply Co.</div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">Date: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="footer">
            <p><strong>ARTISAN SUPPLY CO.</strong> - Quality Products & Reliable Service</p>
            <p>📍 Nairobi, Kenya | 📞 +254 700 000 000 | 📧 sales@artisansupply.co</p>
            <p>This is an official computer-generated receipt. No physical signature required.</p>
            <p>Thank you for your business! We appreciate your trust in us.</p>
            <p style="margin-top: 15px; font-size: 12px;">Generated on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ 
        html: htmlContent,
        base64: false
      });
      
      // Share the PDF directly
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Sales Receipt - Order ${order._id.substring(0, 8)}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert("Success", `Sales receipt generated successfully!\n\nFile: ${uri}`);
      }
      
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert("Error", "Failed to generate sales receipt. Please try again.");
    } finally {
      setGeneratingReceipt(false);
    }
  };

  // Helper functions for receipt generation
  const getPaymentStatusColor = (status) => {
    const colors = {
      'approved': '#22c55e',
      'paid': '#10b981',
      'pending': '#f59e0b',
      'rejected': '#ef4444',
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  };

  const getOrderStatusColor = (status) => {
    const colors = {
      'approved': '#22c55e',
      'completed': '#10b981',
      'pending': '#f59e0b',
      'cancelled': '#ef4444',
      'rejected': '#ef4444',
      'shipped': '#3b82f6',
      'delivered': '#10b981',
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  };

  const getStatusText = (status) => {
    if (!status) return 'Pending';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getPaymentMethodText = (method) => {
    const methods = {
      'bank_transfer': 'Bank Transfer',
      'cash': 'Cash',
      'check': 'Check',
      'digital': 'Digital Payment',
      'mobile_money': 'Mobile Money',
      'credit_card': 'Credit Card',
      'debit_card': 'Debit Card',
      'other': 'Other'
    };
    return methods[method] || method;
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "KSh 0.00";
    return `KSh ${parseFloat(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: logout, style: "destructive" },
    ]);
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const navigateToInventoryOrders = () => {
    navigation.navigate("FinanceInventoryOrderScreen");
    setSidebarVisible(false);
  };

  const SidebarItem = ({ title, onPress, icon }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.sidebarItem, activeTab === title && styles.activeSidebarItem]}
    >
      <Ionicons name={icon} size={20} color={activeTab === title ? "#1a3a8f" : "#fff"} style={styles.sidebarIcon} />
      <Text style={[styles.sidebarText, activeTab === title && styles.activeSidebarText]}>{title}</Text>
    </TouchableOpacity>
  );

  const renderOrder = ({ item }) => {
    const paymentColor = {
      approved: "#4caf50",
      pending: "#ff9800",
      rejected: "#f44336"
    }[item.paymentStatus] || "#ff9800";

    return (
      <Animated.View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title}>{item.productId?.name || "Unnamed Product"}</Text>
          <View style={[styles.statusBadge, { backgroundColor: paymentColor }]}>
            <Text style={styles.statusText}>{item.paymentStatus?.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#666" />
            <Text style={styles.infoText}>{item.userId?.fullName || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.infoText}>Amount: {item.totalPrice} KES</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="bag-handle-outline" size={16} color="#666" />
            <Text style={styles.infoText}>Status: {item.orderStatus}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cube-outline" size={16} color="#666" />
            <Text style={styles.infoText}>Type: {item.orderType === 'inventory' ? 'Inventory' : 'Goods'}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.detailsBtn} onPress={() => openDetails(item)}>
            <Text style={styles.detailsText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.receiptBtn}
            onPress={() => generateReceiptPdf(item)}
            disabled={generatingReceipt}
          >
            {generatingReceipt ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={16} color="#fff" />
                <Text style={styles.receiptText}>Receipt</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const sidebarTranslateX = sidebarAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-250, 0]
  });

  // Dashboard Content Component
  const DashboardContent = () => (
    <ScrollView 
      style={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Finance Dashboard</Text>
        <Text style={styles.welcomeSubtitle}>Welcome to Payment Management System</Text>
      </View>

      {/* Summary Cards Grid */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.totalCard]}>
          <View style={styles.summaryIcon}>
            <Ionicons name="bar-chart-outline" size={32} color="#1a3a8f" />
          </View>
          <Text style={styles.summaryValue}>{summary.totalOrders}</Text>
          <Text style={styles.summaryLabel}>Total Orders</Text>
        </View>

        <View style={[styles.summaryCard, styles.approvedCard]}>
          <View style={styles.summaryIcon}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#4caf50" />
          </View>
          <Text style={styles.summaryValue}>{summary.approved}</Text>
          <Text style={styles.summaryLabel}>Approved Payments</Text>
        </View>

        <View style={[styles.summaryCard, styles.pendingCard]}>
          <View style={styles.summaryIcon}>
            <Ionicons name="time-outline" size={32} color="#ff9800" />
          </View>
          <Text style={styles.summaryValue}>{summary.pending}</Text>
          <Text style={styles.summaryLabel}>Pending Payments</Text>
        </View>

        <View style={[styles.summaryCard, styles.rejectedCard]}>
          <View style={styles.summaryIcon}>
            <Ionicons name="close-circle-outline" size={32} color="#f44336" />
          </View>
          <Text style={styles.summaryValue}>{summary.rejected}</Text>
          <Text style={styles.summaryLabel}>Rejected Payments</Text>
        </View>
      </View>

      {/* Total Revenue Card */}
      <View style={[styles.revenueCard, styles.summaryCard]}>
        <View style={styles.revenueHeader}>
          <Ionicons name="cash-outline" size={28} color="#1a3a8f" />
          <Text style={styles.revenueTitle}>Total Revenue</Text>
        </View>
        <Text style={styles.revenueAmount}>KES {summary.totalPayments.toLocaleString()}</Text>
        <Text style={styles.revenueSubtitle}>Total processed payments</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleTabChange("Orders")}
          >
            <Ionicons name="list-outline" size={32} color="#1a3a8f" />
            <Text style={styles.actionText}>Manage Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={navigateToInventoryOrders}
          >
            <Ionicons name="cube-outline" size={32} color="#1a3a8f" />
            <Text style={styles.actionText}>Inventory Orders</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate("Help")}
          >
            <Ionicons name="help-circle-outline" size={32} color="#1a3a8f" />
            <Text style={styles.actionText}>Get Help</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Company Information */}
      <View style={styles.companySection}>
        <Text style={styles.sectionTitle}>About Spinners Web Kenya</Text>
        <View style={styles.companyCard}>
          <Ionicons name="business-outline" size={48} color="#1a3a8f" style={styles.companyIcon} />
          <Text style={styles.companyDescription}>
            Spinners Web Kenya is a leading technology company specializing in web development, 
            mobile applications, and digital solutions. We empower businesses with cutting-edge 
            technology to drive growth and innovation.
          </Text>
          
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={20} color="#1a3a8f" />
              <Text style={styles.contactText}>+254 700 000 000</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={20} color="#1a3a8f" />
              <Text style={styles.contactText}>info@spinnersweb.co.ke</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="location-outline" size={20} color="#1a3a8f" />
              <Text style={styles.contactText}>Nairobi, Kenya</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.recentActivity}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          {orders.slice(0, 3).map((order, index) => (
            <View key={order._id} style={styles.activityItem}>
              <View style={styles.activityLeft}>
                <View style={[styles.activityIcon, 
                  { backgroundColor: order.paymentStatus === 'approved' ? '#4caf50' : 
                    order.paymentStatus === 'rejected' ? '#f44336' : '#ff9800' }]}>
                  <Ionicons 
                    name={order.paymentStatus === 'approved' ? 'checkmark' : 
                      order.paymentStatus === 'rejected' ? 'close' : 'time'} 
                    size={16} 
                    color="#fff" 
                  />
                </View>
                <View>
                  <Text style={styles.activityTitle}>{order.productId?.name || "Unnamed Product"}</Text>
                  <Text style={styles.activitySubtitle}>{order.userId?.fullName || "N/A"}</Text>
                </View>
              </View>
              <Text style={styles.activityAmount}>KES {order.totalPrice}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        backgroundColor="#1a3a8f" 
        barStyle="light-content" 
        translucent={false}
      />
      <View style={styles.mainContainer}>
        {/* Sidebar */}
        <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarTranslateX }] }]}>
          <View style={styles.sidebarHeader}>
            <View style={styles.avatar}><Ionicons name="business" size={32} color="#fff" /></View>
            <Text style={styles.sidebarTitle}>Finance Dashboard</Text>
            <Text style={styles.sidebarSubtitle}>Payment Management</Text>
          </View>
          <View style={styles.sidebarMenu}>
            <SidebarItem title="Dashboard" onPress={() => handleTabChange("Dashboard")} icon="speedometer-outline" />
            <SidebarItem title="Orders" onPress={() => handleTabChange("Orders")} icon="list-outline" />
            <SidebarItem title="Inventory Orders" onPress={navigateToInventoryOrders} icon="cube-outline" />
            <SidebarItem title="Help" onPress={() => navigation.navigate("Help")} icon="help-circle-outline" />
            <SidebarItem title="About Us" onPress={() => navigation.navigate("About")} icon="information-circle-outline" />
            <SidebarItem title="Contact Us" onPress={() => navigation.navigate("Contact")} icon="chatbubble-ellipses-outline" />
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Main Content */}
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
              <Ionicons name={sidebarVisible ? "close" : "menu"} size={28} color="#1a3a8f" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{activeTab === "Dashboard" ? "Finance Overview" : "Order Management"}</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Dashboard Content */}
          {activeTab === "Dashboard" && <DashboardContent />}

          {/* Orders Tab */}
          {activeTab === "Orders" && (
            <View style={styles.ordersContainer}>
              <View style={styles.filterContainer}>
                {["all", "approved", "pending", "rejected"].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.filterTab, orderFilter === status && styles.activeFilterTab]}
                    onPress={() => { setOrderFilter(status); fetchOrders(status); }}
                  >
                    <Text style={[styles.filterTabText, orderFilter === status && styles.activeFilterTabText]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                    <View style={[styles.filterIndicator, orderFilter === status && styles.activeFilterIndicator]} />
                  </TouchableOpacity>
                ))}
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1a3a8f" />
                  <Text style={styles.loadingText}>Loading orders...</Text>
                </View>
              ) : (
                <FlatList
                  data={orders}
                  keyExtractor={(item) => item._id}
                  renderItem={renderOrder}
                  contentContainerStyle={styles.ordersList}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Ionicons name="document-text-outline" size={64} color="#ccc" />
                      <Text style={styles.emptyStateText}>No {orderFilter} orders found</Text>
                    </View>
                  }
                />
              )}
            </View>
          )}
        </View>

        {/* Order Details Modal */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order Details</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#1a3a8f" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.detailsSection}>
                {selectedOrder && (
                  <>
                    <View style={styles.detailRow}>
                      <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>Product</Text>
                        <Text style={styles.detailValue}>{selectedOrder.productId?.name || "N/A"}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>User</Text>
                        <Text style={styles.detailValue}>{selectedOrder.userId?.fullName || "N/A"}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>Amount</Text>
                        <Text style={styles.detailValue}>{selectedOrder.totalPrice} KES</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>Order Status</Text>
                        <Text style={styles.detailValue}>{selectedOrder.orderStatus}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>Payment Status</Text>
                        <Text style={styles.detailValue}>{selectedOrder.paymentStatus}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>Order Type</Text>
                        <Text style={styles.detailValue}>{selectedOrder.orderType === 'inventory' ? 'Inventory' : 'Goods Purchase'}</Text>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionButtonModal, styles.approveButton]}
                  onPress={() => updatePaymentStatus("approved")}
                  disabled={updating}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButtonModal, styles.rejectButton]}
                  onPress={() => updatePaymentStatus("rejected")}
                  disabled={updating}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButtonModal, styles.receiptButton]}
                  onPress={() => generateReceiptPdf(selectedOrder)}
                  disabled={generatingReceipt}
                >
                  {generatingReceipt ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="document-text-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Receipt</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a3a8f',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // Sidebar Styles
  sidebar: {
    width: 250,
    backgroundColor: '#1a3a8f',
    paddingVertical: 40,
    paddingHorizontal: 20,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  sidebarHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  sidebarSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  sidebarMenu: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 4,
    borderRadius: 10,
  },
  activeSidebarItem: {
    backgroundColor: '#fff',
  },
  sidebarIcon: {
    marginRight: 12,
  },
  sidebarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  activeSidebarText: {
    color: '#1a3a8f',
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // Removed fixed height to let it adjust naturally
  },
  menuButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a3a8f',
  },
  headerSpacer: {
    width: 28,
  },
  // Dashboard Styles
  scrollContent: {
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  summaryCard: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  totalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1a3a8f',
  },
  approvedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  rejectedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  summaryIcon: {
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  revenueCard: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 16,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#1a3a8f',
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  revenueTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a3a8f',
    marginBottom: 8,
  },
  revenueSubtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  quickActions: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  actionText: {
    marginTop: 8,
    color: '#1a3a8f',
    fontWeight: '500',
  },
  companySection: {
    marginBottom: 30,
  },
  companyCard: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  companyIcon: {
    marginBottom: 15,
  },
  companyDescription: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  contactInfo: {
    width: '100%',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  recentActivity: {
    marginBottom: 30,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a3a8f',
  },
  // Orders Styles
  ordersContainer: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  activeFilterTab: {
    // Active state handled by indicator
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeFilterTabText: {
    color: '#1a3a8f',
    fontWeight: '600',
  },
  filterIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: 'transparent',
    borderRadius: 2,
  },
  activeFilterIndicator: {
    backgroundColor: '#1a3a8f',
  },
  ordersList: {
    padding: 15,
  },
  // Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    marginLeft: 8,
    color: '#64748b',
    fontSize: 14,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  detailsBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a3a8f',
    paddingVertical: 10,
    borderRadius: 8,
  },
  detailsText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 5,
  },
  receiptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 5,
  },
  receiptText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: height * 0.4,
  },
  detailsSection: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailText: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  actionButtonModal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  approveButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  receiptButton: {
    backgroundColor: '#7c3aed',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
});