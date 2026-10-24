<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/lh_banner_dark.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/lh_banner_light.png">
    <img src="docs/assets/lh_banner_light.png" alt="LearnHarness" width="640">
  </picture>
</p>

<p align="center"><strong>Un arnés de agentes para el aprendizaje profundo y continuo.</strong></p>

<p align="center">
  <a href="#instalación-en-omarchy--arch-linux">Instalación en Omarchy</a> ·
  <a href="#cómo-funciona">Cómo funciona</a> ·
  <a href="#reconocimiento-de-voz-offline-con-rust">Reconocimiento Offline (Rust)</a> ·
  <a href="docs/development.md">Documentación</a> ·
  <a href="https://github.com/gabexe/learnharness/issues">Incidencias</a>
</p>

LearnHarness utiliza agentes de inteligencia artificial para diagnosticar, planificar y enseñar lecciones desde tu comprensión actual hasta tu objetivo de dominio. Mantiene un modelo detallado de lo que comprendes y de cómo razonas, actualizándolo dinámicamente con cada intercambio.

En lugar de limitarse a dar explicaciones estáticas, evalúa tus respuestas y razonamientos para determinar el siguiente paso pedagógico. La enseñanza edifica el entendimiento paso a paso; la práctica deliberada lo consolida y lo hace recuperable; y un grafo de conocimiento persistente preserva tus avances entre sesiones.

![Sesión pedagógica en LearnHarness](docs/assets/teaching-session.png)

---

## Cómo funciona

1. **Diagnóstico (Probe):** Antes de iniciar la enseñanza, el agente explora dónde termina tu comprensión exacta en cada uno de los prerrequisitos del tema. Tus respuestas, grado de confianza y razonamientos le indican el punto exacto donde comenzar.
2. **Planificación:** Desarrolla un mapa de dependencias que conecta tus bases sólidas con el objetivo final. El plan es visible y se adapta automáticamente si tu ritmo o comprensión varían.
3. **Enseñanza activa:** Cada paso se apoya en fundamentos previamente consolidados. Predices, recibes explicaciones adaptativas y verificas tu comprensión. Los conceptos erróneos se corrigen antes de edificar sobre ellos.
4. **Práctica deliberada:** Sesiones independientes proponen problemas variados que exigen recuperar el conocimiento sin dar pistas obvias. Las pistas y la dificultad se calibran según tu proceso de pensamiento.

**Piensa en voz alta:** Los campos de razonamiento te permiten expresar dudas y deducciones con tus propias palabras, ya sea escribiendo o usando dictado por voz.

---

## Reconocimiento de Voz Offline con Rust

LearnHarness incluye un motor nativo de reconocimiento de voz (Speech-to-Text) desarrollado en **Rust** mediante **NAPI-RS** y enlazado directamente a **whisper.cpp**.

- **100% Offline y Privado:** Tu voz se procesa localmente en tu CPU con optimizaciones vectoriales (AVX2 / OpenMP). Ningún fragmento de audio viaja a servidores externos.
- **Configuración en Español:** Configurado por defecto para transcribir en español utilizando el modelo GGML `whisper-small` (~466MB).
- **Fallback a Deepgram:** Compatible con Deepgram opcionalmente si se prefiere utilizar reconocimiento en la nube.

---

## Instalación en Omarchy / Arch Linux

Esta guía está diseñada específicamente para distribuciones basadas en Arch Linux (como **Omarchy** con **Hyprland** o entornos Wayland).

### 1. Requisitos y Dependencias del Sistema

Instala las herramientas de compilación, Rust, Node.js y las librerías necesarias mediante `pacman`:

```bash
sudo pacman -S --needed base-devel git nodejs npm rust cargo cmake clang
```

### 2. Clonación del Repositorio e Instalación

```bash
git clone https://github.com/gabexe/learnharness.git
cd learnharness
npm install
```

### 3. Compilación del Módulo Nativo de Rust

Compila el addon nativo de Whisper en modo release:

```bash
npm run build:whisper
```

Esto generará el módulo optimizado en `native/whisper.node`.

### 4. Descarga del Modelo Whisper (Español)

Descarga el modelo GGML `whisper-small` en la ruta estándar de caché de LearnHarness:

```bash
mkdir -p ~/.cache/learnharness/models
curl -L -o ~/.cache/learnharness/models/ggml-small.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
```

*(Opcional: Si prefieres ubicarlo en otro directorio, puedes definir la variable de entorno `export WHISPER_MODEL_PATH="/ruta/a/ggml-small.bin"`).*

### 5. Configuración de Claves de IA (BYOK)

LearnHarness utiliza el principio *Bring Your Own Key* (BYOK), lo que te permite pagar directamente el costo base del proveedor sin suscripciones intermedias.

Copia o crea tu archivo de autenticación:

```bash
# Ejemplo usando OpenRouter o OpenAI
cat << 'EOF' > auth.json
{
  "OPENROUTER_API_KEY": "sk-or-v1-..."
}
EOF
chmod 600 auth.json
```

También puedes ingresar tus claves directamente desde la interfaz gráfica en **Configuración → Claves de API**.

### 6. Ejecución en Omarchy (Wayland / Hyprland)

Para ejecutar la aplicación de escritorio en entornos Wayland (como Hyprland en Omarchy), utiliza el flag de Ozone para aceleración nativa:

```bash
ELECTRON_OZONE_PLATFORM_HINT=auto npm run desktop:dev
```

Para ejecutar en modo navegador web tradicional:

```bash
npm run dev
# Accede a http://localhost:3000
```

### 7. Empaquetado para Linux (AppImage)

Para generar el ejecutable portable standalone (`.AppImage`):

```bash
npm run desktop:dist:linux
```

El binario resultante se generará en la carpeta `dist/`.

---

## Pruebas y Verificación

El repositorio cuenta con una suite completa de pruebas unitarias y de integración:

```bash
npm test
```

---

## Licencia

Este proyecto está licenciado bajo la **AGPL-3.0**. Consulta [LICENSE](LICENSE) para más detalles.
El software es libre y abierto para siempre.
