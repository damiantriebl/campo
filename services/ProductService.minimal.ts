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
    
    console.log(`${context}: Starting product creation`, { 
      empresaId, 
      productName: productData.nombre
    });
    
    try {
      // Step 1: Validate product data
      console.log(`${context}: Validating product data`);
      
      const validation = validateProduct(productData);
      
      if (!validation.isValid) {
        console.error(`${context}: Validation failed`, { errors: validation.errors });
        const validationError = new Error(validation.errors.join(', '));
        validationError.name = 'ValidationError';
        throw validationError;
      }
      console.log(`${context}: Validation passed`);

      const result = await this.errorHandler.executeWithRetry(
        async () => {
          // Step 2: Create product in Firestore
          console.log(`${context}: Creating product in Firestore`, { empresaId });
          
          const productId = await createProductInFirestore(empresaId, productData);
          console.log(`${context}: Product created in Firestore`, { productId, empresaId });
          
          // Step 3: Cache initial prices if provided
          if (productData.ultimoCosto !== undefined && productData.ultimaGanancia !== undefined) {
            console.log(`${context}: Caching initial prices`, { 
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
          } else {
            console.log(`${context}: No prices to cache`, { productId });
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
}

export default ProductService;