# Requirements Document

## Introduction

La aplicación actualmente tiene una estructura de base de datos donde las empresas no incluyen su nombre en el documento principal y los productos están almacenados como una colección separada. Se necesita reestructurar la base de datos para que:

1. El nombre de la empresa esté incluido en el documento de la empresa
2. Los productos estén organizados como una subcolección dentro de cada empresa con campos específicos
3. Mantener la compatibilidad con los datos existentes durante la migración

## Requirements

### Requirement 1

**User Story:** Como administrador del sistema, quiero que el nombre de la empresa esté incluido en el documento principal de la empresa, para que la información esté completa y accesible directamente.

#### Acceptance Criteria

1. WHEN se consulte un documento de empresa THEN el sistema SHALL incluir el campo 'nombre' en el documento principal
2. WHEN se cree una nueva empresa THEN el sistema SHALL almacenar el nombre en el documento de la empresa
3. WHEN se actualice una empresa existente THEN el sistema SHALL permitir modificar el campo nombre

### Requirement 2

**User Story:** Como desarrollador, quiero que los productos estén organizados como subcolección de cada empresa con campos específicos, para que la estructura de datos sea más coherente y eficiente.

#### Acceptance Criteria

1. WHEN se acceda a los productos de una empresa THEN el sistema SHALL obtenerlos de la subcolección 'productos' dentro del documento de la empresa
2. WHEN se cree un producto THEN el sistema SHALL almacenarlo con los campos: color, nombre, índice (posición), costo unitario y ganancia
3. WHEN se consulten productos THEN el sistema SHALL retornar todos los campos requeridos: colorFondo, nombre, posicion, ultimoCosto, ultimaGanancia
4. WHEN se ordenen productos THEN el sistema SHALL usar el campo 'posicion' (índice) para el ordenamiento

### Requirement 3

**User Story:** Como usuario del sistema, quiero que la migración de datos existentes sea transparente, para que no se pierda información durante la reestructuración.

#### Acceptance Criteria

1. WHEN se ejecute la migración THEN el sistema SHALL preservar todos los datos existentes de empresas
2. WHEN se migre una empresa THEN el sistema SHALL agregar el campo 'nombre' si no existe
3. WHEN se migren productos THEN el sistema SHALL mantener todos los campos existentes y agregar los faltantes con valores por defecto
4. WHEN se complete la migración THEN el sistema SHALL validar que todos los datos estén correctamente estructurados

### Requirement 4

**User Story:** Como desarrollador, quiero actualizar los servicios y utilidades para usar la nueva estructura, para que la aplicación funcione correctamente con los cambios.

#### Acceptance Criteria

1. WHEN se actualicen los tipos TypeScript THEN el sistema SHALL reflejar la nueva estructura de datos
2. WHEN se modifiquen las utilidades de Firestore THEN el sistema SHALL usar las nuevas rutas y campos
3. WHEN se actualicen los servicios THEN el sistema SHALL manejar correctamente la nueva estructura
4. WHEN se ejecuten las operaciones CRUD THEN el sistema SHALL funcionar con la estructura reestructurada

### Requirement 5

**User Story:** Como usuario, quiero que la interfaz de usuario continúe funcionando normalmente después de la reestructuración, para que no haya interrupciones en el uso de la aplicación.

#### Acceptance Criteria

1. WHEN se carguen las empresas THEN la interfaz SHALL mostrar correctamente el nombre de la empresa
2. WHEN se gestionen productos THEN la interfaz SHALL usar los nuevos campos de la subcolección
3. WHEN se realicen operaciones de creación/edición THEN la interfaz SHALL funcionar con la nueva estructura
4. WHEN se muestren listas de productos THEN la interfaz SHALL ordenar correctamente usando el campo 'posicion'