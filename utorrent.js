var Sugar, cheerio, fs, log, main, request, utorrent

fs = require('fs').promises

colors = require('colors');

cheerio = require('cheerio')

request = require('request-promise-native')

Sugar = require('sugar').extend()

const whois = require('whois')

const childProcess = require('child_process')

function prependZero(number) {
    if (number < 9)
        return "0" + number;
    else
        return number;
}

log = console.log.bind(console)

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


utorrent = {
    root_url: 'http://127.0.0.1:8081/gui/' ,
    auth: {
        user: 'cpu1',
        pass: 'pass'
    },
    download_url: 'http://127.0.0.1:8082/',
    TorrentData: '%APPDATA%\\uTorrent\\uTorrent.exe' ,
    PortData: 'C:\\Users\\Администратор\\AppData\\Local\\BitTorrentHelper\\port',
    updateRateSec: 45 ,
    clearFirewallInterval: 3600,
    max_firewall_rules: 5000,
    minupload: 40, //KB/sec
	max_peers: 1200,
	min_torrent_size: 10, //MB
	max_torrent_size: 15000, //MB
	max_active_peers: 100,
    max_inactive_time: 360, //minutes,
	tor_min_date: 30, //minutes
    blocked_ips: [],
    firewall_ips: [],
    logging: true,
    FirewallClearTimer: 0,
    GUIPort: 0,
    WalletBalance: 0,
    BTTPeers: 0,
    BalanceCoefficient: 0.0,
    StartBalance:0,
    StartEarning:0,
    StartTime:0,
    torrentsInactive: [],
    init: async function() {
        var $, token_html
        log('Start...')

        this.cookies = request.jar()
        token_html = (await request({
            uri: this.root_url + 'token.html',
            auth: this.auth,
            jar: this.cookies
        }))

        $ = cheerio.load(token_html)
        this.token = $('div').text()
        
        this.GUIPort = await this.readport()
        log ('GUI Port ',this.GUIPort)

        this.StartTime = new Date

        return 1
    },
    getWalletData: async function (){
        var $,status
        status = JSON.parse((await request({   
            uri: 'http://127.0.0.1:'+this.GUIPort+'/api/status'
        })))
        this.WalletBalance = status['balance']/1000000
        this.BTTPeers = status['peers']
        if (this.StartBalance == 0){
            this.StartBalance = this.WalletBalance
        }
    },
    get_download_torrents: async function() {
        var $,data,i

        data = JSON.parse((await request({   
            uri: this.download_url+'api/v2/sync/maindata'
            })))
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
        status = JSON.parse((await request({   
            uri: 'http://127.0.0.1:'+this.GUIPort+'/api/revenue/total'
        })))
        status['total_earning'] = status['total_earning']/1000000
        if (this.StartEarning == 0){
            this.StartEarning = status['total_earning']
        }
        this.BalanceCoefficient = (this.WalletBalance-this.StartBalance)/(status['total_earning']-this.StartEarning)
    },
    call: async function({api = '', params, method = 'GET'} = {}) {
        return JSON.parse((await request({
            uri: this.root_url + api,
            method: method,
            qs: {
                token: this.token,
                ...params
            },
            auth: this.auth,
            jar: this.cookies
        })))
    },

    get_torrents: async function() {
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
       
        for (i = 0, len = result.torrents.length; i < len; i++) {
            //log (result.torrents[i][tor_status])
        	/*if (       		
        		!result.torrents[i][tor_name].match(/^(MP3)/i) && result.torrents[i][tor_active_peers] > 0 && result.torrents[i][tor_upload_speed]/result.torrents[i][tor_active_peers] < this.minupload*1024
        		){
        		
        		(await this.stop_start(result.torrents[i][0]))
        		log("stop start torrent: ",result.torrents[i][tor_name])

        	}*/

        	if (
        		//!result.torrents[i][tor_name].match(/^(MP3)/i) && (
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
        		log("delete torrent: ",result.torrents[i][tor_name])

        	}

            if (result.torrents[i][tor_status].match(/^(Finished)/i)){
                //log (result.torrents[i][tor_name])
                await this.stop_start(result.torrents[i][0])
            }

        	if (result.torrents[i][tor_status].match(/^(Seeding)/i) && result.torrents[i][tor_active_peers] > 0 ){

		        this.torrents.push(result.torrents[i])

                if (this.torrentsInactive.length>0){
                    finded = 0
                    for (j = 0; j < this.torrentsInactive.length; j++) {
                        if (this.torrentsInactive[j][0]==result.torrents[i][0]){
                            this.torrentsInactive.splice(j,1)
                            //log ("became active ",this.torrentsInactive[j][tor_name])
                        }
                    }
                }

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

	    }
       log ('Torrents',colors.green('active: '+this.torrents.length),',',colors.red('inactive:',this.torrentsInactive.length))

        return this.hashes = this.torrents.map(function(x) {
	            return x[0]
        })
    },
    check_torrents_inactive: async function() {
        var j
        if (this.torrentsInactive.length>0){
            

            for (j = 0; j < this.torrentsInactive.length; j++) {
                //log ( Math.floor((new Date).getTime()/1000) , this.torrentsInactive[j][45] )
                if ( (Math.floor((new Date).getTime()/1000) - this.torrentsInactive[j][45] ) > this.max_inactive_time * 60 ){
                    log ("Stop ",this.torrentsInactive[j][2]," by inactive ",this.max_inactive_time," minutes")
                    await this.delete_torrent(this.torrentsInactive[j][0])
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
        var result = await whois.lookup(peer[1], function(err, data) {
            if (data != undefined){
                var countrypos = data.indexOf('country:    ')
                var countrypeer = data.substring((countrypos+16),(countrypos+18)).trim()

                if (countrypeer.length>1){

                    return countrypeer
                } else {
                    return ''
                }
            } else {
                return ''
            }
            
        })
        return result
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
           // log (peer_country)

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
        log ('Total peers:',colors.green(peers.length))
        return peers.unique('ip').sortBy('client')
    },
    clear_firewall: async function(){
    	var resultDelete
    	resultDelete = childProcess.execSync(`chcp 65001 | netsh advfirewall firewall delete rule name=all program="${this.TorrentData}"`).toString()
   		if (this.logging){
   			log (resultDelete.toString())
   		}
},

    readport: async function(){
        var data = await fs.readFile(this.PortData, 'utf8')
        data = data.split('\r')
        return Number(data[0])
    },

    block: async function() {
        var peers, peers2block,i,resultIn,resultOut,firewallOut,firewall_ip,isFoundIp,blocked_ip_counter,resultDelete

        var datetime = new Date
        log ('['+colors.yellow(datetime.getHours()+':'+datetime.getMinutes()+':'+datetime.getSeconds())+'] Refreshing...')
        var fromStartTime = Math.floor((datetime-this.StartTime)/1000)
        //log (fromStartTime)
        log ('from start [',colors.yellow(prependZero(Math.floor(fromStartTime/3600))+':'+prependZero(Math.floor((fromStartTime/60)%60))+':'+prependZero(fromStartTime%60)),']')

        await this.get_download_torrents()

        await this.getWalletData()
        log ('Your balance:',colors.green(this.WalletBalance))
        log ('BTT Peers:',colors.green(this.BTTPeers))

        await this.getCoeficient()
        log ('Balance Ratio:',colors.green(Number( Math.floor(this.BalanceCoefficient*100)/100) ))
        log ('You get: ',colors.green(this.WalletBalance-this.StartBalance))

        await this.get_torrents()

        await this.check_torrents_inactive()
       
        peers = (await this.get_all_peers())
        peers2block = peers.filter(function(peerfun) {
        	var expr_country = 0
        	//var expr_country = !peerfun.country.match (/(RU)/i)
            //var expr_country = peerfun.country.match (/(00)|(IN)|(CA)|(NZ)|(PT)|(BD)|(AU)|(ID)|(SG)|(ZA)|(CN)|(AR)|(MX)|(BR)|(HK)|(IS)|(CL)|(US)/i) 
        	var expr_client = !peerfun.client.match(/(BitTorrent 7\.10\.5)|(µTorrent 3\.5\.5)|(µTorrent\/3\.5\.5\.0)/i) || peerfun.client.match(/(FAKE)|(qBittorrent)/i)
        	peerfun.ip = peerfun.ip.trim()
        	if (peerfun.ip == '' || peerfun.ip == ' ' || peerfun.ip.match(/(192\.168)|(127\.0)|(0\.0\.0\.0)/i)|('\n')) {
        		return 0
        	}
        	if (peerfun.country.length==0){
        		return expr_client
        	} else {
        		return expr_country || expr_client
        	}
        })
        if (peers2block.isEmpty()) {
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
        this.blocked_ips = this.blocked_ips.append(peers2block.map('ip')).unique()

        blocked_ip_counter = 0

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
                	//log (this.blocked_ips[i])
                	resultIn = childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=in action=block remoteip=${this.blocked_ips[i]}`).toString()
                    resultOut = childProcess.execSync(`chcp 65001 | netsh advfirewall firewall add rule name="_utorrent_block_${this.blocked_ips[i]}" program="${this.TorrentData}" dir=out action=block remoteip=${this.blocked_ips[i]}`).toString()
                	//chcp 65001 | netsh advfirewall firewall show rule name=all | find "utorrent" /C
                }
            }
        }

        
        if (this.logging) {
            log ('Blocked (Now/Need/Firewall):', colors.green(blocked_ip_counter), '/', colors.yellow(peers2block.length),'/',colors.brightMagenta(this.firewall_ips.length) )
        }

        log ('- - -\r')

        return 1

    },
    run: async function() {
    	//await this.clear_firewall()
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
