# API Testing Basics

## 🤔 What is API Testing?

**API** = Application Programming Interface  
**Testing** = Making sure it works correctly

**Think of it like:**

- 🏪 **Restaurant** = Your backend
- 📋 **Menu** = Your API endpoints
- 👨‍🍳 **Chef** = Your code
- 🍽️ **Food** = Data responses

## 🎯 Why Test APIs?

### **1. Catch Bugs Early**

```
❌ Without testing: User finds bug → angry customer
✅ With testing: You find bug → fix before release
```

### **2. Verify Permissions**

```
❌ Wrong: Anyone can delete users
✅ Right: Only Super Admin can delete users
```

### **3. Ensure Data Integrity**

```
❌ Wrong: Create user without email
✅ Right: Email is required
```

## 🛠️ HTTP Methods (Verbs)

| Method   | What It Does | Like Saying        |
| -------- | ------------ | ------------------ |
| `GET`    | Read data    | "Show me users"    |
| `POST`   | Create new   | "Add new user"     |
| `PUT`    | Update all   | "Replace user"     |
| `PATCH`  | Update part  | "Change user name" |
| `DELETE` | Remove       | "Delete user"      |

## 🔢 Status Codes (Responses)

### **Success (2xx)**

- `200` OK - Request worked
- `201` Created - New item made
- `204` No Content - Deleted successfully

### **Client Error (4xx)**

- `400` Bad Request - You sent wrong data
- `401` Unauthorized - You need to login
- `403` Forbidden - You don't have permission
- `404` Not Found - Item doesn't exist

### **Server Error (5xx)**

- `500` Internal Server Error - Our code broke

## 🔑 Authentication

### **Bearer Token**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**How it works:**

1. Login with email/password
2. Server gives you a token
3. Include token in future requests
4. Server knows who you are

## 📊 Request Structure

### **Headers** (Metadata)

```
Content-Type: application/json
Authorization: Bearer your-token-here
```

### **Body** (Data to send)

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "CUSTOMER"
}
```

### **URL Parameters**

```
/api/users/123  ← 123 is the user ID parameter
```

### **Query Parameters**

```
/api/users?page=1&limit=10  ← Filter results
```

## ✅ Good Testing Practices

### **1. Test Happy Path First**

```
✅ Login with correct credentials
✅ Create user with valid data
✅ Get existing user
```

### **2. Test Error Cases**

```
❌ Login with wrong password
❌ Create user without email
❌ Get non-existent user
```

### **3. Test Permissions**

```
🔒 Customer tries to delete other users (should fail)
👑 Super Admin deletes user (should work)
```

### **4. Use Real Data**

```
❌ Bad: email = "test"
✅ Good: email = "john.doe@company.com"
```

## 🔄 Testing Workflow

```
1. Start with login (get token)
2. Test basic operations (CRUD)
3. Test edge cases
4. Test security (unauthorized access)
5. Test with different user roles
```

## 💡 Testing Tools

- **Postman** - Visual interface for testing
- **curl** - Command line testing
- **Automated tests** - Code that tests your code

---

_Test early, test often, sleep better!_
