// Simple test script to verify client creation flow
// This script can be run manually to test the actual Firestore operations

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  Timestamp,
  connectFirestoreEmulator 
} = require('firebase/firestore');

// Firebase config (replace with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
  projectId: "your-project-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to emulator if running locally
if (process.env.NODE_ENV === 'development') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to Firestore emulator');
  } catch (error) {
    console.log('Firestore emulator already connected or not available');
  }
}

async function testClientCreation() {
  console.log('=== Testing Client Creation Flow ===');
  
  const testEmpresaId = 'test-empresa-123';
  const testClientData = {
    nombre: 'Test Client',
    direccion: 'Test Address 123',
    telefono: '+1234567890',
    oculto: false,
    notas: 'Test client notes',
    deudaActual: 0,
    creado: Timestamp.now()
  };

  try {
    console.log('1. Testing client creation...');
    console.log('   EmpresaId:', testEmpresaId);
    console.log('   Client data:', testClientData);
    
    // Get clients collection reference
    const clientsRef = collection(db, 'empresas', testEmpresaId, 'clientes');
    console.log('2. Clients collection reference created');
    
    // Add document
    console.log('3. Adding document to Firestore...');
    const docRef = await addDoc(clientsRef, testClientData);
    
    console.log('✅ SUCCESS: Client created with ID:', docRef.id);
    return docRef.id;
    
  } catch (error) {
    console.error('❌ ERROR: Client creation failed');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Full error:', error);
    
    // Analyze common error types
    if (error.code === 'permission-denied') {
      console.log('\n🔍 ANALYSIS: Permission denied error');
      console.log('   - Check if user is authenticated');
      console.log('   - Verify Firestore rules allow client creation');
      console.log('   - Ensure user is a member of the company');
    } else if (error.code === 'unavailable') {
      console.log('\n🔍 ANALYSIS: Service unavailable error');
      console.log('   - Check internet connection');
      console.log('   - Verify Firestore service is running');
      console.log('   - Try again in a few moments');
    } else if (error.code === 'invalid-argument') {
      console.log('\n🔍 ANALYSIS: Invalid argument error');
      console.log('   - Check data structure matches Firestore rules');
      console.log('   - Verify all required fields are present');
      console.log('   - Check data types are correct');
    }
    
    throw error;
  }
}

async function testFirestoreRules() {
  console.log('\n=== Testing Firestore Rules for Clients ===');
  
  // Test different scenarios
  const scenarios = [
    {
      name: 'Valid client data',
      empresaId: 'test-empresa-123',
      data: {
        nombre: 'Valid Client',
        direccion: 'Valid Address 456',
        telefono: '+9876543210',
        oculto: false,
        deudaActual: 0,
        creado: Timestamp.now()
      }
    },
    {
      name: 'Missing required field (nombre)',
      empresaId: 'test-empresa-123',
      data: {
        direccion: 'Address without name',
        telefono: '+1111111111',
        oculto: false,
        deudaActual: 0,
        creado: Timestamp.now()
      }
    },
    {
      name: 'Missing required field (direccion)',
      empresaId: 'test-empresa-123',
      data: {
        nombre: 'Client without address',
        telefono: '+2222222222',
        oculto: false,
        deudaActual: 0,
        creado: Timestamp.now()
      }
    },
    {
      name: 'Missing required field (telefono)',
      empresaId: 'test-empresa-123',
      data: {
        nombre: 'Client without phone',
        direccion: 'Address without phone',
        oculto: false,
        deudaActual: 0,
        creado: Timestamp.now()
      }
    },
    {
      name: 'Invalid debt value (string instead of number)',
      empresaId: 'test-empresa-123',
      data: {
        nombre: 'Client with invalid debt',
        direccion: 'Address with invalid debt',
        telefono: '+3333333333',
        oculto: false,
        deudaActual: 'invalid-debt',
        creado: Timestamp.now()
      }
    },
    {
      name: 'Empty empresa ID',
      empresaId: '',
      data: {
        nombre: 'Client with empty empresa',
        direccion: 'Address with empty empresa',
        telefono: '+4444444444',
        oculto: false,
        deudaActual: 0,
        creado: Timestamp.now()
      }
    },
    {
      name: 'Client with special characters',
      empresaId: 'test-empresa-123',
      data: {
        nombre: 'José María Pérez-González',
        direccion: 'Calle de la Constitución #123, Col. Centro',
        telefono: '+52 (55) 1234-5678',
        oculto: false,
        notas: 'Cliente VIP con descuento del 10%',
        deudaActual: 0,
        creado: Timestamp.now()
      }
    },
    {
      name: 'Client with long strings',
      empresaId: 'test-empresa-123',
      data: {
        nombre: 'A'.repeat(150), // Very long name
        direccion: 'B'.repeat(250), // Very long address
        telefono: '+1234567890123456789', // Very long phone
        oculto: false,
        deudaActual: 0,
        creado: Timestamp.now()
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\nTesting: ${scenario.name}`);
    try {
      const clientsRef = collection(db, 'empresas', scenario.empresaId, 'clientes');
      const docRef = await addDoc(clientsRef, scenario.data);
      console.log(`✅ SUCCESS: ${scenario.name} - ID: ${docRef.id}`);
    } catch (error) {
      console.log(`❌ EXPECTED FAILURE: ${scenario.name}`);
      console.log(`   Error: ${error.code} - ${error.message}`);
    }
  }
}

async function testClientValidation() {
  console.log('\n=== Testing Client Data Validation ===');
  
  const validationTests = [
    {
      name: 'Valid phone formats',
      phones: [
        '+1234567890',
        '(555) 123-4567',
        '555-123-4567',
        '5551234567',
        '+52 55 1234 5678',
        '+1 (555) 123-4567'
      ]
    },
    {
      name: 'Invalid phone formats',
      phones: [
        'abc123',
        '123',
        '+',
        '++1234567890',
        'phone-number',
        ''
      ]
    }
  ];

  for (const test of validationTests) {
    console.log(`\n${test.name}:`);
    for (const phone of test.phones) {
      const clientData = {
        nombre: 'Test Client',
        direccion: 'Test Address',
        telefono: phone,
        oculto: false,
        deudaActual: 0,
        creado: Timestamp.now()
      };

      try {
        const clientsRef = collection(db, 'empresas', 'test-empresa-123', 'clientes');
        const docRef = await addDoc(clientsRef, clientData);
        console.log(`  ✅ ${phone} - SUCCESS (ID: ${docRef.id})`);
      } catch (error) {
        console.log(`  ❌ ${phone} - FAILED (${error.code})`);
      }
    }
  }
}

// Main execution
async function main() {
  try {
    await testClientCreation();
    await testFirestoreRules();
    await testClientValidation();
  } catch (error) {
    console.error('\n=== Test execution failed ===');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  console.log('🚀 Starting Firestore Client Creation Tests');
  console.log('Note: This requires proper Firebase authentication and configuration');
  console.log('For testing with emulator, set NODE_ENV=development\n');
  
  main().then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testClientCreation,
  testFirestoreRules,
  testClientValidation
};