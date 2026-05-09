@echo off
setlocal
chcp 65001 >nul
set "HTML=%~dp0DOCUMENTAZIONE-AZIENDALE-IT.html"

if not exist "%HTML%" (
  echo [ERRORE] Non trovo:
  echo %HTML%
  pause
  exit /b 1
)

REM Microsoft Edge (percorsi usuali Win10/11)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" "%HTML%"
  exit /b 0
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%HTML%"
  exit /b 0
)

REM Google Chrome (installazione per utente o sistema)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%HTML%"
  exit /b 0
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%HTML%"
  exit /b 0
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%HTML%"
  exit /b 0
)

REM Firefox
if exist "%ProgramFiles%\Mozilla Firefox\firefox.exe" (
  start "" "%ProgramFiles%\Mozilla Firefox\firefox.exe" "%HTML%"
  exit /b 0
)

REM Ultimo tentativo: programma predefinito per .html (può aprire Notepad se associato male)
start "" "%HTML%"
exit /b 0
