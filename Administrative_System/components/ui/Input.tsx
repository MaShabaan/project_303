import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

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
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor(
    { light: '#FFFFFF', dark: 'f5f5f5' },
    'background'
  );
  const borderColor = error ? '#007AFF' : 'transparent';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: '#007AFF' }]}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            color: textColor,
            backgroundColor,
            borderColor,
          },
          style,
        ]}
        placeholderTextColor="#000000"
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
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    
  },
  error: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
});
