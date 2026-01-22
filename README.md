# Porra Champions League 2025-26 - Aplicación Web Estática

Aplicación web estática que replica exactamente el Excel de la porra de la Champions League 2025–26.

## 🚀 Características

- **Tres vistas principales**:
  1. **League**: Lista de 144 partidos con resultados editables (modo admin) y clasificación de equipos.
  2. **ADMIN/Pronósticos**: Tabla de pronósticos por participante con filtros y colores.
  3. **CLAS**: Clasificación de participantes con validación contra datos originales.

- **Dos modos de acceso**:
  - **Invitado**: Solo lectura.
  - **Admin**: Permite editar resultados reales (PIN por defecto: `1234`).

- **Funcionalidades clave**:
  - Cálculo automático de puntos según reglas (signo=2, exacto=3).
  - Clasificación de equipos recalculada en tiempo real.
  - Persistencia en localStorage (cambios guardados).
  - Exportar/importar backup JSON.
  - Validación inicial contra datos del Excel.

## 📁 Estructura del proyecto

```
champions-porra-web/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── app.js              # Lógica de la aplicación
├── config.js           # Configuración (PIN admin, etc.)
├── README.md           # Este archivo
└── data/               # Datos extraídos del Excel
    ├── matches.json       # 144 partidos
    ├── participants.json  # 16 participantes
    ├── predictions.json   # Pronósticos por participante
    ├── initial_clas.json  # Clasificación inicial (validación)
    ├── teams.json         # Clasificación inicial de equipos
    └── rules.json         # Reglas de puntuación
```

## 🛠️ Publicar en GitHub Pages

1. **Crear un repositorio nuevo** en GitHub (ej. `porra-champions`).
2. **Subir todos los archivos** a la rama `main`.
3. **Ir a Settings > Pages** y configurar:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` (carpeta `/root`)
4. **Guardar** y esperar a que se despliegue (1-2 minutos).
5. **Acceder** a la URL: `https://<usuario>.github.io/porra-champions/`

## 🔧 Actualizar datos desde Excel

Si el Excel original cambia:

1. Ejecutar el script de extracción (proporcionado en `/tools/extract.py`).
2. Reemplazar los archivos JSON en `/data/`.
3. Verificar que la validación inicial sigue pasando.
4. Volver a desplegar.

## ⚙️ Configuración

- **PIN admin**: Editar `config.js` → `ADMIN_PIN`. Por defecto: `1234`.
- **Expiración de sesión admin**: 24 horas (modificable en `config.js`).
- **Reglas de puntuación**: Configuradas en `config.js` (signo=2, exacto=3).

## ✅ Validación

Al cargar la aplicación:
1. Se recalculan los puntos de cada participante.
2. Se compara con `initial_clas.json`.
3. Si hay diferencias, se muestra un banner de error.

**Nota**: La aplicación valida también la clasificación de equipos contra `teams.json`.

## 📱 Compatibilidad

- Navegadores modernos (Chrome, Firefox, Safari, Edge).
- Diseño responsive (móvil, tablet, escritorio).
- No requiere backend ni conexión a internet después de cargar.

## 🧪 Probar la aplicación localmente

```bash
# Con Python
python3 -m http.server 8000
# Luego abrir http://localhost:8000 en el navegador.
```

## 🆘 Solución de problemas

- **Los datos no se cargan**: Verificar que los archivos JSON están en `/data/` y son accesibles.
- **El PIN admin no funciona**: Comprobar `config.js` y limpiar localStorage.
- **La clasificación no coincide**: Ejecutar de nuevo la extracción desde el Excel.

## 📄 Licencia

Proyecto creado para uso personal. Los datos de partidos y pronósticos son propiedad de sus respectivos dueños.
