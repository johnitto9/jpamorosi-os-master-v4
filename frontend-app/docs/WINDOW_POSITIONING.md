# Sistema de Posicionamiento de Ventanas - jpamorosi.os

## 🎯 Nuevo Sistema de Posicionamiento

### **Problema Anterior:**
Las ventanas se posicionaban en cascada linear, causando que Projects y Contact queden muy abajo:
```
About (100,100) → Skills (150,150) → Timeline (200,200) → Projects (250,250) → Contact (300,300)
```

### **Solución Actual:**
Sistema de **dos columnas** que reinicia las últimas dos ventanas arriba a la derecha:

```
🖥️ DESKTOP LAYOUT (≥1201px)
┌─────────────────────────────────────┐
│  About (100,100)     Projects (450,120)  │
│    ↓                   ↓           │
│  Skills (150,150)   Contact (500,170)    │
│    ↓                             │
│  Timeline (200,200)              │
└─────────────────────────────────────┘
```

## 📱 Responsividad Implementada

### **Breakpoints:**
- **Desktop** (≥1201px): Tamaño completo (100%)
- **Tablet** (1025px - 1200px): Reducción sutil (92%)
- **Small Tablet** (769px - 1024px): Reducción moderada (85%)
- **Mobile** (≤768px): Comportamiento existente (ventana única)

### **Características Responsivas:**

#### **🖥️ Desktop (≥1201px):**
- Posiciones originales completas
- Tamaño 100% - sin cambios
- Offset de cascada: 30px

#### **📱 Tablet (1025px - 1200px):**
- Ventanas 8% más pequeñas (92% del original)
- Offset de cascada reducido: 20px  
- Posiciones ligeramente ajustadas

#### **📱 Small Tablet (769px - 1024px):**
- Ventanas 15% más pequeñas (85% del original) 
- Offset de cascada reducido: 20px
- Posiciones ajustadas proporcionalmente

#### **📱 Mobile (≤768px):**
- Comportamiento existente: una sola ventana fullscreen

## 🎨 Distribución Estética

### **Primera Columna (Izquierda):**
1. **About** - (100, 100) - 560×400px
2. **Skills** - (150, 150) - 560×400px  
3. **Timeline** - (200, 200) - 640×480px

### **Segunda Columna (Derecha):**
4. **Projects** - (450, 120) - 720×520px ✨ **Reinicia arriba**
5. **Contact** - (500, 170) - 600×480px ✨ **Cerca de Projects**

## ✅ Ventajas del Nuevo Sistema

### **🚀 Mejoras de UX:**
- ✅ **No más ventanas perdidas** abajo
- ✅ **Distribución visual equilibrada** (dos columnas)
- ✅ **Fácil acceso** a Projects y Contact
- ✅ **Menos drag & drop** necesario

### **📐 Responsividad:**
- ✅ **Sutil y no agresiva** - conserva usabilidad desktop
- ✅ **Adaptación gradual** según tamaño de pantalla
- ✅ **Mantiene proporciones** visuales
- ✅ **Sin cambios drásticos** en tamaños

### **🔧 Técnica:**
- ✅ **Responsive real-time** - detecta cambio de ventana
- ✅ **SSR safe** - manejo seguro del `window` object
- ✅ **Performance optimizada** - cálculos mínimos
- ✅ **Configuración centralizada** - fácil de ajustar

## 🎯 Resultado Visual

```
ANTES (Problemático):
About → Skills → Timeline → Projects → Contact
                              ↓         ↓
                          MUY ABAJO  MUY ABAJO

DESPUÉS (Optimizado):
About     →  Projects (Nueva posición arriba-derecha)
Skills    →  Contact  (Cerca de Projects)  
Timeline
```

La nueva distribución crea un **desktop equilibrado** donde todas las ventanas son fácilmente accesibles sin necesidad de arrastrarlas desde posiciones incómodas.