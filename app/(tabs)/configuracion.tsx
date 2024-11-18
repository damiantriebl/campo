import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { SketchPicker } from 'react-color'; // Web
import { ColorPicker } from 'react-native-color-picker'; // Android/iOS
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

type ConfigItem = {
  id: string;
  input: string;
  color: string;
  tipo: 'input' | 'entrego';
};

export default function ConfiguracionScreen() {
  const [configItems, setConfigItems] = useState<ConfigItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newInput, setNewInput] = useState('');
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [currentColor, setCurrentColor] = useState('#808080');

  useEffect(() => {
    const fetchConfigItems = async () => {
      try {
        const configDocRef = doc(db, 'configuracion', 'productos');
        const docSnap = await getDoc(configDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const items = data.items || [];
          setConfigItems(items);
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error(error);
        alert('Error al obtener configuración');
      }
    };

    fetchConfigItems();
  }, []);

  const handleAddItem = () => {
    setConfigItems((prev) => [
      ...prev,
      { id: Math.random().toString(), input: newInput, color: currentColor, tipo: 'input' },
    ]);
    setNewInput('');
    setCurrentColor('#808080');
  };

  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setNewInput(configItems[index].input);
    setCurrentColor(configItems[index].color);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null) {
      const updatedItems = [...configItems];
      updatedItems[editingIndex] = {
        ...updatedItems[editingIndex],
        input: newInput || updatedItems[editingIndex].input,
        color: currentColor,
      };
      setConfigItems(updatedItems);
      setEditingIndex(null);
      setNewInput('');
      setCurrentColor('#808080');
    }
  };

  const handleDeleteItem = (id: string) => {
    setConfigItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= configItems.length) return;
    const updatedItems = [...configItems];
    const [movedItem] = updatedItems.splice(fromIndex, 1);
    updatedItems.splice(toIndex, 0, movedItem);
    setConfigItems(updatedItems);
  };

  const handleSubmit = async () => {
    try {
      const configDocRef = doc(db, 'configuracion', 'productos');
      await setDoc(configDocRef, { items: configItems });
      alert('Configuración guardada con éxito');
    } catch (error) {
      console.error(error);
      alert('Error al guardar configuración');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={configItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={[styles.item, { backgroundColor: item.color }]}>
            {editingIndex === index ? (
              <>
                <TextInput
                  style={styles.input}
                  value={newInput}
                  onChangeText={setNewInput}
                  placeholder="Editar texto"
                />
                <TouchableOpacity
                  style={[styles.colorBox, { backgroundColor: currentColor }]}
                  onPress={() => setColorPickerVisible(true)}
                >
                  <Ionicons name="color-palette" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                  <Ionicons name="checkmark" size={24} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.text}>{item.input}</Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity onPress={() => handleEditItem(index)} style={styles.iconButton}>
                    <Ionicons name="pencil" size={24} color="#007BFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteItem(item.id)} style={styles.iconButton}>
                    <Ionicons name="trash" size={24} color="#FF0000" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleReorder(index, index - 1)} style={styles.iconButton}>
                    <Ionicons name="arrow-up" size={24} color="#000" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleReorder(index, index + 1)} style={styles.iconButton}>
                    <Ionicons name="arrow-down" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      />
      <View style={styles.addItemContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nuevo texto"
          value={newInput}
          onChangeText={setNewInput}
        />
        <TouchableOpacity
          style={[styles.colorBox, { backgroundColor: currentColor }]}
          onPress={() => setColorPickerVisible(true)}
        >
          <Ionicons name="color-palette" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Agregar</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Ionicons name="save" size={24} color="#fff" />
        <Text style={styles.submitButtonText}>Guardar configuración</Text>
      </TouchableOpacity>

      {/* Modal para Color Picker */}
      <Modal visible={colorPickerVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          {Platform.OS === 'web' ? (
            <SketchPicker
              color={currentColor}
              onChangeComplete={(color) => {
                setCurrentColor(color.hex);
                setColorPickerVisible(false);
              }}
            />
          ) : (
            <ColorPicker
              onColorSelected={(color) => {
                setCurrentColor(color);
                setColorPickerVisible(false);
              }}
              style={styles.nativePicker}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (Your styles remain the same)
  container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
  item: {
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    flex: 1,
  },
  iconButton: {
    marginHorizontal: 5,
  },
  colorBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  addButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#28A745',
    padding: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: '#28A745',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  nativePicker: { width: 300, height: 300 },
});
