var bp = chrome.extension.getBackgroundPage();
var settings=bp.settings;
var nowDate;
var nowDateStr;
var visibleChartSamples=settings.LogLines;
localStorage.chartVisible = localStorage.chartVisible || 1; // Make the chart visible by default

function padit(d) {return d<10 ? '0'+d.toString() : d.toString()};
function refreshtable() {
	const wds = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
	const bcols = ["#f2f2ff", "#fffff0"];
	var lastBgCol=0;
	var lastDate="";
	var tab = document.getElementById("tab");
	if (settings.strategy==0) {
		document.getElementById("emas").innerHTML=settings.EmaShortPar;
		document.getElementById("emal").innerHTML=settings.EmaLongPar;
	} else if (settings.strategy==1) {
		document.getElementById("indicatorHead").innerHTML="MACD("+settings.EmaLongPar+","+settings.EmaShortPar+"), EXP("+settings.EmaMACDPar+"), Diff";
	}

	if (settings.tradingIntervalMinutes>59)
		document.getElementById("int").innerHTML=parseInt(settings.tradingIntervalMinutes/60)+" hour"+(settings.tradingIntervalMinutes>119?"s":"")
	else
		document.getElementById("int").innerHTML=settings.tradingIntervalMinutes+" min";

	if (settings.tickCountBuy>1)
		document.getElementById("ticksBuy").innerHTML=settings.tickCountBuy+" samples"
	else
		document.getElementById("ticksBuy").innerHTML="1 sample";

	if (settings.tickCountSell>1)
		document.getElementById("ticksSell").innerHTML=settings.tickCountSell+" samples"
	else
		document.getElementById("ticksSell").innerHTML="1 sample";

	document.getElementById("buyTres").innerHTML=settings.MinBuyThreshold;
	document.getElementById("sellTres").innerHTML=settings.MinSellThreshold;

	if (settings.tradingEnabled) {
		document.getElementById("tradingEnabledStatus").style.display="block";
		document.getElementById("tradingDisabledStatus").style.display="none";
	} else {
		document.getElementById("tradingEnabledStatus").style.display="none";
		document.getElementById("tradingDisabledStatus").style.display="block";
	}

	var experimentalSettingsInfo="";
	if (settings.tradeOnlyAfterSwitch)
		experimentalSettingsInfo="<span class=\"experimentalSettingInfo\">Trade only after switch!</span>";
	if (settings.inverseEMA)
		experimentalSettingsInfo+="<span class=\"experimentalSettingInfo\">Inverse EMA enabled!</span>";
	document.getElementById("experimentalSettings").innerHTML=experimentalSettingsInfo;

	while (tab.rows.length>4)
		tab.deleteRow(4);

	nowDate=new Date();
	nowDateStr=nowDate.getFullYear()+"-"+padit(nowDate.getMonth()+1)+"-"+padit(nowDate.getDate());

	var displayLines=Math.min(bp.H1.length,(visibleChartSamples==0?bp.MaxSamplesToKeep-bp.preSamples:visibleChartSamples));
	if ((bp.updateInProgress)&&(bp.H1.length<bp.MaxSamplesToKeep)) { // && bp.H1.length>visibleChartSamples) {
		var r=tab.insertRow(4);
		var c=r.insertCell(-1);
		c.colSpan=5;
		c.innerHTML="&nbsp;<br>Fetching trading data - please wait...<br>("+bp.H1.length+" of "+bp.MaxSamplesToKeep+" samples loaded)<br>&nbsp;";
		c.style.backgroundColor="#FFFFFF";
		c.style.textAlign="center";
		c.id="loadCell";
	} else {
		if (bp.emaLong==null || bp.emaLong.length<bp.H1.length || bp.emaShort==null || bp.emaShort.length<bp.H1.length) {
			bp.refreshEMA(true);
		}

		for (var i=bp.H1.length-displayLines; i<bp.H1.length; i++) {
			var r=tab.insertRow(4);
			var d=new Date(bp.tim[i]*60*1000);
			r.title=wds[d.getDay()];
			var dateStr=d.getFullYear()+"-"+padit(d.getMonth()+1)+"-"+padit(d.getDate());
			var date=d.getDate()+"/"+(d.getMonth()+1)+" ";
			if (lastDate!=date) {
				lastBgCol=1-lastBgCol;
				lastDate=date;
			}

			r.style.backgroundColor=bcols[lastBgCol];

			//r.insertCell(-1).innerHTML=(new Date(bp.tim[i]*3600*1000)).getHours() + ":00"
			//r.insertCell(-1).innerHTML=d.getFullYear()+"-"+padit(d.getMonth()+1)+"-"+padit(d.getDate())+" "+ padit(d.getHours()) + ":"+padit(d.getMinutes());

			r.insertCell(-1).innerHTML=(dateStr!=nowDateStr?date:"")+padit(d.getHours()) + ":"+padit(d.getMinutes());
			r.insertCell(-1).innerHTML=bp.H1[i].toFixed(3);

			var el = bp.emaLong[i];
			var es = bp.emaShort[i];
			var perc;
			if (settings.strategy==0) {
				// Simple EMA bot
				perc = 100 * (es-el) / ((es+el)/2);
				r.insertCell(-1).innerHTML=es.toFixed(3);
				r.insertCell(-1).innerHTML=el.toFixed(3);
			} else if (settings.strategy==1) {
				// MACD bot
				var MACD = bp.MACD[i];
				var emaMACD = bp.emaMACD[i];
				//perc = 100 * (MACD-emaMACD) / ((es+el)/2);
				perc = 100 * (MACD-emaMACD)/el; // Relate the diff to the long EMA only to make it equal to PPO (http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:price_oscillators_pp)

				r.insertCell(-1).innerHTML=MACD.toFixed(3);
				r.insertCell(-1).innerHTML=emaMACD.toFixed(3);
			}
			var c=r.insertCell(-1);
			c.innerHTML=perc.toFixed(3)+'%';
			if (perc>settings.MinBuyThreshold || perc<-settings.MinSellThreshold) {
				c.style.backgroundColor = perc<0 ? "#ffd0d0" : "#d0ffd0";
			} else {
				c.style.backgroundColor = perc<0 ? "#fff0f0" : "#f0fff0";
			}
		}
	}

	if (isNaN(bp.fiat) || isNaN(bp.BTC)) {
		document.getElementById("nobalan").style.display="table-row";
		document.getElementById("balance").style.display="none";
	} else {
		document.getElementById("nobalan").style.display="none";
		document.getElementById("balance").style.display="table-row";
		document.getElementById("usd").innerHTML=bp.fiat.toFixed(2)+" "+ settings.currency;
		document.getElementById("btc").innerHTML=bp.BTC.toFixed(3);
	}

	var bitcoinchartsUrl;
	if (settings.tradingIntervalMinutes<10)
		bitcoinchartsUrl="http://www.bitcoincharts.com/charts/mtgoxUSD#rg1zig5-minztgSzbgBza1gEMAzm1g"+settings.EmaShortPar+"za2gEMAzm2g"+settings.EmaLongPar+"zxzi1gMACDzv";  // 1 day, 5-min, Candlestick , Bollinger Band, EMA(10), EMA(21), MACD
	else if (settings.tradingIntervalMinutes<30)
		bitcoinchartsUrl="http://www.bitcoincharts.com/charts/mtgoxUSD#rg1zig15-minztgSzbgBza1gEMAzm1g"+settings.EmaShortPar+"za2gEMAzm2g"+settings.EmaLongPar+"zxzi1gMACDzv"; // 1 day, 15-min
	else if (settings.tradingIntervalMinutes<60)
		bitcoinchartsUrl="http://www.bitcoincharts.com/charts/mtgoxUSD#rg2zig30-minztgSzbgBza1gEMAzm1g"+settings.EmaShortPar+"za2gEMAzm2g"+settings.EmaLongPar+"zxzi1gMACDzv"; // 2 days, 30-min
	else if (settings.tradingIntervalMinutes<120)
		bitcoinchartsUrl="http://www.bitcoincharts.com/charts/mtgoxUSD#rg5zigHourlyztgSzbgBza1gEMAzm1g"+settings.EmaShortPar+"za2gEMAzm2g"+settings.EmaLongPar+"zxzi1gMACDzv"; // 5 days, hourly
	else if (settings.tradingIntervalMinutes<=180)
		bitcoinchartsUrl="http://www.bitcoincharts.com/charts/mtgoxUSD#rg10zig2-hourztgSzbgBza1gEMAzm1g"+settings.EmaShortPar+"za2gEMAzm2g"+settings.EmaLongPar+"zxzi1gMACDzv"; // 10 days, 2-hours
	else
		bitcoinchartsUrl="http://www.bitcoincharts.com/charts/mtgoxUSD#rg30zig6-hourztgSzbgBza1gEMAzm1g"+settings.EmaShortPar+"za2gEMAzm2g"+settings.EmaLongPar+"zxzi1gMACDzv"; // month, 6-hours

	document.getElementById("externalChartLink").setAttribute('href',bitcoinchartsUrl);

	redrawChart();
}

function popupUpdateCounter() {
	var o=document.getElementById("loadCell");
	if (o) {
		o.innerHTML="&nbsp;<br>Fetching trading data - please wait...<br>("+bp.H1.length+" of "+bp.MaxSamplesToKeep+" samples loaded)<br>&nbsp;";
	}
	redrawChart();
}

function redrawChart() {
	if (localStorage.chartVisible==1) {
		var chartWidth=288;
		var emaChartHeight=100;
		var MACDChartHeight=(settings.strategy==0?50:100);

		if ((settings.strategy==0)||(settings.strategy==1)) {
			document.getElementById("chart").style.height=(emaChartHeight+MACDChartHeight+10)+"px";
			document.getElementById("MACDChart").style.display="block";
		} else {
			document.getElementById("chart").style.height=(emaChartHeight+10)+"px";
			document.getElementById("MACDChart").style.display="none";
		}
		document.getElementById("chart").style.display="block";
		document.getElementById("chartHead").style.display="block";

		nowDate=new Date();
		nowDateStr=nowDate.getFullYear()+"-"+padit(nowDate.getMonth()+1)+"-"+padit(nowDate.getDate());

		var switchesUp=[];
		var switchesDown=[];
		var latestSolidTrend=0;

		var visibleSamples=Math.min(bp.H1.length,(visibleChartSamples==0?bp.MaxSamplesToKeep-bp.preSamples:visibleChartSamples));
		var visibleStartIndex=bp.H1.length-visibleSamples;
		var H1Visible=[];
		var emaShortVisible=[];
		var emaLongVisible=[];
		var timVisible=[];

		var visibleDays=0;
		var visibleHours=0;
		var visibleMinutes=(visibleSamples*settings.tradingIntervalMinutes);
		if (visibleMinutes>59) {
			visibleHours=Math.floor(visibleMinutes/60);
			visibleMinutes=visibleMinutes-visibleHours*60;
		}
		if (visibleHours>23) {
			visibleDays=Math.floor(visibleHours/24);
			visibleHours=visibleHours-visibleDays*24;
		}
		document.getElementById("chartTimeSpan").innerHTML=(visibleDays>0?visibleDays+" days ":"")+(visibleHours>0?visibleHours+ " hrs ":"")+(visibleMinutes>0?visibleMinutes+" min":"");

		// Calculate the chart scale (max/min of y-value) and find where the trend switches (for the first time in each direction)
		var chartMinY=bp.H1[visibleStartIndex];
		var chartMaxY=bp.H1[visibleStartIndex];
		for (var i=visibleStartIndex;i<bp.H1.length;i++) {
			H1Visible.push(bp.H1[i]);
			timVisible.push(bp.tim[i]);

			if (chartMinY>bp.H1[i])
				chartMinY=bp.H1[i];
			if (chartMaxY<bp.H1[i])
				chartMaxY=bp.H1[i];

			try {
				emaShortVisible.push(bp.emaShort[i]);
				emaLongVisible.push(bp.emaLong[i]);

				if (chartMinY>bp.emaShort[i])
					chartMinY=bp.emaShort[i];
				if (chartMaxY<bp.emaShort[i])
					chartMaxY=bp.emaShort[i];

				if (chartMinY>bp.emaLong[i])
					chartMinY=bp.emaLong[i];
				if (chartMaxY<bp.emaLong[i])
					chartMaxY=bp.emaLong[i];
			} catch (e) {
				//bp.log("Exception: "+e);
				// Exception - probably because the length of emaShort or emaLong is less that H1 - no big deal...
			}
		}

		for (var i=4;i<bp.H1.length;i++) {
			var trend=bp.getTrendAtIndex(i);
  		if ((latestSolidTrend!=3)&&(trend==3)) {
  			// Trend switch up!
  			switchesUp.push([i,Math.min(Math.min(bp.H1[i],bp.emaShort[i]),bp.emaLong[i])]);
  			latestSolidTrend=3;
  		} else if ((latestSolidTrend!=-3)&&(trend==-3)) {
    		// Trend switch down!
    		switchesDown.push([i,Math.max(Math.max(bp.H1[i],bp.emaShort[i]),bp.emaLong[i])]);
    		latestSolidTrend=-3;
  		}
		}

    // settings: http://omnipotent.net/jquery.sparkline/#s-docs
		var firstLineDrawn=false;		
		if (emaShortVisible.length>=H1Visible.length) {
			$('#EMAChart').sparkline(emaShortVisible,{
				type: 'line',
				lineColor: '#008800',
				fillColor: false,
				lineWidth: 1,
				composite: false,
	    	width: chartWidth+'px',
	    	height: emaChartHeight+'px',
		    minSpotColor: false,
		    maxSpotColor: false,
				spotColor: false,
				tooltipContainer: document.getElementById("chart"),
				tooltipClassname: 'chartTooltip',
				tooltipFormatter: formatEMAShortTooltip,
				highlightLineColor: '#CCC',
				highlightSpotColor: '#000',
				xvalues: timVisible,
		    chartRangeMin: chartMinY,
		    chartRangeMax: chartMaxY
			});
			firstLineDrawn=true;
		}
		if (emaLongVisible.length>=H1Visible.length) {
			$('#EMAChart').sparkline(emaLongVisible,{
				type: 'line',
				lineColor: '#B00000',
				fillColor: false,
				lineWidth: 1,
				composite: firstLineDrawn,
				width: chartWidth+'px',
				height: emaChartHeight+'px',
		    minSpotColor: false,
		    maxSpotColor: false,
				spotColor: false,
				tooltipContainer: document.getElementById("chart"),
				tooltipClassname: 'chartTooltip',
				tooltipFormatter: formatEMALongTooltip,
				highlightLineColor: '#CCC',
				highlightSpotColor: '#000',
				xvalues: timVisible,
		    chartRangeMin: chartMinY,
		    chartRangeMax: chartMaxY
			});
			firstLineDrawn=true;
		}
    $('#EMAChart').sparkline(H1Visible,{
	    type: 'line',
	    lineColor: '#0000FF',
	    fillColor: false,
	    lineWidth: 1,
	    minSpotColor: false,
	    maxSpotColor: false,
	    spotColor: false,
	    composite: firstLineDrawn,
	    width: chartWidth+'px',
	    height: emaChartHeight+'px',
	    tooltipContainer: document.getElementById("chart"),
	    tooltipClassname: 'chartTooltip',
	    tooltipFormatter: formatPriceTooltip,
	    highlightLineColor: '#CCC',
	    highlightSpotColor: '#000',
	    xvalues: timVisible,
	    chartRangeMin: chartMinY,
	    chartRangeMax: chartMaxY
		});
		firstLineDrawn=true;

		// Draw trend switch arrows
		var indicatorCanvasOffset=4;
		var indicatorCanvas=document.getElementById("indicatorCanvas");
		if (!indicatorCanvas) {
			indicatorCanvas=document.createElement('canvas');
			indicatorCanvas.id="indicatorCanvas";
			indicatorCanvas.setAttribute("width",chartWidth+1);
			indicatorCanvas.setAttribute("height",(emaChartHeight+2*indicatorCanvasOffset));
			//indicatorCanvas.setAttribute("style","position:absolute;background:#F00;opacity:0.3;top:0px;left:0px;z-index:2000;pointer-events:none;margin:auto;margin-top:-4px;width:"+(chartWidth+3)+"px;height:"+(emaChartHeight+2*indicatorCanvasOffset+1)+"px;");
			indicatorCanvas.setAttribute("style","position:absolute;top:0px;left:0px;z-index:2000;pointer-events:none;margin:auto;margin-top:-4px;width:"+(chartWidth+1)+"px;height:"+(emaChartHeight+2*indicatorCanvasOffset+1)+"px;");
			document.getElementById("EMAChart").appendChild(indicatorCanvas);
		}
		var ctx =indicatorCanvas.getContext('2d');
		for (var i=0;i<switchesUp.length;i++) {
			var x=Math.round((switchesUp[i][0]-visibleStartIndex)/(visibleSamples-1)*(chartWidth-3)-3);
			var y=Math.min(emaChartHeight-Math.round((switchesUp[i][1]-chartMinY)/(chartMaxY-chartMinY)*emaChartHeight)+5+indicatorCanvasOffset,emaChartHeight+2*indicatorCanvasOffset-6);
			ctx.drawImage(upImg,x,y);
		}
		for (var i=0;i<switchesDown.length;i++) {
			var x=Math.round((switchesDown[i][0]-visibleStartIndex)/(visibleSamples-1)*(chartWidth-3)-3);
			var y=Math.max(emaChartHeight-Math.round((switchesDown[i][1]-chartMinY)/(chartMaxY-chartMinY)*emaChartHeight)-10-5+indicatorCanvasOffset,-5);
			ctx.drawImage(downImg,x,y);
		}

		var zeroLine=[];
		var MACDVisible=[];
		var emaMACDVisible=[];
		var MACDDivVisible=[];
		var chartAbsMaxY=0;

		if (bp.MACD.length>=H1Visible.length) {
			chartAbsMaxY=Math.abs(bp.MACD[visibleStartIndex]);

			for (var i=visibleStartIndex;i<bp.MACD.length;i++) {
				zeroLine.push(0);
				MACDVisible.push(bp.MACD[i]);

				if (Math.abs(bp.MACD[i])>chartAbsMaxY)
					chartAbsMaxY=Math.abs(bp.MACD[i]);

				try {
					emaMACDVisible.push(bp.emaMACD[i]);

					if (Math.abs(bp.emaMACD[i])>chartAbsMaxY)
						chartAbsMaxY=Math.abs(bp.emaMACD[i]);
					
						var MACDDiv=bp.MACD[i]-bp.emaMACD[i];
						MACDDivVisible.push(MACDDiv);
						if (Math.abs(MACDDiv)>chartAbsMaxY) {
							chartAbsMaxY=Math.abs(MACDDiv);
						}
				} catch (e) {
					//bp.log("Exception: "+e);
					// Exception - probably because the length of emaMACD is less that MACD - should not happen...
				}
			}

			firstLineDrawn=false;
			if (settings.strategy==1) {
				// First draw diff historgram over MACD - EMA(MACD)   (MACD strategy only)
				$('#MACDChart').sparkline(MACDDivVisible,{
					type: 'line',
					fillColor: "#BBB",
					lineColor: false,
			    minSpotColor: false,
			    maxSpotColor: false,
			    spotColor: false,
			    
			    composite: false,
			    width: chartWidth+'px',
			    height: MACDChartHeight+'px',
			    tooltipContainer: document.getElementById("chart"),
			    tooltipClassname: 'chartTooltip',
			    tooltipFormatter: formatMACDDivTooltip,
			    highlightLineColor: '#CCC',
			    highlightSpotColor: '#000',
			    xvalues: timVisible,
			    chartRangeMin: -chartAbsMaxY,
			    chartRangeMax: chartAbsMaxY
				});
				firstLineDrawn=true;
			}

			if ((settings.strategy==0)||(settings.strategy==1)) {
				// Draw zero-line   (both EMA and MACD strategies)
				$('#MACDChart').sparkline(zeroLine,{
			    type: 'line',
			    lineColor: (settings.strategy==0?'#CCC':'#777'),
			    fillColor: false,
			    lineWidth: 1,
			    minSpotColor: false,
			    maxSpotColor: false,
			    spotColor: false,
			    composite: firstLineDrawn,
			    width: chartWidth+'px',
			    height: MACDChartHeight+'px',
			    tooltipContainer: document.getElementById("chart"),
			    tooltipClassname: 'chartTooltip',
			    tooltipFormatter: function(){return "";}, // no tooltip for zero-line
			    highlightLineColor: false,
			    highlightSpotColor: false,
			    xvalues: timVisible,
			    chartRangeMin: -chartAbsMaxY,
			    chartRangeMax: chartAbsMaxY
				});
				firstLineDrawn=true;
			}
			
			if ((settings.strategy==0)||(settings.strategy==1)) {
				// Draw MACD line   (both EMA and MACD strategies - this is also the indicator for simple EMA bot strategy (zero crossing))
				$('#MACDChart').sparkline(MACDVisible,{
			    type: 'line',
			    lineColor: '#0066DD',
			    fillColor: false,
			    lineWidth: 1,
			    minSpotColor: false,
			    maxSpotColor: false,
			    spotColor: false,
			    composite: firstLineDrawn,
			    width: chartWidth+'px',
			    height: MACDChartHeight+'px',
			    tooltipContainer: document.getElementById("chart"),
			    tooltipClassname: 'chartTooltip',
			    tooltipFormatter: formatMACDTooltip,
			    highlightLineColor: '#CCC',
			    highlightSpotColor: '#000',
			    xvalues: timVisible,
			    chartRangeMin: -chartAbsMaxY,
			    chartRangeMax: chartAbsMaxY
				});
				firstLineDrawn=true;
			}
			
			if (settings.strategy==1) {
				// Draw EMA(MACD) line    (MACD strategy only)
				$('#MACDChart').sparkline(emaMACDVisible,{
			    type: 'line',
			    lineColor: '#EE0099',
			    fillColor: false,
			    lineWidth: 1,
			    minSpotColor: false,
			    maxSpotColor: false,
			    spotColor: false,
			    composite: firstLineDrawn,
			    width: chartWidth+'px',
			    height: MACDChartHeight+'px',
			    tooltipContainer: document.getElementById("chart"),
			    tooltipClassname: 'chartTooltip',
			    tooltipFormatter: formatEmaMACDTooltip,
			    highlightLineColor: '#CCC',
			    highlightSpotColor: '#000',
			    xvalues: timVisible,
			    chartRangeMin: -chartAbsMaxY,
			    chartRangeMax: chartAbsMaxY
				});
				firstLineDrawn=true;
			}

			if (firstLineDrawn) {
				// We do have a second chart - link them together
				$('#MACDChart, #EMAChart').bind('mousemove mouseleave', function(e) {
					if (e.target.parentNode.id=="chart") {
						// Outside charts (on border) - both leave!
						$("#EMAChart").data("_jqs_mhandler").mouseleave();
						$("#MACDChart").data("_jqs_mhandler").mouseleave();
						return;
					}
					var overMACD=(e.target.parentNode.id=="MACDChart");
					if (e.type=="mousemove") {
						// Emulate a mousemove of the "other" chart to generate a highlite line
						var t=$(overMACD?"#EMAChart":"#MACDChart").data("_jqs_mhandler");
						t.over=true;
						t.currentPageX = e.pageX;
	          t.currentPageY = $(overMACD?"#EMAChart":"#MACDChart").top+5;
	          if (t.tooltip) {
	          	t.tooltip.updatePosition(e.pageX, $(overMACD?"#EMAChart":"#MACDChart").top+5);
	          }
	          t.updateDisplay();
					} else if (e.type=="mouseleave") {
						$(overMACD?"#EMAChart":"#MACDChart").data("_jqs_mhandler").mouseleave();
					}
				});
			}
		}
	} else {
		document.getElementById("chart").style.display="none";
		document.getElementById("chartHead").style.display="none";
	}
}

function formatChartNumbers(v) {
	return v.toFixed(3);
}

var lastIndex=-1;
var lastEmaTime=0;
var lastEmaShort=0;
var lastEMAShortTooltipLine="";
var lastEMALongTooltipLine="";
var lastTrendTooltipLine="";
var lastPriceTooltipLine="";

function formatEMAShortTooltip(sp, options, fields){
	lastEmaTime=fields.x;
	lastIndex=-1;
	for (var i=0;i<bp.tim.length;i++) {
		if (lastEmaTime==bp.tim[i]) {
			lastIndex=i;
			break;
		}
	}
	lastEmaShort=fields.y;
	lastEMAShortTooltipLine='<span style="color: '+fields.color+'">&#9679;</span> EMA'+settings.EmaShortPar+': '+formatChartNumbers(fields.y);
  return ""; // Don't draw until last curve's tooltip is calculated...
}
function formatEMALongTooltip(sp, options, fields){
    var trend='?';
    var trendIndicator=0;
    if (lastIndex==-1) {
    	console.log("lastIndex==-1");
    } else {
    	if (settings.strategy==0) {
    		trendIndicator=((lastEmaShort-fields.y) / ((lastEmaShort+fields.y)/2)) * 100;
    	} else if (settings.strategy==1) {
    		//trendIndicator= 100 * (bp.MACD[lastIndex]-bp.emaMACD[lastIndex]) / ((bp.emaShort[lastIndex]+bp.emaLong[lastIndex])/2);
    		trendIndicator= 100 * (bp.MACD[lastIndex]-bp.emaMACD[lastIndex]) / bp.emaLong[lastIndex]; // Relate the diff to the long EMA only to make it equal to PPO (http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:price_oscillators_pp)
    	}
    }

    if (lastEmaTime==fields.x) {
    	if (trendIndicator>0) {
    		trend='<img class="trendIndicatorImg" src="trend_'+(trendIndicator>settings.MinBuyThreshold?'strong':'weak')+'_up.gif">';
    	} else if (trendIndicator<0) {
    		trend='<img class="trendIndicatorImg" src="trend_'+(-trendIndicator>settings.MinSellThreshold?'strong':'weak')+'_down.gif">';
    	} else {
    		trend='none';
    	}
    }
    lastEMALongTooltipLine='<span style="color: '+fields.color+'">&#9679;</span> EMA'+settings.EmaLongPar+': '+formatChartNumbers(fields.y);
    lastTrendTooltipLine='Trend: '+trend+' '+formatChartNumbers(trendIndicator)+'%';
    return ""; // Don't draw until last curve's tooltip is calculated...
}
function formatPriceTooltip(sp, options, fields){
	lastPriceTooltipLine='<span style="color: '+fields.color+'">&#9679;</span> Price: '+formatChartNumbers(fields.y);
  return assembleEMATooltip(fields.x); // This is the last curve, so draw the final tooltip
}
function assembleEMATooltip(tim) {
	var d=new Date(tim*60*1000);
	var dateStr=d.getFullYear()+"-"+padit(d.getMonth()+1)+"-"+padit(d.getDate());
	var t=(dateStr!=nowDateStr?dateStr:"Today")+" "+padit(d.getHours()) + ":"+padit(d.getMinutes());
	var tooltip='<div align="center">'+t+
  						'<table width="100%" border="0"><tr><td align="center" class="tooltipTableCell">'+
  						lastPriceTooltipLine+'<br>'+
		  				lastEMAShortTooltipLine+'<br>'+
		  				lastEMALongTooltipLine+'<br>'+
		  				'</td></tr></table>'+
		  				lastTrendTooltipLine+'</div>';

	lastEMAShortTooltipLine="";
	lastEMALongTooltipLine="";
	lastTrendTooltipLine="";
	lastPriceTooltipLine="";

  return tooltip;
}

var lastMACDDivTooltipLine="";
var lastMACDTooltipLine="";
var lastEmaMACDTooltipLine="";

function formatMACDTooltip(sp, options, fields) {
	lastMACDTooltipLine='<span style="color: '+fields.color+'">&#9679;</span> MACD: '+formatChartNumbers(fields.y);

	lastIndex=-1;
	for (var i=0;i<bp.tim.length;i++) {
		if (fields.x==bp.tim[i]) {
			lastIndex=i;
			break;
		}
	}

	var trendIndicator=0;
  var trend;
  if (lastIndex==-1) {
  	console.log("lastIndex==-1");
  } else {
  	if (settings.strategy==0) {
  		trendIndicator=((bp.emaShort[lastIndex]-bp.emaLong[lastIndex]) / ((bp.emaShort[lastIndex]+bp.emaLong[lastIndex])/2)) * 100;
  	} else if (settings.strategy==1) {
  		//trendIndicator = 100 * (bp.MACD[lastIndex]-bp.emaMACD[lastIndex]) / ((bp.emaShort[lastIndex]+bp.emaLong[lastIndex])/2);
  		trendIndicator= 100 * (bp.MACD[lastIndex]-bp.emaMACD[lastIndex]) / bp.emaLong[lastIndex]; // Relate the diff to the long EMA only to make it equal to PPO (http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:price_oscillators_pp)
  	}
  }

	if (trendIndicator>0) {
		trend='<img class="trendIndicatorImg" src="trend_'+(trendIndicator>settings.MinBuyThreshold?'strong':'weak')+'_up.gif">';
	} else if (trendIndicator<0) {
		trend='<img class="trendIndicatorImg" src="trend_'+(-trendIndicator>settings.MinSellThreshold?'strong':'weak')+'_down.gif">';
	} else {
		trend='none';
	}

  lastTrendTooltipLine='Trend: '+trend+' '+formatChartNumbers(trendIndicator)+'%';
	
	if (settings.strategy==0) {
		var d=new Date(fields.x*60*1000);
		var dateStr=d.getFullYear()+"-"+padit(d.getMonth()+1)+"-"+padit(d.getDate());
		var t=(dateStr!=nowDateStr?dateStr:"Today")+" "+padit(d.getHours()) + ":"+padit(d.getMinutes());
		var tooltip='<div align="center">'+t+
	  						'<table width="100%" border="0"><tr><td align="center" class="tooltipTableCell">'+
	  						lastMACDTooltipLine+'<br>'+
			  				'</td></tr></table>'+
		  					lastTrendTooltipLine+'</div>';
		
		return tooltip;
	} else {
		return "";
	}
}
function formatEmaMACDTooltip(sp, options, fields) {
	lastEmaMACDTooltipLine='<span style="color: '+fields.color+'">&#9679;</span> EXP('+settings.EmaMACDPar+'): '+formatChartNumbers(fields.y);
	return assembleMACDTooltip(fields.x);
}
function formatMACDDivTooltip(sp, options, fields) {
	//var perc = 100 * (bp.MACD[lastIndex]-bp.emaMACD[lastIndex]) / ((bp.emaShort[lastIndex]+bp.emaLong[lastIndex])/2);
	var perc = 100 * (bp.MACD[lastIndex]-bp.emaMACD[lastIndex]) / bp.emaLong[lastIndex]; // Relate the diff to the long EMA only to make it equal to PPO (http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:price_oscillators_pp)
	
	//lastMACDDivTooltipLine='<span style="color: '+fields.color+'">&#9679;</span> Diff: '+formatChartNumbers(perc)+"%";
	lastMACDDivTooltipLine='<span style="color: gray">&#9679;</span> Diff: '+formatChartNumbers(perc)+"%";
	return "";
}
function assembleMACDTooltip(tim) {
	var d=new Date(tim*60*1000);
	var dateStr=d.getFullYear()+"-"+padit(d.getMonth()+1)+"-"+padit(d.getDate());
	var t=(dateStr!=nowDateStr?dateStr:"Today")+" "+padit(d.getHours()) + ":"+padit(d.getMinutes());
	var tooltip='<div align="center">'+t+
  						'<table width="100%" border="0"><tr><td align="center" class="tooltipTableCell">'+
  						lastMACDTooltipLine+'<br>'+
		  				lastEmaMACDTooltipLine+'<br>'+
		  				lastMACDDivTooltipLine+'<br>'+
		  				'</td></tr></table>'+
		  				lastTrendTooltipLine+'</div>';

	lastMACDTooltipLine="";
	lastEmaMACDTooltipLine="";
	lastMACDDivTooltipLine="";
	lastTrendTooltipLine="";

  return tooltip;
}
	
function toggleChart() {
	if ((localStorage.chartVisible===0)||(document.getElementById("chart").style.display=="none")) {
		localStorage.chartVisible=1;
	} else {
		localStorage.chartVisible=0;
	}
	redrawChart();
}

function zoomChart(zoomIn) {
	var maxVisibleSamples=bp.MaxSamplesToKeep-bp.preSamples;
	var visibleSamples=Math.min(bp.H1.length,(visibleChartSamples==0?maxVisibleSamples:visibleChartSamples));
	var maxMinutes=parseInt(maxVisibleSamples*settings.tradingIntervalMinutes);
	var visibleChartTimespan=visibleSamples*settings.tradingIntervalMinutes;

	var changeMinutes;
	if (visibleChartTimespan<(60*3))
		changeMinutes=30;
	else if (visibleChartTimespan<(60*12))
		changeMinutes=60;
	else if (visibleChartTimespan<(60*24))
		changeMinutes=60*3;
	else if (visibleChartTimespan<(60*3*24))
		changeMinutes=60*6;
	else if (visibleChartTimespan<(60*4*24))
		changeMinutes=60*12;
	else if (visibleChartTimespan<=(60*6*24))
		changeMinutes=60*24;
	else if (visibleChartTimespan<=(60*10*24))
		changeMinutes=60*36;
	else if (visibleChartTimespan<=(60*20*24))
		changeMinutes=60*48;
	else if (visibleChartTimespan<=(60*50*24))
		changeMinutes=60*96;
	else if (visibleChartTimespan<=(60*100*24))
		changeMinutes=60*168;
	else
		changeMinutes=60*168;

	if (zoomIn) {
		visibleChartTimespan=Math.max(30,visibleChartTimespan-changeMinutes);
	} else {
		visibleChartTimespan=Math.min(maxMinutes,visibleChartTimespan+changeMinutes);
	}
	visibleChartSamples=(visibleChartTimespan==maxMinutes?0:Math.max(10,parseInt(visibleChartTimespan/settings.tradingIntervalMinutes)));
	redrawChart();
}

var upImg = new Image();
var downImg = new Image();
upImg.onload = refreshtable;
downImg.onload = refreshtable;
upImg.src = 'trend_strong_up.gif';
downImg.src = 'trend_strong_down.gif';

refreshtable();
bp.popupRefresh=refreshtable;
bp.popupUpdateCounter=popupUpdateCounter;

document.addEventListener('DOMContentLoaded', function() {
	chartLink.addEventListener('click', function(){toggleChart()});
	enableTrading.addEventListener('click', function(){
		localStorage.setItem("settings.current.tradingEnabled",settings.tradingEnabled=true);
		bp.chrome.browserAction.setIcon({path: 'robot_trading_on.png'});
		refreshtable();
	});
	disableTrading.addEventListener('click', function(){
		localStorage.setItem("settings.current.tradingEnabled",settings.tradingEnabled=false);
		bp.chrome.browserAction.setIcon({path: 'robot_trading_off.png'});
		refreshtable();
	});
	zoomIn.addEventListener('click', function(e){
		zoomChart(true);
		return false;
	});
	zoomOut.addEventListener('click', function(e){
		zoomChart(false);
		return false;
	});

	document.getElementById("chart").addEventListener("mousewheel", function(e) {
		var delta = Math.max(-1,Math.min(1,(e.wheelDelta || -e.detail)));
		zoomChart(delta>0);
		return false;
	}, false);
});
