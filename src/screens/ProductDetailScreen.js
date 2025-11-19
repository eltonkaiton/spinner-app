// ./src/screens/ProductDetailScreen.js
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;

  const handleOrder = () => {
    // ✅ Navigate to the correct screen name ("Orders" as defined in App.js)
    navigation.navigate('Orders', { product });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 🔙 Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color="#1a3a8f" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* 🖼 Product Image */}
      <Image
        source={
          product.image ? { uri: product.image } : require('../../assets/icon.png')
        }
        style={styles.image}
        resizeMode="cover"
      />

      {/* 📦 Product Information */}
      <View style={styles.infoWrap}>
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.price}>
          {product.price?.toFixed ? product.price.toFixed(2) : product.price}{' '}
          {product.currency || 'KES'}
        </Text>
        <Text style={styles.category}>Category: {product.category}</Text>
        <Text style={styles.artisan}>Artisan: {product.artisanName}</Text>
        <Text style={styles.quantity}>Available Quantity: {product.quantity}</Text>

        {product.description ? (
          <Text style={styles.description}>{product.description}</Text>
        ) : null}

        {/* 🛒 Order Button */}
        <TouchableOpacity style={styles.orderBtn} onPress={handleOrder}>
          <Text style={styles.orderBtnText}>Order Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fafafa',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backText: {
    color: '#1a3a8f',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    marginBottom: 16,
  },
  infoWrap: {
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    color: '#1a3a8f',
    fontWeight: '600',
    marginBottom: 8,
  },
  category: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  artisan: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 16,
  },
  orderBtn: {
    backgroundColor: '#1a3a8f',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  orderBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
