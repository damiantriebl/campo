import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import { addDoc, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

type Empresa = { id: string; nombre: string };

export default function EmpresaScreen() {
  const router = useRouter();
  const { user, empresas, setEmpresaId, refreshEmpresas } = useAuth();
  const [nombreNueva, setNombreNueva] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [todas, setTodas] = useState<Empresa[]>([]);
  const aceptadas = empresas;

  useEffect(() => {
    const fetchEmpresas = async () => {
      const snap = await getDocs(collection(db, 'empresas'));
      setTodas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Empresa[]);
    };
    fetchEmpresas();
  }, []);

  const filtradas = useMemo(() => {
    const term = busqueda.toLowerCase();
    return todas.filter((e) => e.nombre?.toLowerCase().includes(term));
  }, [todas, busqueda]);

  const handleCrear = async () => {
    if (!user) return;
    const nombre = nombreNueva.trim();
    if (!nombre) {
      Alert.alert('Error', 'Nombre de empresa requerido');
      return;
    }
    const ref = await addDoc(collection(db, 'empresas'), { nombre, creado: new Date() });
    await setDoc(doc(db, 'empresas', ref.id, 'miembros', user.uid), { uid: user.uid, role: 'owner', desde: new Date() });
    await setDoc(doc(db, 'usuarios', user.uid, 'empresas', ref.id), { role: 'owner' });
    await refreshEmpresas();
    setEmpresaId(ref.id);
    router.replace('/(tabs)');
  };

  const handleSeleccionar = async (empresaId: string) => {
    setEmpresaId(empresaId);
    router.replace('/(tabs)');
  };

  const handleSolicitarAcceso = async (empresaId: string) => {
    if (!user) return;
    await setDoc(doc(db, 'empresas', empresaId, 'solicitudes', user.uid), { uid: user.uid, estado: 'pendiente', creado: new Date() });
    Alert.alert('Listo', 'Solicitud enviada');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona o crea una empresa</Text>
      {aceptadas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus empresas</Text>
          {aceptadas.map((e) => (
            <TouchableOpacity key={e.empresaId} style={styles.item} onPress={() => handleSeleccionar(e.empresaId)}>
              <Text style={styles.itemText}>{e.empresaId}</Text>
              <Text style={styles.badge}>{e.role}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Crear nueva</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput placeholder="Nombre de la empresa" style={[styles.input, { flex: 1 }]} value={nombreNueva} onChangeText={setNombreNueva} />
          <TouchableOpacity style={styles.button} onPress={handleCrear}><Text style={styles.buttonText}>Crear</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buscar empresa</Text>
        <TextInput placeholder="Buscar..." style={styles.input} value={busqueda} onChangeText={setBusqueda} />
        <FlatList
          data={filtradas}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.itemText}>{item.nombre}</Text>
              <TouchableOpacity style={styles.secondary} onPress={() => handleSolicitarAcceso(item.id)}>
                <Text style={styles.buttonText}>Pedir acceso</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 },
  button: { backgroundColor: '#007BFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: '#28A745', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  itemText: { fontSize: 16 },
  badge: { color: '#555', fontSize: 12 },
});


