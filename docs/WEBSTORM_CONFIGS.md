# WebStorm Run Configurations

## 📋 Configuraciones Disponibles

### 🖥️ **Backend Configurations**
- **Backend Dev** - Desarrollo normal (usa `.env.dev`)
- **Backend Dev (Prod API)** - Desarrollo con configuración de producción (usa `.env.prod-api`) 
- **Backend Production** - Modo producción (usa `.env.prod`)

### 🌐 **Frontend Configurations**
- **Frontend Dev** - Electron + Next.js desarrollo (usa `.env.dev`)
- **Frontend Dev (Next.js Only)** - Solo Next.js desarrollo (usa `.env.dev`)
- **Frontend Dev (Prod API)** - Electron + Next.js con API producción (usa `.env.prod-api`)
- **Frontend Build (Prod)** - Build de producción (usa `.env.prod`)
- **Frontend Start (Prod)** - Start de producción (usa `.env.prod`)

### 🔗 **Compound Configurations**
- **Full Development** - Backend Dev + Frontend Dev simultáneo
- **Full Development (Prod API)** - Backend Dev (Prod API) + Frontend Dev (Prod API) simultáneo

### 🐳 **Docker Configurations**
- **Docker Compose Dev** - Stack completo desarrollo (usa `.env.docker.dev`)
- **Docker Dev API Only** - Solo MySQL + API desarrollo (usa `.env.docker.dev`)
- **Docker Compose Prod** - Stack completo producción (usa `.env.docker.prod`)

## 🎯 **Casos de Uso Recomendados**

### Desarrollo Normal
1. Ejecutar **"Full Development"** para tener todo funcionando localmente

### Testing con API de Producción
1. Ejecutar **"Full Development (Prod API)"** para probar contra la API real

### Solo Development API
1. Ejecutar **"Docker Dev API Only"** para MySQL + Backend
2. Ejecutar **"Frontend Dev (Next.js Only)"** para solo el frontend web

### Desarrollo con Docker
1. Ejecutar **"Docker Compose Dev"** para desarrollo completo en Docker

## ⚙️ **Configuración Automática**

Todas las configuraciones usan automáticamente:
- ✅ Los archivos `.env.*` correctos para cada entorno
- ✅ Los scripts npm actualizados con `dotenv-cli`
- ✅ Variables de entorno específicas por ambiente
- ✅ Logging apropiado para cada modo

## 🔄 **Flujo de Trabajo Sugerido**

1. **Desarrollo diario**: Usar "Full Development"
2. **Testing API**: Usar "Full Development (Prod API)" 
3. **Solo frontend**: Usar "Frontend Dev (Next.js Only)"
4. **Docker testing**: Usar "Docker Compose Dev"

## 📝 **Notas Técnicas**

- Las configuraciones compound ejecutan múltiples servicios en paralelo
- Los archivos `.env.*` se cargan automáticamente por `dotenv-cli`
- Docker configurations usan archivos `.env.docker.*` separados
- Logging se controla automáticamente por `NODE_ENV`