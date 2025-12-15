# 📋 **Documentación de Endpoints - DocumentsController**

> **Nota para LLM**: Documentación completa de endpoints de documentos para usuarios. Los tokens se muestran como `abc123...` y los PDFs en base64 como `JVBERi0x...` para brevedad.

---

## 🔐 **Autenticación Requerida**

Todos los endpoints requieren token JWT en el header:
```
Authorization: Bearer abc123...
```

---

## 🎯 **Endpoints Principales**

### 1. **POST /api/documents/create-with-queue**
**Propósito**: Crear documento con cola secuencial de firmas

#### **Request JSON**:
```json
{
  "nombrePDF": "Contrato_Servicio_2024.pdf",
  "pdfData": "JVBERi0x...",
  "firmantes": [4, 5, 6]
}
```

#### **Campos Request**:
- `nombrePDF` (string, required): Nombre del archivo PDF
- `pdfData` (string, required): PDF completo en base64
- `firmantes` (array[int], required): IDs de usuarios que firmarán (en orden)

#### **Response JSON (201 Created)**:
```json
{
  "document": {
    "id": 123,
    "nombrePDF": "Contrato_Servicio_2024.pdf",
    "creadorId": 2,
    "creadorNombre": "Juan Perez Lopez",
    "queueId": 45,
    "createdAt": "2024-12-03T15:30:00Z",
    "isDeleted": false,
    "hasPdfData": true
  },
  "queue": {
    "queueId": 45,
    "status": "InProgress",
    "currentPosition": 1,
    "totalParticipants": 3,
    "isMyTurn": false,
    "canAddUsers": true,
    "documentName": "Contrato_Servicio_2024.pdf",
    "emisor": "Juan Perez Lopez",
    "emisorId": 2,
    "createdAt": "2024-12-03T15:30:00Z",
    "expiresAt": "2024-12-08T15:30:00Z",
    "participants": [
      {
        "userId": 4,
        "userName": "Ana Garcia",
        "position": 1,
        "status": "Current",
        "isMyTurn": true,
        "signedAt": null
      },
      {
        "userId": 5,
        "userName": "Bella Porche",
        "position": 2,
        "status": "Waiting",
        "isMyTurn": false,
        "signedAt": null
      },
      {
        "userId": 6,
        "userName": "Jeremy Paucar",
        "position": 3,
        "status": "Waiting",
        "isMyTurn": false,
        "signedAt": null
      }
    ]
  },
  "message": "Documento creado exitosamente con cola de firmas."
}
```

#### **Errores Comunes**:
```json
// 400 Bad Request
{
  "message": "Debe especificar al menos un firmante."
}

// 400 Bad Request
{
  "message": "Los datos del PDF no están en formato base64 válido."
}
```

---

### 2. **POST /api/documents/sign-current-turn/{queueId}**
**Propósito**: Firmar cuando es tu turno

#### **URL Parameters**:
- `queueId` (int, required): ID de la cola

#### **Request JSON**:
```json
{
  "signedPdfData": "JVBERi0x..."
}
```

#### **Campos Request**:
- `signedPdfData` (string, required): PDF firmado en base64

#### **Response JSON (200 OK)**:
```json
{
  "queueId": 45,
  "status": "InProgress",
  "currentPosition": 2,
  "totalParticipants": 3,
  "isMyTurn": false,
  "isEmisor": false,
  "documentName": "Contrato_Servicio_2024.pdf",
  "expiresAt": "2024-12-08T15:30:00Z",
  "participants": [
    {
      "userId": 4,
      "userName": "Ana Garcia",
      "position": 1,
      "status": "Signed",
      "isMyTurn": false,
      "signedAt": "2024-12-03T15:45:00Z"
    },
    {
      "userId": 5,
      "userName": "Bella Porche",
      "position": 2,
      "status": "Current",
      "isMyTurn": true,
      "signedAt": null
    },
    {
      "userId": 6,
      "userName": "Jeremy Paucar",
      "position": 3,
      "status": "Waiting",
      "isMyTurn": false,
      "signedAt": null
    }
  ]
}
```

#### **Errores Comunes**:
```json
// 400 Bad Request
{
  "message": "Los datos del PDF firmado son requeridos."
}

// 400 Bad Request
{
  "message": "No es tu turno de firmar o no tienes acceso a esta cola."
}
```

---

### 3. **GET /api/documents/queue-status/{queueId}**
**Propósito**: Ver estado de la cola (vista diferente según rol)

#### **URL Parameters**:
- `queueId` (int, required): ID de la cola

#### **Response JSON - Vista Emisor (200 OK)**:
```json
{
  "queueId": 45,
  "documentId": 123,
  "documentName": "Contrato_Servicio_2024.pdf",
  "status": "InProgress",
  "createdAt": "2024-12-03T15:30:00Z",
  "expiresAt": "2024-12-08T15:30:00Z",
  "isEmitter": true,
  "isMyTurn": false,
  "userStatus": null,
  "peopleWaiting": 2,
  "usersInQueue": [
    {
      "id": 4,
      "nombreCompleto": "Ana Garcia",
      "username": "44444444",
      "email": "ana@example.com",
      "rol": "destinatario",
      "position": 1,
      "estado": "firmado",
      "fechaFirma": "2024-12-03T15:45:00Z",
      "esUsuarioActual": false
    },
    {
      "id": 5,
      "nombreCompleto": "Bella Porche",
      "username": "55555555",
      "email": "bella@example.com",
      "rol": "destinatario",
      "position": 2,
      "estado": "pendiente",
      "fechaFirma": null,
      "esUsuarioActual": false
    }
  ],
  "canAddUsers": true,
  "canSign": false,
  "position": null,
  "totalSigners": 3,
  "allowDynamicAddition": true
}
```

#### **Response JSON - Vista Usuario en Turno (200 OK)**:
```json
{
  "queueId": 45,
  "documentId": 123,
  "documentName": "Contrato_Servicio_2024.pdf",
  "status": "InProgress",
  "createdAt": "2024-12-03T15:30:00Z",
  "expiresAt": "2024-12-08T15:30:00Z",
  "isEmitter": false,
  "isMyTurn": true,
  "userStatus": "pendiente",
  "peopleWaiting": 1,
  "document": {
    "hasPdfData": true,
    "pdfSizeBytes": 1048576,
    "canDownload": true,
    "canSign": true,
    "downloadUrl": "/api/documents/download/123",
    "pdfDataUrl": null
  },
  "canAddUsers": false,
  "canSign": true,
  "position": 2,
  "totalSigners": 3,
  "allowDynamicAddition": true
}
```

#### **Response JSON - Vista Usuario Esperando (200 OK)**:
```json
{
  "queueId": 45,
  "documentId": 123,
  "documentName": "Contrato_Servicio_2024.pdf",
  "status": "InProgress",
  "createdAt": "2024-12-03T15:30:00Z",
  "expiresAt": "2024-12-08T15:30:00Z",
  "isEmitter": false,
  "isMyTurn": false,
  "userStatus": "pendiente",
  "peopleWaiting": 1,
  "canAddUsers": false,
  "canSign": false,
  "position": 3,
  "totalSigners": 3,
  "allowDynamicAddition": true
}
```

---

### 4. **POST /api/documents/add-to-queue/{queueId}**
**Propósito**: Agregar usuarios al final de la cola (solo emisor)

#### **URL Parameters**:
- `queueId` (int, required): ID de la cola

#### **Request JSON**:
```json
{
  "newUsers": [7, 8]
}
```

#### **Campos Request**:
- `newUsers` (array[int], required): IDs de usuarios a agregar

#### **Response JSON (200 OK)**:
```json
{
  "queueId": 45,
  "status": "InProgress",
  "currentPosition": 2,
  "totalParticipants": 5,
  "isMyTurn": false,
  "documentName": "Contrato_Servicio_2024.pdf",
  "expiresAt": "2024-12-08T15:30:00Z",
  "participants": [
    {
      "userId": 4,
      "userName": "Ana Garcia",
      "position": 1,
      "status": "Signed",
      "isMyTurn": false,
      "signedAt": "2024-12-03T15:45:00Z"
    },
    {
      "userId": 5,
      "userName": "Bella Porche",
      "position": 2,
      "status": "Current",
      "isMyTurn": true,
      "signedAt": null
    },
    {
      "userId": 6,
      "userName": "Jeremy Paucar",
      "position": 3,
      "status": "Waiting",
      "isMyTurn": false,
      "signedAt": null
    },
    {
      "userId": 7,
      "userName": "Carlos Rodriguez",
      "position": 4,
      "status": "Waiting",
      "isMyTurn": false,
      "signedAt": null
    },
    {
      "userId": 8,
      "userName": "Maria Fernandez",
      "position": 5,
      "status": "Waiting",
      "isMyTurn": false,
      "signedAt": null
    }
  ]
}
```

---

### 5. **GET /api/documents/download/{id}**
**Propósito**: Descargar PDF del documento

#### **URL Parameters**:
- `id` (int, required): ID del documento

#### **Response (200 OK)**:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Contrato_Servicio_2024.pdf"

[Binary PDF Data]
```

---

### 6. **DELETE /api/documents/{id}**
**Propósito**: Eliminar documento lógicamente

#### **URL Parameters**:
- `id` (int, required): ID del documento

#### **Response JSON (200 OK)**:
```json
{
  "message": "Documento eliminado exitosamente"
}
```

---

## 👁️ **Endpoints de Visibilidad**

### 7. **DELETE /api/documents/hide-from-view/{queueId}**
**Propósito**: Ocultar cola de la vista

#### **URL Parameters**:
- `queueId` (int, required): ID de la cola

#### **Response JSON (200 OK)**:
```json
{
  "message": "Cola ocultada de tu vista."
}
```

---

### 8. **POST /api/documents/show-from-view/{queueId}**
**Propósito**: Mostrar cola oculta

#### **URL Parameters**:
- `queueId` (int, required): ID de la cola

#### **Response JSON (200 OK)**:
```json
{
  "message": "Cola mostrada nuevamente en tu vista."
}
```

---

### 9. **GET /api/documents/hidden-queues**
**Propósito**: Listar colas ocultas

#### **Response JSON (200 OK)**:
```json
{
  "hiddenQueues": [
    {
      "queueId": 45,
      "documentName": "Contrato_Servicio_2024.pdf",
      "documentId": 123,
      "emisor": "Juan Perez Lopez",
      "emisorId": 2,
      "status": "Completed",
      "hiddenAt": "2024-12-03T14:30:00Z",
      "reason": "UserHidden"
    }
  ],
  "totalHidden": 1
}
```

---

### 10. **DELETE /api/documents/queue/{queueId}**
**Propósito**: Cancelar cola (solo emisor)

#### **URL Parameters**:
- `queueId` (int, required): ID de la cola

#### **Response JSON (200 OK)**:
```json
{
  "message": "Cola cancelada exitosamente."
}
```

---

## 📊 **Endpoints de Dashboard**

### 11. **GET /api/documents/queue-dashboard**
**Propósito**: Dashboard principal del usuario

#### **Response JSON (200 OK)**:
```json
{
  "createdQueues": [
    {
      "queueId": 45,
      "documentId": 123,
      "documentName": "Contrato_Servicio_2024.pdf",
      "status": "InProgress",
      "totalParticipants": 3,
      "completionPercentage": 33.33,
      "isActive": true,
      "isEmitter": true,
      "isMyTurn": false,
      "createdAt": "2024-12-03T15:30:00Z",
      "expiresAt": "2024-12-08T15:30:00Z"
    }
  ],
  "signingQueues": [
    {
      "queueId": 47,
      "documentId": 125,
      "documentName": "Factura_Enero.pdf",
      "status": "InProgress",
      "totalParticipants": 2,
      "completionPercentage": 0,
      "isActive": true,
      "isEmitter": false,
      "isMyTurn": true,
      "urgents": true,
      "createdAt": "2024-12-03T14:00:00Z",
      "expiresAt": "2024-12-08T14:00:00Z"
    }
  ],
  "myTurnCount": 1,
  "urgentCount": 1,
  "completedCount": 5
}
```

---

### 12. **GET /api/documents/sent**
**Propósito**: Documentos enviados (vista emisor)

#### **Response JSON (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalCount": 1,
    "documents": [
      {
        "documentId": 123,
        "documentName": "Contrato_Servicio_2024.pdf",
        "createdAt": "2024-12-03T15:30:00Z",
        "status": "InProgress",
        "statusDisplay": "En Progreso",
        "progress": {
          "totalParticipants": 3,
          "signedCount": 1,
          "pendingCount": 2,
          "completionPercentage": 33.33
        },
        "expiration": {
          "expiresAt": "2024-12-08T15:30:00Z",
          "daysUntilExpiration": 4.5,
          "isUrgent": false
        },
        "emisor": {
          "id": 2,
          "name": "Juan Perez Lopez",
          "isCurrentUser": true
        },
        "queueId": 45,
        "allowDynamicAddition": true,
        "signers": [
          {
            "userId": 4,
            "userName": "Ana Garcia",
            "position": 1,
            "status": "Signed",
            "statusDisplay": "Firmado",
            "signedAt": "2024-12-03T15:45:00Z",
            "isCurrentUser": false,
            "isTheirTurn": false
          },
          {
            "userId": 5,
            "userName": "Bella Porche",
            "position": 2,
            "status": "Current",
            "statusDisplay": "Firmando",
            "signedAt": null,
            "isCurrentUser": false,
            "isTheirTurn": true
          }
        ],
        "actions": ["addUsers", "cancel", "download"]
      }
    ],
    "summary": {
      "totalSent": 1,
      "inProgress": 1,
      "completed": 0,
      "expired": 0,
      "cancelled": 0
    }
  }
}
```

---

### 13. **GET /api/documents/received**
**Propósito**: Documentos recibidos (vista firmante)

#### **Response JSON (200 OK)**:
```json
{
  "success": true,
  "data": {
    "totalCount": 2,
    "myTurnCount": 1,
    "completedCount": 0,
    "waitingCount": 1,
    "sections": {
      "myTurn": {
        "title": "Mi Turno",
        "count": 1,
        "documents": [
          {
            "documentId": 125,
            "documentName": "Factura_Enero.pdf",
            "queueId": 47,
            "emisor": {
              "id": 1,
              "name": "Maria Gonzalez",
              "isCurrentUser": false
            },
            "receivedAt": "2024-12-03T14:00:00Z",
            "signedAt": null,
            "expiresAt": "2024-12-08T14:00:00Z",
            "daysUntilExpiration": 4.5,
            "isUrgent": false,
            "urgencyMessage": "Tienes 4 días para firmar",
            "position": 1,
            "totalSigners": 2,
            "userStatus": {
              "status": "Current",
              "statusDisplay": "Es tu turno",
              "isMyTurn": true,
              "callToAction": "Firmar ahora",
              "priority": "Normal"
            },
            "actions": ["download", "sign", "hide"],
            "estimatedTurnDate": "Ahora"
          }
        ]
      },
      "waiting": {
        "title": "En Espera",
        "count": 1,
        "documents": [
          {
            "documentId": 126,
            "documentName": "Contrato_Proyecto.pdf",
            "queueId": 48,
            "emisor": {
              "id": 3,
              "name": "Pedro Jimenez",
              "isCurrentUser": false
            },
            "position": 3,
            "totalSigners": 3,
            "userStatus": {
              "status": "Waiting",
              "statusDisplay": "Esperando turno",
              "isMyTurn": false,
              "callToAction": "Espera tu turno",
              "priority": "Low"
            },
            "actions": ["hide"]
          }
        ]
      },
      "completed": {
        "title": "Completados",
        "count": 0,
        "documents": []
      }
    },
    "summary": {
      "totalReceived": 2,
      "myTurn": 1,
      "completed": 0,
      "waiting": 1,
      "urgentCount": 0
    }
  }
}
```

---

## 🔄 **Validaciones y Manejo de Errores**

### **Validaciones Comunes**:
1. **Autenticación**: Token JWT válido y requerido en todos los endpoints
2. **Usuario Activo**: Verifica que el usuario exista y no esté eliminado
3. **Permisos**: Valida si el usuario es emisor o firmante según la operación
4. **Estado de Cola**: Verifica que la cola esté en estado "InProgress"
5. **Formato Base64**: Valida que los datos PDF sean base64 válidos

### **Códigos de Error**:
- **200 OK**: Operación exitosa
- **201 Created**: Recurso creado exitosamente
- **400 Bad Request**: Datos inválidos o faltantes
- **401 Unauthorized**: No autenticado o token inválido
- **403 Forbidden**: No tiene permisos para la operación
- **404 Not Found**: Recurso no encontrado
- **500 Internal Server Error**: Error interno del servidor

### **Estructura de Error**:
```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "": ["Mensaje de error específico"]
  }
}
```

---

## 📝 **Notas para LLM**

1. **Flujo de Firma**: Los usuarios firman en orden secuencial, solo uno a la vez
2. **Visibilidad por Rol**: Los emisores ven todo, los firmantes solo ven su turno
3. **Expiración**: Las colas expiran en 5 días sin actividad, se renuevan con cada firma
4. **PDF Único**: Solo hay un PDF que se actualiza con cada firma
5. **Tokens**: Todos los endpoints requieren `Authorization: Bearer <token>` con access token
6. **Base64**: Los PDFs se envían como strings en base64, no como archivos
7. **IDs numéricos**: Todos los IDs son enteros (queueId, documentId, userId)
8. **Timestamps**: Las fechas usan formato ISO 8601 UTC

---

## 🔍 **Estructura de Datos Clave**

### **Estados de Cola**:
- `InProgress`: Firmando activamente
- `Completed`: Todos firmaron
- `Expired`: 5 días sin actividad
- `Cancelled`: Cancelado por emisor

### **Estados de Usuario**:
- `Waiting`: Esperando turno
- `Current`: Es su turno
- `Signed`: Ya firmó
- `Skipped`: Omitido (raro)

### **Prioridades**:
- `High`: Expira en 24h o menos
- `Normal`: Tiempo normal
- `Low`: Mucho tiempo restante

### **Acciones Disponibles**:
- `download`: Descargar PDF
- `sign`: Firmar documento
- `addUsers`: Agregar más firmantes
- `cancel`: Cancelar cola
- `hide`: Ocultar de vista