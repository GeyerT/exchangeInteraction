# Exchange Interactions

## General:

The repository contains forks of the libraries [ccxt](https://github.com/ccxt/ccxt) and [ccxws](https://github.com/altangent/ccxws). Ccxt offers a SDK to interact with the API's of different crypto exchanges. Ccxws is quite similiar, but its main purpose is to deal with the websocket data from the different exchanges.
The created forks of ccxt and ccxws are called beext and beexws. Those are used for a self programmed trading bot. Both of these forked libraries do have self implemented code to support additional functionalities.

## beext:

The beext library is a 1:1 fork of ccxt with an additional exchange integration of woo exchange. As in the time the self programmed trading bot started to trade on woo, woo itself wasn't implemented in the ccxt library. As result an self written integration for the exchange was necessary. The other part of the code remains the same.


## beexws:

The beexws library is a fork of ccxws, whereby the supported exchanges are reduced to the exchanges KuCoin, Kraken, and Woo. As the library initially doesn't support private websocket streams, the beexws library primary goal is to enable to subscribe to these socket streams. Additionally, the library had no support for Woo. Therefore, the whole Woo integration is added to beexws.
