/**
 * Script de prueba específico para la creación de clientes
 * Prueba diferentes escenarios de datos de cliente
 */

const { ClientService } = require('./services/ClientService');

async function testClientCreationScenarios() {
  console.log('🧪 Probando diferentes escenarios de creación de clientes...\n');
  
  const clientService = new ClientService('test-empresa-123');
  
  // Escenario 1: Cliente básico (solo campos requeridos)
  console.log('📝 Escenario 1: Cliente básico');
  try {
    const basicClient = {
      nombre: 'Cliente Básico',
      direccion: 'Calle Test 123',
      telefono: '555-0001',
      oculto: false
    };
    
    const result1 = await clientService.createClient(basicClient);
    console.log(result1.success ? '✅ Cliente básico creado' : '❌ Error:', result1.errors);
  } catch (error) {
    console.log('❌ Error en cliente básico:', error.message);
  }
  
  console.log('');
  
  // Escenario 2: Cliente con notas
  console.log('📝 Escenario 2: Cliente con notas');
  try {
    const clientWithNotes = {
      nombre: 'Cliente con Notas',
      direccion: 'Calle Test 456',
      telefono: '555-0002',
      oculto: false,
      notas: 'Este cliente tiene notas importantes'
    };
    
    const result2 = await clientService.createClient(clientWithNotes);
    console.log(result2.success ? '✅ Cliente con notas creado' : '❌ Error:', result2.errors);
  } catch (error) {
    console.log('❌ Error en cliente con notas:', error.message);
  }
  
  console.log('');
  
  // Escenario 3: Cliente con campos undefined (el problema original)
  console.log('📝 Escenario 3: Cliente con campos undefined');
  try {
    const clientWithUndefined = {
      nombre: 'Cliente con Undefined',
      direccion: 'Calle Test 789',
      telefono: '555-0003',
      oculto: false,
      notas: undefined,
      fechaImportante: undefined
    };
    
    const result3 = await clientService.createClient(clientWithUndefined);
    console.log(result3.success ? '✅ Cliente con undefined creado' : '❌ Error:', result3.errors);
  } catch (error) {
    console.log('❌ Error en cliente con undefined:', error.message);
  }
  
  console.log('');
  
  // Escenario 4: Cliente con campos vacíos
  console.log('📝 Escenario 4: Cliente con campos vacíos');
  try {
    const clientWithEmpty = {
      nombre: 'Cliente con Vacíos',
      direccion: '',
      telefono: '555-0004',
      oculto: false,
      notas: '',
      fechaImportante: null
    };
    
    const result4 = await clientService.createClient(clientWithEmpty);
    console.log(result4.success ? '✅ Cliente con vacíos creado' : '❌ Error:', result4.errors);
  } catch (error) {
    console.log('❌ Error en cliente con vacíos:', error.message);
  }
  
  console.log('\n🎯 Pruebas completadas. Si todos los escenarios pasaron, el problema está solucionado.');
}

// Ejecutar las pruebas si el script se ejecuta directamente
if (require.main === module) {
  testClientCreationScenarios().catch(console.error);
}

module.exports = { testClientCreationScenarios };