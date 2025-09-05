import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import {
  Client,
  CreateClientData,
  UpdateClientData,
  ValidationResult,
  ServiceResponse,
  COLLECTIONS
} from '@/schemas/types';
import { validateClient } from '@/schemas/validation';
import ErrorHandlingService from './ErrorHandlingService';
import { productCreationDebugger } from '../debug-product-creation';
import { debugLogger, logClientCreation } from './DebugLogger';
import { errorTracker, trackClientError } from './ErrorTracker';

export class ClientService {
  private empresaId: string;
  private errorHandler: ErrorHandlingService;

  constructor(empresaId: string) {
    this.empresaId = empresaId;
    this.errorHandler = ErrorHandlingService.getInstance();
  }

  private getClientCollection() {
    return collection(db, COLLECTIONS.EMPRESAS, this.empresaId, COLLECTIONS.CLIENTES);
  }

  private getClientDoc(clientId: string) {
    return doc(db, COLLECTIONS.EMPRESAS, this.empresaId, COLLECTIONS.CLIENTES, clientId);
  }

  /**
   * Create a new client
   */
  async createClient(clientData: CreateClientData): Promise<ServiceResponse<string>> {
    const context = 'ClientService.createClient';
    const startTime = Date.now();

    // Enhanced debugging for client creation with multiple logging systems
    productCreationDebugger.info(context, 'Starting client creation', {
      empresaId: this.empresaId,
      clientData: {
        nombre: clientData.nombre,
        direccion: clientData.direccion,
        telefono: clientData.telefono,
        oculto: clientData.oculto,
        hasNotas: !!clientData.notas,
        hasFechaImportante: !!clientData.fechaImportante
      }
    });

    logClientCreation.start(this.empresaId, clientData);
    errorTracker.addBreadcrumb('Client creation started', { 
      empresaId: this.empresaId, 
      clientName: clientData.nombre 
    });

    const operationId = debugLogger.startOperation(context, 'createClient', {
      empresaId: this.empresaId,
      clientName: clientData.nombre,
      hasNotas: !!clientData.notas,
      hasFechaImportante: !!clientData.fechaImportante
    });

    console.log(`${context}: Starting client creation`, {
      empresaId: this.empresaId,
      clientData: {
        nombre: clientData.nombre,
        direccion: clientData.direccion,
        telefono: clientData.telefono,
        oculto: clientData.oculto,
        hasNotas: !!clientData.notas,
        hasFechaImportante: !!clientData.fechaImportante
      }
    });

    try {
      // Step 1: Validate client data
      console.log(`${context}: Validating client data`);
      productCreationDebugger.info(context, 'Starting validation');
      debugLogger.info(context, 'Starting client data validation', { clientName: clientData.nombre });
      errorTracker.addBreadcrumb('Client validation started');

      const validation = validateClient(clientData);
      productCreationDebugger.logValidationResult(validation.isValid, validation.errors);
      logClientCreation.validation(validation.isValid, validation.errors);
      debugLogger.logValidation(context, validation.isValid, validation.errors, { clientName: clientData.nombre });

      if (!validation.isValid) {
        console.error(`${context}: Validation failed`, { errors: validation.errors });
        const validationError = new Error(validation.errors.join(', '));
        validationError.name = 'ValidationError';
        
        // Track validation error
        trackClientError(validationError, 'validation', {
          empresaId: this.empresaId,
          clientData: { nombre: clientData.nombre },
          validationErrors: validation.errors
        });
        
        debugLogger.endOperation(context, 'createClient', operationId, false, {
          validationErrors: validation.errors
        }, startTime);
        
        throw validationError;
      }
      console.log(`${context}: Validation passed`);
      errorTracker.addBreadcrumb('Client validation passed');

      this.errorHandler.logError(context, null, {
        action: 'starting_creation',
        empresaId: this.empresaId,
        clientName: clientData.nombre
      });

      const result = await this.errorHandler.executeWithRetry(
        async () => {
          // Step 2: Prepare client document
          console.log(`${context}: Preparing client document`);
          productCreationDebugger.info(context, 'Preparing client document');
          debugLogger.info(context, 'Preparing client document', { clientName: clientData.nombre });
          errorTracker.addBreadcrumb('Client document preparation started');

          const newClient: Omit<Client, 'id'> = {
            ...clientData,
            deudaActual: 0, // Initialize debt to 0
            creado: Timestamp.now(),
            actualizado: Timestamp.now()
          };

          console.log(`${context}: Client document prepared`, {
            empresaId: this.empresaId,
            clientFields: Object.keys(newClient),
            deudaActual: newClient.deudaActual
          });
          
          debugLogger.info(context, 'Client document prepared successfully', {
            clientName: clientData.nombre,
            fieldCount: Object.keys(newClient).length
          });
          errorTracker.addBreadcrumb('Client document prepared');

          // Step 3: Add to Firestore
          console.log(`${context}: Adding client to Firestore`);
          productCreationDebugger.info(context, 'Adding client to Firestore', { empresaId: this.empresaId });
          debugLogger.info(context, 'Adding client to Firestore', { 
            empresaId: this.empresaId, 
            clientName: clientData.nombre 
          });
          errorTracker.addBreadcrumb('Firestore client creation started', { empresaId: this.empresaId });

          try {
            const docRef = await addDoc(this.getClientCollection(), newClient);

            console.log(`${context}: Client created successfully in Firestore`, {
              clientId: docRef.id,
              empresaId: this.empresaId,
              clientName: clientData.nombre
            });

            productCreationDebugger.logFirestoreOperation('createClient', true, {
              clientId: docRef.id,
              empresaId: this.empresaId,
              clientName: clientData.nombre
            });

            logClientCreation.firestore('createClient', true, {
              clientId: docRef.id,
              empresaId: this.empresaId,
              clientName: clientData.nombre
            });

            debugLogger.logFirestoreOperation(context, 'createClient', true, {
              clientId: docRef.id,
              empresaId: this.empresaId,
              clientName: clientData.nombre
            });

            errorTracker.addBreadcrumb('Client created in Firestore', { clientId: docRef.id });
            
            debugLogger.info(context, 'Client creation completed successfully', {
              clientId: docRef.id,
              empresaId: this.empresaId,
              clientName: clientData.nombre
            });
            
            logClientCreation.complete(true, docRef.id);
            debugLogger.endOperation(context, 'createClient', operationId, true, { clientId: docRef.id }, startTime);

            return docRef.id;
          } catch (firestoreError) {
            console.error(`${context}: Firestore operation failed`, {
              empresaId: this.empresaId,
              clientName: clientData.nombre,
              error: firestoreError instanceof Error ? {
                name: firestoreError.name,
                message: firestoreError.message,
                code: (firestoreError as any).code
              } : firestoreError
            });

            productCreationDebugger.logFirestoreOperation('createClient', false, {
              empresaId: this.empresaId,
              clientName: clientData.nombre
            }, firestoreError);

            logClientCreation.firestore('createClient', false, {
              empresaId: this.empresaId,
              clientName: clientData.nombre
            }, firestoreError as Error);

            debugLogger.logFirestoreOperation(context, 'createClient', false, {
              empresaId: this.empresaId,
              clientName: clientData.nombre
            }, firestoreError as Error);

            trackClientError(firestoreError as Error, 'firestoreCreate', {
              empresaId: this.empresaId,
              clientName: clientData.nombre
            });

            throw firestoreError;
          }
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );

      productCreationDebugger.logServiceResponse('ClientService', 'createClient', result);
      return result;

    } catch (error) {
      console.error(`${context}: Client creation failed`, {
        empresaId: this.empresaId,
        clientName: clientData.nombre,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });

      productCreationDebugger.error(context, 'Client creation failed', {
        empresaId: this.empresaId,
        clientName: clientData.nombre,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          code: (error as any).code
        } : error
      });

      debugLogger.error(context, 'Client creation failed', {
        empresaId: this.empresaId,
        clientName: clientData.nombre,
        operationId
      }, error as Error);

      logClientCreation.complete(false, undefined, error as Error);

      // Track the error with full context
      trackClientError(error as Error, 'createClient', {
        empresaId: this.empresaId,
        clientData: { nombre: clientData.nombre },
        operationId,
        duration: Date.now() - startTime
      });

      debugLogger.endOperation(context, 'createClient', operationId, false, {
        errorMessage: (error as Error).message
      }, startTime);

      this.errorHandler.logError(context, error, {
        empresaId: this.empresaId,
        clientData
      });

      const failureResponse = this.errorHandler.createFailureResponse(error, context);
      productCreationDebugger.logServiceResponse('ClientService', 'createClient', failureResponse);
      debugLogger.logServiceResponse(context, 'ClientService', 'createClient', failureResponse);
      return failureResponse;
    }
  }

  /**
   * Update an existing client
   */
  async updateClient(clientId: string, updateData: UpdateClientData): Promise<ServiceResponse<void>> {
    const context = 'ClientService.updateClient';

    try {
      // Validate update data if it contains fields that need validation
      if (updateData.nombre || updateData.direccion || updateData.telefono || updateData.oculto !== undefined) {
        // Create a temporary object for validation
        const tempClient: CreateClientData = {
          nombre: updateData.nombre || '',
          direccion: updateData.direccion || '',
          telefono: updateData.telefono || '',
          oculto: updateData.oculto ?? false,
          notas: updateData.notas,
          fechaImportante: updateData.fechaImportante
        };

        const validation = validateClient(tempClient);
        if (!validation.isValid) {
          const validationError = new Error(validation.errors.join(', '));
          validationError.name = 'ValidationError';
          throw validationError;
        }
      }

      this.errorHandler.logError(context, null, {
        action: 'starting_update',
        empresaId: this.empresaId,
        clientId,
        updateData
      });

      return await this.errorHandler.executeWithRetry(
        async () => {
          // Prepare update data
          const updatePayload = {
            ...updateData,
            actualizado: Timestamp.now()
          };

          // Update in Firestore
          await updateDoc(this.getClientDoc(clientId), updatePayload);

          console.log(`${context}: Client updated successfully`, {
            clientId,
            empresaId: this.empresaId
          });
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );
    } catch (error) {
      this.errorHandler.logError(context, error, {
        empresaId: this.empresaId,
        clientId,
        updateData
      });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Delete a client (soft delete by hiding)
   */
  async deleteClient(clientId: string): Promise<ServiceResponse<void>> {
    const context = 'ClientService.deleteClient';

    try {
      this.errorHandler.logError(context, null, {
        action: 'starting_deletion',
        empresaId: this.empresaId,
        clientId
      });

      // Instead of hard delete, we hide the client to preserve transaction history
      const result = await this.updateClient(clientId, { oculto: true });

      if (result.success) {
        console.log(`${context}: Client deleted (hidden) successfully`, {
          clientId,
          empresaId: this.empresaId
        });
      }

      return result;
    } catch (error) {
      this.errorHandler.logError(context, error, {
        empresaId: this.empresaId,
        clientId
      });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Get a single client by ID
   */
  async getClient(clientId: string): Promise<ServiceResponse<Client>> {
    const context = 'ClientService.getClient';

    return await this.errorHandler.executeWithRetry(
      async () => {
        const docSnap = await getDoc(this.getClientDoc(clientId));

        if (!docSnap.exists()) {
          const notFoundError = new Error('Cliente no encontrado');
          notFoundError.name = 'NotFoundError';
          throw notFoundError;
        }

        const client: Client = {
          id: docSnap.id,
          ...docSnap.data()
        } as Client;

        console.log(`${context}: Client retrieved successfully`, {
          clientId,
          empresaId: this.empresaId
        });

        return client;
      },
      context,
      { maxAttempts: 3, baseDelay: 500 }
    );
  }

  /**
   * Get all clients with optional filtering
   */
  async getClients(options?: {
    includeHidden?: boolean;
    sortBy?: 'nombre' | 'deuda' | 'ultimaTransaccion';
    sortOrder?: 'asc' | 'desc';
  }): Promise<ServiceResponse<Client[]>> {
    const context = 'ClientService.getClients';

    return await this.errorHandler.executeWithRetry(
      async () => {
        let q = query(this.getClientCollection());

        // Filter hidden clients if not explicitly requested
        if (!options?.includeHidden) {
          q = query(q, where('oculto', '==', false));
        }

        // Add sorting
        if (options?.sortBy) {
          const order = options.sortOrder || 'asc';
          q = query(q, orderBy(options.sortBy, order));
        } else {
          // Default sort by name
          q = query(q, orderBy('nombre', 'asc'));
        }

        const querySnapshot = await getDocs(q);
        const clients: Client[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];

        console.log(`${context}: Retrieved ${clients.length} clients`, {
          empresaId: this.empresaId,
          options
        });

        return clients;
      },
      context,
      { maxAttempts: 3, baseDelay: 500 }
    );
  }

  /**
   * Search clients by name or other fields with advanced filtering
   */
  async searchClients(searchTerm: string, options?: {
    includeHidden?: boolean;
    sortBy?: 'nombre' | 'deuda' | 'ultimaTransaccion';
    sortOrder?: 'asc' | 'desc';
    debtFilter?: 'all' | 'withDebt' | 'noDebt' | 'inFavor';
  }): Promise<ServiceResponse<Client[]>> {
    const context = 'ClientService.searchClients';

    try {
      this.errorHandler.logError(context, null, {
        action: 'starting_search',
        empresaId: this.empresaId,
        searchTerm,
        options
      });

      // Get all clients first (Firestore doesn't support case-insensitive text search natively)
      const result = await this.getClients({
        includeHidden: options?.includeHidden,
        sortBy: options?.sortBy,
        sortOrder: options?.sortOrder
      });

      if (!result.success || !result.data) {
        return result;
      }

      let filteredClients = result.data;

      // Apply text search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filteredClients = filteredClients.filter(client =>
          client.nombre.toLowerCase().includes(searchLower) ||
          client.direccion.toLowerCase().includes(searchLower) ||
          (client.notas && client.notas.toLowerCase().includes(searchLower)) ||
          client.telefono.includes(searchTerm)
        );
      }

      // Apply debt filter
      if (options?.debtFilter && options.debtFilter !== 'all') {
        filteredClients = filteredClients.filter(client => {
          switch (options.debtFilter) {
            case 'withDebt':
              return client.deudaActual > 0;
            case 'noDebt':
              return client.deudaActual === 0;
            case 'inFavor':
              return client.deudaActual < 0;
            default:
              return true;
          }
        });
      }

      console.log(`${context}: Search completed`, {
        searchTerm,
        totalResults: filteredClients.length,
        empresaId: this.empresaId
      });

      return this.errorHandler.createSuccessResponse(filteredClients);
    } catch (error) {
      this.errorHandler.logError(context, error, {
        empresaId: this.empresaId,
        searchTerm,
        options
      });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Get clients with debt status filtering
   */
  async getClientsByDebtStatus(debtStatus: 'all' | 'withDebt' | 'noDebt' | 'inFavor', options?: {
    includeHidden?: boolean;
    sortBy?: 'nombre' | 'deuda' | 'ultimaTransaccion';
    sortOrder?: 'asc' | 'desc';
  }): Promise<ServiceResponse<Client[]>> {
    const context = 'ClientService.getClientsByDebtStatus';

    try {
      this.errorHandler.logError(context, null, {
        action: 'starting_debt_filter',
        empresaId: this.empresaId,
        debtStatus,
        options
      });

      const result = await this.getClients(options);

      if (!result.success || !result.data) {
        return result;
      }

      if (debtStatus === 'all') {
        return result;
      }

      const filteredClients = result.data.filter(client => {
        switch (debtStatus) {
          case 'withDebt':
            return client.deudaActual > 0;
          case 'noDebt':
            return client.deudaActual === 0;
          case 'inFavor':
            return client.deudaActual < 0;
          default:
            return true;
        }
      });

      console.log(`${context}: Debt status filtering completed`, {
        debtStatus,
        totalResults: filteredClients.length,
        empresaId: this.empresaId
      });

      return this.errorHandler.createSuccessResponse(filteredClients);
    } catch (error) {
      this.errorHandler.logError(context, error, {
        empresaId: this.empresaId,
        debtStatus,
        options
      });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Toggle client visibility (hide/show)
   */
  async toggleClientVisibility(clientId: string): Promise<ServiceResponse<boolean>> {
    const context = 'ClientService.toggleClientVisibility';

    try {
      this.errorHandler.logError(context, null, {
        action: 'starting_visibility_toggle',
        empresaId: this.empresaId,
        clientId
      });

      const clientResult = await this.getClient(clientId);
      if (!clientResult.success || !clientResult.data) {
        const notFoundError = new Error('Cliente no encontrado');
        notFoundError.name = 'NotFoundError';
        throw notFoundError;
      }

      const newHiddenState = !clientResult.data.oculto;
      const updateResult = await this.updateClient(clientId, { oculto: newHiddenState });

      if (!updateResult.success) {
        return this.errorHandler.createFailureResponse(
          updateResult.error || new Error('Error updating client'),
          context
        );
      }

      console.log(`${context}: Client visibility toggled successfully`, {
        clientId,
        newHiddenState,
        empresaId: this.empresaId
      });

      return this.errorHandler.createSuccessResponse(newHiddenState);
    } catch (error) {
      this.errorHandler.logError(context, error, {
        empresaId: this.empresaId,
        clientId
      });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Update client debt (called when transactions are added/modified)
   */
  async updateClientDebt(clientId: string, newDebt: number): Promise<ServiceResponse<void>> {
    const context = 'ClientService.updateClientDebt';

    try {
      this.errorHandler.logError(context, null, {
        action: 'starting_debt_update',
        empresaId: this.empresaId,
        clientId,
        newDebt
      });

      return await this.errorHandler.executeWithRetry(
        async () => {
          await updateDoc(this.getClientDoc(clientId), {
            deudaActual: newDebt,
            ultimaTransaccion: Timestamp.now(),
            actualizado: Timestamp.now()
          });

          console.log(`${context}: Client debt updated successfully`, {
            clientId,
            newDebt,
            empresaId: this.empresaId
          });
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );
    } catch (error) {
      this.errorHandler.logError(context, error, {
        empresaId: this.empresaId,
        clientId,
        newDebt
      });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Bulk hide/show multiple clients
   */
  async bulkToggleVisibility(clientIds: string[], hide: boolean): Promise<ServiceResponse<void>> {
    const context = 'ClientService.bulkToggleVisibility';

    try {
      this.errorHandler.logError(context, null, {
        action: 'starting_bulk_toggle',
        empresaId: this.empresaId,
        clientCount: clientIds.length,
        hide
      });

      return await this.errorHandler.executeWithRetry(
        async () => {
          const updatePromises = clientIds.map(clientId =>
            this.updateClient(clientId, { oculto: hide })
          );

          const results = await Promise.all(updatePromises);
          const failedUpdates = results.filter(result => !result.success);

          if (failedUpdates.length > 0) {
            const bulkError = new Error(`Error al actualizar ${failedUpdates.length} clientes`);
            bulkError.name = 'BulkOperationError';
            throw bulkError;
          }

          console.log(`${context}: Bulk visibility toggle completed successfully`, {
            clientCount: clientIds.length,
            hide,
            empresaId: this.empresaId
          });
        },
        context,
        { maxAttempts: 2, baseDelay: 1000 }
      );
    } catch (error) {
      this.errorHandler.logError(context, error, {
        empresaId: this.empresaId,
        clientIds,
        hide
      });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Get visibility statistics
   */
  async getVisibilityStats(): Promise<ServiceResponse<{ total: number; visible: number; hidden: number }>> {
    const context = 'ClientService.getVisibilityStats';

    try {
      this.errorHandler.logError(context, null, {
        action: 'starting_stats_calculation',
        empresaId: this.empresaId
      });

      const result = await this.getClients({ includeHidden: true });

      if (!result.success || !result.data) {
        return this.errorHandler.createFailureResponse(
          result.error || new Error('Error getting clients'),
          context
        );
      }

      const total = result.data.length;
      const hidden = result.data.filter(client => client.oculto).length;
      const visible = total - hidden;

      const stats = { total, visible, hidden };

      console.log(`${context}: Visibility stats calculated successfully`, {
        stats,
        empresaId: this.empresaId
      });

      return this.errorHandler.createSuccessResponse(stats);
    } catch (error) {
      this.errorHandler.logError(context, error, {
        empresaId: this.empresaId
      });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Listen to real-time client updates
   */
  subscribeToClients(
    callback: (clients: Client[]) => void,
    options?: {
      includeHidden?: boolean;
      sortBy?: 'nombre' | 'deuda' | 'ultimaTransaccion';
      sortOrder?: 'asc' | 'desc';
    },
    errorCallback?: (error: any) => void
  ): () => void {
    const context = 'ClientService.subscribeToClients';

    let q = query(this.getClientCollection());

    // Filter hidden clients if not explicitly requested
    if (!options?.includeHidden) {
      q = query(q, where('oculto', '==', false));
    }

    // Add sorting
    if (options?.sortBy) {
      const order = options.sortOrder || 'asc';
      q = query(q, orderBy(options.sortBy, order));
    } else {
      // Default sort by name
      q = query(q, orderBy('nombre', 'asc'));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      try {
        const clients: Client[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Client[];

        callback(clients);
      } catch (error) {
        this.errorHandler.logError(context, error, {
          empresaId: this.empresaId,
          options
        });
        if (errorCallback) {
          errorCallback(error);
        }
      }
    }, (error) => {
      this.errorHandler.logError(context, error, {
        empresaId: this.empresaId,
        options
      });
      if (errorCallback) {
        errorCallback(error);
      }
    });

    return unsubscribe;
  }

  /**
   * Subscribe to a specific client's updates
   */
  subscribeToClient(
    clientId: string,
    callback: (client: Client | null) => void,
    errorCallback?: (error: any) => void
  ): () => void {
    const context = 'ClientService.subscribeToClient';

    const unsubscribe = onSnapshot(this.getClientDoc(clientId), (docSnapshot) => {
      try {
        if (docSnapshot.exists()) {
          const client: Client = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          } as Client;
          callback(client);
        } else {
          callback(null);
        }
      } catch (error) {
        this.errorHandler.logError(context, error, {
          empresaId: this.empresaId,
          clientId
        });
        if (errorCallback) {
          errorCallback(error);
        } else {
          callback(null);
        }
      }
    }, (error) => {
      this.errorHandler.logError(context, error, {
        empresaId: this.empresaId,
        clientId
      });
      if (errorCallback) {
        errorCallback(error);
      } else {
        callback(null);
      }
    });

    return unsubscribe;
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