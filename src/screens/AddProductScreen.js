// ./src/screens/AddProductScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';

const API_URL = 'https://spinners-backend-1.onrender.com/api/inventory'; // ✅ Your backend route

export default function AddProductScreen({ navigation }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    artisanName: '',
    price: '',
    quantity: '',
    image: '',
  });

  const handleSubmit = async () => {
    // Validation
    if (!form.name || !form.price || !form.quantity || !form.category) {
      return Alert.alert('Missing Fields', 'Please fill all required fields.');
    }

    try {
      const response = await axios.post(API_URL, {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        artisanName: form.artisanName.trim(),
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity),
        image: form.image.trim(),
      });

      Alert.alert('✅ Success', 'Product added successfully!');
      console.log('Product saved:', response.data);

      // Reset form
      setForm({
        name: '',
        description: '',
        category: '',
        artisanName: '',
        price: '',
        quantity: '',
        image: '',
      });

      // Navigate back to Inventory screen
      navigation.navigate('Inventory');
    } catch (error) {
      console.error('❌ Add product error:', error);
      Alert.alert('Error', 'Failed to add product. Please check the backend connection.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🧺 Add New Product</Text>

        <TextInput
          placeholder="Product Name"
          style={styles.input}
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
        />

        <TextInput
          placeholder="Description"
          style={[styles.input, { height: 80 }]}
          multiline
          value={form.description}
          onChangeText={(text) => setForm({ ...form, description: text })}
        />

        <TextInput
          placeholder="Category (e.g., Jewelry, Home Décor, Skincare)"
          style={styles.input}
          value={form.category}
          onChangeText={(text) => setForm({ ...form, category: text })}
        />

        <TextInput
          placeholder="Artisan Name (e.g., Mama Aisha Crafts)"
          style={styles.input}
          value={form.artisanName}
          onChangeText={(text) => setForm({ ...form, artisanName: text })}
        />

        <TextInput
          placeholder="Price (KES)"
          style={styles.input}
          keyboardType="numeric"
          value={form.price}
          onChangeText={(text) => setForm({ ...form, price: text })}
        />

        <TextInput
          placeholder="Quantity in Stock"
          style={styles.input}
          keyboardType="numeric"
          value={form.quantity}
          onChangeText={(text) => setForm({ ...form, quantity: text })}
        />

        <TextInput
          placeholder="Image URL (optional)"
          style={styles.input}
          value={form.image}
          onChangeText={(text) => setForm({ ...form, image: text })}
        />

        <Button title="Add Product" onPress={handleSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
});
