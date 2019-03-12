@echo off
setlocal ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

set BASE_DIR=..
goto :start

:dir_lst
for /f %%i in ('dir /b %BASE_DIR%\%1\*.*') do (
	echo %1/%%i
)
goto :EOF

:start
call :dir_lst gpu
call :dir_lst dat

