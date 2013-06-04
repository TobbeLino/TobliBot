TobliBot - A Bitcoin Trading Bot for Chrome
===========================================

This is an automatic Bitcoin trading bot for the MtGox exchange.
It currently implements two different trading strategies:

 1)	 The MACD trading indicator (described here: http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:moving_average_conve)
 
 2)	 A simpler EMA indicator ("Goomboo's strategy" described in detail here: https://bitcointalk.org/index.php?topic=60501)

This bot started as an enhancement/mod of the "Gox Trading Bot Extension" (https://chrome.google.com/webstore/detail/gox-trading-bot/iejmifigokhpcgpmoacllcdiceicmejb) that was a basic implementation of Goomboo's simple EMA strategy.



Disclaimer
----------
The author of this bot does not take any responsiblity for any damage or loss caused by this software.
There can be bugs, and the bot may not perform as expected.
Even though the author has tested it, there are absolutely NO warranties!
Please consider testing it with a small amount of funds first, and check to the source code to see how it's working.



Features
--------

 * MACD trading indicator/strategy
 
 * Simple EMA-indicator/strategy ("Goomboo's strategy" described in detail here: https://bitcointalk.org/index.php?topic=60501)

 * Choose sample intervals for the EMA calculations (1, 5, 10, 15, 30, 45 minutes, 1, 2, 3, 4, 5, 6, 8, 12, 18 hours, 1 day)
 
 * Set separate buy/sell thresholds to trigger trades

 * Decide when to trade after trend switch (1-5 samples above/below thresholds, separate settings for buy/sell)
  
 * Trade in all fiat currencies supported by MtGox (currently: USD, EUR, AUD, CAD, CHF, CNY, DKK, GBP, HKD, JPY, NZD, PLN, RUB, SEK, SGD, THB, NOK, CZK)
 
 * Keep an amount of BTC away from trading
 
 * Detect and eliminate peaks/invalid samples from MtGox

 * Possibility to disable trading (the bot does everything, except the actual trading). Good for testing if e.g. a changed sample interval will cause a trend switch and would trigger an immediate trade.
 
 * Zoomable charts with price, EMA-values and trigger indicators + MACD chart with MACD-line, MACD-signal line and diff-histogram

 * Caching trade data to avoid hammering of MtGox and faster loading
 
 * Option to always start the bot in "disabled" mode to avoid instant accidental trading with "bad" settings from last run.
 
 * Using MtGox API v2 for more reliable access
 
 * Improved stability on networks problems and MtGox access failures
 


	
Installation
------------

1. Copy all files from github to your computer.
2. Start Chrome and go to Options/Tools/Extensions (or just type URL: "chrome://extensions/")
3. Click on "Load unpacked extension..." and select the folder that holds the files 
4. The "TobliBot" should have been added
5. Click "Options" to configure the bot

From the extensions page in Chrome, you can also open the console to se some logging I you want:
Click the link after Inspect views: "_generated_background_page.html" next to the extension, and pick the Console-tab



Changelog
=========

0.2.9.1
- Added MACD trading indicator/strategy
- Changed name to "TobliBot" (as it will maybe support other exhanges in the future (no promises though!), and it's now not only a EMA-bot)
- Added longer sample intervals:	6, 8, 12, 18 and 24 hours
- Fixed bug: Indicator arrows were not shown for the very latest sample
- Fixed flickering tooltip in chart
- Optimized cleaning the trade cache
- Started implementing new options-page with tabs (help/info not finished yet)
- Moved the setting "Only trade after trend switch" from the experimental setion to the general, and made it enabled by default

0.2.2.3
- Fixed bug with "Trading enabled" setting on startup when "Disabled on start" is unchecked (bot would always start with trading disabled)

0.2.2.2
- Fixed error fetchig user info from MtGox when a currency with no funds (in MtGox) was selected in the settings

0.2.2.1
- Show proper EMA-lines in the external link to bitcoincharts.com (however, bitcoincharts don't have the exact same intervals as this bot)
- Fixed wrong popup-windows height when the chart tooltip showed
- Added info about "experimantal settings" in popup-window
- Fixed a bug where "Trade only on trend switches" could be interpreted as "enabled" if settings had not been saved

0.2.2.0
- Indicator arrows in graph
- Thinner price line
- Zoomable chart
- Added link to external charts (at bitcoincharts.com)
- Experimental section added
- Experimental feature: Only trade after trend switch (if starting the bot between trend switches, wait until next swicth)
- Experimental feature: "The Crazy Ivan" - reverse the EMA-logic: The bot will sell when it's supposed to buy, and buy when it's supposed to sell!
- Lowered retry-rate when failed to fetch user info (retry after 1 minute instead of 10 seconds) to avoid hammering MtGox
- More robust handling of network problems (updates could stop after a network loss) - bot should now update and resume within a minute
- Better handling when computer resumes from sleep (updates could stop after sleep) - bot should now update and resume within a minute

0.2.1.8
- Fixed stupid bug, not fetching last sample properly ("Update not finished - do not trade!" in the console log)

0.2.1.7
- Fixed problem with garbage in cache after switching currency (the cache will now be flushed when changing currency)
- Fixed problem fetching trade data with very short intervals and currecies with very low trading volumes (it's still a problem to get accurate EMA-values, but it's not quite possible when hardly any trades are being made!)
- Selecting currency in settings is now made from a drop-down list
- New icon: green eyes = trading is enabled :)

0.2.1.6
- Switched to MtGox API v2 by default (seems more stable when MtGox is DDoS:ed or having oher problems)
- Fixed positon icons for chart and settings in popup
- Improved speed/effectiveness when fetching data from MtGox (use or cache all usable data in every chunk)

0.2.1.5
- Fixed bug corrupting data when user updated settings while fetching data
- Cache trade data in local storage (a lot faster loading and less hammering of MtGox servers on restart)
- Remember if chart is visible or not when closing popup
- New setting "Disabled on start". Will make he bot always start disabled to avoid instant/accidental trading on startup
- Lowered minimum sample interval to 1 minute for those who would like to experiment
- Separate "Buy/Sell after X samples above/below thresholds"
- Allow buy/sell after up to 5 samples (could be useful with very short sample intervals)

0.2.1.4
- Fixed fetching trades with no API key. The bot can now be used to monitor trend without an API Key (but it will not be able to trade of course)
- Experimental implementation of MtGox API v2 (set "useAPIv2=true" in file "background.js" if you want to test. But be warned: It's not extensively tested, so use at your own risk!)

0.2.1.3
- Added cache-busting for calls fetching trades

0.2.1.2
- Fixed typos
- Better trend indicator i tooltip on chart

0.2.1.1
- Added chart

0.2.1.0
- Initial release



Donations
---------
This extension is free to use.

However, if my bot makes you rich, please consider donating a fraction of your profit!
...or, of course, also if you appreciate my work for other reasons... :)
Donations are very encouraging - even very small ones!
So please consider sending a small amount of BTC to:
1LUqdAXvH9gbYemZKeiMrVJ5njhm6ZvKmF
