// ./src/screens/HomeScreen.js
import React, { useContext, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { AuthContext } from '../contexts/AuthContext';
import API from '../api/api';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import OrderScreen from './OrderScreen';
import AboutUsScreen from './AboutUsScreen';
import HelpScreen from './HelpScreen';
import ContactUsScreen from './ContactUsScreen';
import ProductDetailScreen from './ProductDetailScreen'; // Import ProductDetailScreen

const Drawer = createDrawerNavigator();

// =============================
// Custom Drawer Content
// =============================
function CustomDrawerContent(props) {
  const { logout } = useContext(AuthContext);

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItem label="Home" onPress={() => props.navigation.navigate('HomeContent')} />
      <DrawerItem label="Orders" onPress={() => props.navigation.navigate('Orders')} />
      <DrawerItem label="About Us" onPress={() => props.navigation.navigate('About')} />
      <DrawerItem label="Help" onPress={() => props.navigation.navigate('Help')} />
      <DrawerItem label="Contact" onPress={() => props.navigation.navigate('Contact')} />
      <DrawerItem label="Logout" onPress={logout} />
    </DrawerContentScrollView>
  );
}

// =============================
// Home Content (Main UI)
// =============================
function HomeContent({ navigation }) {
  const { user } = useContext(AuthContext);

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories] = useState([
    { id: null, name: 'All' },
    { id: 'textiles', name: 'Textiles' },
    { id: 'jewelry', name: 'Jewelry' },
    { id: 'home', name: 'Home' },
    { id: 'furniture', name: 'Furniture' },
    { id: 'art', name: 'Art' },
  ]);

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState({});

  // =============================
  // Fetch products (with search & category)
  // =============================
  const fetchProducts = useCallback(
    async ({ pageToLoad = 1, reset = false, q = query, category = selectedCategory } = {}) => {
      if (reset) {
        setLoading(true);
        setHasMore(true);
        setPage(1);
      } else if (pageToLoad > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await API.get('/inventory');
        let incoming = Array.isArray(res.data) ? res.data : [];

        // Search filter
        if (q && q.trim()) {
          const qLower = q.toLowerCase();
          incoming = incoming.filter(
            (p) =>
              p.name.toLowerCase().includes(qLower) ||
              (p.category && p.category.toLowerCase().includes(qLower)) ||
              (p.artisanName && p.artisanName.toLowerCase().includes(qLower))
          );
        }

        // Category filter
        if (category) incoming = incoming.filter((p) => p.category === category);

        // Pagination (client-side)
        const start = (pageToLoad - 1) * pageSize;
        const end = start + pageSize;
        const paged = incoming.slice(start, end);

        if (reset) setProducts(paged);
        else setProducts((prev) => [...prev, ...paged]);

        setHasMore(end < incoming.length);
        setPage(pageToLoad);
      } catch (err) {
        console.log('Fetch products error', err?.response?.data || err.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [query, selectedCategory]
  );

  useEffect(() => {
    fetchProducts({ pageToLoad: 1, reset: true });
  }, []);

  // Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts({ pageToLoad: 1, reset: true });
  };

  // Load more
  const loadMore = async () => {
    if (loadingMore || loading || !hasMore) return;
    const next = page + 1;
    await fetchProducts({ pageToLoad: next });
  };

  const openProduct = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => openProduct(item)}>
        <Image
          source={item.image ? { uri: item.image } : require('../../assets/icon.png')}
          style={styles.cardImage}
          resizeMode="cover"
        />
      </TouchableOpacity>
      <View style={styles.cardBody}>
        <Text numberOfLines={2} style={styles.cardTitle}>
          {item.name}
        </Text>
        <Text style={styles.cardPrice}>
          {item.price?.toFixed ? item.price.toFixed(2) : item.price} {item.currency || 'KES'}
        </Text>
        <TouchableOpacity style={styles.orderBtn} onPress={() => openProduct(item)}>
          <Text style={styles.orderBtnText}>Order Now</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.favoriteBtn} onPress={() => toggleFavorite(item._id)}>
        <FontAwesome name={favorites[item._id] ? 'heart' : 'heart-o'} size={18} color="#e63946" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <MaterialIcons name="menu" size={28} color="#1a3a8f" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.greeting}>
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </Text>
          <Text style={styles.subtitle}>Explore our authentic Kenyan crafts</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            placeholder="Search for a product..."
            placeholderTextColor="#999"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesWrap}>
        <FlatList
          data={categories}
          horizontal
          keyExtractor={(c) => String(c.id || 'all')}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = selectedCategory === item.id;
            return (
              <TouchableOpacity
                style={[styles.categoryBtn, active && styles.categoryBtnActive]}
                onPress={() => setSelectedCategory(item.id)}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Product Grid */}
      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        numColumns={2}
        renderItem={renderItem}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          loadingMore ? (
            <View style={{ padding: 12 }}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" />
        </View>
      )}
    </View>
  );
}

// =============================
// Main Drawer Navigator
// =============================
export default function HomeScreen() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Drawer.Screen name="HomeContent" component={HomeContent} />
      <Drawer.Screen name="Orders" component={OrderScreen} />
      <Drawer.Screen name="About" component={AboutUsScreen} />
      <Drawer.Screen name="Help" component={HelpScreen} />
      <Drawer.Screen name="Contact" component={ContactUsScreen} />
      {/* Hidden Product Detail screen for navigation */}
      <Drawer.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ drawerItemStyle: { height: 0 } }}
      />
    </Drawer.Navigator>
  );
}

// =============================
// Styles
// =============================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  header: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 20, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  searchRow: { paddingHorizontal: 12, marginBottom: 8 },
  searchBox: { backgroundColor: '#fff', borderRadius: 10, height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: '#e6e6e6' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#222' },
  categoriesWrap: { paddingVertical: 10, paddingLeft: 12 },
  categoryBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  categoryBtnActive: { backgroundColor: '#1a3a8f' },
  categoryText: { color: '#333', fontSize: 13 },
  categoryTextActive: { color: '#fff' },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', width: '48%', marginBottom: 10, borderWidth: 1, borderColor: '#eee', position: 'relative' },
  cardImage: { width: '100%', height: 130, backgroundColor: '#f2f2f2' },
  cardBody: { padding: 10, alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111', textAlign: 'center' },
  cardPrice: { marginTop: 6, fontSize: 13, fontWeight: '700', color: '#1a3a8f' },
  orderBtn: { marginTop: 8, backgroundColor: '#1a3a8f', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  orderBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  favoriteBtn: { position: 'absolute', top: 8, right: 8, padding: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.6)' },
});