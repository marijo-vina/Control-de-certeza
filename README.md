# Control de Certeza — Mi Realidad Financiera

Aplicación web progresiva diseñada para el control financiero, reducción de ansiedad y gestión de presupuestos en periodos de transición o ingresos variables.

## 🚀 Tecnologías
- **React + Vite**
- **Tailwind CSS v4**
- **Lucide React Icons**
- **Supabase** (Auth con verificación de correo, PostgreSQL, Row Level Security)
- **Netlify** (Despliegue y hosting SPA)

## ✨ Características Principales
- **Pestaña Hoy**: Visualización del *Disponible Libre Real*, Semáforo de Estabilidad (🔴/🟡/🟢/🔵), Semanas de tranquilidad (*Runway*), Pagos comprometidos y últimos registros con reversión automática.
- **Pestaña Apartados**: Metas de corto plazo (🎯), compras planificadas (🛒), gastos recurrentes (🔄) y fondos de seguridad (🛡️) con flujos de abono y retiro directo.
- **Pestaña Futuro**: Embudo de ingresos por certeza (🟢 Confirmado, 🟡 Esperado, ⚪ Posible), cálculo de mínimo de supervivencia configurable y simulador interactivo *"¿Qué pasa si...?"*.
- **Pestaña Agenda**: Calendario mensual con días de corte de compromisos, fechas estimadas de cobro y línea de tiempo cronológica.
- **Validación y Moneda Mexicana (MXN)** en todos los formularios y cifras.
- **Seguridad**: Autenticación con verificación de correo electrónico y aislamiento de datos por usuario vía RLS.

## 📦 Instalación y Desarrollo Local
```bash
npm install
npm run dev
```

## 🌐 Variables de Entorno (Netlify / Producción)
Configura en Netlify:
- `VITE_SUPABASE_URL`: URL del proyecto de Supabase.
- `VITE_SUPABASE_ANON_KEY`: Llave pública anónima de Supabase.
