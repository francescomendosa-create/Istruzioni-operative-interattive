const key = 'AIzaSyDRja2C0L1WFFOuSXPxQg7mr6kQNRlrZTg';
const referer = 'https://francescomendosa-create.github.io/';

async function fetchDoc(path, outFile) {
  const authRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: referer },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const auth = await authRes.json();
  if (!authRes.ok) throw new Error(JSON.stringify(auth));
  const docRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/istruzioni-operative/databases/(default)/documents/${path}`,
    { headers: { Authorization: `Bearer ${auth.idToken}`, Referer: referer } }
  );
  const text = await docRes.text();
  if (!docRes.ok) throw new Error(text);
  const fs = await import('fs');
  fs.writeFileSync(outFile, text);
  console.log('OK', path, text.length);
}

const doc = process.argv[2] || 'quiz_modify_overrides/global';
const out = process.argv[3] || '_firestore_overrides_raw.json';
fetchDoc(doc, out).catch((e) => {
  console.error(e);
  process.exit(1);
});
