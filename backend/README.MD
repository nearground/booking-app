# PUERTO VALLARTA TODAY Hotel Booking Express API

Welcome to the PUERTO VALLARTA TODAY Hotel Booking Express API repository... This API serves as the backbone for the [PUERTO VALLARTA TODAY Hotel Booking React Frontend](https://github.com/iZooGooD/frontend), providing a robust backend solution for managing hotel bookings, user accounts, and more. Built with Express.js and integrated with MySQL through Sequelize, this project is designed to offer a seamless, efficient platform for hotel booking applications.

## Getting Started

### Prerequisites

-   Node.js (v16 or later recommended)
-   MySQL
-   Git
-   Postman (for testing API endpoints)

### Environment Setup

1. **Clone the repository**

```bash
git clone https://github.com/nearground/......git
cd pv-today-hotel-booking-express-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up MySQL**

Ensure MySQL is installed on your windows/linux/mac. Create two databases: one for production and one for testing.

```sql
CREATE DATABASE staybooker_prod;
CREATE DATABASE staybooker_test;
```

4. **Configure Environment Variables**

Copy the `.env.example` file to a new file named `.env` and update it with your MySQL database settings and other configurations.

```plaintext
# Development Environment
DEV_DB_HOST=localhost
DEV_DB_USER=yourusername
DEV_DB_PASS=yourpassword
DEV_DB_NAME=staybooker_test

# Production Environment
PROD_DB_HOST=localhost
PROD_DB_USER=yourusername
PROD_DB_PASS=yourpassword
PROD_DB_NAME=staybooker_prod

# JWT Secret
JWT_SECRET=jwtsecretforproject
```

### Running the Application

Upon starting the application, Sequelize will automatically create the necessary tables in the specified database.

```bash
npm run start:dev
```

## Testing API Endpoints with Postman

To ensure the API functions as expected, we recommend using Postman for testing the endpoints. Import the provided Postman collection (if available) to quickly start testing the API's functionality, including user authentication, hotel listings, bookings, and more.

### Experience scheduling

The API supports creating multiple schedules for an Experience via the `schedules` payload on the create/update endpoints. See the detailed docs: [Experience Scheduling API](docs/experiences-schedules.md)

## API Error & Security Conventions

### Standard Error Envelope

The API now uses a consistent JSON error shape for server and middleware errors:

```json
{
	"errors": ["Human-readable error message"],
	"data": {
		"requestId": "uuid"
	}
}
```

- `errors`: array of user-safe messages
- `data.requestId`: unique request correlation ID for logs/troubleshooting

### Request Correlation

Each response includes an `X-Request-Id` header. Use this value when reporting issues to map client-side failures to backend logs.

### CSRF Protection (Cookie Auth)

For authenticated, state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`):

- The backend expects a CSRF header token (default header: `X-CSRF-Token`)
- The token value is read from the CSRF cookie (default cookie: `_csrf_token`)
- Missing/invalid tokens return `403`

Read-only methods (`GET`, `HEAD`, `OPTIONS`) are not CSRF-validated.

### Upstream Error Sanitization

Storage/proxy endpoints avoid returning raw upstream bodies in error responses. Upstream status codes may be included in metadata, but internal details are intentionally hidden.

## Sequelize and MySQL

This project uses Sequelize, a promise-based Node.js ORM, for database management. Sequelize simplifies MySQL interactions, allowing for easy data manipulation and querying through models that represent database tables. The configuration for Sequelize is found in `config/config.js`, and models are located in the `models` directory.

## Contributing

We welcome contributions to the PUERTO VALLARTA TODAY Hotel Booking Express API! Whether it's adding new features, fixing bugs, or improving documentation, your help is appreciated. Please read our contributing guidelines (to be created) for more information on how to contribute effectively.

### Code Quality

Code quality matters a lot in this project. We strive to maintain high standards of code quality and readability. Please ensure your contributions adhere to these standards and are well-tested.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
