import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { timestampToDate } from '@/hooks/timestampToDate';

interface ClientSchema {
    name: string;
    address: string;
    mount: number;
    lastEvent?: Timestamp;
    id: string;
}

const ClientModule = ({ name, address, mount, lastEvent, id }: ClientSchema) => {
    const handlePress = () => {
        router.push({
            pathname: `/clientes/[id]`,
            params: { id, nombre: name }
        })
    };

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress}>
            <View style={styles.flex}>
                <ThemedText type="title">{name}</ThemedText>
                <ThemedText type="title">cuenta ${mount}</ThemedText>
            </View>
            <ThemedText type="subtitle">{address}</ThemedText>
            {lastEvent && <ThemedText type="default">{timestampToDate(lastEvent).toString()}</ThemedText>}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: '#A1CEDC',
        marginTop: 5,
        borderRadius: 5,
        elevation: 4,
        padding: 20,
        width: '100%',
        height: 100,
        color: '#000'
    },
    flex: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});

export default ClientModule;
