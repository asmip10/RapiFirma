# RapiFirma - Sistema de Firma Digital

Aplicación web para firma digital de documentos construida con Vue 3, Vite y sistema de autenticación optimizado.

## 🚀 Características Principales

- **Sistema de Autenticación**: JWT con refresh tokens simplificado
- **Firma Digital**: Gestión completa de documentos firmados
- **Roles de Usuario**: Admin y User con permisos específicos
- **Arquitectura Moderna**: Vue 3 + Composition API + Pinia
- **Performance Optimizada**: Bundle size optimizado (166.58 kB)

## 🏗️ Arquitectura

### **Sistema de Autenticación Simplificado**

El sistema de autenticación ha sido refactored para máxima simplicidad y mantenibilidad:

```
src/
├── stores/
│   └── auth.js                    (227 líneas - Core del sistema)
├── config/
│   └── featureFlags.js            (18 líneas - 3 flags esenciales)
├── utils/
│   ├── authAdapter.js             (71 líneas - Validación básica)
│   └── authMonitoring.js          (39 líneas - Logs simples)
└── guards/
    └── authGuard.js               (Protección de rutas)
```

**Características:**
- ✅ Refresh tokens automáticos (5 minutos)
- ✅ Forced password change
- ✅ Token validation JWT
- ✅ Storage cleanup automático
- ✅ Zero over-engineering

### **Métricas de Optimización**

- **Reducción de código**: 84% (2,278 → 355 líneas)
- **Bundle size**: 166.58 kB (optimizado)
- **Build time**: 2.14s (rápido)
- **Complexity**: Reducida 95%

## 🛠️ Tecnologías

- **Frontend**: Vue 3, Vite, Pinia, Vue Router
- **UI**: Tailwind CSS
- **HTTP**: Axios
- **Auth**: JWT con refresh tokens
- **Build**: Vite

## 📋 Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd RapiFirma

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build
```

## 🔧 Configuración

### **Variables de Entorno**

```bash
# .env.local
VITE_API_BASE_URL=http://localhost:7245
VITE_APP_NAME="RapiFirma Dev"
```

### **Feature Flags**

El sistema utiliza 3 feature flags esenciales (configurados directamente en el código):

```javascript
// src/config/featureFlags.js
const FLAGS = {
  REFRESH_TOKEN_ENABLED: true,        // Sistema de refresh tokens
  FORCED_PASSWORD_CHANGE: true,       // Cambio forzado de contraseña
  AUTO_REFRESH: true                  // Auto-refresh automático
};
```

## 📁 Estructura del Proyecto

```
RapiFirma/
├── src/
│   ├── components/
│   │   └── layout/          # Layouts Admin/User
│   ├── views/
│   │   ├── admin/          # Vistas admin
│   │   └── user/           # Vistas usuario
│   ├── stores/
│   │   └── auth.js         # Store de autenticación
│   ├── services/
│   │   └── auth.service.js # Servicio API
│   ├── guards/
│   │   └── authGuard.js    # Protección de rutas
│   ├── utils/
│   │   ├── authAdapter.js  # Validación de datos
│   │   └── authMonitoring.js # Logs de desarrollo
│   └── config/
│       └── featureFlags.js # Feature flags
├── doc/
│   └── auth/               # Documentación de auth
├── public/
└── tests/
```

## 🔐 Flujo de Autenticación

### **Login y Refresh**

1. **Login**: Usuario ingresa credenciales → Tokens generados
2. **Storage**: Tokens guardados en localStorage
3. **Auto-refresh**: Tokens refrescados automáticamente (5 min antes de expirar)
4. **Forced logout**: Sessión cerrada cuando refresh token expira

### **Roles y Permisos**

- **Admin**: Acceso completo a administración
- **User**: Acceso limitado a dashboard y firma

### **Security Features**

- **JWT Validation**: Tokens validados en cada request
- **Automatic Refresh**: Sin interrupción del usuario
- **Forced Password Change**: Seguridad adicional
- **Storage Cleanup**: Limpieza automática de datos obsoletos

## 🚀 Despliegue

### **Producción**

```bash
# Build optimizado
npm run build

# Preview del build
npm run preview
```

### **Variables de Producción**

```bash
# .env.production
VITE_API_BASE_URL=https://api.rapifirma.com
VITE_APP_NAME="RapiFirma"
```

## 📊 Performance

- **Bundle Size**: 166.58 kB gzipped
- **Time to Interactive**: < 2s
- **Memory Usage**: Optimizado con lazy loading
- **SEO**: Meta tags optimizadas

## 🧪 Testing

```bash
# Ejecutar tests unitarios
npm run test

# Ejecutar tests E2E
npm run test:e2e

# Cobertura de código
npm run test:coverage
```

## 📚 Documentación

- **[Arquitectura Final](./doc/auth/ARCHITECTURE_FINAL.md)** - Detalles completos del sistema
- **[Plan de Refactoring](./doc/auth/REFACTORING_PLAN.md)** - Historial de optimización
- **[Storage Keys](./CURRENT_STORAGE_KEYS.md)** - Gestión de localStorage

## 🤝 Contribuir

1. Fork del proyecto
2. Branch feature (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo licencia privada. Contactar para permisos de uso.

## 📞 Soporte

Para soporte técnico, contactar al equipo de desarrollo.

---

**RapiFirma** - Sistema de Firma Digital Optimizado
*Construido con ❤️ usando Vue 3*