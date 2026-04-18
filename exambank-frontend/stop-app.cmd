@echo off
setlocal

set "CANDIDATE_1=%~dp0..\..\Exambank_cdcn_backend\stop-app.cmd"
set "CANDIDATE_2=%~dp0..\..\..\Exambank_cdcn_backend\stop-app.cmd"
set "CANDIDATE_3=%~dp0..\stop-app.cmd"

if exist "%CANDIDATE_1%" (
  call "%CANDIDATE_1%" %*
  exit /b %ERRORLEVEL%
)

if exist "%CANDIDATE_2%" (
  call "%CANDIDATE_2%" %*
  exit /b %ERRORLEVEL%
)

if exist "%CANDIDATE_3%" (
  call "%CANDIDATE_3%" %*
  exit /b %ERRORLEVEL%
)

echo [ERROR] Cannot find backend stop script.
echo [HINT] Expected one of:
echo        %CANDIDATE_1%
echo        %CANDIDATE_2%
echo        %CANDIDATE_3%
exit /b 1
