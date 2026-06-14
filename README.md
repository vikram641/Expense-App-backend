# Smart Expense Tracker — Node.js Backend

## Setup

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev            # development with nodemon
npm start              # production
```

## Environment Variables

| Key | Description |
|-----|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for access tokens |
| `REFRESH_SECRET` | Secret for refresh tokens |
| `JWT_EXPIRES_IN` | Access token TTL (default: 15m) |
| `REFRESH_EXPIRES_IN` | Refresh token TTL (default: 7d) |
| `PORT` | Server port (default: 3000) |

## API Base URL
- **Emulator:** `http://10.0.2.2:3000/api`
- **Physical device:** `http://<YOUR_PC_IP>:3000/api`

## Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | ❌ | Register user |
| POST | /auth/login | ❌ | Login + get tokens |
| POST | /auth/refresh | ❌ | Refresh access token |
| POST | /auth/logout | ✅ | Logout |

### Expenses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /expenses | ✅ | List (paginated, filtered) |
| POST | /expenses | ✅ | Create expense |
| GET | /expenses/:id | ✅ | Get single expense |
| PUT | /expenses/:id | ✅ | Update expense |
| DELETE | /expenses/:id | ✅ | Delete expense |

### Categories
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /categories | ✅ | All categories |
| POST | /categories | ✅ | Create custom category |
| DELETE | /categories/:id | ✅ | Delete custom category |

### Budgets
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /budgets?month=YYYY-MM | ✅ | Get budgets for month |
| POST | /budgets | ✅ | Set budget (upsert) |
| DELETE | /budgets/:id | ✅ | Delete budget |

### Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /analytics/summary?month=YYYY-MM | ✅ | Monthly summary |
| GET | /analytics/weekly | ✅ | This week's total |

### User
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /user/profile | ✅ | Get profile |
| PUT | /user/profile | ✅ | Update profile |
| PUT | /user/change-password | ✅ | Change password |

### Currency
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /currency/rates?base=INR | ✅ | Get exchange rates |
| GET | /currency/currencies | ✅ | Supported currencies |

## Project Structure

```
src/
├── controllers/    # Business logic
├── middleware/     # Auth + error handlers
├── models/         # Mongoose schemas
├── routes/         # Express routers
└── utils/          # JWT, response helpers, seeder
```
