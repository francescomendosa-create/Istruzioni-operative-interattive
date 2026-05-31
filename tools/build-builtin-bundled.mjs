import fs from 'fs';

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

function mergeFields(base, patch) {
  if (!patch || typeof patch !== 'object') return deepClone(base);
  var out = deepClone(base);
  for (var k of Object.keys(patch)) {
    if (patch[k] !== undefined) out[k] = deepClone(patch[k]);
  }
  return out;
}

const schedario = JSON.parse(fs.readFileSync('quiz-builtin-custom-schedario.json', 'utf8'));
const doc = JSON.parse(fs.readFileSync('quiz-builtin-modify-overrides.json', 'utf8'));
const overrides = doc.overrides || doc;

const mergedSchedario = deepClone(schedario);
for (const sk of mergedSchedario.order || []) {
  const rows = mergedSchedario.items[sk] || [];
  const secOv = overrides[sk];
  if (!secOv) continue;
  for (let i = 0; i < rows.length; i++) {
    const patch = secOv[String(i)];
    if (patch) mergedSchedario.items[sk][i] = mergeFields(rows[i], patch);
  }
}

const bundledOverrides = {};
for (const sk of Object.keys(overrides)) {
  if (sk === 'updatedAt') continue;
  bundledOverrides[sk] = overrides[sk];
}

const outJs =
  '/* Generato da tools/build-builtin-bundled.mjs — non modificare a mano */\n' +
  '(function () {\n' +
  '  var g = typeof window !== "undefined" ? window : globalThis;\n' +
  '  g.QUIZ_BUILTIN_CUSTOM_SCHEDARIO = ' +
  JSON.stringify(mergedSchedario) +
  ';\n' +
  '  g.QUIZ_BUILTIN_MODIFY_OVERRIDES = ' +
  JSON.stringify(bundledOverrides) +
  ';\n' +
  '})();\n';

fs.writeFileSync('../assets/quiz-builtin-bundled.js', outJs);
console.log('Wrote assets/quiz-builtin-bundled.js', outJs.length, 'bytes');
console.log('sections:', mergedSchedario.order);
for (const sk of mergedSchedario.order) {
  const n = (mergedSchedario.items[sk] || []).filter((r) => String(r.q || '').trim()).length;
  console.log(' ', sk, mergedSchedario.labels[sk], n, 'questions');
}
