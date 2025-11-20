// ./src/screens/RegisterScreen.js
import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../contexts/AuthContext";

export default function RegisterScreen() {
  const navigation = useNavigation();
  const { register, isLoading } = useContext(AuthContext);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    return digitsOnly.length >= 10;
  };

  const onRegister = async () => {
    // 1️⃣ Validate fields
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    // Phone number validation
    if (!validatePhoneNumber(phone)) {
      Alert.alert(
        "Invalid Phone Number", 
        "Please enter a valid phone number with at least 10 digits."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    // Password length validation
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return;
    }

    try {
      // 2️⃣ Call AuthContext register function with object
      await register({ fullName, email, phone, password });

      // 3️⃣ Navigate to home or login if needed
      navigation.navigate("Home"); // or "Login" if you don't auto-login
    } catch (err) {
      console.log("Registration failed:", err);
      // Error alert handled in AuthContext.register
    }
  };

  // Format phone number as user types (optional)
  const handlePhoneChange = (text) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    
    // Format the phone number (optional)
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 6) {
      formatted = cleaned.replace(/(\d{3})(\d{0,3})/, '$1 $2');
    } else if (cleaned.length > 6) {
      formatted = cleaned.replace(/(\d{3})(\d{3})(\d{0,4})/, '$1 $2 $3');
    }
    
    setPhone(formatted);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>SW</Text>
            </View>
            <Text style={styles.appName}>SPINNERS WEB KENYA</Text>
          </View>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Sign Up</Text>

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="person" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              editable={!isLoading}
            />
          </View>

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
            />
          </View>

          {/* Phone */}
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="phone" size={20} color="#666" />
            <TextInput
              style={styles.input}
              placeholder="07XX XXX XXX (10+ digits)"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              editable={!isLoading}
              maxLength={15} // Allow for spaces in formatting
            />
          </View>
          <Text style={styles.phoneHint}>
            Must be at least 10 digits (e.g., 0712345678)
          </Text>

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={20} color="#666" />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter password (min. 6 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              <MaterialIcons
                name={showPassword ? "visibility-off" : "visibility"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={20} color="#666" />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              <MaterialIcons
                name={showConfirmPassword ? "visibility-off" : "visibility"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, isLoading && styles.buttonDisabled]}
            onPress={onRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              disabled={isLoading}
            >
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1 },
  header: {
    backgroundColor: "#1a3a8f",
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logoContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    marginBottom: 10 
  },
  logo: { 
    width: 50, 
    height: 50, 
    backgroundColor: "#fff", 
    borderRadius: 25, 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: 12 
  },
  logoText: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#1a3a8f" 
  },
  appName: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: "#fff" 
  },
  tagline: { 
    fontSize: 14, 
    color: "rgba(255,255,255,0.8)", 
    textAlign: "center" 
  },
  formContainer: { 
    padding: 30, 
    marginTop: 20 
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#333", 
    marginBottom: 15 
  },
  label: { 
    fontSize: 14, 
    fontWeight: "500", 
    marginBottom: 5, 
    color: "#333" 
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e1e5e9",
    height: 56,
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: "#333",
    marginLeft: 10 
  },
  phoneHint: {
    fontSize: 12,
    color: "#666",
    marginBottom: 15,
    marginTop: -5,
    fontStyle: 'italic'
  },
  registerButton: {
    backgroundColor: "#1a3a8f",
    borderRadius: 12,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 10,
    shadowColor: "#1a3a8f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  registerButtonText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "bold" 
  },
  buttonDisabled: { 
    opacity: 0.7 
  },
  loginContainer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    marginTop: 10 
  },
  loginText: { 
    fontSize: 14, 
    color: "#666" 
  },
  loginLink: { 
    fontSize: 14, 
    color: "#1a3a8f", 
    fontWeight: "bold" 
  },
});