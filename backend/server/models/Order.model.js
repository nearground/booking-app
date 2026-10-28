import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { DataTypes } = require('sequelize');

import sequelize from './database.js';

const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    status: {
        type: DataTypes.ENUM('draft', 'pending', 'paid', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'draft',
    },
    orderNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'USD' },
    subtotalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    taxAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    discountAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    paymentReference: { type: DataTypes.STRING, allowNull: true },
    paymentMethod: { type: DataTypes.STRING, allowNull: true },
    mainContactName: { type: DataTypes.STRING, allowNull: true },
    mainContactPhone: { type: DataTypes.STRING, allowNull: true },
    mainContactEmail: { type: DataTypes.STRING, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
}, {
    tableName: 'Orders',
    timestamps: true,
});

Order.addHook('beforeValidate', (order) => {
    if (!order.isNewRecord || order.orderNumber) return;

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    order.orderNumber = `ORD-${datePart}-${randomSuffix}`;
});

export default Order;
