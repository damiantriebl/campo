import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import { 
  Product, 
  CreateProductData, 
  UpdateProductData,
  ProductPriceCache,
  ValidationResult,
  ServiceResponse 
} from '@/schemas/types';
import { validateProduct } from '@/schemas/validation';
import { 
  createProduct as createProductInFirestore,
  getProducts as getProductsFromFirestore,
  updateProduct as updateProductInFirestore,
  deleteProduct as deleteProductInFirestore,
  subscribeToProducts
} from '@/schemas/firestore-utils';
import { savePriceToHistory } from '@/components/PriceHistoryTracker';
import ErrorHandlingService from './ErrorHandlingService';

// ============================================================================
// PRODUCT PRICE CACHING
// ============================================================================

const PRICE_CACHE_KEY = 'product_price_cache';

export class ProductPriceCacheService {
  private static instance: ProductPriceCacheService;
  private cache: ProductPriceCache = {};

  static getInstance(): ProductPriceCacheService {
    if (!ProductPriceCacheService.instance) {
      ProductPriceCacheService.instance = new ProductPriceCacheService();
    }
    return ProductPriceCacheService.instance;
  }

  async loadCache(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(PRICE_CACHE_KEY);
      if (cacheData) {
        this.cache = JSON.parse(cacheData);
      }
    } catch (error) {
      console.error('Error loading price cache:', error);
    }
  }

  async saveCache(): Promise<void> {
    try {
      await AsyncStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Error saving price cache:', error);
    }
  }

  async updateProductPrice(
    productId: string, 
    ultimoCosto: number, 
    ultimaGanancia: number
  ): Promise<void> {
    this.cache[productId] = {
      ultimoCosto,
      ultimaGanancia,
      fechaActualizacion: Timestamp.now()
    };
    await this.saveCache();
  }

  getProductPrice(productId: string): { ultimoCosto?: number; ultimaGanancia?: number } {
    const cached = this.cache[productId];
    if (cached) {
      // Validate cached data has required fields
      if (typeof cached.ultimoCosto === 'number' && typeof cached.ultimaGanancia === 'number') {
        return {
          ultimoCosto: cached.ultimoCosto,
          ultimaGanancia: cached.ultimaGanancia
        };
      } else {
        // Remove invalid cache entry
        console.warn('ProductPriceCacheService: Invalid cached data found, removing', { 
          productId, 
          cached 
        });
        delete this.cache[productId];
        this.saveCache().catch(error => 
          console.error('ProductPriceCacheService: Failed to save cache after cleanup', error)
        );
      }
    }
    return {};
  }

  async clearCache(): Promise<void> {
    this.cache = {};
    await AsyncStorage.removeItem(PRICE_CACHE_KEY);
  }

  async validateAndCleanCache(): Promise<void> {
    let hasInvalidEntries = false;
    const validatedCache: ProductPriceCache = {};

    for (const [productId, cacheEntry] of Object.entries(this.cache)) {
      // Validate that cache entry has required fields with valid values
      if (
        typeof cacheEntry.ultimoCosto === 'number' && 
        typeof cacheEntry.ultimaGanancia === 'number' &&
        cacheEntry.ultimoCosto >= 0 &&
        cacheEntry.ultimaGanancia >= 0 &&
        cacheEntry.fechaActualizacion
      ) {
        validatedCache[productId] = cacheEntry;
      } else {
        console.warn('ProductPriceCacheService: Removing invalid cache entry', { 
          productId, 
          cacheEntry 
        });
        hasInvalidEntries = true;
      }
    }

    if (hasInvalidEntries) {
      this.cache = validatedCache;
      await this.saveCache();
      console.log('ProductPriceCacheService: Cache cleaned and saved');
    }
  }
}

// ============================================================================
// PRODUCT SERVICE
// ============================================================================

export class ProductService {
  private static instance: ProductService;
  private priceCache: ProductPriceCacheService;
  private errorHandler: ErrorHandlingService;

  constructor() {
    this.priceCache = ProductPriceCacheService.getInstance();
    this.errorHandler = ErrorHandlingService.getInstance();
  }

  static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  async initialize(): Promise<ServiceResponse<void>> {
    return this.errorHandler.executeWithRetry(
      async () => {
        await this.priceCache.loadCache();
        // Validate and clean cache to ensure consistency with new required fields
        await this.priceCache.validateAndCleanCache();
      },
      'ProductService.initialize'
    );
  }

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async createProduct(
    empresaId: string, 
    productData: CreateProductData
  ): Promise<ServiceResponse<string>> {
    const context = 'ProductService.createProduct';
    
    console.log(`${context}: Starting product creation`, { 
      empresaId, 
      productName: productData.nombre,
      ultimoCosto: productData.ultimoCosto,
      ultimaGanancia: productData.ultimaGanancia
    });
    
    try {
      // Step 1: Validate required fields before general validation
      console.log(`${context}: Validating required fields`);
      
      if (typeof productData.ultimoCosto !== 'number') {
        const error = new Error('El último costo es requerido y debe ser un número');
        error.name = 'ValidationError';
        throw error;
      }
      
      if (typeof productData.ultimaGanancia !== 'number') {
        const error = new Error('La última ganancia es requerida y debe ser un número');
        error.name = 'ValidationError';
        throw error;
      }
      
      if (productData.ultimoCosto < 0) {
        const error = new Error('El último costo debe ser un número mayor o igual a 0');
        error.name = 'ValidationError';
        throw error;
      }
      
      if (productData.ultimaGanancia < 0) {
        const error = new Error('La última ganancia debe ser un número mayor o igual a 0');
        error.name = 'ValidationError';
        throw error;
      }
      
      console.log(`${context}: Required fields validation passed`);
      
      // Step 2: Validate complete product data
      console.log(`${context}: Validating complete product data`);
      
      const validation = validateProduct(productData);
      
      if (!validation.isValid) {
        console.error(`${context}: Validation failed`, { errors: validation.errors });
        const validationError = new Error(validation.errors.join(', '));
        validationError.name = 'ValidationError';
        throw validationError;
      }
      console.log(`${context}: Complete validation passed`);

      const result = await this.errorHandler.executeWithRetry(
        async () => {
          // Step 2: Create product in Firestore
          console.log(`${context}: Creating product in Firestore`, { empresaId });
          
          const productId = await createProductInFirestore(empresaId, productData);
          console.log(`${context}: Product created in Firestore`, { productId, empresaId });
          
          // Step 3: Cache required prices (always present now)
          console.log(`${context}: Caching required prices`, { 
            productId, 
            ultimoCosto: productData.ultimoCosto, 
            ultimaGanancia: productData.ultimaGanancia 
          });
          
          try {
            await this.priceCache.updateProductPrice(
              productId, 
              productData.ultimoCosto, 
              productData.ultimaGanancia
            );
            console.log(`${context}: Prices cached successfully`, { productId });
          } catch (cacheError) {
            // Log cache error but don't fail the creation
            console.error(`${context}: Price caching failed`, { productId, error: cacheError });
            this.errorHandler.logError(`${context}.priceCache`, cacheError, { productId });
          }

          console.log(`${context}: Product created successfully`, { productId, empresaId });
          return productId;
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );

      return result;
      
    } catch (error) {
      console.error(`${context}: Product creation failed`, { 
        empresaId, 
        productName: productData.nombre,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      
      this.errorHandler.logError(context, error, { empresaId, productData });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  async getProducts(empresaId: string): Promise<ServiceResponse<Product[]>> {
    const context = 'ProductService.getProducts';
    
    console.log(`${context}: Starting getProducts`, { empresaId });
    
    return await this.errorHandler.executeWithRetry(
      async () => {
        console.log(`${context}: Calling getProductsFromFirestore`);
        const products = await getProductsFromFirestore(empresaId);
        console.log(`${context}: getProductsFromFirestore returned`, { 
          count: products.length,
          productIds: products.map(p => p.id),
          productNames: products.map(p => p.nombre)
        });
        
        // Enhance products with cached prices and validate required fields
        const enhancedProducts = products.map(product => {
          try {
            const cachedPrices = this.priceCache.getProductPrice(product.id);
            
            // Ensure product has required fields (from database or cache)
            const ultimoCosto = cachedPrices.ultimoCosto ?? product.ultimoCosto;
            const ultimaGanancia = cachedPrices.ultimaGanancia ?? product.ultimaGanancia;
            
            // Validate that we have valid required fields
            if (typeof ultimoCosto !== 'number' || typeof ultimaGanancia !== 'number') {
              console.warn(`${context}: Product missing required price fields`, { 
                productId: product.id,
                productName: product.nombre,
                ultimoCosto,
                ultimaGanancia
              });
              
              // Set default values for missing required fields
              return {
                ...product,
                ultimoCosto: typeof ultimoCosto === 'number' ? ultimoCosto : 0,
                ultimaGanancia: typeof ultimaGanancia === 'number' ? ultimaGanancia : 0
              };
            }
            
            return {
              ...product,
              ultimoCosto,
              ultimaGanancia
            };
          } catch (cacheError) {
            // Log cache error but return product with validated required fields
            this.errorHandler.logError(`${context}.priceCache`, cacheError, { productId: product.id });
            
            return {
              ...product,
              ultimoCosto: typeof product.ultimoCosto === 'number' ? product.ultimoCosto : 0,
              ultimaGanancia: typeof product.ultimaGanancia === 'number' ? product.ultimaGanancia : 0
            };
          }
        });

        console.log(`${context}: Retrieved ${enhancedProducts.length} products`, { empresaId });
        return enhancedProducts;
      },
      context,
      { maxAttempts: 3, baseDelay: 500 }
    );
  }

  async updateProduct(
    empresaId: string, 
    productId: string, 
    updates: UpdateProductData
  ): Promise<ServiceResponse<void>> {
    const context = 'ProductService.updateProduct';
    
    console.log(`${context}: Starting product update`, { 
      productId, 
      empresaId,
      updates: {
        ...updates,
        ultimoCosto: updates.ultimoCosto,
        ultimaGanancia: updates.ultimaGanancia
      }
    });
    
    try {
      // Validate required fields if they are being updated
      if ('ultimoCosto' in updates && typeof updates.ultimoCosto !== 'number') {
        const error = new Error('El último costo debe ser un número');
        error.name = 'ValidationError';
        throw error;
      }
      
      if ('ultimaGanancia' in updates && typeof updates.ultimaGanancia !== 'number') {
        const error = new Error('La última ganancia debe ser un número');
        error.name = 'ValidationError';
        throw error;
      }
      
      if ('ultimoCosto' in updates && updates.ultimoCosto! < 0) {
        const error = new Error('El último costo debe ser un número mayor o igual a 0');
        error.name = 'ValidationError';
        throw error;
      }
      
      if ('ultimaGanancia' in updates && updates.ultimaGanancia! < 0) {
        const error = new Error('La última ganancia debe ser un número mayor o igual a 0');
        error.name = 'ValidationError';
        throw error;
      }
      
      return await this.errorHandler.executeWithRetry(
        async () => {
          // If updating prices, cache them first
          if (updates.ultimoCosto !== undefined && updates.ultimaGanancia !== undefined) {
            console.log(`${context}: Caching updated prices`, { 
              productId, 
              ultimoCosto: updates.ultimoCosto, 
              ultimaGanancia: updates.ultimaGanancia 
            });
            
            try {
              await this.priceCache.updateProductPrice(
                productId, 
                updates.ultimoCosto, 
                updates.ultimaGanancia
              );
              console.log(`${context}: Updated prices cached successfully`, { productId });
            } catch (cacheError) {
              // Log cache error but continue with update
              console.error(`${context}: Price caching failed`, { productId, error: cacheError });
              this.errorHandler.logError(`${context}.priceCache`, cacheError, { productId });
            }
          }

          await updateProductInFirestore(empresaId, productId, updates);
          console.log(`${context}: Product updated successfully`, { productId, empresaId });
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );
    } catch (error) {
      console.error(`${context}: Product update failed`, { 
        productId, 
        empresaId, 
        updates,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : error
      });
      this.errorHandler.logError(context, error, { empresaId, productId, updates });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  async deleteProduct(
    empresaId: string, 
    productId: string
  ): Promise<ServiceResponse<void>> {
    const context = 'ProductService.deleteProduct';
    
    try {
      return await this.errorHandler.executeWithRetry(
        async () => {
          await deleteProductInFirestore(empresaId, productId);
          console.log(`${context}: Product deleted successfully`, { productId, empresaId });
        },
        context,
        { maxAttempts: 2, baseDelay: 1000 }
      );
    } catch (error) {
      this.errorHandler.logError(context, error, { empresaId, productId });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  // ============================================================================
  // PRODUCT ORDERING
  // ============================================================================

  async reorderProducts(
    empresaId: string, 
    products: Product[]
  ): Promise<ServiceResponse<void>> {
    const context = 'ProductService.reorderProducts';
    
    try {
      return await this.errorHandler.executeWithRetry(
        async () => {
          console.log(`${context}: Starting position updates`, { 
            empresaId, 
            productCount: products.length,
            productIds: products.map(p => p.id),
            productNames: products.map(p => p.nombre)
          });

          // Validate all products have valid IDs
          const invalidProducts = products.filter(product => !product.id || typeof product.id !== 'string');
          if (invalidProducts.length > 0) {
            console.error(`${context}: Found products with invalid IDs`, { 
              invalidProducts: invalidProducts.map(p => ({ nombre: p.nombre, id: p.id }))
            });
            throw new Error(`Found ${invalidProducts.length} products with invalid IDs`);
          }

          // Validate all products have required fields for the new structure
          const productsWithMissingFields = products.filter(product => 
            typeof product.ultimoCosto !== 'number' || 
            typeof product.ultimaGanancia !== 'number'
          );
          
          if (productsWithMissingFields.length > 0) {
            console.warn(`${context}: Found products with missing required fields`, { 
              productsWithMissingFields: productsWithMissingFields.map(p => ({ 
                id: p.id,
                nombre: p.nombre, 
                ultimoCosto: p.ultimoCosto,
                ultimaGanancia: p.ultimaGanancia
              }))
            });
            
            // This is a warning, not an error, as the migration might still be in progress
            // The products will be handled with default values
          }

          // Update positions for all products
          const updatePromises = products.map((product, index) => {
            console.log(`${context}: Updating product position`, { 
              productId: product.id,
              productName: product.nombre,
              newPosition: index,
              ultimoCosto: product.ultimoCosto,
              ultimaGanancia: product.ultimaGanancia,
              empresaId
            });
            return updateProductInFirestore(empresaId, product.id, { posicion: index });
          });

          await Promise.all(updatePromises);
          console.log(`${context}: Products reordered successfully`, { 
            empresaId, 
            productCount: products.length 
          });
        },
        context,
        { maxAttempts: 2, baseDelay: 1000 }
      );
    } catch (error) {
      this.errorHandler.logError(context, error, { empresaId, productCount: products.length });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  async moveProduct(
    empresaId: string, 
    productId: string, 
    fromIndex: number, 
    toIndex: number,
    allProducts: Product[]
  ): Promise<ServiceResponse<void>> {
    const context = 'ProductService.moveProduct';
    
    try {
      console.log(`${context}: Starting product move`, { 
        productId, 
        fromIndex, 
        toIndex,
        totalProducts: allProducts.length
      });

      // Validate indices
      if (fromIndex < 0 || fromIndex >= allProducts.length) {
        throw new Error(`Invalid fromIndex: ${fromIndex}. Must be between 0 and ${allProducts.length - 1}`);
      }
      
      if (toIndex < 0 || toIndex >= allProducts.length) {
        throw new Error(`Invalid toIndex: ${toIndex}. Must be between 0 and ${allProducts.length - 1}`);
      }

      // Validate that the product at fromIndex matches the productId
      const productToMove = allProducts[fromIndex];
      if (productToMove.id !== productId) {
        throw new Error(`Product ID mismatch: expected ${productId} at index ${fromIndex}, found ${productToMove.id}`);
      }

      // Validate that the product has required fields
      if (typeof productToMove.ultimoCosto !== 'number' || typeof productToMove.ultimaGanancia !== 'number') {
        console.warn(`${context}: Product being moved has missing required fields`, { 
          productId: productToMove.id,
          productName: productToMove.nombre,
          ultimoCosto: productToMove.ultimoCosto,
          ultimaGanancia: productToMove.ultimaGanancia
        });
      }

      // Create new array with moved product
      const reorderedProducts = [...allProducts];
      const [movedProduct] = reorderedProducts.splice(fromIndex, 1);
      reorderedProducts.splice(toIndex, 0, movedProduct);

      // Update positions using the enhanced reorderProducts method
      const result = await this.reorderProducts(empresaId, reorderedProducts);
      
      if (result.success) {
        console.log(`${context}: Product moved successfully`, { 
          productId, 
          productName: movedProduct.nombre,
          fromIndex, 
          toIndex 
        });
      }
      
      return result;
    } catch (error) {
      console.error(`${context}: Product move failed`, { 
        productId, 
        fromIndex, 
        toIndex,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : error
      });
      this.errorHandler.logError(context, error, { 
        empresaId, 
        productId, 
        fromIndex, 
        toIndex 
      });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  subscribeToProducts(
    empresaId: string, 
    callback: (products: Product[]) => void,
    errorCallback?: (error: any) => void
  ): () => void {
    const context = 'ProductService.subscribeToProducts';
    
    return subscribeToProducts(empresaId, (products) => {
      try {
        // Enhance products with cached prices and validate required fields
        const enhancedProducts = products.map(product => {
          try {
            const cachedPrices = this.priceCache.getProductPrice(product.id);
            
            // Ensure product has required fields (from database or cache)
            const ultimoCosto = cachedPrices.ultimoCosto ?? product.ultimoCosto;
            const ultimaGanancia = cachedPrices.ultimaGanancia ?? product.ultimaGanancia;
            
            // Validate that we have valid required fields
            if (typeof ultimoCosto !== 'number' || typeof ultimaGanancia !== 'number') {
              console.warn(`${context}: Product missing required price fields in subscription`, { 
                productId: product.id,
                productName: product.nombre,
                ultimoCosto,
                ultimaGanancia
              });
              
              // Set default values for missing required fields
              return {
                ...product,
                ultimoCosto: typeof ultimoCosto === 'number' ? ultimoCosto : 0,
                ultimaGanancia: typeof ultimaGanancia === 'number' ? ultimaGanancia : 0
              };
            }
            
            return {
              ...product,
              ultimoCosto,
              ultimaGanancia
            };
          } catch (cacheError) {
            // Log cache error but return product with validated required fields
            this.errorHandler.logError(`${context}.priceCache`, cacheError, { 
              productId: product.id 
            });
            
            return {
              ...product,
              ultimoCosto: typeof product.ultimoCosto === 'number' ? product.ultimoCosto : 0,
              ultimaGanancia: typeof product.ultimaGanancia === 'number' ? product.ultimaGanancia : 0
            };
          }
        });
        
        callback(enhancedProducts);
      } catch (error) {
        this.errorHandler.logError(context, error, { empresaId });
        if (errorCallback) {
          errorCallback(error);
        }
      }
    });
  }

  // ============================================================================
  // PRICE MANAGEMENT
  // ============================================================================

  async updateProductPrices(
    productId: string, 
    productName: string,
    ultimoCosto: number, 
    ultimaGanancia: number
  ): Promise<ServiceResponse<void>> {
    const context = 'ProductService.updateProductPrices';
    
    try {
      return await this.errorHandler.executeWithRetry(
        async () => {
          await this.priceCache.updateProductPrice(productId, ultimoCosto, ultimaGanancia);
          
          // Also save to price history for suggestions
          try {
            await savePriceToHistory(productId, productName, ultimoCosto, ultimaGanancia);
          } catch (historyError) {
            // Log history error but don't fail the price update
            this.errorHandler.logError(`${context}.priceHistory`, historyError, { 
              productId, 
              productName 
            });
          }
          
          console.log(`${context}: Product prices updated successfully`, { 
            productId, 
            productName 
          });
        },
        context,
        { maxAttempts: 2, baseDelay: 500 }
      );
    } catch (error) {
      this.errorHandler.logError(context, error, { 
        productId, 
        productName, 
        ultimoCosto, 
        ultimaGanancia 
      });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  getLastUsedPrices(productId: string): { ultimoCosto?: number; ultimaGanancia?: number } {
    return this.priceCache.getProductPrice(productId);
  }

  // ============================================================================
  // PRODUCT MANAGEMENT VALIDATION
  // ============================================================================

  validateProductForManagement(product: Product): ValidationResult {
    const errors: string[] = [];

    // Validate required fields for new structure
    if (typeof product.ultimoCosto !== 'number') {
      errors.push(`Product ${product.nombre} (${product.id}) missing required field: ultimoCosto`);
    } else if (product.ultimoCosto < 0) {
      errors.push(`Product ${product.nombre} (${product.id}) has invalid ultimoCosto: ${product.ultimoCosto}`);
    }

    if (typeof product.ultimaGanancia !== 'number') {
      errors.push(`Product ${product.nombre} (${product.id}) missing required field: ultimaGanancia`);
    } else if (product.ultimaGanancia < 0) {
      errors.push(`Product ${product.nombre} (${product.id}) has invalid ultimaGanancia: ${product.ultimaGanancia}`);
    }

    // Validate other essential fields
    if (!product.id || typeof product.id !== 'string') {
      errors.push(`Product ${product.nombre} has invalid or missing ID`);
    }

    if (!product.nombre || product.nombre.trim().length === 0) {
      errors.push(`Product ${product.id} has invalid or missing name`);
    }

    if (typeof product.posicion !== 'number' || product.posicion < 0) {
      errors.push(`Product ${product.nombre} (${product.id}) has invalid position: ${product.posicion}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateProductListForManagement(products: Product[]): ValidationResult {
    const errors: string[] = [];
    
    for (const product of products) {
      const validation = this.validateProductForManagement(product);
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
    }

    // Check for duplicate positions
    const positions = products.map(p => p.posicion);
    const duplicatePositions = positions.filter((pos, index) => positions.indexOf(pos) !== index);
    if (duplicatePositions.length > 0) {
      errors.push(`Duplicate positions found: ${duplicatePositions.join(', ')}`);
    }

    // Check for position gaps (should be sequential starting from 0)
    const sortedPositions = [...positions].sort((a, b) => a - b);
    for (let i = 0; i < sortedPositions.length; i++) {
      if (sortedPositions[i] !== i) {
        errors.push(`Position gap detected: expected ${i}, found ${sortedPositions[i]}`);
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================================================
  // DEPENDENCY CHECKING
  // ============================================================================

  async checkProductDependencies(
    empresaId: string, 
    productId: string
  ): Promise<{ hasTransactions: boolean; transactionCount: number }> {
    // TODO: Implement dependency checking by querying transaction events
    // For now, return false to allow deletion
    return { hasTransactions: false, transactionCount: 0 };
  }
}

export default ProductService;