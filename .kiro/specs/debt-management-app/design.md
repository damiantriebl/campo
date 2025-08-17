# Design Document

## Overview

La aplicación de gestión de deudas para microempresas está construida sobre React Native con Expo, utilizando Firebase como backend. El diseño sigue una arquitectura modular con navegación por tabs, gestión de estado centralizada y una interfaz optimizada para dispositivos móviles.

La aplicación maneja tres flujos principales:
1. **Autenticación y gestión de empresas** - Permite a los usuarios crear o unirse a empresas
2. **Gestión de datos maestros** - Configuración de productos y miembros de la organización  
3. **Operaciones transaccionales** - Gestión de clientes, ventas y pagos

## Architecture

### Technology Stack
- **Frontend**: React Native con Expo Router para navegación
- **Backend**: Firebase (Firestore para base de datos, Auth para autenticación, Cloud Messaging para notificaciones)
- **State Management**: React Context API con hooks personalizados
- **UI Framework**: React Native con componentes personalizados
- **Navigation**: Expo Router con stack y tab navigation

### Application Structure
```
app/
├── (auth)/          # Pantallas de autenticación
├── (company)/       # Gestión de empresas
├── (tabs)/          # Aplicación principal con tabs
│   ├── config/      # Configuración (productos, miembros)
│   ├── clients/     # Gestión de clientes
│   └── history/     # Historial de transacciones
└── _layout.tsx      # Layout principal con navegación condicional
```

### Data Flow
1. **AuthProvider** maneja el estado de autenticación y empresas
2. **Conditional Navigation** redirige según el estado del usuario
3. **Context Providers** específicos para cada módulo (productos, clientes, eventos)
4. **Real-time Updates** mediante listeners de Firestore

## Components and Interfaces

### Core Components

#### AuthProvider
- Maneja autenticación con Firebase Auth
- Gestiona membresías de empresas del usuario
- Proporciona métodos de login/logout/registro
- Controla navegación condicional basada en estado

#### CompanyManager
- Creación de nuevas empresas
- Búsqueda y solicitud de unión a empresas existentes
- Gestión de notificaciones push para solicitudes de membresía
- Validación de permisos de propietario

#### ProductManager
- CRUD de productos con persistencia local de precios
- Reordenamiento drag-and-drop de productos
- Gestión de colores por categoría de producto
- Cache de últimos precios utilizados por producto

#### ClientManager
- CRUD de clientes con campos requeridos y opcionales
- Funcionalidad de búsqueda y filtrado en tiempo real
- Sistema de ocultación/mostrar clientes
- Integración con WhatsApp para comunicación

#### TransactionManager
- Creación de eventos de venta y pago
- Cálculo automático de deudas acumuladas
- Visualización de historial con separadores de estado
- Lógica de división de pagos (saldo a favor)

### Interface Definitions

#### Company Interface
```typescript
interface Company {
  id: string;
  nombre: string;
  propietario: string;
  miembros: CompanyMember[];
  productos: Product[];
  creado: Timestamp;
}

interface CompanyMember {
  userId: string;
  email: string;
  role: 'owner' | 'member';
  fechaIngreso: Timestamp;
}
```

#### Product Interface
```typescript
interface Product {
  id: string;
  nombre: string;
  colorFondo: string;
  posicion: number;
  ultimoCosto?: number;
  ultimaGanancia?: number;
  activo: boolean;
}
```

#### Enhanced Client Interface
```typescript
interface Client {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string; // WhatsApp
  notas?: string;
  fechaImportante?: Timestamp;
  oculto: boolean;
  deudaActual: number;
  ultimaTransaccion?: Timestamp;
  creado: Timestamp;
}
```

#### Enhanced Event Interface
```typescript
interface TransactionEvent {
  id: string;
  clienteId: string;
  tipo: 'venta' | 'pago';
  fecha: Timestamp;
  notas?: string;
  
  // Para ventas
  producto?: string;
  productoColor?: string;
  cantidad?: number;
  costoUnitario?: number;
  gananciaUnitaria?: number;
  totalVenta?: number;
  
  // Para pagos
  montoPago?: number;
  
  // Metadata
  creado: Timestamp;
  editado?: Timestamp;
  borrado: boolean;
}
```

## Data Models

### Firestore Collections Structure

```
/empresas/{empresaId}
  - nombre: string
  - propietario: string
  - creado: Timestamp
  
  /miembros/{userId}
    - email: string
    - role: 'owner' | 'member'
    - fechaIngreso: Timestamp
  
  /productos/{productoId}
    - nombre: string
    - colorFondo: string
    - posicion: number
    - activo: boolean
  
  /clientes/{clienteId}
    - nombre: string
    - direccion: string
    - telefono: string
    - notas?: string
    - fechaImportante?: Timestamp
    - oculto: boolean
    - creado: Timestamp
  
  /eventos/{eventoId}
    - clienteId: string
    - tipo: 'venta' | 'pago'
    - fecha: Timestamp
    - [campos específicos según tipo]
    - creado: Timestamp
    - borrado: boolean

/usuarios/{userId}
  - email: string
  - creado: Timestamp
  
  /empresas/{empresaId}
    - role: 'owner' | 'member'
    - fechaIngreso: Timestamp

/solicitudes/{solicitudId}
  - empresaId: string
  - solicitanteId: string
  - solicitanteEmail: string
  - estado: 'pendiente' | 'aceptada' | 'rechazada'
  - creado: Timestamp
```

### Local Storage (AsyncStorage)
```typescript
// Cache de precios por producto
interface ProductPriceCache {
  [productId: string]: {
    ultimoCosto: number;
    ultimaGanancia: number;
    fechaActualizacion: Timestamp;
  }
}

// Configuración de UI
interface UISettings {
  mostrarClientesOcultos: boolean;
  ordenClientes: 'nombre' | 'deuda' | 'ultimaTransaccion';
  temaOscuro: boolean;
}
```

## Error Handling

### Network Error Handling
- **Offline Support**: Cache local de datos críticos con sincronización automática
- **Retry Logic**: Reintentos automáticos para operaciones fallidas
- **User Feedback**: Indicadores visuales de estado de conexión y sincronización

### Validation Error Handling
- **Client-side Validation**: Validación inmediata en formularios
- **Server-side Validation**: Validación en reglas de Firestore Security Rules
- **Error Messages**: Mensajes de error contextuales y accionables

### Business Logic Error Handling
- **Transaction Integrity**: Validación de consistencia en cálculos de deuda
- **Permission Errors**: Manejo de errores de permisos con mensajes claros
- **Data Conflicts**: Resolución de conflictos en ediciones concurrentes

### Error Recovery Strategies
```typescript
interface ErrorRecoveryStrategy {
  networkError: () => void; // Mostrar modo offline, cache local
  validationError: (field: string, message: string) => void; // Highlight campo, mostrar mensaje
  permissionError: () => void; // Redirigir a pantalla apropiada
  dataConflict: () => void; // Mostrar dialog de resolución de conflicto
}
```

## Testing Strategy

### Unit Testing
- **Components**: Testing de componentes individuales con React Native Testing Library
- **Business Logic**: Testing de funciones de cálculo y validación
- **Hooks**: Testing de custom hooks con renderHook
- **Utils**: Testing de funciones utilitarias y helpers

### Integration Testing
- **Navigation Flow**: Testing de flujos de navegación completos
- **Firebase Integration**: Testing de operaciones CRUD con Firebase emulator
- **State Management**: Testing de Context providers y state updates
- **Form Validation**: Testing de validación de formularios end-to-end

### E2E Testing
- **User Journeys**: Testing de flujos completos de usuario
- **Cross-platform**: Testing en iOS y Android
- **Performance**: Testing de rendimiento en dispositivos de gama baja
- **Offline Scenarios**: Testing de funcionalidad offline

### Testing Tools
- **Jest**: Framework de testing principal
- **React Native Testing Library**: Testing de componentes
- **Firebase Emulator**: Testing de integración con Firebase
- **Detox**: E2E testing para React Native
- **Flipper**: Debugging y profiling

### Test Coverage Goals
- **Unit Tests**: 90% coverage en business logic
- **Integration Tests**: Cobertura de todos los flujos críticos
- **E2E Tests**: Cobertura de user journeys principales
- **Performance Tests**: Benchmarks para operaciones críticas

## UI/UX Design Specifications

### Color Palette
```css
/* Gradientes principales */
background: linear-gradient(270deg, #26b4bd, #3daa35);

/* Colores sólidos */
--primary-accent: #25B4BD;
--button-primary: #3c3c3b;
--background-light: rgb(235, 235, 235);
--success-green: #279D2E;
--text-primary: #333333;
--text-secondary: #666666;
```

### Layout Principles
- **Bottom-First Design**: Controles principales accesibles desde la parte inferior
- **Thumb-Friendly**: Elementos interactivos en zona de alcance del pulgar
- **Visual Hierarchy**: Uso de colores y tamaños para guiar la atención
- **Consistent Spacing**: Sistema de espaciado basado en múltiplos de 8px

### Component Design Patterns
- **Card-Based Layout**: Información organizada en tarjetas visuales
- **Color-Coded Categories**: Productos identificados por color de fondo
- **Progressive Disclosure**: Información detallada disponible bajo demanda
- **Contextual Actions**: Acciones disponibles según el contexto actual

### Responsive Design
- **Adaptive Layout**: Ajuste automático a diferentes tamaños de pantalla
- **Touch Targets**: Mínimo 44px para elementos interactivos
- **Safe Areas**: Respeto por notches y áreas seguras del dispositivo
- **Orientation Support**: Funcionalidad completa en portrait y landscape