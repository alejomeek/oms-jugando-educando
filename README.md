# OMS - Didácticos Jugando y Educando

Sistema de gestión de pedidos (OMS) que centraliza órdenes de múltiples canales e-commerce en una sola interfaz operativa.

## Características

- ✅ **Dashboard unificado** - Visualiza pedidos de Mercado Libre y Wix en un solo lugar
- ✅ **Sincronización manual** - Botones para sincronizar órdenes desde las APIs
- ✅ **Gestión de estados** - Cambia estados: nuevo → preparando → listo → enviado
- ✅ **Filtros avanzados** - Por canal, estado, búsqueda por ID/cliente
- ✅ **Detalle completo** - Modal con toda la información de cada pedido
- ✅ **Historial de cambios** - Auditoría de todos los cambios de estado
- ✅ **Identificación de packs** - Soporte para packs de Mercado Libre

## Stack Técnico

- **Frontend:** React 19 + TypeScript + Vite
- **Estilos:** Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Realtime)
- **Estado:** React Query (@tanstack/react-query v5)
- **HTTP Client:** Axios
- **Date handling:** date-fns

---

## 🚀 Setup del Proyecto

### Requisitos Previos

- Node.js 18+ y npm
- Cuenta de Supabase (gratuita)
- Credenciales de Mercado Libre (seller ID, API keys)
- Credenciales de Wix (API key, site ID)

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd oms-jugando-educando
```

### 2. Instalar Dependencias

```bash
npm install
```

Esto instalará:
- React 19 y React DOM
- @supabase/supabase-js
- @tanstack/react-query
- axios
- date-fns
- Tailwind CSS v4
- TypeScript y herramientas de desarrollo

### 3. Configurar Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env.local
```

Edita `.env.local` y completa todas las variables:

```bash
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui

# Mercado Libre
VITE_ML_ACCESS_TOKEN=APP_USR-tu_access_token
VITE_ML_REFRESH_TOKEN=TG-tu_refresh_token
VITE_ML_SELLER_ID=132688207
VITE_ML_CLIENT_ID=tu_client_id
VITE_ML_CLIENT_SECRET=tu_client_secret

# Wix
VITE_WIX_API_KEY=IST.tu_api_key
VITE_WIX_SITE_ID=tu-site-id-uuid
```

#### Dónde Obtener las Credenciales

**Supabase:**
1. Crea un proyecto en [app.supabase.com](https://app.supabase.com)
2. Ve a Settings → API
3. Copia `Project URL` y `anon public` key

**Mercado Libre:**
1. Crea una aplicación en [developers.mercadolibre.com](https://developers.mercadolibre.com.co)
2. Obtén `client_id` y `client_secret`
3. Completa el flujo OAuth para obtener `access_token` y `refresh_token`
4. El `seller_id` es tu ID de vendedor

**Wix:**
1. Ve a [Wix Developers](https://dev.wix.com/)
2. Crea una API Key en tu dashboard
3. Obtén el Site ID desde la configuración de tu sitio

### 4. Configurar Base de Datos en Supabase

1. Accede a tu proyecto en [app.supabase.com](https://app.supabase.com)
2. Ve a la sección **SQL Editor** en el menú lateral
3. Crea una nueva query
4. Copia y pega el contenido completo de `supabase/schema.sql`
5. Haz click en **Run** para ejecutar el script
6. Verifica que las tablas se crearon en **Table Editor**

El script crea:
- ✅ Tabla `orders` con todos los campos y constraints
- ✅ Tabla `order_status_history` para auditoría
- ✅ 7 índices para optimización
- ✅ Función y trigger para `updated_at`
- ✅ Políticas RLS permisivas para MVP

### 5. Ejecutar la Aplicación

```bash
npm run dev
```

La aplicación se abrirá en [http://localhost:5173](http://localhost:5173)

---

## 🎯 Uso de la Aplicación

### Primera Sincronización

1. Haz click en **"Sincronizar Mercado Libre"** para traer órdenes de ML
2. Haz click en **"Sincronizar Wix"** para traer órdenes de Wix
3. Las órdenes aparecerán en la tabla con estado "Nuevo"

### Filtrar Órdenes

- **Búsqueda:** Escribe ID de orden, nickname o email del cliente
- **Canal:** Filtra por Mercado Libre o Wix
- **Estado:** Filtra por nuevo, preparando, listo, enviado, cancelado
- **Limpiar filtros:** Botón para resetear todos los filtros

### Ver Detalle de Orden

1. Haz click en cualquier fila de la tabla
2. Se abrirá un modal con toda la información:
   - Información general
   - Datos del cliente
   - Dirección de envío
   - Productos con imágenes
   - Totales y pagos
   - Historial de estados

### Cambiar Estado de Orden

1. Abre el detalle de una orden
2. En la sección "Cambiar Estado", selecciona el nuevo estado
3. Haz click en **"Actualizar Estado"**
4. El cambio se registrará en el historial automáticamente

---

## 🛠️ Scripts Disponibles

```bash
# Desarrollo con hot reload
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linter
npm run lint
```

---

## 📁 Estructura del Proyecto

```
oms-jugando-educando/
├── src/
│   ├── components/
│   │   ├── ui/              # Componentes base reutilizables
│   │   ├── orders/          # Componentes específicos de órdenes
│   │   └── layout/          # Componentes de layout (futuro)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilidades y tipos
│   ├── pages/               # Páginas principales
│   ├── services/            # Integraciones con APIs
│   └── styles/              # Estilos globales
├── supabase/
│   ├── schema.sql           # Schema de la base de datos
│   └── README.md            # Documentación de DB
├── .env.example             # Template de variables de entorno
└── README.md                # Este archivo
```

---

## 🐛 Troubleshooting

### Error: "Faltan variables de entorno"

**Problema:** La aplicación muestra un error al cargar.

**Solución:**
1. Verifica que `.env.local` existe en la raíz del proyecto
2. Confirma que todas las variables tienen valores (no están vacías)
3. Reinicia el servidor de desarrollo (`Ctrl+C` y `npm run dev`)
4. Las variables deben empezar con `VITE_` para ser accesibles

### Error al sincronizar Mercado Libre (401 Unauthorized)

**Problema:** "Token expirado" al sincronizar ML.

**Solución:**
1. El sistema intentará refrescar el token automáticamente
2. Si falla, verifica en la consola el log con los nuevos tokens
3. Actualiza `VITE_ML_ACCESS_TOKEN` y `VITE_ML_REFRESH_TOKEN` en `.env.local`
4. Reinicia el servidor

### Error al sincronizar Wix (401)

**Problema:** "API key inválido" al sincronizar Wix.

**Solución:**
1. Verifica que el `VITE_WIX_API_KEY` es correcto
2. Confirma que el `VITE_WIX_SITE_ID` corresponde al sitio correcto
3. La API key debe ser tipo IST (Instance Secret Token)
4. Verifica permisos de la API key en Wix Developers

### No aparecen órdenes después de sincronizar

**Problema:** Sincronización exitosa pero tabla vacía.

**Solución:**
1. Abre la consola del navegador (F12)
2. Verifica mensajes de error
3. Confirma en Supabase Table Editor que las órdenes se guardaron
4. Verifica que no hay filtros activos que oculten las órdenes
5. Revisa que el schema de DB se aplicó correctamente

### Error de CORS en las APIs

**Problema:** "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solución:**
- Las APIs de ML y Wix ya tienen CORS configurado para desarrollo
- Si el error persiste, verifica que las URLs de las APIs son correctas
- No uses proxies ni modificaciones de CORS

### Build falla con errores de TypeScript

**Problema:** `npm run build` muestra errores de tipos.

**Solución:**
1. Ejecuta `npm install` para asegurar que todas las dependencias están instaladas
2. Verifica que `tsconfig.app.json` tiene la configuración de paths correcta
3. Ejecuta `npm run build` de nuevo
4. Si el error persiste, borra `node_modules` y `package-lock.json`, luego `npm install`

### Problema de CSS: estilos de Tailwind no se aplican

**Problema:** La interfaz se ve sin estilos.

**Solución:**
1. Verifica que `src/index.css` contiene `@import "tailwindcss";`
2. Confirma que `postcss.config.js` usa `@tailwindcss/postcss`
3. Reinicia el servidor de desarrollo
4. Limpia la caché: borra carpeta `dist` y `node_modules/.vite`

### La tabla de órdenes está en blanco

**Problema:** "No se encontraron órdenes" pero deberían existir.

**Solución:**
1. Verifica en Supabase Table Editor que hay datos en `orders`
2. Revisa la consola del navegador para errores de Supabase
3. Confirma que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` son correctos
4. Verifica que las políticas RLS están habilitadas y permiten acceso

---

## 📚 Documentación Adicional

- **Base de Datos:** Ver `supabase/README.md` para detalles del schema
- **CLAUDE.md:** Especificaciones completas del proyecto
- **React Query:** [Documentación oficial](https://tanstack.com/query/latest)
- **Supabase:** [Documentación oficial](https://supabase.com/docs)
- **Mercado Libre API:** [Developers](https://developers.mercadolibre.com.co)
- **Wix API:** [Dev Docs](https://dev.wix.com/docs)

---

## 🔐 Seguridad

⚠️ **IMPORTANTE:**
- **NUNCA** commitees el archivo `.env.local` al repositorio
- `.gitignore` ya está configurado para ignorar archivos `.env*`
- Las políticas RLS actuales son permisivas para MVP
- Antes de producción, implementa autenticación y políticas restrictivas

---

## 🚀 Próximos Pasos (Post-MVP)

- [ ] Implementar autenticación de usuarios
- [ ] Agregar roles y permisos
- [ ] Integrar Falabella y Rappi
- [ ] Webhooks automáticos para sincronización
- [ ] Impresión de etiquetas de envío
- [ ] Reportes y analytics
- [ ] Notificaciones push/email
- [ ] PWA / App móvil

---

## 📝 Licencia

Proyecto privado - Didácticos Jugando y Educando

---

## 🤝 Soporte

Para problemas o preguntas:
1. Revisa la sección de Troubleshooting arriba
2. Consulta `CLAUDE.md` para especificaciones técnicas
3. Revisa la documentación en `supabase/README.md`

---

**Última actualización:** Enero 2026
**Versión:** 1.0.0 (MVP)
