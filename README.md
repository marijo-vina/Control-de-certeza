# Control de Certeza — Mi Realidad Financiera

Aplicación web progresiva diseñada para el control financiero, reducción de ansiedad y gestión de presupuestos en periodos de transición o ingresos variables.

## 🚀 Tecnologías
- **React + Vite**
- **Tailwind CSS v4**
- **Lucide React Icons**
- **Supabase** (Auth con verificación de correo; la app todavía inicia sesión aquí)
- **Prisma Postgres + Prisma ORM 7** (las tablas `settings`, `apartados`, `compromisos`, `ingresos_variables` y `transactions` ya viven en esta base)
- **Netlify** (Despliegue y hosting SPA)

## ✨ Características Principales
- **Pestaña Hoy**: Visualización del *Disponible Libre Real*, Semáforo de Estabilidad (🔴/🟡/🟢/🔵), Semanas de tranquilidad (*Runway*), Pagos comprometidos y últimos registros con reversión automática.
- **Pestaña Apartados**: Metas de corto plazo (🎯), compras planificadas (🛒), gastos recurrentes (🔄) y fondos de seguridad (🛡️) con flujos de abono y retiro directo.
- **Pestaña Futuro**: Embudo de ingresos por certeza (🟢 Confirmado, 🟡 Esperado, ⚪ Posible), cálculo de mínimo de supervivencia configurable y simulador interactivo *"¿Qué pasa si...?"*.
- **Pestaña Agenda**: Calendario mensual con días de corte de compromisos, fechas estimadas de cobro y línea de tiempo cronológica.
- **Validación y Moneda Mexicana (MXN)** en todos los formularios y cifras.
- **Seguridad**: Autenticación con verificación de correo electrónico y aislamiento de datos por usuario vía RLS.

## Actividad 3.3 — WebSockets

La vista de la actividad la sirve Express, no los formularios de la app. En una terminal:

```bash
npm install
npm start
```

Abre http://localhost:3000. La consola del navegador debe decir `Socket conectado` y mostrar los productos actuales. Desde Postman, sin recargar esa página:

- `POST http://localhost:3000/api/productos` con `{ "nombre": "Café", "precio": 45, "descripcion": "Taza" }`
- `PUT http://localhost:3000/api/productos/:id`
- `DELETE http://localhost:3000/api/productos/:id`

`DATABASE_URL` apunta a Prisma Postgres y se lee desde `.env`.

## 📦 Instalación y Desarrollo Local
```bash
npm install
npm run dev
```

## 🌐 Variables de Entorno (Netlify / Producción)
Configura en Netlify:
- `VITE_SUPABASE_URL`: URL del proyecto de Supabase.
- `VITE_SUPABASE_ANON_KEY`: Llave pública anónima de Supabase.
