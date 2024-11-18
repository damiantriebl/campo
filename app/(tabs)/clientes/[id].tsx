import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View,
  StyleSheet,
  Text,
  Button,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Importa un icono de edición
import { db } from '@/firebaseConfig';
import {
  collection,
  getDocs,
  orderBy,
  query,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  where,
  updateDoc,
} from 'firebase/firestore';
import EventModule from '@/components/EventModule';
import { EventoTy } from '@/schemas/eventoTy';
import DatePickerModule from '@/components/DatePicker';

type ProductoItem = {
  id: string;
  input: string;
  color: string;
  tipo: 'input' | 'entrego';
};

export default function EventsScreen() {
  const [eventos, setEventos] = useState<(EventoTy & { acumulado: number })[]>([]);
  const { id: idCliente } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Form state
  const [tipo, setTipo] = useState<'bajar' | 'entrego'>('bajar');
  const [notas, setNotas] = useState('');
  const [borrado, setBorrado] = useState(false);
  const [editado, setEditado] = useState(false);
  const [creado, setCreado] = useState<Date>(new Date());
  const [actualizado, setActualizado] = useState<Date>(new Date());
  const [cantidad, setCantidad] = useState<string>('');
  const [precioUnitario, setPrecioUnitario] = useState<string>('');
  const [producto, setProducto] = useState('');
  const [productoColor, setProductoColor] = useState('');
  const [monto, setMonto] = useState<string>('');
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const fetchEvents = async () => {
    const q = query(
      collection(db, 'clientes', idCliente as string, 'eventos'),
      where('borrado', '==', false),
      orderBy('creado', 'asc'),
    );
    const snap = await getDocs(q);
    const eventosData = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    let acumulado = 0;
    const eventosWithAcumulado = eventosData.map((evento: EventoTy) => {
      let valorEvento = 0;

      if (evento.tipo === 'bajar') {
        const cantidad = evento.cantidad ?? 0;
        const precioUnitario = evento.precioUnitario ?? 0;
        valorEvento = -(cantidad * precioUnitario);
      } else if (evento.tipo === 'entrego') {
        valorEvento = evento.monto ?? 0;
      }

      acumulado += valorEvento;
      return { ...evento, acumulado };
    });

    setEventos(eventosWithAcumulado.reverse() as (EventoTy & { acumulado: number })[]);
  };

  useEffect(() => {
    fetchEvents();
  }, [idCliente]);

  const fetchProducts = async () => {
    try {
      const productsDocRef = doc(db, 'configuracion', 'productos');
      const docSnap = await getDoc(productsDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const items = data.items || [];
        setProductos(items);
      } else {
        console.log('No such document!');
      }
    } catch (error) {
      console.error(error);
      alert('Error al obtener los productos');
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchProducts();
  }, [idCliente]);

  const handleSaveEvent = async () => {
    try {
      const newEventBase = {
        idCliente: idCliente as string,
        notas,
        borrado,
        editado,
        creado: Timestamp.fromDate(creado),
        actualizado: Timestamp.fromDate(actualizado),
      };

      let newEvent: EventoTy;

      if (tipo === 'bajar') {
        if (!cantidad || !precioUnitario || !producto.trim()) {
          Alert.alert('Error', 'Por favor complete todos los campos para un evento de tipo Bajar.');
          return;
        }

        newEvent = {
          ...newEventBase,
          tipo: 'bajar',
          cantidad: parseFloat(cantidad),
          precioUnitario: parseFloat(precioUnitario),
          producto,
          productoColor,
        };
      } else {
        if (!monto) {
          Alert.alert('Error', 'Por favor ingrese el monto para un evento de tipo Entrego.');
          return;
        }

        newEvent = {
          ...newEventBase,
          tipo: 'entrego',
          monto: parseFloat(monto),
        };
      }

      if (editingEventId) {
        await updateDoc(doc(db, 'clientes', idCliente as string, 'eventos', editingEventId), newEvent);
        setEditingEventId(null);
      } else {
        await addDoc(collection(db, 'clientes', idCliente as string, 'eventos'), newEvent);
      }

      setModalVisible(false);
      Alert.alert('Éxito', 'Evento guardado con éxito.');
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el evento.');
    }
  };

  const handleEditEvent = (event: EventoTy & { acumulado: number }) => {
    setEditingEventId(event.id);
    setTipo(event.tipo);
    setNotas(event.notas);
    setBorrado(event.borrado);
    setEditado(event.editado);
    setCreado(event.creado.toDate());
    setActualizado(event.actualizado.toDate());
    if (event.tipo === 'bajar') {
      setCantidad(event.cantidad.toString());
      setPrecioUnitario(event.precioUnitario.toString());
      setProducto(event.producto);
      setProductoColor(event.productoColor);
    } else {
      setMonto(event.monto.toString());
    }
    setModalVisible(true);
  };

  const resetForm = () => {
    setTipo('bajar');
    setNotas('');
    setBorrado(false);
    setEditado(false);
    setCreado(new Date());
    setActualizado(new Date());
    setCantidad('');
    setPrecioUnitario('');
    setProducto('');
    setProductoColor('');
    setMonto('');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>Agregar Evento</Text>
      </TouchableOpacity>

      {/* Existing event list */}
      <ScrollView style={styles.eventListContainer}>
        {eventos.length === 0 ? (
          <Text style={styles.loadingText}>Cargando eventos...</Text>
        ) : (
          eventos.map(evento => (
            <View key={evento.id} style={styles.eventItemContainer}>
              <EventModule {...evento} handleEditEvento={() => handleEditEvent(evento)} />
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal Component */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <ScrollView contentContainerStyle={styles.modalContainer}>
          <Text style={styles.modalTitle}>{editingEventId ? 'Editar Evento' : 'Agregar Nuevo Evento'}</Text>

          {/* Tipo Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Tipo de Evento:</Text>
            <View style={styles.tipoContainer}>
              <TouchableOpacity
                style={[styles.tipoButton, tipo === 'bajar' && styles.tipoButtonSelected]}
                onPress={() => setTipo('bajar')}
              >
                <Text style={styles.tipoButtonText}>Bajar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoButton, tipo === 'entrego' && styles.tipoButtonSelected]}
                onPress={() => setTipo('entrego')}
              >
                <Text style={styles.tipoButtonText}>Entrego</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* General Information */}
          <View style={styles.section}>
            {/* Conditional Fields Based on Tipo */}
            {tipo === 'bajar' ? (
              <View style={styles.section}>
                <Text style={styles.label}>Cantidad:</Text>
                <TextInput
                  style={styles.input}
                  value={cantidad}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setCantidad(numericText);
                  }} placeholder="Cantidad"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Precio Unitario:</Text>
                <TextInput
                  style={styles.input}
                  value={precioUnitario}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setPrecioUnitario(numericText);
                  }}
                  placeholder="Precio Unitario"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Producto:</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowProductPicker(true)}
                >
                  <Text
                    style={
                      producto ? styles.selectedProductText : styles.placeholderText
                    }
                  >
                    {producto ? producto : 'Seleccione un producto'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.label}>Monto:</Text>
                <TextInput
                  style={styles.input}
                  value={monto}
                  onChangeText={setMonto}
                  placeholder="Monto"
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Fechas */}
            <View style={styles.section}>
              <Text style={styles.label}>Creado:</Text>
              <DatePickerModule
                value={creado}
                onChange={(selectedDate) => setCreado(selectedDate)}
              />

              <Text style={styles.label}>Actualizado:</Text>
              <DatePickerModule
                value={actualizado}
                onChange={(selectedDate) => setActualizado(selectedDate)}
              />
            </View>

            <Text style={styles.label}>Notas:</Text>
            <TextInput
              style={styles.input}
              value={notas}
              onChangeText={setNotas}
              placeholder="Agregar notas"
              multiline
            />
            {/* Borrado & Editado Switch */}
            <View style={styles.tipoContainer}>
              <View style={styles.switchContainer}>
                <Text style={styles.label}>Borrado:</Text>
                <Switch value={borrado} onValueChange={setBorrado} />
              </View>
              <View style={styles.switchContainer}>
                <Text style={styles.label}>Editado:</Text>
                <Switch value={editado} onValueChange={setEditado} />
              </View>
            </View>
          </View>
          {/* Submit Button */}
          <View style={styles.submitButtonContainer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEvent}>
              <Text style={styles.saveButtonText}>Guardar Evento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setModalVisible(false);
                setEditingEventId(null);
                resetForm();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Product Picker Modal */}
        <Modal
          visible={showProductPicker}
          animationType="slide"
          onRequestClose={() => setShowProductPicker(false)}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Seleccione un producto</Text>
            <FlatList
              data={productos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productItem}
                  onPress={() => {
                    setProducto(item.input);
                    setProductoColor(item.color);
                    setShowProductPicker(false);
                  }}
                >
                  <View style={styles.productItemContent}>
                    <View
                      style={[
                        styles.colorIndicator,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={styles.productText}>{item.input}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <Button title="Cerrar" onPress={() => setShowProductPicker(false)} />
          </View>
        </Modal>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  addButton: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  loadingText: { fontSize: 16, textAlign: 'center', marginVertical: 20 },
  modalContainer: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  section: { marginVertical: 15 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  tipoContainer: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  tipoButton: {
    flex: 1,
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#ddd',
  },
  tipoButtonSelected: {
    backgroundColor: '#007BFF',
  },
  tipoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    gap: 20
  },
  submitButtonContainer: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-around' },
  saveButton: {
    backgroundColor: '#28A745',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: {
    backgroundColor: '#FF4C4C',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  cancelButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  selectedProductText: { fontSize: 16, color: '#000' },
  placeholderText: { fontSize: 16, color: '#999' },
  productItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  productItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  productText: {
    fontSize: 16,
  },
  eventListContainer: { flex: 1, marginBottom: 20 },
  eventItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  editIcon: { marginLeft: 10 },
});
