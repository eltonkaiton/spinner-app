// ./src/screens/InventoryOrderScreen.js
import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  ScrollView,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = "https://spinners-backend-1.onrender.com/api";
const { width, height } = Dimensions.get('window');

export default function InventoryOrderScreen() {
  const { token, user } = useContext(AuthContext);
  const navigation = useNavigation();

  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  // Form fields
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Custom dropdown states
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Filter orders based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredOrders(orders);
    } else {
      const filtered = orders.filter(order => 
        order._id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.productId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplierId?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.supplierName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.orderStatus?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrders(filtered);
    }
  }, [searchQuery, orders]);

  // Fetch products from inventory
  const fetchProducts = async () => {
    try {
      console.log("📦 Fetching products...");
      
      const res = await axios.get(`${API_BASE_URL}/inventory`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      console.log("✅ Products fetched:", res.data.length);
      setProducts(res.data);
      if (res.data.length > 0 && !selectedProduct) {
        setSelectedProduct(res.data[0]._id);
      }
    } catch (err) {
      console.error("❌ Fetch products error:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      Alert.alert("Error", `Failed to fetch products: ${err.response?.data?.message || err.message}`);
    }
  };

  // Fetch suppliers with new endpoint
  const fetchSuppliers = async () => {
    try {
      console.log("👥 Fetching suppliers...");
      
      const res = await axios.get(`${API_BASE_URL}/orders/suppliers/for-artisan`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      console.log("✅ Suppliers fetched:", res.data.suppliers?.length || 0);
      setSuppliers(res.data.suppliers || []);
      if (res.data.suppliers?.length > 0 && !selectedSupplier) {
        setSelectedSupplier(res.data.suppliers[0]._id);
      }
    } catch (err) {
      console.error("❌ Fetch suppliers error:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      if (err.response?.status === 403) {
        Alert.alert(
          "Permission Denied", 
          "Your account doesn't have permission to view suppliers. Please contact administrator."
        );
      } else {
        Alert.alert("Error", `Failed to load suppliers: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  // Fetch artisan's inventory orders
  const fetchOrders = async () => {
    try {
      console.log("📋 Fetching inventory orders...");

      const res = await axios.get(`${API_BASE_URL}/orders/artisan/inventory-orders`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      console.log("✅ Inventory orders fetched:", res.data.orders?.length || 0);
      const fetchedOrders = res.data.orders || [];
      setOrders(fetchedOrders);
      setFilteredOrders(fetchedOrders);
    } catch (err) {
      console.error("❌ Fetch orders error:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });

      if (err.response?.status === 400) {
        Alert.alert(
          "Bad Request", 
          "There was an issue with the orders request. Please check your data."
        );
      } else {
        Alert.alert("Error", `Failed to fetch orders: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  // Load all data
  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchProducts(),
        fetchSuppliers(),
        fetchOrders()
      ]);
    } catch (error) {
      console.error("❌ Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load all on mount
  useEffect(() => {
    console.log("👤 Current user:", user?.email, "Role:", user?.role);
    loadAllData();
  }, []);

  // Refresh function
  const onRefresh = () => {
    setRefreshing(true);
    setSearchQuery("");
    loadAllData();
  };

  // Get selected product and supplier details
  const selectedProductDetails = products.find(p => p._id === selectedProduct);
  const selectedSupplierDetails = suppliers.find(s => s._id === selectedSupplier);

  // Custom dropdown handlers
  const handleProductSelect = (productId) => {
    setSelectedProduct(productId);
    setShowProductDropdown(false);
  };

  const handleSupplierSelect = (supplierId) => {
    setSelectedSupplier(supplierId);
    setShowSupplierDropdown(false);
  };

  // Place inventory order - FIXED VERSION
  const placeOrder = async () => {
    if (!selectedProduct || !selectedSupplier || !quantity) {
      Alert.alert("Error", "Please select product, supplier, and enter quantity");
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Error", "Quantity must be a positive number");
      return;
    }

    try {
      setLoading(true);
      
      // Find selected product for additional data
      const product = products.find(p => p._id === selectedProduct);
      const supplier = suppliers.find(s => s._id === selectedSupplier);

      // FIXED: Include all required fields for current schema
      const orderData = {
        // Required fields by current schema
        userId: user._id, // Required by schema - using artisan as userId for inventory orders
        productId: selectedProduct,
        quantity: qty,
        totalPrice: 0, // Required by schema
        paymentMethod: "cash", // Required by schema
        paymentTiming: "afterDelivery", // Required by schema
        
        // Additional fields for inventory orders (will be stored but not validated by schema)
        supplierId: selectedSupplier,
        artisanId: user._id,
        orderType: "inventory",
        notes: orderNotes || undefined,
        
        // Metadata (optional)
        productName: product?.name,
        supplierName: supplier?.fullName,
        artisanName: user?.email
      };

      console.log("🛒 Placing inventory order:", orderData);

      const response = await axios.post(
        `${API_BASE_URL}/orders`,
        orderData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      console.log("✅ Order response:", response.data);

      Alert.alert("Success", "Inventory order placed successfully!");

      // Reset form and refresh data
      setQuantity("");
      setOrderNotes("");
      setShowOrderForm(false);
      loadAllData();
      
    } catch (err) {
      console.error("❌ Order placement error:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      const errorMessage = err.response?.data?.message || "Failed to place inventory order. Please try again.";
      Alert.alert("Order Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Mark order as received
  const markAsReceived = async (orderId) => {
    try {
      setLoading(true);
      
      console.log(`🔄 Marking order ${orderId} as received`);

      const response = await axios.put(
        `${API_BASE_URL}/orders/mark-received/${orderId}`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      console.log("✅ Order marked as received:", response.data);
      Alert.alert("Success", "Order marked as received!");
      loadAllData();
      
    } catch (err) {
      console.error("❌ Mark as received error:", err);
      
      if (err.response?.status === 404) {
        // Try alternative endpoint
        await updateOrderStatus(orderId, 'received');
      } else {
        Alert.alert("Error", "Failed to mark order as received. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Alternative update method for order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const updateData = { status: newStatus };
      
      const response = await axios.put(
        `${API_BASE_URL}/orders/update-status/${orderId}`,
        updateData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      console.log(`✅ Order status updated to ${newStatus}`);
      Alert.alert("Success", `Order marked as ${newStatus}`);
      loadAllData();
      
    } catch (err) {
      console.error("❌ Update order status error:", err);
      Alert.alert("Update Failed", "Please try again or contact support.");
    }
  };

  // Generate and share receipt
  const generateReceipt = async (order) => {
    try {
      setGeneratingReceipt(true);
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt - Order ${order._id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .company { font-size: 24px; font-weight: bold; color: #1a3a8f; }
            .receipt-title { font-size: 20px; margin: 10px 0; }
            .section { margin: 20px 0; }
            .section-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .label { font-weight: bold; }
            .total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
            .status { padding: 5px 10px; border-radius: 10px; color: white; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">ARTISAN SUPPLY CO.</div>
            <div class="receipt-title">INVENTORY ORDER RECEIPT</div>
            <div>Date: ${new Date().toLocaleDateString()}</div>
          </div>

          <div class="section">
            <div class="section-title">Order Information</div>
            <div class="row">
              <span class="label">Order ID:</span>
              <span>${order._id}</span>
            </div>
            <div class="row">
              <span class="label">Order Date:</span>
              <span>${new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div class="row">
              <span class="label">Status:</span>
              <span class="status" style="background-color: ${getStatusColor(order.orderStatus)};">
                ${getStatusText(order.orderStatus)}
              </span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Artisan Details</div>
            <div class="row">
              <span class="label">Name:</span>
              <span>${user?.fullName || 'Artisan'}</span>
            </div>
            <div class="row">
              <span class="label">Email:</span>
              <span>${user?.email || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Supplier Details</div>
            <div class="row">
              <span class="label">Name:</span>
              <span>${order.supplierId?.fullName || order.supplierName || 'Supplier'}</span>
            </div>
            <div class="row">
              <span class="label">Email:</span>
              <span>${order.supplierId?.email || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Order Items</div>
            <div class="row">
              <span class="label">Product:</span>
              <span>${order.productId?.name || 'Product'}</span>
            </div>
            <div class="row">
              <span class="label">Quantity:</span>
              <span>${order.quantity} units</span>
            </div>
            <div class="row">
              <span class="label">Unit Price:</span>
              <span>$${order.productId?.price || 0}</span>
            </div>
            <div class="total">
              <span class="label">Total Amount:</span>
              <span>$${order.totalPrice || 0}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Payment Information</div>
            <div class="row">
              <span class="label">Method:</span>
              <span>${order.paymentMethod || 'Cash'}</span>
            </div>
            <div class="row">
              <span class="label">Timing:</span>
              <span>${order.paymentTiming || 'After Delivery'}</span>
            </div>
            <div class="row">
              <span class="label">Status:</span>
              <span>${order.paymentStatus || 'Pending'}</span>
            </div>
          </div>

          ${order.notes ? `
          <div class="section">
            <div class="section-title">Order Notes</div>
            <div class="row">
              <span>${order.notes}</span>
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Artisan Supply Co. - Quality Supplies for Artisans</p>
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      // Share PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt - Order ${order._id}`,
        });
      } else {
        Alert.alert("Success", "Receipt generated successfully!");
      }

    } catch (error) {
      console.error("❌ Error generating receipt:", error);
      Alert.alert("Error", "Failed to generate receipt. Please try again.");
    } finally {
      setGeneratingReceipt(false);
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'received':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
      case 'rejected':
        return '#ef4444';
      case 'shipped':
      case 'in_progress':
      case 'processing':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  // Get status text
  const getStatusText = (status) => {
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Get action buttons based on status
  const getActionButtons = (order) => {
    const status = order.orderStatus?.toLowerCase();
    
    if (status === 'delivered' || status === 'shipped') {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.smallButton, styles.receiveButton]}
            onPress={() => markAsReceived(order._id)}
            disabled={loading}
          >
            <Text style={styles.smallButtonText}>✓ Received</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.receiptButton]}
            onPress={() => generateReceipt(order)}
            disabled={generatingReceipt}
          >
            <Text style={styles.smallButtonText}>
              {generatingReceipt ? '...' : '📄 Receipt'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    } else if (status === 'received' || status === 'completed') {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.smallButton, styles.receiptButton]}
            onPress={() => generateReceipt(order)}
            disabled={generatingReceipt}
          >
            <Text style={styles.smallButtonText}>
              {generatingReceipt ? '...' : '📄 Receipt'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.completedText}>✅ Completed</Text>
        </View>
      );
    }
    return null;
  };

  // Render order item
  const renderOrder = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>
          Order: {item._id?.substring(0, 8)}...
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.orderStatus) }]}>
          <Text style={styles.statusText}>
            {getStatusText(item.orderStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.productName}>
          📦 {item.productId?.name || "Product"}
        </Text>
        <Text style={styles.quantity}>
          Quantity: <Text style={styles.bold}>{item.quantity}</Text>
        </Text>
        
        {/* Show supplier info if available */}
        {(item.supplierId || item.supplierName) && (
          <View style={styles.supplierInfo}>
            <Text style={styles.supplierLabel}>Supplier:</Text>
            <Text style={styles.supplierName}>
              {item.supplierId?.fullName || item.supplierName || "Supplier"}
            </Text>
          </View>
        )}

        {item.totalPrice > 0 && (
          <Text style={styles.price}>
            💰 Total: ${item.totalPrice}
          </Text>
        )}

        <Text style={styles.orderDate}>
          📅 {new Date(item.createdAt).toLocaleString()}
        </Text>

        {item.notes && (
          <Text style={styles.notes}>
            📝 {item.notes}
          </Text>
        )}

        {/* Action Buttons */}
        {getActionButtons(item)}
      </View>
    </View>
  );

  // Custom Dropdown Components
  const ProductDropdown = () => (
    <Modal
      visible={showProductDropdown}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowProductDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setShowProductDropdown(false)}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Select Product</Text>
            <TouchableOpacity onPress={() => setShowProductDropdown(false)}>
              <Text style={styles.dropdownClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={products}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  selectedProduct === item._id && styles.dropdownItemSelected
                ]}
                onPress={() => handleProductSelect(item._id)}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedProduct === item._id && styles.dropdownItemTextSelected
                ]}>
                  {item.name} (Stock: {item.quantity})
                </Text>
                {selectedProduct === item._id && (
                  <Text style={styles.dropdownCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            style={styles.dropdownList}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const SupplierDropdown = () => (
    <Modal
      visible={showSupplierDropdown}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSupplierDropdown(false)}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setShowSupplierDropdown(false)}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Select Supplier</Text>
            <TouchableOpacity onPress={() => setShowSupplierDropdown(false)}>
              <Text style={styles.dropdownClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={suppliers}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.dropdownItem,
                  selectedSupplier === item._id && styles.dropdownItemSelected
                ]}
                onPress={() => handleSupplierSelect(item._id)}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedSupplier === item._id && styles.dropdownItemTextSelected
                ]}>
                  {item.fullName} ({item.businessName || item.email})
                </Text>
                {selectedSupplier === item._id && (
                  <Text style={styles.dropdownCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            style={styles.dropdownList}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Inventory Orders</Text>
            <Text style={styles.subtitle}>
              Manage your material and supply orders
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={onRefresh}
          disabled={loading}
        >
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders by ID, product, supplier, or status..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            placeholderTextColor="#94a3b8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{products.length}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{suppliers.length}</Text>
          <Text style={styles.statLabel}>Suppliers</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{filteredOrders.length}</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
      </View>

      {/* Orders List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>My Inventory Orders</Text>
            {searchQuery.length > 0 && (
              <Text style={styles.searchResultsText}>
                {filteredOrders.length} of {orders.length} orders
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.newOrderButton}
            onPress={() => setShowOrderForm(true)}
          >
            <Text style={styles.newOrderButtonText}>+ New Order</Text>
          </TouchableOpacity>
        </View>

        {loading && orders.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1a3a8f" />
            <Text style={styles.loadingText}>Loading your orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>
              {searchQuery.length > 0 ? 'No matching orders found' : 'No orders yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery.length > 0 
                ? 'Try adjusting your search terms'
                : 'Place your first inventory order to get started with your supplies.'
              }
            </Text>
            {searchQuery.length > 0 ? (
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => setSearchQuery("")}
              >
                <Text style={styles.emptyStateButtonText}>Clear Search</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => setShowOrderForm(true)}
              >
                <Text style={styles.emptyStateButtonText}>Create First Order</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrder}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#1a3a8f"]}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.ordersList}
          />
        )}
      </View>

      {/* Order Form Modal */}
      <Modal 
        visible={showOrderForm} 
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Inventory Order</Text>
            <TouchableOpacity 
              onPress={() => setShowOrderForm(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Product Selection */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Select Product *</Text>
              <TouchableOpacity
                style={styles.customPicker}
                onPress={() => setShowProductDropdown(true)}
              >
                <Text style={styles.customPickerText}>
                  {selectedProductDetails 
                    ? `${selectedProductDetails.name} (Stock: ${selectedProductDetails.quantity})`
                    : 'Select a product'
                  }
                </Text>
                <Text style={styles.customPickerArrow}>▼</Text>
              </TouchableOpacity>
              {selectedProductDetails && (
                <View style={styles.productInfo}>
                  <Text style={styles.productInfoText}>
                    Category: {selectedProductDetails.category || 'N/A'}
                  </Text>
                  <Text style={styles.productInfoText}>
                    Current Stock: {selectedProductDetails.quantity}
                  </Text>
                </View>
              )}
            </View>

            {/* Supplier Selection */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Select Supplier *</Text>
              <TouchableOpacity
                style={styles.customPicker}
                onPress={() => setShowSupplierDropdown(true)}
              >
                <Text style={styles.customPickerText}>
                  {selectedSupplierDetails 
                    ? `${selectedSupplierDetails.fullName} (${selectedSupplierDetails.businessName || selectedSupplierDetails.email})`
                    : 'Select a supplier'
                  }
                </Text>
                <Text style={styles.customPickerArrow}>▼</Text>
              </TouchableOpacity>
              {selectedSupplierDetails && (
                <View style={styles.supplierInfoCard}>
                  <Text style={styles.supplierInfoText}>
                    📧 {selectedSupplierDetails.email}
                  </Text>
                  {selectedSupplierDetails.phone && (
                    <Text style={styles.supplierInfoText}>
                      📞 {selectedSupplierDetails.phone}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Quantity */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity needed"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>

            {/* Notes */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Order Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special instructions or notes..."
                value={orderNotes}
                onChangeText={setOrderNotes}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>

            {/* Order Summary */}
            {selectedProduct && selectedSupplier && quantity && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Order Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Product:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedProductDetails?.name}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Supplier:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedSupplierDetails?.fullName}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Quantity:</Text>
                  <Text style={styles.summaryValue}>{quantity}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Order Type:</Text>
                  <Text style={styles.summaryValue}>Inventory Order</Text>
                </View>
                <View style={styles.summaryDivider} />
                <Text style={styles.summaryNote}>
                  This order will be sent to the supplier for processing.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtonsModal}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, loading && styles.disabledButton]}
                onPress={placeOrder}
                disabled={loading || !selectedProduct || !selectedSupplier || !quantity}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Place Order</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setShowOrderForm(false)}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Custom Dropdown Modals */}
      <ProductDropdown />
      <SupplierDropdown />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#1a3a8f",
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#e2e8f0',
    marginTop: 2,
  },
  refreshButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 18,
    color: '#fff',
  },
  // Search Styles
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    color: '#64748b',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#1e293b',
  },
  clearSearchButton: {
    padding: 8,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a3a8f',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  section: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  searchResultsText: {
    fontSize: 12,
    color: '#1a3a8f',
    marginTop: 2,
  },
  newOrderButton: {
    backgroundColor: '#1a3a8f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newOrderButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  ordersList: {
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  orderDetails: {
    // Content styles
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
  },
  supplierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  supplierLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 4,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  notes: {
    fontSize: 12,
    color: '#6366f1',
    fontStyle: 'italic',
    marginTop: 4,
  },
  // Action Buttons in Order Cards
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 80,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  receiveButton: {
    backgroundColor: '#10b981',
  },
  receiptButton: {
    backgroundColor: '#6366f1',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'center',
    flex: 1,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748b',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  // Custom Picker Styles
  customPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    height: 50,
  },
  customPickerText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  customPickerArrow: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 8,
  },
  productInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
  },
  productInfoText: {
    fontSize: 12,
    color: '#0369a1',
  },
  supplierInfoCard: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
  },
  supplierInfoText: {
    fontSize: 12,
    color: '#166534',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  summaryNote: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  actionButtonsModal: {
    gap: 12,
    marginBottom: 30,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#1a3a8f',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  // Custom Dropdown Styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
    paddingBottom: 20,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  dropdownClose: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: 'bold',
  },
  dropdownList: {
    maxHeight: height * 0.6,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: '#1a3a8f',
    fontWeight: '600',
  },
  dropdownCheckmark: {
    fontSize: 16,
    color: '#1a3a8f',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});