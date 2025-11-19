// src/screens/AboutUsScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const AboutUsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>About Us</Text>
      <Text style={styles.text}>
        Welcome to Farmland Fabricators System, a modern platform designed to simplify how artisans, 
        manufacturers, and businesses manage inventory, showcase products, and connect with customers.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Our Mission</Text>
        <Text style={styles.text}>
          To empower artisans and small business owners by providing digital tools 
          that help them manage, sell, and scale efficiently. We aim to bridge 
          traditional craftsmanship with modern technology.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👁 Our Vision</Text>
        <Text style={styles.text}>
          To be Kenya’s most trusted platform for artisans and creators—connecting 
          skill, innovation, and opportunity to build a stronger digital economy.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🤝 What We Offer</Text>
        <Text style={styles.text}>
          • Inventory management for artisans{'\n'}
          • Real-time product uploads and tracking{'\n'}
          • Communication tools for clients and sellers{'\n'}
          • Support for payments, orders, and analytics
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Together, let's shape the future of local industry — one product at a time.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 26,
    color: '#1a3a8f',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#1a3a8f',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  text: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  footer: {
    marginTop: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  footerText: {
    textAlign: 'center',
    color: '#333',
    fontStyle: 'italic',
  },
});

export default AboutUsScreen;
