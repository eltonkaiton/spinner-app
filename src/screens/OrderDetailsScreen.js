// src/screens/OrderDetailsScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function OrderDetailsScreen({ route }) {
  const { order } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Details</Text>
      <Text>Order ID: {order._id}</Text>
      <Text>Status: {order.status}</Text>
      <Text>Total Amount: KES {order.total}</Text>
      <Text>Date: {new Date(order.createdAt).toLocaleString()}</Text>

      <Text style={styles.subtitle}>Products:</Text>
      {order.items.map((item, idx) => (
        <View key={idx} style={styles.productItem}>
          <Text>{item.productName}</Text>
          <Text>Qty: {item.quantity}</Text>
          <Text>Price: KES {item.price}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  productItem: {
    backgroundColor: '#f1f1f1',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
});
