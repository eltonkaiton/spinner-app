import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import axios from "axios";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const API_URL = "https://spinners-backend-1.onrender.com/api/orders"; // Fetch all orders
const UPDATE_STATUS_URL = "https://spinners-backend-1.onrender.com/api/orders/update-status"; // Update order status

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(API_URL);
      if (res.data.success) {
        setOrders(res.data.orders);
        setFilteredOrders(res.data.orders);
      } else {
        Alert.alert("Error", "Failed to load orders");
      }
    } catch (err) {
      console.error("❌ Fetch error:", err.message);
      Alert.alert("Error", "Unable to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      const res = await axios.put(`${UPDATE_STATUS_URL}/${orderId}`, { status });
      if (res.data.success) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId ? { ...order, orderStatus: status } : order
          )
        );
        setFilteredOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId ? { ...order, orderStatus: status } : order
          )
        );
        Alert.alert("Success", `Order ${status} successfully`);
      } else {
        Alert.alert("Error", "Failed to update order status");
      }
    } catch (err) {
      console.error("❌ Update error:", err.message);
      Alert.alert("Error", "Unable to update order status");
    }
  };

  const generateReceipt = async () => {
    try {
      setGenerating(true);

      const tableRows = orders
        .map(
          (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.userId?.fullName || "N/A"}</td>
            <td>${item.productId?.name || "N/A"}</td>
            <td>${item.totalPrice} KES</td>
            <td>${item.orderStatus}</td>
            <td>${new Date(item.createdAt).toLocaleDateString()}</td>
          </tr>`
        )
        .join("");

      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial; padding: 20px; }
              h1 { text-align: center; color: #1a3a8f; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>All Orders Receipt</h1>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Buyer</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error("❌ Receipt generation failed:", error);
      Alert.alert("Error", "Failed to generate receipt");
    } finally {
      setGenerating(false);
    }
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const handleSearch = (text) => {
    setSearchText(text);
    const filtered = orders.filter(
      (order) =>
        order.productId?.name?.toLowerCase().includes(text.toLowerCase()) ||
        order.userId?.fullName?.toLowerCase().includes(text.toLowerCase()) ||
        order.orderStatus?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredOrders(filtered);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3a8f" />
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.productId?.name || "Unnamed Product"}</Text>
      <Text>Buyer: {item.userId?.fullName || "Unknown"}</Text>
      <Text>Price: {item.totalPrice} KES</Text>
      <Text>Status: {item.orderStatus}</Text>
      <Text>Ordered on: {new Date(item.createdAt).toLocaleString()}</Text>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#1a3a8f" }]}
          onPress={() => openDetails(item)}
        >
          <Text style={styles.btnText}>View</Text>
        </TouchableOpacity>

        {item.orderStatus !== "approved" && item.orderStatus !== "rejected" && (
          <>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#1a8f3a" }]}
              onPress={() => handleStatusChange(item._id, "approved")}
            >
              <Text style={styles.btnText}>Approve</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "#c0392b" }]}
              onPress={() => handleStatusChange(item._id, "rejected")}
            >
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={styles.header}>All Orders</Text>
        <TouchableOpacity
          style={styles.receiptBtn}
          onPress={generateReceipt}
          disabled={generating}
        >
          <Text style={styles.receiptText}>
            {generating ? "Generating..." : "Generate Receipt"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by product, buyer, or status..."
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <ScrollView>
              {selectedOrder ? (
                <>
                  <Text style={styles.modalTitle}>Order Details</Text>
                  <Text style={styles.modalText}>
                    <Text style={styles.bold}>Product:</Text>{" "}
                    {selectedOrder.productId?.name || "N/A"}
                  </Text>
                  <Text style={styles.modalText}>
                    <Text style={styles.bold}>Buyer:</Text>{" "}
                    {selectedOrder.userId?.fullName || "N/A"}
                  </Text>
                  <Text style={styles.modalText}>
                    <Text style={styles.bold}>Email:</Text>{" "}
                    {selectedOrder.userId?.email || "N/A"}
                  </Text>
                  <Text style={styles.modalText}>
                    <Text style={styles.bold}>Total Price:</Text>{" "}
                    {selectedOrder.totalPrice} KES
                  </Text>
                  <Text style={styles.modalText}>
                    <Text style={styles.bold}>Quantity:</Text>{" "}
                    {selectedOrder.quantity || "N/A"}
                  </Text>
                  <Text style={styles.modalText}>
                    <Text style={styles.bold}>Order Status:</Text>{" "}
                    {selectedOrder.orderStatus}
                  </Text>
                  <Text style={styles.modalText}>
                    <Text style={styles.bold}>Date:</Text>{" "}
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </Text>
                </>
              ) : (
                <Text>Loading...</Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  header: { fontSize: 20, fontWeight: "700", color: "#1a3a8f" },
  receiptBtn: {
    backgroundColor: "#1a3a8f",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  receiptText: { color: "#fff", fontWeight: "600" },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: {
    backgroundColor: "#f1f3f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  title: { fontSize: 16, fontWeight: "bold", color: "#333" },
  btnRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 10 },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnText: { color: "#fff", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 12,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a3a8f", marginBottom: 10 },
  modalText: { fontSize: 15, marginBottom: 8, color: "#333" },
  bold: { fontWeight: "700" },
  closeBtn: {
    marginTop: 15,
    alignSelf: "center",
    backgroundColor: "#1a3a8f",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeText: { color: "#fff", fontWeight: "700" },
});
