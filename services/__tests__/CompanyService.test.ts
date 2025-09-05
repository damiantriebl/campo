import { CompanyService } from '../CompanyService';
import { CreateCompanyData } from '@/schemas/types';

// Mock the firestore-utils module
jest.mock('@/schemas/firestore-utils', () => ({
  createCompany: jest.fn(),
  getCompany: jest.fn(),
  updateCompany: jest.fn(),
  getCompanyMembers: jest.fn(),
  addCompanyMember: jest.fn(),
  removeCompanyMember: jest.fn(),
  subscribeToCompany: jest.fn(),
  subscribeToCompanyMembers: jest.fn(),
}));

// Mock the validation module
jest.mock('@/schemas/validation', () => ({
  validateCompany: jest.fn(),
}));

// Mock ErrorHandlingService
jest.mock('../ErrorHandlingService', () => ({
  getInstance: jest.fn(() => ({
    executeWithRetry: jest.fn(async (fn) => {
      try {
        const result = await fn();
        return { success: true, data: result };
      } catch (error) {
        throw error;
      }
    }),
    logError: jest.fn(),
    createFailureResponse: jest.fn((error) => ({
      success: false,
      error: {
        type: 'unknown',
        message: error.message,
        retryable: false
      }
    }))
  }))
}));

describe('CompanyService', () => {
  let companyService: CompanyService;
  const mockValidateCompany = require('@/schemas/validation').validateCompany;
  const mockCreateCompany = require('@/schemas/firestore-utils').createCompany;
  const mockGetCompany = require('@/schemas/firestore-utils').getCompany;
  const mockUpdateCompany = require('@/schemas/firestore-utils').updateCompany;

  beforeEach(() => {
    companyService = new CompanyService();
    jest.clearAllMocks();
  });

  describe('createCompany', () => {
    it('should create a company successfully', async () => {
      const companyData: CreateCompanyData = {
        nombre: 'Test Company',
        propietario: 'test@example.com'
      };
      const ownerId = 'user123';
      const expectedCompanyId = 'company123';

      mockValidateCompany.mockReturnValue({ isValid: true, errors: [] });
      mockCreateCompany.mockResolvedValue(expectedCompanyId);

      const result = await companyService.createCompany(companyData, ownerId);

      expect(result.success).toBe(true);
      expect(result.data).toBe(expectedCompanyId);
      expect(mockValidateCompany).toHaveBeenCalledWith(companyData);
      expect(mockCreateCompany).toHaveBeenCalledWith(companyData, ownerId);
    });

    it('should fail validation for empty company name', async () => {
      const companyData: CreateCompanyData = {
        nombre: '',
        propietario: 'test@example.com'
      };
      const ownerId = 'user123';

      mockValidateCompany.mockReturnValue({ 
        isValid: false, 
        errors: ['El nombre de la empresa es requerido'] 
      });

      const result = await companyService.createCompany(companyData, ownerId);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('El nombre de la empresa es requerido');
      expect(mockCreateCompany).not.toHaveBeenCalled();
    });
  });

  describe('updateCompanyName', () => {
    it('should update company name successfully', async () => {
      const empresaId = 'company123';
      const newName = 'Updated Company Name';

      mockValidateCompany.mockReturnValue({ isValid: true, errors: [] });
      mockUpdateCompany.mockResolvedValue(undefined);

      const result = await companyService.updateCompanyName(empresaId, newName);

      expect(result.success).toBe(true);
      expect(mockUpdateCompany).toHaveBeenCalledWith(empresaId, { nombre: newName });
    });

    it('should fail for empty company name', async () => {
      const empresaId = 'company123';
      const newName = '';

      const result = await companyService.updateCompanyName(empresaId, newName);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Company name cannot be empty');
      expect(mockUpdateCompany).not.toHaveBeenCalled();
    });

    it('should trim whitespace from company name', async () => {
      const empresaId = 'company123';
      const newName = '  Trimmed Company Name  ';

      mockValidateCompany.mockReturnValue({ isValid: true, errors: [] });
      mockUpdateCompany.mockResolvedValue(undefined);

      const result = await companyService.updateCompanyName(empresaId, newName);

      expect(result.success).toBe(true);
      expect(mockUpdateCompany).toHaveBeenCalledWith(empresaId, { nombre: 'Trimmed Company Name' });
    });
  });

  describe('validateCompanyName', () => {
    it('should validate correct company name', () => {
      const result = companyService.validateCompanyName('Valid Company Name');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty company name', () => {
      const result = companyService.validateCompanyName('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Company name is required');
    });

    it('should reject company name that is too short', () => {
      const result = companyService.validateCompanyName('A');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Company name must be at least 2 characters long');
    });

    it('should reject company name that is too long', () => {
      const longName = 'A'.repeat(101);
      const result = companyService.validateCompanyName(longName);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Company name must be less than 100 characters');
    });
  });

  describe('validateCompanyStructure', () => {
    it('should validate company with required fields', async () => {
      const empresaId = 'company123';
      const mockCompany = {
        id: empresaId,
        nombre: 'Test Company',
        propietario: 'test@example.com',
        creado: new Date()
      };

      mockGetCompany.mockResolvedValue(mockCompany);

      const result = await companyService.validateCompanyStructure(empresaId);

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(true);
      expect(result.data?.missingFields).toHaveLength(0);
    });

    it('should identify missing nombre field', async () => {
      const empresaId = 'company123';
      const mockCompany = {
        id: empresaId,
        nombre: '', // Empty name
        propietario: 'test@example.com',
        creado: new Date()
      };

      mockGetCompany.mockResolvedValue(mockCompany);

      const result = await companyService.validateCompanyStructure(empresaId);

      expect(result.success).toBe(true);
      expect(result.data?.isValid).toBe(false);
      expect(result.data?.missingFields).toContain('nombre');
    });
  });
});