// App.js
import React, { useContext } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, AuthContext } from "./src/contexts/AuthContext";

// Components
import Layout from "./src/components/Layout";

// Screens
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HomeScreen from "./src/screens/HomeScreen";
import InventoryScreen from "./src/screens/InventoryScreen";
import AddProductScreen from "./src/screens/AddProductScreen";
import InventoryOrderScreen from "./src/screens/InventoryOrderScreen";
import SupplierScreen from "./src/screens/SupplierScreen";
import OrderScreen from "./src/screens/OrderScreen";
import OrderDetailsScreen from "./src/screens/OrderDetailsScreen";
import AboutUsScreen from "./src/screens/AboutUsScreen";
import ContactUsScreen from "./src/screens/ContactUsScreen";
import HelpScreen from "./src/screens/HelpScreen";
import AdminOrdersScreen from "./src/screens/AdminOrdersScreen";
import FinanceHomeScreen from "./src/screens/FinanceHomeScreen";
import FinanceOrdersScreen from "./src/screens/FinanceOrdersScreen";
import FinanceInventoryOrderScreen from "./src/screens/FinanceInventoryOrderScreen";
import SupervisorHomeScreen from "./src/screens/SupervisorHomeScreen";
import SupervisorOrdersScreen from "./src/screens/SupervisorOrdersScreen";
import SupervisorOrderDetailsScreen from "./src/screens/SupervisorOrderDetailsScreen";
import DriverHomeScreen from "./src/screens/DriverHomeScreen";
import DriverDeliveryScreen from "./src/screens/DriverDeliveryScreen";
import ProductDetailScreen from "./src/screens/ProductDetailScreen";
import ChatScreen from "./src/screens/ChatScreen";

const Stack = createNativeStackNavigator();

// Create separate navigators for better organization
function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login">
        {(props) => (
          <Layout>
            <LoginScreen {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {(props) => (
          <Layout>
            <RegisterScreen {...props} />
          </Layout>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function ArtisanNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="AddProduct" component={AddProductScreen} />
      <Stack.Screen name="InventoryOrder" component={InventoryOrderScreen} />
      <Stack.Screen name="Orders" component={OrderScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="About" component={AboutUsScreen} />
      <Stack.Screen name="Contact" component={ContactUsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      {/* ✅ Added AdminOrdersScreen to ArtisanNavigator */}
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
    </Stack.Navigator>
  );
}

function SupplierNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SupplierDashboard">
        {(props) => (
          <Layout>
            <SupplierScreen {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="Orders" component={OrderScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="About" component={AboutUsScreen} />
      <Stack.Screen name="Contact" component={ContactUsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function FinanceNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FinanceHome" component={FinanceHomeScreen} />
      <Stack.Screen name="FinanceOrders" component={FinanceOrdersScreen} />
      <Stack.Screen name="FinanceInventoryOrderScreen" component={FinanceInventoryOrderScreen} />
      <Stack.Screen name="Orders" component={OrderScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="About" component={AboutUsScreen} />
      <Stack.Screen name="Contact" component={ContactUsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function SupervisorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SupervisorHome" component={SupervisorHomeScreen} />
      <Stack.Screen name="SupervisorOrders" component={SupervisorOrdersScreen} />
      <Stack.Screen name="SupervisorOrderDetails" component={SupervisorOrderDetailsScreen} />
      <Stack.Screen name="Orders" component={OrderScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="About" component={AboutUsScreen} />
      <Stack.Screen name="Contact" component={ContactUsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function DriverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
      <Stack.Screen name="DriverDeliveryScreen" component={DriverDeliveryScreen} />
      <Stack.Screen name="Orders" component={OrderScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="About" component={AboutUsScreen} />
      <Stack.Screen name="Contact" component={ContactUsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function CustomerNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home">
        {(props) => (
          <Layout>
            <HomeScreen {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="Orders" component={OrderScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="About" component={AboutUsScreen} />
      <Stack.Screen name="Contact" component={ContactUsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="SupplierDashboard">
        {(props) => (
          <Layout>
            <SupplierScreen {...props} />
          </Layout>
        )}
      </Stack.Screen>
      <Stack.Screen name="Orders" component={OrderScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="About" component={AboutUsScreen} />
      <Stack.Screen name="Contact" component={ContactUsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1a3a8f" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // 🔒 Unauthenticated Users - Auth Navigator
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          // ✅ Authenticated Users - Role-based Navigators
          <>
            {/* 🎨 Artisan Routes */}
            {user.role === "artisan" && (
              <Stack.Screen name="Main" component={ArtisanNavigator} />
            )}

            {/* 👥 Supplier Routes */}
            {user.role === "supplier" && (
              <Stack.Screen name="Main" component={SupplierNavigator} />
            )}

            {/* 💰 Finance Routes */}
            {user.role === "finance" && (
              <Stack.Screen name="Main" component={FinanceNavigator} />
            )}

            {/* 👨‍💼 Supervisor Routes */}
            {user.role === "supervisor" && (
              <Stack.Screen name="Main" component={SupervisorNavigator} />
            )}

            {/* 🚚 Driver Routes */}
            {user.role === "driver" && (
              <Stack.Screen name="Main" component={DriverNavigator} />
            )}

            {/* 👤 Customer Routes */}
            {user.role === "customer" && (
              <Stack.Screen name="Main" component={CustomerNavigator} />
            )}

            {/* 🏢 Admin Routes */}
            {user.role === "admin" && (
              <Stack.Screen name="Main" component={AdminNavigator} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
  },
});