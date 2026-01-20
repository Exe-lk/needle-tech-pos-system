# MongoDB Database Import Instructions

## Prerequisites
- MongoDB installed and running
- MongoDB shell or mongoimport tool available

## Database Structure
This database contains 13 collections for the Needle Technologies POS System:
1. roles
2. users
3. settings
4. customers
5. machines
6. rentals
7. invoices
8. payments
9. gatePasses
10. returns
11. damageReports
12. outstandingAlerts
13. auditLogs

## Import Commands

### Using mongoimport (Recommended)

```bash
# Create database (if not exists)
mongosh needle_pos --eval "db.createCollection('roles')"

# Import each collection
mongoimport --db needle_pos --collection roles --file roles.json --jsonArray
mongoimport --db needle_pos --collection users --file users.json --jsonArray
mongoimport --db needle_pos --collection settings --file settings.json --jsonArray
mongoimport --db needle_pos --collection customers --file customers.json --jsonArray
mongoimport --db needle_pos --collection machines --file machines.json --jsonArray
mongoimport --db needle_pos --collection rentals --file rentals.json --jsonArray
mongoimport --db needle_pos --collection invoices --file invoices.json --jsonArray
mongoimport --db needle_pos --collection payments --file payments.json --jsonArray
mongoimport --db needle_pos --collection gatePasses --file gatePasses.json --jsonArray
mongoimport --db needle_pos --collection returns --file returns.json --jsonArray
mongoimport --db needle_pos --collection damageReports --file damageReports.json --jsonArray
mongoimport --db needle_pos --collection outstandingAlerts --file outstandingAlerts.json --jsonArray
mongoimport --db needle_pos --collection auditLogs --file auditLogs.json --jsonArray
```

### Using mongosh (MongoDB Shell)

```javascript
// Connect to MongoDB
use needle_pos

// Import each collection
db.roles.insertMany([])
db.users.insertMany([])
db.settings.insertMany([])
db.customers.insertMany([])
db.machines.insertMany([])
db.rentals.insertMany([])
db.invoices.insertMany([])
db.payments.insertMany([])
db.gatePasses.insertMany([])
db.returns.insertMany([])
db.damageReports.insertMany([])
db.outstandingAlerts.insertMany([])
db.auditLogs.insertMany([])
```

## Create Indexes

After importing, create the indexes as defined in schema.json:

```javascript
use needle_pos

// Roles indexes
db.roles.createIndex({ name: 1 }, { unique: true })

// Users indexes
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ email: 1 })
db.users.createIndex({ roleId: 1 })

// Customers indexes
db.customers.createIndex({ code: 1 }, { unique: true })
db.customers.createIndex({ type: 1 })
db.customers.createIndex({ status: 1 })
db.customers.createIndex({ "financials.isCreditLocked": 1 })

// Machines indexes
db.machines.createIndex({ serialNumber: 1 }, { unique: true })
db.machines.createIndex({ "qrCode.value": 1 }, { unique: true })
db.machines.createIndex({ brand: 1 })
db.machines.createIndex({ status: 1 })
db.machines.createIndex({ boxNumber: 1 })

// Rentals indexes
db.rentals.createIndex({ agreementNumber: 1 }, { unique: true })
db.rentals.createIndex({ customerId: 1 })
db.rentals.createIndex({ status: 1 })
db.rentals.createIndex({ startDate: 1 })
db.rentals.createIndex({ "machines.machineId": 1 })

// Invoices indexes
db.invoices.createIndex({ invoiceNumber: 1 }, { unique: true })
db.invoices.createIndex({ customerId: 1 })
db.invoices.createIndex({ rentalId: 1 })
db.invoices.createIndex({ status: 1 })
db.invoices.createIndex({ dueDate: 1 })
db.invoices.createIndex({ paymentStatus: 1 })

// Payments indexes
db.payments.createIndex({ receiptNumber: 1 }, { unique: true })
db.payments.createIndex({ customerId: 1 })
db.payments.createIndex({ paidAt: 1 })
db.payments.createIndex({ "invoices.invoiceId": 1 })

// GatePasses indexes
db.gatePasses.createIndex({ gatePassNumber: 1 }, { unique: true })
db.gatePasses.createIndex({ rentalId: 1 })
db.gatePasses.createIndex({ customerId: 1 })
db.gatePasses.createIndex({ status: 1 })
db.gatePasses.createIndex({ departureTime: 1 })

// Returns indexes
db.returns.createIndex({ returnNumber: 1 }, { unique: true })
db.returns.createIndex({ rentalId: 1 })
db.returns.createIndex({ machineId: 1 })
db.returns.createIndex({ returnDate: 1 })
db.returns.createIndex({ triageCategory: 1 })

// DamageReports indexes
db.damageReports.createIndex({ machineId: 1 })
db.damageReports.createIndex({ rentalId: 1 })
db.damageReports.createIndex({ returnId: 1 })
db.damageReports.createIndex({ resolved: 1 })
db.damageReports.createIndex({ severity: 1 })

// OutstandingAlerts indexes
db.outstandingAlerts.createIndex({ customerId: 1 })
db.outstandingAlerts.createIndex({ generatedAt: 1 })
db.outstandingAlerts.createIndex({ status: 1 })
db.outstandingAlerts.createIndex({ scheduleDay: 1 })

// AuditLogs indexes
db.auditLogs.createIndex({ timestamp: -1 })
db.auditLogs.createIndex({ userId: 1 })
db.auditLogs.createIndex({ entityType: 1 })
db.auditLogs.createIndex({ entityId: 1 })
db.auditLogs.createIndex({ action: 1 })
```

## Data Types Reference

- **ObjectId**: MongoDB ObjectId (24 character hex string)
- **String**: Text data
- **Number**: Numeric values (integers or decimals)
- **Boolean**: true/false
- **Date**: ISO 8601 date string or MongoDB Date object
- **Array**: JSON array
- **Object**: Nested JSON object
- **null**: Null value

## Notes

- All collections start empty (empty arrays)
- Indexes should be created after import for better performance
- Foreign key relationships are maintained through ObjectId references
- Timestamps should be stored as Date objects in MongoDB
- Unique indexes ensure data integrity for critical fields
