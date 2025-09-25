# Tech Stack

## What We Use

| Technology | Purpose | Why |
|------------|---------|-----|
| **Node.js** | Server runtime | Fast & popular |
| **Express** | Web framework | Simple & reliable |
| **TypeScript** | Programming language | Catches errors early |
| **MySQL** | Database | Stores all data |
| **Prisma** | Database tool | Easy database queries |
| **Resend** | Email service | Sends emails reliably |
| **JWT** | Authentication | Secure login tokens |

## Project Structure

```
src/
├── controllers/    # Handle web requests
├── services/       # Business logic  
├── routes/         # API endpoints
├── middleware/     # Security & validation
└── utils/          # Helper functions

prisma/
├── schema.prisma   # Database structure
└── migrations/     # Database changes

scripts/
└── test-*.ts       # Test our code

docs/
├── 01-system/      # How it works
└── 02-reference/   # How to build it
```

## How Requests Work

1. **User** makes request → 
2. **Routes** catch it → 
3. **Middleware** checks security → 
4. **Controller** handles it → 
5. **Service** does the work → 
6. **Database** stores/gets data → 
7. **Response** sent back

## Key Features

- ✅ **Type Safety** - TypeScript catches bugs
- ✅ **Security** - JWT authentication & role checks  
- ✅ **Database** - Prisma makes queries safe
- ✅ **Email** - Resend sends reliable emails
- ✅ **Testing** - Scripts to test everything works

---
*Keep it simple, keep it working!*
