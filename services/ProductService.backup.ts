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
import { productCreationDebugger } from '../debug-product-creation';
import { debugLogger, logProductCreation } from './DebugLogger';
import { errorTracker, trackProductError } from './ErrorTracker';

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
      return {
        ultimoCosto: cached.ultimoCosto,
        ultimaGanancia: cached.ultimaGanancia
      };
    }
    return {};
  }

  async clearCache(): Promise<void> {
    this.cache = {};
    await AsyncStorage.removeItem(PRICE_CACHE_KEY);
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
    const startTime = Date.now();
    
    // Enhanced debugging with multiple logging systems
    productCreationDebugger.logProductCreationStart(empresaId, productData);
    logProductCreation.start(empresaId, productData);
    errorTracker.addBreadcrumb('Product creation started', { empresaId, productName: productData.nombre });
    
    const operationId = debugLogger.startOperation(context, 'createProduct', {
      empresaId,
      productName: productData.nombre,
      hasUltimoCosto: productData.ultimoCosto !== undefined,
      hasUltimaGanancia: productData.ultimaGanancia !== undefined
    });
    
    console.log(`${context}: Starting product creation`, { 
      empresaId, 
      productData: {
        ...productData,
        // Log structure without sensitive data
        nombre: productData.nombre,
        colorFondo: productData.colorFondo,
        hasUltimoCosto: productData.ultimoCosto !== undefined,
        hasUltimaGanancia: productData.ultimaGanancia !== undefined,
        posicion: productData.posicion,
        activo: productData.activo
      }
    });
    
    try {
      // Step 1: Validate product data
      console.log(`${context}: Validating product data`);
      productCreationDebugger.info(context, 'Starting validation');
      debugLogger.info(context, 'Starting product data validation', { productName: productData.nombre });
      errorTracker.addBreadcrumb('Product validation started');
      
      const validation = validateProduct(productData);
      productCreationDebugger.logValidationResult(validation.isValid, validation.errors);
      logProductCreation.validation(validation.isValid, validation.errors);
      debugLogger.logValidation(context, validation.isValid, validation.errors, { productName: productData.nombre });
      
      if (!validation.isValid) {
        console.error(`${context}: Validation failed`, { errors: validation.errors });
        const validationError = new Error(validation.errors.join(', '));
        validationError.name = 'ValidationError';
        
        // Track validation error
        trackProductError(validationError, 'validation', { 
          empresaId, 
          productData: { nombre: productData.nombre },
          validationErrors: validation.errors 
        });
        
        debugLogger.endOperation(context, 'createProduct', operationId, false, { 
          validationErrors: validation.errors 
        }, startTime);
        
        throw validationError;
      }
      console.log(`${context}: Validation passed`);
      errorTracker.addBreadcrumb('Product validation passed');

      this.errorHandler.logError(context, null, { 
        action: 'starting_creation', 
        empresaId, 
        productName: productData.nombre 
      });

      const result = await this.errorHandler.executeWithRetry(
        async () => {
          // Step 2: Create product in Firestore
          console.log(`${context}: Creating product in Firestore`, { empresaId });
          productCreationDebugger.info(context, 'Calling Firestore createProduct', { empresaId });
          debugLogger.info(context, 'Creating product in Firestore', { empresaId, productName: productData.nombre });
          errorTracker.addBreadcrumb('Firestore product creation started', { empresaId });
          
          try {
            const productId = await createProductInFirestore(empresaId, productData);
            productCreationDebugger.logFirestoreOperation('createProduct', true, { productId, empresaId });
            logProductCreation.firestore('createProduct', true, { productId, empresaId });
            debugLogger.logFirestoreOperation(context, 'createProduct', true, { productId, empresaId });
            console.log(`${context}: Product created in Firestore`, { productId, empresaId });
            errorTracker.addBreadcrumb('Product created in Firestore', { productId });
            
            // Step 3: Cache initial prices if provided
            if (productData.ultimoCosto !== undefined && productData.ultimaGanancia !== undefined) {
              console.log(`${context}: Caching initial prices`, { 
                productId, 
                ultimoCosto: productData.ultimoCosto, 
                ultimaGanancia: productData.ultimaGanancia 
              });
              productCreationDebugger.info(context, 'Caching initial prices', { productId });
              debugLogger.info(context, 'Caching initial product prices', { productId });
              errorTracker.addBreadcrumb('Price caching started', { productId });
              
              try {
                await this.priceCache.updateProductPrice(
                  productId, 
                  productData.ultimoCosto, 
                  productData.ultimaGanancia
                );
                console.log(`${context}: Prices cached successfully`, { productId });
                productCreationDebugger.info(context, 'Prices cached successfully', { productId });
                debugLogger.info(context, 'Product prices cached successfully', { productId });
                errorTracker.addBreadcrumb('Price caching completed', { productId });
              } catch (cacheError) {
                // Log cache error but don't fail the creation
                console.error(`${context}: Price caching failed`, { productId, error: cacheError });
                productCreationDebugger.error(context, 'Price caching failed', { productId, error: cacheError });
                debugLogger.error(context, 'Price caching failed', { productId }, cacheError as Error);
                trackProductError(cacheError as Error, 'priceCache', { productId });
                this.errorHandler.logError(`${context}.priceCache`, cacheError, { productId });
              }
            } else {
              console.log(`${context}: No prices to cache`, { productId });
              productCreationDebugger.info(context, 'No prices to cache', { productId });
              debugLogger.info(context, 'No initial prices to cache', { productId });
            }

            console.log(`${context}: Product created successfully`, { productId, empresaId });
            productCreationDebugger.info(context, 'Product creation completed successfully', { productId, empresaId });
            debugLogger.info(context, 'Product creation completed successfully', { productId, empresaId });
            logProductCreation.complete(true, productId);
            errorTracker.addBreadcrumb('Product creation completed successfully', { productId });
            
            debugLogger.endOperation(context, 'createProduct', operationId, true, { productId }, startTime);
            return productId;
          } catch (firestoreError) {
            productCreationDebugger.logFirestoreOperation('createProduct', false, { empresaId }, firestoreError);
            logProductCreation.firestore('createProduct', false, { empresaId }, firestoreError as Error);
            debugLogger.logFirestoreOperation(context, 'createProduct', false, { empresaId }, firestoreError as Error);
            trackProductError(firestoreError as Error, 'firestoreCreate', { empresaId, productName: productData.nombre });
            throw firestoreError;
          }
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );

      productCreationDebugger.logServiceResponse('ProductService', 'createProduct', result);
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
      
      productCreationDebugger.error(context, 'Product creation failed', {
        empresaId,
        productName: productData.nombre,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          code: (error as any).code
        } : error
      });
      
      debugLogger.error(context, 'Product creation failed', {
        empresaId,
        productName: productData.nombre,
        operationId
      }, error as Error);
      
      logProductCreation.complete(false, undefined, error as Error);
      
      // Track the error with full context
      trackProductError(error as Error, 'createProduct', {
        empresaId,
        productData: { nombre: productData.nombre },
        operationId,
        duration: Date.now() - startTime
      });
      
      debugLogger.endOperation(context, 'createProduct', operationId, false, {
        errorMessage: (error as Error).message
      }, startTime);
      
      this.errorHandler.logError(context, error, { empresaId, productData });
      const failureResponse = this.errorHandler.createFailureResponse(error, context);
      productCreationDebugger.logServiceResponse('ProductService', 'createProduct', failureResponse);
      debugLogger.logServiceResponse(context, 'ProductService', 'createProduct', failureResponse);
      return failureResponse;
    }
  }

  async getProducts(empresaId: string): Promise<ServiceResponse<Product[]>> {
    const context = 'ProductService.getProducts';
    
    return await this.errorHandler.executeWithRetry(
      async () => {
        const products = await getProductsFromFirestore(empresaId);
        
        // Enhance products with cached prices
        const enhancedProducts = products.map(product => {
          try {
            const cachedPrices = this.priceCache.getProductPrice(product.id);
            return {
              ...product,
              ultimoCosto: cachedPrices.ultimoCosto ?? product.ultimoCosto,
              ultimaGanancia: cachedPrices.ultimaGanancia ?? product.ultimaGanancia
            };
          } catch (cacheError) {
            // Log cache error but return product without cached prices
            this.errorHandler.logError(`${context}.priceCache`, cacheError, { productId: product.id });
            return product;
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
    
    try {
      this.errorHandler.logError(context, null, { 
        action: 'starting_update', 
        empresaId, 
        productId, 
        updates 
      });

      return await this.errorHandler.executeWithRetry(
        async () => {
          // If updating prices, cache them first
          if (updates.ultimoCosto !== undefined && updates.ultimaGanancia !== undefined) {
            try {
              await this.priceCache.updateProductPrice(
                productId, 
                updates.ultimoCosto, 
                updates.ultimaGanancia
              );
            } catch (cacheError) {
              // Log cache error but continue with update
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
      this.errorHandler.logError(context, null, { 
        action: 'starting_deletion', 
        empresaId, 
        productId 
      });

      return await this.errorHandler.executeWithRetry(
        async () => {
          // TODO: Check for dependencies (transactions using this product)
          // For now, we'll just soft delete
          await deleteProductInFirestore(empresaId, productId);
          console.log(`${context}: Product deleted successfully`, { productId, empresaId });
        },
        context,
        { maxAttempts: 2, baseDelay: 1000 } // Fewer retries for delete operations
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
      this.errorHandler.logError(context, null, { 
        action: 'starting_reorder', 
        empresaId, 
        productCount: products.length 
      });

      return await this.errorHandler.executeWithRetry(
        async () => {
          // Update positions for all products
          const updatePromises = products.map((product, index) => 
            updateProductInFirestore(empresaId, product.id, { posicion: index })
          );

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
      this.errorHandler.logError(context, null, { 
        action: 'starting_move', 
        empresaId, 
        productId, 
        fromIndex, 
        toIndex 
      });

      // Create new array with moved product
      const reorderedProducts = [...allProducts];
      const [movedProduct] = reorderedProducts.splice(fromIndex, 1);
      reorderedProducts.splice(toIndex, 0, movedProduct);

      // Update positions using the enhanced reorderProducts method
      const result = await this.reorderProducts(empresaId, reorderedProducts);
      
      if (result.success) {
        console.log(`${context}: Product moved successfully`, { 
          productId, 
          fromIndex, 
          toIndex 
        });
      }
      
      return result;
    } catch (error) {
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
        // Enhance products with cached prices
        const enhancedProducts = products.map(product => {
          try {
            const cachedPrices = this.priceCache.getProductPrice(product.id);
            return {
              ...product,
              ultimoCosto: cachedPrices.ultimoCosto ?? product.ultimoCosto,
              ultimaGanancia: cachedPrices.ultimaGanancia ?? product.ultimaGanancia
            };
          } catch (cacheError) {
            // Log cache error but return product without cached prices
            this.errorHandler.logError(`${context}.priceCache`, cacheError, { 
              productId: product.id 
            });
            return product;
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

  // ============================================================================
  // DEBUG UTILITIES
  // ============================================================================

  getDebugReport(): string {
    return productCreationDebugger.generateReport();
  }

  exportDebugLogs(): string {
    return productCreationDebugger.exportLogs();
  }

  clearDebugLogs(): void {
    productCreationDebugger.clearLogs();
  }
}

export default ProductService;