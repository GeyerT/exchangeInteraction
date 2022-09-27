const axios = require("axios")
const crypto = require("crypto");
const BasicClient = require("../basic-client");
const Ticker = require("../ticker");
const Orders = require("../orders");
const Trade = require("../trade");
const Candle = require("../candle");
const BBOUpdate = require("../bbo-update");
const Level2Point = require("../level2-point");
const Level2Update = require("../level2-update");
const Level2Snapshot = require("../level2-snapshot");
const Level3Update = require("../level3-update");
const Level3Snapshot = require("../level3-snapshot");
const Level3Point = require("../level3-point");
const https = require("../https");
const { CandlePeriod } = require("../enums");
const { throttle } = require("../throttle");
const { wait } = require("../util");

/*
apiKey: z9RS0r5UUwt6crPpujPHAA==
secret: 2DX3FBVLQDRGV7I5DTRBXZEKECIZ
*/

class WooClient extends BasicClient {
  /**
   * Kucoin client has a hard limit of 100 subscriptions per socket connection.
   * When more than 100 subscriptions are made on a single socket it will generate
   * an error that says "509: exceed max subscription count limitation of 100 per session".
   * To work around this will require creating multiple clients if you makem ore than 100
   * subscriptions.
   */
  constructor(application_id = undefined, authorization = undefined, { wssPathPub = "wss://wss.woo.org/ws/stream/", wssPathPriv = "wss://wss.woo.org/v2/ws/private/stream/", watcherMs, sendThrottleMs = 10, restThrottleMs = 250 } = {}) {
    if (application_id === undefined) throw new Error("need application_id");
    let wssPath = (authorization === undefined) ? wssPathPub+application_id : wssPathPriv+application_id
    super(wssPath, "Woo", undefined, watcherMs);
    this.hasAuthorization = true;
    this.isAuthorized = false;
    this.clientId = (authorization !== undefined) ? "PRIV_"+JSON.stringify(Date.now()) : "PUB_"+JSON.stringify(Date.now());
    this.authorization = authorization
    this.hasOrders = true;
    this.hasTickers = true;
    this.hasTrades = true;
    this.hasCandles = true;
    this.hasBBO = true;
    this.hasLevel2Snapshots = false;
    this.hasLevel2Updates = true;
    this.hasLevel3Updates = false;
    this.candlePeriod = CandlePeriod._1m;
    this._pingIntervalTime = 10000;
    this.restThrottleMs = restThrottleMs;
    this.connectInitTimeoutMs = 5000;
    this._sendMessage = throttle(this._sendMessage.bind(this), sendThrottleMs);
  }

  async _awaitAuth() {
    if (this.isAuthorized !== "processing") {
      this._sendAuth()
      this.isAuthorized = "processing"
    }

    while (this.isAuthorized === false) {
      await delay(100)
    }
  }

  _beforeConnect() {
    this._wss.on("connected", this._startPing.bind(this));
    this._wss.on("disconnected", this._stopPing.bind(this));
    this._wss.on("closed", this._stopPing.bind(this));
  }

  _startPing() {
    clearInterval(this._pingInterval);
    this._pingInterval = setInterval(this._sendPing.bind(this), this._pingIntervalTime);
  }

  _stopPing() {
    clearInterval(this._pingInterval);
  }

  _sendPing() {
    if (this._wss) {
      this._wss.send(
        JSON.stringify({
          event: "ping"
        })
      );
    }
  }

  _connect() {
    if (!this._wss) {
      this._wss = this._wssFactory(this._wssPath);
      this._wss.on("error", this._onError.bind(this));
      this._wss.on("connecting", this._onConnecting.bind(this));
      this._wss.on("connected", this._onConnected.bind(this));
      this._wss.on("disconnected", this._onDisconnected.bind(this));
      this._wss.on("closing", this._onClosing.bind(this));
      this._wss.on("closed", this._onClosed.bind(this));
      this._wss.on("message", msg => {
        try {
          this._onMessage(msg);
        } catch (ex) {
          this._onError(ex);
        }
      });

      if (this._beforeConnect) this._beforeConnect();

      this._wss.connect();
    }
  }

  _sign (params, ts) {
    let msg = ""
    for (let key in params)
    {
      if (msg.length > 0) msg += "&"
      msg += key+"="+params[key]
    }
    msg += "|"+ts

    let signedMsg = crypto.createHmac('sha256', this.authorization.secretKey)
      .update(msg)
      .digest('base64')

    return signedMsg
  }

  _sendMessage(msg) {
    this._wss.send(msg);
  }

  _sendAuth() {
    let ts = Date.now()
    let msg = '|'+ts

    let signedMsg = crypto.createHmac('sha256', this.authorization.secretKey)
      .update(msg)
      .digest('hex')

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        event: "auth",
        params: {
          apikey: this.authorization.apiKey,
          sign: signedMsg,
          timestamp: ts.toString()
        }
      })
    );
  }

  async _sendSubTicker(remote_id) {
    let market = this._tickerSubs.get(remote_id.replace("SPOT_", ""));

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: market.symbol+"@ticker",
        event: "subscribe"
      })
    );
  }

  async _sendUnsubTicker(remote_id) {
    let market = this._tickerSubs.get(remote_id.replace("SPOT_", ""));

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: market.symbol+"@ticker",
        event: "subscribe"
      })
    );
  }

  async _sendSubOrders() {
    await this._awaitAuth()

    if (this.isAuthorized === false) throw new Error("need authorized websocket for this type of subscription");

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: "executionreport",
        event: "subscribe"
      })
    );
  }

  async _sendUnsubOrders() {
    await this._awaitAuth()

    if (this.isAuthorized === false) throw new Error("need authorized websocket for this type of unsubscription");

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: "executionreport",
        event: "unsubscribe"
      })
    );
  }

  async _sendSubTrades(remote_id) {
    let market = this._tradeSubs.get(remote_id.replace("SPOT_", ""));

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: market.symbol+"@trade",
        event: "subscribe"
      })
    );
  }

  async _sendUnsubTrades(remote_id) {
    let market = this._tradeSubs.get(remote_id.replace("SPOT_", ""));

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: market.symbol+"@trade",
        event: "unsubscribe"
      })
    );
  }

  async _sendSubCandles(remote_id) {
    let market = this._candleSubs.get(remote_id.replace("SPOT_", ""));

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: market.symbol+"@kline"+this.candlePeriod,
        event: "subscribe"
      })
    );
  }

  async _sendUnsubCandles(remote_id) {
    let market = this._candleSubs.get(remote_id.replace("SPOT_", ""));

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: market.symbol+"@kline"+this.candlePeriod,
        event: "unsubscribe"
      })
    );
  }

  async _sendSubLevel2Updates(remote_id) {
    let market = this._level2UpdateSubs.get(remote_id.replace("SPOT_", ""));

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: market.symbol+"@orderbookupdate",
        event: "subscribe"
      })
    );

    //send additional request for current orderbook
    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        event: "request",
        params: {
          type: "orderbook",
          symbol: market.symbol
        }
      })
    );
  }

  async _sendUnsubLevel2Updates(remote_id) {
    let market = this._level2UpdateSubs.get(remote_id.replace("SPOT_", ""));

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: market.symbol+"@orderbookupdate",
        event: "unsubscribe"
      })
    );
  }

  async _sendSubBBO(remote_id) {
    let market = this._bboSubs.get(remote_id.replace("SPOT_", ""));

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: market.symbol+"@bbo",
        event: "subscribe"
      })
    );
  }

  async _sendUnsubBBO(remote_id) {
    let market = this._bboSubs.get(remote_id.replace("SPOT_", ""));

    this._wss.send(
      JSON.stringify({
        id: this.clientId,
        topic: market.symbol+"@bbo",
        event: "unsubscribe"
      })
    );
  }

  _onMessage(raw) {
    try {
      let msgs = JSON.parse(raw);

      if (Array.isArray(msgs)) {
        for (let msg of msgs) {
          this._processMessage(msg);
        }
      } else {
        this._processMessage(msgs);
      }
    } catch (ex) {
      this._onError(ex);
    }
  }

  _processMessage(msg) {
    if ("event" in msg) {
      if (msg.event === "subscribe") {
        if (msg.success === false) throw new Error(msg);
      }

      if (msg.event === "auth") {
        this.isAuthorized = msg.success
      }

      if (msg.event === "error") {
        let err = new Error(msg.data);
        err.msg = msg;
        this._onError(err);
        return;
      }

      if (msg.event === "pong") {
        this.emit("pong")
      }

      if (msg.event === "request" && "data" in msg) {
        this._processOrderbookRequest(msg);
      }
    }

    if ("topic" in msg) {
      // orders
      if (msg.topic === "executionreport") {
        this._processOrders(msg);
        return;
      }

      // trades
      if (msg.topic.includes("@trade")) {
        this._processTrades(msg);
        return;
      }

      // candles
      if (msg.topic.includes("@kline")) {
        this._processCandles(msg);
        return;
      }

      // tickers
      if (msg.topic.includes("@ticker")) {
        this._processTicker(msg);
        return;
      }

      // l2 updates
      if (msg.topic.includes("@orderbookupdate")) {
        this._processL2Update(msg);
        return;
      }

      // BBO updates
      if (msg.topic.includes("@bbo")) {
        this._processBBO(msg);
        return;
      }
    }
  }

  _processOrders(msg) {
    let { symbol, type, side, orderId, timestamp, quantity, totalExecutedQuantity, price, remainSize, status} = msg.data;

    let orders = new Orders({
      exchange: "Woo",
      symbol: symbol.replace("SPOT_", ""),
      orderType: type,
      side: side,
      orderId: orderId,
      type: type,
      time: timestamp,
      size: quantity,
      filledSize: totalExecutedQuantity,
      price: price,
      remainSize: (quantity - totalExecutedQuantity),
      status: status,
      timestamp: timestamp
    });

    this.emit("orders", orders, orderId);
  }

  /**
  {
    topic: 'SPOT_BTC_USDT@trade',
    ts: 1639246424459,
    data: {
      symbol: 'SPOT_BTC_USDT',
      price: 48681.12,
      size: 0.00104,
      side: 'SELL'
    }
  }
   */
  _processTrades(msg) {
    let {symbol, price, size, side} = msg.data;
    let market = this._tradeSubs.get(symbol.replace("SPOT_", ""));

    if (!market) {
      return;
    }

    let trade = new Trade({
      exchange: "Woo",
      base: market.base,
      quote: market.quote,
      tradeId: undefined,
      side: side,
      unix: undefined,
      price: price,
      amount: size,
      buyOrderId: undefined,
      sellOrderId: undefined,
    });

    this.emit("trade", trade, market);
  }

  /**
  {
    topic: 'SPOT_BTC_USDT@kline_1m',
    ts: 1639245017009,
    data: {
      symbol: 'SPOT_BTC_USDT',
      type: '1m',
      open: 48722.83,
      close: 48722.42,
      high: 48754,
      low: 48716.6,
      volume: 4.8521435,
      amount: 236410.41,
      startTime: 1639245000000,
      endTime: 1639245060000
    }
  }
   */
  _processCandles(msg) {
    let { symbol, type, open, close, high, low, volume, amount, startTime, endTime } = msg.data;
    let market = this._candleSubs.get(symbol.replace("SPOT_", ""));

    if (!market) return;

    const result = new Candle(
      startTime,
      open,
      high,
      low,
      close,
      volume
    );

    this.emit("candle", result, market);
  }

  /**
  {
    topic: 'SPOT_BTC_USDT@ticker',
    ts: 1639246116000,
    data: {
      symbol: 'SPOT_BTC_USDT',
      open: 47899,
      close: 48761.94,
      high: 49278,
      low: 46756.7,
      volume: 4950.95630588,
      amount: 238564402.91,
      count: 311137
    }
  }
   */
  _processTicker(msg) {
    let {symbol, open, close, high, low, volume, amount, count} = msg.data;
    let market = this._tickerSubs.get(symbol.replace("SPOT_", ""));

    if (!market) {
      return;
    }

    let ticker = new Ticker({
      exchange: "Woo",
      base: market.base,
      quote: market.quote,
      timestamp: undefined,
      last: close,
      open: open,
      high: high,
      low: low,
      volume: volume,
      change: undefined,
      changePercent: undefined,
      bid: undefined,
      ask: undefined,
      bidVolume: undefined,
      quoteVolume: undefined,
      askVolume: undefined,
    });

    this.emit("ticker", ticker, market);
  }

  /**
  {
    topic: 'SPOT_BTC_USDT@orderbookupdate',
    ts: 1639247399388,
    data: {
      symbol: 'SPOT_BTC_USDT',
      prevTs: 1639247399189,
      asks: [
        [Array], [Array], [Array],
        [Array], ...
      ],
      bids: [
        [Array], [Array], [Array],
        [Array], ...
      ]
    }
  }
   */
  _processL2Update(msg) {
    const ts = msg.ts
    const {symbol, prevTs, asks, bids} = msg.data;
    let market = this._level2UpdateSubs.get(symbol.replace("SPOT_", ""));

    if (!market) {
      return;
    }

    let askData = asks.map(p => new Level2Point(p[0], p[1]));
    let bidData = bids.map(p => new Level2Point(p[0], p[1]));

    let l2Update = new Level2Update({
      exchange: "Woo",
      base: market.base,
      quote: market.quote,
      sequenceId: ts,
      sequenceLast: prevTs, // deprecated, to be removed
      prevTs,
      askData,
      bidData,
    });
    this.emit("l2update", l2Update, market);
  }

  _processBBO(msg) {
    const ts = msg.ts
    const {symbol, ask, askSize, bid, bidSize} = msg.data;
    let market = this._bboSubs.get(symbol.replace("SPOT_", ""));

    if (!market) {
      return;
    }

    let askData = [ask, askSize];
    let bidData = [bid, bidSize];

    let l2Update = new BBOUpdate({
      exchange: "Woo",
      base: market.base,
      quote: market.quote,
      sequenceId: ts,
      ask: askData,
      bid: bidData,
    });
    this.emit("bbo", l2Update, market);
  }


  /**
  id: '1639247994019',
  event: 'request',
  success: true,
  ts: 1639247993451,
  data: {
    symbol: 'SPOT_BTC_USDT',
    ts: 1639247993389,
    asks: [
      [Array], [Array], [Array], ...
    ],
    bids: [
      [Array], [Array], [Array], ...
    ]
  }
  */
  _processOrderbookRequest(msg) {
    const {symbol, ts, asks, bids} = msg.data;
    let market = this._level2UpdateSubs.get(symbol.replace("SPOT_", ""));

    if (!market) {
      return;
    }

    let askData = asks.map(p => new Level2Point(p[0], p[1]));
    let bidData = bids.map(p => new Level2Point(p[0], p[1]));

    let snapshot = new Level2Snapshot({
      exchange: "Woo",
      sequenceId: ts,
      base: market.base,
      quote: market.quote,
      asks,
      bids,
    });

    this.emit("l2snapshot", snapshot, market);
  }
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = WooClient;
