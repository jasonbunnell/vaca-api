# FLX Vacations API (vaca-api)

Backend API for [flxvacations.com](https://flxvacations.com). Node, Express, MongoDB.

## Phase 1 – Kickoff (current)

- Express server with `server.js` entry point
- MongoDB connection via `config/db.js` (uses `MONGODB_URI` or local default)
- **Models:** User (name, email, role), Property (title, bedrooms, bathrooms, description, amenities, features, owner)
- **Controllers & routes:** CRUD for `/api/properties` and `/api/users`
- Auth middleware deferred to Phase 2

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `MONGODB_URI` (e.g. MongoDB Atlas connection string, or `mongodb://localhost:27017/vaca-api` for local MongoDB)
   - Optional: `PORT` (default 3000)

3. **Run locally**
   ```bash
   npm run dev
   ```
   Or production: `npm start`

## Routes (Phase 1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/properties` | List all properties |
| GET | `/api/properties/:id` | Get one property |
| POST | `/api/properties` | Create property (body: title, bedrooms, bathrooms, owner, etc.) |
| PUT | `/api/properties/:id` | Update property |
| DELETE | `/api/properties/:id` | Delete property |
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get one user |
| POST | `/api/users` | Create user (body: name, email, role) |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

**Try in browser:**  
- http://localhost:3000/api/health  
- http://localhost:3000/api/properties  
- http://localhost:3000/api/users  

Create a user first (e.g. with Postman or `curl`), then create a property with that user's `_id` as `owner`.

## Seeder

Load or clear test data (uses `config/.env` for MongoDB).

```bash
# Import: creates users and properties from _data/newUsers.json and _data/newProperty.json
npm run seed:import
# or
node seeder.js -i

# Delete: removes all users and properties
npm run seed:delete
# or
node seeder.js -d
```

Properties in `_data/newProperty.json` use `ownerEmail` to reference a user by email; the seeder resolves them to `owner` ObjectIds when importing.

## Project structure

```
vaca-api/
├── _data/        # newUsers.json, newProperty.json (seed data)
├── config/       # db connection
├── controllers/  # property, user
├── middleware/   # (auth in Phase 2)
├── models/       # User, Property
├── routes/       # property, user
├── utils/
├── docs/         # PRD, etc.
├── seeder.js
├── server.js
└── package.json
```

## PRD

See [docs/PRD.md](docs/PRD.md) for full product requirements and implementation phases.
