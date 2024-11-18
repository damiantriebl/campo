import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { db } from '@/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import ClientModule from '@/components/ClientModule';
import { useRouter } from 'expo-router';
import { clientesItf } from '@/schemas/clienteItf';


export default function ClientsScreen() {
    const router = useRouter();

    const [clientes, setClientes] = useState<clientesItf[] | []>([]);

    useEffect(() => {
        const fetchClients = async () => {
            const snap = await getDocs(collection(db, 'clientes'));
            const clienteData = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setClientes(clienteData as unknown as clientesItf[]);
        };
        fetchClients();
    }, []);

    if (clientes.length === 0) {
        return <Text>Cargando...</Text>;
    }

    return (
        <View style={styles.container}>
            {clientes.map((client) => (
                <ClientModule
                    key={client.id}
                    address={client.direccion}
                    id={client.id}
                    name={client.nombre}
                    mount={client.debe}
                    lastEvent={client.ultimoPago} />
            ))
            }
        </View >
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: '#f5f5f5', padding: 10, color: '#999' },
});
