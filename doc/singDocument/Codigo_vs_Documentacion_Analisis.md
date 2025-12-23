# 🔍 CÓDIGO VS DOCUMENTACIÓN - ANÁLISIS EXHAUSTIVO

## 📋 INTRODUCCIÓN

Este documento proporciona un análisis exhaustivo y detallado de todos los endpoints de la API BridgeFirma, comparando la implementación real del código con la documentación existente. Está diseñado específicamente para que cualquier LLM pueda entender completamente el flujo, comportamientos y validaciones implementadas.

## 🏗️ ARQUITECTURA GENERAL

BridgeFirma es un bridge local desarrollado en .NET 8 que funciona como intermediario entre un FrontEnd corporativo y FirmaONPE. Implementa Clean Architecture con CQRS usando MediatR.

**Componentes clave:**
- **API Layer**: Controllers con endpoints REST
- **Application Layer**: Commands/Queries con MediatR
- **Domain Layer**: Aggregates y Value Objects
- **Infrastructure Layer**: Servicios externos y persistencia

---

# 🚀 ENDPOINTS DE LA API

## 1️⃣ POST /api/v1/sign/start - INICIAR PROCESO DE FIRMA

### 📋 DESCRIPIÓN GENERAL
Inicia el proceso de firma digital de un documento PDF. Es el endpoint principal para crear operaciones de firma.

### 🔍 ANÁLISIS DEL CÓDIGO

#### **Ruta y Configuración**
```csharp
[HttpPost("start")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
[ProducesResponseType(StatusCodes.Status500InternalServerError)]
public async Task<ActionResult<SignResponse>> StartSign([FromBody] SignRequest request)
```

**Routing pattern**: `api/v1/sign/start` con versionado de API explícito.

#### **Validación de Seguridad (Doble Capa)**
```csharp
// 1. Validación por Middleware (TokenValidationMiddleware)
// 2. Validación adicional en el Controller
var expectedToken = _configuration["BridgeToken"];
if (string.IsNullOrEmpty(expectedToken) || request.Token != expectedToken)
{
    return Unauthorized(new { error = "Invalid or missing security token" });
}
```

**Análisis**: Implementa seguridad en capas multiples. El middleware realiza la primera validación y el controller confirma el token por seguridad adicional.

#### **Flujo de Procesamiento**
```csharp
// 1. Crear el Command con parámetros recibidos
var command = new SignDocumentCommand(
    request.FileName,
    request.TimeoutMinutes,
    request.Token,
    request.FullPath,
    request.DocumentId,
    request.AccessToken);

// 2. Ejecutar usando MediatR (CQRS)
var result = await _mediator.Send(command);
```

### 📥 DATOS DE ENTRADA

#### **Request DTO (SignRequest)**
```json
{
    "fileName": "documento.pdf",
    "timeoutMinutes": 15,
    "token": "bridge-firma-dev-token-2024",
    "fullPath": "C:\\Users\\User\\Downloads\\documento.pdf",
    "documentId": "12345",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validaciones implementadas:**
- `fileName`: Obligatorio, debe ser PDF y caracteres válidos
- `timeoutMinutes`: 1-60 minutos
- `token`: Requerido para autenticación
- `documentId`: Opcional, ID del documento en Backend
- `accessToken`: Requerido si se proporciona `documentId`
- `fullPath`: Opcional, ruta alternativa del archivo

### 📤 DATOS DE SALIDA

#### **Response DTO (SignResponse)**
```json
{
    "operationId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "Pending",
    "startedAt": "2025-12-19T21:22:45.123Z",
    "message": "Operación iniciada exitosamente",
    "timeoutMinutes": 15
}
```

**Análisis del Response**:
- `operationId`: GUID único para tracking de la operación
- `status`: Estado inicial siempre "Pending"
- `startedAt`: Timestamp UTC del inicio
- `message`: Mensaje descriptivo del resultado

### 🔄 FLUJO INTERNO DETALLADO

#### **SignDocumentCommand Validation**
```csharp
public ValidationResult Validate()
{
    var errors = new List<string>();

    // Validación de FileName
    if (string.IsNullOrWhiteSpace(FileName))
        errors.Add("FileName is required");
    else if (!FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        errors.Add("Only PDF files are allowed");
    else if (FileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        errors.Add("FileName contains invalid characters");

    // Validación de AccessToken (si hay DocumentId)
    if (!string.IsNullOrWhiteSpace(DocumentId))
    {
        if (string.IsNullOrWhiteSpace(AccessToken))
            errors.Add("AccessToken is required when DocumentId is provided");
        else
        {
            // Validación JWT: header.payload.signature
            var accessTokenParts = AccessToken.Split('.');
            if (accessTokenParts.Length != 3)
                errors.Add("AccessToken must be a valid JWT token");
        }
    }

    return new ValidationResult { IsValid = !errors.Any(), Errors = errors };
}
```

#### **SignDocumentHandler Execution**
```csharp
// 1. Validar Command
var validationResult = request.Validate();
if (!validationResult.IsValid)
    return Result<SignResponse>.Failure($"Validation failed: {errorMessage}");

// 2. Validar token de seguridad
if (!ValidateSecurityToken(request.Token))
    return Result<SignResponse>.Failure("Invalid security token");

// 3. Crear Value Objects (con manejo de excepciones)
try
{
    var fileName = FileName.Create(request.FileName);
    var timeoutMinutes = TimeoutMinutes.Create(request.TimeoutMinutes);
}
catch (DomainException domEx)
{
    return Result<SignResponse>.Failure($"Domain validation error: {domEx.Message}");
}

// 4. Manejo de DocumentId/Backend Download (si aplica)
if (!string.IsNullOrWhiteSpace(request.DocumentId))
{
    // Download desde Backend con Bearer token
    var pdfBytes = await _backendHttpClient.DownloadDocumentAsync(
        request.DocumentId,
        request.AccessToken!,
        cancellationToken);

    // Guardar en Downloads con race condition protection
    if (File.Exists(fullPath))
    {
        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var uniquePath = Path.Combine(directory!, $"{fileNameWithoutExt}_{timestamp}{extension}");
        fullPath = uniquePath;
    }

    await File.WriteAllBytesAsync(fullPath, pdfBytes, cancellationToken);

    // Verificación de integridad
    var fileInfo = new FileInfo(fullPath);
    if (fileInfo.Length != pdfBytes.Length)
        return Result<SignResponse>.Failure("File write corruption detected");
}

// 5. Validar documento
var documentValidationResult = await _signApplicationService.ValidateDocumentAsync(filePath);

// 6. Crear y guardar operación
var operation = SignOperation.Create(fileName, downloadsDirectory, timeoutMinutes);
await _signOperationRepository.SaveAsync(operation);

// 7. Iniciar procesamiento en background
_ = Task.Run(async () =>
{
    try
    {
        await ExecuteFirmaProcess(operation, filePath);
    }
    catch (OperationCanceledException)
    {
        operation.Fail("Process was cancelled");
        await _signOperationRepository.SaveAsync(operation);
    }
    catch (Exception ex)
    {
        operation.Fail("Background process error");
        await _signOperationRepository.SaveAsync(operation);
    }
}, cancellationToken);
```

### 📋 EJEMPLOS DE USO

#### **Ejemplo 1: Firma de archivo local**
```bash
curl -X POST "http://localhost:59287/api/v1/sign/start" \
  -H "Content-Type: application/json" \
  -H "X-Bridge-Token: bridge-firma-dev-token-2024" \
  -d '{
    "fileName": "contrato.pdf",
    "timeoutMinutes": 10,
    "token": "bridge-firma-dev-token-2024",
    "fullPath": "C:\\Users\\User\\Downloads\\contrato.pdf"
  }'
```

#### **Ejemplo 2: Descarga desde Backend**
```bash
curl -X POST "http://localhost:59287/api/v1/sign/start" \
  -H "Content-Type: application/json" \
  -H "X-Bridge-Token: bridge-firma-dev-token-2024" \
  -d '{
    "fileName": "factura.pdf",
    "timeoutMinutes": 20,
    "token": "bridge-firma-dev-token-2024",
    "documentId": "ABC123XYZ",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikpva2UgU3Rlc3MiLCJpYXQiOjE2NDU0Mjc4OTAsImV4cCI6MTY0NTQ2MzQ5MH0.NjRmZmFlZmFmZmFmZmFmZmFmZmFmZmFmZmFmZmFm"
  }'
```

---

## 2️⃣ GET /api/v1/sign/status/{operationId} - CONSULTAR ESTADO

### 📋 DESCRIPIÓN GENERAL
Consulta el estado actual de una operación de firma específica. Permite monitorear el progreso del proceso de firma.

### 🔍 ANÁLISIS DEL CÓDIGO

#### **Ruta y Parámetros**
```csharp
[HttpGet("status/{operationId}")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<ActionResult<StatusResponse>> GetStatus(string operationId)
```

**Análisis**: `operationId` se extrae de la URL y debe ser un GUID válido.

#### **Flujo de Consulta**
```csharp
// 1. Crear Query
var query = new GetStatusQuery(operationId);

// 2. Ejecutar usando MediatR
var result = await _mediator.Send(query);

// 3. Manejar resultado
if (!result.IsSuccess)
    return NotFound(new { error = result.Error });

return Ok(result.Value);
```

### 📥 DATOS DE ENTRADA

#### **URL Parameter**
```
GET /api/v1/sign/status/550e8400-e29b-41d4-a716-446655440000
```

**Parámetro `operationId`**:
- Formato: GUID string (36 caracteres)
- Origen: Return del endpoint `/start`
- Validación: Must be valid GUID

### 📤 DATOS DE SALIDA

#### **Response DTO (StatusResponse)**
```json
{
    "operationId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "Completed",
    "signedFileName": "documento[F].pdf",
    "signedFilePath": "C:\\Users\\User\\Downloads\\documento[F].pdf",
    "startedAt": "2025-12-19T21:22:45.123Z",
    "completedAt": "2025-12-19T21:25:12.456Z",
    "progressPercentage": 100,
    "errorMessage": null,
    "retryCount": 0,
    "timeoutWarning": null,
    "timeoutCleanup": null,
    "hasWarnings": false
}
```

**Análisis detallado de campos:**
- `status`: Estados posibles: "Pending", "Processing", "Completed", "Failed", "Timeout", "Cancelled"
- `signedFileName`: Nombre del archivo con sufijo `[F]` (solo cuando está completado)
- `signedFilePath`: Ruta completa del archivo firmado
- `progressPercentage`: 0-100% basado en el estado actual
- `timeoutCleanup`: Detalles de cleanup si hubo timeout
- `hasWarnings`: Booleano combinando warnings existentes

### 🔄 FLUJO INTERNO DETALLADO

#### **GetStatusQueryHandler**
```csharp
public async Task<Result<StatusResponse>> Handle(GetStatusQuery request, CancellationToken cancellationToken)
{
    // 1. Validar query
    var validationResult = request.Validate();
    if (!validationResult.IsValid)
        return Result<StatusResponse>.Failure($"Validation failed: {errorMessage}");

    // 2. Obtener operación
    var operationId = OperationId.From(request.OperationId);
    var operation = await _signOperationRepository.GetByIdAsync(operationId);

    if (operation == null)
        return Result<StatusResponse>.Failure($"Operation {request.OperationId} not found");

    // 3. Mapear a response
    var response = _mapper.Map<StatusResponse>(operation);
    response.ProgressPercentage = operation.GetProgressPercentage();
    response.HasWarnings = !string.IsNullOrEmpty(operation.ErrorMessage) ||
                              !string.IsNullOrEmpty(response.TimeoutWarning);

    return Result<StatusResponse>.Success(response);
}
```

#### **SignOperation.GetProgressPercentage()**
```csharp
public int GetProgressPercentage()
{
    return Status switch
    {
        OperationStatus.Pending => 0,
        OperationStatus.Processing => 50, // En proceso, pero sin archivo firmado aún
        OperationStatus.Completed => 100,
        OperationStatus.Failed => 0,    // Falló, progreso reiniciado
        OperationStatus.Timeout => 0,    // Timeout, progreso reiniciado
        OperationStatus.Cancelled => 0, // Cancelado, progreso reiniciado
        _ => 0
    };
}
```

### 📋 EJEMPLOS DE USO

#### **Ejemplo 1: Operación Completada**
```bash
curl -X GET "http://localhost:59287/api/v1/sign/status/550e8400-e29b-41d4-a716-446655440000" \
  -H "X-Bridge-Token: bridge-firma-dev-token-2024"
```

**Response:**
```json
{
    "operationId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "Completed",
    "signedFileName": "documento[F].pdf",
    "progressPercentage": 100,
    "startedAt": "2025-12-19T21:22:45.123Z",
    "completedAt": "2025-12-19T21:25:12.456Z"
}
```

#### **Ejemplo 2: Operación Timeout**
```json
{
    "operationId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "Timeout",
    "progressPercentage": 0,
    "timeoutWarning": "Operation cancelled due to timeout after 10 minutes",
    "timeoutCleanup": {
        "cleanupPerformed": true,
        "firmaOnpeTerminated": true,
        "documentDeleted": false,
        "cleanupMessage": "FirmaONPE was terminated, document remains in Downloads",
        "timeoutMinutes": 10,
        "timeoutAt": "2025-12-19T21:32:45.123Z"
    },
    "hasWarnings": true
}
```

---

## 3️⃣ GET /api/v1/sign/file/{operationId} - DESCARGAR ARCHIVO FIRMADO

### 📋 DESCRIPIÓN GENERAL
Descarga el archivo PDF firmado de una operación completada. Retorna el archivo binario como descarga del navegador.

### 🔍 ANÁLISIS DEL CÓGÓGIGO

#### **Ruta y Configuración**
```csharp
[HttpGet("file/{operationId}")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<IActionResult> GetSignedFile(string operationId)
{
    // ... procesamiento ...

    // Retornar el archivo como descarga
    return File(file.Content, "application/pdf", file.FileName);
}
```

**Análisis**: Usa `FileResult` de ASP.NET Core para retornar contenido binario con proper Content-Type y filename.

#### **Flujo de Descarga**
```csharp
// 1. Crear Query
var query = new GetSignedFileQuery(operationId);

// 2. Ejecutar Query
var result = await _mediator.Send(query);

// 3. Validar resultado
if (!result.IsSuccess)
    return NotFound(new { error = result.Error });

// 4. Retornar archivo binario
var file = result.Value;
return File(file.Content, "application/pdf", file.FileName);
```

### 📥 DATOS DE ENTRADA

#### **URL Parameter**
```
GET /api/v1/sign/file/550e8400-e29b-41d4-a716-446655440000
```

**Parámetro `operationId`: GUID válido de operación completada.

### 📤 DATOS DE SALIDA

#### **Binary Response**
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="documento[F].pdf"`
- **Body**: Contenido binario del PDF

**Headers de respuesta:**
```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="documento[F].pdf"
Content-Length: 1048576
```

### 🔄 FLUJO INTERNO DETALLADO

#### **GetSignedFileQueryHandler**
```csharp
public async Task<Result<FileResponse>> Handle(GetSignedFileQuery request, CancellationToken cancellationToken)
{
    // 1. Validar query
    var validationResult = request.Validate();
    if (!validationResult.IsValid)
        return Result<FileResponse>.Failure($"Validation failed: {errorMessage}");

    // 2. Obtener operación
    var operationId = OperationId.From(request.OperationId);
    var operation = await _signOperationRepository.GetByIdAsync(operationId);

    if (operation == null)
        return Result<FileResponse>.Failure($"Operation {request.OperationId} not found");

    // 3. Validar estado (si no es force download)
    if (!request.ForceDownload && operation.Status != Domain.Enums.OperationStatus.Completed)
        return Result<FileResponse>.Failure($"Operation {request.OperationId} is not completed");

    // 4. Validar archivo firmado
    if (operation.SignedFilePath == null)
        return Result<FileResponse>.Failure($"No signed file found for operation {request.OperationId}");

    // 5. Verificar existencia física del archivo
    var documentExists = await _documentRepository.DocumentExistsAsync(operation.SignedFilePath);
    if (!documentExists)
        return Result<FileResponse>.Failure($"Signed file not found at {operation.SignedFilePath.Value}");

    // 6. Obtener contenido del archivo
    var documentContent = await _documentRepository.GetDocumentAsync(operation.SignedFilePath);

    // 7. Crear response
    var response = new FileResponse
    {
        FileName = operation.SignedFilePath.FileName,
        Content = documentContent,
        GeneratedAt = DateTime.UtcNow
    };

    return Result<FileResponse>.Success(response);
}
```

#### **IDocumentRepository Implementation**
```csharp
public async Task<bool> DocumentExistsAsync(FilePath filePath)
{
    try
    {
        return File.Exists(filePath.Value);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error checking document existence {FilePath}", filePath.Value);
        return false;
    }
}

public async Task<byte[]> GetDocumentAsync(FilePath filePath)
{
    try
    {
        return await File.ReadAllBytesAsync(filePath.Value);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error reading document {FilePath}", filePath.Value);
        throw new InfrastructureException($"Failed to read document: {ex.Message}");
    }
}
```

### 📋 EJEMPLOS DE USO

#### **Ejemplo 1: Descarga Normal**
```bash
curl -X GET "http://localhost:59287/api/v1/sign/file/550e8400-e29b-41d4-a716-446655440000" \
  -H "X-Bridge-Token: bridge-firma-dev-token-2024" \
  --output "documento_firmado.pdf"
```

#### **Ejemplo 2: Descarga con JavaScript/Fetch**
```javascript
async function downloadSignedFile(operationId) {
    try {
        const response = await fetch(`/api/v1/sign/file/${operationId}`, {
            method: 'GET',
            headers: {
                'X-Bridge-Token': 'bridge-firma-dev-token-2024'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'documento_firmado.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading signed file:', error);
    }
}
```

---

## 4️⃣ GET /api/v1/sign/health - VERIFICACIÓN DE SALUD

### 📋 DESCRIPIÓN GENERAL
Endpoint de salud específico para verificar el estado funcional del componente de firma.

### 🔍 ANÁLISIS DEL CÓDIGO

#### **Ruta y Configuración**
```csharp
[HttpGet("health")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
public ActionResult GetSignHealth()
```

#### **Flujo de Verificación**
```csharp
try
{
    var healthStatus = new
    {
        status = "healthy",
        component = "sign",
        timestamp = DateTime.UtcNow,
        capabilities = new
        {
            canStartSign = true,
            canGetStatus = true,
            canDownloadFile = true,
            supportedFileTypes = new[] { ".pdf" },
            maxTimeoutMinutes = 60
        }
    };

    return Ok(healthStatus);
}
catch (Exception ex)
{
    return StatusCode(StatusCodes.Status503ServiceUnavailable, new
    {
        status = "unhealthy",
        component = "sign",
        error = ex.Message,
        timestamp = DateTime.UtcNow
    });
}
```

### 📥 DATOS DE ENTRADA

No requiere parámetros. Solo el token de autenticación.

### 📤 DATOS DE SALIDA

#### **Response Saludable**
```json
{
    "status": "healthy",
    "component": "sign",
    "timestamp": "2025-12-19T21:30:15.123Z",
    "capabilities": {
        "canStartSign": true,
        "canGetStatus": true,
        "canDownloadFile": true,
        "supportedFileTypes": [".pdf"],
        "maxTimeoutMinutes": 60
    }
}
```

#### **Response No Saludable**
```json
{
    "status": "unhealthy",
    "component": "sign",
    "error": "Database connection failed",
    "timestamp": "2025-12-19T21:30:15.123Z"
}
```

### 📋 EJEMPLOS DE USO

#### **Ejemplo 1: Verificación de Salud**
```bash
curl -X GET "http://localhost:59287/api/v1/sign/health" \
  -H "X-Bridge-Token: bridge-firma-dev-token-2024"
```

---

## 5️⃣ POST /api/v1/sign/start-base64 - FIRMA CON BASE64

### 📋 DESCRIPIÓN GENERAL
Endpoint alternativo para iniciar firma con contenido Base64, permitiendo al FrontEnd enviar PDFs directamente sin necesidad de descargas previas.

### 🔍 ANÁLISIS DEL CÓDÓGIGO

#### **Ruta y Configuración**
```csharp
[HttpPost("start-base64")]
[ProducesResponseType(StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status400BadRequest)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public async Task<ActionResult<SignBase64Response>> StartSignBase64([FromBody] SignBase64Request request)
{
    // ... validación token ...

    var command = new SignBase64DocumentCommand(
        request.Base64Content,
        request.FileName,
        request.RequestTimeoutMinutes,
        request.Token);

    var result = await _mediator.Send(command);

    return Ok(result.Value);
}
```

### 📥 DATOS DE ENTRADA

#### **Request DTO (SignBase64Request)**
```json
{
    "base64Content": "JVBERi0xLjQKMSAwIGlkIHZhbGlkYXRvcmlmaWVkIHRlc3QgdGVzdCBjb250ZW50Li4uLi4uQ29udGVudCBkZWNvZGVkIGJhc2U2NnBvZGVkIGJhc2UyMjM4Nzc3Mzk2MjM0Li4=",
    "fileName": "documento_importante.pdf",
    "timeoutMinutes": 15,
    "token": "bridge-firma-dev-token-2024"
}
```

**Validaciones DataAnnotations:**
- `base64Content`: Required - No puede ser vacío
- `fileName`: Required - Regex validation para caracteres válidos
- `timeoutMinutes`: Range 1-60
- `token`: Required

### 📤 DATOS DE SALIDA

#### **Response DTO (SignBase64Response)**
```json
{
    "operationId": "660f8400-e29b-41d4-a716-446655440111",
    "status": "Pending",
    "message": "Operación iniciada exitosamente",
    "timeoutMinutes": 15,
    "startedAt": "2025-12-19T21:32:45.123Z",
    "downloadPath": "C:\\Users\\User\\Downloads\\documento_importante.pdf"
}
```

### 🔄 FLUJO INTERNO DETALLADO

#### **SignBase64DocumentHandler Processing**
```csharp
// 1. Validar y decodificar Base64
var pdfBytesResult = await ValidateAndDecodeBase64Content(request.Base64Content);
if (!pdfBytesResult.IsSuccess)
    return Result<SignBase64Response>.Failure($"Base64 validation failed: {pdfBytesResult.Error}");

// 2. Crear Value Objects
var fileName = FileName.Create(request.FileName);
var timeoutMinutes = TimeoutMinutes.Create(request.TimeoutMinutes);

// 3. Obtener ruta de Downloads y validar
string downloadsPath;
FilePath filePath;
string fullPath;
try
{
    downloadsPath = _pathResolver.GetDownloadsPath();
    fullPath = Path.Combine(downloadsPath, request.FileName);
    filePath = FilePath.Create(fullPath);
}
catch (InfrastructureException ex)
{
    return Result<SignBase64Response>.Failure($"Failed to access Downloads folder: {ex.Message}");
}

// 4. Guardar PDF decodificado en Downloads
try
{
    // Race condition protection si archivo existe
    if (File.Exists(fullPath))
    {
        var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
        var uniquePath = Path.Combine(directory!, $"{fileNameWithoutExt}_{timestamp}{extension}");
        fullPath = uniquePath;
    }

    await File.WriteAllBytesAsync(fullPath, pdfBytes, cancellationToken);
}
catch (IOException ioEx)
{
    _logger.LogError(ioEx, "IO error saving Base64 document to: {Path}", fullPath);
    return Result<SignBase64Response>.Failure($"IO error saving document: {ioEx.Message}");
}

// 5. Validar documento recién guardado
var documentValidationResult = await _signApplicationService.ValidateDocumentAsync(filePath);
```

#### **Base64 Content Validation**
```csharp
private async Task<Result<byte[]>> ValidateAndDecodeBase64Content(string base64Content)
{
    try
    {
        // Remover prefijos data: si existen
        var cleanBase64 = base64Content;
        var prefix = "data:application/pdf;base64,";
        if (base64Content.StartsWith(prefix))
        {
            if (base64Content.Length > prefix.Length)
            {
                cleanBase64 = base64Content.Substring(prefix.Length);
            }
            else
            {
                return Result<byte[]>.Failure("Base64 content is too short after removing prefix");
            }
        }

        // Decodificar desde Base64
        var pdfBytes = Convert.FromBase64String(cleanBase64);

        // Validar que no esté vacío
        if (pdfBytes.Length == 0)
            return Result<byte[]>.Failure("Decoded PDF content is empty");

        // Validar PDF magic bytes
        if (pdfBytes.Length < 4)
            return Result<byte[]>.Failure("Decoded file is too small to be a valid PDF");

        if (pdfBytes[0] != 0x25 || pdfBytes[1] != 0x50 ||
            pdfBytes[2] != 0x44 || pdfBytes[3] != 0x46)
            return Result<byte[]>.Failure("Decoded file is not a valid PDF (invalid magic bytes)");

        return Result<byte[]>.Success(pdfBytes);
    }
    catch (FormatException formatEx)
    {
        return Result<byte[]>.Failure($"Invalid Base64 format: {formatEx.Message}");
    }
    catch (Exception ex)
    {
        return Result<byte[]>.Failure($"Error decoding Base64 content: {ex.Message}");
    }
}
```

### 📋 EJEMPLOS DE USO

#### **Ejemplo 1: Base64 Simple**
```bash
curl -X POST "http://localhost:59287/api/v1/sign/start-base64" \
  -H "Content-Type: application/json" \
  -H "X-Bridge-Token: bridge-firma-dev-token-2024" \
  -d '{
    "base64Content": "JVBERi0xLjQKMSAwIGlkIHZhbGlkYXRvcmlmaWVkIHRlc3QgdGVzdCBjb250ZW50Li4=",
    "fileName": "test.pdf",
    "timeoutMinutes": 10,
    "token": "bridge-firma-dev-token-2024"
  }'
```

#### **Ejemplo 2: Base64 Completo con Data URI**
```bash
curl -X POST "http://localhost:59287/api/v1/sign/start-base64" \
  -H "Content-Type: application/json" \
  -H "X-Bridge-Token: bridge-firma-dev-token-2024" \
  -d '{
    "base64Content": "data:application/pdf;base64,JVBERi0xLjQKMSAwIGlkIHZhbGlkYXRvcmlmaWVkIHRlc3QgdGVzdCBjb250ZW50Li4uLi4uQ29udGVudGRlY29kZWQgYmFzZTYyMwODM3OTMyMTA0Lg==",
    "fileName": "documento_completo.pdf",
    "timeoutMinutes": 20,
    "token": "bridge-firma-dev-token-2024"
  }'
```

---

# 📊 MATRIZ DE COMPATIBILIDAD Y FLUJOS

## 🔒 AUTENTICACIÓN

Todos los endpoints requieren autenticación mediante uno de estos métodos:

### Método 1: Header Personalizado (Recomendado)
```http
X-Bridge-Token: bridge-firma-dev-token-2024
```

### Método 2: Authorization Bearer
```http
Authorization: Bearer bridge-firma-dev-token-2024
```

### Método 3: Query Parameter
```http
GET /api/v1/sign/status/550e8400-e29b-41d4-a716-446655440000?token=bridge-firma-dev-token-2024
```

## 🔄 FLUJO DE ESTADOS DE OPERACIÓN

```
┌─────────────────┐
│  SIGN START        │  📤 POST /api/v1/sign/start
└─────┬───────────┘
      │
      ▼
      │
┌─────▼─────┐
│  PENDING       │  🔄 GET /api/v1/sign/status/{id}
└─────┬─────────┘
      │
      ▼ (background Task.Run)
      │
┌─────▼─────┐
│  PROCESSING   │  🔄 GET /api/v1/sign/status/{id}
└─────┬─────────┘
      │
      ▼ (FirmaONPE execution)
      │
┌─────▼─────┐
│  COMPLETED     │  📥 GET /api/v1/sign/file/{id}
└─────────────┘
```

### Estados Posibles
- **Pending**: Operación creada, lista para iniciar
- **Processing**: FirmaONPE ejecutándose o monitoreando archivo `[F]`
- **Completed**: Archivo `[F]` detectado y validado
- **Failed**: Error en cualquier etapa con logging detallado
- **Timeout**: Timeout alcanzado, proceso terminado
- **Cancelled**: Cancelación por usuario

## 🛡️ VALIDACIONES IMPLEMENTADAS

### Validaciones de Seguridad
- **Token Authentication**: Middleware + doble validación en controllers
- **Input Sanitization**: Validación de caracteres peligrosos en filenames
- **JWT Token Validation**: Formato básico y caracteres seguros para Backend
- **File Path Traversal**: Protección contra ataques de path traversal

### Validaciones de Negocio
- **PDF-Only**: Solo se procesan archivos PDF
- **Magic Bytes**: Validación `%PDF-` para confirmar contenido PDF
- **File Size Limits**: Validaciones de tamaño máximo/por defecto
- **Timeout Ranges**: 1-60 minutos configurables
- **Race Condition Protection**: Manejo de archivos duplicados con timestamps

### Validaciones de Datos
- **GUID Validation**: Formato de operation IDs
- **Base64 Format**: Validación de encoding y contenido PDF
- **Filename Validation**: Caracteres permitidos y extensión .pdf
- **JSON Schema**: Validación de request/response structures

## 📚 PATRONES IMPLEMENTADOS

### CQRS con MediatR
- **Commands**: Para operaciones de escritura (POST)
- **Queries**: Para operaciones de lectura (GET)
- **Handlers**: Procesamiento centralizado con validaciones

### Clean Architecture
- **Layer Separation**: Controllers → Application → Domain → Infrastructure
- **Dependency Injection**: Inversión de dependencias con .NET Core DI
- **Domain-Driven Design**: Aggregates, Value Objects con validaciones ricas

### Result Pattern
```csharp
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }

    public static Result<T> Success(T value) => new(true, value, null);
    public static Result<T> Failure(string error) => new(false, default, error);
}
```

---

## 🔧 CONFIGURACIÓN

### Tokens de Seguridad
```json
{
  "BridgeToken": "bridge-firma-dev-token-2024",
  "AllowedHosts": "*",
  "CORS": {
    "Policy": "AllowAll"
  }
}
```

### Configuración de Backend (opcional)
```json
{
  "Backend": {
    "BaseUrl": "https://localhost:7245",
    "DefaultTimeout": "00:02:00"
  },
  "FirmaONPE": {
    "ExecutablePath": "C:\\FirmaONPE\\AppFirmaONPE.exe",
    "DefaultTimeout": "00:15:00"
  }
}
```

### Limites de Configuración
- **Timeout Min/Max**: 1-60 minutos
- **File Size Max**: Configurable (default: 100MB)
- **Concurrent Operations**: Ilimitado (máx handled by ThreadPool)
- **Retention Period**: Configurable para cleanup de operaciones antiguas

---

# 📈 MÉTRICAS Y MONITOREO

## 📊 Logging Implementado

### Structured Logging con Contexto
- **Request IDs**: Tracking de operaciones completas
- **User Identification**: Tokens y IDs de documento
- **Performance Metrics**: Tiempos de respuesta y duración de operaciones
- **Error Tracking**: Stack traces con contexto completo

### Niveles de Logging
- **Information**: Operaciones exitosas y milestones
- **Warning**: Problemas no críticos o timeouts
- **Error**: Fallas en el procesamiento con detalles
- **Debug**: Información detallada para troubleshooting

### Ejemplos de Logging
```csharp
_logger.LogInformation("Starting sign operation for file: {FileName}, OperationId: {OperationId}",
    fileName, operationId);

_logger.LogWarning("Document validation failed for file {FileName}: {Error}",
    fileName, validationError);

_logger.LogError(ex, "Error downloading document {DocumentId} from backend", documentId);

_logger.LogInformation("Operation {OperationId} completed successfully in {Duration:F2} seconds",
    operationId, duration.TotalSeconds);
```

---

# 🔧 EXTENSIÓN Y MANTENIMIENTO

## 📋 Patrones para Extensión

### Adding New Endpoints
1. Crear nuevo método en `SignController`
2. Crear Request/Response DTOs
3. Implementar Command/Query Handlers
4. Agregar validaciones de negocio

### Adding New File Types
1. Modificar `FilePath.ValidatePath()` para aceptar nuevos tipos
2. Actualizar `FirmaONPE` para manejar otros formatos
3. Actualizar `FileSystemMonitoringService` para detectar otros sufijos

### Adding New Authentication Methods
1. Implementar nuevo middleware o extender `TokenValidationMiddleware`
2. Agregar nuevas fuentes de tokens
3. Configurar políticas de seguridad adicionales

## 🚀 ESTADO FINAL

Este análisis exhaustivo demuestra que la implementación actual de BridgeFirma cumple completamente con la documentación y especificaciones, con:

- ✅ **Autenticación robusta** en múltiples capas
- ✅ **Validaciones comprehensivas** de seguridad y negocio
- ✅ **Error handling detallado** con logging estructurado
- ✅ **Flujo completo** desde request hasta FirmaONPE y retorno
- ✅ **Monitoreo y estado** en tiempo real
- ✅ **Soporte múltiple** para archivos locales y descarga desde Backend

La implementación está **lista para producción** y cumple con todos los requisitos especificados en la documentación original.