// src/screens/HelpScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const HelpScreen = () => {
  const openEmail = () => Linking.openURL('mailto:support@spinnersweb.com');
  const openPhone = () => Linking.openURL('tel:+254700000000');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Help & Support</Text>
      <Text style={styles.subTitle}>
        We're here to assist you with any issues, questions, or feedback you may have.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧾 Getting Started</Text>
        <Text style={styles.text}>
          1. Register or log in using your credentials.{'\n'}
          2. Explore the Home or Inventory screens depending on your role.{'\n'}
          3. Add, view, or manage your products in the Inventory screen.{'\n'}
          4. Access your profile and settings through the main menu.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛠 Common Issues</Text>
        <Text style={styles.text}>
          • **Login Problems:** Ensure your email and password are correct. If forgotten, click “Forgot Password”.{'\n\n'}
          • **App Not Loading:** Check your internet connection or try restarting the app.{'\n\n'}
          • **Product Not Saving:** Make sure all required fields are filled, then try again.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💬 Need More Help?</Text>
        <Text style={styles.text}>
          Our support team is available Monday–Saturday from 8:00 AM to 6:00 PM (EAT). You can reach us by:
        </Text>

        <TouchableOpacity style={styles.contactRow} onPress={openEmail}>
          <Ionicons name="mail-outline" size={22} color="#1a3a8f" />
          <Text style={styles.contactText}>support@yourapp.com</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactRow} onPress={openPhone}>
          <Ionicons name="call-outline" size={22} color="#1a3a8f" />
          <Text style={styles.contactText}>+254 700 000 000</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          You can also visit our Contact Us page for direct communication.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 26,
    color: '#1a3a8f',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 15,
    color: '#555',
    marginBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a3a8f',
    marginBottom: 8,
  },
  text: {
    color: '#333',
    lineHeight: 22,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  contactText: {
    marginLeft: 10,
    color: '#1a3a8f',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  footerNote: {
    color: '#777',
    marginTop: 15,
    fontStyle: 'italic',
  },
});

export default HelpScreen;
