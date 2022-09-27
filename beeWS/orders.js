class Orders {
  constructor(props) {
    this.exchange = props.exchange;
    this.symbol = props.symbol;
    this.orderType = props.orderType;
    this.side = props.side;
    this.orderId = props.orderId;
    this.type = props.type;
    this.time = props.time;
    this.size = props.size;
    this.filledSize = props.filledSize;
    this.price = props.price;
    this.remainSize = props.remainSize;
    this.status = props.status;
    this.timestamp = props.timestamp;
  }
}

module.exports = Orders;
