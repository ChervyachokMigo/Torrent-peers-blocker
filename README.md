# Torrent-peers-blocker

Показывает баланс и статистику фарминга BTT. Блокирует пиры при помощи фаервола. управляет торрентами (по умолчанию отключено).

<b>DONATION TRX/USDT/BTT: TXfVDTTpGGvg4rKRPTxYa6dUvZhDSMRZbD </b>

https://github.com/ChervyachokMigo/Torrent-peers-blocker/releases/download/release/torrent_perrs_blocker_1.rar - архив с фреймворком и скриптом

autostart.bat  - батник для автозапуска при включении компа

ban_not_utorrent.cmd - батник для запуска, там надо прописать путь к месту куда положишь скрипт и node.js

utorrent.js - скрипт

в скрипте много всяких параметров

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
