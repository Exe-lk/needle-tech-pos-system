# Return Process Flow Documentation

## Overview
This document explains the complete machine rental and return process flow, with emphasis on partial returns and invoice recalculation.

---

## Complete Process Flow

### 1. Purchase Order Creation
- **Page:** `/purchase-order`
- **API:** `POST /api/v1/purchase-orders`
- User creates a purchase order specifying:
  - Customer details
  - Required machines (brand, model, type, quantity)
  - Rental period (start date, end date)
  - Total amount

### 2. Rental Agreement Creation
- **Page:** `/rental-agreement`
- **API:** `POST /api/v1/rentals/from-purchase-request`
- User creates a hiring agreement from the purchase order:
  - Automatically pulls PO details
  - Sets rental period (cannot be changed from PO dates)
  - Agreement status starts as **PENDING** until machines are assigned
  - Calculates monthly rental fee based on total amount and duration

### 3. Machine Assignment
- **Page:** `/machine-assign-page`
- **API:** `PUT /api/v1/rentals/[id]`
- User assigns physical machines to the agreement via QR scanning:
  - Scans machine serial number and box number
  - System validates machine availability
  - Adds machines to rental_machines table
  - When all expected machines are assigned, agreement status changes to **ACTIVE**

### 4. Invoice Generation (Automatic)
- **Triggered:** After all machines are assigned
- **API:** Invoice creation in machine assignment flow
- **Logic:**
  - Generates **ONE invoice per month** for the entire rental period
  - Each invoice contains all assigned machines
  - Monthly fee is distributed across months (e.g., 3 months @ 15,000 = 45,000 total, 15,000/month)
  - VAT (18%) is applied to each monthly invoice
  - All invoices created with status **ISSUED**

**Example:**
```
Scenario: 5 machines for 3 months @ 3,000/machine/month
- Total monthly rental: 15,000 (5 × 3,000)
- Month 1 Invoice: 15,000 + VAT
- Month 2 Invoice: 15,000 + VAT
- Month 3 Invoice: 15,000 + VAT
```

### 5. Gate Pass Generation
- **Page:** `/gatepass`
- **API:** `POST /api/v1/gate-passes`
- User creates gate pass for machine dispatch:
  - Links to rental agreement
  - Lists all machines being dispatched
  - Records driver, vehicle details
  - Machine status changes to **RENTED**

### 6. Gate Pass Approval
- **Page:** `/gatepass-qr-page`
- Security officer approves gate pass via QR scan
- Gate pass status changes to **DEPARTED**
- Machines physically leave the warehouse

---

## Return Process (The Critical Part)

### 7A. Standard Return (All Machines Returned at End Date)
- **Page:** `/return-qr-page`
- **API:** `POST /api/v1/returns`
- Customer returns all machines at rental period end
- All invoices remain as originally generated
- Rental status changes to **COMPLETED**

### 7B. Partial Return (Some Machines Returned Early) ⭐
- **Page:** `/return-qr-page`
- **API:** `POST /api/v1/returns`

**Scenario Example:**
```
Original Setup:
- 5 machines rented for 3 months (Jan 1 - Mar 31)
- Monthly rental: 15,000 (3,000/machine)
- Original invoices:
  * Month 1 (Jan): 15,000 for 5 machines
  * Month 2 (Feb): 15,000 for 5 machines
  * Month 3 (Mar): 15,000 for 5 machines

Partial Return:
- Customer returns 2 machines on Jan 31 (end of month 1)
- 3 machines remain until Mar 31
```

**What Happens Behind the Scenes:**

#### Step 1: Return Record Creation
```typescript
// Return record created
Return {
  returnNumber: "RET-260001",
  rentalId: "[rental-uuid]",
  returnDate: "2026-01-31",
  triageCategory: "STANDARD",
  machines: [
    { machineId: "machine-1", returnType: "Standard" },
    { machineId: "machine-2", returnType: "Standard" }
  ]
}
```

#### Step 2: Machine Status Update
```sql
-- Returned machines set to AVAILABLE
UPDATE machines 
SET status = 'AVAILABLE', 
    currentLocationType = 'WAREHOUSE',
    currentLocationName = 'Main Warehouse'
WHERE id IN ('machine-1', 'machine-2');
```

#### Step 3: Rental Machines Update
```sql
-- Mark machines as returned (preserve history, don't delete)
UPDATE rental_machines
SET lastBilledToDate = '2026-01-31'
WHERE rentalId = '[rental-uuid]' 
  AND machineId IN ('machine-1', 'machine-2');
```

#### Step 4: Inventory Update (Bincard)
```sql
-- Two RETURN_IN entries created (one per machine)
INSERT INTO bincard_entries (
  transactionType: 'RETURN_IN',
  quantityIn: 1,
  balance: previous_balance + 1,
  notes: 'Return RET-260001 – machine [serial] returned from agreement RA260001'
)
```

#### Step 5: Invoice Recalculation (Post-Processing)

**Cancel Existing Future Invoices:**
```sql
UPDATE invoices
SET status = 'CANCELLED'
WHERE rentalId = '[rental-uuid]'
  AND status IN ('DRAFT', 'ISSUED')
  AND issueDate >= '2026-01-01'; -- Cancel all from rental start
```

**Regenerate All Invoices with Correct Machine Counts:**

```typescript
// Invoice calculation logic
returnMonth = 0 (January = month 0 of rental)

Month 0 (Jan 1-31): 
  - isBeforeReturn = false
  - isReturnMonth = true
  - Use ALL 5 machines (original count)
  - Invoice: 15,000 + VAT

Month 1 (Feb 1-28):
  - isAfterReturn = true
  - Use REMAINING 3 machines only
  - Invoice: 9,000 (3 × 3,000) + VAT

Month 2 (Mar 1-31):
  - isAfterReturn = true
  - Use REMAINING 3 machines only
  - Invoice: 9,000 (3 × 3,000) + VAT
```

**New Invoice Summary:**
```
✅ Month 1 (Jan): 15,000 + VAT (5 machines)
✅ Month 2 (Feb): 9,000 + VAT (3 machines)
✅ Month 3 (Mar): 9,000 + VAT (3 machines)
Total: 33,000 + VAT (instead of 45,000 + VAT)
```

#### Step 6: Rental Agreement Update
```sql
UPDATE rentals
SET subtotal = 33000,      -- Reduced from 45000
    vatAmount = 5940,      -- 33000 × 0.18
    total = 38940,         -- Reduced from 53100
    balance = 38940 - paidAmount
WHERE id = '[rental-uuid]';
```

### 8. Return View & Tracking
- **Page:** `/returns`
- **API:** `GET /api/v1/returns`
- Users can view all returns with:
  - Return date
  - Machines returned
  - Condition (Standard, Damage, Missing, Exchange)
  - Associated damage reports (if any)
  - Updated agreement status

---

## Key Features of Updated Return Process

### ✅ Historical Invoice Accuracy
- **Past months:** Invoiced with original machine count
- **Future months:** Invoiced with remaining machine count only
- **Result:** Customer pays correctly for machines they actually had each month

### ✅ Rental Agreement Integrity
- Rental machines are **marked as returned** (not deleted)
- Preserves complete rental history
- Agreement shows both original and current machine count
- Totals automatically recalculated for remaining period

### ✅ Inventory Accuracy
- Returned machines immediately set to **AVAILABLE**
- Bincard entries track exact return movement
- Stock balance updated in real-time
- Location set back to warehouse

### ✅ Invoice Management
- Old future invoices **cancelled** (not deleted)
- New invoices **regenerated** with accurate machine counts
- Each month has correct pricing
- Audit trail maintained

### ✅ Monthly Invoice Printing
- **Action Button:** "Print Monthly Invoices" on invoice page
- User can select specific months to print
- Each month shows only machines active during that period
- Checkbox option: "Use full monthly fee" (no proration for partial months)

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/purchase-orders` | POST | Create purchase order |
| `/api/v1/rentals/from-purchase-request` | POST | Create rental from PO |
| `/api/v1/rentals/[id]` | PUT | Assign machines to rental |
| `/api/v1/gate-passes` | POST | Create gate pass |
| `/api/v1/returns` | POST | Create return (partial or full) |
| `/api/v1/returns` | GET | List all returns |
| `/api/v1/invoices` | GET | List invoices (with monthly filtering) |

---

## Database Schema Changes

### ✅ No Migration Required
All changes work with existing schema:

1. **rental_machines.lastBilledToDate** - Already exists, now used to track return date
2. **machines.status** - Already has AVAILABLE status
3. **bincard_entries** - Already supports RETURN_IN transaction type
4. **invoices** - Already has CANCELLED status

---

## Benefits of This Approach

1. **Accurate Billing:** Customers only pay for machines they actually had
2. **Full Audit Trail:** Complete history of machine movements preserved
3. **No Data Loss:** Nothing is deleted, only status updated
4. **Flexible Returns:** Supports partial returns at any time
5. **Automated Recalculation:** No manual invoice adjustments needed
6. **Inventory Accuracy:** Real-time stock updates
7. **Report Friendly:** Easy to generate reports on machine utilization

---

## Testing Scenarios

### Scenario 1: Full Return at End Date
- ✅ All machines returned together
- ✅ All invoices remain unchanged
- ✅ Rental marked COMPLETED

### Scenario 2: Partial Return Mid-Period
- ✅ Some machines returned early
- ✅ Past invoices show full machine count
- ✅ Future invoices show reduced machine count
- ✅ Rental totals recalculated

### Scenario 3: Multiple Partial Returns
- ✅ Return 2 machines in month 1
- ✅ Return 1 more machine in month 2
- ✅ Each return triggers invoice regeneration
- ✅ Each month's invoice reflects machines active that month

### Scenario 4: Damage Returns
- ✅ Damaged machines flagged separately
- ✅ Damage reports auto-created
- ✅ Photos and notes captured
- ✅ Repair costs estimated

---

## Frontend Display Updates

### Rental Agreement Page
```typescript
// Shows both original and current machine count
expectedMachines: 5    // Original count
addedMachines: 3       // Current count (after return)
```

### Returns Page
```typescript
// Displays return details
returnNumber: "RET-260001"
returnDate: "2026-01-31"
machinesReturned: 2
remainingMachines: 3
```

### Invoice Page
```typescript
// Monthly invoices show correct machine counts per month
Month 1: 5 machines × 3,000 = 15,000
Month 2: 3 machines × 3,000 = 9,000
Month 3: 3 machines × 3,000 = 9,000
```

---

## Conclusion

The updated return process ensures:
- **Accuracy:** Billing matches actual machine usage
- **Transparency:** Complete audit trail maintained
- **Flexibility:** Handle any return scenario
- **Automation:** Minimal manual intervention
- **Compliance:** Proper inventory and financial tracking

No database migration required. All existing features preserved. Return processing enhanced for real-world business scenarios.
