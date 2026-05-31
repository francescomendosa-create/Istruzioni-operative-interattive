import fs from 'fs';

function decodeValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) {
    const vals = v.arrayValue.values || [];
    return vals.map(decodeValue);
  }
  if ('mapValue' in v) {
    const fields = v.mapValue.fields || {};
    const out = {};
    for (const [k, val] of Object.entries(fields)) {
      out[k] = decodeValue(val);
    }
    return out;
  }
  return null;
}

const raw = JSON.parse(fs.readFileSync('_firestore_schedario_raw.json', 'utf8'));
const schedario = decodeValue(raw.fields.schedario);
fs.writeFileSync('quiz-builtin-custom-schedario.json', JSON.stringify(schedario, null, 2));
console.log('order:', schedario.order);
console.log('labels:', schedario.labels);
for (const k of schedario.order || []) {
  const rows = schedario.items[k] || [];
  const filled = rows.filter((r) => String(r.q || '').trim()).length;
  console.log(k, rows.length, 'rows,', filled, 'with questions');
}
