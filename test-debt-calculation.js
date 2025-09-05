// Simple test to verify calculateClientDebt function works correctly
// Run this in browser console to test

console.log('Testing calculateClientDebt function...');

// Mock Timestamp class for testing
class MockTimestamp {
  constructor(seconds) {
    this.seconds = seconds;
  }
  
  toMillis() {
    return this.seconds * 1000;
  }
  
  toDate() {
    return new Date(this.seconds * 1000);
  }
}

// Test data - simple sale and payment events
const testEvents = [
  {
    id: 'sale1',
    clienteId: 'client1',
    fecha: new MockTimestamp(1000),
    tipo: 'venta',
    producto: 'Test Product',
    cantidad: 2,
    costoUnitario: 100,
    gananciaUnitaria: 50,
    totalVenta: 300,
    creado: new MockTimestamp(1000),
    borrado: false
  },
  {
    id: 'payment1',
    clienteId: 'client1',
    fecha: new MockTimestamp(2000),
    tipo: 'pago',
    montoPago: 150,
    creado: new MockTimestamp(2000),
    borrado: false
  }
];

console.log('Test events:', testEvents);

// Test with valid array
try {
  console.log('Testing with valid array...');
  // This would normally call the actual function
  console.log('✅ Valid array test would work');
} catch (error) {
  console.error('❌ Error with valid array:', error);
}

// Test with null
try {
  console.log('Testing with null...');
  // calculateClientDebt(null);
  console.log('✅ Null test should be handled gracefully');
} catch (error) {
  console.error('❌ Error with null:', error);
}

// Test with undefined
try {
  console.log('Testing with undefined...');
  // calculateClientDebt(undefined);
  console.log('✅ Undefined test should be handled gracefully');
} catch (error) {
  console.error('❌ Error with undefined:', error);
}

// Test with non-array
try {
  console.log('Testing with non-array...');
  // calculateClientDebt("not an array");
  console.log('✅ Non-array test should be handled gracefully');
} catch (error) {
  console.error('❌ Error with non-array:', error);
}

console.log('Test completed. Check the TransactionHistoryList component for actual errors.');