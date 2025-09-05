# Implementation Plan

- [x] 1. Update type definitions and interfaces





  - Modify Company interface to make 'nombre' field required
  - Update Product interface to make 'ultimoCosto' and 'ultimaGanancia' required fields
  - Add migration-related type definitions
  - _Requirements: 1.1, 2.3, 4.1_

- [x] 2. Create database migration service





  - [x] 2.1 Implement MigrationService class with backup functionality


    - Create service to handle data backup before migration
    - Implement backup validation and storage mechanisms
    - Write unit tests for backup functionality
    - _Requirements: 3.1, 3.4_

  - [x] 2.2 Implement company name migration logic


    - Create method to identify companies without 'nombre' field
    - Implement logic to add company names (prompt user or use defaults)
    - Write validation for company name migration
    - _Requirements: 1.1, 1.2, 3.2_

  - [x] 2.3 Implement product data validation and migration


    - Create method to identify products with missing cost/profit data
    - Implement logic to set default values for missing fields
    - Add validation for product field completeness
    - _Requirements: 2.1, 2.2, 3.3_

  - [x] 2.4 Implement rollback functionality


    - Create rollback mechanism to restore from backup
    - Add validation checks for rollback success
    - Write unit tests for rollback scenarios
    - _Requirements: 3.1, 3.4_

- [x] 3. Update Firestore utilities and validation





  - [x] 3.1 Update firestore-utils.ts for new structure


    - Modify createCompany function to require 'nombre' field
    - Update createProduct function to require cost and profit fields
    - Add validation for required fields in all CRUD operations
    - _Requirements: 1.2, 2.2, 4.2_

  - [x] 3.2 Update validation functions


    - Modify validateProduct to check for required cost/profit fields
    - Add validateCompany function to check for required name field
    - Update error messages for new validation rules
    - _Requirements: 1.3, 2.3, 4.1_

  - [x] 3.3 Update Firestore queries and subscriptions


    - Ensure all queries work with new structure
    - Update real-time subscriptions for new fields
    - Test query performance with new structure
    - _Requirements: 2.1, 4.2_

- [x] 4. Update ProductService for required fields





  - [x] 4.1 Modify product creation methods


    - Update createProduct to require cost and profit values
    - Add validation for required fields before Firestore operations
    - Update error handling for missing required fields
    - _Requirements: 2.2, 4.3_

  - [x] 4.2 Update product caching logic


    - Modify price caching to handle required fields
    - Update cache validation for new structure
    - Ensure cache consistency with new required fields
    - _Requirements: 2.3, 4.3_

  - [x] 4.3 Update product ordering and management


    - Ensure product ordering works with new structure
    - Update drag-and-drop functionality for new fields
    - Test product management operations with required fields
    - _Requirements: 2.4, 4.3_

- [x] 5. Create or update CompanyService for name management





  - [x] 5.1 Implement CompanyService class


    - Create service for company CRUD operations
    - Add company name validation and management methods
    - Implement company creation with required name field
    - _Requirements: 1.2, 1.3, 4.2_

  - [x] 5.2 Add company name update functionality


    - Create method to update company names
    - Add validation for company name changes
    - Implement real-time updates for company name changes
    - _Requirements: 1.3, 4.2_
- [x] 6. Update UI components for new structure




- [ ] 6. Update UI components for new structure

  - [x] 6.1 Update company-related components


    - Modify components to display company names from new field
    - Update company creation forms to include name field
    - Test company name display throughout the application
    - _Requirements: 5.1, 5.3_

  - [x] 6.2 Update product-related components


    - Ensure product forms require cost and profit values
    - Update product display components for new required fields
    - Test product creation and editing with new structure
    - _Requirements: 5.2, 5.3_

  - [x] 6.3 Update product ordering interface


    - Ensure drag-and-drop works with new structure
    - Update product list ordering using 'posicion' field
    - Test product reordering functionality
    - _Requirements: 2.4, 5.4_

- [x] 7. Execute database migration





  - [x] 7.1 Create migration execution script


    - Implement script to run full migration process
    - Add progress tracking and logging for migration
    - Include validation checks at each migration step
    - _Requirements: 3.1, 3.4_

  - [x] 7.2 Test migration on development environment


    - Execute migration on test data
    - Validate all data integrity after migration
    - Test rollback functionality if issues occur
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 7.3 Execute production migration


    - Create production backup before migration
    - Execute migration with monitoring and logging
    - Validate production data after migration completion
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [-] 8. Post-migration validation and testing



  - [x] 8.1 Validate all CRUD operations


    - Test company creation, reading, updating with new structure
    - Test product operations with required fields
    - Verify all database operations work correctly
    - _Requirements: 4.4, 5.3_

  - [x] 8.2 Test real-time functionality


    - Verify real-time subscriptions work with new structure
    - Test live updates for companies and products
    - Validate data synchronization across clients
    - _Requirements: 4.2, 5.3_

  - [-] 8.3 Comprehensive integration testing

    - Test complete user workflows with new structure
    - Verify all UI components work with migrated data
    - Test error handling and edge cases
    - _Requirements: 5.1, 5.2, 5.3, 5.4_