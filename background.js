const MaxSamplesToKeep = 200; // Should be "visible sample" + preSamples below
const preSamples=56; // Use this number of samples from the MaxSamplesToKeep only for initial EMA-calculation (these samples will not show in the graph, but provides better buy/sell-indicator arrows early in the graph)
const validSampleIntervalMinutes=[1,5,10,15,30,45,60,120,180,240,300,360,480,720,1080,1440];
const showLastHours=[1,2,3,6,12,24,48,72,96,120,240,0];
const	MtGoxAPI2BaseURL = 'https://data.mtgox.com/api/2/';
const useAPIv2=true;

function applyDefaultSettings(settings) {
	// Exchange access settings
	if (settings.ApiKey == null) settings.ApiKey='';
	if (settings.ApiSec == null) settings.ApiSec='';

	// General settings
	if (settings.tradingEnabled == null) settings.tradingEnabled = false;
	if (settings.tradingDisabledOnStart == null) settings.tradingDisabledOnStart = false;
	if (settings.tradeOnlyAfterSwitch == null) settings.tradeOnlyAfterSwitch = true;
	if (isNaN(settings.tradingIntervalMinutes)) settings.tradingIntervalMinutes = 60;
	if (isNaN(settings.LogLines)) settings.LogLines = 0;
	if (settings.currency == null) settings.currency = 'USD';
	if (isNaN(settings.keepBTC)) settings.keepBTC = 0.0;
	if (settings.keepBTCUnitIsPercentage == null) settings.keepBTCUnitIsPercentage = false;
	//if (isNaN(settings.keepFiat)) settings.keepFiat = 0.0; 	// this amount in Fiat currency will be untouched by trade - bot will play with the rest - does not work, so don't uncomment...
	
	// Parameteres for trading strategy
	if (isNaN(settings.strategy)) settings.strategy = 1;  // 0 = simple EMA(short)/EMA(long)   1 = MACD trading
	if (isNaN(settings.EmaShortPar)) settings.EmaShortPar = (settings.strategy==1?12:10);
	if (isNaN(settings.EmaLongPar)) settings.EmaLongPar = (settings.strategy==1?26:21);
	if (isNaN(settings.EmaMACDPar)) settings.EmaMACDPar = 9;
	if (isNaN(settings.MinBuyThreshold)) settings.MinBuyThreshold = (settings.strategy==1?0.05:0.25);
	if (isNaN(settings.MinSellThreshold)) settings.MinSellThreshold = (settings.strategy==1?0.05:0.25);
	if (isNaN(settings.tickCountBuy)) settings.tickCountBuy = (settings.strategy==1?1:2);
	if (isNaN(settings.tickCountSell)) settings.tickCountSell = (settings.strategy==1?1:2);
	
	// Parameters for "Experimental settings"
	if (settings.inverseEMA == null) settings.inverseEMA = false;
	return settings;
}
function parseBool(s) {
	if (s==="true")
		return true;
	if (s==="false")
		return false;		
	return null;
}
function loadSettings(name) {
	var settings={};
	// Exchange access settgins
	settings.ApiKey=localStorage.getItem("settings.current.ApiKeyMtGox");
	settings.ApiSec=localStorage.getItem("settings.current.ApiSecMtGox");
	
	// General settings
	settings.tradingDisabledOnStart = parseBool(localStorage.getItem("settings.current.tradingDisabledOnStart"));
	settings.tradingEnabled = parseBool(localStorage.getItem("settings.current.tradingEnabled"));
	settings.tradeOnlyAfterSwitch = parseBool(localStorage.getItem("settings.current.tradeOnlyAfterSwitch"));
	
	settings.tradingIntervalMinutes = parseInt(localStorage.getItem("settings.current.tradingIntervalMinutes"));
	settings.LogLines = parseInt(localStorage.getItem("settings.current.LogLines"));
	settings.currency = localStorage.getItem("settings.current.currency");
	settings.keepBTC = parseFloat(localStorage.getItem("settings.current.keepBTC"));
	settings.keepBTCUnitIsPercentage = false; // = parseBool(localStorage.getItem("settings.current.keepBTCUnitIsPercentage")); // Does not work, so don't uncomment...
	//settings.keepFiat = parseFloat(localStorage.getItem("settings.current.keepFiat")); 	// this amount in Fiat currency will be untouched by trade - bot will play with the rest - does not work, so don't uncomment...
	
	// Parameteres for trading strategy
	settings.strategy = parseInt(localStorage.getItem("settings.current.strategy"));  // 0 = simple EMA(short)/EMA(long)   1 = MACD trading
	settings.EmaShortPar = parseInt(localStorage.getItem("settings.current.EmaShortPar"));
	settings.EmaLongPar = parseInt(localStorage.getItem("settings.current.EmaLongPar"));
	settings.EmaMACDPar = parseInt(localStorage.getItem("settings.current.EmaMACDPar"));
	
	settings.MinBuyThreshold = parseFloat(localStorage.getItem("settings.current.MinBuyThreshold"));
	settings.MinSellThreshold = parseFloat(localStorage.getItem("settings.current.MinSellThreshold"));
	settings.tickCountBuy = parseInt(localStorage.getItem("settings.current.tickCountBuy"));
	settings.tickCountSell = parseInt(localStorage.getItem("settings.current.tickCountSell"));
	
	// Parameters for "Experimental settings"
	settings.inverseEMA = parseBool(localStorage.getItem("settings.current.inverseEMA"));
	
	applyDefaultSettings(settings);
	if (settings.tradingDisabledOnStart)
		settings.tradingEnabled = false;
	return settings;
}

function migrateSetting(key,newName) {
	// Migrate setting stored in old format (and optional change its name)
	var value=localStorage.getItem(key);
	if (value) {
		localStorage.setItem("settings.current."+(newName?newName:key),value);
		localStorage.removeItem(key);
	}
}
function migrateOldSetting() {
	// Migrate all old settings stored in old format
	migrateSetting("ApiKey","ApiKeyMtGox");
	migrateSetting("ApiSec","ApiSecMtGox");
	migrateSetting("tradingDisabledOnStart");
	migrateSetting("tradingEnabled");
	migrateSetting("tradingIntervalMinutes");
	migrateSetting("LogLines");
	migrateSetting("currency");
	migrateSetting("keepBTC");
	migrateSetting("keepBTCUnitIsPercentage");
	migrateSetting("keepFiat");
	migrateSetting("EmaShortPar");
	migrateSetting("EmaLongPar");
	migrateSetting("EmaMACDPar");
	migrateSetting("MinBuyThreshold");
	migrateSetting("MinSellThreshold");
	migrateSetting("tickCountBuy");
	migrateSetting("tickCountSell");
	migrateSetting("tradeOnlyAfterSwitch");
	migrateSetting("inverseEMA");
}

var settings={};

var BTC = Number.NaN;
var fiat = Number.NaN;

var H1 = []; // the H1 data
var tim = [];
var emaLong = [];
var emaShort = [];
var MACD = [];
var emaMACD = [];

var latestSolidTrend=0;
var utimer=null;
var bootstrap = 1; // progress bar for loading initial H1 data from mtgox

var popupRefresh=null;
var popupUpdateCounter=null;
var updateInProgress=false;
var lastUpdateStartTime=0;
var abortUpdateAndRedo=false;

var origLog = console.log;
var log = console.log = function() {
		var t=new Date();
		var file="";
		var line="";
		try {
			var stack = new Error().stack;
    	file = stack.split("\n")[2].split("/")[3].split(":")[0];
    	line = stack.split("\n")[2].split("/")[3].split(":")[1];
    } catch (e) {}
    var args = [];
    args.push(dat2day(t.getTime())+" "+padit(t.getHours())+":"+padit(t.getMinutes())+":"+padit(t.getSeconds()));
    args.push("["+file + ":" + line+"]");
    // now add all the other arguments that were passed in:
    for (var _i = 0, _len = arguments.length; _i < _len; _i++) {
      arg = arguments[_i];
      args.push(arg);
    }
    // pass it all into the "real" log function
    origLog.apply(window.console, args);
}

Object.size = function(obj) {
	var size=0,key;
	for (key in obj)
		if (obj.hasOwnProperty(key))
			size++;
	return size;
}

function padit(d) {return d<10 ? '0'+d.toString() : d.toString()}

function calculateEMA(ema, N) {
	var pr, k = 2 / (N+1);
	while (ema.length < H1.length) {
		if (ema.length==0) {
			ema.push(H1[0]);
		} else {
			ema.push(H1[ema.length]*k+ema[ema.length-1]*(1-k));
		}
	}
}
function calculateMACD(emaShort,emaLong,MACD) {
	if (emaShort.length!=emaLong.length) {
		log("Could not calculate MACD - emaShort.length!=emaLong.length");
		return;
	}
	while (MACD.length < emaShort.length) {
		MACD.push(emaShort[MACD.length]-emaLong[MACD.length]);
	}
}
function calculateEMAMACD(MACD, emaMACD, N) {
	if ((MACD.length!=emaShort.length)||(MACD.length!=emaLong.length)) {
		log("Could not calculate EMA MACD - (MACD.length!=emaShort.length)||(MACD.length!=emaLong.length)");
		return;
	}	
	var pr, k = 2 / (N+1);
	while (emaMACD.length < MACD.length) {
		if (emaMACD.length==0) {
			emaMACD.push(MACD[0]);
		} else {
			emaMACD.push(MACD[emaMACD.length]*k+emaMACD[emaMACD.length-1]*(1-k));
		}
	}
}

var updateInfoTimer=null;
function schedUpdateInfo(t) {
	if (updateInfoTimer)
		clearTimeout(updateInfoTimer);
	updateInfoTimer = setTimeout(updateInfo,t);
}

function updateInfo() {
	updateInfoTimer=null;
	if (settings.ApiKey=='') {
		// No API key. No use trying to fetch info...
		BTC = Number.NaN;
		fiat = Number.NaN;
		chrome.browserAction.setTitle({title: "TobliBot - A Bitcoin Trading Bot"});
		return;
	}

	var path;
	if (useAPIv2)
		path="BTC"+settings.currency+"/money/info";
	else
		path="info.php";

	mtgoxpost(path, [],
		function(e) {
			console.log("info error", e);
			chrome.browserAction.setTitle({title: "Error getting user info. MtGox problem?"});
			schedUpdateInfo(60*1000); // retry after 1 minute
		},
		function(d) {
			//console.log("info.php", d.currentTarget.responseText)
			try {
				var rr = JSON.parse(d.currentTarget.responseText);
				if (useAPIv2)
					rr=rr.data;

				if (typeof(rr.Wallets)=="undefined") {
					log("Error fetching user info:"+ rr.error);
					chrome.browserAction.setTitle({title: "Error getting balance. MtGox problem?"});
				} else {
					BTC = (rr.Wallets["BTC"]?parseFloat(rr.Wallets["BTC"].Balance.value):0);
					fiat = (rr.Wallets[settings.currency]?parseFloat(rr.Wallets[settings.currency].Balance.value):0);
					chrome.browserAction.setTitle({title: (BTC.toFixed(3) + " BTC + " + fiat.toFixed(2) + " " + settings.currency)});
					refreshPopup(true);
				}
			} catch (e) {
				//log(e+" "+d.currentTarget.responseText);
				log(e);
				chrome.browserAction.setTitle({title: "Exception parsing user info. MtGox problem?"});
			}
			schedUpdateInfo(5*60*1000); // Update balance every 5 minutes (should be smaller than the trading interval?)
		}
	)
}

function hmac_512(message, secret) {
    var shaObj = new jsSHA(message, "TEXT");
    var hmac = shaObj.getHMAC(secret, "B64", "SHA-512", "B64");
    return hmac;
}

function mtgoxpost(path, params, ef, df) {
	var req = new XMLHttpRequest();
	var t=(new Date()).getTime();
	req.open("POST", (useAPIv2 ? MtGoxAPI2BaseURL : "https://mtgox.com/api/0/")+path+"?t="+t, true); // Extra cache-busting...
	req.onerror = ef;
	req.onload = df;
	var data = "nonce="+(t*1000);
	for (var i in params)
		data+="&"+params[i];
	data = encodeURI(data);
	var	hmac=hmac_512((useAPIv2?path+'\0'+data:data),settings.ApiSec);
	req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	req.setRequestHeader("Rest-Key", settings.ApiKey);
	req.setRequestHeader("Rest-Sign", hmac);
	req.send(data);
}

function one(e) {
	console.log("ajax post error", e);
}

function onl(d) {
	console.log("ajax post ok", d);
	schedUpdateInfo(2500);
}

function dat2day(ms) {
	var t = new Date(ms);
	var y = t.getUTCFullYear().toString();
	var m = (t.getUTCMonth()+1).toString();
	var d = t.getUTCDate().toString();
	if (m.length<2)  m='0'+m;
	if (d.length<2)  d='0'+d;
	return y+"-"+m+"-"+d;
}

function get_url(req, url) {
	//console.log("get_url(): "+url);
	req.open("GET",url);
	req.send();
}

function getDiffPercent(idx) {
	var cel = emaLong[idx];
	var ces = emaShort[idx];
	if (settings.strategy==0) {
		return 100 * (ces-cel) / ((ces+cel)/2);
	} else if (settings.strategy==1) {
		// Make the MACD / MACD-signal diff relative instead of absolute.
		//return 100 * (MACD[idx]-emaMACD[idx]) / ((ces+cel)/2);
		
		// But relate it to the long EMA only to make it equal to PPO! (http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:price_oscillators_pp)
		return 100 * ((MACD[idx]-emaMACD[idx]) / cel);
	}
}

function checkThresholdsAt(idx,buy) {
	// Not yet in use... Test more!
	if (buy) {
		for (var i=0;i<settings.tickCountBuy;i++) {
			var dif = getDiffPercent(idx-i);
			if (dif<=settings.MinBuyThreshold)
				return false;
		}
		return true;
	} else {
		for (var i=0;i<settings.tickCountSell;i++) {
			var dif = getDiffPercent(idx-i);
			if (dif>=-settings.MinSellThreshold)
				return false;
		}
		return true;		
	}
}

function getTrendAtIndex(i) {
	// This function return the calculated trend at index i, with respect to EMA-values, thresholds and no of samples before triggering.
	// Return values:
	// 0		= no trend
	// 1/-1	= weak trend up/down (below thresholds)
	// 2/-2	= strong trend up/down (above thresholds)
	// 3/-3	= strong trend up/down and enough samples has passed (according to settings "Buy/Sell after X samples")
		
	if ((H1.length<5)||(i<5)||(i>=H1.length)) {
		// All data not available
		return 0;
	}

	var trend=0;
	var dif1 = getDiffPercent(i);
	if (dif1>0) {
		trend=1;
		if (dif1>settings.MinBuyThreshold) {
			trend=2;
			var dif2 = getDiffPercent(i-1);
			var dif3 = getDiffPercent(i-2);
			var dif4 = getDiffPercent(i-3);
			var dif5 = getDiffPercent(i-4);
			if ((settings.tickCountBuy==1) ||
					(settings.tickCountBuy==2 && (dif2>settings.MinBuyThreshold)) ||
					(settings.tickCountBuy==3 && (dif2>settings.MinBuyThreshold) && (dif3>settings.MinBuyThreshold)) ||
					(settings.tickCountBuy==4 && (dif2>settings.MinBuyThreshold) && (dif3>settings.MinBuyThreshold) && (dif4>settings.MinBuyThreshold)) ||
					(settings.tickCountBuy==5 && (dif2>settings.MinBuyThreshold) && (dif3>settings.MinBuyThreshold) && (dif4>settings.MinBuyThreshold) && (dif5>settings.MinBuyThreshold))) {
				trend=3;
			}
		}
	} else if (dif1<0) {
		trend=-1;
		if (dif1<-settings.MinSellThreshold) {
			trend=-2;
			var dif2 = getDiffPercent(i-1);
			var dif3 = getDiffPercent(i-2);
			var dif4 = getDiffPercent(i-3);
			var dif5 = getDiffPercent(i-4);
			if ((settings.tickCountSell==1) ||
					(settings.tickCountSell==2 && (dif2<-settings.MinSellThreshold)) ||
					(settings.tickCountSell==3 && (dif2<-settings.MinSellThreshold) && (dif3<-settings.MinSellThreshold)) ||
					(settings.tickCountSell==4 && (dif2<-settings.MinSellThreshold) && (dif3<-settings.MinSellThreshold) && (dif4<-settings.MinSellThreshold)) ||
					(settings.tickCountSell==5 && (dif2<-settings.MinSellThreshold) && (dif3<-settings.MinSellThreshold) && (dif4<-settings.MinSellThreshold) && (dif5<-settings.MinSellThreshold))) {
				trend=-3;
			}
		}
	}
	return trend;
}

function findLatestSolidTrend() {
	latestSolidTrend=0;
	for (var i=H1.length-2;i>=4;i--) {
		var trend=getTrendAtIndex(i);
		if (Math.abs(trend)==3) {
			latestSolidTrend=trend;
			break;
		}
	}
	log("Latest solid trend: "+(latestSolidTrend==3?"up":(latestSolidTrend==-3?"down":"none")));
}

function trade() {
	var keepBTCAmount=(settings.keepBTCUnitIsPercentage?(BTC*settings.keepBTC/100):settings.keepBTC);
	var sellAmount = BTC - keepBTCAmount;
	var currentTrend=getTrendAtIndex(H1.length-1);

	if (currentTrend>1) {
		// Trend is up
		chrome.browserAction.setBadgeBackgroundColor({color:[0, 128, 0, 200]});

		if (currentTrend==3) {

			// Trend is up, also according to the "Buy after X samples"-setting

			if ((settings.tradeOnlyAfterSwitch)&&(latestSolidTrend==3)) {
				// tradeOnlyAfterSwitch==true but the trend has not switched: Don't trade
				log("Trend has not switched (still up). The setting \"tradeOnlyAfterSwitch==true\", so do not trade...");
				return;
			}
			latestSolidTrend=3;

			if ((fiat>0) || ((settings.inverseEMA)&&(sellAmount>0))) {
			//if (fiat>(Math.max(0,settings.keepFiat))) {
				//var s = fiat - settings.keepFiat;
				if ((settings.tradingEnabled)&&(settings.ApiKey!='')) {
					if (!settings.inverseEMA) {
						// Normal EMA-strategy
						console.log("BUY! (EMA("+settings.EmaShortPar+")/EMA("+settings.EmaLongPar+")>"+settings.MinBuyThreshold+"% for "+settings.tickCountBuy+" or more ticks)");
						if (useAPIv2)
							mtgoxpost("BTC"+settings.currency+"/money/order/add", ['type=bid','amount_int='+(1000*100000000).toString()], one, onl);
						else
							mtgoxpost("buyBTC.php", ['Currency='+settings.currency,'amount=1000'], one, onl);
					} else {
						// Crazy Ivan!
						console.log("Crazy Ivan SELL "+sellAmount+" BTC!"+(settings.keepBTC>0?" (keep "+(settings.keepBTC.toString()+(settings.keepBTCUnitIsPercentage?" %":" BTC"))+")":"")+" EMA("+settings.EmaShortPar+")/EMA("+settings.EmaLongPar+")>"+settings.MinBuyThreshold+"% for "+settings.tickCountBuy+" or more ticks");
						if (useAPIv2)
							mtgoxpost("BTC"+settings.currency+"/money/order/add", ['type=ask','amount_int='+Math.round(sellAmount*100000000).toString()], one, onl);
						else
							mtgoxpost("sellBTC.php", ['Currency='+settings.currency,'amount='+sellAmount.toString()], one, onl);
					}
				} else {
					// Simulation only
					if (!settings.inverseEMA)
						console.log("Simulted BUY! EMA("+settings.EmaShortPar+")/EMA("+settings.EmaLongPar+")>"+settings.MinBuyThreshold+"% for "+settings.tickCountBuy+" or more ticks (Simulation only: no trade was made)");
					else
						console.log("Simulated Crazy Ivan SELL "+sellAmount+" BTC!"+(settings.keepBTC>0?" (keep "+(settings.keepBTC.toString()+(settings.keepBTCUnitIsPercentage?" %":" BTC"))+")":"")+" EMA("+settings.EmaShortPar+")/EMA("+settings.EmaLongPar+")>"+settings.MinBuyThreshold+"% for "+settings.tickCountBuy+" or more ticks (Simulation only: no trade was made)");
				}
			} else {
				console.log("Trend is up, but no "+settings.currency+" to spend...");
			}
		} else {
			console.log("Trend is up, but not for long enough (needs to be \"up\" for at least "+settings.tickCountBuy+" samples)");
		}
	} else if (currentTrend<-1) {
		// Trend is down
		chrome.browserAction.setBadgeBackgroundColor({color:[128, 0, 0, 200]});
	
		if (currentTrend==-3) {
			// Trend is down, also according to the "Sell after X samples"-setting

			if ((settings.tradeOnlyAfterSwitch)&&(latestSolidTrend==-3)) {
				// tradeOnlyAfterSwitch==true but the trend has not switched: Don't trade
				log("Trend has not switched (still down). The setting \"tradeOnlyAfterSwitch==true\", so do not trade...");
				return;
			}
			latestSolidTrend=-3;

			if ((sellAmount>0)||((settings.inverseEMA)&&(fiat>0))) {
				if ((settings.tradingEnabled)&&(settings.ApiKey!='')) {
					if (!settings.inverseEMA) {
						// Normal EMA-strategy
						console.log("SELL "+sellAmount+" BTC! (keep "+(settings.keepBTC.toString()+(settings.keepBTCUnitIsPercentage?" %":" BTC"))+") EMA("+settings.EmaShortPar+")/EMA("+settings.EmaLongPar+")<-"+settings.MinSellThreshold+"% for "+settings.tickCountSell+" or more ticks");
						if (useAPIv2)
							mtgoxpost("BTC"+settings.currency+"/money/order/add", ['type=ask','amount_int='+Math.round(sellAmount*100000000).toString()], one, onl);
						else
							mtgoxpost("sellBTC.php", ['Currency='+settings.currency,'amount='+sellAmount.toString()], one, onl);
					} else {
						// Crazy Ivan!
						console.log("Crazy Ivan BUY! (EMA("+settings.EmaShortPar+")/EMA("+settings.EmaLongPar+")<-"+settings.MinSellThreshold+"% for "+settings.tickCountSell+" or more ticks)");
						if (useAPIv2)
							mtgoxpost("BTC"+settings.currency+"/money/order/add", ['type=bid','amount_int='+(1000*100000000).toString()], one, onl);
						else
							mtgoxpost("buyBTC.php", ['Currency='+settings.currency,'amount=1000'], one, onl);
					}
				} else {
					// Simulation only
					if (!settings.inverseEMA)
						console.log("Simulated SELL "+sellAmount+" BTC! (keep "+(settings.keepBTC.toString()+(settings.keepBTCUnitIsPercentage?" %":" BTC"))+") EMA("+settings.EmaShortPar+")/EMA("+settings.EmaLongPar+")<-"+settings.MinSellThreshold+"% for "+settings.tickCountSell+" or more ticks (Simulation only: no trade was made)");
					else
						console.log("Simulted Crazy Ivan BUY! EMA("+settings.EmaShortPar+")/EMA("+settings.EmaLongPar+")<-"+settings.MinSellThreshold+"% for "+settings.tickCountSell+" or more ticks (Simulation only: no trade was made)");
				}
			} else {
				console.log("Trend is down, but no BTC to sell...");
			}
		} else {
			console.log("Trend is down, but not for long enough (needs to be \"down\" for at least "+settings.tickCountSell+" samples)");
		}
	} else {
		// Trend is undefined/weak
		if (currentTrend>0) {
			chrome.browserAction.setBadgeBackgroundColor({color:[10, 100, 10, 100]});
		} else {
			chrome.browserAction.setBadgeBackgroundColor({color:[100, 10, 10, 100]});
		}
	}
}

function refreshEMA(reset) {
	if (reset) {
		//console.log("refreshEMA(): reset EMA data (EMA/Thresholds/Interval has changed)");
		emaLong = [];
		emaShort = [];
		MACD = [];
		emaMACD = [];
	}

	if (H1.length == 0) {
		console.log("Error: H1 not loaded!");
	} else if (H1.length > MaxSamplesToKeep) {
		var skip = H1.length-MaxSamplesToKeep;
		H1 = H1.slice(skip);
		tim = tim.slice(skip);
		emaLong = emaLong.slice(skip);
		emaShort = emaShort.slice(skip);
		MACD = MACD.slice(skip);
		if (settings.strategy==1) {
			emaMACD = emaMACD.slice(skip);
		}
	}

	if ((emaShort.length<H1.length-1)||(emaLong.length<H1.length-1)) {
		//log("refreshEMA H1.length="+H1.length+" emaShort.length="+emaShort.length+" emaLong.length="+emaLong.length);
		reset=true;
	}

	calculateEMA(emaLong, settings.EmaLongPar);
	calculateEMA(emaShort, settings.EmaShortPar);
	calculateMACD(emaShort, emaLong, MACD);
	if (settings.strategy==1) {
		calculateEMAMACD(MACD, emaMACD, settings.EmaMACDPar);
	}

	if (reset)
		findLatestSolidTrend();

	if (updateInProgress) {
		chrome.browserAction.setBadgeText({text: "?"});
		console.log("Update not finished - do not trade!");
		return;
	}
	chrome.browserAction.setBadgeText({text: getDiffPercent(H1.length-1).toFixed(2)});
	trade();
}

function tidBinarySearch(trs,tid) {
	if ((trs.length<=1) || (tid<trs[1].tid) || (tid>trs[trs.length-1].tid))
		return -1;
	var l=1,u=trs.length,m;
	while (l<=u) {
		if (tid > parseInt(trs[(m=Math.floor((l+u)/2))].tid))
			l=m+1;
		else
			u=(tid==parseInt(trs[m].tid)) ? -2 : m-1;
	}
	return (u==-2) ? m : l;
}

var usefulSamplePointsLastCalculated=0;
var usefulSamplePoints={};
function reCalculateUsefulSamplePoints() {
	var time_now=(new Date()).getTime();
	if (time_now-usefulSamplePointsLastCalculated<1000*60) {
		//log("Useful sample points already calculated recently  - no need to do it again (size="+Object.size(usefulSamplePoints)+")");
		return;
	}
	usefulSamplePoints={};
	for (var j=0;j<validSampleIntervalMinutes.length;j++) {
		var minute_now = parseInt(time_now/(validSampleIntervalMinutes[j]*60*1000)) * validSampleIntervalMinutes[j]; // Fix trading samples to whole hours...
		var interval_minute_fetch = minute_now - (MaxSamplesToKeep*validSampleIntervalMinutes[j]);
		while(interval_minute_fetch<minute_now) {
			usefulSamplePoints[interval_minute_fetch]=1;
			interval_minute_fetch += validSampleIntervalMinutes[j];
		}
	}
	usefulSamplePointsLastCalculated=time_now;		
	//log("Useful sample points re-generated (size="+Object.size(usefulSamplePoints)+")");
}

function cacheOtherUsefulSamples(trs) {
	reCalculateUsefulSamplePoints();
	try {
		for (var key in usefulSamplePoints) {
			var sample=localStorage.getItem("sample."+key);
			if ((!sample)||(sample=="null")) {
				var i=tidBinarySearch(trs,parseInt(key)*60*1000000);
				if (i!=-1) {
					localStorage.setItem("sample."+key,trs[i].price);
				}
			}
		}
	} catch (e) {
		log("Exception in cacheOtherUsefulSamples(): "+e.stack);
	}
}

function getNextMinuteFetch() {
	if (tim.length>0) {
		return (tim[tim.length-1] + settings.tradingIntervalMinutes);
	} else {
		var minute_now = parseInt((new Date()).getTime() / (settings.tradingIntervalMinutes*60*1000)) * settings.tradingIntervalMinutes; // Fix trading samples to whole hours...
		return (minute_now - (MaxSamplesToKeep*settings.tradingIntervalMinutes));
	}
}

function emptySampleCache() {
	log("emptySampleCache(): remove all cached samples");
	for (var key in localStorage) {
		if (key.indexOf("sample.")==0) {
			localStorage.removeItem(key);
		}
	}
}
function cleanSampleCache() {
	// Clean old unusable cached items from local storage
	reCalculateUsefulSamplePoints();
	for (var key in localStorage) {
		if ((key.indexOf("sample.")==0)&&(!usefulSamplePoints[parseInt(key.substring(7))])) {
			// Sample no longer useful: Remove it from cache
			localStorage.removeItem(key);
		}
	}
}

function addSample(minuteFetch,price,nocache) {
	tim.push(minuteFetch);
	var f = parseFloat(price);
	var f0 = H1[H1.length-1];
	if (((f/9)>=f0) || ((f*9)<=f0)) { // strange peaks elimination - just keep old val // toli: factor 9 is better than 10...
		f=f0;
	}
	H1.push(f);

	if (nocache)
		return;

	var sample=localStorage.getItem("sample."+minuteFetch);
	if ((!sample)||(sample=="null")) {
		// The trade does not exist in local storage - add it...
		localStorage.setItem("sample."+minuteFetch,price);
		//log("Added sample to local storage: sample."+minuteFetch+" = "+price);
	}
}

function getSampleFromMtGox(req,minute_fetch) {
	var since=(minute_fetch*60*1000000).toString();
	if (useAPIv2)
		get_url(req, MtGoxAPI2BaseURL+"BTC"+settings.currency+"/money/trades/fetch?since="+since+"&nonce="+((new Date()).getTime()*1000));
	else
		get_url(req, "https://data.mtgox.com/api/0/data/getTrades.php?Currency="+settings.currency+"&since="+since+"&nonce="+((new Date()).getTime()*1000));
}

function refreshPopup(fullRefresh) {
	if ((popupRefresh!=null)&&(fullRefresh)) {
		try {
			popupRefresh();
		} catch (e) {
			popupRefresh=null;
		}
	} else if (popupUpdateCounter!=null) {
		try {
			popupUpdateCounter();
		} catch (e) {
			popupUpdateCounter=null;
		}
	}
}

function getSamplesFromCache(minute_fetch, minute_now) {
	var sample=localStorage.getItem("sample."+minute_fetch);
	while ((sample)&&(sample!="null")&&(minute_fetch <= minute_now)) {
		// As long as trades exist in in local storage: Just add them...
		//log("Adding sample from local storage: sample."+minute_fetch+" = "+localStorage.getItem("sample."+minute_fetch));
		addSample(minute_fetch,localStorage.getItem("sample."+minute_fetch));
		if (bootstrap) {
			chrome.browserAction.setBadgeText({text: ("       |        ").substr((bootstrap++)%9, 6)});
		}
		minute_fetch=getNextMinuteFetch();
		sample=localStorage.getItem("sample."+minute_fetch);
	}
	return minute_fetch;
}

var forceAbortTimer=null;
function forceAbort() {
	forceAbortTimer=null;
	if ((updateInProgress)&&(abortUpdateAndRedo)) {
		// Still not aborted: force!
		log("forceAbort(): Still not aborted: force!");
		updateInProgress=false;
		lastUpdateStartTime=0;
		updateH1(true);
	}
}

function updateH1(reset) { // Added "reset" parameter to clear the H1 data - should be called after changing settings that affects tradingInterval...
	var now=(new Date()).getTime();
	if ((updateInProgress)&&((lastUpdateStartTime==0)||(now-lastUpdateStartTime<30*1000))) {
		// Skip update if updateInProgress and no "long call" exists.
		// Unless reset==true - in that case, abort and re-update
		// Check abort status after 30 seconds and forst abort if still not 
		if (reset) {
			abortUpdateAndRedo=true;
			log("updateH1(): Reset while update in progress: abort current update");
			if (forceAbortTimer)
				clearTimeout(forceAbortTimer);
			forceAbortTimer=setTimeout(forceAbort,30*1000);
		}
		return;
	}

	updateInProgress = true;
	lastUpdateStartTime=(new Date()).getTime();

	if (reset) {
		//console.log("updateH1(): reset H1 data (Interval has changed)");
		H1 = [];
		tim = [];
		emaLong = [];
		emaShort = [];
		MACD = [];
		emaMACD = [];		
		bootstrap = 1;
		chrome.browserAction.setBadgeBackgroundColor({color:[128, 128, 128, 50]});
		abortUpdateAndRedo=false;
	}

	var minute_now = parseInt(now / (settings.tradingIntervalMinutes*60*1000)) * settings.tradingIntervalMinutes; // Fix trading samples to whole hours...
	var minute_fetch=getNextMinuteFetch();
	if (minute_fetch > minute_now) {
		//log("Not yet time to fetch new samples...");
		updateInProgress = false;
		lastUpdateStartTime=0;
		return;
	}

	minute_fetch=getSamplesFromCache(minute_fetch, minute_now);
	if (minute_fetch <= minute_now) {
		// We are not done, and a sample did not exist in local storage: We need to start fetching from MtGox...

		// But first remove old, cached trades from local storage...
		cleanSampleCache();

		req = new XMLHttpRequest();
		var url, since;

		req.onerror = function(e) {
			if (abortUpdateAndRedo) {
				updateInProgress=false;
				lastUpdateStartTime=0;
				updateH1(true);
				return;
			}
			console.log("getTrades error", e, "-repeat");
			//lastUpdateStartTime=(new Date()).getTime();
			get_url(req, url);
		}

		req.onload = function() {
			if (abortUpdateAndRedo) {
				updateInProgress=false;
				lastUpdateStartTime=0;
				updateH1(true);
				return;
			}

			var refr = false;
			var done = true;
			try {
				//log(req.responseText)
				var trs = JSON.parse(req.responseText);
				if (useAPIv2)
					trs=trs.data;

				if (trs.length > 0) {
					//log("Adding sample from MtGox: sample."+minute_fetch+" = "+trs[0].price);
					addSample(minute_fetch,trs[0].price);

					// Check if the chunk contains more any useful data
					minute_fetch=getNextMinuteFetch();
					var i=1;
					while ((i<trs.length)&&(minute_fetch <= minute_now)) {
						if (parseInt(trs[i].tid) > minute_fetch*60*1000000) {
							//log("Adding bonus sample from MtGox :) sample."+minute_fetch+" = "+trs[i].price);
							addSample(minute_fetch,trs[i].price);
							minute_fetch=getNextMinuteFetch();
						}
						i++;
					}
					cacheOtherUsefulSamples(trs);
				} else {
					log("Empty sample chunk from MtGox - no trades since minute_fetch="+minute_fetch);
					if (parseInt((new Date()).getTime()/(60*1000)) - minute_fetch < 5) {
						// The trade we where trying to fetch is less than 5 minutes old
						// => Probably no trades where made since then, so stop retrying...
						// This will happen a lot with short sample interval on a calm market, so abort the update to prevent hammering of MtGox
						//log("Aborting update (probably no trades have been made since minute_fetch)");
						updateInProgress=false;
						lastUpdateStartTime=0;
						refreshPopup(true);
						return;
					}
					// Empty chunk of old data => Probably MtGox error!
					// Go on with next sample (otherwise we might get stuck here)
					//minute_fetch=getNextMinuteFetch();
					minute_fetch+=settings.tradingIntervalMinutes;
				}

				// Check if next sample(s) exist in cache
				minute_fetch=getSamplesFromCache(minute_fetch, minute_now);
				if (minute_fetch <= minute_now) {
					// We are not done, but a sample did not exist in local storage: We need to fetch more samples from MtGox...
					lastUpdateStartTime=(new Date()).getTime();
					getSampleFromMtGox(req,minute_fetch);
					done = false;
					if (bootstrap) {
						chrome.browserAction.setBadgeText({text: ("       |        ").substr((bootstrap++)%9, 6)});
					}
				} else {
					log("Got new samples from MtGox "+H1.length+" "+MaxSamplesToKeep);
					refr = true;
					bootstrap = 0;
				}
			} catch (e) {
				var error=req.responseText;
				if (error.indexOf("Website is currently unreachable")!=-1) {
					error="MtGox says: Website is currently unreachable";
				}
				log("getTrades JSON error", e, error);
				chrome.browserAction.setBadgeText({text: "?"});
			}

			if (done) {
				updateInProgress = false;
				lastUpdateStartTime=0;
			}
			if (refr)
				refreshEMA(reset);

			refreshPopup(refr);
		}

		//log("Fetching sample from MtGox: minute_fetch="+minute_fetch);
		lastUpdateStartTime=(new Date()).getTime();
		getSampleFromMtGox(req,minute_fetch);
	} else {
		// Done, and all samples where loaded from local storage...
		log("Got new samples (all loaded from cache) "+H1.length+" "+MaxSamplesToKeep);
		updateInProgress = false;
		lastUpdateStartTime=0;
		refreshEMA(reset);
		bootstrap = 0;
		refreshPopup(true);
	}
}

migrateOldSetting();
settings=loadSettings();

console.log("Using MtGox API v"+(useAPIv2?"2":"0"));
chrome.browserAction.setIcon({path: 'robot_trading_'+(settings.tradingEnabled?'on':'off')+'.png'});
chrome.browserAction.setBadgeBackgroundColor({color:[128, 128, 128, 50]});
schedUpdateInfo(100);
setTimeout(function(){updateH1(false);}, 2*1000); 	// Delay first updateH1() to allow user info to be fetched first...
setInterval(function(){updateH1(false);}, 60*1000); // Recheck every minute (should be a multiple of any trading interval)

/*
function onErr(e) {
	log("getTrades post error", e);
}
function onLod(d) {
	log("getTrades post ok", d.currentTarget.responseText);
}
setTimeout(function(){
	mtgoxpost("money/wallet/history", ['currency=USD'], onErr, onLod);
	mtgoxpost("BTCUSD/money/info", [], onErr, onLod);
},1000);
*/