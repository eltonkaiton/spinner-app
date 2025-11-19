// ./src/screens/SupervisorOrderDetailsScreen.js
import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

const ORDER_DETAILS_URL = "https://spinners-backend-1.onrender.com/api/orders";
const DRIVERS_URL = "https://spinners-backend-1.onrender.com/api/orders/drivers/list";
const ASSIGN_DRIVER_URL = "https://spinners-backend-1.onrender.com/api/orders/assign-driver";

export default function SupervisorOrderDetailsScreen() {
  const { token, logout } = useContext(AuthContext);
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [fetchingDrivers, setFetchingDrivers] = useState(false);

  useEffect(() => {
    if (!orderId) {
      Alert.alert("Error", "Invalid order ID.");
      navigation.goBack();
      return;
    }
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      if (!token) {
        Alert.alert("Unauthorized", "No token found. Please login again.");
        logout();
        return;
      }

      const res = await axios.get(`${ORDER_DETAILS_URL}/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success && res.data.order) {
        setOrder(res.data.order);
      } else {
        Alert.alert("Error", res.data.message || "Order not found.");
        setOrder(null);
      }
    } catch (err) {
      console.error("Error fetching order details:", err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.message || "Server error while fetching order details.");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    setFetchingDrivers(true);
    try {
      const res = await axios.get(DRIVERS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setDrivers(res.data.users || []);
        setModalVisible(true);
      } else {
        Alert.alert("Error", res.data.message || "Failed to fetch drivers.");
      }
    } catch (err) {
      console.error("Error fetching drivers:", err.response?.data || err.message);
      Alert.alert("Error", "Server error while fetching drivers.");
    } finally {
      setFetchingDrivers(false);
    }
  };

  const assignDriver = async (driverId) => {
    if (!driverId) return;

    try {
      const res = await axios.put(
        `${ASSIGN_DRIVER_URL}/${orderId}`,
        { driverId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success && res.data.order) {
        Alert.alert("Success", "Driver assigned successfully!");
        setOrder(res.data.order);
        setModalVisible(false);
      } else {
        Alert.alert("Error", res.data.message || "Failed to assign driver.");
      }
    } catch (err) {
      console.error("Error assigning driver:", err.response?.data || err.message);
      Alert.alert("Error", "Server error while assigning driver.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a3a8f" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 20 }}>No order details available.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back-outline" size={24} color="#1a3a8f" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      {/* Order Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Product:</Text>
        <Text style={styles.value}>{order.productId?.name || "N/A"}</Text>

        <Text style={styles.label}>Customer:</Text>
        <Text style={styles.value}>{order.userId?.fullName || order.userId?.full_name || "N/A"}</Text>

        <Text style={styles.label}>Quantity:</Text>
        <Text style={styles.value}>{order.quantity || "N/A"}</Text>

        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{order.orderStatus || "N/A"}</Text>

        <Text style={styles.label}>Payment Status:</Text>
        <Text style={styles.value}>{order.paymentStatus || "N/A"}</Text>

        <Text style={styles.label}>Delivery Address:</Text>
        <Text style={styles.value}>{order.deliveryAddress || "N/A"}</Text>

        <Text style={styles.label}>Assigned Driver:</Text>
        <Text style={styles.value}>{order.driverId?.fullName || "Not assigned"}</Text>

        <Text style={styles.label}>Created At:</Text>
        <Text style={styles.value}>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"}</Text>

        <Text style={styles.label}>Updated At:</Text>
        <Text style={styles.value}>{order.updatedAt ? new Date(order.updatedAt).toLocaleString() : "N/A"}</Text>

        {/* Assign Driver Button */}
        <TouchableOpacity
          style={styles.assignButton}
          onPress={fetchDrivers}
          disabled={fetchingDrivers}
        >
          <Text style={styles.assignButtonText}>
            {fetchingDrivers ? "Loading Drivers..." : "Assign Driver"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Driver Selection Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select a Driver</Text>
            {drivers.length === 0 ? (
              <Text>No drivers available.</Text>
            ) : (
              <FlatList
                data={drivers}
                keyExtractor={(item) => item._id || Math.random().toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.driverItem}
                    onPress={() => assignDriver(item._id)}
                  >
                    <Text style={styles.driverName}>{item.fullName}</Text>
                    <Text style={styles.driverEmail}>{item.email}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              style={[styles.assignButton, { backgroundColor: "#ccc", marginTop: 10 }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.assignButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: { flexDirection: "row", alignItems: "center", marginRight: 10 },
  backText: { color: "#1a3a8f", marginLeft: 5, fontWeight: "500" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1a3a8f" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    marginBottom: 20,
  },
  label: { fontWeight: "bold", marginTop: 10, fontSize: 14 },
  value: { fontSize: 16, marginTop: 2, color: "#333" },
  assignButton: {
    backgroundColor: "#1a3a8f",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  assignButtonText: { color: "#fff", fontWeight: "bold" },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "80%",
    maxHeight: "70%",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  driverItem: {
    paddingVertical: 10,
    borderBottomColor: "#ccc",
    borderBottomWidth: 1,
  },
  driverName: { fontSize: 16, fontWeight: "500" },
  driverEmail: { fontSize: 14, color: "#555" },
});
