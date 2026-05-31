import fs from 'fs';

function decodeValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) {
    return (v.arrayValue.values || []).map(decodeValue);
  }
  if ('mapValue' in v) {
    const fields = v.mapValue.fields || {};
    const out = {};
    for (const [k, val] of Object.entries(fields)) out[k] = decodeValue(val);
    return out;
  }
  return null;
}

function decodeDoc(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = {};
  for (const [k, v] of Object.entries(raw.fields || {})) out[k] = decodeValue(v);
  return out;
}

const overrides = decodeDoc('_firestore_overrides_raw.json');
fs.writeFileSync('quiz-builtin-modify-overrides.json', JSON.stringify(overrides, null, 2));

const keys = Object.keys(overrides.overrides || overrides || {});
console.log('top keys', Object.keys(overrides));
const o = overrides.overrides || overrides;
for (const sk of Object.keys(o)) {
  const sec = o[sk];
  if (!sec || typeof sec !== 'object') continue;
  const pts = Object.keys(sec).filter((k) => /^\d+$/.test(k));
  const withQ = pts.filter((k) => String(sec[k]?.q || '').trim()).length;
  if (pts.length) console.log(sk, pts.length, 'points,', withQ, 'with q');
}

const lb = decodeDoc('_firestore_leaderboard_raw.json');
if (lb.customSchedario) {
  fs.writeFileSync('quiz-builtin-custom-schedario-lb.json', JSON.stringify(lb.customSchedario, null, 2));
  console.log('leaderboard customSchedario order', lb.customSchedario.order);
}
