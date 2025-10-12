# Request Categories Reference

## Overview

This document lists all available maintenance request categories in the Basma system. These categories are seeded in Arabic and ready to use.

## Available Categories

| ID  | Name (Arabic) | Description (Arabic)                                   | English Translation                                                                |
| --- | ------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 1   | سباكة         | تسريبات المياه، انسدادات، إصلاح الصنابير والمراحيض     | Plumbing - Water leaks, clogs, faucet and toilet repairs                           |
| 2   | كهرباء        | مشاكل الكهرباء، الإضاءة، المفاتيح والمقابس             | Electrical - Power issues, lighting, switches and outlets                          |
| 3   | تكييف وتدفئة  | صيانة وإصلاح أنظمة التكييف والتدفئة والتهوية           | HVAC - Maintenance and repair of air conditioning, heating and ventilation systems |
| 4   | أعمال إنشائية | إصلاح الجدران، الأرضيات، الأسقف، الدهانات              | Construction - Wall, floor, ceiling, and painting repairs                          |
| 5   | نجارة         | إصلاح الأبواب، النوافذ، الخزائن، الأثاث الخشبي         | Carpentry - Door, window, cabinet, and wooden furniture repairs                    |
| 6   | أمن وسلامة    | الأقفال، أنظمة الإنذار، كاميرات المراقبة، أنظمة الدخول | Security - Locks, alarms, surveillance cameras, access systems                     |
| 7   | نظافة         | التنظيف العام، التنظيف العميق، إزالة القمامة           | Cleaning - General cleaning, deep cleaning, garbage removal                        |
| 8   | مصاعد         | صيانة وإصلاح المصاعد وأنظمة الحركة                     | Elevators - Elevator and movement system maintenance and repair                    |
| 9   | حدائق         | صيانة الحدائق، قص العشب، تشذيب الأشجار                 | Gardens - Garden maintenance, lawn mowing, tree trimming                           |
| 10  | تسربات        | كشف وإصلاح تسربات المياه والرطوبة                      | Leaks - Detection and repair of water leaks and moisture                           |
| 11  | زجاج ونوافذ   | إصلاح واستبدال الزجاج والنوافذ                         | Glass & Windows - Glass and window repair and replacement                          |
| 12  | طوارئ         | حالات الطوارئ التي تتطلب اهتماماً فورياً               | Emergency - Emergency situations requiring immediate attention                     |
| 13  | أخرى          | طلبات صيانة أخرى غير مصنفة                             | Other - Other unclassified maintenance requests                                    |

## API Usage

### Get All Categories

```http
GET /api/request-categories
```

### Get Category by ID

```http
GET /api/request-categories/:id
```

### Create Request with Category

```json
POST /api/requests
{
  "title": "إصلاح تسريب في المطبخ",
  "description": "يوجد تسريب مياه تحت الحوض في المطبخ",
  "categoryId": 1,  // سباكة (Plumbing)
  "priority": "HIGH",
  "location": "المطبخ",
  "building": "مبنى A",
  "specificLocation": "الطابق الثالث، شقة 301"
}
```

## Frontend Implementation

### Category Dropdown Example (React)

```typescript
interface Category {
  id: number;
  name: string;
  description: string;
}

// Use in your form
<select name="categoryId" required>
  <option value="">اختر الفئة</option>
  <option value="1">سباكة</option>
  <option value="2">كهرباء</option>
  <option value="3">تكييف وتدفئة</option>
  <option value="4">أعمال إنشائية</option>
  <option value="5">نجارة</option>
  <option value="6">أمن وسلامة</option>
  <option value="7">نظافة</option>
  <option value="8">مصاعد</option>
  <option value="9">حدائق</option>
  <option value="10">تسربات</option>
  <option value="11">زجاج ونوافذ</option>
  <option value="12">طوارئ</option>
  <option value="13">أخرى</option>
</select>
```

### TypeScript Interface

```typescript
export interface RequestCategory {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## Category Icons (Suggested)

For better UX, consider using these icons:

| Category      | Suggested Icon              |
| ------------- | --------------------------- |
| سباكة         | 🔧 wrench / 💧 droplet      |
| كهرباء        | ⚡ zap / 💡 lightbulb       |
| تكييف وتدفئة  | ❄️ snowflake / 🔥 fire      |
| أعمال إنشائية | 🏗️ construction / 🔨 hammer |
| نجارة         | 🪚 carpentry / 🪵 wood      |
| أمن وسلامة    | 🔒 lock / 🛡️ shield         |
| نظافة         | 🧹 broom / 🧼 soap          |
| مصاعد         | 🛗 elevator                 |
| حدائق         | 🌳 tree / 🌱 plant          |
| تسربات        | 💦 water / 🚰 tap           |
| زجاج ونوافذ   | 🪟 window                   |
| طوارئ         | 🚨 emergency / ⚠️ warning   |
| أخرى          | 📋 clipboard / ⚙️ gear      |

## Re-seeding Categories

If you need to re-seed categories:

```bash
npm run seed:categories
```

The script will ask for confirmation before deleting existing categories.

## Notes

- All categories are set to `isActive: true` by default
- Category IDs are auto-incremented
- Categories are in Arabic to match the target user base
- The "طوارئ" (Emergency) category should be prioritized in the UI
- "أخرى" (Other) is a catch-all for requests that don't fit other categories

## Database Schema

```prisma
model request_category {
  id          Int                   @id @default(autoincrement())
  name        String                @db.VarChar(50)
  description String?               @db.VarChar(255)
  isActive    Boolean               @default(true)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
  requests    maintenance_request[]
}
```

## Common Use Cases

### Emergency Requests

Use `categoryId: 12` for urgent issues that need immediate attention.

### Water-Related Issues

- Use `categoryId: 1` (سباكة) for plumbing issues
- Use `categoryId: 10` (تسربات) specifically for leak detection

### Building Maintenance

- Use `categoryId: 4` (أعمال إنشائية) for structural work
- Use `categoryId: 5` (نجارة) for carpentry work

### System Maintenance

- Use `categoryId: 8` (مصاعد) for elevator issues
- Use `categoryId: 6` (أمن وسلامة) for security systems

## Frontend Filtering

Categories can be used for:

- Request creation forms (dropdown)
- Request filtering (show only plumbing requests)
- Dashboard statistics (requests by category)
- Report generation (category-based reports)

## Best Practices

1. **Always validate categoryId** - Ensure the category exists before creating a request
2. **Cache categories** - Categories rarely change, cache them on the frontend
3. **Use icons** - Visual indicators improve UX
4. **Show descriptions** - Help users choose the right category
5. **Highlight emergency** - Make emergency category stand out
6. **Allow search** - If list is long, add search functionality
7. **Sort logically** - Emergency first, then alphabetically

---

**Last Updated**: October 12, 2025  
**Total Categories**: 13  
**Language**: Arabic (العربية)
