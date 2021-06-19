chcp 1251
start "tor" "C:\tor\Tor\tor.exe" -f C:\tor\Data\Tor\torrc
start "wait"  /wait "H:\!stuff\nircmd-x64\nircmd.exe" wait 10000
start "qb" "C:\Program Files\qBittorrent\qbittorrent.exe"
start "ut" "C:\Users\Администратор\AppData\Roaming\uTorrent\uTorrent.exe"
start "wait"  /wait "H:\!stuff\nircmd-x64\nircmd.exe" wait 25000
start "block" "C:\Users\Администратор\Desktop\btt\uTorrentBlockXunlei\ban_not_bt\ban_not_utorrent.cmd"
rem start "wait"  /wait "H:\!stuff\nircmd-x64\nircmd.exe" wait 10000
rem start "btfs" "C:\Users\Администратор\AppData\Roaming\BitTorrent\btfs\btfs.exe"