const document = require('./openapi.js');
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
const errors = [];
const ids = new Set();
const normalizedPaths = new Map();
let count = 0;

function checkRefs(value, location = '#') {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string') {
    if (!value.$ref.startsWith('#/')) errors.push(`Referencia externa no comprobada: ${value.$ref}`);
    else {
      const resolved = value.$ref.slice(2).split('/').reduce((node, key) => {
        key = key.replace(/~1/g, '/').replace(/~0/g, '~');
        return node && Object.hasOwn(node, key) ? node[key] : undefined;
      }, document);
      if (resolved === undefined) errors.push(`Referencia no resuelta en ${location}: ${value.$ref}`);
    }
  }
  if (value.type === 'array' && !value.items) errors.push(`Arreglo sin items: ${location}`);
  if (value.required && Array.isArray(value.required) && value.properties) {
    for (const key of value.required) if (!Object.hasOwn(value.properties, key)) errors.push(`Campo requerido no definido: ${location}/${key}`);
  }
  for (const [key, child] of Object.entries(value)) checkRefs(child, `${location}/${key}`);
}

for (const [url, item] of Object.entries(document.paths)) {
  if (!url.startsWith('/')) errors.push(`Ruta inválida: ${url}`);
  const normalized = url.replace(/\{[^}]+\}/g, '{}');
  if (normalizedPaths.has(normalized) && normalizedPaths.get(normalized) !== url) errors.push(`Rutas con plantilla equivalente: ${url}`);
  normalizedPaths.set(normalized, url);
  for (const [method, operation] of Object.entries(item)) {
    if (!methods.has(method)) continue;
    count++;
    if (!operation.operationId || ids.has(operation.operationId)) errors.push(`operationId ausente o duplicado: ${method} ${url}`);
    ids.add(operation.operationId);
    if (!operation.responses || Object.keys(operation.responses).length === 0) errors.push(`Sin respuestas: ${method} ${url}`);
    const pathParams = [...url.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
    const params = [...(item.parameters ?? []), ...(operation.parameters ?? [])];
    for (const name of pathParams) if (!params.some(p => p.in === 'path' && p.name === name && p.required === true)) errors.push(`Parámetro de ruta no declarado: ${url} ${name}`);
    for (const p of params) if (p.in === 'path' && !pathParams.includes(p.name)) errors.push(`Parámetro de ruta inexistente: ${url} ${p.name}`);
  }
}
checkRefs(document);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Comprobación estructural correcta: ${count} operaciones, ${Object.keys(document.paths).length} rutas, ${Object.keys(document.components.schemas).length} esquemas; referencias locales resueltas.`);
  console.log('Esta comprobación no sustituye un validador completo OpenAPI ni pruebas HTTP contra el backend.');
}
