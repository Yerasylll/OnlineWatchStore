# Online Watch Store

Advanced Database (NoSQL) Final Project - MongoDB-based E-commerce Application

## Project Overview

The Online Watch Store is a full-stack web application built with MongoDB, Express.js, and vanilla JavaScript. This e-commerce platform allows users to browse luxury watches, manage shopping carts, place orders, write reviews, and provides administrators with comprehensive management capabilities.

## Team Information

- Students: Yerassyl Alimbek, Yerassyl Ginayat
- Course: Advanced Databases (NoSQL)

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [API Documentation](#api-documentation)
4. [MongoDB Implementation](#mongodb-implementation)
5. [Frontend Pages](#frontend-pages)
6. [Installation and Setup](#installation-and-setup)
7. [Security Features](#security-features)
8. [Indexing and Optimization](#indexing-and-optimization)

## System Architecture

### Technology Stack

**Backend:**
- Node.js with Express.js
- MongoDB (NoSQL Database)
- JWT for authentication
- bcryptjs for password hashing

**Frontend:**
- Vanilla JavaScript (ES6+)
- HTML5 & CSS3
- Fetch API for HTTP requests

### Architecture Pattern

The application follows a three-tier architecture:

```
Frontend (Client) <--> Backend (REST API) <--> Database (MongoDB)
```

**Data Flow:**
1. User interacts with the frontend interface
2. Frontend sends HTTP requests to REST API endpoints
3. Backend validates requests and authenticates users
4. Backend performs CRUD operations on MongoDB
5. MongoDB returns data to backend
6. Backend sends JSON responses to frontend
7. Frontend updates UI based on response

## Database Schema

### Collections Overview

The database consists of 4 main collections:

1. **users** - User accounts and authentication
2. **watches** - Product catalog
3. **orders** - Purchase transactions
4. **reviews** - Product reviews and ratings

### Collection Schemas

#### 1. users Collection

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String ("user" | "admin"),
  phone: String,
  addresses: [
    {
      _id: ObjectId,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      isDefault: Boolean
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

**Data Model Type:** Embedded (addresses are embedded documents)

#### 2. watches Collection

```javascript
{
  _id: ObjectId,
  brand: String,
  model: String,
  description: String,
  price: Number,
  stock: Number,
  category: String,
  featured: Boolean,
  averageRating: Number,
  reviewCount: Number,
  image: String,
  images: [String],
  specifications: {
    caseMaterial: String,
    caseDiameter: String,
    movement: String,
    waterResistance: String,
    strapMaterial: String,
    warranty: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Data Model Type:** Embedded (specifications are embedded documents)

#### 3. orders Collection

```javascript
{
  _id: ObjectId,
  user: ObjectId (reference to users),
  items: [
    {
      watch: ObjectId (reference to watches),
      watchDetails: {
        brand: String,
        model: String,
        price: Number,
        image: String
      },
      quantity: Number,
      price: Number
    }
  ],
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  totalAmount: Number,
  status: String,
  paymentStatus: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Data Model Type:** Hybrid (user reference + embedded watch details and shipping address)

#### 4. reviews Collection

```javascript
{
  _id: ObjectId,
  watch: ObjectId (reference to watches),
  user: ObjectId (reference to users),
  rating: Number (1-5),
  comment: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Data Model Type:** Referenced (references both users and watches)

### Data Modeling Decisions

**Embedded Documents:**
- User addresses: Embedded because addresses belong to users and are always accessed together
- Watch specifications: Embedded because specifications are part of watch data
- Order items with watch details: Embedded to preserve order history even if watch is deleted

**Referenced Documents:**
- Reviews reference users and watches: Allows independent querying and prevents data duplication
- Orders reference users: Enables user-based order queries
- Order items reference watches: Maintains relationship while embedding snapshot data

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### 1. Register User
- **POST** `/auth/register`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "+7 777 123 4567"
  }
  ```
- **Response:** JWT token and user data

#### 2. Login User
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response:** JWT token and user data

#### 3. Get Current User
- **GET** `/auth/me`
- **Auth:** Required
- **Response:** Current user profile

### Watch Endpoints

#### 4. Get All Watches (with filtering, sorting, pagination)
- **GET** `/watches?category=Luxury&brand=Rolex&minPrice=1000&maxPrice=50000&sort=price_asc&page=1&limit=12`
- **Query Parameters:**
  - `category`: Filter by category
  - `brand`: Filter by brand
  - `minPrice`, `maxPrice`: Price range filter
  - `search`: Text search
  - `sort`: price_asc, price_desc, newest, rating
  - `page`, `limit`: Pagination
- **Response:** Array of watches with pagination metadata

#### 5. Get Single Watch
- **GET** `/watches/:id`
- **Response:** Watch details

#### 6. Create Watch (Admin Only)
- **POST** `/watches`
- **Auth:** Required (Admin)
- **Body:** Watch object
- **Response:** Created watch

#### 7. Update Watch (Admin Only)
- **PUT** `/watches/:id`
- **Auth:** Required (Admin)
- **Body:** Updated fields
- **Response:** Updated watch

#### 8. Delete Watch (Admin Only)
- **DELETE** `/watches/:id`
- **Auth:** Required (Admin)
- **Response:** Success message

#### 9. Update Stock (Admin Only)
- **PUT** `/watches/:id/stock`
- **Auth:** Required (Admin)
- **Body:**
  ```json
  {
    "quantity": 5,
    "operation": "add" // or "subtract"
  }
  ```
- **Response:** Updated watch

#### 10. Get Watch Statistics (Admin Only) - AGGREGATION
- **GET** `/watches/statistics`
- **Auth:** Required (Admin)
- **Response:** Category and brand statistics with aggregated data

#### 11. Get Featured Watches
- **GET** `/watches/featured`
- **Response:** Array of featured watches

#### 12. Add Watch Image (Admin Only)
- **POST** `/watches/:id/images`
- **Auth:** Required (Admin)
- **Body:**
  ```json
  {
    "imageUrl": "https://example.com/image.jpg"
  }
  ```
- **Response:** Updated watch

#### 13. Remove Watch Image (Admin Only)
- **DELETE** `/watches/:id/images`
- **Auth:** Required (Admin)
- **Body:**
  ```json
  {
    "imageUrl": "https://example.com/image.jpg"
  }
  ```
- **Response:** Updated watch

### Order Endpoints

#### 14. Create Order
- **POST** `/orders`
- **Auth:** Required
- **Body:**
  ```json
  {
    "items": [
      {
        "watchId": "ObjectId",
        "quantity": 1
      }
    ],
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Almaty",
      "state": "Almaty",
      "zipCode": "050000",
      "country": "Kazakhstan"
    }
  }
  ```
- **Response:** Created order

#### 15. Get My Orders
- **GET** `/orders/my-orders`
- **Auth:** Required
- **Response:** User's orders

#### 16. Get All Orders (Admin Only)
- **GET** `/orders`
- **Auth:** Required (Admin)
- **Query Parameters:** `status`, `page`, `limit`
- **Response:** All orders with pagination

#### 17. Get Single Order
- **GET** `/orders/:id`
- **Auth:** Required
- **Response:** Order details

#### 18. Update Order Status (Admin Only)
- **PUT** `/orders/:id/status`
- **Auth:** Required (Admin)
- **Body:**
  ```json
  {
    "status": "shipped"
  }
  ```
- **Response:** Updated order

#### 19. Update Payment Status (Admin Only)
- **PUT** `/orders/:id/payment`
- **Auth:** Required (Admin)
- **Body:**
  ```json
  {
    "paymentStatus": "paid"
  }
  ```
- **Response:** Updated order

#### 20. Delete Order
- **DELETE** `/orders/:id`
- **Auth:** Required
- **Response:** Success message

#### 21. Remove Order Item
- **DELETE** `/orders/:id/items`
- **Auth:** Required
- **Body:**
  ```json
  {
    "watchId": "ObjectId"
  }
  ```
- **Response:** Updated order

#### 22. Get Order Statistics (Admin Only) - AGGREGATION
- **GET** `/orders/statistics`
- **Auth:** Required (Admin)
- **Response:** Revenue, order counts, and trend statistics

### Review Endpoints

#### 23. Get Watch Reviews
- **GET** `/reviews/watch/:watchId`
- **Response:** Array of reviews for a watch

#### 24. Create Review
- **POST** `/reviews/watch/:watchId`
- **Auth:** Required
- **Body:**
  ```json
  {
    "rating": 5,
    "comment": "Excellent watch!"
  }
  ```
- **Response:** Created review

#### 25. Update Review
- **PUT** `/reviews/:id`
- **Auth:** Required
- **Body:**
  ```json
  {
    "rating": 4,
    "comment": "Updated review"
  }
  ```
- **Response:** Updated review

#### 26. Delete Review
- **DELETE** `/reviews/:id`
- **Auth:** Required
- **Response:** Success message

### User Endpoints

#### 27. Update Profile
- **PUT** `/users/profile`
- **Auth:** Required
- **Body:**
  ```json
  {
    "name": "John Updated",
    "phone": "+7 777 999 8888"
  }
  ```
- **Response:** Updated user

#### 28. Add Address
- **POST** `/users/address`
- **Auth:** Required
- **Body:** Address object
- **Response:** Updated user

#### 29. Update Address
- **PUT** `/users/address/:addressId`
- **Auth:** Required
- **Body:** Updated address fields
- **Response:** Updated user

#### 30. Delete Address
- **DELETE** `/users/address/:addressId`
- **Auth:** Required
- **Response:** Updated user

#### 31. Get All Users (Admin Only)
- **GET** `/users/all`
- **Auth:** Required (Admin)
- **Response:** Array of all users

#### 32. Delete User (Admin Only)
- **DELETE** `/users/:userId`
- **Auth:** Required (Admin)
- **Response:** Success message

### API Summary

**Total Endpoints: 32**
- Authentication: 3 endpoints
- Watches: 10 endpoints
- Orders: 9 endpoints
- Reviews: 4 endpoints
- Users: 6 endpoints

**CRUD Coverage:**
- Create: 8 endpoints
- Read: 13 endpoints
- Update: 8 endpoints
- Delete: 6 endpoints

**Aggregation Endpoints: 2**
- Watch statistics
- Order statistics

## MongoDB Implementation

### CRUD Operations

#### Create Operations
- User registration with hashed passwords
- Watch creation by admin
- Order creation with embedded items
- Review creation with rating

#### Read Operations
- Filtered and paginated watch listing
- User profile retrieval
- Order history queries
- Review retrieval by watch

#### Update Operations
- **$set**: Update watch details, user profile, order status
- **$inc**: Increment/decrement stock quantity
- **$push**: Add addresses to user, add images to watch
- **$pull**: Remove addresses from user
- **$unset**: Remove watch images
- Positional operators for updating embedded documents

#### Delete Operations
- Cascade delete: Deleting watch removes associated reviews
- Cascade delete: Deleting user removes associated reviews
- Order deletion with stock restoration
- Review deletion with rating recalculation

### Advanced MongoDB Features

#### 1. Aggregation Pipelines

**Watch Statistics Aggregation:**
```javascript
[
  {
    $group: {
      _id: '$category',
      count: { $sum: 1 },
      averagePrice: { $avg: '$price' },
      minPrice: { $min: '$price' },
      maxPrice: { $max: '$price' },
      totalStock: { $sum: '$stock' },
      averageRating: { $avg: '$averageRating' }
    }
  },
  {
    $sort: { count: -1 }
  }
]
```

**Order Statistics Aggregation:**
```javascript
[
  {
    $group: {
      _id: null,
      totalRevenue: { $sum: '$totalAmount' },
      totalOrders: { $sum: 1 },
      averageOrderValue: { $avg: '$totalAmount' }
    }
  },
  {
    $lookup: {
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'userDetails'
    }
  }
]
```

#### 2. Advanced Update Operators

**Stock Management with $inc:**
```javascript
{ $inc: { stock: -quantity } }  // Decrease stock
{ $inc: { stock: quantity } }   // Increase stock
```

**Array Operations:**
```javascript
{ $push: { addresses: newAddress } }     // Add address
{ $pull: { addresses: { _id: addressId } } }  // Remove address
{ $set: { "addresses.$.isDefault": true } }   // Update specific array element
```

**Rating Recalculation:**
```javascript
{ 
  $set: { 
    averageRating: calculatedAverage,
    reviewCount: { $inc: 1 }
  } 
}
```

#### 3. Complex Queries

**Multi-field Filtering:**
```javascript
{
  category: "Luxury",
  price: { $gte: 1000, $lte: 50000 },
  stock: { $gt: 0 },
  $text: { $search: "Rolex" }
}
```

**Lookup with Population:**
```javascript
await orders().aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'userDetails'
    }
  }
])
```

## Indexing and Optimization

### Created Indexes

#### 1. Compound Index on watches (brand + price)
```javascript
db.watches.createIndex(
  { brand: 1, price: 1 },
  { name: 'brand_price_idx' }
)
```
**Purpose:** Optimize filtering by brand and sorting by price simultaneously

#### 2. Text Index on watches
```javascript
db.watches.createIndex(
  { model: 'text', brand: 'text', description: 'text' },
  { name: 'search_idx' }
)
```
**Purpose:** Enable full-text search across watch details

#### 3. Unique Index on users.email
```javascript
db.users.createIndex(
  { email: 1 },
  { unique: true, name: 'email_idx' }
)
```
**Purpose:** Ensure email uniqueness and optimize login queries

#### 4. Compound Index on orders (user + createdAt)
```javascript
db.orders.createIndex(
  { user: 1, createdAt: -1 },
  { name: 'user_orders_idx' }
)
```
**Purpose:** Optimize user order history queries with chronological sorting

#### 5. Compound Index on reviews (watch + createdAt)
```javascript
db.reviews.createIndex(
  { watch: 1, createdAt: -1 },
  { name: 'watch_reviews_idx' }
)
```
**Purpose:** Optimize review retrieval for specific watches

#### 6. Unique Compound Index on reviews (watch + user)
```javascript
db.reviews.createIndex(
  { watch: 1, user: 1 },
  { unique: true, name: 'watch_user_unique_idx' }
)
```
**Purpose:** Prevent duplicate reviews from same user on same watch

### Performance Optimization Strategy

1. **Query Optimization:**
   - Use projection to limit returned fields
   - Implement pagination to reduce data transfer
   - Use covered queries where possible

2. **Index Selection:**
   - Compound indexes for multi-field queries
   - Text indexes for search functionality
   - Unique indexes for data integrity

3. **Data Access Patterns:**
   - Embedded documents for frequently accessed related data
   - References for large or independently queried data
   - Denormalization for read-heavy operations

## Frontend Pages

The application includes 6+ functional pages:

1. **Home Page** - Featured watches, categories, search
2. **Product Listing Page** - Browse all watches with filters and sorting
3. **Product Detail Page** - Watch details, reviews, add to cart
4. **Shopping Cart Page** - View cart items, update quantities, checkout
5. **Order History Page** - User's past orders
6. **Admin Dashboard** - Manage watches, orders, users, view statistics
7. **Login/Register Page** - User authentication
8. **User Profile Page** - Manage profile and addresses

### Frontend Features

- Dynamic content rendering with JavaScript
- Real-time cart updates
- Form validation
- JWT token storage in localStorage
- Protected routes for authenticated users
- Admin-only sections
- Responsive design

## Installation and Setup

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- npm or yarn package manager

### Installation Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd online-watch-store
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_generated_jwt_secret
DB_NAME=onlineWatchStore
NODE_ENV=development
ADMIN=admin@watchstore.com
PASSWORD=admin123
```

5. Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

6. Seed the database:
```bash
node seed.js
```

7. Start the server:
```bash
npm start
```

8. Access the application:
```
http://localhost:3000
```

### Default Credentials

**Test User:**
- Email: john@example.com
- Password: password123

## Security Features

### Authentication and Authorization

1. **JWT-based Authentication:**
   - Secure token generation with expiration
   - Token validation middleware
   - Protected routes requiring authentication

2. **Password Security:**
   - bcrypt hashing with salt rounds
   - Passwords never stored in plain text
   - Secure password comparison

3. **Role-based Authorization:**
   - User and Admin roles
   - Middleware to restrict admin-only endpoints
   - Permission checks before sensitive operations

4. **Environment Configuration:**
   - Sensitive data in `.env` file
   - `.env` excluded from version control
   - `.env.example` template provided

### Additional Security Measures

- Input validation on all endpoints
- MongoDB injection prevention through parameterized queries
- CORS configuration
- Error handling without exposing sensitive information

## Bonus Features Implemented

1. **Environment Configuration (.env usage)** - Proper separation of configuration
2. **Centralized Error Handling** - Error middleware for consistent responses
3. **Pagination, Filtering, Sorting** - Standard query parameters for data retrieval
4. **Advanced MongoDB Operators** - $inc, $push, $pull, $set, $unset, positional operators
5. **Cascade Deletes** - Maintaining referential integrity
6. **Compound Indexes** - Performance optimization
7. **Text Search** - Full-text search capability
8. **Aggregation Pipelines** - Business intelligence and statistics

## Project Structure

```
online-watch-store/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection and indexes
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── watchController.js   # Watch CRUD operations
│   │   ├── orderController.js   # Order management
│   │   ├── reviewController.js  # Review operations
│   │   └── userController.js    # User management
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication
│   │   └── error.js             # Error handling
│   ├── models/
│   │   └── collections.js       # Collection accessors
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── watchRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── reviewRoutes.js
│   │   └── userRoutes.js
│   └── server.js                # Express app setup
├── frontend/
│   ├── index.html               # Main HTML file
│   ├── app.js                   # Frontend JavaScript
│   └── styles.css               # Styling
├── .env                         # Environment variables (not in git)
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
├── package.json                 # Dependencies
├── seed.js                      # Database seeding script
└── README.md                    # This file
```

## Testing the Application

### Manual Testing Steps

1. **User Registration and Login:**
   - Register a new user
   - Login with credentials
   - Verify JWT token storage

2. **Browse Watches:**
   - View all watches
   - Filter by category, brand, price
   - Search for specific watches
   - Sort by price, rating, newest

3. **Product Details:**
   - View watch details
   - Read reviews
   - Add to cart

4. **Shopping Cart:**
   - View cart items
   - Update quantities
   - Remove items
   - Proceed to checkout

5. **Place Order:**
   - Select shipping address
   - Create order
   - Verify stock reduction

6. **Review System:**
   - Write a review
   - Update review
   - Delete review
   - Verify rating recalculation

7. **Admin Functions:**
   - Login as admin
   - View statistics dashboard
   - Create/update/delete watches
   - Manage orders
   - Update order status
   - View all users

### API Testing with curl

**Register User:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"test123"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

**Get Watches:**
```bash
curl http://localhost:3000/api/watches?category=Luxury&sort=price_asc
```

**Get Statistics (Admin):**
```bash
curl http://localhost:3000/api/watches/statistics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Conclusion

This Online Watch Store project demonstrates comprehensive implementation of MongoDB NoSQL database concepts including:

- Complex data modeling with embedded and referenced documents
- Advanced CRUD operations with MongoDB operators
- Multi-stage aggregation pipelines for business analytics
- Compound and text indexes for query optimization
- RESTful API design with authentication and authorization
- Full-stack integration with responsive frontend

The application meets all requirements for the Advanced Databases (NoSQL) final project and implements several bonus features for enhanced functionality and security.

## License

This project is created for educational purposes as part of the Advanced Databases (NoSQL) course.
