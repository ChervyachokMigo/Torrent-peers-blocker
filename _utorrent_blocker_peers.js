var Sugar, cheerio, fs, log, main, request, utorrent
fs = require('fs').promises
colors = require('colors');
cheerio = require('cheerio')
request = require('request-promise-native')
Sugar = require('sugar').extend()
const whois = require('whois')
const childProcess = require('child_process')

log = console.log.bind(console)
var global_peers_country = new Array();
const reducer = (accumulator, currentValue) => accumulator + currentValue;

function prependZero(number) {
    if (number <= 9)
        return "0" + number;
    else
        return number;
}

utorrent = {
    //constantes 
    auth: {
        user: 'user',
        pass: 'pass'
    },
    webui_port: 8080 ,
    TorrentData: '%APPDATA%\\uTorrent\\uTorrent.exe' ,

    //main parameters
    updateRateSec: 70 , //sec
    max_firewall_rules: 400,   //number of rules to clear rules list
    BTThighIncomeSec: 0.04, //BTT/sec в секунду, при достижении - количество полученных BTT добавляется в список

    //точность значений с точкой, при выводе
    accuracy_float: 1000,

    //switchers - переключатели различных функций
    isClearFireWall: 1 ,    //очищать фаервол при запуске (стирать правила торрента)
    ShowWalletLog: 1,   //показывать лог кошелька
    DontBlockAllPeersAfterTimer: 1 ,    //Не блокировать все пиры по таймеру (счетчику)
    showHighIncomeBTT: 1,   //показывать список высоких значений BTT за тик, регулируется с помощью BTThighIncomeSec
    delete_torrents: 0 , //удалять торренты по параметрам которые ниже
    stop_torrents: 0 , //останавливать все неактивные торренты
    isAutoStartAllTorrents: 0 , //автозапуск всех остановленых торрентов
    useFirewallList: 0, //проверять список правил фаервола каждый раз

    logging: true,

    //delete paramenets - по умолчанию disabled
    minupload: 40, //KB/sec
    max_peers: 1200000,
    min_torrent_size: -1, //MB
    max_torrent_size: 150000, //MB
    max_active_peers: 100,
    tor_min_date: 120, //minutes
    max_inactive_time: 120, //minutes,

    //Параметры таймера блкировки, 
    //disabled по умолчанию, активно если DontBlockAllPeersAfterTimer = 0
    blockAllAfter: 24 , //ticks
    minBTTHour: 60, //если достигло этого значения то не уменьшаем таймер блокировки

    //полностью disabled
    //BonusBalanceChangeReset: 3, // btt/tick
    //clearFirewallInterval: 3600,
    //qbittorrent_webui: 'http://127.0.0.1:8082/',
    //local_port: 10107,  //torrent port

    //variables - переменные которые используются в скрипте, самоопределяются.
    utorrent_webui: 'http://127.0.0.1:8080/gui/' ,
    minBalanceChangeReset: 0.4, // btt/tick (auto init)
    all_blocked_ips: [],
    blocked_ips: [],
    firewall_ips: [],
    FirewallClearTimer: 0,
    blockAllAfterTemp: 0,
    lastBalance: 0,
    balanceChange: 0,
    GUIPort: 0,
    WalletBalance: 0,
    BTTPeers: 0,
    BalanceCoefficient: 0.0,
    StartBalance:0,
    StartEarning:0,
    StartTime:0,
    torrentsInactive: [],
    balanceGetList:[],
    HourBalances: [],
    FromstartTimeText: '',
    walletLog_info: {'Successes':0,'Warnings':0,'Errors':0},

    init: async function() {
        var $, token_html
        this.utorrent_webui='http://127.0.0.1:'+this.webui_port+'/gui/'
        this.cookies = request.jar()
        token_html = (await request({
            uri: this.utorrent_webui + 'token.html',
            auth: this.auth,
            jar: this.cookies
        }).on('error',function(err){
            log(err)
        }))

        $ = cheerio.load(token_html)
        this.token = $('div').text()
        
        this.GUIPort = await this.readport()
        //log ('GUI Port ',this.GUIPort)

        this.StartTime = new Date
        
        this.blockAllAfterTemp = this.blockAllAfter
        this.minBalanceChangeReset = this.updateRateSec * this.BTThighIncomeSec

        log ('[OPTIONS]')
        log ('Refresh rate of one tick',colors.yellow(this.updateRateSec,'sec'))
        log ('Max Firewall rules',colors.yellow(this.max_firewall_rules))
        log ('Checking inactive torrents',colors.yellow(this.stop_torrents))
        log ('Autostart stopped torrents',colors.yellow(this.isAutoStartAllTorrents))
        log ('Show income list BTT',colors.yellow(this.showHighIncomeBTT))
        if (this.delete_torrents == 1){
            log ('Max peers in torrent',colors.yellow(this.max_peers))
            log ('Min torrent size',colors.yellow(this.min_torrent_size),'MB')
            log ('Max torrent size',colors.yellow(this.max_torrent_size),'MB')
            log ('Inactive time to delete torrent',colors.yellow(this.max_inactive_time),'min')
        } else {
            log ('Delete torrents:',colors.yellow('off'))
        }
        if (this.DontBlockAllPeersAfterTimer == 0){
            log ('Mininum of get balance to timer of ban all peers reset:',colors.yellow(this.minBalanceChangeReset))
            log ('Ticks to ban peers',colors.yellow(this.blockAllAfter))
            log ('Minimum BTT/hour',colors.yellow(this.minBTTHour))
        } else {
            log ('Ban all peers timer',colors.yellow('off'))
        }
        await this.get_connections_data()
        log ('- - -')
        log('Start...')
        if (this.isClearFireWall==1){
            log ('Firewall clear on start',colors.yellow('On'))
        }
        

        return 1
    },
    getWalletLogData: async function(){
        var datetime = new Date
        var data = await fs.readFile(process.env.LOCALAPPDATA+'\\BitTorrentHelper\\wallet.log', 'utf8')
        data = data.split('\r')
        //var dataarr = []
        dataarr = [this.updateRateSec,0,0,0]
        log ('[WALLET LOG]')
        data.forEach(function callback(currentValue, index, array) {
            if (array.length - index < 100){
                currentValue = currentValue.trim()
                if (currentValue !== ''){
                    let regex = /^\[([0-9\-:. ]+)\] \[[a-z A-Z]+\] \[([a-z A-Z]+)\] x:\\jenkins-workspace\\workspace\\token-wallet-pipeline\\src\\([a-z _A-Z]+)\.cpp::([0-9 ]+)::([0-9A-Za-z\_\ \-\{\}\[\]\:\,\"\.]+)$/gi
                    var res = regex.exec(currentValue)
                    //log (res);
                    if (res !== null){
                        var strdate= (datetime-Date.parse(res[1]))/1000;
                        if (strdate<this[0]){
                            if (res[2]==='error'){
                                log (colors.red(' '+strdate,res[3]+'.cpp:'+res[4],res[5]))
                                this[3]++
                            }
                            if (res[2]==='info'){
                                
                                if (res[5].includes('ledger_close_chan_success')==true){
                                    log (' '+strdate,res[3]+'.cpp:'+res[4],colors.green(res[5]))
                                    this[1]++
                                } else {
                                    log (' '+strdate,res[3]+'.cpp:'+res[4],res[5])
                                }
                            }
                            if (res[2]==='warning'){
                                log (colors.yellow(' '+strdate,res[3]+'.cpp:'+res[4],res[5]))
                                this[2]++
                            }
                            
                        }
                    }
                }
            }
            //log (currentValue)
        },dataarr);
        //log (dataarr)
        this.walletLog_info['Successes'] +=dataarr[1]
        this.walletLog_info['Warnings'] +=dataarr[2]
        this.walletLog_info['Errors'] +=dataarr[3]
            log (' Successes:',this.walletLog_info['Successes'])
            log (' Warnings:',this.walletLog_info['Warnings'])
        if (this.walletLog_info['Errors']==0){
            log (' Errors:',this.walletLog_info['Errors'],'('+Math.floor(this.walletLog_info['Errors']/this.walletLog_info['Successes']*10000)/100+'%)')
        } else {
            log (' Errors:',colors.red(this.walletLog_info['Errors']),'('+Math.floor(this.walletLog_info['Errors']/this.walletLog_info['Successes']*10000)/100+'%)')
        }
            
            
            
        return 1
    },
    get_connections_data: async function(){
        var result = (await this.call({
            params: {
                action: 'getsettings'
            }
        }))
        result = result.settings
        var thisval = []
        var find = result.find(function(element, index, array){

            switch(element[0]){
                case 'conns_globally': 
                    thisval.conns_globally = element[2]
                    break;
                case 'conns_per_torrent': 
                    thisval.conns_per_torrent = element[2]
                    break; 
                case 'ul_slots_per_torrent': 
                    thisval.ul_slots_per_torrent = element[2]
                    break; max_halfopen
                 case 'net.max_halfopen': 
                    thisval.max_halfopen = element[2]
                    break;
                case 'bt.connect_speed': 
                    thisval.connect_speed = element[2]
                    break;
                case 'bt.transp_disposition': 
                    thisval.transp_disposition = element[2]
                    break;
            }
        },thisval)
        log ('[TORRENT SETTINGS]')
        log (thisval)
       // log (result)
    },
    getWalletData: async function (){
        var $,status,connect_request
        connect_request = (await request({   
            uri: 'http://127.0.0.1:'+this.GUIPort+'/api/status'
        }).on('error',function(err){
            log(err)
        }))

        status = JSON.parse(connect_request)
        this.lastBalance = this.WalletBalance
        this.WalletBalance = Math.floor(status['balance']/1000000*this.accuracy_float)/this.accuracy_float
        this.balanceChange = this.WalletBalance-this.lastBalance
        this.BTTPeers = status['peers']
        if (this.StartBalance == 0){
            this.StartBalance = this.WalletBalance
        }
    },

   /* get_download_torrents: async function() {
        var $,data,i

        data = JSON.parse(await request({   
            uri: this.qbittorrent_webui+'api/v2/sync/maindata'
        }).on('error',function(err){
            log(err)
        }))
        for (var index in  data ['torrents']){
            var torrent_size = data ['torrents'][index]['size']
            if (torrent_size<10*1024*1024){
                
            }
        }
        
        //});
       // for (i=0;i<data['torrents'].length;i++){
        //    log (data['torrents']
            //var torrent_size = data['torrents'][i]['size']/1024/1024/1024
            //var torrent_name = 
            //log (,torrent_size,'GB')
    },*/

    getCoeficient: async function(){
        var $,status
        status = JSON.parse(await request({   
            uri: 'http://127.0.0.1:'+this.GUIPort+'/api/revenue/total'
        }).on('error',function(err){
            log(err)
        }))
        status['total_earning'] =  Math.floor(status['total_earning']/1000000*this.accuracy_float)/this.accuracy_float
        if (this.StartEarning == 0){
            this.StartEarning = status['total_earning']
        }
        this.BalanceCoefficient = (this.WalletBalance-this.StartBalance)/(status['total_earning']-this.StartEarning)
    },
    call: async function({api = '', params, method = 'GET'} = {}) {
        return JSON.parse(await request({
            uri: this.utorrent_webui + api,
            method: method,
            qs: {
                token: this.token,
                ...params
            },
            auth: this.auth,
            jar: this.cookies
        }).on('error',function(err){
            log(err)
        }))
    },

    get_torrents: async function() {
        /*, "TORRENT_HASH": 0
        , "TORRENT_STATUS": 1
        , "TORRENT_NAME": 2
        , "TORRENT_SIZE": 3
        , "TORRENT_PROGRESS": 4
        , "TORRENT_DOWNLOADED": 5
        , "TORRENT_UPLOADED": 6
        , "TORRENT_RATIO": 7
        , "TORRENT_UPSPEED": 8
        , "TORRENT_DOWNSPEED": 9
        , "TORRENT_ETA": 10
        , "TORRENT_LABEL": 11
        , "TORRENT_PEERS_CONNECTED": 12
        , "TORRENT_PEERS_SWARM": 13
        , "TORRENT_SEEDS_CONNECTED": 14
        , "TORRENT_SEEDS_SWARM": 15
        , "TORRENT_AVAILABILITY": 16
        , "TORRENT_QUEUE_POSITION": 17
        , "TORRENT_REMAINING": 18
        , "TORRENT_DOWNLOAD_URL": 19
        , "TORRENT_RSS_FEED_URL": 20
        , "TORRENT_STATUS_MESSAGE": 21
        , "TORRENT_STREAM_ID": 22
        , "TORRENT_DATE_ADDED": 23
        , "TORRENT_DATE_COMPLETED": 24
        , "TORRENT_APP_UPDATE_URL": 25
        , "TORRENT_SAVE_PATH": 26*/
        var result,i,j,len,finded,tor_name,tor_seeds,tor_peers,tor_size,tor_active_peers,tor_upload_speed,tor_status
        this.torrents = []
        result = (await this.call({
            params: {
                list: 1
            }
        }))
        var datetime = new Date
        tor_name = 2
        tor_size = 3
        tor_upload_speed = 8
        tor_active_peers = 12
        tor_peers = 13
        tor_seeds = 15
        tor_status = 21
        tor_date = 23
        var tor_exclude
        for (i = 0, len = result.torrents.length; i < len; i++) {
            //log (result.torrents[i][tor_status])
        	/*if (       		
        		!result.torrents[i][tor_name].match(/^(MP3)/i) && result.torrents[i][tor_active_peers] > 0 && result.torrents[i][tor_upload_speed]/result.torrents[i][tor_active_peers] < this.minupload*1024
        		){
        		
        		(await this.stop_start(result.torrents[i][0]))
        		log("stop start torrent: ",result.torrents[i][tor_name])

        	}*/

            if (this.isAutoStartAllTorrents == 1 && result.torrents[i][tor_status].match(/^(Finished)/i)){
                await this.stop_start(result.torrents[i][0])
            }

            if (result.torrents[i][tor_status].match(/^(Seeding)/i) && result.torrents[i][tor_active_peers] == 0 ){
                finded = 0
                if (this.torrentsInactive.length>0){ 
                    for (j = 0; j < this.torrentsInactive.length; j++) {
                        if (this.torrentsInactive[j][0]==result.torrents[i][0]){
                            finded = 1
                        }
                    }
                }
                    if (finded == 0){
                        result.torrents[i][45] = new Date
                        result.torrents[i][45] = Math.floor( result.torrents[i][45].getTime()/1000)
                        //log (result.torrents[i][45])
                        this.torrentsInactive.push(result.torrents[i])
                        //log ("now inactive ", result.torrents[i][tor_name])
                    }
                
            }

            //tor_exclude = result.torrents[i][tor_name] === 'Songs.7z' || result.torrents[i][tor_name].match(/^(MP3)/i)
            tor_exclude = 0

            if (this.delete_torrents == 1 && !tor_exclude && result.torrents[i][tor_status].match(/^(Seeding)/i) && result.torrents[i][16] == 65536 && result.torrents[i][tor_active_peers] == 0
             //&& (Math.floor ( datetime.getTime()/1000 ) - result.torrents[i][tor_date] ) / 60 > this.tor_min_date 
             ){
                //log((Math.floor ( datetime.getTime()/1000 ) - result.torrents[i][tor_date] ) / 60)
                //log (result.torrents[i][16],': ',result.torrents[i][tor_name])
                (await this.delete_torrent(result.torrents[i][0]))

                log(" Delete torrent by available: ",result.torrents[i][tor_name])
            }

        	if (this.delete_torrents == 1 && !tor_exclude &&
        		(result.torrents[i][tor_size] < this.min_torrent_size*1024*1024 || result.torrents[i][tor_size] > this.max_torrent_size*1024*1024 || 
        		result.torrents[i][tor_seeds] > this.max_peers || result.torrents[i][tor_peers] > this.max_peers
        		//result.torrents[i][tor_active_peers] == 0 ||
        		//result.torrents[i][tor_active_peers] > this.max_active_peers ||
        		/*( 
        			(Math.floor ( datetime.getTime()/1000 ) - result.torrents[i][tor_date] ) / 60 > this.tor_min_date &&
        			(
        				result.torrents[i][tor_active_peers] > this.max_active_peers && 
        				result.torrents[i][tor_upload_speed]/result.torrents[i][tor_active_peers] < this.minupload*1024
        			)
        		) */
        		)
            ){
        		
        		(await this.delete_torrent(result.torrents[i][0]))

        		log(" Delete torrent by size or peers: ",result.torrents[i][tor_name])

        	}

        	if (result.torrents[i][tor_status].match(/^(Seeding)/i) && result.torrents[i][tor_active_peers] > 0 ){

		        this.torrents.push(result.torrents[i])

                if (this.torrentsInactive.length>0){
                    for (j = 0; j < this.torrentsInactive.length; j++) {
                        if (this.torrentsInactive[j][0]==result.torrents[i][0]){
                            this.torrentsInactive.splice(j,1)
                            //log ("became active ",this.torrentsInactive[j][tor_name])
                        }
                    }
                }

			}

	    }
       log (' Torrents',colors.green('active: '+this.torrents.length),',',colors.red('inactive:',this.torrentsInactive.length))
       log (' Total:',this.torrents.length+this.torrentsInactive.length)
        return this.hashes = this.torrents.map(function(x) {
	            return x[0]
        })
    },
    check_torrents_inactive: async function() {
        var j
        if (this.stop_torrents == 1 && this.torrentsInactive.length>0){
            

            for (j = 0; j < this.torrentsInactive.length; j++) {
                //log ( Math.floor((new Date).getTime()/1000) , this.torrentsInactive[j][45] )
                if ( (Math.floor((new Date).getTime()/1000) - this.torrentsInactive[j][45] ) > this.max_inactive_time * 60 ){
                    log (" Stop ",this.torrentsInactive[j][2]," by inactive ",this.max_inactive_time," minutes")
                    //await this.delete_torrent(this.torrentsInactive[j][0])
                    await this. stop_torrent(this.torrentsInactive[j][0])
                    this.torrentsInactive.splice(j,1)
                }
            }
        }
    },
    stop_start: async function(hash) {
    	var resp
    	resp = (await this.call({
            params: {
                action: 'stop',
                hash: hash,
                list: 1,
                getmsg: 1
            }
        }))
        resp = (await this.call({
            params: {
                action: 'start',
                hash: hash,
                list: 1,
                getmsg: 1
            }
        }))
        return 1
    },
    stop_torrent: async function(hash) {
    	var resp
    	resp = (await this.call({
            params: {
                action: 'stop',
                hash: hash,
                list: 1,
                getmsg: 1
            }
        }))
        return 1
    },
    delete_torrent: async function(hash) {
    	var resp
    	resp = (await this.call({
            params: {
                action: 'removedatatorrent',
                hash: hash,
                list: 1,
                getmsg: 1
            }
        }))
        return 1
	},
    get_peer_country: async function(peer) {
        var data = ''
        var res_fun = function(err, data) {
            if (data != undefined && err == null){
                data = data.replaceAll(' ','')
                var countrypos = data.indexOf('country:')

                var countrypeer = data.substring((countrypos+8),(countrypos+10)).trim()
                if (countrypeer.match(/[A-Z]/g) && countrypos != -1){
                    //log (peer[1],':',countrypeer,":",countrypos,':',data.substring(countrypos,countrypos+15))
                   //global_peers_country.push([peer[1],countrypeer])
                   data = [peer[1],countrypeer]
                   return data
                }

            } else {
                log (err)
            }       
            return 0
        }
        var result = await whois.lookup(peer[1],await res_fun)

        log (res_fun.data)
        return result
        /*,  await */
    },
    get_peers: async function(hash) {
        /* country,
            ip,
            reverse_dns,
            utp,
            port,
            client,
            flags,
            progress,
            download_speed,
            upload_speed,
            requests_out,
            requests_in,
            waited,
            uploaded,
            downloaded,
            hash_error,
            peer_download_speed,
            max_upload_speed,
            max_download_speed,
            queued,
            inactive,
            relevance*/
        var i, len, ref, resp, results, peer, resp1, peer_country
        resp = (await this.call({
            params: {
                action: 'getpeers',
                hash: hash
            }
        }))
        ref = resp.peers[1]
        results = []

        for (i = 0, len = ref.length; i < len; i++) {

            peer = ref[i]



            //peer_country = await this.get_peer_country(peer)
            //log (peer_country)
           

            results.push({
                ip: peer[1],
                hostname: peer[2],
                country: peer[0],
                port: peer[4],
                client: peer[5],
                flags: peer[6],
                progress: peer[7],
                downloaded: peer[13],
                uploaded: peer[14],
                uploading_speed: peer[16]
            })
        }
       
        //log (global_peers_country)

        return results
    },
    get_all_peers: async function() {
        var hash, i, len, peers, ref
        peers = []
        ref = this.hashes
        for (i = 0, len = ref.length; i < len; i++) {
            hash = ref[i]
            peers.append((await this.get_peers(hash)))
        }
        var NotUniquePeersLength = peers.length
        peers = peers.unique('ip').sortBy('client')
        log (' Total peers:',colors.green(peers.length),'('+NotUniquePeersLength+')')
        log (' BTT Peers:',colors.green(this.BTTPeers))
        var Unknown_peers = peers.length-this.BTTPeers
        log (' Unknown peers:',colors.yellow(Unknown_peers),'('+Math.floor(Unknown_peers/peers.length*10000)/100+'%)')
        return peers
    },
    clear_firewall: async function(){
    	childProcess.execSync(`chcp 65001 | netsh advfirewall firewall delete rule name=all program="${this.TorrentData}"`)
        childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_μTorrent (TCP-In)" protocol=TCP action=allow program="${this.TorrentData}" dir=in`)
        childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_μTorrent (UDP-In)" protocol=UDP action=allow program="${this.TorrentData}" dir=in`)
        log ('Deleted rules.')
},

    readport: async function(){
        var data = await fs.readFile(process.env.LOCALAPPDATA+'\\BitTorrentHelper\\port', 'utf8')
 
        data = data.split('\r')
        return Number(data[0])
    },


    Check_balance_change: async function(){
        if (this.DontBlockAllPeersAfterTimer == 1){
            this.blockAllAfterTemp = this.blockAllAfter
        }
        if (this.StartBalance != this.balanceChange){
            this.HourBalances.push(this.balanceChange)
            if (this.HourBalances.length>3600/this.updateRateSec){
                this.HourBalances.shift();
            }
            var SumHourBalance = this.HourBalances.reduce(reducer)
            if (this.DontBlockAllPeersAfterTimer==0 && SumHourBalance>this.minBTTHour){
                this.blockAllAfterTemp = this.blockAllAfterTemp + 1
            }

            if (this.balanceChange>this.minBalanceChangeReset){
                this.blockAllAfterTemp = this.blockAllAfter
                this.balanceGetList.push([this.FromstartTimeText,this.balanceChange])
                //if (this.balanceChange>this.BonusBalanceChangeReset){
               //     this.blockAllAfterTemp = this.blockAllAfterTemp + this.blockAllAfter
               // }
                if (this.DontBlockAllPeersAfterTimer==0) {
                    log (colors.green(' Change peers timer reset'))
                }
            }

            log(" BTT in last hour:",colors.green( Math.floor(SumHourBalance*this.accuracy_float)/this.accuracy_float ),'('+this.HourBalances.length+')')
            if (this.showHighIncomeBTT == 1 && this.balanceGetList.length>0){
                log (this.balanceGetList)
            }
        }
    },

    block: async function() {
        var peers, peers2block,i,resultIn,resultOut,firewallOut,firewall_ip,isFoundIp,blocked_ip_counter,resultDelete,j
        var datetime = new Date
        var fromStartTime = Math.floor((datetime-this.StartTime)/1000)

       // await this.get_download_torrents()

        await this.getWalletData()
        await this.getCoeficient()

        var BalanceChange = Math.floor((this.WalletBalance-this.StartBalance)*this.accuracy_float)/this.accuracy_float

        var BalanceIncome = Math.floor((BalanceChange/(fromStartTime/3600))*this.accuracy_float)/this.accuracy_float

        this.FromstartTimeText = prependZero(Math.floor(fromStartTime/3600))+':'+prependZero(Math.floor((fromStartTime/60)%60))+':'+prependZero(fromStartTime%60)

        log ('Refreshing...')
        if (this.ShowWalletLog == 1){
            await this.getWalletLogData()
        }
        log ('[TIME]')
        log (' From start [',colors.yellow(this.FromstartTimeText),']')
        log (' Now [ '+colors.yellow( prependZero(datetime.getHours())+':'+prependZero(datetime.getMinutes())+':'+prependZero(datetime.getSeconds()) )+' ]')
        
        log ('[BALANCE]')
        log (' From start:',this.StartBalance,colors.green('+'+BalanceChange),'BTT')
        log (' Current:',colors.yellow(this.WalletBalance),'BTT')

        if (typeof this.BalanceCoefficient !== 'undefined' && isNaN(this.BalanceCoefficient)==false){
            log (' Balance ratio:',colors.green(Number( Math.floor(this.BalanceCoefficient*100)/100) ),'In-app/Earning')
        } else {
            log (' Balance ratio:','0 In-app/Earning')
        }

        log (' Balance changed from last',colors.green(Math.floor(this.balanceChange*this.accuracy_float)/this.accuracy_float),'BTT')
        
        if (isNaN(BalanceIncome) == false ){
            if (BalanceIncome>=0){
                log (' Balance income:',colors.green('+'+BalanceIncome),'BTT/hour',colors.green('+'+Math.floor(BalanceIncome*24*this.accuracy_float)/this.accuracy_float),'BTT/Day',colors.green('+'+Math.floor(BalanceIncome*24*30*this.accuracy_float)/this.accuracy_float),'BTT/Month',)
            } else {
                log (' Balance income:',colors.red(BalanceIncome),'BTT/hour')
            }
            await this.Check_balance_change()
        } else {
             log (' Balance income:','0 BTT/hour')
        }

        log ('[TORRENTS]')
        await this.get_torrents()

        await this.check_torrents_inactive()
       
        blocked_ip_counter = 0

        log ('[PEERS]')
        peers = (await this.get_all_peers())       

        /*

        var RusPeers = 0
        var undefinedPeers = 0

        var hostnames = [
            [/(com\.tr)/i,'TR'],[/(ono\.com)/i,'ES'],
            [/(\.hr)/i,'HR'],[/(\.it)/i,'IT'],[/(\.se)/i,'SE'],
            [/(skybroadband\.com)/i,'EU'],[/(\.es)/i,'ES'],[/(u-mee\.com)/i,'EU'],
            [/(proxad\.net)/i,'FR'], [/(\.nl)/i,'NL'],[/(\.pt)/i,'PT'], [/(sfr\.net)/i,'FR'],
            [/(\.ru)/i,'RU'],[/(pccw-hkt\.com)/i,'CN'], [/(scts\.tv)/i,'RU'],
            [/(\.za)/i,'ZA'], [/(\.ar)/i,'AR'], [/(kuzbass\.net)/i,'RU'],[/(amazonaws\.com)/i,'US'],[/(\.mx)/i,'ES'],
            [/(\.gr)/i,'GR'],[/(\.hn)/i,'US']
        ] //  [/()/i,''],

        var CountryPeers = []

        for (var k=0; k<peers.length; k++){
            if (peers[k].hostname.length > 0 && typeof peers[k].hostname  !== "undefined"){
                for (var L=0;L<hostnames.length;L++){
                     if (peers[k].hostname.match(hostnames[L][0])){
                        peers[k].country = hostnames[L][1]
                        peers[k].defined = 1
                     }
                }
                log (peers[k].hostname,'['+peers[k].country+']')
            }
           
            if (peers[k].country.match (/(RU)/i)){
                RusPeers++
            }
            if (peers[k].hostname.length == 0){
                undefinedPeers++
            } else {
                if (typeof peers[k].defined === 'undefined' && (typeof peers[k].country === "undefined" || peers[k].country == '' )){
                    log ('Undefined peer but hostname is',peers[k].hostname,peers[k].country)
                } else {
                    CountryPeers.push(peers[k].country)
                }
            }

        }

        if (CountryPeers.length>0){
            var UniqueCountryPeers = CountryPeers.reduce(function(acc, el) {
              acc[el] = (acc[el] || 0) + 1;
              return acc;
            }, {});
            log ('Peers by Country:',UniqueCountryPeers)
        }
        

        log ('RU Peers:',RusPeers)
        log ('Undefined Peers:',undefinedPeers)

        */




        if (this.DontBlockAllPeersAfterTimer==0 && this.blockAllAfterTemp <=1){
             peers2block = peers.filter(function(peerfun) {
                peerfun.ip = peerfun.ip.trim()
                //log (peerfun.ip,':',peerfun.uploading_speed)

                if (peerfun.ip == '' || peerfun.ip == ' ' || peerfun.ip.match(/(192\.168)|(127\.0)|(0\.0\.0\.0)/i)|('\n')) {
                    return 0
                }
                
                if (peerfun.uploading_speed==0){
                    return 0
                }
                return 1
            })
            this.blockAllAfterTemp = this.blockAllAfter
            log (colors.green('Blocked all peers'))
        } else {
            peers2block = peers.filter(function(peerfun) {
            	var expr_country = 0
            	//var expr_country = !peerfun.country.match (/(RU)/i)
                //var expr_country = peerfun.country.match (/(00)|(IN)|(CA)|(NZ)|(PT)|(BD)|(AU)|(ID)|(SG)|(ZA)|(CN)|(AR)|(MX)|(BR)|(HK)|(IS)|(CL)|(US)/i) 
            	var expr_client = !peerfun.client.match(/(BitTorrent 7\.10\.5)|(µTorrent 3\.5\.5)|(µTorrent\/3\.5\.5\.0)|(libtorrent\/1\.2\.)/i) || peerfun.client.match(/(FAKE)|(qBittorrent)/i)
            	peerfun.ip = peerfun.ip.trim()
                //log (peerfun.ip,':',peerfun.uploading_speed)
                if (peerfun.ip == '' || peerfun.ip == ' ' || peerfun.ip.match(/(192\.168)|(127\.0)|(0\.0\.0\.0)/i)|('\n')) {
                    return 0
                }

                /*if (peerfun.progress>250){
                    return 1
                }*/

            	if (peerfun.country.length==0){
            		return expr_client
            	} else {
            		return expr_country || expr_client
            	}
                
            })

        }

        if( this.DontBlockAllPeersAfterTimer==0){
            var resetPeersTime = this.blockAllAfterTemp*this.updateRateSec
            log (' To reset peers',colors.green(Math.floor((1-this.blockAllAfterTemp/this.blockAllAfter)*10000)/100),"%",'['+
                colors.yellow(prependZero(Math.floor(resetPeersTime/60)%60))+':'+colors.yellow(prependZero(Math.floor(resetPeersTime%60)))+']')
            this.blockAllAfterTemp = this.blockAllAfterTemp - 1
        }


        if (peers2block.isEmpty()) {
            log (' Blocked (Last/Need/Total):', colors.green(blocked_ip_counter), '/', colors.yellow(peers2block.length),'/',colors.brightMagenta(this.firewall_ips.length) )
            log ('- - -\r')
            return
        }
        
        if (this.useFirewallList==1){
            this.firewall_ips = []
            firewallOut = childProcess.execSync(`chcp 65001 | netsh advfirewall firewall show rule name=all`).toString()
            var firewallOutArr = firewallOut.split('\n')
            firewallOutArr.forEach((firewall_rule) =>{
                if (firewall_rule.match(/(Rule Name)/i) && firewall_rule.match(/(_bttblock_)/i)){
                    this.firewall_ips.push(firewall_rule.substring(20).trim())
                }
            })
            this.firewall_ips.unique()
        }
        
        this.blocked_ips = []
        this.blocked_ips = this.blocked_ips.append(peers2block.map(function(x){
            return x.ip
        })).unique()


        if (this.useFirewallList==1){
            if (this.firewall_ips.length>this.max_firewall_rules){
            	//this.FirewallClearTimer = this.FirewallClearTimer - this.updateRateSec
            	//if (this.FirewallClearTimer <=0){
    	       		await this.clear_firewall()
    	       		//this.FirewallClearTimer = this.clearFirewallInterval
    	       	//}
            }
        } else {
            if (this.all_blocked_ips.length>this.max_firewall_rules){
                await this.clear_firewall()
                this.all_blocked_ips = []
            }
        }
     

        if (this.blocked_ips.length>0){
        for (i=0;i<this.blocked_ips.length;i++){

                isFoundIp = 0
                if (this.useFirewallList==1){
                    if (this.firewall_ips.length>0){
                        this.firewall_ips.forEach((firewall_ip_get) => {
                            firewall_ip_get = firewall_ip_get.substring(('_utorrent_block_').length)
                            if (firewall_ip_get === this.blocked_ips[i]){
                                isFoundIp = 1
                            }
                        })
                    }
                } else {
                    if (this.all_blocked_ips.length>0){
                        this.all_blocked_ips.forEach((ip_get) => {
                            if (ip_get === this.blocked_ips[i]){
                                isFoundIp = 1
                            }
                        })
                    }
                }
                if (isFoundIp == 0) {
                    
                    if (this.useFirewallList==0){
                        this.all_blocked_ips.push(this.blocked_ips[i])
                    }

                    blocked_ip_counter++

                    childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=in action=block remoteip=${this.blocked_ips[i]}`).toString()
                	childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=out action=block remoteip=${this.blocked_ips[i]}`).toString()
                                    	
                    //childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=in action=block localport=${this.local_port} remoteport=${this.blocked_ips[i].split(':')[1]} protocol=TCP remoteip=${this.blocked_ips[i].split(':')[0]}`).toString()
                    //childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=out action=block localport=${this.local_port} remoteport=${this.blocked_ips[i].split(':')[1]} protocol=TCP remoteip=${this.blocked_ips[i].split(':')[0]}`).toString()
                	//childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=in action=block localport=${this.local_port} remoteport=${this.blocked_ips[i].split(':')[1]} protocol=UDP remoteip=${this.blocked_ips[i].split(':')[0]}`).toString()
                    //childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=out action=block localport=${this.local_port} remoteport=${this.blocked_ips[i].split(':')[1]} protocol=UDP remoteip=${this.blocked_ips[i].split(':')[0]}`).toString()
                    
                    //chcp 65001 | netsh advfirewall firewall show rule name=all | find "utorrent" /C
                }
            }
        }

        
        if (this.logging) {
            if (this.useFirewallList==1){
                var all_blocked_text = this.firewall_ips.length
            } else {
                var all_blocked_text = this.all_blocked_ips.length
            }

            log (' Blocked (Last/Need/Total):', colors.green(blocked_ip_counter), '/', colors.yellow(peers2block.length),'/',colors.brightMagenta(all_blocked_text) )
        }
        
        log ('- - -\r')

        return 1

    },

    run: async function() {
    	if (this.isClearFireWall == 1) await this.clear_firewall()
        await this.block()
        return this.task = setInterval(async() => {
            return (await this.block())
        }, this.updateRateSec * 1000)
    },
    stop: function() {
        return clearInterval(this.task)
    }
}

main = async function() {
    await utorrent.init()
    return (await utorrent.run())
}

main()
