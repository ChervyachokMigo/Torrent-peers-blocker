# Torrent-peers-blocker

* Блокирует пиры при помощи фаервола. 
* Показывает баланс и статистику фарминга BTT.
* Управляет торрентами (по умолчанию отключено).

Установка ниже...

<h3><b>DONATION TRX/USDT/BTT: TXfVDTTpGGvg4rKRPTxYa6dUvZhDSMRZbD </b></h3>

<h2><a href="https://github.com/ChervyachokMigo/Torrent-peers-blocker/releases/download/release/torrent_peer_blocker.rar">Скачать архив с фреймворком и скриптом</a></h2>

<img src="https://github.com/ChervyachokMigo/Torrent-peers-blocker/blob/main/screenshot_preview.png?raw=true"/>

<h2>Важные файлы (описание)</h2>
* start_script.cmd - батник для запуска скрипта

* nodejs - папка с node.js и скриптом
* <b>nodejs/_utorrent_blocker_peers.js</b> - сам скрипт
* nodejs/install_tools.bat - Установщик инструментов для Node.js. Если вы не ставили node.js начните с запуска этого бантика.
* nodejs/nodevars.bat - Прописать пути к Node.js.

<h2>Настройки</h2>
Откройте <b>nodejs/_utorrent_blocker_peers.js</b> в любом текстовом редакторе (Блокнот, sublime text, Notepad++ и др.)

в торренте тебе надо включить webui (дополнительно->веб интерфейс), написаать там имя и пароль и порт по желанию, вообще рекомендуется)

имя пароль и порт вписываешь в скрипт где написано: utorrent_webui: и auth: {user:  pass:}

qbittorrent_webui:  - отключено, можно не заполнять

TorrentData: - путь к utorrent.exe (обратные двойные слеши вместо одинарных)

PortData - путь к файлу с портом (обратные двойные слеши вместо одинарных)

local_port: - не используется

//switchers - можно не трогать

updateRateSec: - скорость обновления скрипта, по дефолту уже стоит 35 сек

max_firewall_rules: - количество правил в фаерволе, если комп слабый ставишь меньше

minBTTHour: - влияет когда записывать полученный баланс в массив, если ты дофига получаешь то увеличь этот параметр

blockAllAfter: - отключено

//delete paramenets - отключено

больше нечего не надо настраивать в скрипте

брендмауер должен быть включен

если не запускается то запусти батник install_tools.bat в папке nodejs, установится node.js

<b>DONATION TRX/USDT/BTT: TXfVDTTpGGvg4rKRPTxYa6dUvZhDSMRZbD </b>
