$key = 'AIzaSyDRja2C0L1WFFOuSXPxQg7mr6kQNRlrZTg'
$auth = Invoke-RestMethod -Method Post -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$key" -ContentType 'application/json' -Body '{"returnSecureToken":true}'
$token = $auth.idToken
$headers = @{ Authorization = "Bearer $token" }
$uri = 'https://firestore.googleapis.com/v1/projects/istruzioni-operative/databases/(default)/documents/quiz_custom_schedario/global'
$doc = Invoke-RestMethod -Uri $uri -Headers $headers
$out = 'C:\Users\franc\Documents\GitHub\Istruzioni-operative-interattive\tools\_firestore_schedario_raw.json'
$doc | ConvertTo-Json -Depth 80 | Set-Content $out -Encoding utf8
Write-Output "Saved to $out"
