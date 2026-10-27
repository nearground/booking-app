import Order from './server/models/Order.model.js';
console.log('Order hook keys:', Object.keys(Order.options.hooks || {}));
console.log('Order beforeCreate hooks:', Order.options.hooks?.beforeCreate);
