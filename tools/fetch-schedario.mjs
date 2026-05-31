const key = 'AIzaSyDRja2C0L1WFFOuSXPxQg7mr6kQNRlrZTg';
const referer = 'https://francescomendosa-create.github.io/';

async function main() {
  const authRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: referer,
      },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const authText = await authRes.text();
  if (!authRes.ok) {
    console.error('Auth failed', authRes.status, authText);
    process.exit(1);
  }
  const auth = JSON.parse(authText);
  const docRes = await fetch(
    'https://firestore.googleapis.com/v1/projects/istruzioni-operative/databases/(default)/documents/quiz_custom_schedario/global',
    { headers: { Authorization: `Bearer ${auth.idToken}`, Referer: referer } }
  );
  const docText = await docRes.text();
  if (!docRes.ok) {
    console.error('Firestore failed', docRes.status, docText);
    process.exit(1);
  }
  const fs = await import('fs');
  fs.writeFileSync('_firestore_schedario_raw.json', docText);
  console.log('OK', docText.length, 'bytes');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
