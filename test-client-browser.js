/**
 * Script para probar la creación de clientes en la consola del navegador
 * Copia y pega este código en la consola del navegador cuando estés en la aplicación
 */

// Función para probar la creación de un cliente
async function testClientCreation() {
  console.log('🧪 Probando creación de cliente...');
  
  try {
    // Importar el servicio (ajusta la ruta según sea necesario)
    const { ClientService } = await import('./services/ClientService');
    
    const clientService = new ClientService('test-empresa-123');
    
    const testClient = {
      nombre: 'Cliente de Prueba Browser',
      direccion: 'Calle Test 123',
      telefono: '555-0123',
      oculto: false
      // Nota: NO incluimos notas ni fechaImportante para evitar undefined
    };
    
    console.log('📤 Enviando datos del cliente:', testClient);
    
    const result = await clientService.createClient(testClient);
    
    if (result.success) {
      console.log('✅ Cliente creado exitosamente!', result.data);
      return true;
    } else {
      console.error('❌ Error creando cliente:', result.errors);
      return false;
    }
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    return false;
  }
}

// Función para probar con datos que incluyen campos opcionales
async function testClientWithOptionalFields() {
  console.log('🧪 Probando cliente con campos opcionales...');
  
  try {
    const { ClientService } = await import('./services/ClientService');
    const { Timestamp } = await import('firebase/firestore');
    
    const clientService = new ClientService('test-empresa-123');
    
    const testClient = {
      nombre: 'Cliente Completo',
      direccion: 'Calle Completa 456',
      telefono: '555-0456',
      oculto: false,
      notas: 'Este cliente tiene notas',
      fechaImportante: Timestamp.now()
    };
    
    console.log('📤 Enviando datos completos del cliente:', testClient);
    
    const result = await clientService.createClient(testClient);
    
    if (result.success) {
      console.log('✅ Cliente completo creado exitosamente!', result.data);
      return true;
    } else {
      console.error('❌ Error creando cliente completo:', result.errors);
      return false;
    }
  } catch (error) {
    console.error('❌ Error en la prueba completa:', error);
    return false;
  }
}

// Ejecutar ambas pruebas
async function runAllTests() {
  console.log('🚀 Iniciando pruebas de creación de clientes...\n');
  
  const test1 = await testClientCreation();
  console.log('');
  const test2 = await testClientWithOptionalFields();
  
  console.log('\n📊 Resultados:');
  console.log(`Cliente básico: ${test1 ? '✅ FUNCIONA' : '❌ FALLA'}`);
  console.log(`Cliente completo: ${test2 ? '✅ FUNCIONA' : '❌ FALLA'}`);
  
  if (test1 && test2) {
    console.log('\n🎉 ¡Todas las pruebas pasaron! La creación de clientes funciona correctamente.');
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.');
  }
}

// Exponer las funciones globalmente para uso en consola
window.testClientCreation = testClientCreation;
window.testClientWithOptionalFields = testClientWithOptionalFields;
window.runAllClientTests = runAllTests;

console.log('🛠️  Funciones de prueba disponibles:');
console.log('- testClientCreation()');
console.log('- testClientWithOptionalFields()');
console.log('- runAllClientTests()');
console.log('\n💡 Ejecuta runAllClientTests() para probar todo');