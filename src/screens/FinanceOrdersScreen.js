import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import axios from "axios";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

// ✅ Correct backend endpoint
const API_URL = "https://spinners-backend-1.onrender.com/api/orders/";

export default function FinanceOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [generatingReceipt, setGeneratingReceipt] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(API_URL); // fetch all orders
      if (res.data.success) {
        // Only show approved orders
        const approvedOrders = res.data.orders.filter(
          (order) => order.orderStatus === "approved"
        );
        setOrders(approvedOrders);
        setFilteredOrders(approvedOrders);
      } else {
        Alert.alert("Error", "Failed to load orders");
      }
    } catch (err) {
      console.error("❌ Fetch error:", err.message);
      Alert.alert("Error", "Unable to fetch orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = (text) => {
    setSearchText(text);
    const filtered = orders.filter(
      (order) =>
        order.productId?.name?.toLowerCase().includes(text.toLowerCase()) ||
        order.userId?.fullName?.toLowerCase().includes(text.toLowerCase()) ||
        order.orderStatus?.toLowerCase().includes(text.toLowerCase()) ||
        order.supplierId?.fullName?.toLowerCase().includes(text.toLowerCase()) ||
        order.artisanId?.email?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredOrders(filtered);
  };

  const generateFinanceReport = async () => {
    try {
      setGenerating(true);

      const tableRows = filteredOrders
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

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial; padding: 20px; }
              h1 { text-align: center; color: #0a4d8c; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
              th { background-color: #f4f4f4; }
            </style>
          </head>
          <body>
            <h1>Finance Report - Approved Orders</h1>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Buyer</th>
                  <th>Product</th>
                  <th>Amount (KES)</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error("❌ Report generation failed:", error);
      Alert.alert("Error", "Failed to generate finance report");
    } finally {
      setGenerating(false);
    }
  };

  const generateReceiptPdf = async (order) => {
    try {
      setGeneratingReceipt(true);
      setSelectedOrder(order);
      
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
              border-bottom: 3px solid #0a4d8c; 
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .company-name { 
              font-size: 28px; 
              font-weight: bold; 
              color: #0a4d8c; 
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
              color: #0a4d8c; 
              border-bottom: 2px solid #0a4d8c; 
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
              background-color: #0a4d8c;
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
            <div>Order Payment Confirmation</div>
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
                <tr><td><strong>Order Status:</strong></td>
                  <td>
                    <span class="status-badge" style="background-color: ${getStatusColor(order.orderStatus)};">
                      ${getStatusText(order.orderStatus)}
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
                  <td>${order.productId?.name || "Product"}</td>
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
            TOTAL AMOUNT: ${formatCurrency(order.totalPrice)}
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
                  <td><strong>Customer</strong></td>
                  <td>${order.userId?.fullName || "Customer"}</td>
                  <td>${order.userId?.email || order.userEmail || "N/A"}</td>
                </tr>
                ${order.supplierId ? `
                <tr>
                  <td><strong>Supplier</strong></td>
                  <td>${order.supplierId?.fullName || order.supplierName || "Supplier"}</td>
                  <td>${order.supplierId?.email || order.supplierEmail || "N/A"}</td>
                </tr>
                ` : ''}
                ${order.artisanId ? `
                <tr>
                  <td><strong>Artisan</strong></td>
                  <td>${order.artisanId?.email || order.artisanName || "Artisan"}</td>
                  <td>${order.artisanId?.phone || order.artisanPhone || "N/A"}</td>
                </tr>
                ` : ''}
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
              <div><strong>Customer's Signature</strong></div>
              <div>${order.userId?.fullName || "Customer"}</div>
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
      setGeneratingReceipt(false);
      setSelectedOrder(null);
    }
  };

  // Helper functions
  const getStatusColor = (status) => {
    const colors = {
      'approved': '#22c55e',
      'completed': '#10b981',
      'pending': '#f59e0b',
      'cancelled': '#ef4444',
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a4d8c" />
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => generateReceiptPdf(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.productId?.name || "Unnamed Product"}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.orderStatus) }]}>
          <Text style={styles.statusText}>{getStatusText(item.orderStatus)}</Text>
        </View>
      </View>
      <Text style={styles.detailText}>👤 Buyer: {item.userId?.fullName || "Unknown"}</Text>
      <Text style={styles.detailText}>💰 Amount: {formatCurrency(item.totalPrice)}</Text>
      <Text style={styles.detailText}>📅 Date: {new Date(item.createdAt).toLocaleString()}</Text>
      
      {item.supplierId && (
        <Text style={styles.detailText}>🏭 Supplier: {item.supplierId?.fullName || item.supplierName}</Text>
      )}
      
      {item.artisanId && (
        <Text style={styles.detailText}>👨‍🎨 Artisan: {item.artisanId?.email || item.artisanName}</Text>
      )}

      <TouchableOpacity 
        style={styles.receiptButton}
        onPress={() => generateReceiptPdf(item)}
        disabled={generatingReceipt && selectedOrder?._id === item._id}
      >
        {generatingReceipt && selectedOrder?._id === item._id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.receiptButtonText}>📄 Generate Receipt</Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <Text style={styles.header}>Finance - Approved Orders</Text>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={generateFinanceReport}
          disabled={generating}
        >
          <Text style={styles.reportText}>
            {generating ? "Generating..." : "📊 Report"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by buyer, product, or status..."
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{filteredOrders.length}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, styles.revenue]}>
            {formatCurrency(filteredOrders.reduce((sum, order) => sum + (order.totalPrice || 0), 0))}
          </Text>
          <Text style={styles.statLabel}>Total Value</Text>
        </View>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchOrders();
            }}
          />
        }
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No orders found</Text>
            <Text style={styles.emptyStateText}>
              {searchText ? "Try adjusting your search" : "No approved orders available"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    padding: 16,
    paddingTop: 60,
  },
  header: { fontSize: 20, fontWeight: "700", color: "#0a4d8c" },
  reportBtn: {
    backgroundColor: "#0a4d8c",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reportText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  searchInput: {
    backgroundColor: "#f1f3f6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a4d8c',
  },
  revenue: {
    color: '#059669',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: { 
    fontSize: 16, 
    fontWeight: "bold", 
    color: "#1e293b",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  detailText: { 
    fontSize: 14, 
    color: "#475569", 
    marginBottom: 4,
  },
  receiptButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  receiptButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});