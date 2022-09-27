'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const { BadSymbol, BadRequest, ExchangeNotAvailable, ArgumentsRequired, PermissionDenied, AuthenticationError, ExchangeError, OrderNotFound, DDoSProtection, InvalidNonce, InsufficientFunds, CancelPending, InvalidOrder, InvalidAddress, RateLimitExceeded } = require ('./base/errors');
const { TRUNCATE, DECIMAL_PLACES } = require ('./base/functions/number');

//  ---------------------------------------------------------------------------

module.exports = class woo extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'woo',
            'name': 'Woo',
            'countries': [ 'US' ],
            'version': '0',
            'rateLimit': 1000,
            'certified': false,
            'pro': false,
            'has': {
                'cancelAllOrders': false,
                'cancelAllOrdersSymbol': true, //HIER privateDeleteV1Orders
                'cancelOrder': true, //HIER privateDeleteV1Order
                'CORS': false,
                'createDepositAddress': false,
                'createOrder': true, //privatePostV1Order
                'fetchBalance': false,
                'fetchBorrowRate': false,
                'fetchBorrowRates': false,
                'fetchClosedOrders': false,
                'fetchCurrencies': true, //publicGetV1PublicTokenNetwork
                'fetchDepositAddress': false,
                'fetchDeposits': false,
                'fetchPremiumIndexOHLCV': false,
                'fetchLedger': false,
                'fetchLedgerEntry': false,
                'fetchMarkets': true, //publicGetV1PublicInfo
                'fetchMyTrades': true, //privateGetV1ClientTrades
                'fetchOHLCV': true, //privateGetV1Kline
                'fetchOpenOrders': false,
                'fetchOrder': true, //privateGetV1OrderOid
                'fetchOrderBook': true, //privateGetV1OrderbookSymbol
                'fetchOrderTrades': true, //privateGetV1OrderOidTrades
                'fetchTicker': false,
                'fetchTickers': false,
                'fetchTime': false,
                'fetchTrades': true, //publicGetV1PublicMarketTrades
                'fetchTradingFee': false,
                'fetchTradingFees': true, //privateGetV1ClientInfo
                'fetchWithdrawals': false,
                'setMarginMode': false,
                'withdraw': false,
            },
            'timeframes': {
                '1m': 1,
                '5m': 5,
                '15m': 15,
                '30m': 30,
                '1h': 60,
                '4h': 240,
                '1d': 1440,
                '1w': 10080,
                '2w': 21600,
            },
            'urls': {
                'logo': '',
                'api': {
                    'public': 'https://api.woo.org/',
                    'private': 'https://api.woo.org/',
                },
                'www': 'https://www.woo.org',
                'doc': 'https://kronosresearch.github.io/wootrade-documents/#introduction',
                'fees': 'https://support.woo.org/hc/en-001/articles/4404611795353--Trading-Fees',
            },
            'fees': {
                'trading': {
                    'tierBased': true,
                    'percentage': true,
                    'taker': 0.05 / 100,
                    'maker': 0.02 / 100,
                    'tiers': {
                        'taker': [
                            [0, 0.0005],
                            [300, 0.0005],
                            [1800, 0.0005],
                            [12000, 0.0003],
                            [120000, 0.0001],
                            [600000, 0],
                            [1000000, 0]
                        ],
                        'maker': [
                            [0, 0.0002],
                            [300, 0.0002],
                            [1800, 0],
                            [12000, 0],
                            [120000, 0],
                            [600000, 0],
                            [1000000, 0]
                        ],
                    },
                },
                // this is a bad way of hardcoding fees that change on daily basis
                // hardcoding is now considered obsolete, we will remove all of it eventually
                'funding': {},
            },
            'requiredCredentials' : {
              'apiKey': true,
              'secret': true,
              'applicationId': true,
            },
            'api': {
                'public': {
                    'get': [
                        'v1/public/info',
                        'v1/public/token',
                        'v1/public/token_network',
                        'v1/public/market_trades',
                    ],

                },
                'private': {
                    'get': [
                      'v1/client/info',
                      'v1/orderbook/:symbol',
                      'v1/kline',
                      'v2/client/holding',
                      'v1/order/:oid',
                      'v1/order/:oid/trades',
                      'v1/client/trades',
                    ],
                    'delete': [
                      'v1/orders',
                      'v1/order',
                    ],
                    'post': [
                      'v1/order'
                    ]
                },
            },
            'commonCurrencies': {
              /*
                'XBT': 'BTC',
                'XBT.M': 'BTC.M', // https://support.kraken.com/hc/en-us/articles/360039879471-What-is-Asset-S-and-Asset-M-
                'XDG': 'DOGE',
                'REPV2': 'REP',
                'REP': 'REPV1',
              */
            },
            'options': {
                'delistedMarketsById': {},
                // cannot withdraw/deposit these
                'inactiveCurrencies': [],
                'networks': {
                  /*
                    'ETH': 'ERC20',
                    'TRX': 'TRC20',
                    */
                },
                'depositMethods': {
                  /*
                    '1INCH': '1inch (1INCH)',
                    'AAVE': 'Aave',
                    'ADA': 'ADA',
                    'ALGO': 'Algorand',
                    'ANKR': 'ANKR (ANKR)',
                    'ANT': 'Aragon (ANT)',
                    'ATOM': 'Cosmos',
                    'AXS': 'Axie Infinity Shards (AXS)',
                    'BADGER': 'Bager DAO (BADGER)',
                    'BAL': 'Balancer (BAL)',
                    'BAND': 'Band Protocol (BAND)',
                    'BAT': 'BAT',
                    'BCH': 'Bitcoin Cash',
                    'BNC': 'Bifrost (BNC)',
                    'BNT': 'Bancor (BNT)',
                    'BTC': 'Bitcoin',
                    'CHZ': 'Chiliz (CHZ)',
                    'COMP': 'Compound (COMP)',
                    'CQT': '\tCovalent Query Token (CQT)',
                    'CRV': 'Curve DAO Token (CRV)',
                    'CTSI': 'Cartesi (CTSI)',
                    'DAI': 'Dai',
                    'DASH': 'Dash',
                    'DOGE': 'Dogecoin',
                    'DOT': 'Polkadot',
                    'DYDX': 'dYdX (DYDX)',
                    'ENJ': 'Enjin Coin (ENJ)',
                    'EOS': 'EOS',
                    'ETC': 'Ether Classic (Hex)',
                    'ETH': 'Ether (Hex)',
                    'EWT': 'Energy Web Token',
                    'FEE': 'Kraken Fee Credit',
                    'FIL': 'Filecoin',
                    'FLOW': 'Flow',
                    'GHST': 'Aavegotchi (GHST)',
                    'GNO': 'GNO',
                    'GRT': 'GRT',
                    'ICX': 'Icon',
                    'INJ': 'Injective Protocol (INJ)',
                    'KAR': 'Karura (KAR)',
                    'KAVA': 'Kava',
                    'KEEP': 'Keep Token (KEEP)',
                    'KNC': 'Kyber Network (KNC)',
                    'KSM': 'Kusama',
                    'LINK': 'Link',
                    'LPT': 'Livepeer Token (LPT)',
                    'LRC': 'Loopring (LRC)',
                    'LSK': 'Lisk',
                    'LTC': 'Litecoin',
                    'MANA': 'MANA',
                    'MATIC': 'Polygon (MATIC)',
                    'MINA': 'Mina', // inspected from webui
                    'MIR': 'Mirror Protocol (MIR)',
                    'MKR': 'Maker (MKR)',
                    'MLN': 'MLN',
                    'MOVR': 'Moonriver (MOVR)',
                    'NANO': 'NANO',
                    'OCEAN': 'OCEAN',
                    'OGN': 'Origin Protocol (OGN)',
                    'OMG': 'OMG',
                    'OXT': 'Orchid (OXT)',
                    'OXY': 'Oxygen (OXY)',
                    'PAXG': 'PAX (Gold)',
                    'PERP': 'Perpetual Protocol (PERP)',
                    'PHA': 'Phala (PHA)',
                    'QTUM': 'QTUM',
                    'RARI': 'Rarible (RARI)',
                    'RAY': 'Raydium (RAY)',
                    'REN': 'Ren Protocol (REN)',
                    'REP': 'REPv2',
                    'REPV1': 'REP',
                    'SAND': 'The Sandbox (SAND)',
                    'SC': 'Siacoin',
                    'SDN': 'Shiden (SDN)',
                    'SOL': 'Solana',  // their deposit method api doesn't work for SOL - was guessed
                    'SNX': 'Synthetix  Network (SNX)',
                    'SRM': 'Serum', // inspected from webui
                    'STORJ': 'Storj (STORJ)',
                    'SUSHI': 'Sushiswap (SUSHI)',
                    'TBTC': 'tBTC',
                    'TRX': 'Tron',
                    'UNI': 'UNI',
                    'USDC': 'USDC',
                    'USDT': 'Tether USD (ERC20)',
                    'USDT-TRC20': 'Tether USD (TRC20)',
                    'WAVES': 'Waves',
                    'WBTC': 'Wrapped Bitcoin (WBTC)',
                    'XLM': 'Stellar XLM',
                    'XMR': 'Monero',
                    'XRP': 'Ripple XRP',
                    'XTZ': 'XTZ',
                    'YFI': 'YFI',
                    'ZEC': 'Zcash (Transparent)',
                    'ZRX': '0x (ZRX)',
                  */
                },
            },
            'exceptions': {
              /*
                'EQuery:Invalid asset pair': BadSymbol, // {"error":["EQuery:Invalid asset pair"]}
                'EAPI:Invalid key': AuthenticationError,
                'EFunding:Unknown withdraw key': InvalidAddress, // {"error":["EFunding:Unknown withdraw key"]}
                'EFunding:Invalid amount': InsufficientFunds,
                'EService:Unavailable': ExchangeNotAvailable,
                'EDatabase:Internal error': ExchangeNotAvailable,
                'EService:Busy': ExchangeNotAvailable,
                'EQuery:Unknown asset': BadSymbol, // {"error":["EQuery:Unknown asset"]}
                'EAPI:Rate limit exceeded': DDoSProtection,
                'EOrder:Rate limit exceeded': DDoSProtection,
                'EGeneral:Internal error': ExchangeNotAvailable,
                'EGeneral:Temporary lockout': DDoSProtection,
                'EGeneral:Permission denied': PermissionDenied,
                'EOrder:Unknown order': InvalidOrder,
                'EOrder:Order minimum not met': InvalidOrder,
                'EGeneral:Invalid arguments': BadRequest,
                'ESession:Invalid session': AuthenticationError,
                'EAPI:Invalid nonce': InvalidNonce,
                'EFunding:No funding method': BadRequest, // {"error":"EFunding:No funding method"}
                'EFunding:Unknown asset': BadSymbol, // {"error":["EFunding:Unknown asset"]}
              */
            },
        });
    }

    async fetchMarkets (params = {}) {
        const response = await this.publicGetV1PublicInfo (params);
        /*
        {
          symbol: 'SPOT_ZRX_USDT',
          quote_min: '0',
          quote_max: '100000',
          quote_tick: '0.0001',
          base_min: '1',
          base_max: '947249',
          base_tick: '1',
          min_notional: '10',
          price_range: '0.1',
          is_stable: '0'
        }
        */

        const markets = this.safeValue (response, 'rows', {});

        let result = [];
        for (let i = 0; i < markets.length; i++) {
            const [spot, base, quote] = markets[i].symbol.split('_');
            const id = base + '_' + quote;
            const market = id;
            const baseId = base;
            const quoteId = quote;
            const symbol = base + '/' + quote;
            const precision = {
                'amount': this.precisionFromString (this.safeString (markets[i], 'base_min')),
                'price': this.precisionFromString (this.safeString (markets[i], 'quote_tick')),
            };
            const minAmount = {
              base: this.safeNumber (markets[i], 'base_min'),
              quote: this.safeNumber (markets[i], 'min_notional')
            }

            result.push ({
                'id': id,// x
                'symbol': symbol,// x
                'base': base,// x
                'quote': quote,// x
                'baseId': baseId,// x
                'quoteId': quoteId,// x
                'info': market,// x
                'type': 'spot', //x
                'spot': true,// x
                'active': true,// x
                'precision': precision,// x
                'limits': { //x
                    'amount': {
                        'min': minAmount,
                        'max': undefined,
                    },
                    'price': {
                        'min': Math.pow (10, -precision['price']),
                        'max': undefined,
                    },
                    'cost': {
                        'min': 0,
                        'max': undefined,
                    },
                    'leverage': {
                        'max': 1,
                    },
                },
            });
        }
        return result;
    }

    safeCurrency (currencyId, currency = undefined) {
        if (currencyId !== undefined) {
            if (currencyId.length > 3) {
                if ((currencyId.indexOf ('X') === 0) || (currencyId.indexOf ('Z') === 0)) {
                    if (currencyId.indexOf ('.') > 0) {
                        return super.safeCurrency (currencyId, currency);
                    } else {
                        currencyId = currencyId.slice (1);
                    }
                }
            }
        }
        return super.safeCurrency (currencyId, currency);
    }

    async fetchCurrencies (params = {}) {
        const response = await this.publicGetV1PublicTokenNetwork (params);

        //v1/public/token_network
        //
        //
        //     {
        //         "error": [],
        //         "result": {
        //             "ADA": { "aclass": "currency", "altname": "ADA", "decimals": 8, "display_decimals": 6 },
        //             "BCH": { "aclass": "currency", "altname": "BCH", "decimals": 10, "display_decimals": 5 },
        //             ...
        //         },
        //     }
        //
        //

        const data = this.safeValue (response, 'rows', []);

        const result = {};
        for (let i = 0; i < data.length; i++) {
            const entry = data[i];
            const id = this.safeString (entry, 'token');
            const name = this.safeString (entry, 'token');
            const code = this.safeCurrencyCode (id);
            const isWithdrawEnabled = this.safeValue (entry, 'allow_withdraw', false);
            const isDepositEnabled = this.safeValue (entry, 'allow_deposit', false);
            const fee = this.safeNumber (entry, 'withdrawal_fee');
            const active = (isWithdrawEnabled === '1' && isDepositEnabled === '1');

            result[code] = {
                'id': id,
                'name': name,
                'code': code,
                'precision': undefined,
                'info': entry,
                'active': active,
                'fee': fee,
                'limits': {
                    'amount': {
                        'min': undefined,
                        'max': undefined,
                    },
                    'withdraw': {
                        'min': this.safeNumber (entry, 'minimum_withdrawal'),
                        'max': undefined,
                    }
                },
            }
        }
        return result;
    }

    async fetchTradingFees (params = {}) {
        await this.loadMarkets ();
        const response = await this.privateGetV1ClientInfo(params);

        const makerFee = parseFloat(response.application.maker_fee_rate/10000)
        const takerFee = parseFloat(response.application.taker_fee_rate/10000)

        return {
            'info': response,
            'maker': makerFee,
            'taker': takerFee,
        };
    }

    parseBidAsk (bidask, priceKey = 0, amountKey = 1) {
        const price = this.safeNumber (bidask, priceKey);
        const amount = this.safeNumber (bidask, amountKey);
        const timestamp = this.safeInteger (bidask, 2);
        return [ price, amount, timestamp ];
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();

        const market = this.market(symbol);
        const request = {
            'symbol': market['id'],
        };
        if (limit !== undefined) {
            request['count'] = limit; // 100
        }

        const response = await this.privateGetV1OrderbookSymbol(this.extend (request, params));

        /*
        {
          success: true,
            timestamp: '1642607902927',
            asks: [
              { price: '41977.98', quantity: '0.00551232' },
              { price: '41978.65', quantity: '0.39500000' },
              { price: '41978.86', quantity: '0.01754000' },
              { price: '41978.87', quantity: '0.05000000' },
              ...
            ],
            bids: [
              { price: '41971.00', quantity: '0.01973607' },
              { price: '41970.24', quantity: '0.15019200' },
              { price: '41969.90', quantity: '0.00387631' },
              { price: '41969.57', quantity: '0.05570000' },
            ]
        }
        */
        return this.parseOrderBook (response, symbol, response.timestamp, 'bids', 'asks', 'price', 'quantity');
    }

    async fetchOHLCV (symbol, timeframe = '1m', limit = undefined, since = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'symbol': market['id'],
            'type': timeframe,
            'limit': limit
        };

        const response = await this.privateGetV1Kline (this.extend (request, params));

        /*
        {
          success: true,
          rows: [
            {
             open: '41706.65',
             close: '41609.62',
             low: '41495.85',
             high: '41724.18',
             volume: '139.59868916',
             amount: '5803291.75072999',
             symbol: 'SPOT_BTC_USDT',
             type: '15m',
             start_timestamp: '1642525200000',
             end_timestamp: '1642526100000'
            }
          ]
        }
        */

        const result = this.safeValue (response, 'rows', []);
        const parsed = result.map ((ohlcv) => [ohlcv.start_timestamp, ohlcv.open, ohlcv.close, ohlcv.high, ohlcv.low, ohlcv.volume, ohlcv.amount])

        return parsed;
    }

    parseTrade(trade, market = undefined) {
        const symbol = trade.symbol
        const orderId = this.safeString (trade, 'order_id'); //ausstehend
        const tradeId = this.safeString (trade, 'id')
        const takerOrMaker = ("is_maker" in trade) ? (trade.is_maker === '0') ? "taker" : "maker" : undefined
        let timestamp = this.safeInteger (trade, 'executed_timestamp');
        const priceString = this.safeString (trade, 'executed_price');
        const amountString = this.safeString (trade, 'executed_quantity');
        const price = this.parseNumber (priceString);
        const amount = this.parseNumber (amountString);
        const side = this.safeString (trade, 'side');
        let fee = ("fee" in trade) ? trade.fee : undefined;
        const feeCost = fee
        const type = ("is_maker" in trade) ? (trade.is_maker === '0') ? "limit" : "maker" : undefined
        const cost = price * amount

        return {
            'info': trade,
            'id': tradeId,
            'order': orderId,
            'timestamp': timestamp*1000,
            'datetime': undefined,
            'symbol': symbol.replace("SPOT_", ""),
            'type': type,
            'takerOrMaker': takerOrMaker,
            'side': side,
            'price': price,
            'amount': amount,
            'cost': cost,
            'fee': {
              'cost': feeCost,
              'currency': "USDT",
              'rate': 0.0003
            },
        };
    }

    parseBalance (balance, legacy = false) {
        const codes = Object.keys (this.omit (balance, [ 'info', 'timestamp', 'datetime', 'free', 'used', 'total' ]));

        balance['free'] = {}
        balance['used'] = {}
        balance['total'] = {}

        for (let i = 0; i < codes.length; i++) {
            const code = codes[i]
            if (balance[code].total === undefined) {
                if (balance[code].free !== undefined && balance[code].used !== undefined) {
                    if (legacy) {
                        balance[code].total = this.sum (balance[code].free, balance[code].used)
                    } else {
                        balance[code].total = Precise.stringAdd (balance[code].free, balance[code].used)
                    }
                }
            }
            if (balance[code].free === undefined) {
                if (balance[code].total !== undefined && balance[code].used !== undefined) {
                    if (legacy) {
                        balance[code].free = this.sum (balance[code].total, -balance[code].used)
                    } else {
                        balance[code].free = Precise.stringSub (balance[code].total, balance[code].used)
                    }
                }
            }
            if (balance[code].used === undefined) {
                if (balance[code].total !== undefined && balance[code].free !== undefined) {
                    if (legacy) {
                        balance[code].used = this.sum (balance[code].total, -balance[code].free)
                    } else {
                        balance[code].used = Precise.stringSub (balance[code].total, balance[code].free)
                    }
                }
            }
            balance[code].free = this.parseNumber (balance[code].free)
            balance[code].used = this.parseNumber (balance[code].used)
            balance[code].total = this.parseNumber (balance[code].total)

            balance.free[code] = balance[code].free
            balance.used[code] = balance[code].used
            balance.total[code] = balance[code].total
        }

        return balance
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();

        const response = await this.privateGetV2ClientHolding (params);
        /*
        holding: [
          {
            token: 'BTC',
            holding: '0.0',
            frozen: '0.0',
            interest: '0.0',
            outstanding_holding: '0.0',
            pending_exposure: '10.5',
            opening_cost: '0',
            holding_cost: '0',
            realised_pnl: '0',
            settled_pnl: '0',
            fee_24_h: '0',
            settled_pnl_24_h: '0',
            updated_time: '1642688656'
          },
          {
            token: 'WOO',
            holding: '1.87308',
            frozen: '0.0',
            interest: '0.0',
            outstanding_holding: '0.0',
            pending_exposure: '0.0',
            opening_cost: '0.0',
            holding_cost: '0.0',
            realised_pnl: '9453.33891415',
            settled_pnl: '9453.33891415',
            fee_24_h: '0',
            settled_pnl_24_h: '0.0',
            updated_time: '1642637053'
          },
        */
        const balances = this.safeValue (response, 'holding', []);
        const result = {
            'info': response,
            'timestamp': undefined,
            'datetime': undefined,
        };

        for (let i=0; i < balances.length; i++) {
            const currencyId = balances[i].token;
            const code = this.safeCurrencyCode (currencyId);
            const account = this.account ();

            account['total'] = this.safeString (balances[i], 'holding');
            account['free'] = (parseFloat(balances[i].outstanding_holding) >= 0) ? balances[i].holding : (parseFloat(balances[i].holding)+parseFloat(balances[i].outstanding_holding)).toString()
            account['used'] = (parseFloat(account['total']) - parseFloat(account['free'])).toString()
            result[code] = account;
        }
        return this.parseBalance (result);
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}, order_tag = undefined, client_order_id = undefined, visible_quantity = undefined, ) {
        await this.loadMarkets ();
        const market = this.market (symbol);

        let request = {
          'symbol': symbol,
          'client_order_id': client_order_id,
          'order_tag': order_tag,
          'order_type': type.toUpperCase(),
          'visible_quantity': visible_quantity,
          'side': side.toUpperCase(),
        };

        if (type.toUpperCase() !== "MARKET") {
          request['order_quantity'] = this.amountToPrecision (symbol, amount)
          request['order_price'] = this.priceToPrecision (symbol, price)
        }
        else {
          request['order_quantity'] = this.amountToPrecision (symbol, amount)
        }

        const response = await this.privatePostV1Order (this.extend (request, params));

        /*
        {
          success: true,
          timestamp: '1642860244.977',
          order_id: '92747967',
          order_type: 'LIMIT',
          order_price: '42000',
          order_quantity: '0.00025',
          order_amount: null,
          client_order_id: '0'
        }
        */

        return this.parseOrder (this.extend(response, {symbol: symbol}));
    }

    parseOrder (order, market = undefined) {
        const marketId = this.safeString (order, 'symbol').replace("SPOT_", "");
        const symbol = this.safeSymbol (marketId, market, '/');
        const orderId = this.safeString (order, 'order_id');
        const type = this.safeString (order, 'type');
        const timestamp = this.safeInteger (order, 'created_time');
        const datetime = this.iso8601 (timestamp);
        const price = this.safeString (order, 'price');
        const side = this.safeString (order, 'side');
        const feeCurrencyId = this.safeString (order, 'fee_asset');
        const feeCurrency = this.safeCurrencyCode (feeCurrencyId);
        const feeCost = this.safeNumber (order, 'total_fee');
        const amount = this.safeString (order, 'quantity');
        const filled = this.safeString (order, 'executed');
        const cost = this.safeString (order, 'dealFunds');
        const average = this.safeString (order, 'average_executed_price');
        // bool
        let status = (order.status !== 'CANCELLED' || order.status !== 'FILLED') ? 'open' : 'closed';
        const fee = {
            'currency': feeCurrency,
            'cost': feeCost,
        };
        const clientOrderId = this.safeString (order, 'client_order_id');

        return this.safeOrder2 ({
            'id': orderId,
            'clientOrderId': clientOrderId,
            'symbol': symbol,
            'type': type,
            'timeInForce': undefined,
            'postOnly': undefined,
            'side': side,
            'amount': amount,
            'price': price,
            'stopPrice': undefined,
            'cost': cost,
            'filled': filled,
            'remaining': undefined,
            'timestamp': timestamp,
            'datetime': datetime,
            'fee': fee,
            'status': status,
            'info': order,
            'lastTradeTimestamp': undefined,
            'average': average,
            'trades': undefined,
        }, market);
    }

    async fetchOrder (id, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        const clientOrderId = this.safeValue2 (params, 'userref', 'clientOrderId');
        const request = {
            'oid': id
        };

        let query = params;

        const response = await this.privateGetV1OrderOid (this.extend (request, query));
        /*
        {
          success: true,
          symbol: 'SPOT_BTC_USDT',
          status: 'CANCELLED',
          side: 'BUY',
          created_time: '1642688656.000',
          order_id: '91602884',
          order_tag: 'default',
          price: '42000',
          type: 'LIMIT',
          quantity: '0.00025',
          amount: null,
          visible: '0.00025',
          executed: '0',
          total_fee: '0',
          fee_asset: 'BTC',
          client_order_id: null,
          average_executed_price: null,
          Transactions: []
        }
        */

        const order = this.parseOrder (this.extend ({ 'id': id }, response));
        return this.extend ({ 'info': response }, order);
    }

    async fetchOrderTrades (id, symbol = undefined, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const request = {
            'oid': id,
        };

        const response = await this.privateGetV1OrderOidTrades (request);

        /*
        {
          success: true,
          rows: [
            {
              id: '105749148',
              symbol: 'SPOT_BTC_USDT',
              fee: '0',
              side: 'BUY',
              executed_timestamp: '1642714823.149',
              order_id: '91647996',
              order_tag: 'default',
              executed_price: '42000',
              executed_quantity: '0.00025',
              fee_asset: 'BTC',
              is_maker: '1'
            }
          ]
        }
        */
        const result = this.safeValue (response, 'rows', []);

        let trades = {}

        for (let i=0; i<result.length; i++) {
          const id = result[i].id
          const symbol = result[i].symbol.replace("SPOT_", "")
          const order_id = result[i].order_id
          const side = result[i].side
          const amount = result[i].executed_quantity
          const price = result[i].executed_price
          const fee = {currency: result[i].fee_asset, cost: result[i].fee}

          trades[id] = {
            id: id,
            symbol: symbol,
            fee: fee,
            side: side,
            order_id: order_id,
            amount: amount,
            price: price,
          }
        }

        return trades;
    }


    //symbol since limit params
    async fetchMyTrades (symbol = undefined, from = undefined, to = undefined, params = {}) {
        await this.loadMarkets ();
        const request = {
            symbol: symbol,
            start_t: from,
            end_t: to,
            page: params.page,
        };

        const response = await this.privateGetV1ClientTrades(this.extend (request, params));

        let result = new Array()

        for (let key in response.rows) {
          result.push(this.parseTrade(response.rows[key]))
        }

        return result

        /*
        const result = response.rows
        const meta = response.meta

        let trades = {}

        for (let i=0; i<result.length; i++) {
          const id = result[i].id
          const symbol = result[i].symbol.replace("SPOT_", "")
          const order_id = result[i].order_id
          const side = result[i].side
          const amount = result[i].executed_quantity
          const price = result[i].executed_price
          const fee = {currency: result[i].fee_asset, cost: result[i].fee}

          trades[id] = {
            id: id,
            symbol: symbol,
            fee: fee,
            side: side,
            order_id: order_id,
            amount: amount,
            price: price,
          }
        }

        return {meta: meta, trades: trades}
        */
    }

    async cancelOrder (id = undefined, symbol = undefined, params = {}) {
        await this.loadMarkets ();
        const request = {
            symbol: symbol,
            order_id: id
        };

        let response = undefined

        if (symbol === undefined || id === undefined) {
          throw new Error("Symbol or ID missing")
        }
        else {
          try {
              response = await this.privateDeleteV1Order (this.extend (request, params));
          } catch (e) {
              if (this.last_http_response) {
                  if (this.last_http_response.indexOf ('EOrder:Unknown order') >= 0) {
                      throw new OrderNotFound (this.id + ' cancelOrder() error ' + this.last_http_response);
                  }
              }
              throw e;
          }
        }

        return response;
    }

    async cancelAllOrdersSymbol (symbol = undefined, params = {}) {
      await this.loadMarkets ();
      const request = {
          symbol: symbol
      };

      let response = undefined

      if (symbol === undefined) {
        throw new Error("Symbol missing")
      }
      else {
        try {
            response = await this.privateDeleteV1Orders (this.extend (request, params));
        } catch (e) {
            if (this.last_http_response) {
                if (this.last_http_response.indexOf ('EOrder:Unknown order') >= 0) {
                    throw new OrderNotFound (this.id + ' cancelOrder() error ' + this.last_http_response);
                }
            }
            throw e;
        }
      }

      return response;
    }

    async cancelAllOrders (symbol = undefined, params = {}) {
        await this.loadMarkets ();
        return await this.privatePostCancelAll (params);
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        let url = path;
        let normalizedParams = ""

        if (api === 'public') {
          if (Object.keys (params).length) {
              const sorted = Object.keys(params)
                  .sort()
                  .reduce((acc, key) => ({
                      ...acc, [key]: params[key]
                  }), {})

              let first = true

              for (let key in sorted) {
                if (sorted[key] === undefined) continue;
                normalizedParams += (first === true) ? "" : "&"
                if (key === 'symbol') {
                  normalizedParams += key + "=" + "SPOT_" + sorted[key]
                }
                else {
                  normalizedParams += key + "=" + sorted[key]
                }
                first = false
              }

              url += '?' + normalizedParams;
          }
        } else if (api === 'private') {
          this.checkRequiredCredentials ();
          const nonce = this.nonce ().toString ();
          let msg = undefined

          if (method === 'GET') {
            if (url.includes(':')) {
              let [url1, url2] = url.split(":")
              url = url1

              let [url3, url4] = (url2.includes("/")) ? url2.split("/") : [undefined, undefined]

              for (let key in params) {
                if (key === 'symbol') {
                  url += "SPOT_" + params[key]
                }
                else {
                  url += params[key]
                }

                url += (url4 !== undefined) ? "/"+url4 : ""
              }

              msg = "|" + nonce
            }
            else {
              const sorted = Object.keys(params)
                  .sort()
                  .reduce((acc, key) => ({
                      ...acc, [key]: params[key]
                  }), {})

              let first = true
              for (let key in sorted) {
                if (sorted[key] === undefined) continue;
                normalizedParams += (first === true) ? "" : "&"
                if (key === 'symbol') {
                  normalizedParams += key + "=" + "SPOT_" + sorted[key]
                }
                else {
                  normalizedParams += key + "=" + sorted[key]
                }
                first = false
              }
              url += (normalizedParams !== "") ? "?"+normalizedParams : ""
              msg = (normalizedParams !== "") ? normalizedParams + "|" + nonce : "|" + nonce
            }

            const signature = this.hmac (this.encode (msg), this.encode (this.secret));

            headers = {
                'x-api-key': this.apiKey,
                'x-api-signature': signature,
                'x-api-timestamp': nonce,
                'cache-control': 'no-cache',
                'Content-Type': 'application/x-www-form-urlencoded',
            };
          }
          else if (method === 'DELETE') {
            const sorted = Object.keys(params)
                .sort()
                .reduce((acc, key) => ({
                    ...acc, [key]: params[key]
                }), {})

            let first = true
            for (let key in sorted) {
              if (sorted[key] === undefined) continue;
              normalizedParams += (first === true) ? "" : "&"
              if (key === 'symbol') {
                normalizedParams += key + "=" + "SPOT_" + sorted[key]
              }
              else {
                normalizedParams += key + "=" + sorted[key]
              }
              first = false
            }
            url += (normalizedParams !== "") ? "?"+normalizedParams : ""
            msg = (normalizedParams !== "") ? normalizedParams + "|" + nonce : "|" + nonce

            const signature = this.hmac (this.encode (msg), this.encode (this.secret));

            headers = {
                'x-api-key': this.apiKey,
                'x-api-signature': signature,
                'x-api-timestamp': nonce,
                'cache-control': 'no-cache',
                'Content-Type': 'application/x-www-form-urlencoded',
            };
          }
          else if (method === 'POST') {
            const sorted = Object.keys(params)
                .sort()
                .reduce((acc, key) => ({
                    ...acc, [key]: params[key]
                }), {})

            let first = true
            for (let key in sorted) {
              if (sorted[key] === undefined) continue;
              normalizedParams += (first === true) ? "" : "&"
              if (key === 'symbol') {
                normalizedParams += key + "=" + "SPOT_" + sorted[key]
              }
              else {
                normalizedParams += key + "=" + sorted[key]
              }
              first = false
            }
            url += (normalizedParams !== "") ? "?"+normalizedParams : ""
            msg = (normalizedParams !== "") ? normalizedParams + "|" + nonce : "|" + nonce

            const signature = this.hmac (this.encode (msg), this.encode (this.secret));

            headers = {
                'x-api-key': this.apiKey,
                'x-api-signature': signature,
                'x-api-timestamp': nonce,
                'cache-control': 'no-cache',
                'Content-Type': 'application/x-www-form-urlencoded',
            };
          }
        } else {
            url = '/' + path;
        }
        url = this.urls['api'][api] + url;

        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }

    nonce () {
        return this.milliseconds ();
    }

    handleErrors (code, reason, url, method, headers, body, response, requestHeaders, requestBody) {
        if (code === 520) {
            throw new ExchangeNotAvailable (this.id + ' ' + code.toString () + ' ' + reason);
        }
        // todo: rewrite this for "broad" exceptions matching
        if (body.indexOf ('Invalid order') >= 0) {
            throw new InvalidOrder (this.id + ' ' + body);
        }
        if (body.indexOf ('Invalid nonce') >= 0) {
            throw new InvalidNonce (this.id + ' ' + body);
        }
        if (body.indexOf ('Insufficient funds') >= 0) {
            throw new InsufficientFunds (this.id + ' ' + body);
        }
        if (body.indexOf ('Cancel pending') >= 0) {
            throw new CancelPending (this.id + ' ' + body);
        }
        if (body.indexOf ('Invalid arguments:volume') >= 0) {
            throw new InvalidOrder (this.id + ' ' + body);
        }
        if (body.indexOf ('Rate limit exceeded') >= 0) {
            throw new RateLimitExceeded (this.id + ' ' + body);
        }
        if (response === undefined) {
            return;
        }
        if (body[0] === '{') {
            if (typeof response !== 'string') {
                if ('error' in response) {
                    const numErrors = response['error'].length;
                    if (numErrors) {
                        const message = this.id + ' ' + body;
                        for (let i = 0; i < response['error'].length; i++) {
                            const error = response['error'][i];
                            this.throwExactlyMatchedException (this.exceptions, error, message);
                        }
                        throw new ExchangeError (message);
                    }
                }
            }
        }
    }
};
