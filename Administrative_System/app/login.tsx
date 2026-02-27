import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

 const handleLogin = () => {
    if (email === "student@uni.edu" && password === "1234") {
      Alert.alert("Success", "Welcome Student!");
    } else if (email === "admin@uni.edu" && password === "admin") {
      Alert.alert("Success", "Welcome Admin!");
    } else {
      Alert.alert("Error", "Wrong Email or Password");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>تسجيل الدخول - نظام الشكاوى</Text>

      <TextInput
        style={styles.input}
        placeholder="البريد الإلكتروني أو الرقم الجامعي"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="كلمة المرور"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true} 
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>دخول</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', textAlign: 'right' },
  button: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});