import React from 'react';
import OrderCard from './OrderCard';
import OrderItemCard from './OrderItemCard';

/**
 * BookingPanel — displays the user's orders.
 *
 * @param {Object[]} orders        - Array of Order objects from /api/orders
 * @param {boolean}  isLoadingOrders - True while orders are being fetched
 */
const BookingPanel = ({ orders = [], isLoadingOrders = false }) => {
  const ordersList = Array.isArray(orders) ? orders : [];

  return (
    <div className="space-y-6">
      {/* Orders section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 px-1">My Orders</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {isLoadingOrders ? (
            <div className="px-4 py-6 text-sm text-slate-500">Loading orders…</div>
          ) : (
            <ul className="divide-y divide-gray-200" data-testid="orders-list">
              {ordersList.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
              {ordersList.length === 0 && (
                <li className="bg-white">
                  <div className="px-4 py-4 sm:px-6 text-sm text-slate-500">
                    No orders yet.
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>
      </section>

    </div>
  );
};

export { OrderItemCard, OrderCard };
export default BookingPanel;
