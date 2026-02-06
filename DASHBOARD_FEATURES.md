# Dashboard Ejecutivo - Características

## Descripción General

El módulo Dashboard ha sido completamente renovado con 10 secciones especializadas de análisis y reportería en tiempo real.

## Secciones Principales

### 1. **Dashboard Ejecutivo** (ExecutiveDashboard)
KPIs principales en tiempo real:
- Clientes activos vs totales
- Ingresos cobrados y pendientes
- Cartera vencida
- Órdenes de servicio activas
- Activos en EOL
- DSO promedio
- Tiempo promedio de servicio
- Resumen financiero con flujo de caja
- Indicadores operativos clave

### 2. **Análisis de Clientes** (CustomerAnalytics)
Parametría completa de clientes con distribución por:
- Tipo de cliente (casa, comercio, banco)
- Tecnología de comunicación (teléfono, celular, dual)
- Tipo de propiedad
- Clasificación de crédito
- Tipo de cuenta (individual, consolidado)
- Ciclo de facturación
- Estado del cliente
- Plan de monitoreo

### 3. **Análisis de Cartera** (PortfolioAnalysis)
Estado de la cartera:
- Clientes activos, inactivos y suspendidos
- Cuentas individuales vs consolidadas
- Ingresos totales por cartera
- Ingreso promedio por cliente
- Distribución visual por estado y tipo

### 4. **Buró de Crédito** (CreditBureau)
Reporte completo de comportamiento crediticio:
- Clasificación: Puntuales, Retrasados (1-15 días), Morosos (15+ días)
- Historial de pagos por cliente
- Montos pagados, pendientes y vencidos
- Días de mora máximos por cliente
- Filtros por clasificación de crédito
- Tabla detallada con contacto y análisis

### 5. **Análisis de Servicios** (ServiceAnalytics)
Métricas operativas de servicios:
- Total de órdenes de servicio
- Tiempo promedio de servicio
- Costo promedio por servicio
- Análisis detallado por tipo de servicio:
  - Reactivo, Preventivo, Correctivo, Instalación, Mejora
  - Tiempos promedio por tipo
  - Costos promedio por tipo
  - Ingresos totales por tipo
- Rentabilidad por servicio

### 6. **Productividad de Técnicos** (TechnicianProductivity)
Métricas de desempeño:
- Técnico destacado del período
- Total de servicios por técnico
- Servicios completados
- Servicios últimos 30 días
- Servicios por día
- Tiempo promedio de servicio
- Ingresos generados por técnico
- Ranking visual de técnicos

### 7. **Análisis Financiero** (FinancialAnalytics)
Estado financiero completo:
- Ingresos totales cobrados
- Utilidad bruta
- Margen de utilidad
- Costos operativos
- Flujo de caja:
  - Cobrado
  - Por cobrar
  - Vencido
- Análisis de rentabilidad con gráficas
- Tendencias de ingresos mensuales (últimos 12 meses)
- Proyecciones financieras

### 8. **Reporte de Inventario** (InventoryReport)
Estado del inventario:
- Total de productos en catálogo
- Valor total del inventario
- Productos con stock bajo
- Productos sin stock
- Tabla detallada con:
  - Stock actual vs mínimo
  - Costo unitario
  - Valor total por producto
  - Estado de stock (OK, Bajo, Sin stock)

### 9. **Análisis de Mora** (AgingReport)
Aging de cartera detallado:
- Distribución por buckets:
  - Actual (no vencido)
  - 0-30 días
  - 31-60 días
  - 61-90 días
  - 90+ días
- Análisis por cliente con montos en cada bucket
- Totales consolidados
- Visualización con colores por nivel de riesgo

### 10. **Tendencias Temporales** (TemporalTrends)
Análisis de estacionalidad y tendencias:
- Servicios por mes (últimos 12 meses)
- Ingresos mensuales
- Nuevos clientes por mes
- Costo promedio por servicio por mes
- Gráficas de barras comparativas
- Tabla resumen con todos los indicadores

## Características Técnicas

### Diseño Visual
- Gradientes profesionales sin colores violetas
- Cards informativos con iconos
- Tablas responsivas con scroll horizontal
- Gráficas de barras de progreso
- Badges de estado con colores semánticos
- Animaciones suaves de transición

### Rendimiento
- Carga de datos en paralelo con Promise.all
- Estados de carga con spinners
- Manejo de errores robusto
- Consultas optimizadas a Supabase

### Interactividad
- Navegación por pestañas
- Filtros dinámicos (Buró, Inventario)
- Tablas con hover effects
- Responsive en todos los tamaños de pantalla

## Datos en Tiempo Real

Todos los reportes se actualizan automáticamente al cargar cada sección, mostrando datos en tiempo real de:
- Clientes
- Órdenes de servicio
- Facturas
- Activos
- Inventario
- Técnicos

## Próximas Características (Recomendadas)

1. **Exportación de Reportes**
   - Excel (XLSX)
   - PDF con gráficas
   - CSV para análisis externo

2. **Reportes Automáticos**
   - Programación de envío por email
   - Frecuencia configurable (diaria, semanal, mensual)
   - Suscripciones personalizadas

3. **Filtros Avanzados**
   - Rango de fechas personalizado
   - Filtros multi-criterio
   - Guardar filtros favoritos

4. **Gráficas Interactivas**
   - Charts con Chart.js o Recharts
   - Gráficas de línea para tendencias
   - Gráficas de pastel para distribuciones
   - Gráficas de barras apiladas

5. **Comparación de Períodos**
   - Mes vs mes anterior
   - Año vs año anterior
   - Crecimiento porcentual

## Uso

```tsx
import { Dashboard } from './components/Dashboard/Dashboard';

// El componente maneja toda la navegación interna
<Dashboard />
```

Cada sección es independiente y puede ser utilizada por separado si se requiere.

## Base de Datos

Para utilizar todas las características, asegúrate de que las migraciones de base de datos estén aplicadas. Las vistas y funciones optimizadas están disponibles en:

```
supabase/migrations/create_dashboard_analytics_views.sql
```

## Soporte

Todos los componentes están diseñados para funcionar con los datos existentes del sistema ERP y se adaptan automáticamente a los datos disponibles.
