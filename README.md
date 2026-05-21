# practiq-fe

Frontend de Practiq — plataforma educativa tipo Kumon construida en Vue 3 + TypeScript.

## Requisitos

- Node.js 18+
- `auth-api-be` corriendo en el puerto 8082
- `practiq-be` corriendo en el puerto 8083

## Configuración

Copia `.env.example` a `.env` y ajusta los valores:

```bash
cp .env.example .env
```

Variables de entorno:

| Variable               | Descripción                          | Default                    |
|-----------------------|--------------------------------------|----------------------------|
| `VITE_AUTH_API_URL`   | URL del servicio de autenticación    | `http://localhost:8082`    |
| `VITE_PRACTIQ_API_URL`| URL del backend de Practiq           | `http://localhost:8083`    |

## Instalación

```bash
npm install
```

## Ejecución

```bash
# Servidor de desarrollo con hot-reload
npm run dev
```

La app queda disponible en `http://localhost:5173`.

## Build para producción

```bash
npm run build
```

Los archivos compilados quedan en `dist/`. Para previsualizarlos:

```bash
npm run preview
```

## Arquitectura

```
practiq-fe/
├── src/
│   ├── api/request/       # Instancias Axios (authApi, practiqApi)
│   ├── assets/            # Estilos globales (CSS variables, utilidades)
│   ├── composables/       # Lógica reutilizable (Vue composables)
│   ├── layouts/           # Layouts de página (Teacher, Student)
│   ├── queries/           # Queries TanStack Vue Query
│   ├── router/            # Rutas y guards de autenticación
│   ├── services/          # Servicios API por dominio
│   ├── stores/            # Estado global Pinia (auth)
│   ├── types/             # Tipos TypeScript compartidos
│   └── views/
│       ├── LoginView.vue
│       ├── teacher/
│       │   ├── DashboardView.vue   # Gestión de cursos
│       │   └── CourseDetailView.vue # Temas, ejercicios, materiales, hojas
│       └── student/
│           ├── DashboardView.vue   # Progreso y cursos inscritos
│           └── PracticeView.vue    # Sesión de práctica (canvas + IA)
├── public/
└── index.html
```

## Flujo de autenticación

1. El usuario inicia sesión en `/login` → se llama a `auth-api-be`
2. El JWT recibido se guarda en `localStorage` como `practiq_token`
3. Se sincroniza el perfil con `practiq-be` via `POST /api/profile`
4. Se redirige según rol: `/teacher/dashboard` o `/student/dashboard`
5. El token se inyecta automáticamente en todas las peticiones a `practiq-be`

## Funcionalidades principales

- **Docentes**: crear cursos, temas, ejercicios (texto/ecuación/canvas/opción múltiple), materiales, hojas de práctica, ver alumnos inscritos
- **Estudiantes**: inscribirse a cursos, completar hojas de práctica, dibujar respuestas en canvas, recibir ayuda del asistente IA, ver progreso y puntuación Kumon
- **Algoritmo Kumon**: nivel sube si score ≥ 90%, se repite si < 70%, pistas penalizan −2pts, perfección suma +5pts

## Stack técnico

- [Vue 3](https://vuejs.org/) + Composition API + `<script setup>`
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) como bundler
- [Pinia](https://pinia.vuejs.org/) para estado global
- [TanStack Vue Query](https://tanstack.com/query/latest) para cache de datos
- [Axios](https://axios-http.com/) para peticiones HTTP
- [PrimeVue 4](https://primevue.org/) con tema Aura (violet) para componentes UI
