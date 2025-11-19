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
} from 'react-native';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../contexts/AuthContext';

const API_URL = 'https://spinners-backend-1.onrender.com/api/inventory';

export default function InventoryScreen() {
  const navigation = useNavigation();
  const { logout, user } = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      fetchProducts();
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
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

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      {sidebarOpen && (
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>Menu</Text>
          </View>

          <ScrollView style={styles.menuContainer}>
            <TouchableOpacity
              style={[styles.menuItem, styles.activeMenuItem]}
              onPress={() => {
                setSidebarOpen(false);
              }}
            >
              <Text style={styles.menuText}>🛒 Products</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('AddProduct');
                setSidebarOpen(false);
              }}
            >
              <Text style={styles.menuText}>➕ Add Product</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('AdminOrders');
                setSidebarOpen(false);
              }}
            >
              <Text style={styles.menuText}>📦 Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('InventoryOrder');
                setSidebarOpen(false);
              }}
            >
              <Text style={styles.menuText}>📝 Order Products</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('Help');
                setSidebarOpen(false);
              }}
            >
              <Text style={styles.menuText}>❓ Help</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('About');
                setSidebarOpen(false);
              }}
            >
              <Text style={styles.menuText}>ℹ️ About Us</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                navigation.navigate('Contact');
                setSidebarOpen(false);
              }}
            >
              <Text style={styles.menuText}>📞 Contact Us</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSidebarOpen(!sidebarOpen)}
          >
            <Text style={styles.menuButtonText}>{sidebarOpen ? '✕' : '☰'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inventory Management</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddProduct')}
          >
            <Text style={styles.addButtonText}>+ Add New</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
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
              {filteredProducts.filter((p) => p.quantity === 0).length}
            </Text>
            <Text style={styles.statLabel}>Out of Stock</Text>
          </View>
        </View>

        {/* Product List */}
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              📋 {searchQuery ? 'Search Results' : 'Products in Stock'}
              {searchQuery && ` (${filteredProducts.length})`}
            </Text>
            <TouchableOpacity onPress={fetchProducts} style={styles.refreshButton}>
              <Text style={styles.refreshText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
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
  );
}

// --------------------------- Styles ---------------------------
const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f8fafc' },
  sidebar: {
    width: 280,
    backgroundColor: '#1a3a8f',
    paddingTop: 60,
    justifyContent: 'space-between',
  },
  sidebarHeader: { 
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#2d4ba8' 
  },
  sidebarTitle: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 20 
  },
  menuContainer: { 
    flex: 1, 
    paddingHorizontal: 15, 
    paddingTop: 20 
  },
  menuItem: { 
    backgroundColor: 'transparent', 
    paddingVertical: 15, 
    paddingHorizontal: 15, 
    marginBottom: 5, 
    borderRadius: 10 
  },
  activeMenuItem: { 
    backgroundColor: '#2d4ba8' 
  },
  menuText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '500' 
  },
  logoutButton: { 
    backgroundColor: '#ffdddd', 
    margin: 15, 
    paddingVertical: 15, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  logoutText: { 
    color: '#d32f2f', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  mainContent: { 
    flex: 1 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#fff', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
    elevation: 3 
  },
  menuButton: { 
    padding: 8, 
    borderRadius: 8, 
    backgroundColor: '#f1f5f9' 
  },
  menuButtonText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1a3a8f' 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1e293b' 
  },
  addButton: { 
    backgroundColor: '#1a3a8f', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  addButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 14 
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  clearSearchButton: {
    padding: 4,
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
    marginHorizontal: 16, 
    marginTop: 16, 
    borderRadius: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
    elevation: 2 
  },
  statCard: { 
    flex: 1, 
    alignItems: 'center', 
    padding: 10 
  },
  statNumber: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1a3a8f', 
    marginBottom: 4 
  },
  statLabel: { 
    fontSize: 12, 
    color: '#64748b', 
    fontWeight: '500' 
  },
  content: { 
    flex: 1, 
    padding: 16 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1e293b' 
  },
  refreshButton: { 
    backgroundColor: '#f1f5f9', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 6 
  },
  refreshText: { 
    color: '#475569', 
    fontSize: 12, 
    fontWeight: '500' 
  },
  loadingContainer: { 
    padding: 40, 
    alignItems: 'center' 
  },
  loadingText: { 
    color: '#64748b', 
    fontSize: 16 
  },
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 40, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    marginTop: 20 
  },
  emptyStateText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#475569', 
    marginBottom: 8 
  },
  emptyStateSubtext: { 
    fontSize: 14, 
    color: '#94a3b8', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  emptyStateButton: { 
    backgroundColor: '#1a3a8f', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 8 
  },
  emptyStateButtonText: { 
    color: '#fff', 
    fontWeight: '600', 
    fontSize: 14 
  },
  listContainer: { 
    paddingBottom: 20 
  },
  productCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
    elevation: 2, 
    borderLeftWidth: 4, 
    borderLeftColor: '#1a3a8f' 
  },
  productInfo: { 
    flex: 1, 
    marginRight: 12 
  },
  productName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1e293b', 
    marginBottom: 4 
  },
  productDescription: { 
    fontSize: 14, 
    color: '#64748b', 
    marginBottom: 8, 
    lineHeight: 18 
  },
  productDetails: { 
    flexDirection: 'row', 
    marginBottom: 8 
  },
  productPrice: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#1a3a8f', 
    marginRight: 16 
  },
  productQuantity: { 
    fontSize: 14, 
    color: '#475569', 
    fontWeight: '500' 
  },
  stockBadge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  stockText: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: '600' 
  },
  productActions: { 
    flexDirection: 'row' 
  },
  editButton: { 
    backgroundColor: '#dbeafe', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 6, 
    marginRight: 8 
  },
  editButtonText: { 
    color: '#1a3a8f', 
    fontSize: 12, 
    fontWeight: '600' 
  },
  deleteButton: { 
    backgroundColor: '#fee2e2', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 6 
  },
  deleteButtonText: { 
    color: '#dc2626', 
    fontSize: 12, 
    fontWeight: '600' 
  },
});