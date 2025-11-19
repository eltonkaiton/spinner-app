// src/screens/ContactUsScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ContactUsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Contact Us</Text>
      <Text style={styles.subTitle}>We’d love to hear from you! Get in touch anytime.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Office Address</Text>
        <Text style={styles.text}>
          Farmland Fabricators Building,{'\n'}
          Moi Avenue, Mombasa, Kenya.{'\n'}
          P.O. Box 12345-80100
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>☎️ Phone Support</Text>
        <TouchableOpacity onPress={() => Linking.openURL('tel:+254700000000')}>
          <Text style={styles.link}>+254 700 000 000</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('tel:+254711111111')}>
          <Text style={styles.link}>+254 711 111 111</Text>
        </TouchableOpacity>
        <Text style={styles.note}>Available: Mon–Sat (8:00 AM – 6:00 PM)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📧 Email Support</Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:support@spinnersweb.com')}>
          <Text style={styles.link}>support@yourapp.com</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:info@spinnersweb.com')}>
          <Text style={styles.link}>info@yourapp.com</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌐 Social Media</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://facebook.com/spinnersweb')}>
          <Text style={styles.link}>Facebook: @YourApp</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://twitter.com/spinnersweb')}>
          <Text style={styles.link}>Twitter: @YourApp</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://instagram.com/spinnersweb')}>
          <Text style={styles.link}>Instagram: @YourApp</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Ionicons name="chatbox-ellipses-outline" size={22} color="#1a3a8f" />
        <Text style={styles.footerText}>Our team usually responds within 24 hours.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 26,
    color: '#1a3a8f',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subTitle: {
    color: '#555',
    fontSize: 15,
    marginBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#1a3a8f',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  link: {
    color: '#1a3a8f',
    textDecorationLine: 'underline',
    marginBottom: 5,
    fontSize: 15,
  },
  note: {
    color: '#777',
    fontStyle: 'italic',
    marginTop: 5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
  },
  footerText: {
    color: '#333',
    marginLeft: 10,
  },
});

export default ContactUsScreen;
