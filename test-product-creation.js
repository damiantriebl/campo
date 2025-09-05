// Simple test script to verify product creation flow
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

async function testProductCreation() {
  console.log('=== Testing Product Creation Flow ===');
  
  const testEmpresaId = 'test-empresa-123';
  const testProductData = {
    nombre: 'Test Product',
    colorFondo: '#FF0000',
    posicion: 0,
    ultimoCosto: 10,
    ultimaGanancia: 5,
    activo: true,
    creado: Timestamp.now()
  };

  try {
    console.log('1. Testing product creation...');
    console.log('   EmpresaId:', testEmpresaId);
    console.log('   Product data:', testProductData);
    
    // Get products collection reference
    const productsRef = collection(db, 'empresas', testEmpresaId, 'productos');
    console.log('2. Products collection reference created');
    
    // Add document
    console.log('3. Adding document to Firestore...');
    const docRef = await addDoc(productsRef, testProductData);
    
    console.log('✅ SUCCESS: Product created with ID:', docRef.id);
    return docRef.id;
    
  } catch (error) {
    console.error('❌ ERROR: Product creation failed');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Full error:', error);
    
    // Analyze common error types
    if (error.code === 'permission-denied') {
      console.log('\n🔍 ANALYSIS: Permission denied error');
      console.log('   - Check if user is authenticated');
      console.log('   - Verify Firestore rules allow product creation');
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
  console.log('\n=== Testing Firestore Rules ===');
  
  // Test different scenarios
  const scenarios = [
    {
      name: 'Valid product data',
      empresaId: 'test-empresa-123',
      data: {
        nombre: 'Valid Product',
        colorFondo: '#00FF00',
        posicion: 0,
        activo: true,
        creado: Timestamp.now()
      }
    },
    {
      name: 'Missing required field (nombre)',
      empresaId: 'test-empresa-123',
      data: {
        colorFondo: '#00FF00',
        posicion: 0,
        activo: true,
        creado: Timestamp.now()
      }
    },
    {
      name: 'Invalid color format',
      empresaId: 'test-empresa-123',
      data: {
        nombre: 'Invalid Color Product',
        colorFondo: 'invalid-color',
        posicion: 0,
        activo: true,
        creado: Timestamp.now()
      }
    },
    {
      name: 'Empty empresa ID',
      empresaId: '',
      data: {
        nombre: 'Empty Empresa Product',
        colorFondo: '#0000FF',
        posicion: 0,
        activo: true,
        creado: Timestamp.now()
      }
    }
  ];

  for (const scenario of scenarios) {
    console.log(`\nTesting: ${scenario.name}`);
    try {
      const productsRef = collection(db, 'empresas', scenario.empresaId, 'productos');
      const docRef = await addDoc(productsRef, scenario.data);
      console.log(`✅ SUCCESS: ${scenario.name} - ID: ${docRef.id}`);
    } catch (error) {
      console.log(`❌ EXPECTED FAILURE: ${scenario.name}`);
      console.log(`   Error: ${error.code} - ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  try {
    await testProductCreation();
    await testFirestoreRules();
  } catch (error) {
    console.error('\n=== Test execution failed ===');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  console.log('🚀 Starting Firestore Product Creation Tests');
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
  testProductCreation,
  testFirestoreRules
};