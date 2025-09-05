import {
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import {
  Company,
  CreateCompanyData,
  ServiceResponse,
  ValidationResult,
  CompanyMember,
  COLLECTIONS
} from '@/schemas/types';
import { validateCompany } from '@/schemas/validation';
import {
  createCompany as createCompanyInFirestore,
  getCompany as getCompanyFromFirestore,
  updateCompany as updateCompanyInFirestore,
  getCompanyMembers as getCompanyMembersFromFirestore,
  addCompanyMember as addCompanyMemberToFirestore,
  removeCompanyMember as removeCompanyMemberFromFirestore,
  subscribeToCompany,
  subscribeToCompanyMembers
} from '@/schemas/firestore-utils';
import ErrorHandlingService from './ErrorHandlingService';

export class CompanyService {
  private errorHandler: ErrorHandlingService;

  constructor() {
    this.errorHandler = ErrorHandlingService.getInstance();
  }

  /**
   * Create a new company with required name field
   */
  async createCompany(companyData: CreateCompanyData, ownerId: string): Promise<ServiceResponse<string>> {
    const context = 'CompanyService.createCompany';

    console.log(`${context}: Starting company creation`, {
      companyName: companyData.nombre,
      ownerId
    });

    try {
      // Step 1: Validate company data
      console.log(`${context}: Validating company data`);

      const validation = validateCompany(companyData);

      if (!validation.isValid) {
        console.error(`${context}: Validation failed`, { errors: validation.errors });
        const validationError = new Error(validation.errors.join(', '));
        validationError.name = 'ValidationError';
        throw validationError;
      }
      console.log(`${context}: Validation passed`);

      const result = await this.errorHandler.executeWithRetry(
        async () => {
          // Step 2: Create company in Firestore
          console.log(`${context}: Creating company in Firestore`);

          const companyId = await createCompanyInFirestore(companyData, ownerId);

          console.log(`${context}: Company created successfully`, {
            companyId,
            companyName: companyData.nombre,
            ownerId
          });

          return companyId;
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );

      return result;

    } catch (error) {
      console.error(`${context}: Company creation failed`, {
        companyName: companyData.nombre,
        ownerId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });

      this.errorHandler.logError(context, error, {
        companyData,
        ownerId
      });

      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Get company by ID
   */
  async getCompany(empresaId: string): Promise<ServiceResponse<Company | null>> {
    const context = 'CompanyService.getCompany';

    try {
      const result = await this.errorHandler.executeWithRetry(
        async () => {
          console.log(`${context}: Fetching company`, { empresaId });

          const company = await getCompanyFromFirestore(empresaId);

          if (company) {
            // Validate that company has required fields
            if (!company.nombre || company.nombre.trim().length === 0) {
              console.warn(`${context}: Company missing required nombre field`, { empresaId });
            }
          }

          console.log(`${context}: Company fetched`, {
            empresaId,
            found: !!company,
            hasNombre: !!(company?.nombre)
          });

          return company;
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );

      return result;

    } catch (error) {
      console.error(`${context}: Failed to fetch company`, {
        empresaId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : error
      });

      this.errorHandler.logError(context, error, { empresaId });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }
  /*
*
   * Update company name and other fields
   */
  async updateCompany(empresaId: string, updates: Partial<Company>): Promise<ServiceResponse<void>> {
    const context = 'CompanyService.updateCompany';

    console.log(`${context}: Starting company update`, {
      empresaId,
      updateFields: Object.keys(updates)
    });

    try {
      // Step 1: Validate updates if they include fields that need validation
      if (updates.nombre !== undefined) {
        console.log(`${context}: Validating company name update`);

        // Validate company name
        if (!updates.nombre || updates.nombre.trim().length === 0) {
          const validationError = new Error('Company nombre is required and cannot be empty');
          validationError.name = 'ValidationError';
          throw validationError;
        }

        // Create a temporary object for validation
        const tempCompany: CreateCompanyData = {
          nombre: updates.nombre,
          propietario: updates.propietario || '' // Will be ignored in validation
        };

        const validation = validateCompany(tempCompany);
        if (!validation.isValid) {
          const validationError = new Error(validation.errors.join(', '));
          validationError.name = 'ValidationError';
          throw validationError;
        }
      }

      console.log(`${context}: Validation passed`);

      const result = await this.errorHandler.executeWithRetry(
        async () => {
          // Step 2: Update company in Firestore
          console.log(`${context}: Updating company in Firestore`);

          await updateCompanyInFirestore(empresaId, updates);

          console.log(`${context}: Company updated successfully`, {
            empresaId,
            updateFields: Object.keys(updates)
          });
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );

      return result;

    } catch (error) {
      console.error(`${context}: Company update failed`, {
        empresaId,
        updates,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });

      this.errorHandler.logError(context, error, {
        empresaId,
        updates
      });

      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Update company name specifically
   */
  async updateCompanyName(empresaId: string, newName: string): Promise<ServiceResponse<void>> {
    const context = 'CompanyService.updateCompanyName';

    console.log(`${context}: Starting company name update`, {
      empresaId,
      newName
    });

    try {
      // Validate name
      if (!newName || newName.trim().length === 0) {
        const validationError = new Error('Company name cannot be empty');
        validationError.name = 'ValidationError';
        throw validationError;
      }

      const trimmedName = newName.trim();

      // Use the general update method
      return await this.updateCompany(empresaId, { nombre: trimmedName });

    } catch (error) {
      console.error(`${context}: Company name update failed`, {
        empresaId,
        newName,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : error
      });

      this.errorHandler.logError(context, error, {
        empresaId,
        newName
      });

      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Get company members
   */
  async getCompanyMembers(empresaId: string): Promise<ServiceResponse<CompanyMember[]>> {
    const context = 'CompanyService.getCompanyMembers';

    try {
      const result = await this.errorHandler.executeWithRetry(
        async () => {
          console.log(`${context}: Fetching company members`, { empresaId });

          const members = await getCompanyMembersFromFirestore(empresaId);

          console.log(`${context}: Company members fetched`, {
            empresaId,
            memberCount: members.length
          });

          return members;
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );

      return result;

    } catch (error) {
      console.error(`${context}: Failed to fetch company members`, {
        empresaId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : error
      });

      this.errorHandler.logError(context, error, { empresaId });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Add member to company
   */
  async addCompanyMember(empresaId: string, userId: string, email: string): Promise<ServiceResponse<void>> {
    const context = 'CompanyService.addCompanyMember';

    try {
      const result = await this.errorHandler.executeWithRetry(
        async () => {
          console.log(`${context}: Adding company member`, {
            empresaId,
            userId,
            email
          });

          await addCompanyMemberToFirestore(empresaId, userId, email);

          console.log(`${context}: Company member added successfully`, {
            empresaId,
            userId,
            email
          });
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );

      return result;

    } catch (error) {
      console.error(`${context}: Failed to add company member`, {
        empresaId,
        userId,
        email,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : error
      });

      this.errorHandler.logError(context, error, {
        empresaId,
        userId,
        email
      });

      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Remove member from company
   */
  async removeCompanyMember(empresaId: string, userId: string): Promise<ServiceResponse<void>> {
    const context = 'CompanyService.removeCompanyMember';

    try {
      const result = await this.errorHandler.executeWithRetry(
        async () => {
          console.log(`${context}: Removing company member`, {
            empresaId,
            userId
          });

          await removeCompanyMemberFromFirestore(empresaId, userId);

          console.log(`${context}: Company member removed successfully`, {
            empresaId,
            userId
          });
        },
        context,
        { maxAttempts: 3, baseDelay: 1000 }
      );

      return result;

    } catch (error) {
      console.error(`${context}: Failed to remove company member`, {
        empresaId,
        userId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : error
      });

      this.errorHandler.logError(context, error, {
        empresaId,
        userId
      });

      return this.errorHandler.createFailureResponse(error, context);
    }
  }

  /**
   * Subscribe to real-time company updates
   */
  subscribeToCompany(empresaId: string, callback: (company: Company | null) => void): Unsubscribe {
    const context = 'CompanyService.subscribeToCompany';

    console.log(`${context}: Setting up company subscription`, { empresaId });

    return subscribeToCompany(empresaId, (company) => {
      console.log(`${context}: Company update received`, {
        empresaId,
        hasCompany: !!company,
        hasNombre: !!(company?.nombre)
      });

      // Validate company structure if it exists
      if (company && (!company.nombre || company.nombre.trim().length === 0)) {
        console.warn(`${context}: Company missing required nombre field`, { empresaId });
      }

      callback(company);
    });
  }

  /**
   * Subscribe to real-time company members updates
   */
  subscribeToCompanyMembers(empresaId: string, callback: (members: CompanyMember[]) => void): Unsubscribe {
    const context = 'CompanyService.subscribeToCompanyMembers';

    console.log(`${context}: Setting up company members subscription`, { empresaId });

    return subscribeToCompanyMembers(empresaId, (members) => {
      console.log(`${context}: Company members update received`, {
        empresaId,
        memberCount: members.length
      });

      callback(members);
    });
  }

  /**
   * Validate company name
   */
  validateCompanyName(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Company name is required');
    } else if (name.trim().length < 2) {
      errors.push('Company name must be at least 2 characters long');
    } else if (name.trim().length > 100) {
      errors.push('Company name must be less than 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if company has required fields for new structure
   */
  async validateCompanyStructure(empresaId: string): Promise<ServiceResponse<{ isValid: boolean; missingFields: string[] }>> {
    const context = 'CompanyService.validateCompanyStructure';

    try {
      const companyResponse = await this.getCompany(empresaId);

      if (!companyResponse.success || !companyResponse.data) {
        return {
          success: false,
          error: companyResponse.error || {
            type: 'unknown',
            message: 'Company not found',
            retryable: false
          }
        };
      }

      const company = companyResponse.data;
      const missingFields: string[] = [];

      // Check required fields
      if (!company.nombre || company.nombre.trim().length === 0) {
        missingFields.push('nombre');
      }

      const isValid = missingFields.length === 0;

      console.log(`${context}: Company structure validation`, {
        empresaId,
        isValid,
        missingFields
      });

      return {
        success: true,
        data: {
          isValid,
          missingFields
        }
      };

    } catch (error) {
      console.error(`${context}: Company structure validation failed`, {
        empresaId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message
        } : error
      });

      this.errorHandler.logError(context, error, { empresaId });
      return this.errorHandler.createFailureResponse(error, context);
    }
  }
}

// Export singleton instance
export const companyService = new CompanyService();
export default CompanyService;