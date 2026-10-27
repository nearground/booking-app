import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const Cart = sequelize.define('Cart', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sessionToken: { type: DataTypes.STRING, allowNull: true, unique: true },
    status: {
        type: DataTypes.ENUM('active', 'checkout', 'converted', 'abandoned', 'expired'),
        allowNull: false,
        defaultValue: 'active',
    },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    discountAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    metadata: { type: DataTypes.JSON, allowNull: true },
}, {
    tableName: 'Carts',
    timestamps: true,
});

export default Cart;
