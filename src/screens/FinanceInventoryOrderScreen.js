// ./src/screens/FinanceInventoryOrderScreen.js
import React, { useState, useEffect, useContext } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, Modal, ScrollView, RefreshControl, Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = "https://spinners-backend-1.onrender.com/api";

export default function FinanceInventoryOrderScreen({ navigation }) {
  const { token, user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentApprovalModal, setShowPaymentApprovalModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchOrders = async () => {
    try {
      let res;
      try {
        res = await axios.get(`${API_BASE_URL}/orders/finance/inventory-orders`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
      } catch {
        res = await axios.get(`${API_BASE_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.data.success) {
          const inventoryOrders = res.data.orders.filter(order => order.orderType === "inventory");
          res.data.orders = inventoryOrders;
          res.data.count = inventoryOrders.length;
        }
      }
      
      const ordersData = res.data.orders || [];
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (err) {
      console.error("Finance fetch error:", err.message);
      Alert.alert("Error", `Failed to fetch orders: ${err.response?.data?.message || err.message}`);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await fetchOrders();
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    let filtered = orders;
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(order => 
        order.productId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplierId?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.artisanId?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.artisanName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderStatus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.paymentStatus?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order._id?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter !== "all") {
      if (statusFilter.startsWith('payment_')) {
        filtered = filtered.filter(order => order.paymentStatus?.toLowerCase() === statusFilter.replace('payment_', '').toLowerCase());
      } else {
        filtered = filtered.filter(order => order.orderStatus?.toLowerCase() === statusFilter.toLowerCase());
      }
    }
    setFilteredOrders(filtered);
  }, [searchQuery, statusFilter, orders]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const apiCallWithFallback = async (primaryEndpoint, fallbackEndpoint, data = {}) => {
    try {
      return await axios.put(primaryEndpoint, data, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
    } catch {
      return await axios.put(fallbackEndpoint, data, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
    }
  };

  const approvePayment = async (orderId) => {
    try {
      setLoading(true);
      await apiCallWithFallback(
        `${API_BASE_URL}/orders/finance/${orderId}/approve-payment`,
        `${API_BASE_URL}/orders/update-payment-status/${orderId}`,
        { paymentStatus: "approved" }
      );
      Alert.alert("Success", "Payment approved!");
      loadData();
      setShowPaymentApprovalModal(false);
      setShowOrderDetails(false);
    } catch (err) {
      Alert.alert("Failed", err.response?.data?.message || "Payment approval failed");
    } finally {
      setLoading(false);
    }
  };

  const rejectPayment = async (orderId, reason = "Payment rejected by finance") => {
    try {
      setLoading(true);
      await apiCallWithFallback(
        `${API_BASE_URL}/orders/finance/${orderId}/reject-payment`,
        `${API_BASE_URL}/orders/update-payment-status/${orderId}`,
        { paymentStatus: "rejected" }
      );
      Alert.alert("Success", "Payment rejected!");
      loadData();
      setShowPaymentApprovalModal(false);
      setShowOrderDetails(false);
    } catch (err) {
      Alert.alert("Failed", err.response?.data?.message || "Payment rejection failed");
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (orderId, method = "bank_transfer") => {
    try {
      setLoading(true);
      const paymentData = {
        paymentStatus: "paid",
        paymentMethod: method,
        paidAt: new Date().toISOString()
      };

      await apiCallWithFallback(
        `${API_BASE_URL}/orders/finance/${orderId}/mark-paid`,
        `${API_BASE_URL}/orders/update-payment-status/${orderId}`,
        paymentData
      );
      Alert.alert("Success", "Payment marked as paid!");
      loadData();
      setShowOrderDetails(false);
    } catch (err) {
      Alert.alert("Failed", err.response?.data?.message || "Mark as paid failed");
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
      Alert.alert("Error", "Enter valid amount");
      return;
    }

    try {
      setLoading(true);
      const paymentData = {
        amount: parseFloat(paymentAmount),
        paymentMethod,
        notes: paymentNotes || undefined,
        paymentStatus: "paid",
        paidAt: new Date().toISOString()
      };

      let response;
      try {
        response = await axios.post(
          `${API_BASE_URL}/orders/finance/${selectedOrder._id}/payment`,
          paymentData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
      } catch {
        response = await axios.put(
          `${API_BASE_URL}/orders/update-payment-status/${selectedOrder._id}`,
          paymentData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
      }

      Alert.alert("Success", "Payment processed!");
      setPaymentAmount(""); 
      setPaymentNotes(""); 
      setPaymentMethod("bank_transfer");
      setShowPaymentModal(false); 
      setShowOrderDetails(false);
      loadData();
    } catch (err) {
      Alert.alert("Failed", err.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptPdf = async (order) => {
    try {
      setGeneratingPdf(true);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Payment Receipt - ${order._id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #333;
              background-color: #fff;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #1a3a8f; 
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .company-name { 
              font-size: 28px; 
              font-weight: bold; 
              color: #1a3a8f; 
              margin-bottom: 5px;
            }
            .receipt-title { 
              font-size: 22px; 
              color: #333; 
              margin: 10px 0;
            }
            .receipt-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              background: #f8fafc;
              padding: 15px;
              border-radius: 5px;
            }
            .info-section {
              flex: 1;
            }
            .section { 
              margin: 20px 0; 
            }
            .section-title { 
              font-weight: bold; 
              color: #1a3a8f; 
              border-bottom: 2px solid #1a3a8f; 
              padding-bottom: 8px;
              margin-bottom: 15px;
              font-size: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            th {
              background-color: #1a3a8f;
              color: white;
              padding: 12px;
              text-align: left;
              border: 1px solid #ddd;
            }
            td {
              padding: 12px;
              border: 1px solid #ddd;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .total-row {
              background-color: #e8f4fd !important;
              font-weight: bold;
              font-size: 16px;
            }
            .status-badge { 
              display: inline-block; 
              padding: 6px 12px; 
              border-radius: 4px; 
              color: white; 
              font-size: 12px;
              font-weight: bold;
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              color: #666; 
              font-size: 12px;
              border-top: 2px solid #ddd;
              padding-top: 20px;
            }
            .signature-area {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              text-align: center;
              width: 45%;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin: 40px 0 10px 0;
            }
            .amount-highlight {
              font-size: 20px;
              font-weight: bold;
              color: #059669;
              text-align: center;
              background: #f0fdf4;
              padding: 15px;
              border-radius: 5px;
              margin: 10px 0;
            }
            .notes-box {
              background: #fff7ed;
              padding: 15px;
              border-radius: 5px;
              margin: 10px 0;
              border-left: 4px solid #f59e0b;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">ARTISAN SUPPLY CO.</div>
            <div class="receipt-title">OFFICIAL PAYMENT RECEIPT</div>
            <div>Inventory Order Payment Confirmation</div>
          </div>

          <div class="receipt-info">
            <div class="info-section">
              <table>
                <tr><td><strong>Receipt No:</strong></td><td>RC-${order._id.substring(0, 8).toUpperCase()}</td></tr>
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

          <div class="section">
            <div class="section-title">ORDER DETAILS</div>
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${order.productId?.name || "Inventory Product"}</td>
                  <td>${order.quantity} units</td>
                  <td>${formatCurrency(order.unitPrice || order.totalPrice / order.quantity)}</td>
                  <td>${formatCurrency(order.totalPrice)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" style="text-align: right;"><strong>GRAND TOTAL:</strong></td>
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
                <td><strong>Payment Method:</strong></td>
                <td>${getPaymentMethodText(order.paymentMethod || "bank_transfer")}</td>
                <td><strong>Payment Date:</strong></td>
                <td>${order.paidAt ? new Date(order.paidAt).toLocaleDateString() : new Date().toLocaleDateString()}</td>
              </tr>
              <tr>
                <td><strong>Transaction Ref:</strong></td>
                <td colspan="3">PAY-${order._id.substring(0, 8).toUpperCase()}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <div class="section-title">PARTIES INFORMATION</div>
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Name/Email</th>
                  <th>Contact Information</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Supplier</strong></td>
                  <td>${order.supplierId?.fullName || order.supplierName || "Supplier"}</td>
                  <td>${order.supplierId?.email || order.supplierEmail || "N/A"}</td>
                </tr>
                <tr>
                  <td><strong>Artisan</strong></td>
                  <td>${order.artisanId?.email || order.artisanName || "Artisan"}</td>
                  <td>${order.artisanId?.phone || order.artisanPhone || "N/A"}</td>
                </tr>
                <tr>
                  <td><strong>Processed By</strong></td>
                  <td>Finance Department</td>
                  <td>Artisan Supply Co.</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${order.notes ? `
          <div class="notes-box">
            <strong>Additional Notes:</strong><br>
            ${order.notes}
          </div>
          ` : ''}

          <div class="signature-area">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div><strong>Supplier's Signature</strong></div>
              <div>${order.supplierId?.fullName || order.supplierName || "Supplier"}</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div><strong>Finance Officer</strong></div>
              <div>Artisan Supply Co.</div>
            </div>
          </div>

          <div class="footer">
            <p><strong>ARTISAN SUPPLY CO.</strong> - Official Payment Receipt</p>
            <p>This is a computer-generated receipt. No signature is required for digital transactions.</p>
            <p>For any inquiries, please contact: finance@artisansupply.co | +254 700 000 000</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
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
          dialogTitle: `Payment Receipt - Order ${order._id.substring(0, 8)}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert("Success", `PDF receipt generated successfully!\n\nFile: ${uri}`);
      }
      
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert("Error", "Failed to generate PDF receipt. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getPaymentMethodText = (method) => {
    const methods = {
      'bank_transfer': 'Bank Transfer',
      'cash': 'Cash',
      'check': 'Check',
      'digital': 'Digital Payment',
      'mobile_money': 'Mobile Money',
      'other': 'Other'
    };
    return methods[method] || method;
  };

  const calculateTotals = () => {
    const pending = orders.filter(o => o.paymentStatus?.toLowerCase() === 'pending').length;
    const approved = orders.filter(o => o.paymentStatus?.toLowerCase() === 'approved').length;
    const paid = orders.filter(o => o.paymentStatus?.toLowerCase() === 'paid').length;
    const totalValue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
    const pendingValue = orders.filter(o => o.paymentStatus?.toLowerCase() === 'pending')
      .reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    return { pending, approved, paid, totalValue, pendingValue };
  };

  const getStatusColor = (status) => {
    const colors = {
      'approved': '#10b981', 'completed': '#10b981', 'delivered': '#10b981',
      'pending': '#f59e0b', 'pending_approval': '#f59e0b',
      'cancelled': '#ef4444', 'rejected': '#ef4444',
      'shipped': '#3b82f6', 'in_progress': '#3b82f6',
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

  const getStatusText = (status) => {
    if (!status) return 'Pending';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "KSh 0.00";
    return `KSh ${parseFloat(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const canApprovePayment = (order) => {
    const paymentStatus = order.paymentStatus?.toLowerCase();
    return paymentStatus === 'pending';
  };

  const canMarkAsPaid = (order) => {
    const paymentStatus = order.paymentStatus?.toLowerCase();
    return paymentStatus === 'approved';
  };

  const canProcessPayment = (order) => {
    const paymentStatus = order.paymentStatus?.toLowerCase();
    return paymentStatus === 'pending' || paymentStatus === 'approved';
  };

  const canGenerateReceipt = (order) => {
    const paymentStatus = order.paymentStatus?.toLowerCase();
    return paymentStatus === 'paid' || paymentStatus === 'approved';
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const openPaymentModal = (order) => {
    setSelectedOrder(order);
    setPaymentAmount(order.totalPrice?.toString() || "");
    setShowPaymentModal(true);
  };

  const openPaymentApprovalModal = (order) => {
    setSelectedOrder(order);
    setShowPaymentApprovalModal(true);
  };

  const openMarkAsPaidModal = (order) => {
    setSelectedOrder(order);
    setPaymentMethod(order.paymentMethod || "bank_transfer");
    setShowPaymentModal(true);
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity style={styles.orderCard} onPress={() => openOrderDetails(item)}>
      <View style={styles.orderHeader}>
        <View style={styles.orderIdContainer}>
          <Text style={styles.orderId}>Order: {item._id?.substring(0, 8)}...</Text>
          <Text style={styles.artisanText}>👨‍🎨 {item.artisanId?.email || item.artisanName || "Artisan"}</Text>
        </View>
        <View style={[styles.paymentStatusBadge, { backgroundColor: getPaymentStatusColor(item.paymentStatus) }]}>
          <Text style={styles.paymentStatusText} numberOfLines={1} adjustsFontSizeToFit>
            {getStatusText(item.paymentStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.productName}>📦 {item.productId?.name || "Product"}</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Supplier:</Text>
          <Text style={styles.detailValue}>{item.supplierId?.fullName || item.supplierName || "Supplier"}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity:</Text>
          <Text style={styles.detailValue}>{item.quantity}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total:</Text>
          <Text style={[styles.detailValue, styles.price]}>{formatCurrency(item.totalPrice)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order Status:</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.orderStatus) }]}>
            <Text style={styles.statusText} numberOfLines={1} adjustsFontSizeToFit>
              {getStatusText(item.orderStatus)}
            </Text>
          </View>
        </View>

        <Text style={styles.orderDate}>📅 {new Date(item.createdAt).toLocaleString()}</Text>

        {item.notes && <Text style={styles.notes}>📝 {item.notes}</Text>}

        <View style={styles.quickActions}>
          {canApprovePayment(item) && (
            <TouchableOpacity style={styles.quickPaymentApproveButton} onPress={() => openPaymentApprovalModal(item)}>
              <Text style={styles.quickPaymentApproveText}>💰 Review</Text>
            </TouchableOpacity>
          )}
          {canMarkAsPaid(item) && (
            <TouchableOpacity style={styles.quickMarkPaidButton} onPress={() => openMarkAsPaidModal(item)}>
              <Text style={styles.quickMarkPaidText}>✅ Mark Paid</Text>
            </TouchableOpacity>
          )}
          {canProcessPayment(item) && (
            <TouchableOpacity style={styles.quickPaymentButton} onPress={() => openPaymentModal(item)}>
              <Text style={styles.quickPaymentText}>💳 Process</Text>
            </TouchableOpacity>
          )}
          {canGenerateReceipt(item) && (
            <TouchableOpacity style={styles.quickReceiptButton} onPress={() => generateReceiptPdf(item)}>
              <Text style={styles.quickReceiptText}>📄 Receipt</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const totals = calculateTotals();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Finance - Inventory Orders</Text>
            <Text style={styles.subtitle}>Manage payments to suppliers</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={loading}>
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}><Text style={styles.statNumber}>{orders.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNumber, styles.pending]}>{totals.pending}</Text><Text style={styles.statLabel}>Pending</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNumber, styles.approved]}>{totals.approved}</Text><Text style={styles.statLabel}>Approved</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNumber, styles.paid]}>{totals.paid}</Text><Text style={styles.statLabel}>Paid</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNumber, styles.revenue]}>{formatCurrency(totals.totalValue)}</Text><Text style={styles.statLabel}>Value</Text></View>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchSection}>
          <TextInput style={styles.searchInput} placeholder="Search orders..." value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearSearchButton} onPress={() => setSearchQuery("")}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Payment Status:</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={statusFilter} onValueChange={setStatusFilter} style={styles.picker}>
              <Picker.Item label="All" value="all" />
              <Picker.Item label="Payment Pending" value="payment_pending" />
              <Picker.Item label="Payment Approved" value="payment_approved" />
              <Picker.Item label="Payment Rejected" value="payment_rejected" />
              <Picker.Item label="Paid" value="payment_paid" />
            </Picker>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Inventory Orders {searchQuery || statusFilter !== "all" ? `(${filteredOrders.length})` : ""}</Text>
        </View>

        {loading && orders.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1a3a8f" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>{searchQuery || statusFilter !== "all" ? "No matches" : "No orders"}</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || statusFilter !== "all" ? "Adjust search/filter" : "No inventory orders yet"}
            </Text>
          </View>
        ) : (
          <FlatList data={filteredOrders} renderItem={renderOrder} keyExtractor={(item) => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#1a3a8f"]} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal visible={showOrderDetails} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity onPress={() => setShowOrderDetails(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Order Info</Text>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>ID:</Text><Text style={styles.detailValue}>{selectedOrder._id}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Order Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.orderStatus) }]}>
                      <Text style={styles.statusText} numberOfLines={1} adjustsFontSizeToFit>
                        {getStatusText(selectedOrder.orderStatus)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Payment Status:</Text>
                    <View style={[styles.paymentStatusBadge, { backgroundColor: getPaymentStatusColor(selectedOrder.paymentStatus) }]}>
                      <Text style={styles.paymentStatusText} numberOfLines={1} adjustsFontSizeToFit>
                        {getStatusText(selectedOrder.paymentStatus)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Date:</Text><Text style={styles.detailValue}>{new Date(selectedOrder.createdAt).toLocaleString()}</Text></View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Product</Text>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Product:</Text><Text style={styles.detailValue}>{selectedOrder.productId?.name || "Product"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Quantity:</Text><Text style={styles.detailValue}>{selectedOrder.quantity}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Total:</Text><Text style={[styles.detailValue, styles.largePrice]}>{formatCurrency(selectedOrder.totalPrice)}</Text></View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Parties</Text>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Artisan:</Text><Text style={styles.detailValue}>{selectedOrder.artisanId?.email || selectedOrder.artisanName || "Artisan"}</Text></View>
                  <View style={styles.detailRow}><Text style={styles.detailLabel}>Supplier:</Text><Text style={styles.detailValue}>{selectedOrder.supplierId?.fullName || selectedOrder.supplierName || "Supplier"}</Text></View>
                </View>

                {selectedOrder.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Notes</Text>
                    <Text style={styles.notesText}>{selectedOrder.notes}</Text>
                  </View>
                )}

                <View style={styles.actionButtons}>
                  {canApprovePayment(selectedOrder) && (
                    <TouchableOpacity style={[styles.button, styles.paymentReviewButton]} onPress={() => openPaymentApprovalModal(selectedOrder)} disabled={loading}>
                      <Text style={styles.buttonText}>💰 Review Payment</Text>
                    </TouchableOpacity>
                  )}

                  {canMarkAsPaid(selectedOrder) && (
                    <TouchableOpacity style={[styles.button, styles.markPaidButton]} onPress={() => openMarkAsPaidModal(selectedOrder)} disabled={loading}>
                      <Text style={styles.buttonText}>✅ Mark as Paid</Text>
                    </TouchableOpacity>
                  )}

                  {canProcessPayment(selectedOrder) && (
                    <TouchableOpacity style={[styles.button, styles.paymentButton]} onPress={() => openPaymentModal(selectedOrder)} disabled={loading}>
                      <Text style={styles.buttonText}>💳 Process Payment</Text>
                    </TouchableOpacity>
                  )}

                  {canGenerateReceipt(selectedOrder) && (
                    <TouchableOpacity 
                      style={[styles.button, styles.receiptButton]} 
                      onPress={() => generateReceiptPdf(selectedOrder)} 
                      disabled={generatingPdf}
                    >
                      {generatingPdf ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.buttonText}>📄 Generate Receipt</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setShowOrderDetails(false)} disabled={loading}>
                    <Text style={styles.secondaryButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showPaymentModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedOrder?.paymentStatus === 'approved' ? 'Mark as Paid' : 'Process Payment'}
            </Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={styles.paymentSummary}>
                  <Text style={styles.paymentSummaryTitle}>Payment Summary</Text>
                  <View style={styles.paymentDetailRow}><Text style={styles.paymentDetailLabel}>Order Total:</Text><Text style={styles.paymentDetailValue}>{formatCurrency(selectedOrder.totalPrice)}</Text></View>
                  <View style={styles.paymentDetailRow}><Text style={styles.paymentDetailLabel}>Supplier:</Text><Text style={styles.paymentDetailValue}>{selectedOrder.supplierId?.fullName || selectedOrder.supplierName}</Text></View>
                  <View style={styles.paymentDetailRow}><Text style={styles.paymentDetailLabel}>Current Status:</Text>
                    <View style={[styles.paymentStatusBadge, { backgroundColor: getPaymentStatusColor(selectedOrder.paymentStatus) }]}>
                      <Text style={styles.paymentStatusText} numberOfLines={1} adjustsFontSizeToFit>
                        {getStatusText(selectedOrder.paymentStatus)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Payment Method *</Text>
                  <View style={[styles.pickerContainer, styles.largePicker]}>
                    <Picker selectedValue={paymentMethod} onValueChange={setPaymentMethod} style={styles.picker}>
                      <Picker.Item label="Bank Transfer" value="bank_transfer" />
                      <Picker.Item label="Cash" value="cash" />
                      <Picker.Item label="Check" value="check" />
                      <Picker.Item label="Digital Payment" value="digital" />
                      <Picker.Item label="Mobile Money" value="mobile_money" />
                      <Picker.Item label="Other" value="other" />
                    </Picker>
                  </View>
                </View>

                {selectedOrder.paymentStatus !== 'approved' && (
                  <View style={styles.formSection}>
                    <Text style={styles.label}>Amount *</Text>
                    <TextInput style={styles.input} placeholder="Enter amount in KSh" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="numeric" editable={!loading} />
                  </View>
                )}

                <View style={styles.formSection}>
                  <Text style={styles.label}>Payment Notes (Optional)</Text>
                  <TextInput style={[styles.input, styles.textArea]} placeholder="Payment reference or notes..." value={paymentNotes} onChangeText={setPaymentNotes} multiline numberOfLines={3} editable={!loading} />
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.button, styles.primaryButton, loading && styles.disabledButton]} 
                    onPress={() => selectedOrder.paymentStatus === 'approved' ? markAsPaid(selectedOrder._id, paymentMethod) : processPayment()} 
                    disabled={loading || (!paymentAmount && selectedOrder.paymentStatus !== 'approved')}
                  >
                    {loading ? <ActivityIndicator color="#fff" size="small" /> : 
                      <Text style={styles.buttonText}>
                        {selectedOrder.paymentStatus === 'approved' ? 'Confirm Payment' : 'Process Payment'}
                      </Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setShowPaymentModal(false)} disabled={loading}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showPaymentApprovalModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Review Payment</Text>
            <TouchableOpacity onPress={() => setShowPaymentApprovalModal(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedOrder && (
              <>
                <View style={styles.paymentSummary}>
                  <Text style={styles.paymentSummaryTitle}>Payment Review</Text>
                  <View style={styles.paymentDetailRow}><Text style={styles.paymentDetailLabel}>Order Total:</Text><Text style={styles.paymentDetailValue}>{formatCurrency(selectedOrder.totalPrice)}</Text></View>
                  <View style={styles.paymentDetailRow}><Text style={styles.paymentDetailLabel}>Supplier:</Text><Text style={styles.paymentDetailValue}>{selectedOrder.supplierId?.fullName || selectedOrder.supplierName}</Text></View>
                  <View style={styles.paymentDetailRow}><Text style={styles.paymentDetailLabel}>Current Status:</Text>
                    <View style={[styles.paymentStatusBadge, { backgroundColor: getPaymentStatusColor(selectedOrder.paymentStatus) }]}>
                      <Text style={styles.paymentStatusText} numberOfLines={1} adjustsFontSizeToFit>
                        {getStatusText(selectedOrder.paymentStatus)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={() => approvePayment(selectedOrder._id)} disabled={loading}>
                    <Text style={styles.buttonText}>✓ Approve Payment</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={() => rejectPayment(selectedOrder._id)} disabled={loading}>
                    <Text style={styles.buttonText}>✗ Reject Payment</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setShowPaymentApprovalModal(false)} disabled={loading}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: "#1a3a8f" },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 15, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 },
  backButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#e2e8f0', marginTop: 4 },
  refreshButton: { padding: 10, backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 8 },
  refreshText: { fontSize: 18, color: '#fff' },
  statsContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  statCard: { flex: 1, alignItems: 'center', padding: 8 },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#1a3a8f' },
  pending: { color: '#f59e0b' }, approved: { color: '#22c55e' }, paid: { color: '#10b981' }, revenue: { color: '#8b5cf6' },
  statLabel: { fontSize: 10, color: '#64748b', marginTop: 4, textAlign: 'center' },
  filterContainer: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  searchSection: { marginBottom: 12 },
  searchInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  clearSearchButton: { position: 'absolute', right: 12, top: 12, padding: 4 },
  clearSearchText: { fontSize: 16, color: '#64748b' },
  filterSection: { flexDirection: 'row', alignItems: 'center' },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginRight: 8 },
  pickerContainer: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, backgroundColor: '#fff', overflow: 'hidden' },
  largePicker: { height: 50 },
  picker: { height: 50, fontSize: 16 },
  section: { flex: 1, padding: 16 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#64748b', marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderIdContainer: { flex: 1 },
  orderId: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 4 },
  artisanText: { fontSize: 12, color: '#6366f1', fontWeight: '500' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 80, alignItems: 'center' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#fff', textAlign: 'center' },
  paymentStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 80, alignItems: 'center' },
  paymentStatusText: { fontSize: 11, fontWeight: '600', color: '#fff', textAlign: 'center' },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  detailLabel: { fontSize: 14, color: '#64748b' }, detailValue: { fontSize: 14, fontWeight: '500', color: '#374151' },
  price: { fontWeight: 'bold', color: '#059669' },
  orderDate: { fontSize: 12, color: '#94a3b8', marginTop: 8, marginBottom: 8 },
  notes: { fontSize: 12, color: '#6366f1', fontStyle: 'italic', marginBottom: 12 },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  quickPaymentApproveButton: { backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#f59e0b' },
  quickPaymentApproveText: { color: '#92400e', fontSize: 12, fontWeight: '600' },
  quickMarkPaidButton: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#16a34a' },
  quickMarkPaidText: { color: '#166534', fontSize: 12, fontWeight: '600' },
  quickPaymentButton: { backgroundColor: '#f0f9ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#0ea5e9' },
  quickPaymentText: { color: '#0369a1', fontSize: 12, fontWeight: '600' },
  quickReceiptButton: { backgroundColor: '#f3e8ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#8b5cf6' },
  quickReceiptText: { color: '#6b21a8', fontSize: 12, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  closeButton: { padding: 4 }, closeButtonText: { fontSize: 20, color: '#64748b' },
  modalContent: { flex: 1, padding: 20 },
  detailSection: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  detailSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  largePrice: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  notesText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  paymentSummary: { backgroundColor: '#f0f9ff', padding: 16, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#0ea5e9' },
  paymentSummaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#0369a1', marginBottom: 12 },
  paymentDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  paymentDetailLabel: { fontSize: 14, color: '#64748b' }, paymentDetailValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  formSection: { marginBottom: 20 }, label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff' },
  textArea: { height: 80, textAlignVertical: 'top' }, actionButtons: { gap: 12, marginBottom: 30 },
  button: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  primaryButton: { backgroundColor: '#1a3a8f' }, approveButton: { backgroundColor: '#22c55e' }, rejectButton: { backgroundColor: '#ef4444' }, paymentButton: { backgroundColor: '#8b5cf6' }, paymentReviewButton: { backgroundColor: '#f59e0b' }, markPaidButton: { backgroundColor: '#10b981' }, receiptButton: { backgroundColor: '#7c3aed' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d1d5db' }, disabledButton: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }, secondaryButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
});