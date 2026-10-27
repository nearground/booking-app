'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Carts — depends on Users only
    await queryInterface.createTable('Carts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      CustomerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      sessionToken: { type: Sequelize.STRING, allowNull: true, unique: true },
      status: {
        type: Sequelize.ENUM('active', 'checkout', 'converted', 'abandoned', 'expired'),
        allowNull: false,
        defaultValue: 'active',
      },
      currency: { type: Sequelize.STRING, allowNull: false, defaultValue: 'USD' },
      totalAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      discountAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      metadata: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Carts', ['CustomerId'], { name: 'idx_carts_customer' });
    await queryInterface.addIndex('Carts', ['status'], { name: 'idx_carts_status' });

    // 2. CartItems — depends on Carts
    await queryInterface.createTable('CartItems', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      CartId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Carts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ProductType: { type: Sequelize.STRING, allowNull: false },
      ProductId: { type: Sequelize.INTEGER, allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: false },
      unitPrice: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      totalPrice: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      metadata: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('CartItems', ['CartId'], { name: 'idx_cart_items_cart' });

    // 3. Orders — depends on Users, Carts
    await queryInterface.createTable('Orders', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      CustomerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      CartId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Carts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending', 'paid', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'draft',
      },
      orderNumber: { type: Sequelize.STRING, allowNull: false, unique: true },
      currency: { type: Sequelize.STRING, allowNull: false, defaultValue: 'USD' },
      subtotalAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      taxAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      discountAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      totalAmount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      mainContactName: { type: Sequelize.STRING, allowNull: true },
      mainContactPhone: { type: Sequelize.STRING, allowNull: true },
      mainContactEmail: { type: Sequelize.STRING, allowNull: true },
      paymentReference: { type: Sequelize.STRING, allowNull: true },
      paymentMethod: { type: Sequelize.STRING, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('Orders', ['CustomerId'], { name: 'idx_orders_customer' });
    await queryInterface.addIndex('Orders', ['status'], { name: 'idx_orders_status' });
    await queryInterface.addIndex('Orders', ['CartId'], { name: 'idx_orders_cart' });

    // 4. OrderItems — depends on Orders, ExperienceReservations, ServiceReservations, HotelReservations
    await queryInterface.createTable('OrderItems', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      OrderId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ProductType: { type: Sequelize.STRING, allowNull: false },
      ProductId: { type: Sequelize.INTEGER, allowNull: true },
      ExperienceReservationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ExperienceReservations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      ServiceReservationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'ServiceReservations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      HotelReservationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'HotelReservations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      description: { type: Sequelize.TEXT, allowNull: false },
      unitPrice: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      totalPrice: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      metadata: { type: Sequelize.JSON, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('OrderItems', ['OrderId'], { name: 'idx_order_items_order' });
    await queryInterface.addIndex('OrderItems', ['ExperienceReservationId'], { name: 'idx_order_items_experience_reservation' });
    await queryInterface.addIndex('OrderItems', ['ServiceReservationId'], { name: 'idx_order_items_service_reservation' });
    await queryInterface.addIndex('OrderItems', ['HotelReservationId'], { name: 'idx_order_items_hotel_reservation' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('OrderItems');
    await queryInterface.dropTable('Orders');
    await queryInterface.dropTable('CartItems');
    await queryInterface.dropTable('Carts');
  },
};
