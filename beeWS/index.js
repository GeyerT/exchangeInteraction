const kraken = require("./exchanges/kraken-client");
const kucoin = require("./exchanges/kucoin-client");
const woo = require("./exchanges/woo-client");



module.exports = {
  kraken,
  kucoin,
  woo,

  // export all exchanges
  Kraken: kraken,
  Kucoin: kucoin,
  Woo: woo,

  // export all types
  Auction: require("./auction"),
  BasicClient: require("./basic-client"),
  BlockTrade: require("./block-trade"),
  Candle: require("./candle"),
  CandlePeriod: require("./enums").CandlePeriod,
  Level2Point: require("./level2-point"),
  Level2Snapshot: require("./level2-snapshot"),
  Level2Update: require("./level2-update"),
  Level3Point: require("./level3-point"),
  Level3Snapshot: require("./level3-snapshot"),
  Level3Update: require("./level3-update"),
  Orders: require("./orders"),
  SmartWss: require("./smart-wss"),
  Ticker: require("./ticker"),
  Trade: require("./trade"),
  Watcher: require("./watcher"),
};
