import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Footer from './Footer';

const Layout = ({ children, style }) => {
  return (
    <SafeAreaView style={[styles.container, style]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a3a8f" />
      <View style={styles.content}>{children}</View>
      <Footer />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
  },
});

export default Layout;
