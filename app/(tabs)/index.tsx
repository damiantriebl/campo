import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import { useProducts } from '@/context/RealtimeDataProvider';
import { Product, CreateProductData, UpdateProductData } from '@/schemas/types';
import ProductService from '@/services/ProductService';
import ProductForm from '@/components/ProductForm';
// Removed drag and drop; we will use simple up/down selectors

export default function ProductManagementScreen() {
  const router = useRouter();
  const { empresaId } = useAuth();
  const { products, productsLoading, refreshProducts } = useProducts();
  const [isLoading, setIsLoading] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const productService = ProductService.getInstance();

  useEffect(() => {
    initializeService();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeService = async () => {
    try {
      await productService.initialize();
    } catch (error) {
      console.error('Error initializing product service:', error);
    }
  };

  // Using real-time data from Firestore only

  const handleRefreshProducts = async () => {
    console.log('ProductManagementScreen.handleRefreshProducts: Manual refresh triggered');
    try {
      await refreshProducts();
      console.log('ProductManagementScreen.handleRefreshProducts: Refresh completed', {
        productsCount: products?.length
      });
    } catch (error) {
      console.error('ProductManagementScreen.handleRefreshProducts: Refresh failed', error);
    }
  };

  const handleCreateProduct = () => {
    setEditingProduct(undefined);
    setFormVisible(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormVisible(true);
  };

  const handleSubmitProduct = async (productData: CreateProductData | UpdateProductData) => {
    const context = 'ProductManagementScreen.handleSubmitProduct';
    console.log(`${context}: Starting product submission`, {
      empresaId,
      isEditing: !!editingProduct,
      editingProductId: editingProduct?.id,
      productData,
      currentProductsCount: products.length
    });

    if (!empresaId) {
      console.error(`${context}: No empresaId available`);
      Alert.alert('Error', 'No se pudo identificar la empresa');
      return;
    }

    setIsLoading(true);
    try {
      if (editingProduct) {
        console.log(`${context}: Updating existing product`, {
          productId: editingProduct.id,
          empresaId
        });
        // Update existing product
        const result = await productService.updateProduct(
          empresaId,
          editingProduct.id,
          productData as UpdateProductData
        );

        console.log(`${context}: Update result`, {
          success: result.success,
          errors: result.errors,
          productId: editingProduct.id
        });

        if (result.success) {
          Alert.alert('Éxito', 'Producto actualizado correctamente');
          // Real-time listener will update the products automatically
        } else {
          console.error(`${context}: Update failed`, { errors: result.errors });
          Alert.alert('Error', result.errors?.join('\n') || 'Error al actualizar producto');
        }
      } else {
        console.log(`${context}: Creating new product`);
        // Create new product
        const posicion = products?.length || 0;
        const newProductData: CreateProductData = {
          ...(productData as Omit<CreateProductData, 'posicion'>),
          posicion, // Ensure posicion is always a valid number
        };

        console.log(`${context}: Calling productService.createProduct`, {
          empresaId,
          newProductData,
          posicionValue: posicion,
          posicionType: typeof posicion,
          productsLength: products?.length,
          productsType: typeof products
        });

        const result = await productService.createProduct(empresaId, newProductData);

        console.log(`${context}: Creation result`, {
          success: result.success,
          data: result.data,
          errors: result.errors
        });

        if (result.success) {
          console.log(`${context}: Product created successfully`, {
            productId: result.data,
            empresaId
          });
          Alert.alert('Éxito', 'Producto creado correctamente');
          // Real-time listener will update the products automatically
        } else {
          console.error(`${context}: Creation failed`, { errors: result.errors });
          Alert.alert('Error', result.errors?.join('\n') || 'Error al crear producto');
        }
      }
    } catch (error) {
      console.error(`${context}: Exception during product submission`, {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        empresaId,
        isEditing: !!editingProduct
      });
      Alert.alert('Error', 'No se pudo guardar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!empresaId) return;

    setIsLoading(true);
    try {
      // Check for dependencies
      const dependencies = await productService.checkProductDependencies(empresaId, product.id);

      if (dependencies.hasTransactions) {
        Alert.alert(
          'No se puede eliminar',
          `Este producto tiene ${dependencies.transactionCount} transacciones asociadas. No se puede eliminar.`
        );
        return;
      }

      const result = await productService.deleteProduct(empresaId, product.id);

      if (result.success) {
        Alert.alert('Éxito', 'Producto eliminado correctamente');
        // Real-time listener will update the products automatically
      } else {
        Alert.alert('Error', result.errors?.join('\n') || 'Error al eliminar producto');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      Alert.alert('Error', 'No se pudo eliminar el producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveProduct = async (fromIndex: number, toIndex: number) => {
    if (!empresaId || !products) return;

    const sorted = [...products].sort((a, b) => (a.posicion || 0) - (b.posicion || 0));
    if (fromIndex < 0 || fromIndex >= sorted.length || toIndex < 0 || toIndex >= sorted.length) return;
    if (fromIndex === toIndex) return;

    const product = sorted[fromIndex];
    setIsLoading(true);
    try {
      const result = await productService.moveProduct(empresaId, product.id, fromIndex, toIndex, sorted);
      if (!result.success) {
        Alert.alert('Error', result.errors?.join('\n') || 'No se pudo mover el producto');
      }
      // Real-time listener actualizará la lista
    } catch (error) {
      console.error('ProductManagementScreen.handleMoveProduct: Exception', error);
      Alert.alert('Error', 'No se pudo mover el producto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Productos</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshProducts}
            disabled={isLoading || productsLoading}
          >
            <Ionicons name="refresh" size={20} color="#25B4BD" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.switchCompanyButton}
            onPress={() => {
              console.log('Navigating to company management');
              router.push('/(company)');
            }}
            disabled={isLoading}
          >
            <Ionicons name="business" size={20} color="#8E44AD" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreateProduct}
            disabled={isLoading}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <FlatList
          data={products ? [...products].sort((a, b) => (a.posicion || 0) - (b.posicion || 0)) : []}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={styles.productRow}>
              <View style={styles.productInfo}>
                <View style={[styles.colorDot, { backgroundColor: item.colorFondo }]} />
                <Text style={styles.productName}>{item.nombre}</Text>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={[styles.iconButton, index === 0 && styles.iconButtonDisabled]}
                  onPress={() => handleMoveProduct(index, index - 1)}
                  disabled={index === 0 || isLoading}
                >
                  <Ionicons name="chevron-up" size={18} color={index === 0 ? '#bbb' : '#25B4BD'} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, (products ? index === products.length - 1 : true) && styles.iconButtonDisabled]}
                  onPress={() => handleMoveProduct(index, index + 1)}
                  disabled={!products || index === products.length - 1 || isLoading}
                >
                  <Ionicons name="chevron-down" size={18} color={!products || index === products.length - 1 ? '#bbb' : '#25B4BD'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => handleEditProduct(item)} disabled={isLoading}>
                  <Ionicons name="create-outline" size={18} color="#2C3E50" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={() => handleDeleteProduct(item)} disabled={isLoading}>
                  <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ padding: 16 }}>
              <Text style={{ color: '#666' }}>{productsLoading ? 'Cargando productos...' : 'No hay productos'}</Text>
            </View>
          }
        />
      </View>

      <ProductForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleSubmitProduct}
        product={editingProduct}
        isLoading={isLoading}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ebebeb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#25B4BD',
  },
  switchCompanyButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#8E44AD',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#25B4BD',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  productName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 6,
    backgroundColor: '#f7f7f7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e6e6e6',
  },
  iconButtonDisabled: {
    opacity: 0.6,
  },
});
