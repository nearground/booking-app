# Orders and Cart Schema Design

## Purpose

This document defines a complete, implementable schema design for:

- `Orders` — immutable source of truth for completed and in-progress purchases
- `OrderItems` — line-item purchase records snapshotted at checkout time
- `Carts` — mutable draft baskets for users or guest sessions
- `CartItems` — editable draft line items held before checkout

The three existing reservation models — `ExperienceReservation`, `ServiceReservation`, and `HotelReservation` — remain the **canonical booking entities** for their respective product types. The `Order`/`OrderItem` layer sits above them to handle payment lifecycle, multi-item checkout, and a unified purchase audit trail.

---

## Architecture Context

### Existing reservation models (canonical booking layer)

| Model | Table | FK to scheduled | Status values |
|---|---|---|---|
| `ExperienceReservation` | `ExperienceReservations` | `ScheduledExperienceId` | `pending`, `confirmed`, `attended`, `no-show`, `cancelled` |
| `ServiceReservation` | `ServiceReservations` | `ScheduledServiceId` | `pending`, `confirmed`, `attended`, `no-show`, `cancelled` |
| `HotelReservation` | `HotelReservations` | direct `HotelId` | `pending`, `confirmed`, `checked-in`, `checked-out`, `cancelled` |

All three carry full billing info (`billingEmail`, `billingName`, `billingAddress`, `billingCity`, `billingState`, `billingPostalCode`) and belong to `Users` via `CustomerId`.

### Product taxonomy

- `Experience` → `TicketTier` → `ScheduledExperience` → `ExperienceReservation`
- `Service` → `ScheduledService` → `ServiceReservation`
- `Hotel` → `HotelReservation` (no scheduled intermediate)

---

## Design Decisions

### 1. Typed FK columns, not polymorphic ID, on OrderItem reservation links

`OrderItem` uses three nullable typed FK columns (`ExperienceReservationId`, `ServiceReservationId`, `HotelReservationId`) rather than a generic `ReservableType`/`ReservableId` pair. This provides:

- Database-level referential integrity per reservation type
- Simpler joins and no type-discriminator string queries
- Consistency — the rest of the codebase uses explicit FK columns except `Comment` (which is truly open-ended polymorphic)

Application-layer constraint: exactly one of the three reservation FK columns must be non-null per `OrderItem`.

### 2. CustomerId not UserId

All existing reservation models use `CustomerId` as their FK to `Users`. `Order` and `Cart` follow the same convention.

### 3. DECIMAL(10,2) not DECIMAL(12,2)

All existing price columns in this codebase use `DECIMAL(10,2)`. The schemas below match this.

### 4. CartItem.metadata holds draft booking context

`CartItem.metadata` stores a structured draft containing all fields required to create the corresponding reservation record at checkout. This avoids pre-creating reservation records before payment is confirmed.

### 5. Order is created at checkout start, status = draft

The order is created with `status = 'draft'` when the user enters the checkout flow. This enables persisting checkout progress, attaching a payment provider reference before capture, and wrapping reservation creation + payment confirmation in a single atomic transaction.

---

## Status Lifecycles

### Order status

```
draft → pending → paid → refunded
             ↘ cancelled
draft → cancelled
```

| Status | Meaning |
|---|---|
| `draft` | Order created; checkout in progress; payment not yet initiated |
| `pending` | Payment initiated; awaiting provider confirmation |
| `paid` | Payment captured; reservations confirmed |
| `cancelled` | Order aborted before payment capture |
| `refunded` | Payment was captured and has since been refunded |

### Cart status

```
active → checkout → converted
       ↘ abandoned
active → expired
```

| Status | Meaning |
|---|---|
| `active` | User is actively adding or editing items |
| `checkout` | User has entered checkout; a draft Order exists |
| `converted` | Checkout completed; linked Order is `paid` |
| `abandoned` | User left checkout without completing |
| `expired` | Cart auto-expired after inactivity TTL |

---

## Proposed Tables

### Orders

```
Orders
├── id                INTEGER PK AUTO_INCREMENT NOT NULL
├── CustomerId        INTEGER FK → Users.id           SET NULL on delete  nullable (guest checkout)
├── CartId            INTEGER FK → Carts.id            SET NULL on delete  nullable (preserved for audit)
├── status            ENUM('draft','pending','paid','cancelled','refunded')  NOT NULL  DEFAULT 'draft'
├── orderNumber       STRING UNIQUE NOT NULL  (e.g. ORD-20260410-0001)
├── currency          STRING NOT NULL DEFAULT 'USD'
├── subtotalAmount    DECIMAL(10,2) NOT NULL
├── taxAmount         DECIMAL(10,2) NOT NULL DEFAULT 0.00
├── discountAmount    DECIMAL(10,2) NOT NULL DEFAULT 0.00
├── totalAmount       DECIMAL(10,2) NOT NULL
├── paymentReference  STRING nullable  (e.g. Stripe PaymentIntent ID)
├── paymentMethod     STRING nullable  (e.g. 'card', 'paypal')
├── metadata          JSON nullable
├── createdAt         DATE NOT NULL
└── updatedAt         DATE NOT NULL
```

Indexes: `CustomerId`, `orderNumber` (unique), `status`, `CartId`

### OrderItems

```
OrderItems
├── id                          INTEGER PK AUTO_INCREMENT NOT NULL
├── OrderId                     INTEGER FK → Orders.id                    CASCADE on delete  NOT NULL
├── ProductType                 STRING NOT NULL  ('Experience', 'Service', 'Hotel')
├── ProductId                   INTEGER nullable  (catalog reference for reporting)
├── ExperienceReservationId     INTEGER FK → ExperienceReservations.id    SET NULL on delete  nullable
├── ServiceReservationId        INTEGER FK → ServiceReservations.id       SET NULL on delete  nullable
├── HotelReservationId          INTEGER FK → HotelReservations.id         SET NULL on delete  nullable
├── description                 TEXT NOT NULL  (snapshot of title at purchase time)
├── unitPrice                   DECIMAL(10,2) NOT NULL  (price per unit at purchase time)
├── quantity                    INTEGER NOT NULL DEFAULT 1
├── totalPrice                  DECIMAL(10,2) NOT NULL  (unitPrice × quantity)
├── metadata                    JSON nullable  (snapshot: dates, confirmationCode, ScheduledExperienceId, etc.)
├── createdAt                   DATE NOT NULL
└── updatedAt                   DATE NOT NULL
```

Indexes: `OrderId`, `ExperienceReservationId`, `ServiceReservationId`, `HotelReservationId`

### Carts

```
Carts
├── id                INTEGER PK AUTO_INCREMENT NOT NULL
├── CustomerId        INTEGER FK → Users.id  SET NULL on delete  nullable (guest)
├── sessionToken      STRING nullable UNIQUE  (guest session identifier)
├── status            ENUM('active','checkout','converted','abandoned','expired')  NOT NULL  DEFAULT 'active'
├── currency          STRING NOT NULL DEFAULT 'USD'
├── totalAmount       DECIMAL(10,2) NOT NULL DEFAULT 0.00  (recomputed on item changes)
├── discountAmount    DECIMAL(10,2) NOT NULL DEFAULT 0.00
├── metadata          JSON nullable
├── createdAt         DATE NOT NULL
└── updatedAt         DATE NOT NULL
```

Indexes: `CustomerId`, `sessionToken` (unique sparse), `status`

### CartItems

```
CartItems
├── id               INTEGER PK AUTO_INCREMENT NOT NULL
├── CartId           INTEGER FK → Carts.id  CASCADE on delete  NOT NULL
├── ProductType      STRING NOT NULL  ('Experience', 'Service', 'Hotel')
├── ProductId        INTEGER nullable  (catalog reference)
├── description      TEXT NOT NULL
├── unitPrice        DECIMAL(10,2) NOT NULL
├── quantity         INTEGER NOT NULL DEFAULT 1
├── totalPrice       DECIMAL(10,2) NOT NULL  (unitPrice × quantity)
├── metadata         JSON nullable  (see structured shapes below)
├── createdAt        DATE NOT NULL
└── updatedAt        DATE NOT NULL
```

Indexes: `CartId`

---

## CartItem Metadata Shapes

These are the structured objects stored in `CartItem.metadata` by `ProductType`. They supply everything required to create the corresponding reservation record at checkout.

### ProductType = 'Experience'

```json
{
  "ScheduledExperienceId": 555,
  "dateTime": "2026-05-15T18:00:00.000Z",
  "numberOfAttendees": 2,
  "specialRequests": "",
  "attendees": [
    {
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "ticketTierId": 12,
      "dateOfBirth": "1990-01-01",
      "dietaryRestrictions": null,
      "accessibilityNeeds": null,
      "answers": [{ "questionKey": "has_experience", "answer": "yes" }]
    }
  ],
  "reservationAnswers": [{ "questionKey": "group_type", "answer": "couple" }]
}
```

### ProductType = 'Service'

```json
{
  "ScheduledServiceId": 210,
  "dateTime": "2026-05-16T19:00:00.000Z",
  "numberOfAttendees": 2,
  "specialRequests": "Vegetarian menu preferred",
  "attendeeNames": ["Jane Doe", "John Doe"]
}
```

### ProductType = 'Hotel'

```json
{
  "HotelId": 7,
  "checkInDate": "2026-06-01",
  "checkOutDate": "2026-06-05",
  "numberOfGuests": 2,
  "numberOfRooms": 1,
  "specialRequests": "Late check-in requested",
  "guestNames": ["Jane Doe", "John Doe"]
}
```

---

## Relationships

```
User (CustomerId)
 ├── 1:N  Carts
 └── 1:N  Orders

Cart
 ├── 1:N  CartItems
 └── 1:1  Order  (via CartId on Order)

Order (CustomerId)
 └── 1:N  OrderItems

OrderItem
 ├── N:1  ExperienceReservation  (when ProductType = 'Experience')
 ├── N:1  ServiceReservation     (when ProductType = 'Service')
 └── N:1  HotelReservation       (when ProductType = 'Hotel')
```

### Additions to index.js

```js
// Cart relationships
Cart.belongsTo(User, { as: 'Customer', foreignKey: 'CustomerId' });
User.hasMany(Cart, { as: 'Carts', foreignKey: 'CustomerId' });
Cart.hasMany(CartItem, { foreignKey: 'CartId', as: 'Items' });
CartItem.belongsTo(Cart, { foreignKey: 'CartId' });

// Order relationships
Order.belongsTo(User, { as: 'Customer', foreignKey: 'CustomerId' });
User.hasMany(Order, { as: 'Orders', foreignKey: 'CustomerId' });
Order.belongsTo(Cart, { foreignKey: 'CartId' });
Cart.hasOne(Order, { foreignKey: 'CartId' });
Order.hasMany(OrderItem, { foreignKey: 'OrderId', as: 'Items' });
OrderItem.belongsTo(Order, { foreignKey: 'OrderId' });

// OrderItem → reservation links
OrderItem.belongsTo(ExperienceReservation, { foreignKey: 'ExperienceReservationId', as: 'ExperienceReservation' });
OrderItem.belongsTo(ServiceReservation, { foreignKey: 'ServiceReservationId', as: 'ServiceReservation' });
OrderItem.belongsTo(HotelReservation, { foreignKey: 'HotelReservationId', as: 'HotelReservation' });
ExperienceReservation.hasOne(OrderItem, { foreignKey: 'ExperienceReservationId' });
ServiceReservation.hasOne(OrderItem, { foreignKey: 'ServiceReservationId' });
HotelReservation.hasOne(OrderItem, { foreignKey: 'HotelReservationId' });
```

---

## Checkout Workflow

```
1. User builds Cart by adding CartItems (each with full metadata)
2. User proceeds to checkout
   → Cart.status = 'checkout'
   → Order.create({ status: 'draft', CustomerId, CartId, totals })
3. User submits billing info and payment details
   → (inside a Sequelize transaction)
   → For each CartItem, create the reservation:
       ExperienceReservation.create({ status: 'pending', ...billing, ...metadata.attendees })
       ServiceReservation.create({ status: 'pending', ...billing, ...metadata })
       HotelReservation.create({ status: 'pending', ...billing, ...metadata })
   → OrderItem.create({ OrderId, ProductType, ProductId, reservationId, description snapshot, price snapshot })
   → Order.paymentReference = paymentIntentId
   → Order.status = 'pending'
   → commit transaction
4. Payment webhook confirms success
   → Order.status = 'paid'
   → Each linked reservation.status = 'confirmed'
   → Cart.status = 'converted'
5. Payment webhook reports failure or user cancels
   → Order.status = 'cancelled'
   → Each linked reservation.status = 'cancelled'
     (existing model hooks on ExperienceReservation/ServiceReservation restore availableSpots)
   → Cart.status = 'abandoned'
```

---

## Migration

**Filename:** `backend/server/migrations/20260410120000-create-cart-order-tables.js`

**Table creation order** (respects FK dependencies):

1. `Carts` — depends on `Users` only
2. `CartItems` — depends on `Carts`
3. `Orders` — depends on `Users`, `Carts`
4. `OrderItems` — depends on `Orders`, `ExperienceReservations`, `ServiceReservations`, `HotelReservations`

**Pattern reference:** `20260305120000-create-baseline-schema.js` — CJS `module.exports`, `Sequelize.INTEGER`, `references: { model: 'TableName', key: 'id' }`, `onUpdate: 'CASCADE', onDelete: 'SET NULL'` for FK columns pointing to parent entities that should survive deletion, `onDelete: 'CASCADE'` for child rows that are owned by their parent.

---

## Model Files

**Pattern reference:** `ExperienceReservation.model.js` — ES module `import/export`, `createRequire` shim for DataTypes, define on `sequelize` instance, explicit `tableName`, `timestamps: true`.

Files to create in `backend/server/models/`:

- `Cart.model.js`
- `CartItem.model.js`
- `Order.model.js` — include a `beforeCreate` hook to auto-generate `orderNumber` (format: `ORD-YYYYMMDD-XXXX`)
- `OrderItem.model.js` — include a model-level `validate` block asserting exactly one reservation FK is non-null

---

## Seed Data Examples

### Cart (active, pre-checkout)

```json
{
  "Carts": [
    {
      "id": 1,
      "CustomerId": 42,
      "sessionToken": null,
      "status": "active",
      "currency": "USD",
      "totalAmount": 248.00,
      "discountAmount": 0.00,
      "metadata": { "source": "web" },
      "createdAt": "2026-04-10T12:00:00.000Z",
      "updatedAt": "2026-04-10T12:00:00.000Z"
    }
  ],
  "CartItems": [
    {
      "id": 1,
      "CartId": 1,
      "ProductType": "Experience",
      "ProductId": 101,
      "description": "Sunset Sailing Tour",
      "unitPrice": 120.00,
      "quantity": 1,
      "totalPrice": 120.00,
      "metadata": {
        "ScheduledExperienceId": 555,
        "dateTime": "2026-05-15T18:00:00.000Z",
        "numberOfAttendees": 2,
        "specialRequests": "",
        "attendees": [
          { "firstName": "Jane", "lastName": "Doe", "email": "jane@example.com", "ticketTierId": 12, "dateOfBirth": "1990-01-01", "dietaryRestrictions": null, "accessibilityNeeds": null, "answers": [] },
          { "firstName": "John", "lastName": "Doe", "email": "john@example.com", "ticketTierId": 12, "dateOfBirth": "1988-05-20", "dietaryRestrictions": null, "accessibilityNeeds": null, "answers": [] }
        ],
        "reservationAnswers": []
      },
      "createdAt": "2026-04-10T12:00:00.000Z",
      "updatedAt": "2026-04-10T12:00:00.000Z"
    },
    {
      "id": 2,
      "CartId": 1,
      "ProductType": "Service",
      "ProductId": 88,
      "description": "Private Chef Dinner",
      "unitPrice": 128.00,
      "quantity": 1,
      "totalPrice": 128.00,
      "metadata": {
        "ScheduledServiceId": 210,
        "dateTime": "2026-05-16T19:00:00.000Z",
        "numberOfAttendees": 2,
        "specialRequests": "Vegetarian menu preferred",
        "attendeeNames": ["Jane Doe", "John Doe"]
      },
      "createdAt": "2026-04-10T12:00:00.000Z",
      "updatedAt": "2026-04-10T12:00:00.000Z"
    }
  ]
}
```

### Order (paid, linked to reservations)

```json
{
  "Orders": [
    {
      "id": 1,
      "CustomerId": 42,
      "CartId": 1,
      "status": "paid",
      "orderNumber": "ORD-20260410-0001",
      "currency": "USD",
      "subtotalAmount": 248.00,
      "taxAmount": 0.00,
      "discountAmount": 0.00,
      "totalAmount": 248.00,
      "paymentReference": "pi_3NkXampleStripeIntentId",
      "paymentMethod": "card",
      "metadata": { "source": "web" },
      "createdAt": "2026-04-10T12:15:00.000Z",
      "updatedAt": "2026-04-10T12:15:00.000Z"
    }
  ],
  "OrderItems": [
    {
      "id": 1,
      "OrderId": 1,
      "ProductType": "Experience",
      "ProductId": 101,
      "ExperienceReservationId": 1,
      "ServiceReservationId": null,
      "HotelReservationId": null,
      "description": "Sunset Sailing Tour",
      "unitPrice": 120.00,
      "quantity": 1,
      "totalPrice": 120.00,
      "metadata": {
        "ScheduledExperienceId": 555,
        "dateTime": "2026-05-15T18:00:00.000Z",
        "confirmationCode": "101-555-1744285200000-XK9"
      },
      "createdAt": "2026-04-10T12:15:00.000Z",
      "updatedAt": "2026-04-10T12:15:00.000Z"
    },
    {
      "id": 2,
      "OrderId": 1,
      "ProductType": "Service",
      "ProductId": 88,
      "ExperienceReservationId": null,
      "ServiceReservationId": 1,
      "HotelReservationId": null,
      "description": "Private Chef Dinner",
      "unitPrice": 128.00,
      "quantity": 1,
      "totalPrice": 128.00,
      "metadata": {
        "ScheduledServiceId": 210,
        "dateTime": "2026-05-16T19:00:00.000Z",
        "confirmationCode": "88-210-1744371600000-AB7"
      },
      "createdAt": "2026-04-10T12:15:00.000Z",
      "updatedAt": "2026-04-10T12:15:00.000Z"
    }
  ]
}
```

---

## Implementation Checklist

Complete the following in order:

- [ ] Create migration `20260410120000-create-cart-order-tables.js` — tables: `Carts`, `CartItems`, `Orders`, `OrderItems`
- [ ] Create `Cart.model.js`
- [ ] Create `CartItem.model.js`
- [ ] Create `Order.model.js` with `beforeCreate` hook to auto-generate `orderNumber`
- [ ] Create `OrderItem.model.js` with `validate` block asserting exactly one reservation FK is non-null
- [ ] Register all four models and their relationships in `backend/server/models/index.js`
- [ ] Create `Cart.controller.js`: add item, remove item, update quantity, view cart, clear cart
- [ ] Create `Order.controller.js`: initiate checkout, get by `orderNumber`, list orders for user
- [ ] Implement `Checkout.service.js` that orchestrates reservation creation, OrderItem creation, and Order status transitions inside a Sequelize transaction
- [ ] Add payment webhook handler that transitions `Order.status` and all linked reservations atomically — guard against duplicate delivery with idempotency check on `paymentReference`
- [ ] Register routes under `/api/cart` and `/api/orders` with `auth.js` middleware applied

---

## Further Considerations

- **Guest cart merging**: When a guest with a `sessionToken` cart logs in, merge their `CartItems` into their user cart or prompt them to choose.
- **Idempotency**: Payment webhook handlers must be idempotent — guard using `paymentReference` uniqueness before writing status transitions.
- **OrderItem.quantity for experiences**: Keep `quantity = 1` per booking (one `ExperienceReservation`); `numberOfAttendees` lives inside the reservation and metadata. Do not conflate ticket count with reservation quantity.
