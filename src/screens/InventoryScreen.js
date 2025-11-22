// ./src/screens/InventoryScreen.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../contexts/AuthContext';

const API_URL = 'https://spinners-backend-1.onrender.com/api/inventory';
const ORDERS_API_URL = 'https://spinners-backend-1.onrender.com/api/orders';
const { width, height } = Dimensions.get('window');

export default function InventoryScreen() {
  const navigation = useNavigation();
  const { logout, user, token } = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [inventoryOrders, setInventoryOrders] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      fetchProducts();
      fetchInventoryOrders();
    }, [])
  );

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setProducts(res.data);
    } catch (err) {
      console.log('Fetch error:', err.message);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryOrders = async () => {
    try {
      const response = await axios.get(`${ORDERS_API_URL}/artisan/inventory-orders`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      setInventoryOrders(response.data.orders || []);
    } catch (err) {
      console.log('Fetch inventory orders error:', err.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProducts(), fetchInventoryOrders()]);
    setRefreshing(false);
  };

  const handleDelete = async (id) => {
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/${id}`);
            Alert.alert('Success', 'Product deleted successfully');
            fetchProducts();
          } catch (err) {
            console.log('Delete error:', err.message);
            Alert.alert('Error', 'Failed to delete product');
          }
        },
      },
    ]);
  };

  const handleMarkAsReceived = async (order) => {
    Alert.alert(
      'Confirm Receipt',
      `Are you sure you want to mark order ${order._id.substring(0, 8)} as received? This will increase the product quantity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Received',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Update order status to received
              await axios.put(
                `${ORDERS_API_URL}/mark-received/${order._id}`,
                {},
                { 
                  headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  } 
                }
              );

              // Find the product to update
              const productToUpdate = products.find(p => p._id === order.productId);
              
              if (productToUpdate) {
                // Calculate new quantity
                const newQuantity = productToUpdate.quantity + order.quantity;
                
                // Update product quantity
                await axios.put(
                  `${API_URL}/${order.productId}`,
                  { quantity: newQuantity },
                  {
                    headers: { 
                      Authorization: `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );

                Alert.alert(
                  'Success', 
                  `Order marked as received! ${order.quantity} units added to ${productToUpdate.name}. New quantity: ${newQuantity}`
                );
                
                // Refresh data
                await Promise.all([fetchProducts(), fetchInventoryOrders()]);
              } else {
                Alert.alert('Error', 'Product not found in inventory');
              }
            } catch (err) {
              console.log('Mark as received error:', err.message);
              Alert.alert('Error', 'Failed to mark order as received');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            setSidebarOpen(false);
          } catch (err) {
            console.error('Logout error:', err);
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { status: 'Out of Stock', color: '#ff6b6b' };
    if (quantity <= 10) return { status: 'Low Stock', color: '#ffa726' };
    return { status: 'In Stock', color: '#4caf50' };
  };

  const getOrderStatusColor = (status) => {
    const colors = {
      'pending': '#f59e0b',
      'approved': '#3b82f6',
      'shipped': '#8b5cf6',
      'delivered': '#10b981',
      'received': '#059669',
      'completed': '#059669',
      'cancelled': '#ef4444',
      'rejected': '#dc2626'
    };
    return colors[status?.toLowerCase()] || '#6b7280';
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get pending inventory orders that can be marked as received
  const pendingReceiptOrders = inventoryOrders.filter(order => 
    (order.orderStatus === 'delivered' || order.orderStatus === 'shipped') && 
    order.orderType === 'inventory'
  );

  const renderInventoryOrder = ({ item }) => {
    const product = products.find(p => p._id === item.productId);
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>Order: {item._id?.substring(0, 8)}...</Text>
          <View style={[styles.orderStatusBadge, { backgroundColor: getOrderStatusColor(item.orderStatus) }]}>
            <Text style={styles.orderStatusText}>{item.orderStatus?.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.orderDetails}>
          <Text style={styles.orderProductName}>
            📦 {product?.name || 'Product'} x {item.quantity}
          </Text>
          
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Supplier:</Text>
            <Text style={styles.orderInfoValue}>
              {item.supplierId?.fullName || item.supplierName || 'Supplier'}
            </Text>
          </View>
          
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>Order Date:</Text>
            <Text style={styles.orderInfoValue}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>

          {(item.orderStatus === 'delivered' || item.orderStatus === 'shipped') && (
            <TouchableOpacity
              style={styles.receiveButton}
              onPress={() => handleMarkAsReceived(item)}
              disabled={loading}
            >
              <Text style={styles.receiveButtonText}>
                {loading ? 'Processing...' : '✓ Mark as Received'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        backgroundColor="#1a3a8f" 
        barStyle="light-content" 
        translucent={false}
      />
      <View style={styles.container}>
        {/* Sidebar Overlay */}
        {sidebarOpen && (
          <TouchableOpacity 
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        {sidebarOpen && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
                  <Text style={styles.userEmail}>{user?.email}</Text>
                  <Text style={styles.userRole}>{user?.role}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeSidebarButton}
                onPress={() => setSidebarOpen(false)}
              >
                <Text style={styles.closeSidebarText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>MAIN MENU</Text>
                <TouchableOpacity
                  style={[styles.menuItem, styles.activeMenuItem]}
                  onPress={() => setSidebarOpen(false)}
                >
                  <Text style={styles.menuIcon}>🛒</Text>
                  <Text style={styles.menuText}>Products</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    navigation.navigate('AddProduct');
                    setSidebarOpen(false);
                  }}
                >
                  <Text style={styles.menuIcon}>➕</Text>
                  <Text style={styles.menuText}>Add Product</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    navigation.navigate('AdminOrders');
                    setSidebarOpen(false);
                  }}
                >
                  <Text style={styles.menuIcon}>📦</Text>
                  <Text style={styles.menuText}>Orders</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    navigation.navigate('InventoryOrder');
                    setSidebarOpen(false);
                  }}
                >
                  <Text style={styles.menuIcon}>📝</Text>
                  <Text style={styles.menuText}>Order Products</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.menuSection}>
                <Text style={styles.menuSectionTitle}>SUPPORT</Text>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    navigation.navigate('Help');
                    setSidebarOpen(false);
                  }}
                >
                  <Text style={styles.menuIcon}>❓</Text>
                  <Text style={styles.menuText}>Help</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    navigation.navigate('About');
                    setSidebarOpen(false);
                  }}
                >
                  <Text style={styles.menuIcon}>ℹ️</Text>
                  <Text style={styles.menuText}>About Us</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    navigation.navigate('Contact');
                    setSidebarOpen(false);
                  }}
                >
                  <Text style={styles.menuIcon}>📞</Text>
                  <Text style={styles.menuText}>Contact Us</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutIcon}>🚪</Text>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Header - Fixed with proper safe area spacing */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setSidebarOpen(!sidebarOpen)}
            >
              <Text style={styles.menuButtonText}>☰</Text>
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Inventory Management</Text>
              <Text style={styles.headerSubtitle}>Manage your products</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddProduct')}
            >
              <Text style={styles.addButtonText}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Stats Overview */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{filteredProducts.length}</Text>
              <Text style={styles.statLabel}>Total Products</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {filteredProducts.filter((p) => p.quantity > 0).length}
              </Text>
              <Text style={styles.statLabel}>In Stock</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {pendingReceiptOrders.length}
              </Text>
              <Text style={styles.statLabel}>Pending Receipt</Text>
            </View>
          </View>

          {/* Pending Receipt Orders Section */}
          {pendingReceiptOrders.length > 0 && (
            <View style={styles.pendingReceiptSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pending Receipt ({pendingReceiptOrders.length})</Text>
                <Text style={styles.sectionSubtitle}>Mark orders as received to update inventory</Text>
              </View>
              <FlatList
                data={pendingReceiptOrders}
                keyExtractor={(item) => item._id}
                renderItem={renderInventoryOrder}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ordersListHorizontal}
              />
            </View>
          )}

          {/* Product List */}
          <View style={styles.content}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {searchQuery ? `Search Results (${filteredProducts.length})` : 'All Products'}
              </Text>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
                <Text style={styles.refreshText}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>

            {loading && products.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : filteredProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>
                  {searchQuery ? 'No products found' : 'No products available'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {searchQuery 
                    ? 'Try a different search term' 
                    : 'Add your first product to get started'
                  }
                </Text>
                {!searchQuery && (
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => navigation.navigate('AddProduct')}
                  >
                    <Text style={styles.emptyStateButtonText}>Add Product</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item._id}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#1a3a8f']}
                  />
                }
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const stockStatus = getStockStatus(item.quantity);
                  return (
                    <View style={styles.productCard}>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName}>{item.name}</Text>
                        {item.description ? (
                          <Text style={styles.productDescription} numberOfLines={2}>
                            {item.description}
                          </Text>
                        ) : null}
                        <View style={styles.productDetails}>
                          <Text style={styles.productPrice}>KES {item.price}</Text>
                          <Text style={styles.productQuantity}>Qty: {item.quantity}</Text>
                        </View>
                        <View
                          style={[styles.stockBadge, { backgroundColor: stockStatus.color }]}
                        >
                          <Text style={styles.stockText}>{stockStatus.status}</Text>
                        </View>
                      </View>
                      <View style={styles.productActions}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => navigation.navigate('EditProduct', { product: item })}
                        >
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDelete(item._id)}
                        >
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                contentContainerStyle={styles.listContainer}
              />
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// --------------------------- Styles ---------------------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a3a8f',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.82,
    backgroundColor: '#fff',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 25,
    paddingTop: 60, // Increased top padding for status bar
    backgroundColor: '#065f46',
    borderBottomWidth: 1,
    borderBottomColor: '#047857',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#d1fae5',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 11,
    color: '#a7f3d0',
    fontStyle: 'italic',
  },
  closeSidebarButton: {
    padding: 8,
    marginLeft: 10,
  },
  closeSidebarText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
  },
  menuContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  menuSection: {
    marginTop: 20,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    marginHorizontal: 25,
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 25,
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  activeMenuItem: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#1a3a8f',
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 15,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  sidebarFooter: {
    padding: 25,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  logoutText: {
    fontSize: 15,
    color: '#dc2626',
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuButton: {
    padding: 10,
    marginRight: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  menuButtonText: {
    fontSize: 18,
    color: '#1a3a8f',
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#1a3a8f',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  // Pending Receipt Section Styles
  pendingReceiptSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  ordersListHorizontal: {
    paddingVertical: 8,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  orderDetails: {
    flex: 1,
  },
  orderProductName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderInfoLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  orderInfoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  receiveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  receiveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  content: {
    flex: 1,
    padding: 16,
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
  refreshButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  refreshText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
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
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 20,
  },
  productCard: {
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
    borderLeftWidth: 4,
    borderLeftColor: '#1a3a8f',
  },
  productInfo: {
    flex: 1,
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 18,
  },
  productDetails: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a3a8f',
    marginRight: 16,
  },
  productQuantity: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  stockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#1a3a8f',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
});