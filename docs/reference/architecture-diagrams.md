---
sidebar_label: Architecture diagrams
sidebar_position: 1
---

# Architecture Diagrams

All diagrams use [Mermaid](https://mermaid.js.org/) syntax.

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Client["Frontend (React + Vite)"]
        RP[RouterProvider]
        AP[AuthProvider]
        CP[CartProvider]
        BL[BaseLayout]
        Pages[Page Components]
        Modals[CartModal / BookingModal]
        NA[NetworkAdapter]
    end

    subgraph Server["Backend (Express + Sequelize)"]
        MW[Middlewares]
        Routes[Express Routes]
        Controllers[Controllers]
        Services[Services]
        Models[Sequelize Models]
    end

    subgraph Storage
        DB[(SQLite / MySQL)]
        R2[Cloudflare R2]
    end

    Client -->|HTTP + Cookies| Server
    NA --> MW
    MW --> Routes
    Routes --> Controllers
    Controllers --> Services
    Controllers --> Models
    Services --> Models
    Models --> DB
    Controllers -->|Upload| R2
```

---

## 2. Frontend Route Tree

```mermaid
graph TD
    Root["/ (BaseLayout)"] --> Redirect["/ → /experiences"]
    Root --> Experiences["/experiences → Experiences"]
    Root --> ExpDetail["/experience/:id → ExperienceDetails"]
    Root --> Hotels["/hotels → HotelsSearch"]
    Root --> HotelDetail["/hotel/:id → HotelDetails"]
    Root --> Login["/login → Login"]
    Root --> Register["/register → Register"]
    Root --> ForgotPW["/forgot-password"]
    Root --> ForgotUser["/forgot-username"]
    Root --> OrgSignup["/organizer-signup"]
    Root --> AboutUs["/about-us"]
    Root --> Contact["/contact"]
    Root --> Privacy["/privacy-policy"]
    Root --> Checkout["/checkout → Checkout"]
    Root --> Confirm["/booking-confirmation"]

    Root --> Auth{"RequireAuth"}
    Auth --> Profile["/user-profile"]
    Auth --> OrgProfile["/organizer-profile"]
    Auth --> OrgGuard{"RequireOrganizer"}
    OrgGuard --> CreateExp["/create-experience"]
    OrgGuard --> EditExp["/edit-experience/:experienceId"]
    OrgGuard --> CreateSvc["/create-service"]
```

## 2.1 Experience Gallery Composition

- `ExperienceDetails` composes an organizer-first gallery from organizer images or thumbnail fallback plus review images already included on loaded experience comments.
- `ImageGalleryModal` remains generic through an optional `renderSidebar(imageData)` prop so feature-specific review context stays outside the shared gallery implementation.
- Mixed galleries reuse the same thumbnail, lightbox, keyboard, and click navigation while separating modal thumbnails into "Experience Photos" and "Guest Photos" sections.

## 2.2 Organizer Workspace Tabs

- `OrganizerProfile` now uses the shared `Tabs` and `TabPanel` components for its primary workspace navigation, including separate `Organization` and `Experiences` tabs.
- `OrgMembersPanel` handles organization details, members, and pending invites against the organizer workspace payload.
- `OrgExperiencesPanel` handles searchable experience cards, inline schedule management actions, and destructive experience deletion backed by managed experience routes. The "Edit" button navigates to `/edit-experience/:experienceId`.

## 2.3 Experience Editing (Create/Edit Dual Mode)

- `CreateExperience` accepts `mode` (`'create'` | `'edit'`) and `experienceData` props. In edit mode it pre-populates all form steps, submits via PATCH, and detects schedule changes to display a sync-required alert.
- `EditExperience` is a route wrapper at `/edit-experience/:experienceId` that fetches the experience via `GET /api/experiences/manage/:id` and renders `CreateExperience` in edit mode.
- Backend `getExperienceForEdit` returns the full experience with `ScheduleTemplates`, `PickedOccurrences`, `TicketTiers`, `Organizers`, and `Location` associations.

---

## 3. Backend API Route Map

```mermaid
graph LR
    subgraph "/api/users"
        U1[POST /register]
        U2[POST /login]
        U3[POST /logout]
        U4[GET /auth-user]
        U5[PATCH /update]
        U6[GET /bookings]
        U7[GET /payment-methods]
        U8[POST /lookup-username]
    end

    subgraph "/api/experiences"
        E1[GET /]
        E2[GET /:code]
        E3[GET /:code/booking-enquiry]
        E4[GET /:code/comments]
        E5[POST /:code/comments]
        E6[GET /:code/nearby]
        E7[GET /:code/scheduled]
        E8[GET /:code/scheduled/calendar]
        E9[POST /:code/reserve]
        E10[POST / — create]
        E11[PATCH /:code — update]
        E12[POST /sync-schedule]
    end

    subgraph "/api/cart"
        C1[GET /]
        C2[POST /items]
        C3[PATCH /items/:id]
        C4[DELETE /items/:id]
        C5[DELETE /]
        C6[POST /checkout]
    end

    subgraph "/api/orders"
        O1[GET /]
        O2[GET /:id]
        O3[POST /webhook]
    end

    subgraph "/api/hotels"
        H1[GET /]
    end

    subgraph "/api/hotel"
        H2[GET /:code]
        H3[GET /:code/booking-enquiry]
    end

    subgraph "/api/organizers"
        OG1[POST /invite]
        OG2[GET /invite/:token]
        OG3[POST /onboarding]
        OG4[GET /workspace]
    end

    subgraph "/api/media"
        M1[POST /upload]
        M2[GET /:key]
    end

    subgraph "/api/comments"
        CM1[GET /]
        CM2[PATCH /:id]
        CM3[DELETE /:id]
    end
```

---

## 4. Data Model ERD (Core Entities)

```mermaid
erDiagram
    User ||--o{ Cart : "has"
    User ||--o{ Order : "places"
    User ||--o{ Comment : "writes"
    User ||--o{ Organizer : "is"

    Cart ||--o{ CartItem : "contains"

    Order ||--o{ OrderItem : "contains"
    OrderItem ||--o| ExperienceReservation : "references"
    OrderItem ||--o| HotelReservation : "references"
    OrderItem ||--o| ServiceReservation : "references"

    Experience ||--o{ TicketTier : "has"
    Experience ||--o{ ScheduledExperience : "has"
    Experience ||--o{ ScheduleTemplate : "follows"
    ScheduledExperience ||--o{ ExperienceReservation : "books"

    ExperienceReservation ||--o{ ExperienceReservationAttendee : "has"
    ExperienceReservation ||--o{ ExperienceReservationAnswer : "has"
    ExperienceReservationAttendee ||--o{ ExperienceReservationAttendeeAnswer : "has"

    Service ||--o{ ScheduledService : "has"
    Service ||--o{ TicketTier : "has"

    Hotel ||--o{ HotelReservation : "books"

    Organization ||--o{ Organizer : "employs"
    Organization ||--o{ Location : "has"
    Organization ||--o{ OrganizationInvite : "sends"

    User {
        int id PK
        string username UK
        string firstName
        string lastName
        string email
        string phone
    }

    Experience {
        int id PK
        string code
        string title
        string subtitle
        int durationMinutes
        json userQuestionnary
    }

    TicketTier {
        int id PK
        string title
        decimal price
        int minAge
        int maxAge
        json userQuestionnary
    }

    ScheduledExperience {
        int id PK
        datetime dateTime
        int totalSpots
        int availableSpots
    }

    ExperienceReservation {
        int id PK
        string status
        decimal totalPrice
        string mainContactName
        string mainContactPhone
        string mainContactEmail
        string hotelName
        text comments
    }

    Cart {
        int id PK
        string status
        decimal totalAmount
        string sessionToken
        int CustomerId FK
    }

    CartItem {
        int id PK
        string ProductType
        int ProductId
        text description
        decimal unitPrice
        int quantity
        decimal totalPrice
        json metadata
    }

    Order {
        int id PK
        string status
        decimal totalAmount
        string currency
    }
```

---

## 5. Experience Booking Flow (Sequence)

```mermaid
sequenceDiagram
    actor User
    participant Modal as BookingModal
    participant Ctx as CartContext
    participant API as Backend API
    participant DB as Database

    User->>Modal: Select tickets & fill contact
    User->>Modal: Answer questionnaire
    User->>Modal: Click "Add To Cart"
    Modal->>Modal: Validate inputs
    Modal->>Ctx: addToCart(payload)
    Ctx->>API: POST /api/cart/items
    API->>API: Validate ProductType & metadata
    API->>DB: Find or create Cart
    API->>DB: Create CartItem
    API->>DB: Recompute cart total
    API-->>Ctx: 201 { item, cartTotal }
    Ctx->>API: GET /api/cart/
    API-->>Ctx: { cart with Items }
    Ctx-->>Modal: resolved
    Modal->>Ctx: openCart()
    Ctx-->>User: CartModal opens

    User->>User: Fill contact, billing, payment
    User->>API: POST /api/cart/checkout
    API->>DB: Create Order + OrderItems
    API->>DB: Create Reservations
    API->>DB: Mark Cart completed
    API-->>User: Order confirmation
```

---

## 6. Cart System Architecture

```mermaid
graph TB
    subgraph Frontend
        FAB[CartFAB]
        CM[CartModal]
        BSM[BookingModal]
        CTX[CartContext]
    end

    subgraph Backend
        CR[Cart Routes]
        CC[Cart Controller]
        OC[Order Controller]
        CS[Checkout Service]
    end

    subgraph Models
        CartM[Cart]
        CIM[CartItem]
        OM[Order]
        OIM[OrderItem]
    end

    FAB -->|onClick| CTX
    BSM -->|addToCart| CTX
    CM -->|removeFromCart| CTX
    CM -->|checkout| CR

    CTX -->|GET /cart| CR
    CTX -->|POST /cart/items| CR
    CTX -->|DELETE /cart/items/:id| CR

    CR --> CC
    CR -->|POST /checkout| OC
    OC --> CS

    CC --> CartM
    CC --> CIM
    CS --> CartM
    CS --> CIM
    CS --> OM
    CS --> OIM
```

---

## 7. Authentication & Guest Cart Flow

```mermaid
graph TD
    Request[Incoming Request] --> HasToken{JWT Cookie?}

    HasToken -->|Yes| ValidateJWT[Validate JWT]
    ValidateJWT -->|Valid| AuthUser["req.user = decoded (id, name, username)"]
    ValidateJWT -->|Invalid| Guest[req.user = null]
    HasToken -->|No| Guest

    AuthUser --> CartLookup{Cart Lookup}
    Guest --> CartLookup

    CartLookup --> IsAuth{req.user?}
    IsAuth -->|Yes| ByCustomerId["findOne({ CustomerId })"]
    IsAuth -->|No| HasSession{_cart_session cookie?}
    HasSession -->|Yes| BySession["findOne({ sessionToken })"]
    HasSession -->|No| CreateSession[Generate UUID + Set Cookie]
    CreateSession --> NewCart["Cart.create({ sessionToken })"]

    ByCustomerId --> CartFound
    BySession --> CartFound
    NewCart --> CartFound[Return Cart]
```

---

## 8. Controller → Service → Model Dependencies

```mermaid
graph LR
    subgraph Controllers
        EC[Experience.controller]
        EMC[ExperienceManage.controller]
        CC[Cart.controller]
        OC[Order.controller]
        UC[User.controller]
        HC[Hotel.controller]
        SC[Service.controller]
        SMC[ServiceManage.controller]
        OGC[Organizer.controller]
        MC[Media.controller]
        CMC[Comment.controller]
    end

    subgraph Services
        ES[Experience.service]
        CS[Checkout.service]
        OMS[offering-manage.shared]
    end

    subgraph Models
        EM[Experience]
        SE[ScheduledExperience]
        TT[TicketTier]
        ER[ExperienceReservation]
        ERA[ExperienceReservationAttendee]
        CartM[Cart]
        CIM[CartItem]
        OM[Order]
        OIM[OrderItem]
        UM[User]
        HM[Hotel]
        SM[Service]
        OGM[Organizer]
        CM[Comment]
    end

    EC --> ES
    EC --> EM
    EC --> SE
    EC --> TT
    EC --> ER
    EC --> ERA

    EMC --> OMS
    EMC --> EM
    EMC --> TT

    CC --> CartM
    CC --> CIM

    OC --> CS
    CS --> CartM
    CS --> CIM
    CS --> OM
    CS --> OIM
    CS --> ER
    CS --> ERA

    SMC --> OMS
    SMC --> SM

    UC --> UM
    HC --> HM
    SC --> SM
    OGC --> OGM
    CMC --> CM
```

---

## 9. Frontend Component Hierarchy (Booking Flow)

```mermaid
graph TD
    App[App Root] --> AuthProvider
    AuthProvider --> CartProvider
    CartProvider --> Router[RouterProvider]
    Router --> BaseLayout

    BaseLayout --> Navbar[GlobalNavbar]
    BaseLayout --> Outlet[Page Outlet]
    BaseLayout --> Footer[GlobalFooter]
    BaseLayout --> CartFAB
    BaseLayout --> CartModal

    Outlet --> ExpDetails[ExperienceDetails]
    ExpDetails --> ScheduledList[ScheduledExperiencesList]
    ScheduledList --> BookingModal[ExperienceSessionBookingModal]

    BookingModal --> TierSelector[TicketTierSelector]
    BookingModal --> QSection[QuestionnaireSection]
    BookingModal --> ContactForm[MainContactForm]
    BookingModal --> AttendeeEmails[OptionalAttendeeEmails]
    BookingModal --> Summary[SessionSummary]
    BookingModal --> Waitlist[WaitlistSection]

    CartModal --> CartItemCard
```
