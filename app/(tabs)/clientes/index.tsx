import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, TextInput, Alert, ScrollView, FlatList } from 'react-native';
import { db } from '@/firebaseConfig';
import { addDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import ClientModule from '@/components/ClientModule';
import { useRouter } from 'expo-router';
import { clientesItf } from '@/schemas/clienteItf';
import { useAuth } from '@/context/AuthProvider';


export default function ClientsScreen() {
    const router = useRouter();
    const { empresaId } = useAuth();

    const [clientes, setClientes] = useState<clientesItf[] | []>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [notas, setNotas] = useState('');
    const [telefono, setTelefono] = useState('');

    useEffect(() => {
        if (!empresaId) return;
        const fetchClients = async () => {
            const snap = await getDocs(collection(db, 'empresas', empresaId, 'clientes'));
            const clienteData = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setClientes(clienteData as unknown as clientesItf[]);
        };
        fetchClients();
    }, [empresaId]);

    const handleCreate = async () => {
        try {
            if (!empresaId) return;
            if (!nombre.trim()) {
                Alert.alert('Error', 'El nombre es obligatorio');
                return;
            }
            const ref = await addDoc(collection(db, 'empresas', empresaId, 'clientes'), {
                nombre: nombre.trim(),
                direccion: direccion.trim(),
                notas: notas.trim(),
                telefono: telefono.trim(),
                debe: 0,
                creado: Timestamp.now(),
            });
            setModalVisible(false);
            setNombre('');
            setDireccion('');
            setNotas('');
            setTelefono('');
            const snap = await getDocs(collection(db, 'empresas', empresaId, 'clientes'));
            const clienteData = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setClientes(clienteData as unknown as clientesItf[]);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'No se pudo crear el cliente');
        }
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={clientes}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                    <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                        <Text style={styles.addButtonText}>Agregar cliente</Text>
                    </TouchableOpacity>
                }
                ListEmptyComponent={<Text style={styles.emptyText}>No hay clientes aún</Text>}
                renderItem={({ item }) => (
                    <ClientModule
                        address={item.direccion}
                        id={item.id}
                        name={item.nombre}
                        mount={item.debe ?? 0}
                        lastEvent={item.ultimoPago}
                    />
                )}
                getItemLayout={(data, index) => ({ length: 105, offset: 105 * index, index })}
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                updateCellsBatchingPeriod={50}
                windowSize={5}
                removeClippedSubviews
                contentContainerStyle={{ paddingBottom: 24 }}
            />
            <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <ScrollView contentContainerStyle={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Nuevo cliente</Text>
                    <Text style={styles.label}>Nombre</Text>
                    <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Nombre" />
                    <Text style={styles.label}>Dirección</Text>
                    <TextInput style={styles.input} value={direccion} onChangeText={setDireccion} placeholder="Dirección" />
                    <Text style={styles.label}>Notas</Text>
                    <TextInput style={[styles.input, styles.multiline]} value={notas} onChangeText={setNotas} placeholder="Notas" multiline />
                    <Text style={styles.label}>Teléfono</Text>
                    <TextInput style={styles.input} value={telefono} onChangeText={setTelefono} placeholder="Teléfono" keyboardType="phone-pad" />
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.saveButton} onPress={handleCreate}>
                            <Text style={styles.addButtonText}>Guardar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                            <Text style={styles.addButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Modal>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#f5f5f5', padding: 10, color: '#999', flex: 1 },
    addButton: { backgroundColor: '#007BFF', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
    addButtonText: { color: '#fff', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: '#666', marginVertical: 10 },
    modalContainer: { padding: 16, backgroundColor: '#fff', flexGrow: 1 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
    label: { fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
    multiline: { minHeight: 80, textAlignVertical: 'top', marginBottom: 8, marginTop: 4 },
    actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
    saveButton: { backgroundColor: '#28A745', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
    cancelButton: { backgroundColor: '#FF4C4C', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
});
