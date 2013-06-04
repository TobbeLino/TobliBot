var bp = chrome.extension.getBackgroundPage();
var settings=bp.settings;
var sla = document.getElementById("sla");
var tradInt = document.getElementById("tradingIntervalMinutes");
var tc_buy = document.getElementById("tickCountBuy");
var tc_sell = document.getElementById("tickCountSell");
var currencySelector = document.getElementById("currencySelector");
var strategySelector = document.getElementById("strategy");

if (!String.prototype.endsWith) {
	String.prototype.endsWith = function(suffix) {
		return this.indexOf(suffix, this.length - suffix.length) !== -1;
	};
}
if (!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s+|\s+$/g,'');
	};
}

function rese() {
	// Default settings
	document.getElementById("emas").value=12;
	document.getElementById("emal").value=26;
	document.getElementById("emaMACD").value=9;

	document.getElementById("buy_tras").value=0.05;
	document.getElementById("sell_tras").value=0.05;
	
	document.getElementById("currencySelector").value="USD";
	document.getElementById("keepBTC").value="0";
//	document.getElementById("keepFiat").value=0.0;
	
	document.getElementById("tradingEnabled").checked = false;
	document.getElementById("tradingDisabledOnStart").checked = false;
	document.getElementById("tradeOnlyAfterSwitch").checked = true;
	
	for (var i=0; i<tradInt.length; i++) {
    if (tradInt[i].value == 60) {
    	tradInt.selectedIndex=i;
    	break;
    }
  }

	for (var i=0; i<sla.length; i++) {
    if (sla[i].value == 0) {
    	sla.selectedIndex=i;
    	break;
    }
  }

	for (var i=0; i<tc_buy.length; i++) {
    if (tc_buy[i].value == 1) {
    	tc_buy.selectedIndex=i;
    	break;
    }
  }
	for (var i=0; i<tc_sell.length; i++) {
    if (tc_sell[i].value == 1) {
    	tc_sell.selectedIndex=i;
    	break;
    }
  }
	for (var i=0; i<currencySelector.length; i++) {
    if (currencySelector[i].value == "USD") {
    	currencySelector.selectedIndex=i;
    	break;
    }
  }
  
  for (var i=0; i<strategySelector.length; i++) {
    if (strategySelector[i].value == 1) {
    	strategySelector.selectedIndex=i;
    	break;
    }
  }
  
	// Default experimental settings 
	document.getElementById("inverseEMA").checked = false;  
  
  intervalChanged();
  updateFiatCurencyUnit();
  strategyChanged();
}

function save() {
	bp = chrome.extension.getBackgroundPage();
	settings=bp.settings;

	var buy_tr = parseFloat(document.getElementById("buy_tras").value);
	if (isNaN(buy_tr) || buy_tr<0 || buy_tr>10) {
		alert("Invalid \"buy treshold\"");
		return;
	}

	var sell_tr = parseFloat(document.getElementById("sell_tras").value);
	if (isNaN(sell_tr) || sell_tr<0 || sell_tr>10) {
		alert("Invalid \"sell treshold\"");
		return;
	}

	var es = parseInt(document.getElementById("emas").value);
	var el = parseInt(document.getElementById("emal").value);
	var eMACD = parseInt(document.getElementById("emaMACD").value);
	
	if (isNaN(es) || isNaN(el) || isNaN(eMACD)) {
		alert("Invalid \"EMA\"");
		return;
	}

	if (es==el) {
		alert("The EMA parameters must be different");
		return;
	}

	if (es<1 || el<1 || eMACD<1) {
		alert("EMA parameters must be bigger than 1");
		return;
	}

	if (es>bp.MaxSamplesToKeep || el>bp.MaxSamplesToKeep || eMACD>bp.MaxSamplesToKeep) {
		alert("EMA parameter too big - max is "+bp.MaxSamplesToKeep);
		return;
	}

	if (es > el) {
		var tmp = es;
		es = el;
		el = tmp;
		document.getElementById("emas").value=es;
		document.getElementById("emal").value=el;
	}

	var keepBTCStr=document.getElementById("keepBTC").value;
	var keepBTC=parseFloat(keepBTCStr);
//	var keepFiat=parseFloat(document.getElementById("keepFiat").value);
	if (isNaN(keepBTC) || keepBTC<0) {
		alert("Invalid \"Keep BTC\"");
		return;
	}

//	if (isNaN(keepFiat) || keepFiat<0) {
//		alert("Invalid \"Keep Fiat\"");
//		return;
//	}

	var tradingEnabled=document.getElementById("tradingEnabled").checked;

	if ((tradingEnabled) && (
			settings.EmaShortPar!=es || 
			settings.EmaLongPar!=el || 
			settings.EmaMACDPar!=eMACD ||
			settings.MinBuyThreshold!=buy_tr || 
			settings.MinSellThreshold!=sell_tr || 
			settings.tradingIntervalMinutes != parseInt(tradInt.value)
		)) {
		if (!confirm("Are you sure you want apply the new settings?\n\nChanging the sample interval/EMA/threshold values may trigger an instant trade, so you might want to disable trading and check what will happen first."))  return;
	}

	localStorage.setItem("settings.current.ApiKeyMtGox",settings.ApiKey=document.getElementById("apikey").value);
	localStorage.setItem("settings.current.ApiSecMtGox",settings.ApiSec=document.getElementById("apisec").value);

	bp.schedUpdateInfo(10);

	localStorage.setItem("settings.current.tradingEnabled",settings.tradingEnabled=tradingEnabled);
	if (settings.tradingEnabled) {
		bp.chrome.browserAction.setIcon({path: 'robot_trading_on.png'});
	} else {
		bp.chrome.browserAction.setIcon({path: 'robot_trading_off.png'});
	}
	localStorage.setItem("settings.current.tradingDisabledOnStart",settings.tradingDisabledOnStart=(document.getElementById("tradingDisabledOnStart").checked));

	var resetH1=false;
	
	var currency=currencySelector.value;
	if (currency!=settings.currency) {
		bp.emptySampleCache();
		resetH1=true;
	}
	localStorage.setItem("settings.current.currency",settings.currency=currency);
	localStorage.setItem("settings.current.keepBTC",settings.keepBTC=keepBTC);
//	localStorage.setItem("settings.current.keepFiat",settings.keepFiat=keepFiat);

/*
	// Does not work at the moment, so don't uncomment
	if (keepBTCStr.trim().endsWith("%")) {
		localStorage.setItem("settings.current.keepBTCUnitIsPercentage",settings.keepBTCUnitIsPercentage=true);
	} else {
		localStorage.setItem("settings.current.keepBTCUnitIsPercentage",settings.keepBTCUnitIsPercentage=false);
	}
*/
	if (settings.tradingIntervalMinutes != parseInt(tradInt.value)) {
		resetH1=true;
	}

	try {
		localStorage.setItem("settings.current.tradingIntervalMinutes",settings.tradingIntervalMinutes=parseInt(tradInt.value));
		localStorage.setItem("settings.current.LogLines",settings.LogLines=parseInt(sla.value*60/settings.tradingIntervalMinutes));

		localStorage.setItem("settings.current.strategy",settings.strategy=parseInt(strategySelector.value));
		
		localStorage.setItem("settings.current.EmaShortPar",settings.EmaShortPar=es);
		localStorage.setItem("settings.current.EmaLongPar",settings.EmaLongPar=el);
		localStorage.setItem("settings.current.EmaMACDPar",settings.EmaMACDPar=eMACD);

		localStorage.setItem("settings.current.MinBuyThreshold",settings.MinBuyThreshold=buy_tr);
		localStorage.setItem("settings.current.MinSellThreshold",settings.MinSellThreshold=sell_tr);

		localStorage.setItem("settings.current.tickCountBuy",settings.tickCountBuy=parseInt(tc_buy.value));
		localStorage.setItem("settings.current.tickCountSell",settings.tickCountSell=parseInt(tc_sell.value));
		
		localStorage.setItem("settings.current.tradeOnlyAfterSwitch",settings.tradeOnlyAfterSwitch=(document.getElementById("tradeOnlyAfterSwitch").checked));
		localStorage.setItem("settings.current.inverseEMA",settings.inverseEMA=(document.getElementById("inverseEMA").checked));

		if (resetH1) {
			bp.updateH1(true); // call updateH1() with reset==true instead to also reset the H1-array if trading interval or currency has changed (current data in H1 is no good)
		} else {
			bp.refreshEMA(true);
		}
		
	} catch(e) {
		bp.log("Exception in save(): "+e.stack);
	}
	bp.refreshPopup(true);
	window.location.href = "options.html";
}

function setfields() {
	document.getElementById("apikey").value=settings.ApiKey;
	document.getElementById("apisec").value=settings.ApiSec;
	document.getElementById("emas").value=settings.EmaShortPar.toString();
	document.getElementById("emal").value=settings.EmaLongPar.toString();
	document.getElementById("emaMACD").value=settings.EmaMACDPar.toString();
	
	document.getElementById("buy_tras").value=settings.MinBuyThreshold.toFixed(2);
	document.getElementById("sell_tras").value=settings.MinSellThreshold.toFixed(2);
	
	document.getElementById("currencySelector").value=settings.currency;
	document.getElementById("keepBTC").value=settings.keepBTC.toString()+(settings.keepBTCUnitIsPercentage?" %":"");
//	document.getElementById("keepFiat").value=settings.keepFiat.toString();
		
	document.getElementById("tradingEnabled").checked=settings.tradingEnabled;
	document.getElementById("tradingDisabledOnStart").checked=settings.tradingDisabledOnStart;

	for (var i=0; i<sla.options.length; i++) {
		if (parseInt(sla.options[i].value)==(settings.LogLines*settings.tradingIntervalMinutes/60)) {
			sla.selectedIndex=i;
			break;
		}
	}

	for (var i=0; i<tradInt.options.length; i++) {
		if (parseInt(tradInt.options[i].value)==settings.tradingIntervalMinutes) {
			tradInt.selectedIndex=i;
			break;
		}
	}

	for (var i=0; i<tc_buy.length; i++) {
    if (tc_buy[i].value==settings.tickCountBuy) {
    	tc_buy.selectedIndex=i;
    	break;
    }
  }
	for (var i=0; i<tc_sell.length; i++) {
    if (tc_sell[i].value==settings.tickCountSell) {
    	tc_sell.selectedIndex=i;
    	break;
    }
  }
  
	for (var i=0; i<currencySelector.length; i++) {
    if (currencySelector[i].value==settings.currency) {
    	currencySelector.selectedIndex=i;
    	break;
    }
  }
	
  for (var i=0; i<strategySelector.length; i++) {
    if (strategySelector[i].value == settings.strategy) {
    	strategySelector.selectedIndex=i;
    	break;
    }
  }

	// Parameters for "Experimental settings"
	document.getElementById("tradeOnlyAfterSwitch").checked = settings.tradeOnlyAfterSwitch;
	document.getElementById("inverseEMA").checked = settings.inverseEMA;

  intervalChanged();
  updateFiatCurencyUnit();
  strategyChanged();
}

function intervalChanged() {
	var maxVisibleSamples=bp.MaxSamplesToKeep-bp.preSamples;
	var maxHours=parseInt(maxVisibleSamples*parseInt(tradInt.value)/60);
	var currentSlaValue=parseInt(sla.value);
	
	for (var i=sla.options.length-1; i>=0; i--) {
		var slaVal=parseInt(sla.options[i].value);
		if (slaVal>maxHours) {
			sla.options[i].disabled=true;
			sla.options[i].style.color="#B0B0B0";
		} else if (slaVal!=0) {
			sla.options[i].disabled=false;
			sla.options[i].style.color="#000000";
			if (currentSlaValue>maxHours) {
				sla.selectedIndex=i;
				currentSlaValue=sla.options[i].value;
			}
		}
	}			
}

function updateFiatCurencyUnit() {
	var elems = document.getElementsByTagName('*'), i;
	for (i in elems) {
		if ((' ' + elems[i].className + ' ').indexOf(' fiatUnit ') > -1) {
			elems[i].innerHTML = currencySelector.value;
		}
	}
}

function currencyChanged() {
	updateFiatCurencyUnit();
}
function strategyChanged() {
	if (strategySelector.value=="0") {
		document.getElementById("emaMACDSpan").style.display="none";
	} else if (strategySelector.value=="1") {
		document.getElementById("emaMACDSpan").style.display="inline";
	}
}
function strategyDefaults() {
	if (parseInt(strategySelector.value)==0) {
		document.getElementById("emas").value=10;
		document.getElementById("emal").value=21;
		document.getElementById("emaMACD").value=9;	
		document.getElementById("buy_tras").value=0.25;
		document.getElementById("sell_tras").value=0.25;
		for (var i=0; i<tc_buy.length; i++) {
	    if (tc_buy[i].value == 2) {
	    	tc_buy.selectedIndex=i;
	    	break;
	    }
	  }
		for (var i=0; i<tc_sell.length; i++) {
	    if (tc_sell[i].value == 2) {
	    	tc_sell.selectedIndex=i;
	    	break;
	    }
	  }		
	} else if (parseInt(strategySelector.value)==1) {
		document.getElementById("emas").value=12;
		document.getElementById("emal").value=26;
		document.getElementById("emaMACD").value=9;	
		document.getElementById("buy_tras").value=0.05;
		document.getElementById("sell_tras").value=0.05;
		for (var i=0; i<tc_buy.length; i++) {
	    if (tc_buy[i].value == 1) {
	    	tc_buy.selectedIndex=i;
	    	break;
	    }
	  }
		for (var i=0; i<tc_sell.length; i++) {
	    if (tc_sell[i].value == 1) {
	    	tc_sell.selectedIndex=i;
	    	break;
	    }
	  }		
	}
}
function strategyHelp() {
	$(".info").css("display","none");
	$("#info_simpleEMA").css("display","block");
	$("sup").css("display","inline");
}

function getVersion(callback) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open('GET', 'manifest.json');
	xmlhttp.onload = function (e) {
		var manifest = JSON.parse(xmlhttp.responseText);
		callback(manifest.version);
	}
	xmlhttp.send(null);
}
 
document.addEventListener('DOMContentLoaded', function() {
	butres.addEventListener('click', function(){rese()});
	butsav.addEventListener('click', function(){save()});
	tradingIntervalMinutes.addEventListener('change', function(){intervalChanged()});
	currencySelector.addEventListener('change', function(){currencyChanged()});
	strategySelector.addEventListener('change', function(){strategyChanged()});
	strategyDefaultsLink.addEventListener('click', function(){strategyDefaults()});
	strategyHelpLink.addEventListener('click', function(){strategyHelp()});
	
	var version=getVersion(function(ver) {
		document.getElementById("version").innerHTML="(installed version: "+ver+")";
	});

	setfields();
	
	var defTab="li#tab1-trading";
	if ((settings.ApiKey=="")||(settings.ApiSec=="")) {
		defTab="li#tab1-exchange";
	}
	// Tabs docs: http://jspkg.com/packages/easytabs/demos
	$('#tab-container').easytabs({
		animationSpeed:50,
		defaultTab:defTab
	});
})
