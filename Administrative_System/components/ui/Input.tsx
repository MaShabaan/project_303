import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const borderColor = error ? '#e74c3c' : '#d1d5db';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: '#007AFF' }]}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            borderColor,
          },
          style,
        ]}
        placeholderTextColor="#9ca3af"
        selectionColor="#667eea"
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    backgroundColor:'#FFFFFF',
    
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  error: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
});
