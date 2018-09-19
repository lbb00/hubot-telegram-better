@echo off

SETLOCAL
SET PATH = node_modules\.bin;node_modules\hubot\node_modules\.bin;%PATH%

::config
SET TELEGRAM_TOKEN=
SET TELEGRAM_WEBHOOK=
SET TELEGRAM_INTERVAL=500

node_modules/.bin/hubot -a telegram-better %*
