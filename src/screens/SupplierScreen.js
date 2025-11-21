// ./src/screens/SupplierScreen.js
import React, { useState, useEffect, useContext } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, Modal, ScrollView, RefreshControl, Dimensions, TextInput } from "react-native";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const API_BASE_URL = "https://spinners-backend-1.onrender.com/api";
const { width, height } = Dimensions.get('window');

export default function SupplierScreen() {
  const { token, user, logout } = useContext(AuthContext);
  const navigation = useNavigation();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentConfirmationModal, setShowPaymentConfirmationModal] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order => 
        order._id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.productId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.artisanId?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.artisanId?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderStatus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.paymentStatus?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrders(filtered);
    }
  }, [searchQuery, orders]);

  const openSidebar = () => {
    setSidebarVisible(true);
  };

  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  const toggleSidebar = () => {
    if (sidebarVisible) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  const handleBackdropPress = () => closeSidebar();
  const handleLogout = async () => { closeSidebar(); await logout(); };

  const navigateToScreen = (screenName) => {
    closeSidebar();
    const screenMap = { 'Dashboard': 'SupplierDashboard', 'Orders': 'Orders', 'About': 'About', 'Help': 'Help', 'Contact': 'Contact' };
    navigation.navigate(screenMap[screenName] || screenName);
  };

  const fetchSupplierOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/orders/supplier/my-orders`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const fetchedOrders = res.data.orders || [];
      setOrders(fetchedOrders);
      setFilteredOrders(fetchedOrders);
    } catch (err) {
      if (err.response?.status === 404) {
        fetchAllOrdersAsSupplier();
      } else {
        Alert.alert("Error", `Failed to fetch orders: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  const fetchAllOrdersAsSupplier = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const supplierOrders = res.data.orders?.filter(order => 
        order.supplierId?._id === user._id || order.supplierId === user._id
      ) || [];
      setOrders(supplierOrders);
      setFilteredOrders(supplierOrders);
    } catch (err) {
      Alert.alert("Error", "Failed to load your orders. Please try again.");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await fetchSupplierOrders();
    } catch (error) {
      console.error("❌ Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); setSearchQuery(""); loadData(); };

  const updateOrderStatus = async (orderId, newStatus, notes = "") => {
    try {
      setLoading(true);
      const response = await axios.put(`${API_BASE_URL}/orders/update-status/${orderId}`,
        { status: newStatus, notes: notes || undefined },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      Alert.alert("Success", `Order marked as ${newStatus}`);
      loadData();
      setShowDeliveryModal(false);
      setShowOrderDetails(false);
    } catch (err) {
      Alert.alert("Update Failed", err.response?.data?.message || "Failed to update order status.");
    } finally {
      setLoading(false);
    }
  };

  const markAsDelivered = async (orderId) => {
    try {
      setLoading(true);
      await axios.put(`${API_BASE_URL}/orders/mark-complete/${orderId}`, {},
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      Alert.alert("Success", "Order marked as delivered!");
      loadData();
      setShowDeliveryModal(false);
    } catch (err) {
      if (err.response?.status === 404) {
        await updateOrderStatus(orderId, 'delivered');
      } else {
        Alert.alert("Error", "Failed to mark order as delivered. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // NEW: Supervisor confirm payment received
  const confirmPaymentReceived = async (orderId) => {
    try {
      setLoading(true);
      const response = await axios.put(`${API_BASE_URL}/orders/update-payment-status/${orderId}`,
        { paymentStatus: "paid" },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      
      Alert.alert("Success", "Payment confirmed as received!");
      loadData();
      setShowPaymentConfirmationModal(false);
      setShowOrderDetails(false);
    } catch (err) {
      console.error("❌ Confirm payment error:", err.response?.data);
      Alert.alert("Error", err.response?.data?.message || "Failed to confirm payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: Submit payment amount for received orders with KSH validation and duplicate prevention
  const submitPaymentAmount = async () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
      Alert.alert("Error", "Please enter a valid payment amount in KSH");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > 50000) {
      Alert.alert("Error", "Payment amount cannot exceed KSH 50,000");
      return;
    }

    if (amount < 0) {
      Alert.alert("Error", "Payment amount cannot be negative");
      return;
    }

    // Check if payment is already submitted
    if (selectedOrder?.paymentStatus === 'pending' && selectedOrder?.totalPrice > 0) {
      Alert.alert("Payment Already Submitted", "Payment amount has already been submitted and is pending finance approval.");
      setShowPaymentModal(false);
      return;
    }

    try {
      setLoading(true);
      const paymentData = {
        amount: amount,
        notes: paymentNotes || undefined,
        paymentStatus: "pending",
        currency: "KSH"
      };

      const response = await axios.put(`${API_BASE_URL}/orders/${selectedOrder._id}/payment`,
        paymentData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      console.log("✅ Payment amount submitted:", response.data);
      Alert.alert("Success", "Payment amount submitted for finance approval!");
      
      // Reset and refresh
      setPaymentAmount("");
      setPaymentNotes("");
      setShowPaymentModal(false);
      setShowOrderDetails(false);
      loadData();
      
    } catch (err) {
      console.error("❌ Submit payment error:", err);
      Alert.alert("Error", "Failed to submit payment amount. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateReceipt = async (order) => {
    try {
      setGeneratingReceipt(true);
      const htmlContent = `
        <!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt - Order ${order._id}</title><style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .company { font-size: 24px; font-weight: bold; color: #059669; }
        .section { margin: 20px 0; }
        .section-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
        .row { display: flex; justify-content: space-between; margin: 5px 0; }
        .label { font-weight: bold; }
        .total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
        .status { padding: 5px 10px; border-radius: 10px; color: white; display: inline-block; }
        </style></head><body>
        <div class="header"><div class="company">ARTISAN SUPPLY CO.</div><div>SUPPLY ORDER RECEIPT</div><div>Date: ${new Date().toLocaleDateString()}</div></div>
        <div class="section"><div class="section-title">Order Information</div>
        <div class="row"><span class="label">Order ID:</span><span>${order._id}</span></div>
        <div class="row"><span class="label">Order Date:</span><span>${new Date(order.createdAt).toLocaleString()}</span></div>
        <div class="row"><span class="label">Status:</span><span class="status" style="background-color: ${getStatusColor(order.orderStatus)};">${getStatusText(order.orderStatus)}</span></div>
        <div class="row"><span class="label">Payment Status:</span><span class="status" style="background-color: ${getPaymentStatusColor(order.paymentStatus)};">${getStatusText(order.paymentStatus)}</span></div></div>
        <div class="section"><div class="section-title">Supplier Details</div>
        <div class="row"><span class="label">Name:</span><span>${user?.fullName || 'Supplier'}</span></div>
        <div class="row"><span class="label">Email:</span><span>${user?.email || 'N/A'}</span></div></div>
        <div class="section"><div class="section-title">Artisan Details</div>
        <div class="row"><span class="label">Name:</span><span>${order.artisanId?.fullName || order.userId?.fullName || 'Artisan'}</span></div>
        <div class="row"><span class="label">Email:</span><span>${order.artisanId?.email || order.userId?.email || 'N/A'}</span></div></div>
        <div class="section"><div class="section-title">Order Items</div>
        <div class="row"><span class="label">Product:</span><span>${order.productId?.name || 'Product'}</span></div>
        <div class="row"><span class="label">Quantity:</span><span>${order.quantity} units</span></div>
        <div class="row"><span class="label">Unit Price:</span><span>KSH ${order.productId?.price || 0}</span></div>
        <div class="total"><span class="label">Total Amount:</span><span>KSH ${order.totalPrice || 0}</span></div></div>
        <div class="footer"><p>Thank you for your business!</p><p>Artisan Supply Co. - Quality Supplies for Artisans</p><p>Generated on: ${new Date().toLocaleString()}</p></div>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Receipt - Order ${order._id}` });
      } else {
        Alert.alert("Success", "Receipt generated successfully!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to generate receipt. Please try again.");
    } finally {
      setGeneratingReceipt(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { 
      'completed': '#10b981', 'delivered': '#10b981', 'received': '#10b981', 
      'pending': '#f59e0b', 'processing': '#3b82f6', 'approved': '#3b82f6', 
      'cancelled': '#ef4444', 'rejected': '#ef4444', 'shipped': '#8b5cf6' 
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'paid': '#10b981',
      'approved': '#22c55e',
      'pending': '#f59e0b',
      'rejected': '#ef4444',
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  };

  const getStatusText = (status) => !status ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1);

  // UPDATED: Check if payment can be submitted (not already submitted)
  const canSubmitPayment = (order) => {
    const status = order.orderStatus?.toLowerCase();
    const paymentStatus = order.paymentStatus?.toLowerCase();
    
    // Only allow payment submission for delivered/received orders that don't have pending payment
    const validStatus = ['delivered', 'received', 'completed'].includes(status);
    const noPendingPayment = paymentStatus !== 'pending' || order.totalPrice <= 0;
    
    return validStatus && noPendingPayment;
  };

  // NEW: Check if supervisor can confirm payment
  const canConfirmPayment = (order) => {
    const paymentStatus = order.paymentStatus?.toLowerCase();
    const userRole = user?.role;
    
    // Only supervisors can confirm payment, and only for orders with pending payment status
    return userRole === 'supervisor' && paymentStatus === 'pending' && order.totalPrice > 0;
  };

  const getActionButtons = (order) => {
    const status = order.orderStatus?.toLowerCase();
    const paymentStatus = order.paymentStatus?.toLowerCase();
    
    const buttons = {
      'pending': [
        { text: 'Approve', style: styles.approveButton, action: () => updateOrderStatus(order._id, 'approved') },
        { text: 'Reject', style: styles.rejectButton, action: () => updateOrderStatus(order._id, 'rejected') }
      ],
      'approved': [
        { text: 'Start Processing', style: styles.processButton, action: () => updateOrderStatus(order._id, 'processing') }
      ],
      'processing': [
        { text: 'Mark as Shipped', style: styles.shipButton, action: () => updateOrderStatus(order._id, 'shipped') }
      ],
      'shipped': [
        { text: 'Mark Delivered', style: styles.deliverButton, action: () => { setSelectedOrder(order); setShowDeliveryModal(true); } }
      ],
      'delivered': [
        { text: '📄 Receipt', style: styles.receiptButton, action: () => generateReceipt(order) },
        ...(canSubmitPayment(order) ? [{ text: 'Submit Payment', style: styles.paymentButton, action: () => { setSelectedOrder(order); setShowPaymentModal(true); } }] : [])
      ],
      'received': [
        { text: '📄 Receipt', style: styles.receiptButton, action: () => generateReceipt(order) },
        ...(canSubmitPayment(order) ? [{ text: 'Submit Payment', style: styles.paymentButton, action: () => { setSelectedOrder(order); setShowPaymentModal(true); } }] : [])
      ],
      'completed': [
        { text: '📄 Receipt', style: styles.receiptButton, action: () => generateReceipt(order) }
      ]
    };

    const statusButtons = buttons[status] || [];
    
    // NEW: Add supervisor payment confirmation button
    if (canConfirmPayment(order)) {
      statusButtons.push({
        text: '✅ Confirm Payment',
        style: styles.confirmPaymentButton,
        action: () => { setSelectedOrder(order); setShowPaymentConfirmationModal(true); }
      });
    }

    if (!statusButtons.length) return null;

    return (
      <View style={styles.actionButtons}>
        {statusButtons.map((btn, index) => (
          <TouchableOpacity key={index} style={[styles.actionButton, btn.style]} onPress={btn.action} disabled={loading}>
            <Text style={styles.actionButtonText}>{loading && !btn.text.includes('📄') && !btn.text.includes('✅') ? '...' : btn.text}</Text>
          </TouchableOpacity>
        ))}
        
        {/* Payment status indicator */}
        {(paymentStatus === 'pending' && order.totalPrice > 0) && (
          <Text style={styles.paymentPendingText}>💰 Payment Pending Approval</Text>
        )}
        {paymentStatus === 'approved' && (
          <Text style={styles.paymentApprovedText}>✅ Payment Approved</Text>
        )}
        {paymentStatus === 'paid' && (
          <Text style={styles.paymentPaidText}>💳 Payment Received</Text>
        )}
      </View>
    );
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => { setSelectedOrder(item); setShowOrderDetails(true); }}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order: {item._id?.substring(0, 8)}...</Text>
          <Text style={styles.productName}>{item.productId?.name || "Product"}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.orderStatus) }]}>
          <Text style={styles.statusText}>{getStatusText(item.orderStatus)}</Text>
        </View>
      </View>
      <View style={styles.orderDetails}>
        <Text style={styles.quantity}>Quantity: <Text style={styles.bold}>{item.quantity}</Text></Text>
        <View style={styles.customerInfo}>
          <Text style={styles.customerLabel}>Artisan:</Text>
          <Text style={styles.customerName}>{item.artisanId?.fullName || item.artisanId?.email || item.userId?.fullName || "Artisan"}</Text>
        </View>
        {item.totalPrice > 0 && <Text style={styles.price}>💰 Total: KSH {item.totalPrice}</Text>}
        {item.paymentStatus && item.paymentStatus !== 'pending' && (
          <Text style={[styles.paymentStatus, { color: getPaymentStatusColor(item.paymentStatus) }]}>
            Payment: {getStatusText(item.paymentStatus)}
          </Text>
        )}
        <Text style={styles.orderDate}>📅 {new Date(item.createdAt).toLocaleString()}</Text>
      </View>
      {getActionButtons(item)}
    </TouchableOpacity>
  );

  const pendingOrders = filteredOrders.filter(order => order.orderStatus === 'pending').length;
  const processingOrders = filteredOrders.filter(order => ['approved', 'processing', 'shipped'].includes(order.orderStatus)).length;
  const completedOrders = filteredOrders.filter(order => ['completed', 'delivered', 'received'].includes(order.orderStatus)).length;
  const pendingPayments = filteredOrders.filter(order => order.paymentStatus === 'pending' && order.totalPrice > 0).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}><Text style={styles.menuIcon}>☰</Text></TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Supplier Dashboard</Text>
          <Text style={styles.subtitle}>Manage your supply requests and deliveries</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={loading}>
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Sidebar */}
      {sidebarVisible && (
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayTouchable} onPress={handleBackdropPress} activeOpacity={1}/>
        </View>
      )}
      {sidebarVisible && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarUserInfo}>
              <View style={styles.userAvatar}><Text style={styles.userAvatarText}>{user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'S'}</Text></View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user?.fullName || 'Supplier'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <Text style={styles.userRole}>{user?.role}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeSidebar} style={styles.closeSidebarButton}><Text style={styles.closeSidebarText}>×</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false} contentContainerStyle={styles.sidebarContentContainer}>
            {[['MAIN MENU', [['📊','Dashboard'],['📦','Orders']]], ['SUPPORT', [['ℹ️','About'],['❓','Help'],['📞','Contact']]]].map(([title, items], idx) => (
              <View key={idx} style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>{title}</Text>
                {items.map(([icon, text], i) => (
                  <TouchableOpacity key={i} style={styles.sidebarItem} onPress={() => navigateToScreen(text)}>
                    <Text style={styles.sidebarIcon}>{icon}</Text>
                    <Text style={styles.sidebarText}>{text}</Text>
                    {text === 'Orders' && <View style={styles.orderBadge}><Text style={styles.orderBadgeText}>{orders.length}</Text></View>}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
          <View style={styles.sidebarFooter}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput style={styles.searchInput} placeholder="Search orders..." value={searchQuery} onChangeText={setSearchQuery} clearButtonMode="while-editing" placeholderTextColor="#94a3b8" />
          {searchQuery.length > 0 && <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery("")}><Text style={styles.clearSearchText}>✕</Text></TouchableOpacity>}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {[
          { number: pendingOrders, label: 'Pending' },
          { number: processingOrders, label: 'In Progress' },
          { number: completedOrders, label: 'Completed' },
          { number: pendingPayments, label: 'Pending Payments' },
          { number: filteredOrders.length, label: 'Total' }
        ].map((stat, idx) => (
          <View key={idx} style={styles.statCard}>
            <Text style={styles.statNumber}>{stat.number}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Orders List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Supply Requests</Text>
          <View style={styles.sectionHeaderRight}>
            {searchQuery.length > 0 && <Text style={styles.searchResultsText}>{filteredOrders.length} of {orders.length} orders</Text>}
            <Text style={styles.ordersCount}>{filteredOrders.length} orders</Text>
          </View>
        </View>

        {loading && orders.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1a3a8f" />
            <Text style={styles.loadingText}>Loading your orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>{searchQuery.length > 0 ? 'No matching orders found' : 'No supply requests yet'}</Text>
            <Text style={styles.emptyStateText}>{searchQuery.length > 0 ? 'Try adjusting your search terms' : 'You will see orders here when artisans request supplies from you.'}</Text>
            <TouchableOpacity style={styles.emptyStateButton} onPress={searchQuery.length > 0 ? () => setSearchQuery("") : onRefresh}>
              <Text style={styles.emptyStateButtonText}>{searchQuery.length > 0 ? 'Clear Search' : 'Refresh'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList 
            data={filteredOrders} 
            renderItem={renderOrderItem} 
            keyExtractor={(item) => item._id} 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1a3a8f"]} />}
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.ordersList} 
          />
        )}
      </View>

      {/* Order Details Modal */}
      <Modal visible={showOrderDetails} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity onPress={() => setShowOrderDetails(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          {selectedOrder && (
            <ScrollView style={styles.modalContent}>
              {['Order ID', 'Product', 'Quantity', 'Artisan', 'Order Status', 'Payment Status', 'Order Date'].map((label, idx) => (
                <View key={idx} style={styles.detailSection}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  {label === 'Order Status' ? (
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.orderStatus) }]}>
                      <Text style={styles.statusText}>{getStatusText(selectedOrder.orderStatus)}</Text>
                    </View>
                  ) : label === 'Payment Status' ? (
                    <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(selectedOrder.paymentStatus) }]}>
                      <Text style={styles.statusText}>{getStatusText(selectedOrder.paymentStatus)}</Text>
                    </View>
                  ) : label === 'Product' ? (
                    <>
                      <Text style={styles.detailValue}>{selectedOrder.productId?.name || "Product"}</Text>
                      <Text style={styles.detailSubtext}>Category: {selectedOrder.productId?.category || 'N/A'}</Text>
                    </>
                  ) : label === 'Artisan' ? (
                    <>
                      <Text style={styles.detailValue}>{selectedOrder.artisanId?.fullName || selectedOrder.artisanId?.email || selectedOrder.userId?.fullName || "Artisan"}</Text>
                      <Text style={styles.detailSubtext}>📧 {selectedOrder.artisanId?.email || selectedOrder.userId?.email || "No email"}</Text>
                      {selectedOrder.artisanId?.phone && <Text style={styles.detailSubtext}>📞 {selectedOrder.artisanId?.phone}</Text>}
                    </>
                  ) : label === 'Quantity' ? (
                    <Text style={styles.detailValue}>{selectedOrder.quantity} units</Text>
                  ) : label === 'Order Date' ? (
                    <Text style={styles.detailValue}>{new Date(selectedOrder.createdAt).toLocaleString()}</Text>
                  ) : (
                    <Text style={styles.detailValue}>{selectedOrder._id}</Text>
                  )}
                </View>
              ))}
              {selectedOrder.totalPrice > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Total Amount</Text>
                  <Text style={[styles.detailValue, styles.totalAmount]}>KSH {selectedOrder.totalPrice}</Text>
                </View>
              )}
              {selectedOrder.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Order Notes</Text>
                  <Text style={styles.notesText}>{selectedOrder.notes}</Text>
                </View>
              )}
              <View style={styles.detailActions}>{getActionButtons(selectedOrder)}</View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Delivery Confirmation Modal */}
      <Modal visible={showDeliveryModal} animationType="fade" transparent={true}>
        <View style={styles.confirmationModal}>
          <View style={styles.confirmationContent}>
            <Text style={styles.confirmationTitle}>Confirm Delivery</Text>
            <Text style={styles.confirmationText}>Are you sure you want to mark this order as delivered?</Text>
            {selectedOrder && (
              <View style={styles.deliverySummary}>
                <Text style={styles.deliveryItem}>Product: {selectedOrder.productId?.name}</Text>
                <Text style={styles.deliveryItem}>Quantity: {selectedOrder.quantity}</Text>
                <Text style={styles.deliveryItem}>Artisan: {selectedOrder.artisanId?.fullName || selectedOrder.artisanId?.email}</Text>
              </View>
            )}
            <View style={styles.confirmationButtons}>
              <TouchableOpacity style={[styles.confirmationButton, styles.cancelButton]} onPress={() => setShowDeliveryModal(false)} disabled={loading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmationButton, styles.confirmButton]} onPress={() => markAsDelivered(selectedOrder?._id)} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmButtonText}>Confirm Delivery</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Amount Modal */}
      <Modal visible={showPaymentModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submit Payment Amount</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {selectedOrder && (
              <View style={styles.paymentSummary}>
                <Text style={styles.paymentSummaryTitle}>Order Summary</Text>
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Product:</Text>
                  <Text style={styles.paymentDetailValue}>{selectedOrder.productId?.name}</Text>
                </View>
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Quantity:</Text>
                  <Text style={styles.paymentDetailValue}>{selectedOrder.quantity}</Text>
                </View>
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Artisan:</Text>
                  <Text style={styles.paymentDetailValue}>{selectedOrder.artisanId?.fullName || selectedOrder.artisanId?.email}</Text>
                </View>
                {selectedOrder.paymentStatus === 'pending' && selectedOrder.totalPrice > 0 && (
                  <View style={styles.paymentWarning}>
                    <Text style={styles.paymentWarningText}>⚠️ Payment already submitted and pending approval</Text>
                  </View>
                )}
              </View>
            )}
            
            <View style={styles.formSection}>
              <Text style={styles.label}>Payment Amount (KSH) *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter amount in KSH (0 - 50,000)" 
                value={paymentAmount} 
                onChangeText={(text) => {
                  const filteredText = text.replace(/[^0-9.]/g, '');
                  const parts = filteredText.split('.');
                  if (parts.length > 2) return;
                  setPaymentAmount(filteredText);
                }} 
                keyboardType="decimal-pad" 
                editable={!loading && !(selectedOrder?.paymentStatus === 'pending' && selectedOrder?.totalPrice > 0)}
              />
              <Text style={styles.amountHint}>Amount must be between KSH 0 and KSH 50,000</Text>
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.label}>Payment Notes (Optional)</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Add any payment details or notes..." 
                value={paymentNotes} 
                onChangeText={setPaymentNotes} 
                multiline 
                numberOfLines={3} 
                editable={!loading && !(selectedOrder?.paymentStatus === 'pending' && selectedOrder?.totalPrice > 0)}
              />
            </View>
            
            <View style={styles.actionButtonsModal}>
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.primaryButton, 
                  (loading || !paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > 50000 || (selectedOrder?.paymentStatus === 'pending' && selectedOrder?.totalPrice > 0)) && styles.disabledButton
                ]} 
                onPress={submitPaymentAmount} 
                disabled={loading || !paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > 50000 || (selectedOrder?.paymentStatus === 'pending' && selectedOrder?.totalPrice > 0)}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : selectedOrder?.paymentStatus === 'pending' && selectedOrder?.totalPrice > 0 ? (
                  <Text style={styles.buttonText}>Payment Already Submitted</Text>
                ) : (
                  <Text style={styles.buttonText}>Submit for Approval</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setShowPaymentModal(false)} disabled={loading}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* NEW: Payment Confirmation Modal for Supervisor */}
      <Modal visible={showPaymentConfirmationModal} animationType="fade" transparent={true}>
        <View style={styles.confirmationModal}>
          <View style={styles.confirmationContent}>
            <Text style={styles.confirmationTitle}>Confirm Payment Received</Text>
            <Text style={styles.confirmationText}>Are you sure you want to confirm that payment has been received for this order?</Text>
            {selectedOrder && (
              <View style={styles.paymentConfirmationSummary}>
                <Text style={styles.paymentConfirmationItem}>Order: {selectedOrder._id}</Text>
                <Text style={styles.paymentConfirmationItem}>Product: {selectedOrder.productId?.name}</Text>
                <Text style={styles.paymentConfirmationItem}>Amount: KSH {selectedOrder.totalPrice}</Text>
                <Text style={styles.paymentConfirmationItem}>Supplier: {user?.fullName}</Text>
              </View>
            )}
            <View style={styles.confirmationButtons}>
              <TouchableOpacity style={[styles.confirmationButton, styles.cancelButton]} onPress={() => setShowPaymentConfirmationModal(false)} disabled={loading}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmationButton, styles.confirmPaymentButton]} onPress={() => confirmPaymentReceived(selectedOrder?._id)} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmButtonText}>Confirm Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: "#059669", shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, zIndex: 10 },
  menuButton: { padding: 10, marginRight: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 8 }, 
  menuIcon: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  headerContent: { flex: 1 }, 
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' }, 
  subtitle: { fontSize: 12, color: '#d1fae5', marginTop: 2 },
  refreshButton: { padding: 10, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 8 }, 
  refreshText: { fontSize: 18, color: '#fff' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 998 }, 
  overlayTouchable: { flex: 1 },
  sidebar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: width * 0.82, backgroundColor: '#fff', zIndex: 999, shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20, borderRightWidth: 1, borderRightColor: '#e2e8f0' },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 25, paddingTop: 65, backgroundColor: '#065f46', borderBottomWidth: 1, borderBottomColor: '#047857' },
  sidebarUserInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' }, 
  userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' }, 
  userDetails: { flex: 1 }, 
  userName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 2 },
  userEmail: { fontSize: 12, color: '#d1fae5', marginBottom: 2 }, 
  userRole: { fontSize: 11, color: '#a7f3d0', fontStyle: 'italic' }, 
  closeSidebarButton: { padding: 8, marginLeft: 10 }, 
  closeSidebarText: { fontSize: 24, color: '#fff', fontWeight: '300' },
  sidebarContent: { flex: 1 }, 
  sidebarContentContainer: { paddingBottom: 20 }, 
  sidebarSection: { marginTop: 20 }, 
  sidebarSectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8, marginHorizontal: 25, letterSpacing: 1 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 25, marginHorizontal: 10, marginVertical: 2, borderRadius: 10, backgroundColor: 'transparent' },
  sidebarIcon: { fontSize: 18, marginRight: 15, width: 24, textAlign: 'center' }, 
  sidebarText: { fontSize: 15, color: '#374151', fontWeight: '500', flex: 1 },
  orderBadge: { backgroundColor: '#ef4444', borderRadius: 12, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 }, 
  orderBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  sidebarFooter: { padding: 25, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#f8fafc' }, 
  logoutButton: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fef2f2', borderRadius: 10, borderWidth: 1, borderColor: '#fecaca' },
  logoutIcon: { fontSize: 16, marginRight: 12 }, 
  logoutText: { fontSize: 15, color: '#dc2626', fontWeight: '600' },
  searchContainer: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }, 
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12 },
  searchIcon: { fontSize: 16, color: '#64748b', marginRight: 8 }, 
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#1e293b' }, 
  clearSearchButton: { padding: 8 }, 
  clearSearchText: { fontSize: 16, color: '#64748b', fontWeight: 'bold' },
  statsContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }, 
  statCard: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#f8fafc', marginHorizontal: 4, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#059669' }, 
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'center' },
  section: { flex: 1, padding: 16 }, 
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, 
  sectionHeaderRight: { alignItems: 'flex-end' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' }, 
  ordersCount: { fontSize: 14, color: '#64748b', fontWeight: '600' }, 
  searchResultsText: { fontSize: 12, color: '#059669', marginBottom: 2 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, 
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14, textAlign: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 }, 
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748b', marginBottom: 8, textAlign: 'center' },
  emptyStateText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 20, lineHeight: 20 }, 
  emptyStateButton: { backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }, 
  emptyStateButtonText: { color: '#fff', fontWeight: '600' },
  ordersList: { paddingBottom: 20 }, 
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }, 
  orderId: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 4 }, 
  productName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 70, alignItems: 'center' }, 
  statusText: { fontSize: 12, fontWeight: '600', color: '#fff', textAlign: 'center' },
  orderDetails: { marginBottom: 12 }, 
  quantity: { fontSize: 14, color: '#475569', marginBottom: 4 }, 
  bold: { fontWeight: '600' }, 
  customerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  customerLabel: { fontSize: 14, color: '#64748b', marginRight: 4 }, 
  customerName: { fontSize: 14, fontWeight: '600', color: '#475569', flex: 1 }, 
  price: { fontSize: 14, fontWeight: 'bold', color: '#059669', marginBottom: 4 }, 
  paymentStatus: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  orderDate: { fontSize: 12, color: '#94a3b8' },
  actionButtons: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, 
  actionButton: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center', minWidth: 80, flex: 1 }, 
  actionButtonText: { fontSize: 12, fontWeight: '600', color: '#fff', textAlign: 'center' },
  approveButton: { backgroundColor: '#10b981' }, 
  rejectButton: { backgroundColor: '#ef4444' }, 
  processButton: { backgroundColor: '#3b82f6' }, 
  shipButton: { backgroundColor: '#8b5cf6' }, 
  deliverButton: { backgroundColor: '#059669' }, 
  receiptButton: { backgroundColor: '#6366f1' }, 
  paymentButton: { backgroundColor: '#f59e0b' },
  confirmPaymentButton: { backgroundColor: '#10b981' },
  paymentPendingText: { fontSize: 12, fontWeight: '600', color: '#f59e0b', textAlign: 'center', flex: 1 },
  paymentApprovedText: { fontSize: 12, fontWeight: '600', color: '#22c55e', textAlign: 'center', flex: 1 },
  paymentPaidText: { fontSize: 12, fontWeight: '600', color: '#10b981', textAlign: 'center', flex: 1 },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' }, 
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' }, 
  closeButton: { padding: 8 }, 
  closeButtonText: { fontSize: 20, color: '#64748b' }, 
  modalContent: { flex: 1, padding: 20 },
  detailSection: { marginBottom: 20 }, 
  detailLabel: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 4 }, 
  detailValue: { fontSize: 16, color: '#1e293b', marginBottom: 2 }, 
  detailSubtext: { fontSize: 14, color: '#94a3b8' },
  totalAmount: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  notesText: { fontSize: 14, color: '#6366f1', fontStyle: 'italic', backgroundColor: '#f0f9ff', padding: 12, borderRadius: 6, lineHeight: 20 }, 
  detailActions: { marginTop: 20, marginBottom: 30 },
  confirmationModal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: 20 }, 
  confirmationContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400 },
  confirmationTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 8, textAlign: 'center' }, 
  confirmationText: { fontSize: 16, color: '#64748b', marginBottom: 20, textAlign: 'center', lineHeight: 22 },
  deliverySummary: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20 }, 
  deliveryItem: { fontSize: 14, color: '#475569', marginBottom: 4, lineHeight: 20 },
  paymentConfirmationSummary: { backgroundColor: '#f0f9ff', padding: 16, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#0ea5e9' },
  paymentConfirmationItem: { fontSize: 14, color: '#0369a1', marginBottom: 4, lineHeight: 20, fontWeight: '500' },
  confirmationButtons: { flexDirection: 'row', gap: 12 }, 
  confirmationButton: { flex: 1, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cancelButton: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' }, 
  confirmButton: { backgroundColor: '#059669' },
  confirmPaymentButton: { backgroundColor: '#10b981' },
  cancelButtonText: { color: '#64748b', fontWeight: '600' }, 
  confirmButtonText: { color: '#fff', fontWeight: '600' },
  // Payment Modal Styles
  paymentSummary: { backgroundColor: '#f0f9ff', padding: 16, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#0ea5e9' }, 
  paymentSummaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#0369a1', marginBottom: 12 },
  paymentDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, 
  paymentDetailLabel: { fontSize: 14, color: '#64748b' }, 
  paymentDetailValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  paymentWarning: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: '#f59e0b' },
  paymentWarningText: { fontSize: 12, color: '#92400e', fontWeight: '500', textAlign: 'center' },
  formSection: { marginBottom: 20 }, 
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }, 
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  amountHint: { fontSize: 12, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },
  textArea: { height: 80, textAlignVertical: 'top' }, 
  actionButtonsModal: { gap: 12, marginBottom: 30 }, 
  button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  primaryButton: { backgroundColor: '#1a3a8f' }, 
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d1d5db' }, 
  disabledButton: { opacity: 0.6 }, 
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }, 
  secondaryButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
});