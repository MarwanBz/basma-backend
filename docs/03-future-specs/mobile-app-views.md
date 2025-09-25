# Mobile App Views for Customers and Technicians

## Overview
This document specifies the UI/UX design and functionality for the Basma Maintenance mobile app, focusing on customer and technician user experiences.

## Customer Views

### 1. Customer Login Screen
```
┌─────────────────┐
│   BASMA         │
│ Maintenance     │
├─────────────────┤
│ Email           │
│ [input field]   │
├─────────────────┤
│ Password        │
│ [input field]   │
├─────────────────┤
│ [Login Button]  │
│                 │
│ Forgot Password?│
└─────────────────┘
```

### 2. Customer Home Dashboard
```
┌─────────────────┐
│ Welcome, [Name] │ ← Profile icon (top right)
├─────────────────┤
│ Quick Actions   │
│ ┌─────────────┐ │
│ │Submit Request│ │
│ └─────────────┘ │
├─────────────────┤
│ My Requests     │
│ • Request #123 │
│   Pending       │
│ • Request #124 │
│   In Progress   │
│ • Request #125 │
│   Completed     │
│                 │
│ [View All] →    │
└─────────────────┘
```

### 3. Submit Maintenance Request
```
┌─────────────────┐
│ New Request     │ ← Back button
├─────────────────┤
│ Title           │
│ [input field]   │
├─────────────────┤
│ Description     │
│ [text area]     │
├─────────────────┤
│ Priority        │
│ □ Low           │
│ □ Medium        │
│ ■ High          │
├─────────────────┤
│ Location        │
│ [dropdown/select│
├─────────────────┤
│ Photo (Optional)│
│ [Camera button] │
├─────────────────┤
│ [Submit Button] │
└─────────────────┘
```

### 4. Request Details View
```
┌─────────────────┐
│ Request #123    │ ← Back button
├─────────────────┤
│ Status: Pending │ [colored badge]
│ Priority: High  │ [colored badge]
├─────────────────┤
│ Title           │
│ Fix leaking tap │
├─────────────────┤
│ Description     │
│ The kitchen tap │
│ is leaking...   │
├─────────────────┤
│ Location:       │
│ Kitchen         │
├─────────────────┤
│ Submitted:      │
│ Dec 15, 2024    │
├─────────────────┤
│ Assigned To:    │
│ Ahmed Technician│
├─────────────────┤
│ [Chat Support]  │
└─────────────────┘
```

## Technician Views

### 1. Technician Login Screen
Same as Customer Login but with Technician branding

### 2. Technician Dashboard
```
┌─────────────────┐
│ Welcome, Ahmed  │ ← Profile icon (top right)
├─────────────────┤
│ Today's Tasks   │
│ ┌─────────────┐ │
│ │3 Active Tasks│ │
│ └─────────────┘ │
├─────────────────┤
│ My Tasks        │
│ • Task #123     │
│   Kitchen Tap   │
│   High Priority │
│ • Task #124     │
│   AC Repair     │
│   Medium        │
│ • Task #125     │
│   Light Fix     │
│   Low Priority  │
│                 │
│ [View All] →    │
└─────────────────┘
```

### 3. Task Details View
```
┌─────────────────┐
│ Task #123       │ ← Back button
├─────────────────┤
│ Status: Pending │ [dropdown: Pending/In Progress/Completed]
│ Priority: High  │ [colored badge]
├─────────────────┤
│ Customer:       │
│ John Doe        │
│ john@email.com  │
├─────────────────┤
│ Title           │
│ Fix leaking tap │
├─────────────────┤
│ Description     │
│ The kitchen tap │
│ is leaking...   │
├─────────────────┤
│ Location:       │
│ Building A,     │
│ Floor 2, Apt 5  │
├─────────────────┤
│ Photo:          │
│ [image preview] │
├─────────────────┤
│ [Update Status] │
│ [Chat Customer] │
│ [Call Customer] │
└─────────────────┘
```

### 4. Update Task Status
```
┌─────────────────┐
│ Update Status   │ ← Back button
├─────────────────┤
│ Current: Pending│
├─────────────────┤
│ New Status      │
│ □ In Progress   │
│ □ Completed     │
│ □ On Hold       │
├─────────────────┤
│ Notes (Optional)│
│ [text area]     │
├─────────────────┤
│ Add Photos      │
│ [Camera button] │
├─────────────────┤
│ [Save Changes]  │
└─────────────────┘
```

## Navigation Flow

### Customer Flow
```
Login → Home Dashboard → (Submit Request OR View Requests)
                      ↓
              Request Details ← Chat Support
```

### Technician Flow
```
Login → Dashboard → Task List → Task Details → Update Status
                ↓                    ↓
         View All Tasks     Chat with Customer
```

## Design System

### Colors
- Primary: #2563EB (Blue)
- Success: #10B981 (Green)
- Warning: #F59E0B (Yellow)
- Error: #EF4444 (Red)
- Background: #F8FAFC (Light Gray)

### Typography
- Headlines: 24px Bold
- Body: 16px Regular
- Small: 14px Regular
- Caption: 12px Regular

### Components
- Buttons: Rounded, 44px height
- Inputs: Bordered, 44px height
- Cards: Shadow, 8px border radius
- Status badges: Pill shape, colored

## Technical Implementation Notes

### State Management
- Use Convex queries for real-time data
- Local state for form inputs and UI state
- Navigation state managed by Expo Router

### Performance
- Lazy load images and large lists
- Implement pull-to-refresh
- Cache frequently accessed data

### Accessibility
- Minimum 44px touch targets
- High contrast colors
- Screen reader support
- Keyboard navigation support

## Next Steps
1. Create wireframes in Figma
2. Implement basic screens with mock data
3. Integrate with Convex backend
4. Add camera functionality for photos
5. Implement real-time notifications
6. Add offline support for basic functionality
