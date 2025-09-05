# Requirements Document

## Introduction

Esta aplicación está diseñada para ayudar a microempresas a llevar un control eficiente de las deudas de sus clientes. La aplicación permite la gestión colaborativa de empresas, el seguimiento de productos, la administración de clientes y el registro detallado de transacciones (ventas y pagos). El sistema incluye autenticación, notificaciones push, y una interfaz intuitiva optimizada para uso móvil con navegación desde la parte inferior.

## Requirements

### Requirement 1

**User Story:** Como usuario nuevo, quiero autenticarme en la aplicación para acceder a las funcionalidades del sistema.

#### Acceptance Criteria

1. WHEN el usuario abre la aplicación por primera vez THEN el sistema SHALL mostrar una pantalla de autenticación
2. WHEN el usuario se autentica exitosamente THEN el sistema SHALL verificar si tiene empresas asociadas
3. IF el usuario no tiene empresas asociadas THEN el sistema SHALL mostrar opciones para crear o buscar una empresa

### Requirement 2

**User Story:** Como usuario autenticado, quiero crear una nueva empresa para comenzar a gestionar mis clientes y productos.

#### Acceptance Criteria

1. WHEN el usuario selecciona "crear empresa" THEN el sistema SHALL mostrar un formulario de creación de empresa
2. WHEN el usuario completa y envía el formulario THEN el sistema SHALL crear la empresa y asignar al usuario como propietario
3. WHEN la empresa es creada exitosamente THEN el sistema SHALL redirigir al usuario a la aplicación principal con 3 tabs

### Requirement 3

**User Story:** Como usuario autenticado, quiero buscar y unirme a una empresa existente para colaborar en la gestión de deudas.

#### Acceptance Criteria

1. WHEN el usuario selecciona "buscar empresa" THEN el sistema SHALL mostrar una interfaz de búsqueda
2. WHEN el usuario encuentra y selecciona una empresa THEN el sistema SHALL enviar una notificación push al propietario de la empresa
3. WHEN el propietario acepta la solicitud THEN el sistema SHALL agregar al usuario a la empresa
4. WHEN el propietario rechaza la solicitud THEN el sistema SHALL notificar al usuario solicitante

### Requirement 4

**User Story:** Como propietario de empresa, quiero gestionar los productos que vendo para tener un catálogo organizado.

#### Acceptance Criteria

1. WHEN el usuario accede al tab de configuración THEN el sistema SHALL mostrar la lista de productos actual
2. WHEN el usuario agrega un nuevo producto THEN el sistema SHALL permitir definir nombre, costo, ganancia y color de fondo
3. WHEN el usuario reordena productos THEN el sistema SHALL actualizar las posiciones y mantener el orden en toda la aplicación
4. WHEN el usuario edita un producto THEN el sistema SHALL actualizar la información y reflejar los cambios en transacciones futuras

### Requirement 5

**User Story:** Como propietario de empresa, quiero gestionar las personas de mi organización para controlar el acceso.

#### Acceptance Criteria

1. WHEN el usuario accede a la gestión de personas THEN el sistema SHALL mostrar todos los miembros de la empresa
2. WHEN el propietario selecciona eliminar un miembro THEN el sistema SHALL remover el acceso del usuario a la empresa
3. WHEN un miembro no propietario intenta eliminar otro miembro THEN el sistema SHALL denegar la acción

### Requirement 6

**User Story:** Como usuario de la empresa, quiero gestionar una lista de clientes para organizar mis relaciones comerciales.

#### Acceptance Criteria

1. WHEN el usuario accede al tab de clientes THEN el sistema SHALL mostrar todos los clientes en formato de cuadros
2. WHEN el usuario busca un cliente THEN el sistema SHALL filtrar la lista en tiempo real
3. WHEN el usuario oculta un cliente THEN el sistema SHALL removerlo de la vista principal pero mantener sus datos
4. WHEN el usuario crea un nuevo cliente THEN el sistema SHALL requerir nombre, dirección, teléfono y permitir notas opcionales y fecha importante
5. IF el usuario no especifica mostrar clientes ocultos THEN el sistema SHALL mostrar solo clientes activos

### Requirement 7

**User Story:** Como usuario, quiero ver el historial de transacciones de un cliente para entender el estado de su cuenta.

#### Acceptance Criteria

1. WHEN el usuario selecciona un cliente THEN el sistema SHALL cargar automáticamente el tab de historial
2. WHEN se muestra el historial THEN el sistema SHALL organizar las transacciones de más nueva a más vieja por fecha
3. WHEN se muestra una transacción de producto THEN el sistema SHALL mostrar el color de fondo del tipo de producto
4. WHEN se muestra una transacción THEN el sistema SHALL mostrar producto (izquierda), deuda acumulada (derecha), valor x cantidad y precio total
5. WHEN la cuenta llega a cero THEN el sistema SHALL mostrar un separador visual "cuenta en 0"

### Requirement 8

**User Story:** Como usuario, quiero registrar eventos de pago para actualizar el estado de deuda de un cliente.

#### Acceptance Criteria

1. WHEN un cliente paga exactamente su deuda THEN el sistema SHALL mostrar el evento de pago y el separador "cuenta en 0"
2. WHEN un cliente paga más de su deuda THEN el sistema SHALL dividir visualmente el pago: primero hasta cero, separador, luego saldo a favor
3. WHEN se registra un pago THEN el sistema SHALL usar color verde #279D2E para el cuadro del evento
4. WHEN se calcula saldo a favor THEN el sistema SHALL mantener el registro real del pago completo en la base de datos

### Requirement 9

**User Story:** Como usuario, quiero crear nuevos eventos de transacción para registrar ventas y pagos.

#### Acceptance Criteria

1. WHEN el usuario crea un nuevo evento THEN el sistema SHALL mostrar un modal con tabs "bajar producto" y "cobrar"
2. WHEN el usuario selecciona "bajar producto" THEN el sistema SHALL mostrar campos: producto, cantidad, costo por unidad, ganancia por unidad, fecha y notas opcionales
3. WHEN el usuario selecciona un producto THEN el sistema SHALL autocompletar costo y ganancia con los últimos valores usados
4. WHEN el usuario selecciona "cobrar" THEN el sistema SHALL mostrar campos: valor de dinero y fecha (por defecto hoy)
5. WHEN se calcula el total THEN el sistema SHALL mostrar cantidad x (costo + ganancia)

### Requirement 10

**User Story:** Como usuario, quiero editar y gestionar eventos existentes para corregir errores o agregar información.

#### Acceptance Criteria

1. WHEN se muestra un cuadro de evento THEN el sistema SHALL mostrar botón de editar
2. WHEN el evento tiene notas THEN el sistema SHALL mostrar icono de notas
3. WHEN el usuario edita un evento THEN el sistema SHALL permitir modificar todos los campos y opción de eliminar
4. WHEN el usuario elimina un evento THEN el sistema SHALL actualizar automáticamente los cálculos de deuda acumulada

### Requirement 11

**User Story:** Como usuario, quiero una interfaz estética y fácil de usar desde la parte inferior para una mejor experiencia móvil.

#### Acceptance Criteria

1. WHEN se muestra la interfaz THEN el sistema SHALL usar los colores especificados: gradiente #26b4bd a #3daa35, botones #3c3c3b, fondo #ebebeb, acentos #25B4BD
2. WHEN el usuario navega THEN el sistema SHALL priorizar controles accesibles desde la parte inferior de la pantalla
3. WHEN se muestran elementos visuales THEN el sistema SHALL aplicar degradados sutiles para mejorar la estética
4. WHEN se diseñan los cuadros THEN el sistema SHALL mantener consistencia visual y facilidad de lectura