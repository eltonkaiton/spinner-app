// components/Footer.js
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";

const Footer = () => {
  return (
    <View style={styles.footer}>
      <Text style={styles.text}>
        2025 ©{" "}
        <Text style={styles.companyName}>Forge Reactor</Text> | Forging Digital Innovation
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: "#1A1F2E", // Forge Reactor dark navy
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 2,
    borderTopColor: "#FF6B35", // Forge Reactor orange accent
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  text: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  companyName: {
    color: "#FF6B35", // Forge Reactor orange
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

export default Footer;