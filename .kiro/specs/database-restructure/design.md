# Design Document

## Overview

Esta reestructuración de la base de datos tiene como objetivo mejorar la organización de los datos de empresas y productos, asegurando que:

1. Las empresas contengan su nombre directamente en el documento principal
2. Los productos estén organizados como subcolecciones dentro de cada empresa
3. Los productos tengan todos los campos necesarios: color, nombre, índice, costo unitario y ganancia
4. Se mantenga la compatibilidad con los datos existentes durante la migración

## Architecture

### Current Structure
```
/empresas/{empresaId}
  - propietario: string
  - creado: Timestamp
  /productos/{productId}
    - nombre: string
    - colorFondo: string
    - posicion: number
    - ultimoCosto?: number
    - ultimaGanancia?: number
    - activo: boolean
    - creado: Timestamp
```

### New Structure
```
/empresas/{empresaId}
  - nombre: string          // NEW FIELD
  - propietario: string
  - creado: Timestamp
  /productos/{productId}
    - nombre: string
    - colorFondo: string     // Color del producto
    - posicion: number       // Índice para ordenamiento
    - ultimoCosto: number    // Costo unitario (REQUIRED)
    - ultimaGanancia: number // Ganancia unitaria (REQUIRED)
    - activo: boolean
    - creado: Timestamp
    - actualizado?: Timestamp
```

## Components and Interfaces

### 1. Database Migration Service

**Purpose:** Manejar la migración de datos existentes a la nueva estructura.

**Key Methods:**
- `migrateCompanyNames()`: Agregar nombres faltantes a empresas
- `validateProductFields()`: Asegurar que productos tengan todos los campos requeridos
- `backupCurrentData()`: Crear respaldo antes de la migración
- `rollbackMigration()`: Revertir cambios si hay problemas

### 2. Updated Type Definitions

**Changes to `schemas/types.ts`:**
```typescript
export interface Company {
  id: string;
  nombre: string;        // REQUIRED FIELD NOW
  propietario: string;
  creado: Timestamp;
}

export interface Product {
  id: string;
  nombre: string;
  colorFondo: string;
  posicion: number;
  ultimoCosto: number;    // REQUIRED NOW (no optional)
  ultimaGanancia: number; // REQUIRED NOW (no optional)
  activo: boolean;
  creado: Timestamp;
  actualizado?: Timestamp;
}
```

### 3. Updated Firestore Utilities

**Changes to `schemas/firestore-utils.ts`:**
- Update `createCompany()` to require `nombre` field
- Update `createProduct()` to require `ultimoCosto` and `ultimaGanancia`
- Add validation for required fields
- Update queries to handle new structure

### 4. Updated Services

**ProductService Updates:**
- Ensure all product creation requires cost and profit values
- Update validation to check for required fields
- Modify caching logic to handle required price fields

**CompanyService Updates:**
- Add company name management methods
- Update company creation to include name
- Add company name validation

## Data Models

### Company Document Structure
```typescript
{
  id: string;
  nombre: string;           // Company name - REQUIRED
  propietario: string;      // Owner user ID
  creado: Timestamp;        // Creation timestamp
}
```

### Product Document Structure (Subcollection)
```typescript
{
  id: string;
  nombre: string;           // Product name
  colorFondo: string;       // Background color for UI
  posicion: number;         // Index for ordering (0-based)
  ultimoCosto: number;      // Unit cost - REQUIRED
  ultimaGanancia: number;   // Unit profit - REQUIRED
  activo: boolean;          // Active status
  creado: Timestamp;        // Creation timestamp
  actualizado?: Timestamp;  // Last update timestamp
}
```

### Migration Data Structure
```typescript
interface MigrationStatus {
  empresaId: string;
  nombreAdded: boolean;
  productsValidated: boolean;
  backupCreated: boolean;
  migrationCompleted: boolean;
  errors: string[];
}
```

## Error Handling

### Migration Error Scenarios

1. **Missing Company Names**
   - Detection: Query companies without `nombre` field
   - Resolution: Prompt user for company names or use default naming
   - Fallback: Use `propietario` email as temporary name

2. **Incomplete Product Data**
   - Detection: Products missing `ultimoCosto` or `ultimaGanancia`
   - Resolution: Set default values (0) with warning
   - User Action: Review and update products after migration

3. **Data Corruption During Migration**
   - Prevention: Create backup before migration
   - Detection: Validation checks after each step
   - Recovery: Rollback mechanism to restore from backup

4. **Permission Issues**
   - Detection: Firestore permission errors during migration
   - Resolution: Ensure user has proper permissions
   - Fallback: Manual migration steps for affected documents

### Error Recovery Strategy

```typescript
interface MigrationRecovery {
  backupData: any[];
  rollbackSteps: string[];
  validationChecks: string[];
  manualSteps: string[];
}
```

## Testing Strategy

### Unit Tests

1. **Type Validation Tests**
   - Test new Company interface with required `nombre`
   - Test Product interface with required cost/profit fields
   - Test validation functions for new structure

2. **Migration Logic Tests**
   - Test company name addition logic
   - Test product field validation
   - Test backup and rollback mechanisms

3. **Service Method Tests**
   - Test updated ProductService methods
   - Test CompanyService with new name field
   - Test error handling for missing fields

### Integration Tests

1. **Database Migration Tests**
   - Test full migration process with sample data
   - Test rollback functionality
   - Test data integrity after migration

2. **Service Integration Tests**
   - Test ProductService with new required fields
   - Test company operations with name field
   - Test real-time subscriptions with new structure

### Manual Testing Scenarios

1. **Pre-Migration Validation**
   - Verify current data structure
   - Identify companies without names
   - Identify products with missing cost/profit data

2. **Migration Process Testing**
   - Execute migration on test environment
   - Verify all companies have names
   - Verify all products have required fields
   - Test rollback if issues occur

3. **Post-Migration Validation**
   - Test all CRUD operations
   - Test UI functionality with new structure
   - Test real-time updates
   - Verify data consistency

## Implementation Phases

### Phase 1: Preparation
- Update type definitions
- Create migration service
- Add validation for new structure
- Create backup mechanisms

### Phase 2: Migration Execution
- Backup existing data
- Add missing company names
- Validate and fix product data
- Update Firestore utilities

### Phase 3: Service Updates
- Update ProductService for required fields
- Update CompanyService for name management
- Update UI components for new structure
- Test all functionality

### Phase 4: Validation and Cleanup
- Verify data integrity
- Test all user workflows
- Remove old backup data
- Update documentation

## Security Considerations

1. **Data Backup Security**
   - Encrypt backup data
   - Secure storage location
   - Access control for backup files

2. **Migration Permissions**
   - Ensure proper Firestore rules
   - Validate user permissions before migration
   - Log all migration activities

3. **Data Validation**
   - Sanitize company names
   - Validate numeric fields for products
   - Prevent injection attacks during migration

## Performance Considerations

1. **Batch Operations**
   - Process migrations in batches to avoid timeouts
   - Use Firestore batch writes for efficiency
   - Implement progress tracking

2. **Index Management**
   - Update Firestore indexes for new queries
   - Remove unused indexes
   - Monitor query performance

3. **Caching Strategy**
   - Update caching logic for new structure
   - Clear existing caches after migration
   - Implement cache warming for new structure