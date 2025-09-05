/**
 * Script de prueba para verificar que la creación de productos y clientes funciona
 * después de remover el logging problemático
 */

const { ProductService } = require('./services/ProductService');
const { ClientService } = require('./services/ClientService');

async function testProductCreation() {
  console.log('🧪 Probando creación de productos...');
  
  try {
    const productService = ProductService.getInstance();
    await productService.initialize();
    
    const testProduct = {
      nombre: 'Producto de Prueba',
      ultimoCosto: 100,
      ultimaGanancia: 50,
      colorFondo: '#FF5733',
      posicion: 0,
      activo: true
    };
    
    const result = await productService.createProduct('test-empresa-123', testProduct);
    
    if (result.success) {
      console.log('✅ Producto creado exitosamente:', result.data);
      return true;
    } else {
      console.error('❌ Error creando producto:', result.errors);
      return false;
    }
  } catch (error) {
    console.error('❌ Error en prueba de producto:', error.message);
    return false;
  }
}

async function testClientCreation() {
  console.log('🧪 Probando creación de clientes...');
  
  try {
    const clientService = new ClientService('test-empresa-123');
    
    const testClient = {
      nombre: 'Cliente de Prueba',
      direccion: 'Calle Falsa 123',
      telefono: '555-0123',
      oculto: false,
      notas: 'Cliente de prueba para verificar funcionalidad'
    };
    
    const result = await clientService.createClient(testClient);
    
    if (result.success) {
      console.log('✅ Cliente creado exitosamente:', result.data);
      return true;
    } else {
      console.error('❌ Error creando cliente:', result.errors);
      return false;
    }
  } catch (error) {
    console.error('❌ Error en prueba de cliente:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de creación...\n');
  
  const productTest = await testProductCreation();
  console.log('');
  const clientTest = await testClientCreation();
  
  console.log('\n📊 Resultados:');
  console.log(`Productos: ${productTest ? '✅ FUNCIONA' : '❌ FALLA'}`);
  console.log(`Clientes: ${clientTest ? '✅ FUNCIONA' : '❌ FALLA'}`);
  
  if (productTest && clientTest) {
    console.log('\n🎉 ¡Todas las pruebas pasaron! Ya puedes crear productos y clientes.');
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.');
  }
}

// Ejecutar las pruebas si el script se ejecuta directamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testProductCreation, testClientCreation, runTests };