import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setError(null);
      await signInWithEmail(email.trim(), password);
      router.replace('/(company)');
    } catch (e: any) {
      setError(e?.message || 'Error al iniciar sesión');
    }
  };

  const handleRegister = async () => {
    try {
      setError(null);
      await signUpWithEmail(email.trim(), password);
      router.replace('/(company)');
    } catch (e: any) {
      setError(e?.message || 'Error al registrarse');
    }
  };

  const handleGoogleWeb = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.replace('/(company)');
    } catch (e: any) {
      setError(e?.message || 'Error con Google');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <div>
        <Text style={styles.brand}>Campo</Text>
        <Text style={styles.subtitle}>Gestión simple y segura</Text>
      </div>

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Bienvenido</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="tu@email.com"
              placeholderTextColor="#9aa0a6"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#9aa0a6"
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
            <Text style={styles.primaryText}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleRegister}>
            <Text style={styles.secondaryText}>Crear cuenta</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleWeb}>
              <Text style={styles.googleText}>Entrar con Google</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'rgb(235, 235, 235)' },
  headerBg: { paddingTop: 24, paddingBottom: 40, alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#fff', fontSize: 28, fontWeight: 'bold', letterSpacing: 0.5 },
  subtitle: { color: '#eafaf9', marginTop: 4 },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  card: { backgroundColor: 'rgb(242, 242, 242)', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: 'rgba(37, 180, 189, 0.15)' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: '#1f2937', textAlign: 'center' },
  inputGroup: { marginBottom: 12 },
  label: { marginBottom: 6, color: '#374151', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, backgroundColor: '#fff', color: '#111827' },
  primaryButton: { backgroundColor: '#279d2e', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: 'bold' },
  secondaryButton: { backgroundColor: '#25B4BD', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  secondaryText: { color: '#00333a', fontWeight: 'bold' },
  googleButton: { backgroundColor: '#ffffff', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  googleText: { color: '#111827', fontWeight: '600' },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
});


