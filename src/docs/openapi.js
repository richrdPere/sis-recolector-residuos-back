const fs = require('node:fs');
const path = require('node:path');
const base = require('./openapi.json');
const mounts = require('./mounts.json');

// Prefijos usados al generar los archivos paths/*.json.
// Para cambiar los montajes, modifica mounts.json.
const originalPrefixes = {
  "auth": "/auth",
  "usuarios": "/usuarios",
  "personal": "/personal",
  "vehiculos": "/vehiculos",
  "zonas": "/zonas",
  "rutas": "/rutas",
  "programaciones": "/programaciones",
  "recorridos": "/recorridos",
  "tracking": "/tracking",
  "recolecciones": "/recolecciones",
  "mantenimientos": "/mantenimientos",
  "ciudadanos": "/ciudadanos",
  "notificaciones": "/notificaciones",
  "dispositivos": "/notificaciones/dispositivos",
  "codigos-qr": "/codigos-qr",
  "codigos-qr-publico": "/codigos-qr/publico",
  "dashboard": "/dashboard",
  "monitoreo": "/monitoreo"
};

const document = {
  ...base,
  paths: {
    ...base.paths
  },
  components: {
    ...base.components,
    schemas: {
      ...(base.components?.schemas ?? {})
    },
  },
};

for (const filename of fs.readdirSync(path.join(__dirname, 'schemas')).sort()) {
  if (!filename.endsWith('.json')) 
    continue;

  const schemas = require(path.join(__dirname, 'schemas', filename));

  for (const [name, schema] of Object.entries(schemas)) {
    if (Object.hasOwn(document.components.schemas, name)) {
      throw new Error(`Esquema OpenAPI duplicado: ${name}`);
    }
    document.components.schemas[name] = schema;
  }
}

for (const filename of fs.readdirSync(path.join(__dirname, 'paths')).sort()) {

  if (!filename.endsWith('.json')) 
    continue;
  
  const moduleName = filename.slice(0, -5);
  const originalPrefix = originalPrefixes[moduleName];
  const configuredPrefix = mounts[moduleName] ?? originalPrefix;
  const entries = require(path.join(__dirname, 'paths', filename));

  for (const [originalPath, operations] of Object.entries(entries)) {
    let finalPath = originalPath;
    if (originalPrefix && configuredPrefix !== originalPrefix) {
      if (!configuredPrefix.startsWith('/') || configuredPrefix.endsWith('/')) {
        throw new Error(`Prefijo inválido para ${moduleName}: ${configuredPrefix}`);
      }
      if (originalPath === originalPrefix || originalPath.startsWith(originalPrefix + '/')) {
        finalPath = configuredPrefix + originalPath.slice(originalPrefix.length);
      }
    }

    document.paths[finalPath] ??= {};
    for (const [method, operation] of Object.entries(operations)) {
      if (Object.hasOwn(document.paths[finalPath], method)) {
        throw new Error(`Operación OpenAPI duplicada: ${method.toUpperCase()} ${finalPath}`);
      }
      document.paths[finalPath][method] = operation;
    }
  }
}

module.exports = document;
