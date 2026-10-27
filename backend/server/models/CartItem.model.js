import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const CartItem = sequelize.define('CartItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ProductType: { type: DataTypes.STRING, allowNull: false },
    ProductId: { type: DataTypes.INTEGER, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    metadata: { type: DataTypes.JSON, allowNull: true },
}, {
    tableName: 'CartItems',
    timestamps: true,
});

export default CartItem;
