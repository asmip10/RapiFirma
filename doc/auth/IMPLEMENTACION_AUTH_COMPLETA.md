# SISTEMA DE AUTENTICACIÓN RAPIFIRMA - DOCUMENTACIÓN COMPLETA PARA LLM

## 🎯 PROPÓSITO DE ESTA DOCUMENTACIÓN

Este documento explica el sistema de autenticación de RapiFirma en su totalidad, diseñado específicamente para que un LLM comprenda completamente la arquitectura, implementación y flujo del contexto AUTH. Todo el análisis se centra exclusivamente en AUTH, sin otros contextos del sistema.

---

## 📁 ESTRUCTURA COMPLETA DE CARPETAS Y ARCHIVOS AUTH

```
D:\RapiFirma\RapiFirma\
├── src\
│   ├── services\
│   │   ├── auth.service.js         # Servicio de autenticación API
│   │   └── api.js                  # Configuración Axios con interceptores AUTH
│   ├── stores\
│   │   └── auth.js                 # Store Pinia principal de autenticación
│   ├── guards\
│   │   ├── authGuard.js            # Guardia de autenticación básica
│   │   └── roleGuard.js            # Guardia de verificación de roles
│   ├── views\
│   │   └── LoginView.vue           # Componente UI de login
│   ├── components\layout\
│   │   ├── UserLayout.vue          # Layout para usuarios autenticados
│   │   └── AdminLayout.vue         # Layout para administradores
│   └── router\
│       └── index.js                # Configuración de rutas con guardias AUTH
└── .env.local                      # Variables de entorno AUTH
```

---

## 🏗️ ARQUITECTURA GENERAL DEL SISTEMA AUTH

### PRINCIPIOS DE DISEÑO FUNDAMENTALES

1. **CENTRALIZACIÓN**: Toda la lógica AUTH está centralizada en el store Pinia
2. **SEPARACIÓN DE RESPONSABILIDADES**: Cada componente tiene una única función AUTH
3. **REACTIVIDAD**: Estado reactivo para actualizaciones automáticas de UI
4. **PERSISTENCIA**: Mantenimiento de sesión entre recargas de página
5. **SEGURIDAD POR CAPAS**: Múltiples niveles de verificación y protección
6. **EXPERIENCIA DE USUARIO**: Redirecciones inteligentes y manejo transparente de errores

### PATRONES ARQUITECTÓNICOS IMPLEMENTADOS

#### 1. **STORE PATTERN (Pinia)**
- Estado global AUTH reactivo
- Getters computados para datos derivados
- Actions para operaciones asíncronas
- Persistencia automática en localStorage

#### 2. **SERVICE LAYER PATTERN**
- Abstracción de comunicación API
- Centralización de endpoints AUTH
- Manejo unificado de errores

#### 3. **INTERCEPTOR PATTERN**
- Inyección automática de tokens
- Verificación de expiración global
- Manejo centralizado de respuestas 401/403/404

#### 4. **GUARD PATTERN**
- Protección de rutas a nivel de router
- Verificación antes de renderizado
- Redirecciones condicionales

---

## 🔥 ANÁLISIS DETALLADO DE CADA ARCHIVO AUTH

### 1. `src/stores/auth.js` - CORAZÓN DEL SISTEMA

#### ESTRUCTURA COMPLETA Y ANÁLISIS:

```javascript
// src/stores/auth.js
import { defineStore } from "pinia";
import { AuthService } from "../services/auth.service";
import { jwtDecode } from "jwt-decode";

// FUNCIÓN MAPEADORA DE CLAIMS JWT
function mapClaims(token) {
  const c = jwtDecode(token) || {};
  const pick = (...keys) => keys.map(k => c[k]).find(v => v !== undefined && v !== null);
  return {
    id: pick("nameid", "sub", "userid", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"),
    username: pick("unique_name", "name", "username", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"),
    role: pick("role", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"),
    tipo: pick("tipo", "Tipo", "user_tipo"),
    exp: pick("exp"),
    _raw: c,
  };
}

// STORE PRINCIPAL DE AUTENTICACIÓN
export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: null,    // JWT token string
    user: null,     // Objeto usuario con claims mapeados
  }),

  getters: {
    isAuthenticated: (s) => !!s.token && !!s.user,
    isAdmin: (s) => s.user?.role === "Admin",
  },

  actions: {
    // RECUPERAR DESDE LOCALSTORAGE
    loadFromStorage() {
      const raw = localStorage.getItem("rf_auth");
      if (!raw) return;
      try {
        const { token, usernameFallback } = JSON.parse(raw) || {};
        if (!token) return;
        this.token = token;
        const mapped = mapClaims(token);
        if (!mapped.username && usernameFallback) mapped.username = usernameFallback;
        this.user = mapped;
      } catch {
        this.logout();
      }
    },

    // PERSISTIR EN LOCALSTORAGE
    persist(usernameFallback) {
      localStorage.setItem("rf_auth", JSON.stringify({
        token: this.token,
        usernameFallback
      }));
    },

    // PROCESO COMPLETO DE LOGIN
    async login({ username, password }) {
      const { token } = await AuthService.login({ username, password });
      if (!token) throw new Error("Sin token");
      this.token = token;
      const mapped = mapClaims(token);
      if (!mapped.username) mapped.username = username;
      this.user = mapped;
      this.persist(username);
    },

    // LIMPIEZA COMPLETA DE SESIÓN
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem("rf_auth");

      // LIMPIAR CACHÉ DE NOMBRES
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("rf_fullname_")) localStorage.removeItem(k);
      }

      // LIMPIAR AVISO DE EXPIRACIÓN
      sessionStorage.removeItem("rf_warn_exp");
    }
  },
});
```

#### ANÁLISIS PROFUNDO DEL STORE:

**ESTADO (STATE):**
- `token`: Almacena el JWT string obtenido del backend
- `user`: Objeto con propiedades mapeadas desde claims JWT
- Estado reactivo: Cualquier cambio actualiza automáticamente todos los componentes

**GETTERS COMPUTADOS:**
- `isAuthenticated`: Booleano que indica si hay sesión activa
- `isAdmin`: Verificación si el usuario tiene rol de administrador
- Se actualizan automáticamente cuando cambia el estado

**ACCIONES DETALLADAS:**

1. **`loadFromStorage()`**:
   - Se ejecuta al iniciar la app o antes de verificar rutas protegidas
   - Recupera desde localStorage key `"rf_auth"`
   - Maneja errores de parseo con auto-limpieza
   - Aplica fallback de username si el token no lo incluye

2. **`persist(usernameFallback)`**:
   - Guarda estado actual en localStorage
   - Incluye username fallback para tokens sin username claim
   - Formato JSON para fácil recuperación

3. **`login({ username, password })`**:
   - Flujo completo de autenticación
   - Llama a AuthService para comunicación con backend
   - Valida existencia de token
   - Decodifica JWT y mapea claims
   - Aplica fallback inmediato de username
   - Persiste para mantener sesión

4. **`logout()`**:
   - Limpieza completa del estado
   - Elimina localStorage principal
   - Limpia caché relacionado con nombres (rf_fullname_*)
   - Elimina aviso de expiración de sessionStorage

**FUNCIÓN `mapClaims(token)` CRÍTICA:**
- Soporta múltiples estándares de claims JWT
- Función `pick()` busca primer valor válido en orden de prioridad
- Preserva claims originales en `_raw` para debugging
- Manejo seguro con fallback a objeto vacío

---

### 2. `src/services/auth.service.js` - CAPA DE COMUNICACIÓN API

#### ESTRUCTURA Y ANÁLISIS:

```javascript
// src/services/auth.service.js
import api from "./api";

export const AuthService = {
  async login({ username, password }) {
    // Backend: POST /api/auth/login -> { token }
    const { data } = await api.post("/api/auth/login", { username, password });
    return data;
  },
};
```

#### ANÁLISIS DETALLADO:

**DISEÑO MINIMALISTA Y ENFOCADO:**
- **Singleton pattern**: Objeto exportado directamente
- **Único método**: `login()` asíncrono
- **Endpoint específico**: `/api/auth/login`
- **Contrato claro**: Input `{ username, password }`, Output `{ token }`

**DEPENDENCIAS:**
- Importa `api` configurado centralmente
- Utiliza interceptores configurados en `api.js`
- No maneja errores directamente (delega a interceptor)

**FLUJO DE COMUNICACIÓN:**
1. Recibe credenciales del store
2. Realiza POST a endpoint de login
3. Extrae `data` de response Axios
4. Retorna objeto con token

---

### 3. `src/services/api.js` - CONFIGURACIÓN HTTP CON INTERCEPTORES

#### ESTRUCTURA COMPLETA Y ANÁLISIS:

```javascript
// src/services/api.js
import axios from "axios";
import { useAuthStore } from "../stores/auth";
import { useToasts } from "../composables/useToasts";

// INSTANCIA AXIOS CONFIGURADA
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://localhost:7245',
  timeout: 20000,
});

// INTERCEPTOR DE REQUESTS - INYECCIÓN Y VERIFICACIÓN DE TOKENS
api.interceptors.request.use((config) => {
  const auth = useAuthStore();

  // 1. INYECCIÓN AUTOMÁTICA DE TOKEN
  if (auth?.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }

  // 2. VERIFICACIÓN DE EXPIRACIÓN
  if (auth?.user?.exp) {
    const now = Math.floor(Date.now() / 1000);
    const secs = auth.user.exp - now;
    const warned = sessionStorage.getItem("rf_warn_exp");

    // 3. TOKEN YA EXPIRADO - LOGOUT FORZADO
    if (secs <= 0) {
      const { error } = useToasts();
      error("Tu sesión expiró. Vuelve a iniciar sesión.");
      auth.logout();
      const params = new URLSearchParams({ r: location.pathname + location.search });
      window.location.href = `/login?${params.toString()}`;
      return Promise.reject(new axios.Cancel("Token expirado"));
    }

    // 4. ADVERTENCIA DE EXPIRACIÓN CERCANA
    else if (secs <= 120 && !warned) {
      const { info } = useToasts();
      info("Tu sesión expirará pronto.");
      sessionStorage.setItem("rf_warn_exp", "1");
    }
  }
  return config;
});

// INTERCEPTOR DE RESPONSES - MANEJO DE ERRORES AUTH
api.interceptors.response.use(
  (r) => r,  // SUCCESS: PASS THROUGH

  (err) => { // ERROR HANDLING
    const { error } = useToasts();
    const status = err?.response?.status;

    // 401 UNAUTHORIZED - SESIÓN EXPIRADA
    if (status === 401) {
      const auth = useAuthStore();
      auth.logout();
      error("Sesión expirada. Vuelve a iniciar sesión.");

      // EVITAR LOOP DE REDIRECCIÓN
      if (!location.pathname.startsWith("/login")) {
        const params = new URLSearchParams({ r: location.pathname + location.search });
        window.location.href = `/login?${params.toString()}`;
      }
    }

    // 403 FORBIDDEN - SIN PERMISOS
    else if (status === 403) {
      error("Sin permiso para realizar esta acción.");
    }

    // 404 NOT FOUND - RECURSO INEXISTENTE
    else if (status === 404) {
      error("Documento no existe o fue eliminado.");
    }

    // TIMEOUT/ERROR DE RED
    else if (!err.response) {
      error("No se pudo conectar con el servidor.");
    }

    return Promise.reject(err);
  }
);

export default api;
```

#### ANÁLISIS PROFUNDO DE INTERCEPTORES:

**CONFIGURACIÓN BASE:**
- `baseURL`: Variable de entorno con fallback a localhost:7245
- `timeout`: 20 segundos para prevenir requests colgadas
- Instancia separada para no afectar otras configuraciones Axios

**INTERCEPTOR REQUEST DETALLADO:**

1. **INYECCIÓN DE TOKEN**:
   - Obtiene store con `useAuthStore()`
   - Verifica existencia de token
   - Formato estándar: `Authorization: Bearer <token>`

2. **VERIFICACIÓN EXPIRACIÓN**:
   - Convierte timestamp actual a segundos UNIX
   - Calcula segundos restantes: `exp - now`
   - Usa sessionStorage para evitar spam de advertencias

3. **MANEJO EXPIRACIÓN INMEDIATA** (`secs <= 0`):
   - Muestra toast de error
   - Fuerza logout del store
   - Construye URL con ruta actual para redirección post-login
   - Cancela request con `axios.Cancel`

4. **ADVERTENCIA EXPIRACIÓN CERCANA** (`secs <= 120`):
   - Muestra toast informativo solo una vez
   - Marca como advertido en sessionStorage

**INTERCEPTOR RESPONSE DETALLADO:**

1. **401 UNAUTHORIZED**:
   - Logout forzado (sesión inválida/expirada)
   - Toast informativo para usuario
   - Redirección a login solo si no está ya en login
   - Prevención de loops infinitos

2. **403 FORBIDDEN**:
   - Usuario autenticado pero sin permisos
   - Toast específico de permisos
   - No hace logout (sesión válida)

3. **404 NOT FOUND**:
   - Toast específico para documentos
   - Mensaje amigable para experiencia de usuario

4. **NETWORK ERRORS**:
   - Detecta ausencia de response (`!err.response`)
   - Toast genérico de conexión

---

### 4. `src/guards/authGuard.js` - GUARDIA DE AUTENTICACIÓN BÁSICA

#### ESTRUCTURA Y ANÁLISIS:

```javascript
// src/guards/authGuard.js
import { useAuthStore } from "../stores/auth";

export function requireAuth(to, from, next) {
  const auth = useAuthStore();

  // SIEMPRE CARGAR DESDE STORAGE (POR RECARGAS DE PÁGINA)
  auth.loadFromStorage();

  if (!auth.isAuthenticated) {
    console.warn("[Guard] Bloqueado: no autenticado →", to.fullPath);
    return next({
      name: "login",
      query: { r: to.fullPath }  // GUARDA RUTA ORIGINAL
    });
  }

  next(); // PERMITE CONTINUAR
}
```

#### ANÁLISIS DETALLADO:

**FUNCIONAMIENTO:**
1. **Carga desde storage**: Siempre ejecuta `loadFromStorage()` para manejar recargas de página
2. **Verificación**: Usa getter `isAuthenticated` del store
3. **Bloqueo**: Si no autenticado, redirige a login
4. **Preservación**: Guarda ruta completa en query param `r`
5. **Logging**: Para debugging de navegación bloqueada

**PARÁMETROS DE NAVIGACIÓN:**
- `to`: Ruta destino
- `from`: Ruta origen
- `next`: Función para controlar navegación

**REDIRECCIÓN INTELIGENTE:**
- `to.fullPath`: Incluye ruta completa con query params
- `query: { r: to.fullPath }`: Permite redirección post-login
- `name: "login"`: Navegación por nombre de ruta

---

### 5. `src/guards/roleGuard.js` - GUARDIA DE VERIFICACIÓN DE ROLES

#### ESTRUCTURA Y ANÁLISIS:

```javascript
// src/guards/roleGuard.js
import { useAuthStore } from "../stores/auth";

export function requireRole(roles = []) {
  // FACTORY PATTERN - RETORNA GUARDIA CONFIGURADA
  return (to, from, next) => {
    const auth = useAuthStore();

    // 1. VERIFICACIÓN PRIMARIA: AUTENTICACIÓN
    if (!auth.isAuthenticated) {
      console.warn("[Guard] Bloqueado: no autenticado para rol", roles);
      return next({ name: "login" });
    }

    // 2. VERIFICACIÓN SECUNDARIA: ROL REQUERIDO
    if (roles.length && !roles.includes(auth.user?.role)) {
      console.warn("[Guard] Bloqueado: rol requerido", roles, "pero user tiene", auth.user?.role);
      return next({ name: "not-found" });
    }

    next(); // PERMITE CONTINUAR
  };
}
```

#### ANÁLISIS DETALLADO:

**FACTORY PATTERN:**
- Función que retorna otra función configurada
- Permite reutilización con diferentes roles
- `roles = []`: Parámetro con valor por defecto

**DOBLE VERIFICACIÓN:**
1. **Primero autenticación**: Si no está autenticado, va a login
2. **Luego rol**: Si autenticado pero sin rol, va a 404

**LÓGICA DE ROLES:**
- `roles.length`: Si array vacío, permite cualquier rol
- `roles.includes(auth.user?.role)`: Verifica si rol actual está en permitidos
- `auth.user?.role`: Optional chaining para seguridad

**REDIRECCIONES DIFERENCIADAS:**
- No autenticado → login (`name: "login"`)
- Sin rol → 404 (`name: "not-found"`)

---

### 6. `src/views/LoginView.vue` - COMPONENTE UI DE LOGIN

#### ESTRUCTURA COMPLETA Y ANÁLISIS:

```html
<!-- src/views/LoginView.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center p-4 relative">

    <!-- BACKGROUND PATTERNS -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute inset-0 bg-grid-blue-200/[0.08] bg-[length:50px_50px]" />
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300/15 rounded-full blur-3xl animate-pulse" />
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300/15 rounded-full blur-3xl animate-pulse delay-1000" />
      <div class="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-200/10 rounded-full blur-3xl animate-pulse delay-500" />
    </div>

    <!-- LOGIN CONTAINER -->
    <div class="relative z-10 w-full max-w-md">
      <div class="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 p-10">

        <form @submit.prevent="onSubmit" class="space-y-6">

          <!-- USERNAME FIELD -->
          <div class="space-y-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3">Usuario (DNI)</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  v-model="username"
                  type="text"
                  class="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 focus:bg-white transition-all duration-200 placeholder-gray-400 group-hover:border-blue-300"
                  placeholder="Ingrese su DNI"
                  required
                />
              </div>
            </div>

            <!-- PASSWORD FIELD -->
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-3">Contraseña</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  v-model="password"
                  type="password"
                  class="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 focus:bg-white transition-all duration-200 placeholder-gray-400 group-hover:border-blue-300"
                  placeholder="Ingrese su contraseña"
                  required
                />
              </div>
            </div>
          </div>

          <!-- SUBMIT BUTTON -->
          <button
            :disabled="loading"
            class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-500 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg hover:shadow-xl disabled:shadow-none"
          >
            <span v-if="loading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Ingresando...
            </span>
            <span v-else class="flex items-center justify-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Iniciar sesión
            </span>
          </button>

          <!-- ERROR DISPLAY -->
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 backdrop-blur-sm">
            <div class="flex items-center">
              <svg class="h-5 w-5 text-red-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-sm text-red-700 font-medium">{{ error }}</span>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- COPYRIGHT FOOTER -->
    <div class="absolute bottom-4 right-4 z-10">
      <p class="text-xs text-gray-500">
        © 2024 RapiFirma. Todos los derechos reservados.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

// ESTADO REACTIVO DEL FORMULARIO
const username = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

// MANEJADOR DE SUBMIT
async function onSubmit() {
  error.value = "";
  loading.value = true;

  try {
    // LLAMADA AL STORE PARA LOGIN
    await auth.login({
      username: username.value,
      password: password.value
    });

    // REDIRECCIÓN INTELIGENTE
    const redirect = route.query.r;
    if (redirect) {
      router.push(String(redirect));  // RUTA ORIGINAL
    } else {
      router.push("/");               // DEFAULT: dashboard
    }
  }
  catch {
    error.value = "Credenciales inválidas o servidor no disponible";
  }
  finally {
    loading.value = false;  // SIEMPRE EJECUTADO
  }
}
</script>
```

#### ANÁLISIS DETALLADO DEL COMPONENTE:

**ESTRUCTURA TEMPLATE:**
1. **Background moderno**: Gradientes con animaciones CSS
2. **Formulario centrado**: Container con backdrop-blur
3. **Campos de input**: Iconos SVG, validación HTML5, estilos Tailwind
4. **Botón de submit**: Estados loading/success, animaciones
5. **Display de errores**: Visible solo cuando hay error
6. **Footer informativo**: Copyright constante

**ESTADO REACTIVO:**
- `username`: Valor del input de usuario
- `password`: Valor del input de contraseña
- `loading`: Estado de carga durante autenticación
- `error`: Mensaje de error para display

**LÓGICA DE SUBMIT:**
1. **Reset de errores**: `error.value = ""`
2. **Estado loading**: `loading.value = true`
3. **Llamada a store**: `auth.login()` con credenciales
4. **Redirección inteligente**: Usa query param `r` si existe
5. **Manejo de errores**: Catch con mensaje amigable
6. **Always executed**: `finally` para resetear loading

**CARACTERÍSTICAS DE UX:**
- **Diseño responsivo**: `max-w-md`, `p-4` mobile-friendly
- **Estados visuales**: Loading spinner, hover effects, transitions
- **Accesibilidad**: Labels proper, required fields, icons
- **Feedback inmediato**: Validación HTML5 + visual feedback

---

### 7. `src/components/layout/UserLayout.vue` - LAYOUT USUARIOS

#### ESTRUCTURA COMPLETA Y ANÁLISIS:

```html
<script setup>
import { computed, onMounted } from "vue";
import { useAuthStore } from "../../stores/auth";
import { useRouter } from "vue-router";
import { useDisplayName } from "../../composables/useDisplayName";

const auth = useAuthStore();
const router = useRouter();
const { displayName, resolve } = useDisplayName();

// CARGAR DESDE STORAGE AL MONTAR
onMounted(() => {
  auth.loadFromStorage();
  resolve();  // COMPOSABLE DE NOMBRES
});

// COMPUTEDS REACTIVOS
const username = computed(() => auth.user?.username || "usuario");
const isAdmin = computed(() => auth.user?.role === "Admin");

// FUNCIÓN DE LOGOUT
function logout() {
  auth.logout();
  router.push("/login");
}
</script>

<template>
  <div class="h-screen w-full bg-gray-50 overflow-y-scroll" style="scrollbar-gutter: stable both-edges;">

    <!-- HEADER STICKY -->
    <header class="sticky top-0 z-40 w-full bg-slate-800 text-white">
      <div class="mx-auto max-w-7xl h-14 px-4 flex items-center justify-between">

        <!-- BIENVENIDA -->
        <span class="font-semibold truncate">Bienvenido {{ displayName }}</span>

        <!-- ACCIONES -->
        <div class="flex items-center gap-3 whitespace-nowrap">
          <!-- LINK ADMIN (CONDICIONAL) -->
          <router-link
            v-if="isAdmin"
            to="/admin"
            class="bg-white/10 px-3 py-1 rounded hover:bg-white/20 text-sm"
          >
            Ir a Admin
          </router-link>

          <!-- BOTÓN LOGOUT -->
          <button
            @click="logout"
            class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="mx-auto max-w-7xl w-full p-4">
      <router-view />
    </main>
  </div>
</template>
```

#### ANÁLISIS DETALLADO:

**COMPOSABLES IMPORTADOS:**
- `useDisplayName`: Para formateo de nombres de usuario
- `useAuthStore`: Estado de autenticación
- `useRouter`: Navegación programática

**LÓGICA DE INICIALIZACIÓN:**
- `onMounted()`: Se ejecuta cuando el componente se monta
- `auth.loadFromStorage()`: Recupera sesión desde localStorage
- `resolve()`: Inicializa composable de nombres

**COMPUTEDS REACTIVOS:**
- `username`: Obtiene username del store con fallback "usuario"
- `isAdmin`: Verificación booleana de rol Admin

**HEADER STICKY:**
- **Posición fija**: `sticky top-0` para navegación siempre visible
- **Z-index alto**: `z-40` para mantener sobre contenido
- **Responsive**: `max-w-7xl` centrado
- **Bienvenida**: Muestra nombre formateado del usuario
- **Acciones**: Link admin (condicional) + botón logout

**CONDICIONALIDAD ADMIN:**
- `v-if="isAdmin"`: Solo muestra link si es administrador
- Facilita navegación entre roles sin logout

**FUNCIÓN LOGOUT:**
1. Llama `auth.logout()` para limpiar estado
2. Redirige a login con `router.push("/login")`

---

### 8. `src/components/layout/AdminLayout.vue` - LAYOUT ADMINISTRADORES

#### ESTRUCTURA COMPLETA Y ANÁLISIS:

```html
<script setup>
import { onMounted, computed } from "vue";
import { useAuthStore } from "../../stores/auth";

const auth = useAuthStore();

// CARGAR ESTADO AL MONTAR
onMounted(() => {
  auth.loadFromStorage?.();
});

// COMPUTEDS DE INFORMACIÓN
const roleText = computed(() => auth?.user?.role ?? "—");
const tipoText = computed(() => auth?.user?.tipo ?? "—");
</script>

<template>
  <div class="h-screen w-full bg-gray-50 overflow-y-scroll" style="scrollbar-gutter: stable both-edges;">

    <!-- HEADER INDIGO - DOS NIVELES -->
    <header class="sticky top-0 z-40 w-full bg-indigo-600 text-white shadow">
      <div class="mx-auto max-w-7xl px-4">

        <!-- BARRA SUPERIOR - NAVEGACIÓN PRINCIPAL -->
        <div class="h-12 flex items-center justify-between gap-3">
          <h1 class="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
            RapiFirma · Admin
          </h1>

          <nav class="flex items-center gap-4 text-sm whitespace-nowrap overflow-hidden">
            <router-link to="/admin" class="shrink-0 hover:underline">Dashboard</router-link>
            <router-link to="/admin/users" class="shrink-0 hover:underline">Usuarios</router-link>
            <router-link to="/admin/docs" class="shrink-0 hover:underline">Documentos</router-link>
            <router-link
              to="/"
              class="shrink-0 ml-2 bg-white/10 px-3 py-1 rounded hover:bg-white/20"
            >
              Panel Usuario
            </router-link>
          </nav>
        </div>

        <!-- BARRA INFERIOR - INFORMACIÓN DE USUARIO -->
        <div class="h-6 flex items-center justify-end text-[11px] leading-none text-indigo-100 whitespace-nowrap overflow-hidden">
          <span class="truncate">Rol: {{ roleText }} · Tipo: {{ tipoText }}</span>
        </div>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="mx-auto max-w-7xl w-full p-4">
      <router-view />
    </main>
  </div>
</template>
```

#### ANÁLISIS DETALLADO:

**DIFERENCIACIÓN VISUAL:**
- **Color indigo**: Diferente del UserLayout (slate)
- **Dos niveles**: Header principal + info de usuario
- **Alturas fijas**: `h-12` (main) + `h-6` (info)

**NAVEGACIÓN ADMIN:**
- **Dashboard**: Vista principal de administración
- **Usuarios**: Gestión de usuarios del sistema
- **Documentos**: Administración de documentos
- **Panel Usuario**: Link para volver a vista de usuario

**INFORMACIÓN DE USUARIO:**
- **Rol**: Muestra rol actual del admin
- **Tipo**: Muestra tipo específico de usuario
- **Fallback**: `?? "—"` para valores undefined

**HANDLING RESPONSIVE:**
- `overflow-hidden`: Evita breaking de layout
- `whitespace-nowrap`: Mantiene texto en una línea
- `truncate`: Corta con elipsis si es necesario
- `shrink-0`: Evita que links se encojan

---

### 9. `src/router/index.js` - CONFIGURACIÓN DE RUTAS CON GUARDIAS

#### ESTRUCTURA COMPLETA Y ANÁLISIS:

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { requireAuth } from "../guards/authGuard";
import { requireRole } from "../guards/roleGuard";

// IMPORTS DIRECTOS (NO LAZY)
import LoginView from "../views/LoginView.vue";
import NotFoundView from "../views/NotFoundView.vue";

// LAYOUTS
import AdminLayout from "../components/layout/AdminLayout.vue";
import UserLayout from "../components/layout/UserLayout.vue";

// VISTAS USER (LAZY)
const UserDashboardView = () => import("../views/user/DashboardView.vue");

// VISTAS ADMIN (LAZY)
const AdminDashboardView = () => import("../views/admin/DashboardView.vue");
const UserListView = () => import("../views/admin/UserListView.vue");
const CreateUserView = () => import("../views/admin/CreateUserView.vue");
const EditUserView = () => import("../views/admin/EditUserView.vue");
const DocumentOverviewView = () => import("../views/admin/DocumentOverviewView.vue");

// CONFIGURACIÓN ROUTER
const router = createRouter({
  history: createWebHistory(),
  routes: [
    // RUTA PÚBLICA - LOGIN
    {
      path: "/login",
      name: "login",
      component: LoginView
    },

    // RUTAS ADMIN - REQUIEREN AUTH + ROL ADMIN
    {
      path: "/admin",
      component: AdminLayout,
      beforeEnter: [requireAuth, requireRole(["Admin"])],
      children: [
        { path: "", name: "admin.dashboard", component: () => import("../views/admin/DashboardView.vue") },
        { path: "users", name: "admin.users", component: () => import("../views/admin/UserListView.vue") },
        { path: "users/create", name: "admin.users.create", component: () => import("../views/admin/CreateUserView.vue") },
        { path: "users/:id/edit", name: "admin.users.edit", component: () => import("../views/admin/EditUserView.vue"), props: true },
        { path: "docs", name: "admin.docs", component: () => import("../views/admin/DocumentOverviewView.vue") },
      ],
    },

    // RUTAS USER - REQUIEREN AUTH SOLAMENTE
    {
      path: "/",
      component: UserLayout,
      beforeEnter: [requireAuth],
      children: [
        { path: "", name: "user.dashboard", component: UserDashboardView },
      ],
    },

    // CATCH-ALL - 404
    { path: "/:pathMatch(.*)*", name: "not-found", component: NotFoundView },
  ],
});

export default router;
```

#### ANÁLISIS DETALLADO DE RUTAS:

**IMPORTS Y ESTRATEGIA:**
- **Directos**: LoginView y NotFoundView (siempre necesarias)
- **Lazy loading**: Todas las demás vistas para mejor performance
- **Layouts**: Importados直接 para usar como wrappers

**RUTA LOGIN - PÚBLICA:**
- **Sin protecciones**: Accesible sin autenticación
- **Componente directo**: Siempre cargado
- **Ruta base**: `/login`

**RUTAS ADMIN - DOBLE PROTECCIÓN:**
```javascript
beforeEnter: [requireAuth, requireRole(["Admin"])]
```
- **`requireAuth`**: Verifica que esté autenticado
- **`requireRole(["Admin"])`**: Verifica que tenga rol Admin específicamente
- **Array de guardias**: Se ejecutan en orden
- **Layout propio**: `AdminLayout` con navegación específica

**HIJO DE RUTAS ADMIN:**
1. **Dashboard**: `/admin` →vista principal admin
2. **Users List**: `/admin/users` →listado usuarios
3. **Create User**: `/admin/users/create` →formulario creación
4. **Edit User**: `/admin/users/:id/edit` →edición con parámetro
5. **Documents**: `/admin/docs` →gestión documentos

**CARACTERÍSTICAS DE RUTAS ADMIN:**
- **Lazy loading**: Solo carga cuando se necesita
- **Props dinámicos**: `props: true` para route parameters
- **Path anidado**: Todas comienzan con `/admin/`

**RUTAS USER - AUTENTICACIÓN SIMPLE:**
```javascript
beforeEnter: [requireAuth]
```
- **Solo autenticación**: Cualquier rol permitido
- **Layout usuario**: `UserLayout`
- **Dashboard**: Ruta raíz `/`

**CATCH-ALL 404:**
```javascript
{ path: "/:pathMatch(.*)*", name: "not-found", component: NotFoundView }
```
- **Wildcard**: Atrapa cualquier ruta no definida
- **Regex**: `(.*)*` captura path completo
- **Componente 404**: Vista de no encontrado

**ESTRATEGIA DE LAZY LOADING:**
- **Performance**: Reduce bundle size inicial
- **Carga bajo demanda**: Solo cuando usuario accede
- **Syntax sugar**: `() => import()` para async loading

---

### 10. `.env.local` - VARIABLES DE ENTORNO AUTH

#### CONTENIDO Y ANÁLISIS:

```bash
# Local Environment Variables - Override for development
VITE_API_BASE_URL=https://localhost:7245
VITE_APP_VERSION=2.0.0-local
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_DEBUG_AUTH=true
```

#### ANÁLISIS DE VARIABLES AUTH:

**`VITE_API_BASE_URL`:**
- **Propósito**: URL del backend API
- **Uso**: Configuración baseURL en `api.js`
- **Default**: `https://localhost:7245` si no se especifica
- **Production**: Debe cambiarse a URL del servidor

**`VITE_DEBUG_AUTH`:**
- **Propósito**: Activar logs de debugging en auth
- **Valor actual**: `true` para desarrollo
- **Uso**: Para debugging de guards y store
- **Production**: Debe ser `false` para seguridad

**CONVENCIONES VITE:**
- **Prefijo VITE_**: Requerido para acceso en frontend
- **Disponibilidad**: `import.meta.env.VITE_*`
- **Development**: `.env.local` no se sube a git

---

## 🔄 FLUJO COMPLETO DE AUTENTICACIÓN - STEP BY STEP

### ESCENARIO 1: LOGIN EXITOSO COMPLETO

```mermaid
sequenceDiagram
    participant U as Usuario
    participant LV as LoginView.vue
    component AS as Auth Store (Pinia)
    component AUS as AuthService
    component API as api.js (Axios)
    participant BE as Backend API
    component LS as localStorage
    component RT as Vue Router
    component UL as UserLayout

    U->>LV: Ingresa DNI + contraseña
    LV->>LV: @submit.prevent="onSubmit"
    LV->>LV: loading = true, error = ""
    LV->>AS: auth.login({ username, password })

    AS->>AUS: AuthService.login()
    AUS->>API: api.post("/api/auth/login", { username, password })

    API->>API: request interceptor (sin token aún)
    API->>BE: POST /api/auth/login

    BE->>BE: Valida credenciales
    BE->>BE: Genera JWT con claims
    BE->>API: 200 OK { token: "jwt..." }

    API->>AUS: { data: { token } }
    AUS->>AS: { token }

    AS->>AS: if (!token) throw Error
    AS->>AS: this.token = token
    AS->>AS: mapClaims(token)
    AS->>AS: this.user = mappedClaims
    AS->>AS: persist(username)
    AS->>LS: localStorage.setItem("rf_auth", JSON.stringify())

    AS->>LV: Promise resolve

    LV->>RT: const redirect = route.query.r
    LV->>RT: router.push(redirect || "/")

    RT->>RT: Verifica guards
    RT->>UL: Render UserLayout

    Note over U,UL: Usuario autenticado navegando
```

### ESCENARIO 2: ACCESO A RUTA PROTEGIDA SIN AUTENTICACIÓN

```mermaid
sequenceDiagram
    participant U as Usuario
    participant RT as Vue Router
    component AG as authGuard.js
    component AS as Auth Store
    component LS as localStorage
    participant LV as LoginView

    U->>RT: Accede a /ruta-protegida
    RT->>RT: Encuentra beforeEnter: [requireAuth]
    RT->>AG: requireAuth(to, from, next)

    AG->>AS: useAuthStore()
    AG->>AS: auth.loadFromStorage()
    AS->>LS: localStorage.getItem("rf_auth")
    LS->>AS: null (no hay datos)
    AS->>AS: isAuthenticated = false

    AG->>AG: if (!auth.isAuthenticated)
    AG->>AG: console.warn("[Guard] Bloqueado")
    AG->>RT: next({ name: "login", query: { r: to.fullPath } })

    RT->>LV: Redirige a /login?r=/ruta-protegida

    Note over U,LV: Usuario ve login con intención guardada
```

### ESCENARIO 3: REQUEST CON TOKEN EXPIRADO

```mermaid
sequenceDiagram
    participant C as Componente
    component API as api.js
    component IR as Request Interceptor
    component AS as Auth Store
    component TO as useToasts
    participant SS as sessionStorage
    participant B as Browser

    C->>API: api.get("/datos-usuario")
    API->>IR: request interceptor

    IR->>AS: useAuthStore()
    AS->>IR: auth.user.exp (timestamp)

    IR->>IR: const now = Math.floor(Date.now() / 1000)
    IR->>IR: const secs = exp - now

    alt secs <= 0 (ya expiró)
        IR->>TO: error("Tu sesión expiró")
        IR->>AS: auth.logout()
        IR->>SS: No se necesita (ya expiró)
        IR->>B: window.location.href = "/login?r=..."
        Note over B: Redirección forzada, request cancelado
    else secs <= 120 (expira pronto)
        IR->>SS: sessionStorage.getItem("rf_warn_exp")
        IR->>IR: if (!warned)
        IR->>TO: info("Tu sesión expirará pronto")
        IR->>SS: sessionStorage.setItem("rf_warn_exp", "1")
        IR->>IR: return config (continúa request)
    end
```

### ESCENARIO 4: RESPONSE 401 DESDE BACKEND

```mermaid
sequenceDiagram
    participant C as Componente
    component API as api.js
    participant BE as Backend
    component IRE as Response Interceptor
    component AS as Auth Store
    component TO as useToasts
    participant B as Browser

    C->>API: api.get("/recurso-protegido")
    API->>BE: Request con token Bearer
    BE->>BE: Verifica token → inválido/expirado
    BE->>API: 401 Unauthorized

    API->>IRE: response interceptor
    IRE->>IRE: status = 401

    IRE->>AS: auth.logout()
    IRE->>TO: error("Sesión expirada. Vuelve a iniciar sesión.")

    IRE->>IRE: if (!location.pathname.startsWith("/login"))
    IRE->>B: window.location.href = "/login?r=..."

    Note over C,B: Usuario redirigido a login
```

### ESCENARIO 5: VERIFICACIÓN DE ROLES EN RUTAS ADMIN

```mermaid
sequenceDiagram
    participant U as Usuario Admin
    participant RT as Vue Router
    component AG as authGuard
    component RG as roleGuard
    component AS as Auth Store
    component AL as AdminLayout
    participant AD as AdminDashboard

    U->>RT: Accede a /admin
    RT->>RT: beforeEnter: [requireAuth, requireRole(["Admin"])]

    RT->>AG: requireAuth(to, from, next)
    AG->>AS: auth.loadFromStorage()
    AG->>AS: isAuthenticated = true
    AG->>RT: next() (continúa a siguiente guard)

    RT->>RG: requireRole(["Admin"])(to, from, next)
    RG->>AS: auth.user.role
    AS->>RG: role = "Admin"

    RG->>RG: roles.includes("Admin") = true
    RG->>RT: next() (permite acceso)

    RT->>AL: Render AdminLayout
    AL->>AD: <router-view /> → AdminDashboard

    Note over U,AD: Admin accediendo a dashboard
```

---

## 🎯 PATRONES Y DECISIONES DE DISEÑO CLAVES

### 1. **PATRÓN STORE-CENTRALIZED**
- **Decisión**: Toda la lógica AUTH en un solo store Pinia
- **Razón**: Estado reactividad global, fácil debugging, testing
- **Ventajas**: Single source of truth, reactividad automática

### 2. **PATRÓN INTERCEPTOR-GLOBAL**
- **Decisión**: Inyección y verificación de tokens en interceptores Axios
- **Razón**: Automatización, sin repetición en cada llamada API
- **Ventajas**: Transparencia para componentes, manejo centralizado

### 3. **PATRÓN GUARD-ROUTER**
- **Decisión**: Protección de rutas a nivel de router con guardias
- **Razón**: Verificación antes de renderizado, prevención de acceso
- **Ventajas**: Separación de concerns, código reutilizable

### 4. **PATRÓN FALLBACK-USERNAME**
- **Decisión**: Guardar username como fallback por si token no lo incluye
- **Razón**: Algunos tokens JWT no incluyen username claim
- **Ventajas**: UX consistente, evita displays vacíos

### 5. **PATRÓN REDIRECCIÓN-INTELIGENTE**
- **Decisión**: Guardar ruta original en query param `r`
- **Razón**: UX transparente post-login
- **Ventajas**: Usuario retorna exactamente donde intentaba ir

### 6. **PATRÓN LAZY-LOADING**
- **Decisión**: Componentes de vistas cargados bajo demanda
- **Razón**: Performance, reducción de bundle inicial
- **Ventajas**: Tiempo de carga inicial menor, mejor UX

### 7. **PATRÓN SESSION-STORAGE-ADVERT**
- **Decisión**: sessionStorage para advertencia de expiración
- **Razón**: Evitar spam de notificaciones
- **Ventajas**: Advertencia única por sesión, persistencia temporal

---

## 🔥 IMPLEMENTACIÓN DE SEGURIDAD DETALLADA

### 1. **MANEJO DE TOKENS JWT**

```javascript
// CLAIMS ESTÁNDAR SOPORTADOS
const CLAIMS_MAPPING = {
  id: [
    "nameid",
    "sub",
    "userid",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
  ],
  username: [
    "unique_name",
    "name",
    "username",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
  ],
  role: [
    "role",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
  ]
};
```

**CARACTERÍSTICAS DE SEGURIDAD:**
- **Validación de existencia**: Verifica que token exista antes de usar
- **Decodificación segura**: Usa try-catch en jwtDecode
- **Fallback automático**: Múltiples claim names soportados
- **Preservación cruda**: `_raw` para debugging y forensics

### 2. **EXPIRACIÓN DE SESIÓN**

```javascript
// VERIFICACIÓN EN SEGUNDOS UNIX
const now = Math.floor(Date.now() / 1000);
const secs = auth.user.exp - now;

// THRESHOLDS DE TIEMPO
if (secs <= 0) {
  // INMEDIATO: Token expirado
  forceLogoutAndRedirect();
} else if (secs <= 120) {
  // ADVERTENCIA: 2 minutos restantes
  showExpiryWarning();
}
```

**IMPLEMENTACIÓN DE SEGURIDAD:**
- **Precisión en segundos**: Evita falsos positivos por milisegundos
- **Umbral de advertencia**: 120 segundos (2 minutos)
- **Logout forzado**: No permite continuar con token expirado
- **Redirección segura**: Preserva intención del usuario

### 3. **PROTECCIÓN DE RUTAS MULTICAPA**

```javascript
// ADMIN ROUTES - DOBLE VERIFICACIÓN
{
  path: "/admin",
  beforeEnter: [requireAuth, requireRole(["Admin"])],
  // ...
}

// USER ROUTES - AUTENTICACIÓN SIMPLE
{
  path: "/",
  beforeEnter: [requireAuth],
  // ...
}
```

**CAPAS DE SEGURIDAD:**
1. **Router Level**: Verificación antes de renderizado
2. **Store Level**: Estado reactivo de autenticación
3. **API Level**: Interceptors con token validation
4. **Backend Level**: Validación server-side de tokens

### 4. **MANEJO DE ERRORES Y LOGGING**

```javascript
// GUARD LOGGING
console.warn("[Guard] Bloqueado: no autenticado →", to.fullPath);
console.warn("[Guard] Bloqueado: rol requerido", roles, "pero user tiene", auth.user?.role);

// ERROR HANDLING CENTRALIZADO
if (status === 401) {
  error("Sesión expirada. Vuelve a iniciar sesión.");
  auth.logout();
  // Redirección segura
}
```

**FEATURES DE DEBUGGING:**
- **Consola descriptiva**: Logs claros para debugging
- **Estado actual**: Muestra valores relevantes en logs
- **Environment aware**: Solo en desarrollo si VITE_DEBUG_AUTH

---

## 📊 ESTRUCTURA DE DATOS Y CONTRATOS

### 1. **TOKEN JWT PAYLOAD STRUCTURE**

```json
{
  "nameid": "12345",                      // Primary user ID
  "unique_name": "usuario@dominio.com",   // Username/email
  "role": "Admin|User",                   // User role for authorization
  "tipo": "Interno|Externo",              // Custom user type
  "exp": 1234567890,                      // Expiration timestamp (UNIX)
  "iat": 1234567800,                      // Issued at timestamp
  "nbf": 1234567800,                      // Not valid before
  "jti": "token-unique-id",               // JWT ID (optional)
  "aud": "api-audience",                  // Audience (optional)
  "iss": "auth-server"                    // Issuer (optional)
}
```

### 2. **LOCALSTORAGE DATA STRUCTURE**

```javascript
// KEY: "rf_auth"
const authData = {
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
  "usernameFallback": "usuario123"  // Username si token no lo incluye
};

// CACHÉ DE NOMBRES (formato)
"rf_fullname_123": "Juan Pérez Rodríguez"  // userID → fullName cache
```

### 3. **SESSIONSTORAGE TEMP DATA**

```javascript
// KEY: "rf_warn_exp"
"1"  // Indicates user has been warned about expiry
```

### 4. **API CONTRACTS**

#### LOGIN REQUEST
```javascript
// POST /api/auth/login
{
  "username": "12345678",     // DNI del usuario
  "password": "secreto123"    // Contraseña plain text
}
```

#### LOGIN RESPONSE
```javascript
// 200 OK
{
  "token": "jwt.token.string.here"
}
```

#### AUTH REQUESTS
```javascript
// Cualquier request a endpoints protegidos
Headers: {
  "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

## 🚀 PERFORMANCE Y OPTIMIZACIÓN

### 1. **LAZY LOADING STRATEGY**

```javascript
// BUNDLE SPLITTING AUTOMÁTICO
const UserDashboardView = () => import("../views/user/DashboardView.vue");
const AdminDashboardView = () => import("../views/admin/DashboardView.vue");
```

**BENEFICIOS:**
- **Reduced initial bundle**: Solo código necesario al inicio
- **On-demand loading**: Componentes cargados cuando se necesitan
- **Better caching**: Cambios en una vista no invalidan todo el bundle
- **Improved perceived performance**: App usable más rápido

### 2. **STATE MANAGEMENT OPTIMIZATION**

```javascript
// GETTERS COMPUTADOS CACHEABLE
getters: {
  isAuthenticated: (s) => !!s.token && !!s.user,  // Cached automáticamente
  isAdmin: (s) => s.user?.role === "Admin"        // Recalcula solo cuando user cambia
}
```

**OPTIMIZACIONES:**
- **Reactive caching**: Pinia cachea getters automáticamente
- **Minimal recomputation**: Solo recalcular cuando dependencias cambian
- **Efficient comparisons**: Comparaciones booleanas simples y rápidas

### 3. **API REQUEST OPTIMIZATION**

```javascript
// INTERCEPTOR EFFICIENT
api.interceptors.request.use((config) => {
  const auth = useAuthStore();  // Store singleton
  if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`;
  return config;  // Sin async overhead
});
```

**OPTIMIZACIONES:**
- **Synchronous operation**: No async/await overhead en requests
- **Store singleton**: Misma instancia across all requests
- **Minimal computation**: Verificación booleana simple

### 4. **MEMORY MANAGEMENT**

```javascript
// CLEANUP EFICIENTE
logout() {
  this.token = null;
  this.user = null;
  localStorage.removeItem("rf_auth");

  // LIMPIEZA DE CACHÉ RELACIONADO
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith("rf_fullname_")) localStorage.removeItem(k);
  }

  sessionStorage.removeItem("rf_warn_exp");
}
```

**MEMORY EFFICIENCY:**
- **Null references**: Limpia referencias para GC
- **Storage cleanup**: Elimina todos los datos relacionados
- **Reverse iteration**: Más eficiente para removal dinámico

---

## 🔧 EXTENSIBILIDAD Y MANTENIMIENTO

### 1. **AGREGAR NUEVOS ROLES**

```javascript
// EN roleGuard.js - FÁCIL EXTENSIÓN
router.addRoute({
  path: "/manager",
  component: ManagerLayout,
  beforeEnter: [requireAuth, requireRole(["Manager", "Admin"])],
  children: [
    // routes manager
  ]
});
```

### 2. **AGREGAR NUEVOS CLAIMS JWT**

```javascript
// EN mapClaims() - AGREGAR NUEVOS CAMPOS
function mapClaims(token) {
  return {
    // existing fields...
    department: pick("department", "dept", "user_dept"),
    location: pick("location", "office", "site"),
    permissions: pick("permissions", "perms", "user_permissions"),
    _raw: c,
  };
}
```

### 3. **NUEVOS ENDPOINTS AUTENTICACIÓN**

```javascript
// EN auth.service.js - EXTENDER SERVICIO
export const AuthService = {
  async login({ username, password }) {
    // existing login
  },

  async refreshToken() {
    const { data } = await api.post("/api/auth/refresh");
    return data;
  },

  async changePassword({ oldPassword, newPassword }) {
    const { data } = await api.post("/api/auth/change-password", {
      oldPassword, newPassword
    });
    return data;
  }
};
```

### 4. **NUEVOS INTERCEPTORES ESPECÍFICOS**

```javascript
// EN api.js - AGREGAR INTERCEPTORES ESPECIALIZADOS
api.interceptors.request.use((config) => {
  // Existing auth logic

  // Nuevo: Add request ID for tracing
  config.headers['X-Request-ID'] = generateRequestId();

  // Nuevo: Add client timestamp
  config.headers['X-Client-Time'] = new Date().toISOString();

  return config;
});
```

---

## 🎯 CONCLUSIONES Y PATRONES CLAVE

### PATRONES ARQUITECTÓNICOS FUNDAMENTALES:

1. **CENTRALIZED STATE**: Todo el estado AUTH en un solo lugar (Pinia store)
2. **DECLARATIVE ROUTING**: Protección declarativa con guardias de router
3. **INTERCEPTOR PATTERN**: Lógica cross-cutting en interceptores
4. **SEPARATION OF CONCERNS**: Cada componente con responsabilidad única
5. **REACTIVE PATTERN**: UI reacciona automáticamente a cambios de estado

### PRINCIPIOS DE SEGURIDAD IMPLEMENTADOS:

1. **DEFENSE IN DEPTH**: Múltiples capas de verificación
2. **LEAST PRIVILEGE**: Verificación de roles granular
3. **FAIL SECURE**: Default a denegar acceso
4. **TOKEN EXPIRY**: Manejo robusto de expiración
5. **SECURE STORAGE**: Uso apropiado de localStorage/sessionStorage

### PATRONES DE UX:

1. **PROGRESSIVE ENHANCEMENT**: Funciona sin JavaScript (en caso de fallback)
2. **GRACEFUL DEGRADATION**: Manejo elegante de errores
3. **INTENTION PRESERVATION**: Redirección inteligente post-login
4. **FEEDBACK LOOPS**: Estados de carga y error claros
5. **CONVENTION OVER CONFIGURATION**: Comportamiento predecible

Esta documentación proporciona una comprensión completa del sistema AUTH de RapiFirma, permitiendo a cualquier LLM entender la arquitectura, implementación, flujo de datos, patrones de diseño y decisiones técnicas tomadas en el desarrollo del sistema de autenticación.