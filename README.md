# Torrent-peers-blocker

* Блокирует пиры при помощи фаервола. 
* Показывает баланс и статистику фарминга BTT.
* Управляет торрентами (по умолчанию отключено).

Установка ниже...

<h3><b>БЛАГОДАРНОСТИ СЮДА, DONATION TRX/USDT/BTT: TXfVDTTpGGvg4rKRPTxYa6dUvZhDSMRZbD </b></h3>

<h2><a href="https://github.com/ChervyachokMigo/Torrent-peers-blocker/releases/download/release/torrent_peer_blocker.rar">Скачать архив с фреймворком и скриптом</a></h2>

<img width=900 src="https://github.com/ChervyachokMigo/Torrent-peers-blocker/blob/main/screenshot_preview.png?raw=true"/>

<h2>Важные файлы (описание)</h2>
* start_script.cmd - батник для запуска скрипта

* nodejs - папка с node.js и скриптом
* <b>nodejs/_utorrent_blocker_peers.js</b> - сам скрипт
* nodejs/install_tools.bat - Установщик инструментов для Node.js. Если вы не ставили node.js начните с запуска этого бантика.
* nodejs/nodevars.bat - Прописать пути к Node.js.

<h2>Настройки торрента</h2>

1. В торренте надо включить webui (дополнительно->веб интерфейс), написать там имя, пароль и порт)

<img width=500 src="https://github.com/ChervyachokMigo/Torrent-peers-blocker/blob/main/webui_settings.png"/>

2. Написать имя и пароль из окошка торрента в скрипт внутрь кавычек, где написано auth: {user: <b>'user'</b> , pass: <b>'pass'</b>} 

<h2>Настройки скрипта</h2>
1. Откройте <b>nodejs/_utorrent_blocker_peers.js</b> в любом текстовом редакторе (Блокнот, sublime text, Notepad++ и др.)
2. Изменить <b>webui_port</b> на свой, если меняли на альтернативный (По умолчанию 8080)
3. <b>TorrentData</b> - путь к utorrent.exe (обратные двойные слеши вместо одинарных). Если у вас BitTorrent - измените на '%APPDATA%\\BitTorrent\\BitTorrent.exe' 
4. <b>updateRateSec</b> - измените скорость обновления скрипта, если требуется. Не рекомендуются очень низкие значения, будет кушать процессор.
5. <b>max_firewall_rules</b> - количество правил в фаерволе, если комп слабый ставишь меньше
6. <b>BTThighIncomeSec</b> - BTT в секунду, при достижении - количество полученных BTT добавляется в список высоких значений

//switchers - можно не трогать

Остальное отключено по умолчанию и годится только для экспериментов.

<h2><b>ВАЖНО: Брендмауер должен быть включен!</b></h2>

Если не запускается, то запусти батник install_tools.bat в папке nodejs, установится node.js, а затем nodevars.bat, чтобы прописать пути.

<b>БЛАГОДАРНОСТИ СЮДА, DONATION TRX/USDT/BTT: TXfVDTTpGGvg4rKRPTxYa6dUvZhDSMRZbD </b>
