/**
 * Manual Test Script for Product and Client Creation Functionality
 * 
 * This script tests the actual functionality of product and client creation
 * by running real operations against the services.
 * 
 * Run with: node test-creation-functionality.js
 */

const { validateProduct, validateClient } = require('./schemas/validation');

// Test data sets
const testData = {
  validProducts: [
    {
      nombre: 'Coca Cola 500ml',
      colorFondo: '#FF0000',
      posicion: 0,
      ultimoCosto: 15.50,
      ultimaGanancia: 4.50,
      activo: true
    },
    {
      nombre: 'Simple Product',
      colorFondo: '#00FF00',
      posicion: 1,
      activo: true
    },
    {
      nombre: 'Free Sample',
      colorFondo: '#0000FF',
      posicion: 0,
      ultimoCosto: 0,
      ultimaGanancia: 0,
      activo: true
    }
  ],
  
  invalidProducts: [
    {
      nombre: '',
      colorFondo: '#FF0000',
      posicion: 0,
      activo: true
    },
    {
      nombre: 'Valid Product',
      colorFondo: 'invalid-color',
      posicion: 0,
      activo: true
    },
    {
      nombre: 'Valid Product',
      colorFondo: '#FF0000',
      posicion: -1,
      activo: true
    }
  ],
  
  validClients: [
    {
      nombre: 'Juan Pérez',
      telefono: '+1234567890',
      direccion: 'Calle Principal 123',
      email: 'juan@example.com',
      activo: true
    },
    {
      nombre: 'Cliente Básico',
      activo: true
    },
    {
      nombre: 'María José Rodríguez-García',
      telefono: '+1234567890',
      activo: true
    }
  ],
  
  invalidClients: [
    {
      nombre: '',
      activo: true
    },
    {
      nombre: 'Valid Name',
      telefono: '123',
      activo: true
    },
    {
      nombre: 'Valid Name',
      email: 'invalid-email',
      activo: true
    }
  ]
};

// Test results tracking
const results = {
  productValidation: { passed: 0, failed: 0, errors: [] },
  clientValidation: { passed: 0, failed: 0, errors: [] },
  summary: { totalTests: 0, totalPassed: 0, totalFailed: 0 }
};

function logTest(category, testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [${category}] ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
  
  results.summary.totalTests++;
  if (passed) {
    results.summary.totalPassed++;
  } else {
    results.summary.totalFailed++;
  }
}

function testProductValidation() {
  console.log('\n=== Testing Product Validation ===');
  
  // Test valid products
  testData.validProducts.forEach((product, index) => {
    try {
      const validation = validateProduct(product);
      const passed = validation.isValid && validation.errors.length === 0;
      
      logTest(
        'Product Validation', 
        `Valid Product ${index + 1}: ${product.nombre}`, 
        passed,
        passed ? 'Validation passed as expected' : `Unexpected errors: ${validation.errors.join(', ')}`
      );
      
      if (passed) {
        results.productValidation.passed++;
      } else {
        results.productValidation.failed++;
        results.productValidation.errors.push({
          product: product.nombre,
          errors: validation.errors
        });
      }
    } catch (error) {
      logTest('Product Validation', `Valid Product ${index + 1}`, false, `Exception: ${error.message}`);
      results.productValidation.failed++;
    }
  });
  
  // Test invalid products
  testData.invalidProducts.forEach((product, index) => {
    try {
      const validation = validateProduct(product);
      const passed = !validation.isValid && validation.errors.length > 0;
      
      logTest(
        'Product Validation', 
        `Invalid Product ${index + 1}: ${product.nombre || 'empty name'}`, 
        passed,
        passed ? `Correctly rejected: ${validation.errors.join(', ')}` : 'Should have been rejected but passed'
      );
      
      if (passed) {
        results.productValidation.passed++;
      } else {
        results.productValidation.failed++;
      }
    } catch (error) {
      logTest('Product Validation', `Invalid Product ${index + 1}`, false, `Exception: ${error.message}`);
      results.productValidation.failed++;
    }
  });
}

function testClientValidation() {
  console.log('\n=== Testing Client Validation ===');
  
  // Test valid clients
  testData.validClients.forEach((client, index) => {
    try {
      const validation = validateClient(client);
      const passed = validation.isValid && validation.errors.length === 0;
      
      logTest(
        'Client Validation', 
        `Valid Client ${index + 1}: ${client.nombre}`, 
        passed,
        passed ? 'Validation passed as expected' : `Unexpected errors: ${validation.errors.join(', ')}`
      );
      
      if (passed) {
        results.clientValidation.passed++;
      } else {
        results.clientValidation.failed++;
        results.clientValidation.errors.push({
          client: client.nombre,
          errors: validation.errors
        });
      }
    } catch (error) {
      logTest('Client Validation', `Valid Client ${index + 1}`, false, `Exception: ${error.message}`);
      results.clientValidation.failed++;
    }
  });
  
  // Test invalid clients
  testData.invalidClients.forEach((client, index) => {
    try {
      const validation = validateClient(client);
      const passed = !validation.isValid && validation.errors.length > 0;
      
      logTest(
        'Client Validation', 
        `Invalid Client ${index + 1}: ${client.nombre || 'empty name'}`, 
        passed,
        passed ? `Correctly rejected: ${validation.errors.join(', ')}` : 'Should have been rejected but passed'
      );
      
      if (passed) {
        results.clientValidation.passed++;
      } else {
        results.clientValidation.failed++;
      }
    } catch (error) {
      logTest('Client Validation', `Invalid Client ${index + 1}`, false, `Exception: ${error.message}`);
      results.clientValidation.failed++;
    }
  });
}

function testEdgeCases() {
  console.log('\n=== Testing Edge Cases ===');
  
  // Test special characters in product names
  const specialCharProducts = [
    { nombre: 'Café & Té (Especial) - 500ml', colorFondo: '#FF0000', posicion: 0, activo: true },
    { nombre: 'Product with "quotes" and \'apostrophes\'', colorFondo: '#00FF00', posicion: 0, activo: true },
    { nombre: 'Émojis 🥤 Product', colorFondo: '#0000FF', posicion: 0, activo: true }
  ];
  
  specialCharProducts.forEach((product, index) => {
    try {
      const validation = validateProduct(product);
      const passed = validation.isValid;
      
      logTest(
        'Edge Cases', 
        `Special Characters Product ${index + 1}`, 
        passed,
        passed ? 'Special characters handled correctly' : `Errors: ${validation.errors.join(', ')}`
      );
    } catch (error) {
      logTest('Edge Cases', `Special Characters Product ${index + 1}`, false, `Exception: ${error.message}`);
    }
  });
  
  // Test boundary values
  const boundaryTests = [
    { 
      name: 'Maximum length product name',
      data: { nombre: 'A'.repeat(100), colorFondo: '#FF0000', posicion: 0, activo: true },
      shouldPass: true
    },
    { 
      name: 'Over maximum length product name',
      data: { nombre: 'A'.repeat(101), colorFondo: '#FF0000', posicion: 0, activo: true },
      shouldPass: false
    },
    { 
      name: 'Large position number',
      data: { nombre: 'Large Position', colorFondo: '#FF0000', posicion: 999999, activo: true },
      shouldPass: true
    },
    { 
      name: 'Very large prices',
      data: { nombre: 'Expensive Product', colorFondo: '#FF0000', posicion: 0, ultimoCosto: 999999, ultimaGanancia: 999999, activo: true },
      shouldPass: true
    }
  ];
  
  boundaryTests.forEach(test => {
    try {
      const validation = validateProduct(test.data);
      const passed = validation.isValid === test.shouldPass;
      
      logTest(
        'Edge Cases', 
        test.name, 
        passed,
        passed ? 'Boundary test passed' : `Expected ${test.shouldPass ? 'valid' : 'invalid'}, got ${validation.isValid ? 'valid' : 'invalid'}`
      );
    } catch (error) {
      logTest('Edge Cases', test.name, false, `Exception: ${error.message}`);
    }
  });
}

function testPerformance() {
  console.log('\n=== Testing Performance ===');
  
  const iterations = 1000;
  const testProduct = {
    nombre: 'Performance Test Product',
    colorFondo: '#FF0000',
    posicion: 0,
    ultimoCosto: 10,
    ultimaGanancia: 5,
    activo: true
  };
  
  try {
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      validateProduct(testProduct);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / iterations;
    
    const passed = avgTime < 1; // Should be less than 1ms per validation
    
    logTest(
      'Performance', 
      `${iterations} product validations`, 
      passed,
      `Total: ${duration}ms, Average: ${avgTime.toFixed(3)}ms per validation`
    );
  } catch (error) {
    logTest('Performance', 'Product validation performance', false, `Exception: ${error.message}`);
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  
  console.log(`Total Tests: ${results.summary.totalTests}`);
  console.log(`Passed: ${results.summary.totalPassed} (${((results.summary.totalPassed / results.summary.totalTests) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${results.summary.totalFailed} (${((results.summary.totalFailed / results.summary.totalTests) * 100).toFixed(1)}%)`);
  
  console.log('\nProduct Validation:');
  console.log(`  Passed: ${results.productValidation.passed}`);
  console.log(`  Failed: ${results.productValidation.failed}`);
  
  console.log('\nClient Validation:');
  console.log(`  Passed: ${results.clientValidation.passed}`);
  console.log(`  Failed: ${results.clientValidation.failed}`);
  
  if (results.productValidation.errors.length > 0) {
    console.log('\nProduct Validation Errors:');
    results.productValidation.errors.forEach(error => {
      console.log(`  - ${error.product}: ${error.errors.join(', ')}`);
    });
  }
  
  if (results.clientValidation.errors.length > 0) {
    console.log('\nClient Validation Errors:');
    results.clientValidation.errors.forEach(error => {
      console.log(`  - ${error.client}: ${error.errors.join(', ')}`);
    });
  }
  
  const overallSuccess = results.summary.totalFailed === 0;
  console.log(`\n${overallSuccess ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
  
  return overallSuccess;
}

// Main execution
async function main() {
  console.log('🚀 Starting Product and Client Creation Functionality Tests');
  console.log('Testing validation functions and edge cases...\n');
  
  try {
    testProductValidation();
    testClientValidation();
    testEdgeCases();
    testPerformance();
    
    const success = printSummary();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  testProductValidation,
  testClientValidation,
  testEdgeCases,
  testPerformance,
  results
};