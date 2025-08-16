import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar sesión</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Contraseña"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={handleRegister}>
        <Text style={styles.buttonText}>Crear cuenta</Text>
      </TouchableOpacity>
      {Platform.OS === 'web' && (
        <TouchableOpacity style={[styles.button, styles.google]} onPress={handleGoogleWeb}>
          <Text style={styles.buttonText}>Entrar con Google</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#007BFF', padding: 14, borderRadius: 8, alignItems: 'center', marginVertical: 6 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  secondary: { backgroundColor: '#28A745' },
  google: { backgroundColor: '#DB4437' },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
});


