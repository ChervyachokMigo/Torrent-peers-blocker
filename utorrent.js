var Sugar, cheerio, fs, log, main, request, utorrent

fs = require('fs').promises

colors = require('colors');

cheerio = require('cheerio')

request = require('request-promise-native')

Sugar = require('sugar').extend()

const whois = require('whois')

const childProcess = require('child_process')

function prependZero(number) {
    if (number <= 9)
        return "0" + number;
    else
        return number;
}

log = console.log.bind(console)

var global_peers_country = new Array();

const reducer = (accumulator, currentValue) => accumulator + currentValue;

utorrent = {
    //constantes
    utorrent_webui: 'http://127.0.0.1:8081/gui/' ,
    auth: {
        user: '',
        pass: ''
    },
    qbittorrent_webui: 'http://127.0.0.1:8082/',
    TorrentData: '%APPDATA%\\uTorrent\\uTorrent.exe' ,
    PortData: 'C:\\Users\\Администратор\\AppData\\Local\\BitTorrentHelper\\port',

    local_port: 10107,  //torrent port

    blockAllAfter: 24 , //ticks
    minBalanceChangeReset: 0.4, // btt/tick
    BonusBalanceChangeReset: 3, // btt/tick
    updateRateSec: 130 , //sec
    isAutoStartAllTorrents: 0 ,
    clearFirewallInterval: 3600,
    max_firewall_rules: 3000,
    DontBlockAllPeersAfterTimer: 1,
    minBTTHour: 60,


    isClearFireWall: 1,

    delete_torrents: 0, //1 true
    //delete paramenets
    minupload: 40, //KB/sec
	max_peers: 1200000,
	min_torrent_size: -1, //MB
	max_torrent_size: 150000, //MB
	max_active_peers: 100,
    tor_min_date: 120, //minutes

    stop_torrents: 0,
    max_inactive_time: 120, //minutes,
	
    accuracy_float: 1000,

    logging: true,

    //variables
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

    init: async function() {
        var $, token_html
        log ('[OPTIONS]')
        log ('Refresh rate',colors.yellow(this.updateRateSec,'sec'))
        log ('Max Firewall rules',colors.yellow(this.max_firewall_rules))
        log ('Max peers in torrent',colors.yellow(this.max_peers))
        log ('Min torrent size',colors.yellow(this.min_torrent_size),'MB')
        log ('Max torrent size',colors.yellow(this.max_torrent_size),'MB')
        log ('Inactive time to delete torrent',colors.yellow(this.max_inactive_time),'min')
        log ('- - -')
        log('Start...')

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
        log ('- - -')
        this.blockAllAfterTemp = this.blockAllAfter
        return 1
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
    get_download_torrents: async function() {
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
        
        
    },
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

            tor_exclude = result.torrents[i][tor_name] === 'Songs.7z' || result.torrents[i][tor_name].match(/^(MP3)/i)

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
        return peers
    },
    clear_firewall: async function(){
    	var resultDelete
    	resultDelete = childProcess.execSync(`chcp 65001 | netsh advfirewall firewall delete rule name=all program="${this.TorrentData}"`).toString()
   		if (this.logging){
   			log (' '+resultDelete.toString().trim())
   		}
},

    readport: async function(){
        var data = await fs.readFile(this.PortData, 'utf8')
        data = data.split('\r')
        return Number(data[0])
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
        log ('Refreshing...')
        log ('[TIME]')
        var FromstartTimeText = prependZero(Math.floor(fromStartTime/3600))+':'+prependZero(Math.floor((fromStartTime/60)%60))+':'+prependZero(fromStartTime%60)
        log (' From start [',colors.yellow(FromstartTimeText),']')
        log (' Now [ '+colors.yellow( prependZero(datetime.getHours())+':'+prependZero(datetime.getMinutes())+':'+prependZero(datetime.getSeconds()) )+' ]')
        
        log ('[BALANCE]')
        log (' From start:',this.StartBalance,colors.green('+'+BalanceChange),'BTT')
        log (' Current:',colors.yellow(this.WalletBalance),'BTT')
        if (isNaN(BalanceIncome) == false ){
            if (BalanceIncome>=0){
                log (' Balance income:',colors.green('+'+BalanceIncome),'BTT/hour',colors.green('+'+Math.floor(BalanceIncome*24*this.accuracy_float)/this.accuracy_float),'BTT/Day',colors.green('+'+Math.floor(BalanceIncome*24*30*this.accuracy_float)/this.accuracy_float),'BTT/Month',)
            } else {
                log (' Balance income:',colors.red(BalanceIncome),'BTT/hour')
            }
        } else {
             log (' Balance income:','0 BTT/hour')
        }
        log (' Balance changed from last',colors.green(Math.floor(this.balanceChange*this.accuracy_float)/this.accuracy_float),'BTT')
        
         if (typeof this.BalanceCoefficient !== 'undefined' && isNaN(this.BalanceCoefficient)==false){
            log (' Balance ratio:',colors.green(Number( Math.floor(this.BalanceCoefficient*100)/100) ),'In-app/Earning')
        } else {
            log (' Balance ratio:','0 In-app/Earning')
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


        if (this.DontBlockAllPeersAfterTimer == 1){
            this.blockAllAfterTemp = this.blockAllAfter
        }
        if (this.StartBalance != this.balanceChange){

            this.HourBalances.push(this.balanceChange)
            if (this.HourBalances.length>3600/this.updateRateSec){
                this.HourBalances.shift();
            }
            var SumHourBalance = this.HourBalances.reduce(reducer)

            log(" BTT in last hour:",colors.green( Math.floor(SumHourBalance*this.accuracy_float)/this.accuracy_float ),'('+this.HourBalances.length+')')

            if (SumHourBalance>this.minBTTHour){
                this.blockAllAfterTemp = this.blockAllAfterTemp + 1
            }

            if (this.balanceChange>this.minBalanceChangeReset){
                this.blockAllAfterTemp = this.blockAllAfter
                this.balanceGetList.push([FromstartTimeText,this.balanceChange])
                //if (this.balanceChange>this.BonusBalanceChangeReset){
               //     this.blockAllAfterTemp = this.blockAllAfterTemp + this.blockAllAfter
               // }
                log (colors.green('Change peers timer reset'))
            }

            log (this.balanceGetList)
        }

        if (this.blockAllAfterTemp <=1){
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
            	var expr_client = !peerfun.client.match(/(BitTorrent 7\.10\.5)|(µTorrent 3\.5\.5)|(µTorrent\/3\.5\.5\.0)|(libtorrent\/1\.2\.2\.0)/i) || peerfun.client.match(/(FAKE)|(qBittorrent)/i)
            	peerfun.ip = peerfun.ip.trim()
                //log (peerfun.ip,':',peerfun.uploading_speed)
                if (peerfun.ip == '' || peerfun.ip == ' ' || peerfun.ip.match(/(192\.168)|(127\.0)|(0\.0\.0\.0)/i)|('\n')) {
                    return 0
                }
               
            	if (peerfun.country.length==0){
            		return expr_client
            	} else {
            		return expr_country || expr_client
            	}
                
            })

        }
//log (peers2block)
        var resetPeersTime = this.blockAllAfterTemp*this.updateRateSec
        log (' To reset peers',colors.green(Math.floor((1-this.blockAllAfterTemp/this.blockAllAfter)*10000)/100),"%",'['+
            colors.yellow(prependZero(Math.floor(resetPeersTime/60)%60))+':'+colors.yellow(prependZero(Math.floor(resetPeersTime%60)))+']')
        this.blockAllAfterTemp = this.blockAllAfterTemp - 1


        if (peers2block.isEmpty()) {
             log (' Blocked (Last/Need/Total):', colors.green(blocked_ip_counter), '/', colors.yellow(peers2block.length),'/',colors.brightMagenta(this.firewall_ips.length) )
            log ('- - -\r')
            return
        }
        


        //log (firewallOut.length)
        this.firewall_ips = []
        firewallOut = childProcess.execSync(`chcp 65001 | netsh advfirewall firewall show rule name=all`).toString()
        var firewallOutArr = firewallOut.split('\n')
        firewallOutArr.forEach((firewall_rule) =>{
            if (firewall_rule.match(/(Rule Name)/i) && firewall_rule.match(/(_utorrent_block_)/i)){
                this.firewall_ips.push(firewall_rule.substring(38).trim())
            }
        })
        this.firewall_ips.unique()
        //log (this.firewall_ips)
        this.blocked_ips = []
        this.blocked_ips = this.blocked_ips.append(peers2block.map(function(x){
            return x.ip+':'+x.port
        })).unique()

        //log(this.blocked_ips)

        if (this.firewall_ips.length>this.max_firewall_rules){
        	//this.FirewallClearTimer = this.FirewallClearTimer - this.updateRateSec
        	//if (this.FirewallClearTimer <=0){
	       		(await this.clear_firewall())
	       		//this.FirewallClearTimer = this.clearFirewallInterval
	       	//}
        }
     

        if (this.blocked_ips.length>0){
        for (i=0;i<this.blocked_ips.length;i++){

                isFoundIp = 0
                if (this.firewall_ips.length>0){
                    this.firewall_ips.forEach((firewall_ip_get) => {
                        firewall_ip_get = firewall_ip_get.substring(('_utorrent_block_').length)
                        //log (firewall_ip_get,'==',this.blocked_ips[i])
                        if (firewall_ip_get === this.blocked_ips[i]){
                            //log (firewall_ip_get,'==',this.blocked_ips[i],'= yes')
                            isFoundIp = 1
                        }
                    })
                }
                if (isFoundIp == 0) {
                    blocked_ip_counter++
                    
                    childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=in action=block remoteip=${this.blocked_ips[i].split(':')[0]}`).toString()
                	childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=out action=block remoteip=${this.blocked_ips[i].split(':')[0]}`).toString()
                    
                    //log (this.blocked_ips[i])
                	
                    //childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=in action=block localport=${this.local_port} remoteport=${this.blocked_ips[i].split(':')[1]} protocol=TCP remoteip=${this.blocked_ips[i].split(':')[0]}`).toString()
                    //childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=out action=block localport=${this.local_port} remoteport=${this.blocked_ips[i].split(':')[1]} protocol=TCP remoteip=${this.blocked_ips[i].split(':')[0]}`).toString()
                	//childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=in action=block localport=${this.local_port} remoteport=${this.blocked_ips[i].split(':')[1]} protocol=UDP remoteip=${this.blocked_ips[i].split(':')[0]}`).toString()
                    //childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=out action=block localport=${this.local_port} remoteport=${this.blocked_ips[i].split(':')[1]} protocol=UDP remoteip=${this.blocked_ips[i].split(':')[0]}`).toString()
                    
                    //chcp 65001 | netsh advfirewall firewall show rule name=all | find "utorrent" /C
                }
            }
        }

        
        if (this.logging) {
            log (' Blocked (Last/Need/Total):', colors.green(blocked_ip_counter), '/', colors.yellow(peers2block.length),'/',colors.brightMagenta(this.firewall_ips.length) )
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
