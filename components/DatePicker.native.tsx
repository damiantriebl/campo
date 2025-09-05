import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DatePickerModule({
    value,
    onChange,
}: {
    value: Date;
    onChange: (date: Date) => void;
}) {
    const [date, setDate] = useState<Date | null>(value ?? new Date());
    const [showPicker, setShowPicker] = useState(false);

    const handleDateChange = (_event: any, selectedDate?: Date) => {
        if (selectedDate) {
            setDate(selectedDate);
            onChange(selectedDate);
        }
        setShowPicker(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Fecha seleccionada:</Text>
            <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowPicker(true)}>
                <Text style={styles.datePickerText}>{date?.toLocaleString()}</Text>
            </TouchableOpacity>
            {showPicker && (
                <DateTimePicker
                    value={date || new Date()}
                    mode="datetime"
                    display="default"
                    onChange={handleDateChange}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 10 },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    datePickerButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
    },
    datePickerText: { fontSize: 16, color: '#333' },
});


