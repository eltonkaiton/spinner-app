// ./src/screens/OrderScreen.js
import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
} from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import * as Print from "expo-print";

const API_URL = "https://spinners-backend-1.onrender.com/api/orders";
const USER_ORDERS_URL = "https://spinners-backend-1.onrender.com/api/orders/user";

// Locations where Spinners Web Kenya currently operates
const KENYA_LOCATIONS = [
  "Nairobi CBD",
  "Westlands",
  "Karen",
  "Langata",
  "Runda",
  "Kileleshwa",
  "Lavington",
  "Kilimani",
  "Upper Hill",
  "South B",
  "South C",
  "Embakasi",
  "Eastleigh",
  "Donholm",
  "Buruburu",
  "Umoja",
  "Kasarani",
  "Roysambu",
  "Kahawa West",
  "Githurai",
  "Ruiru",
  "Thika",
  "Kiambu Town",
  "Other (Specify in address)"
];

export default function OrderScreen({ route, navigation }) {
  const product = route.params?.product;
  const { user, token } = useContext(AuthContext);

  const [quantity, setQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("M-Pesa");
  const [paymentCode, setPaymentCode] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [fetchingOrders, setFetchingOrders] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const totalPrice = React.useMemo(() => {
    return product
      ? (product.price * Number(quantity || 0)).toFixed(2)
      : "0.00";
  }, [product, quantity]);

  useEffect(() => {
    fetchUserOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchQuery, orders]);

  const filterOrders = () => {
    if (!searchQuery.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = orders.filter(order => 
      order.productId?.name?.toLowerCase().includes(query) ||
      order.productId?.category?.toLowerCase().includes(query) ||
      order.orderStatus?.toLowerCase().includes(query) ||
      order.paymentMethod?.toLowerCase().includes(query) ||
      order.deliveryAddress?.toLowerCase().includes(query)
    );
    setFilteredOrders(filtered);
  };

  const fetchUserOrders = async () => {
    if (!user || !(user._id || user.id)) return;
    setFetchingOrders(true);
    try {
      const response = await axios.get(
        `${USER_ORDERS_URL}/${user._id || user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        const userOrders = response.data.orders || [];
        setOrders(userOrders);
        setFilteredOrders(userOrders);
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch orders.");
      }
    } catch (err) {
      console.error("❌ Fetch orders error:", err.response?.data || err.message);
      Alert.alert("Error", "Failed to fetch orders.");
    } finally {
      setFetchingOrders(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserOrders();
    setRefreshing(false);
  }, []);

  const handleQuantityChange = (text) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, "");
    setQuantity(numericText || "1");
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setLocationModalVisible(false);
    
    // If user selects "Other", clear the address field for custom input
    if (location === "Other (Specify in address)") {
      setDeliveryAddress("");
    } else {
      setDeliveryAddress(location);
    }
  };

  const handlePlaceOrder = async () => {
    if (!product) return;
    
    // Validate quantity
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity (numbers only).");
      return;
    }

    // Validate delivery address
    if (!deliveryAddress.trim()) {
      Alert.alert("Delivery Address Required", "Please select or enter your delivery address.");
      return;
    }

    // Validate payment code for M-Pesa and Bank Transfer
    if (["M-Pesa", "Bank Transfer"].includes(paymentMethod) && !paymentCode.trim()) {
      Alert.alert("Payment Required", "Please enter your payment transaction code.");
      return;
    }

    // Validate user authentication
    if (!user || !(user._id || user.id)) {
      Alert.alert("Login Required", "Please log in before placing an order.");
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        userId: user._id || user.id,
        productId: product._id,
        quantity: Number(quantity),
        totalPrice: Number(totalPrice),
        paymentMethod,
        paymentTiming: "beforeDelivery", // Only before delivery now
        paymentCode: paymentCode.trim() || null,
        deliveryAddress: deliveryAddress.trim(),
      };

      const response = await axios.post(API_URL, orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        Alert.alert(
          "✅ Order Placed Successfully",
          `Your order for ${quantity} x ${product.name} has been placed!\n\nTotal: KES ${totalPrice}`
        );
        // Reset form
        setQuantity("1");
        setPaymentCode("");
        setDeliveryAddress("");
        setSelectedLocation("");
        fetchUserOrders();
      } else {
        Alert.alert("⚠️ Error", response.data.message || "Failed to place order.");
      }
    } catch (err) {
      console.error("❌ Order error:", err.response?.data || err.message);
      Alert.alert("❌ Error", err.response?.data?.message || "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReceived = async (orderId) => {
    Alert.alert(
      "Confirm Receipt",
      "Are you sure you have received this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Received",
          onPress: async () => {
            try {
              const response = await axios.put(
                `${API_URL}/${orderId}/mark-received`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (response.data.success) {
                Alert.alert("✅ Success", "Order marked as received!");
                setOrders((prev) =>
                  prev.map((o) =>
                    o._id === orderId ? { ...o, orderStatus: "Received" } : o
                  )
                );
              } else {
                Alert.alert("⚠️ Error", response.data.message || "Failed to update order.");
              }
            } catch (err) {
              console.error("❌ Mark as received error:", err.response?.data || err.message);
              Alert.alert("Error", "Failed to mark as received.");
            }
          },
        },
      ]
    );
  };

  const generateReceipt = async (order) => {
    try {
      const html = `
        <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 25px; 
              max-width: 800px; 
              margin: 0 auto;
              background-color: #f8f9fa;
            }
            .receipt-container {
              background: white;
              border-radius: 12px;
              padding: 30px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              border: 2px solid #1a3a8f;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #1a3a8f;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .title {
              color: #1a3a8f;
              font-size: 28px;
              font-weight: bold;
              margin: 0;
            }
            .subtitle {
              color: #666;
              font-size: 16px;
              margin-top: 5px;
            }
            .company-info {
              text-align: center;
              margin-bottom: 20px;
              color: #333;
            }
            .table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .table th {
              background-color: #1a3a8f;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #ddd;
            }
            .table td {
              padding: 12px;
              border: 1px solid #ddd;
              background-color: #f8f9fa;
            }
            .table tr:nth-child(even) td {
              background-color: #e9ecef;
            }
            .total-row {
              background-color: #1a3a8f !important;
              color: white;
              font-weight: bold;
            }
            .total-row td {
              background-color: #1a3a8f !important;
              color: white;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #ddd;
              color: #666;
              font-size: 14px;
              line-height: 1.5;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 12px;
            }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-delivered { background: #d1ecf1; color: #0c5460; }
            .status-received { background: #d4edda; color: #155724; }
            .status-paid { background: #d4edda; color: #155724; }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <h1 class="title">ORDER RECEIPT</h1>
              <p class="subtitle">Spinners Web Kenya - Artisan Marketplace</p>
            </div>
            
            <div class="company-info">
              <p><strong>Spinners Web Kenya</strong></p>
              <p>Quality Products & Reliable Service</p>
            </div>
            
            <table class="table">
              <tr>
                <th>Field</th>
                <th>Details</th>
              </tr>
              <tr>
                <td><strong>Customer Name</strong></td>
                <td>${order.userId?.fullName || user?.fullName || "N/A"}</td>
              </tr>
              <tr>
                <td><strong>Email</strong></td>
                <td>${order.userId?.email || user?.email || "-"}</td>
              </tr>
              <tr>
                <td><strong>Product Name</strong></td>
                <td>${order.productId?.name || "-"}</td>
              </tr>
              <tr>
                <td><strong>Category</strong></td>
                <td>${order.productId?.category || "-"}</td>
              </tr>
              <tr>
                <td><strong>Artisan</strong></td>
                <td>${order.productId?.artisanName || "-"}</td>
              </tr>
              <tr>
                <td><strong>Quantity</strong></td>
                <td>${order.quantity}</td>
              </tr>
              <tr>
                <td><strong>Unit Price</strong></td>
                <td>KES ${order.productId?.price || "-"}</td>
              </tr>
              <tr class="total-row">
                <td><strong>TOTAL PRICE</strong></td>
                <td><strong>KES ${order.totalPrice}</strong></td>
              </tr>
              <tr>
                <td><strong>Payment Method</strong></td>
                <td>${order.paymentMethod}</td>
              </tr>
              <tr>
                <td><strong>Payment Timing</strong></td>
                <td>Before Delivery</td>
              </tr>
              <tr>
                <td><strong>Transaction Code</strong></td>
                <td>${order.paymentCode || "-"}</td>
              </tr>
              <tr>
                <td><strong>Payment Status</strong></td>
                <td>
                  <span class="status-badge ${
                    order.paymentStatus === 'paid' ? 'status-paid' : 'status-pending'
                  }">
                    ${order.paymentStatus}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Order Status</strong></td>
                <td>
                  <span class="status-badge ${
                    order.orderStatus === 'Received' ? 'status-received' : 
                    order.orderStatus === 'delivered' ? 'status-delivered' : 'status-pending'
                  }">
                    ${order.orderStatus}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Delivery Address</strong></td>
                <td>${order.deliveryAddress || "-"}</td>
              </tr>
              <tr>
                <td><strong>Order Date</strong></td>
                <td>${new Date(order.createdAt).toLocaleString()}</td>
              </tr>
            </table>
            
            <div class="footer">
              <p><strong>Thank you for shopping with Spinners Web Kenya!</strong></p>
              <p>For inquiries, contact: info@spinnersweb.co.ke | +254 700 000 000</p>
              <p>Nairobi, Kenya</p>
            </div>
          </div>
        </body>
        </html>
      `;
      await Print.printAsync({ html });
    } catch (err) {
      console.error("❌ Receipt generation error:", err);
      Alert.alert("Error", "Failed to generate receipt.");
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'received': return '#28a745';
      case 'delivered': return '#17a2b8';
      case 'paid': return '#28a745';
      case 'pending': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.cardTitle}>{item.productId?.name || "Unnamed Product"}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.orderStatus) }]}>
          <Text style={styles.statusText}>{item.orderStatus}</Text>
        </View>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="category" size={16} color="#666" />
          <Text style={styles.fieldText}>Category: {item.productId?.category || "-"}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="person" size={16} color="#666" />
          <Text style={styles.fieldText}>Artisan: {item.productId?.artisanName || "-"}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="shopping-cart" size={16} color="#666" />
          <Text style={styles.fieldText}>Quantity: {item.quantity}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="attach-money" size={16} color="#666" />
          <Text style={styles.fieldText}>Total: KES {item.totalPrice}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="payment" size={16} color="#666" />
          <Text style={styles.fieldText}>
            Payment: {item.paymentMethod} ({item.paymentStatus})
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.fieldText}>Delivery: {item.deliveryAddress || "-"}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="event" size={16} color="#666" />
          <Text style={styles.fieldText}>
            Date: {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.receiptBtn}
          onPress={() => generateReceipt(item)}
        >
          <MaterialIcons name="receipt" size={18} color="#fff" />
          <Text style={styles.receiptBtnText}>Generate Receipt</Text>
        </TouchableOpacity>

        {/* ✅ Mark as Received Button */}
        {item.orderStatus === "delivered" && (
          <TouchableOpacity
            style={styles.receivedBtn}
            onPress={() => handleMarkAsReceived(item._id)}
          >
            <MaterialIcons name="check-circle" size={18} color="#fff" />
            <Text style={styles.receivedBtnText}>Mark as Received</Text>
          </TouchableOpacity>
        )}

        {item.orderStatus === "Received" && (
          <View style={styles.receivedLabel}>
            <MaterialIcons name="verified" size={18} color="#28a745" />
            <Text style={styles.receivedLabelText}>Order Received</Text>
          </View>
        )}
      </View>
    </View>
  );

  const LocationModal = () => (
    <Modal
      visible={locationModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setLocationModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Delivery Location</Text>
            <TouchableOpacity 
              onPress={() => setLocationModalVisible(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Areas where Spinners Web Kenya currently operates:
          </Text>
          <FlatList
            data={KENYA_LOCATIONS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.locationItem,
                  selectedLocation === item && styles.selectedLocationItem
                ]}
                onPress={() => handleLocationSelect(item)}
              >
                <Text style={[
                  styles.locationText,
                  selectedLocation === item && styles.selectedLocationText
                ]}>
                  {item}
                </Text>
                {selectedLocation === item && (
                  <MaterialIcons name="check" size={20} color="#1a3a8f" />
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a3a8f" />
      }
    >
      {product && (
        <View style={styles.productSection}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#1a3a8f" />
            <Text style={styles.backText}>Back to Product</Text>
          </TouchableOpacity>

          <View style={styles.productCard}>
            <Image
              source={product.image ? { uri: product.image } : require("../../assets/icon.png")}
              style={styles.image}
            />
            <View style={styles.productInfo}>
              <Text style={styles.title}>{product.name}</Text>
              <Text style={styles.price}>KES {product.price?.toFixed(2)}</Text>
              <View style={styles.artisanRow}>
                <MaterialIcons name="person" size={16} color="#666" />
                <Text style={styles.artisan}>By: {product.artisanName}</Text>
              </View>
            </View>
          </View>

          {/* Order Form */}
          <View style={styles.orderForm}>
            <Text style={styles.sectionTitle}>Order Details</Text>

            {/* Quantity Input - Numbers Only */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantity (Numbers Only)</Text>
              <TextInput
                value={quantity}
                onChangeText={handleQuantityChange}
                keyboardType="numeric"
                style={styles.input}
                placeholder="Enter quantity (e.g., 1, 2, 3...)"
                placeholderTextColor="#999"
              />
              <Text style={styles.inputHint}>Only numbers are allowed</Text>
            </View>

            {/* Location Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Location</Text>
              <TouchableOpacity
                style={styles.locationSelector}
                onPress={() => setLocationModalVisible(true)}
              >
                <Text style={selectedLocation ? styles.locationSelectedText : styles.locationPlaceholder}>
                  {selectedLocation || "Select your location"}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
              </TouchableOpacity>
              <Text style={styles.inputHint}>
                Select from areas where we operate
              </Text>
            </View>

            {/* Delivery Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {selectedLocation === "Other (Specify in address)" 
                  ? "Enter Your Complete Address" 
                  : "Additional Address Details (Optional)"}
              </Text>
              <TextInput
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                style={[styles.input, styles.textArea]}
                placeholder={
                  selectedLocation === "Other (Specify in address)" 
                    ? "Enter your complete delivery address..." 
                    : "Add specific details like building name, floor, etc..."
                }
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={selectedLocation !== "Other (Specify in address)" || !selectedLocation}
              />
            </View>

            {/* Payment Method */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paymentScroll}>
                <View style={styles.paymentOptions}>
                  {["M-Pesa", "Cash", "Card", "Bank Transfer", "PayPal"].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[styles.option, paymentMethod === method && styles.selectedOption]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          paymentMethod === method && styles.selectedText,
                        ]}
                      >
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={styles.paymentNote}>
                💡 Payment is required before delivery for all orders
              </Text>
            </View>

            {/* Payment Code Input */}
            {["M-Pesa", "Bank Transfer"].includes(paymentMethod) && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Enter {paymentMethod} Transaction Code
                </Text>
                <TextInput
                  value={paymentCode}
                  onChangeText={setPaymentCode}
                  style={styles.input}
                  placeholder={`Enter your ${paymentMethod} transaction code (e.g., QWE123XYZ)`}
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                />
                <Text style={styles.inputHint}>
                  Required for {paymentMethod} payments
                </Text>
              </View>
            )}

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.total}>KES {totalPrice}</Text>
            </View>

            <TouchableOpacity
              style={[styles.orderBtn, loading && styles.disabledBtn]}
              onPress={handlePlaceOrder}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="shopping-cart" size={20} color="#fff" />
                  <Text style={styles.orderBtnText}>Place Order</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Orders History Section */}
      <View style={styles.ordersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.ordersTitle}>Your Orders</Text>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search orders..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {fetchingOrders ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a3a8f" />
            <Text style={styles.loadingText}>Loading your orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="package" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? "No orders match your search" : "No orders found"}
            </Text>
            {searchQuery ? (
              <TouchableOpacity 
                style={styles.clearSearchBtn}
                onPress={() => setSearchQuery("")}
              >
                <Text style={styles.clearSearchText}>Clear Search</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item._id}
            renderItem={renderOrderItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Location Modal */}
      <LocationModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: "#f8f9fa", 
    flex: 1,
  },
  productSection: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  backBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 20,
    paddingVertical: 8,
  },
  backText: { 
    color: "#1a3a8f", 
    fontSize: 16, 
    fontWeight: "600", 
    marginLeft: 8 
  },
  productCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  image: { 
    width: 80, 
    height: 80, 
    borderRadius: 12, 
    backgroundColor: "#e9ecef",
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  title: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#111", 
    marginBottom: 4 
  },
  price: { 
    fontSize: 20, 
    color: "#1a3a8f", 
    fontWeight: "700",
    marginBottom: 4,
  },
  artisanRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  artisan: { 
    fontSize: 14, 
    color: "#666", 
    marginLeft: 4 
  },
  orderForm: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a3a8f",
    marginBottom: 20,
    textAlign: "center",
  },
  inputGroup: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 16, 
    fontWeight: "600", 
    color: "#333", 
    marginBottom: 8 
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#333",
  },
  inputHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  locationSelectedText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  locationPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  paymentScroll: {
    marginHorizontal: -5,
  },
  paymentOptions: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 8 
  },
  option: {
    borderWidth: 2,
    borderColor: "#e9ecef",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    minWidth: 100,
    alignItems: "center",
  },
  selectedOption: { 
    backgroundColor: "#1a3a8f", 
    borderColor: "#1a3a8f" 
  },
  optionText: { 
    color: "#666", 
    fontSize: 14, 
    fontWeight: "600" 
  },
  selectedText: { 
    color: "#fff" 
  },
  paymentNote: {
    fontSize: 14,
    color: "#1a3a8f",
    marginTop: 8,
    fontWeight: "500",
    textAlign: "center",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 8,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a3a8f",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  total: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#fff" 
  },
  orderBtn: {
    backgroundColor: "#28a745",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#28a745",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledBtn: { 
    opacity: 0.7 
  },
  orderBtnText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "700" 
  },
  ordersSection: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  ordersTitle: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#1a3a8f", 
    marginBottom: 16,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: { 
    textAlign: "center", 
    color: "#666", 
    fontSize: 16, 
    marginTop: 16,
    marginBottom: 20,
  },
  clearSearchBtn: {
    backgroundColor: "#1a3a8f",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearSearchText: {
    color: "#fff",
    fontWeight: "600",
  },
  orderCard: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#000", 
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  orderDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  fieldText: { 
    fontSize: 14, 
    color: "#333",
    flex: 1,
  },
  actionButtons: {
    gap: 12,
  },
  receiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#1a3a8f",
  },
  receiptBtnText: { 
    color: "#fff", 
    fontWeight: "600",
    fontSize: 16,
  },
  receivedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#28a745",
  },
  receivedBtnText: { 
    color: "#fff", 
    fontWeight: "600",
    fontSize: 16,
  },
  receivedLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#d4edda",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c3e6cb",
  },
  receivedLabelText: {
    color: "#155724",
    fontWeight: "700",
    fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a3a8f",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedLocationItem: {
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
  },
  locationText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  selectedLocationText: {
    color: "#1a3a8f",
    fontWeight: "600",
  },
});