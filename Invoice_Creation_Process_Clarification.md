# Clarification of Invoice Creation Process

Full documentation of the workbook *Clarification of Invoice Creation Process.xlsx*.
The workbook has 5 sheets: two customer master/bulk-invoice sheets, two sample invoice layouts, and an "Important Points" sheet.

| # | Sheet | Purpose |
|---|-------|---------|
| 1 | Needle Tech Company TAX INV | Machine register + August/September bulk invoice data for Dial Textile Industries (Pvt) Ltd |
| 2 | Sample - Tax Invoice | Printed layout of the Tax Invoice (August and September samples) |
| 3 | Needle Technologies NON TAX | Machine register + August/September bulk invoice data for Ebony Holdings (Pvt) Ltd |
| 4 | Sample - Non Tax Invoice Format | Printed layout of the Non-Tax Invoice (August and September samples) |
| 5 | Important Points | Business entities, invoicing rules, rental formula, editability requirement |

> Notes: Excel date serials in the file have been converted to dd/mm/yyyy. Amounts are in LKR. Values like `9166.6666…` are shown rounded to 2 decimals. A "Source observations" section at the end lists inconsistencies noticed in the workbook.

---

## 1. Important Points (Sheet 5)

### 1.1 Business Entities and Invoice Types

There are two separate business entities. The system must support separate invoice creation for each:

- **Needle Technologies**: Non-Tax Invoice
- **Needle Technologies Company (Pvt) Ltd**: Tax Invoice

### 1.2 Invoicing Requirements

| Description | Needle Technologies | Needle Technologies Company (Pvt) Ltd |
|---|---|---|
| Business entity | Partnership business | Private limited company |
| Invoice type | Non Tax Invoice | Tax Invoice |
| Invoice number format | `057368` | `26SEP_NTCR_01801` |
| Invoicing method | Agreement-wise single invoices and bulk invoices | Agreement-wise single invoices and bulk invoices |
| Invoicing period | Monthly | Monthly |
| Invoicing date | Last day of each month | Last day of each month |
| Editability | All invoice fields must be editable | All invoice fields must be editable |

### 1.3 Rental Charge Formula (image in sheet)

```
Rental Charge = (Monthly Rent / 30) × Rental Days
```

| Term | Meaning |
|---|---|
| Rental Charge | Total amount to be charged |
| Monthly Rent | Agreed monthly rent per machine |
| 30 | Standard calculation period (30 days per month) |
| Rental Days | Number of days the machine is rented in the month |

### 1.4 Invoice Editability

All invoice details and fields should be editable, including machine details, rental rates, rental periods, quantities, and other relevant information.

### 1.5 Open request

The sheet also asks for clarification of the invoice creation process for both **single invoices** and **bulk invoices**.

---

## 2. Tax Invoice: Needle Technologies Company (Pvt) Ltd

**Customer:** DIAL TEXTILE INDUSTRIES (PVT) LTD, IPZ, SPUR ROAD 2, KATUNAYAKE

### 2.1 Machine Details (Sheet 1)

Legend for invoice columns: `√` = invoiced, `-` = not invoiced. "Rented" in Return Date = still on rent.

| Agreement | Agreement Date | Model | Machine Type | Serial No | Box No | Monthly Rental | Return Date | August Invoice | September Invoice |
|---|---|---|---|---|---|---|---|---|---|
| 10619 | 13/08/2025 | Unicare | Puller Set | 24941 | 24948 | 9,000 | Rented | √ | √ |
| (10619) | | Unicare | Puller Set | 24955 | 24962 | 9,000 | 17/08/2026 | √ | - |
| (10619) | | Unicare | Puller Set | 24958 | 24967 | 9,000 | 12/12/2025 | - | - |
| 10739 | 06/12/2025 | Juki MEB-3200J | Electronic Eye Button Hole Machine | 81024 | NSOEA12949G | 55,000 | 05/08/2026 | √ | - |
| 11113 | 28/07/2026 | Juki MEB-3200J | Electronic Eye Button Hole Machine | 2M5FB00259 | AMBFB01029 | 55,000 | Rented | √ | √ |
| (11113) | | Juki LK1900BN | Electronic Bar Tack Machine | 2LIMF01357 | TMBMF01241 | 17,000 | Rented | √ | √ |
| (11113) | | Juki LK1900BN | Electronic Bar Tack Machine | 2LIMH00814 | TMBNH01587 | 17,000 | Rented | √ | √ |
| 11131 | 10/08/2026 | Juki MEB-3200J | Electronic Eye Button Hole Machine | 2M5FB00243 | AMBYF01092 | 55,000 | 23/09/2026 | √ | √ |
| 11149 | 24/08/2026 | Juki DLN5410N-7 | Electronic Needle Feed Machine | DLNDA52565 | 25671 | 10,000 | Rented | √ | √ |
| (11149) | | Juki DLN5410N-7 | Electronic Needle Feed Machine | DLNFF60895 | GSOZE05866 | 10,000 | Rented | √ | √ |
| (11149) | | Juki DLN5410N-7 | Electronic Needle Feed Machine | DLNAJ39008 | GSOZJ07627 | 10,000 | 27/08/2026 | √ | - |
| (11149) | | Juki LH-3568A-7 | Electronic Double Needle Machine | 41024 | 25341 | 20,000 | 27/08/2026 | √ | - |
| (11149) | | Juki LH-3568A-7 | Electronic Double Needle Machine | 8L3HE11958 | NSOFD01027M | 20,000 | Rented | √ | √ |
| 11160 | 04/09/2026 | Juki DDL8700B-7 | Electronic Single Needle Machine | 4DOGK17199 | CSOGK03080 | 5,500 | Rented | - | √ |
| (11160) | | Juki DDL8700B-7 | Electronic Single Needle Machine | 4DOGM20111 | CSOGM04706 | 5,500 | Rented | - | √ |
| (11160) | | Juki DDL8700B-7 | Electronic Single Needle Machine | 4DOGM20094 | CSOKC00466 | 5,500 | Rented | - | √ |
| 11181 | 15/09/2026 | Juki MEB-3200J | Electronic Eye Button Hole Machine | 2M5FB00260 | 26120 | 55,000 | 20/09/2026 | - | √ |
| 11204 | 25/09/2026 | Kansai Special | Needle Feed Waist Band Machine with Servo Box | KS0528460 | 3K1489 | 35,000 | Rented | - | √ |

Rows in parentheses have a blank agreement cell in the source; they belong to the agreement above them (one agreement can cover several machines).

### 2.2 August Bulk Invoice (Sheet 1)

- Title: *August Invoice of Dial Textile Industries (Pvt) Ltd (BULK INVOICE)*
- Document type: TAX INVOICE
- Invoice Date: 31/08/2026 (create date 31/08/2026)
- Invoice Number: `26AUG_NTCR_01463`
- Invoice Period: 01/08/2026 - 31/08/2026

| Description | Serial No | Box No | Monthly Rental (LKR) | Calculation |
|---|---|---|---:|---|
| Unicare Puller Set | 24941 | 24948 | 9,000.00 | Full month |
| Unicare Puller Set (1/8/2026 - 17/8/2026) | 24955 | 24962 | 5,100.00 | = 9000/30*17 |
| Juki MEB-3200J Electronic Eye Button Hole Machine (1/8/2026 - 5/8/2026) | 81024 | NSOEA12949G | 9,166.67 | = 55000/30*5 |
| Juki MEB-3200J Electronic Eye Button Hole Machine | 2M5FB00259 | AMBFB01029 | 55,000.00 | Full month |
| Juki LK1900BN Electronic Bar Tack Machine | 2LIMF01357 | TMBMF01241 | 17,000.00 | Full month |
| Juki LK1900BN Electronic Bar Tack Machine | 2LIMH00814 | TMBNH01587 | 17,000.00 | Full month |
| Juki MEB-3200J Electronic Eye Button Hole Machine (10/8/2026 - 31/8/2026) | 2M5FB00243 | AMBYF01092 | 38,500.00 | = 55000/30*21 |
| Juki DLN5410N-7 Electronic Needle Feed Machine (24/8/2026 - 31/8/2026) | DLNDA52565 | 25671 | 2,333.33 | = 10000/30*7 |
| Juki DLN5410N-7 Electronic Needle Feed Machine (24/8/2026 - 31/8/2026) | DLNFF60895 | GSOZE05866 | 2,333.33 | = 10000/30*7 |
| Juki DLN5410N-7 Electronic Needle Feed Machine (24/8/2026 - 27/8/2026) | DLNAJ39008 | GSOZJ07627 | 1,000.00 | = 10000/30*3 |
| Juki LH-3568A-7 Electronic Double Needle Machine (24/8/2026 - 27/8/2026) | 41024 | 25341 | 2,000.00 | = 20000/30*3 |
| Juki LH-3568A-7 Electronic Double Needle Machine (24/8/2026 - 31/8/2026) | 8L3HE11958 | NSOFD01027M | 4,666.67 | = 20000/30*7 |

| Totals | LKR |
|---|---:|
| Total Value of Supply | 163,100.00 |
| VAT Amount (18.0%) | 29,358.00 |
| Total Amount Including VAT | 192,458.00 |

### 2.3 September Bulk Invoice (Sheet 1)

- Title: *September Invoice of Dial Textile Industries (Pvt) Ltd (BULK INVOICE)*
- Document type: TAX INVOICE
- Invoice Date: 30/09/2026 (create date 30/09/2026)
- Invoice Number: `26SEP_NTCR_01587`
- Invoice Period: 01/09/2026 - 30/09/2026

| Description | Serial No | Box No | Monthly Rental (LKR) | Calculation |
|---|---|---|---:|---|
| Unicare Puller Set | 24941 | 24948 | 9,000.00 | Full month |
| Juki MEB-3200J Electronic Eye Button Hole Machine | 2M5FB00259 | AMBFB01029 | 55,000.00 | Full month |
| Juki LK1900BN Electronic Bar Tack Machine | 2LIMF01357 | TMBMF01241 | 17,000.00 | Full month |
| Juki LK1900BN Electronic Bar Tack Machine | 2LIMH00814 | TMBNH01587 | 17,000.00 | Full month |
| Juki MEB-3200J Electronic Eye Button Hole Machine (1/9/2026 - 23/9/2026) | 2M5FB00243 | AMBYF01092 | 40,333.33 | = 55000/30*22 |
| Juki DLN5410N-7 Electronic Needle Feed Machine | DLNDA52565 | 25671 | 10,000.00 | Full month |
| Juki DLN5410N-7 Electronic Needle Feed Machine | DLNFF60895 | GSOZE05866 | 10,000.00 | Full month |
| Juki LH-3568A-7 Electronic Double Needle Machine | 8L3HE11958 | NSOFD01027M | 20,000.00 | Full month |
| Juki DDL8700B-7 Electronic Single Needle Machine (4/9/2026 - 30/9/2026) | 4DOGK17199 | CSOGK03080 | 4,766.67 | = 5500/30*26 |
| Juki DDL8700B-7 Electronic Single Needle Machine (4/9/2026 - 30/9/2026) | 4DOGM20111 | CSOGM04706 | 4,766.67 | = 5500/30*26 |
| Juki DDL8700B-7 Electronic Single Needle Machine (4/9/2026 - 30/9/2026) | 4DOGM20094 | CSOKC00466 | 4,766.67 | = 5500/30*26 |
| Juki MEB-3200J Electronic Eye Button Hole Machine (15/9/2026 - 20/9/2026) | 2M5FB00260 | 26120 | 9,166.67 | = 55000/30*5 |
| Kansai Special Needle Feed Waist Band Machine with Servo Box (25/9/2026 - 30/9/2026) | KS0528460 | 3K1489 | 5,833.33 | = 35000/30*5 |

| Totals | LKR |
|---|---:|
| Total Value of Supply | 207,633.33 |
| VAT Amount (18.0%) | 37,374.00 |
| Total Amount Including VAT | 245,007.33 |

### 2.4 Sample Tax Invoice Layout (Sheet 2)

The sheet contains a company logo (Needle Technologies Co (Pvt) Ltd, needle graphic) and sample pages titled "AUGUST SAMPLE INVOICE", "SEPTEMBER SAMPLE INVOICE" (page 1) and a continuation "PAGE 01" / "PAGE 02" for September.

**Header fields (TAX INVOICE)**

| Field | Value |
|---|---|
| Date of Invoice | Last day of month (08/31/2026 Aug; 09/30/2026 Sep, shown in mm/dd/yyyy) |
| Tax Invoice No | `26AUG_NTCR_01463` / `26SEP_NTCR_01587` |
| Supplier's TIN | 114719676-7000 |
| Purchaser's TIN | Blank in August sample; 104058108-7000 in September sample |
| Supplier's Name | Needle Technologies Company (Pvt) Ltd |
| Supplier's Address | No. 137/M, Colombo Road, Biyagama |
| Supplier's Telephone | 0112488735 / 0763480393-6 |
| Supplier's Email | needletec@sltnet.lk |
| Purchaser's Name | Dial Textile Industries (Pvt) Ltd |
| Purchaser's Address | Blank in August sample; "Spur Road 2, Phase1, IPZ, Katunayake" in September sample |
| Purchaser's Telephone / Email | Blank |
| Period From / To | 01/08/2026 To 31/08/2026; 01/09/2026 To 30/09/2026 |
| Place of Supply | Blank in August sample; "Katunayake" in September sample |
| Purchase Order No | Blank field |

**Line-item table columns:** No | Serial No | Description of Goods or Services | Monthly Rate | Qty | Rent Amount for rental period Excluding VAT (LKR)

- Description is formatted as `Model - Machine Type` followed by the date range in brackets when the period is partial, e.g. `Unicare - Puller Set (1/8/2026 - 17/8/2026)`.
- Qty is 1 on every line.
- Box No is **not** shown on the printed invoice (only on the bulk sheet).

**August sample lines** (No | Serial | Description | Monthly Rate | Qty | Amount)

| No | Serial No | Description | Rate | Qty | Amount |
|---:|---|---|---:|---:|---:|
| 1 | 24941 | Unicare - Puller Set | 9,000 | 1 | 9,000.00 |
| 2 | 24955 | Unicare - Puller Set (1/8/2026 - 17/8/2026) | 9,000 | 1 | 5,100.00 |
| 3 | 81024 | Juki MEB-3200J - Electronic Eye Button Hole Machine (1/8/2026 - 5/8/2026) | 55,000 | 1 | 9,166.67 |
| 4 | 2M5FB00259 | Juki MEB-3200J - Electronic Eye Button Hole Machine | 55,000 | 1 | 55,000.00 |
| 5 | 2LIMF01357 | Juki LK1900BN - Electronic Bar Tack Machine | 17,000 | 1 | 17,000.00 |
| 6 | 2LIMH00814 | Juki LK1900BN - Electronic Bar Tack Machine | 17,000 | 1 | 17,000.00 |
| 7 | 2M5FB00243 | Juki MEB-3200J - Electronic Eye Button Hole Machine (10/8/2026 - 31/8/2026) | 55,000 | 1 | 38,500.00 |
| 8 | DLNDA52565 | Juki DLN5410N-7 - Electronic Needle Feed Machine (24/8/2026 - 31/8/2026) | 10,000 | 1 | 2,333.33 |
| 9 | DLNFF60895 | Juki DLN5410N-7 - Electronic Needle Feed Machine (24/8/2026 - 31/8/2026) | 10,000 | 1 | 2,333.33 |
| 10 | DLNAJ39008 | Juki DLN5410N-7 - Electronic Needle Feed Machine (24/8/2026 - 27/8/2026) | 10,000 | 1 | 1,000.00 |
| 11 | 41024 | Juki LH-3568A-7 - Electronic Double Needle Machine (24/8/2026 - 27/8/2026) | 20,000 | 1 | 2,000.00 |
| 12 | 8L3HE11958 | Juki LH-3568A-7 - Electronic Double Needle Machine (24/8/2026 - 31/8/2026) | 20,000 | 1 | 4,666.67 |

Totals: Total Value of Supply 163,100 | VAT Amount (18.0%) 29,358 | Total Amount including VAT 192,458
Total Amount in Words: *One Hundred Ninety two Thousand Four Hundred Fifty Eight Only*

**September sample, page 1** (lines 1 to 12; totals on this page show 0 / 0 / 0 and the words field is empty)

| No | Serial No | Description | Rate | Qty | Amount |
|---:|---|---|---:|---:|---:|
| 1 | 24941 | Unicare - Puller Set | 9,000 | 1 | 9,000.00 |
| 2 | 2M5FB00259 | Juki MEB-3200J - Electronic Eye Button Hole Machine | 55,000 | 1 | 55,000.00 |
| 3 | 2LIMF01357 | Juki LK1900BN - Electronic Bar Tack Machine | 17,000 | 1 | 17,000.00 |
| 4 | 2LIMH00814 | Juki LK1900BN - Electronic Bar Tack Machine | 17,000 | 1 | 17,000.00 |
| 5 | 2M5FB00243 | Juki MEB-3200J - Electronic Eye Button Hole Machine (1/9/2026 - 23/9/2026) | 55,000 | 1 | 40,333.33 |
| 6 | DLNDA52565 | Juki DLN5410N-7 - Electronic Needle Feed Machine | 10,000 | 1 | 10,000.00 |
| 7 | DLNFF60895 | Juki DLN5410N-7 - Electronic Needle Feed Machine | 10,000 | 1 | 10,000.00 |
| 8 | 8L3HE11958 | Juki LH-3568A-7 - Electronic Double Needle Machine | 20,000 | 1 | 20,000.00 |
| 9 | 4DOGK17199 | Juki DDL8700B-7 - Electronic Single Needle Machine (4/9/2026 - 30/9/2026) | 5,500 | 1 | 4,766.67 |
| 10 | 4DOGM20111 | Juki DDL8700B-7 - Electronic Single Needle Machine (4/9/2026 - 30/9/2026) | 5,500 | 1 | 4,766.67 |
| 11 | 4DOGM20094 | Juki DDL8700B-7 - Electronic Single Needle Machine (4/9/2026 - 30/9/2026) | 5,500 | 1 | 4,766.67 |
| 12 | 2M5FB00260 | Juki MEB-3200J - Electronic Eye Button Hole Machine (15/9/2026 - 20/9/2026) | 55,000 | 1 | 9,166.67 |

**September sample, page 2 ("PAGE 02")** repeats the header, then:

| No | Serial No | Description | Rate | Qty | Amount |
|---:|---|---|---:|---:|---:|
| 13 | KS0528460 | Kansai Special - Needle Feed Waist Band Machine with Servo Box (25/9/2026 - 30/9/2026) | 35,000 | 1 | 5,833.33 |

Totals: Total Value of Supply 207,633.33 | VAT Amount (18.0%) 37,374.00 | Total Amount including VAT 245,007.33
Total Amount in Words (as written in the file): *Two Hundred Forty Five Thousand Seven and Cents Thirty Three Only*

This shows the **multi-page behaviour**: the header repeats on every page, line numbering continues, and the grand totals appear on the last page.

**Footer (every page)**

- All Cheques to be drawn in favour of "Needle Technologies Company (Pvt) Ltd"
- Bank Details: A/C 1420027865, Commercial Bank, Kaduwela.
- Kindly mention your invoice number for the reference.
- Authorized By: ………… | Received By: …………

---

## 3. Non-Tax Invoice: Needle Technologies

**Customer:** EBONY HOLDINGS (PVT) LTD

### 3.1 Machine Details (Sheet 3)

Legend: `√` = invoiced, `0` = not invoiced. "Rented" = still on rent.

| Agreement | Agreement Date | Model | Machine Type | Serial No | Box No | Monthly Rental | Return Date | August Invoice | September Invoice |
|---|---|---|---|---|---|---|---|---|---|
| 10604 | 08/09/2025 | Juki LK-1900B-SS | Electronic Bar Tack Machine | 2LIHK00181 | TMBKC01365 | 17,000 | Rented | √ | √ |
| 11011 | 27/05/2026 | Pegasus WT200 | Electronic Small Cylinder Bed Hem Cutter Machine | 6865279 | 20210101 | 27,500 | 22/08/2026 | √ | 0 |
| 11039 | 15/06/2026 | Pegasus WT200 | Electronic Small Cylinder Bed Hem Cutter Machine | 6873070 | 31122020 | 27,500 | 22/08/2026 | √ | 0 |
| 11062 | 26/06/2026 | Juki DLM5400N-7 | Electronic Single Needle Side Cutter Machine | 2D2EJ00157 | NSODL12061 | 12,500 | Rented | √ | √ |
| 11096 | 17/07/2026 | Juki DLM5400N-7 | Electronic Single Needle Side Cutter Machine | DLMBH36976 | GSOBG03220 | 12,500 | Rented | √ | √ |
| 11103 | 22/07/2026 | Juki MEB3200J | Electronic Eye Button Hole Machine | 2M5FB00260 | 26120 | 55,000 | 22/08/2026 | √ | 0 |
| 11145 | 18/08/2026 | Juki MEB3200J | Electronic Eye Button Hole Machine | 2M5FB00258 | AMBYF01024 | 55,000 | Rented | √ | √ |
| (11145) | | Kansai Special DFB-1412 | Waist Band Machine with Servo Box | KS232765A | 25558 | 12,500 | Rented | √ | √ |
| 11164 | 08/09/2026 | Juki DLM5400N-7 | Electronic Single Needle Side Cutter Machine | 211019 | GSOBA07580 | 12,500 | Rented | 0 | √ |
| 11193 | 21/09/2026 | Juki DLM5400N-7 | Electronic Single Needle Side Cutter Machine | 2D2WK00047 | GSOAB03196 | 12,500 | Rented | 0 | √ |
| (11193) | | Juki DLM5400N-7 | Electronic Single Needle Side Cutter Machine | DLMDE44616 | 25502 | 12,500 | Rented | 0 | √ |

Note: the agreement number 11145 is inferred from the rows above for the Kansai machine (blank in source).

### 3.2 August Bulk Invoice (Sheet 3)

- Title: *August Invoice of Ebony Holdings (Pvt) Ltd (BULK INVOICE)*
- Document type: Invoice (Non Tax Invoice)
- Invoice Date: 31/08/2026 (create date 31/08/2026)
- Invoice Number: `057313`
- Invoice Period: 01/08/2026 - 31/08/2026

| Description | Serial No | Box No | Monthly Rental (LKR) | Calculation |
|---|---|---|---:|---|
| Juki LK-1900B-SS Electronic Bar Tack Machine | 2LIHK00181 | TMBKC01365 | 17,000.00 | Full month |
| Pegasus WT200 Electronic Small Cylinder Bed Hem Cutter Machine (1/8/2026 - 22/8/2026) | 6865279 | 20210101 | 20,166.67 | = 27500/30*22 |
| Pegasus WT200 Electronic Small Cylinder Bed Hem Cutter Machine (1/8/2026 - 22/8/2026) | 6873070 | 31122020 | 20,166.67 | = 27500/30*22 |
| Juki DLM5400N-7 Electronic Single Needle Side Cutter Machine | 2D2EJ00157 | NSODL12061 | 12,500.00 | Full month |
| Juki DLM5400N-7 Electronic Single Needle Side Cutter Machine | DLMBH36976 | GSOBG03220 | 12,500.00 | Full month |
| Juki MEB3200J Electronic Eye Button Hole Machine (1/8/2026 - 22/8/2026) | 2M5FB00260 | 26120 | 40,333.33 | = 55000/30*22 |
| Juki MEB3200J Electronic Eye Button Hole Machine (18/8/2026 - 31/8/2026) | 2M5FB00258 | AMBYF01024 | 23,833.33 | = 55000/30*13 |
| Kansai Special DFB-1412 Waist Band Machine with Servo Box (18/8/2026 - 31/8/2026) | KS232765A | 25558 | 5,416.67 | = 12000/30*13 (see observations) |

| Totals | LKR |
|---|---:|
| Total Amount (no VAT) | 151,916.67 |

### 3.3 September Bulk Invoice (Sheet 3)

- Title: *September Invoice of Ebony Holdings (Pvt) Ltd (BULK INVOICE)*
- Document type: Invoice (Non Tax Invoice)
- Invoice Date: 30/09/2026 (create date 30/09/2026)
- Invoice Number: `057360`
- Invoice Period: 01/09/2026 - 30/09/2026

| Description | Serial No | Box No | Monthly Rental (LKR) | Calculation |
|---|---|---|---:|---|
| Juki LK-1900B-SS Electronic Bar Tack Machine | 2LIHK00181 | TMBKC01365 | 17,000.00 | Full month |
| Juki DLM5400N-7 Electronic Single Needle Side Cutter Machine | 2D2EJ00157 | NSODL12061 | 12,500.00 | Full month |
| Juki DLM5400N-7 Electronic Single Needle Side Cutter Machine | DLMBH36976 | GSOBG03220 | 12,500.00 | Full month |
| Juki MEB3200J Electronic Eye Button Hole Machine | 2M5FB00258 | AMBYF01024 | 55,000.00 | Full month |
| Kansai Special DFB-1412 Waist Band Machine with Servo Box | KS232765A | 25558 | 12,500.00 | Full month |
| Juki DLM5400N-7 Electronic Single Needle Side Cutter Machine (8/9/2026 - 30/9/2026) | 211019 | GSOBA07580 | 9,166.67 | = 12500/30*22 |
| Juki DLM5400N-7 Electronic Single Needle Side Cutter Machine (21/9/2026 - 30/9/2026) | 2D2WK00047 | GSOAB03196 | 3,750.00 | = 12500/30*9 |
| Juki DLM5400N-7 Electronic Single Needle Side Cutter Machine (21/9/2026 - 30/9/2026) | DLMDE44616 | 25502 | 3,750.00 | = 12500/30*9 |

| Totals | LKR |
|---|---:|
| Total Amount (no VAT) | 126,166.67 |

### 3.4 Sample Non-Tax Invoice Layout (Sheet 4)

The sheet contains a company logo and sample pages titled "AUGUST SAMPLE INVOICE" and "SEPTEMBER SAMPLE INVOICE".

**Header fields (INVOICE)**

| Field | Value |
|---|---|
| Date of Invoice | 08/31/2026 (Aug); 09/30/2026 (Sep), shown in mm/dd/yyyy |
| Invoice No | `057313` (Aug); `057360` (Sep) |
| Supplier's Name | Needle Technologies |
| Supplier's Address | No. 137/M, Colombo Road, Biyagama |
| Supplier's Telephone | 0112488735 / 0763480393-6 |
| Supplier's Email | needletec@sltnet.lk |
| Purchaser's Name | Ebony Holdings (Pvt) Ltd |
| Purchaser's Address | 113, Allen Avenue, Dehiwala-Mount Lavinia |
| Purchaser's Telephone / Email | Blank |
| Period From / To | 01/08/2026 To 31/08/2026; 01/09/2026 To 30/09/2026 |
| Place of Supply | Wariyapola |

There are **no TIN fields, no Purchase Order field, no VAT lines, and no amount in words** on the non-tax layout.

**Line-item table columns:** No | Serial No | Description of Goods or Services | Monthly Rate | Qty | Rent Amount for rental (LKR)

**August sample lines**

| No | Serial No | Description | Rate | Qty | Amount |
|---:|---|---|---:|---:|---:|
| 1 | 2LIHK00181 | Juki LK-1900B-SS - Electronic Bar Tack Machine | 17,000 | 1 | 17,000.00 |
| 2 | 6865279 | Pegasus WT200 - Electronic Small Cylinder Bed Hem Cutter Machine (1/8/2026 - 22/8/2026) | 27,500 | 1 | 20,166.67 |
| 3 | 6873070 | Pegasus WT200 - Electronic Small Cylinder Bed Hem Cutter Machine (1/8/2026 - 22/8/2026) | 27,500 | 1 | 20,166.67 |
| 4 | 2D2EJ00157 | Juki DLM5400N-7 - Electronic Single Needle Side Cutter Machine | 12,500 | 1 | 12,500.00 |
| 5 | DLMBH36976 | Juki DLM5400N-7 - Electronic Single Needle Side Cutter Mac *(text truncated in source)* | 12,500 | 1 | 12,500.00 |
| 6 | 2M5FB00260 | Juki MEB3200J - Electronic Eye Button Hole Machine (1/8/2026 - 22/8/2026) | 55,000 | 1 | 40,333.33 |
| 7 | 2M5FB00258 | Juki MEB3200J - Electronic Eye Button Hole Machine (18/8/2026 - 31/8/2026) | 55,000 | 1 | 23,833.33 |
| 8 | KS232765A | Kansai Special DFB-1412 - Waist Band Machine with Servo Box (18/8/2026 - 31/8/2026) | 12,500 | 1 | 5,416.67 |

Total Amount: **151,916.67**

**September sample lines**

| No | Serial No | Description | Rate | Qty | Amount |
|---:|---|---|---:|---:|---:|
| 1 | 2LIHK00181 | Juki LK-1900B-SS - Electronic Bar Tack Machine | 17,000 | 1 | 17,000.00 |
| 2 | 2D2EJ00157 | Juki DLM5400N-7 - Electronic Single Needle Side Cutter Machine | 12,500 | 1 | 12,500.00 |
| 3 | DLMBH36976 | Juki DLM5400N-7 - Electronic Single Needle Side Cutter Machine | 12,500 | 1 | 12,500.00 |
| 4 | 2M5FB00258 | Juki MEB3200J - Electronic Eye Button Hole Machine | 55,000 | 1 | 55,000.00 |
| 5 | KS232765A | Kansai Special DFB-1412 - Waist Band Machine with Servo Box | 12,500 | 1 | 12,500.00 |
| 6 | 211019 | Juki DLM5400N-7 - Electronic Single Needle Side Cutter Machine (8/9/2026 - 30/9/2026) | 12,500 | 1 | 9,166.67 |
| 7 | 2D2WK00047 | Juki DLM5400N-7 - Electronic Single Needle Side Cutter Machine (21/9/2026 - 30/9/2026) | 12,500 | 1 | 3,750.00 |
| 8 | DLMDE44616 | Juki DLM5400N-7 - Electronic Single Needle Side Cutter Machine (21/9/2026 - 30/9/2026) | 12,500 | 1 | 3,750.00 |

Total Amount: **126,166.67**

**Footer**

- All Cheques to be drawn in favour of "Needle Technologies"
- Bank Details: A/C 1420020365, Commercial Bank, Kaduwela.
- Kindly mention your invoice number for the reference.
- Authorized By: ………… | Received By: …………

---

## 4. Side-by-Side Comparison of the Two Invoice Types

| Item | Tax Invoice | Non-Tax Invoice |
|---|---|---|
| Entity | Needle Technologies Company (Pvt) Ltd | Needle Technologies |
| Entity type | Private limited company | Partnership |
| Sample customer | Dial Textile Industries (Pvt) Ltd | Ebony Holdings (Pvt) Ltd |
| Number format | `YYMMM_NTCR_NNNNN` (e.g. `26AUG_NTCR_01463`) | 6-digit number (e.g. `057313`) |
| Title on document | TAX INVOICE | INVOICE |
| Supplier TIN | 114719676-7000 | None |
| Purchaser TIN | Yes (e.g. 104058108-7000) | None |
| Purchase Order No field | Yes | No |
| VAT | 18.0% on Total Value of Supply | None |
| Totals shown | Total Value of Supply, VAT Amount, Total Including VAT | Total Amount |
| Amount in words | Yes | No |
| Amount column heading | Rent Amount for rental period Excluding VAT (LKR) | Rent Amount for rental (LKR) |
| Cheque payee | Needle Technologies Company (Pvt) Ltd | Needle Technologies |
| Bank account | A/C 1420027865, Commercial Bank, Kaduwela | A/C 1420020365, Commercial Bank, Kaduwela |
| Place of Supply (sample) | Katunayake | Wariyapola |
| Multi-page | Yes (header repeats, totals on last page) | Single page in samples |

### Common to both

- Monthly invoicing; invoice date is the last day of the month.
- Agreement-wise single invoices and bulk invoices.
- Rental charge = Monthly Rent / 30 × Rental Days.
- Full-month machines are charged the full monthly rent; partial-month machines show the date range in the description.
- Qty = 1 per line; one line per machine (by serial number).
- All fields editable.
- Same supplier address, phone, email and signature block (Authorized By / Received By).

---

## 5. Invoice Creation Process Derived from the Workbook

### 5.1 Single invoice (agreement-wise)
1. Pick the entity (tax or non-tax) and the agreement.
2. Include only the machines under that agreement that were on rent during the month.
3. For each machine, charge the full monthly rent, or the pro-rated amount using the formula if it started or was returned in the month. Add the date range to the description in the latter case.
4. Set the invoice date to the last day of the month and the period to the first and last day of the month.
5. Tax entity: add VAT 18% and amount in words. Non-tax entity: total only.
6. Allow editing of every field before finalizing.

### 5.2 Bulk invoice (customer-wise)
1. Pick the entity and the customer.
2. Collect all agreements and machines of the customer that are active in the month (the "√" columns in the machine register).
3. Build one invoice combining all machines, listed by serial number.
4. Apply the same pro-rating, VAT/total and editability rules as above.
5. Use a single invoice number for the whole bulk invoice.

### 5.3 Observed day-counting pattern (to confirm)

From the sample data, the rental days used appear to **exclude the agreement start date and include the return date**.

| Case | Dates | Days charged |
|---|---|---:|
| Unicare 24955 | 01/08 to return 17/08 | 17 |
| Juki 81024 | 01/08 to return 05/08 | 5 |
| Juki 2M5FB00243 (Aug) | start 10/08 to 31/08 | 21 |
| Juki DLN5410N-7 | start 24/08 to 31/08 | 7 |
| Juki DLNAJ39008 / LH 41024 | start 24/08, return 27/08 | 3 |
| Juki DDL8700B-7 | start 04/09 to 30/09 | 26 |
| Juki 2M5FB00260 (Sep) | start 15/09, return 20/09 | 5 |
| Kansai KS0528460 | start 25/09 to 30/09 | 5 |
| Pegasus WT200 / Juki 2M5FB00260 (Ebony) | 01/08, return 22/08 | 22 |
| Juki 2M5FB00258 / Kansai KS232765A | start 18/08 to 31/08 | 13 |
| Juki DLM5400N-7 (211019) | start 08/09 to 30/09 | 22 |
| Juki DLM5400N-7 (2D2WK00047, DLMDE44616) | start 21/09 to 30/09 | 9 |

---

## 6. Source Observations (items to confirm)

1. **Juki 2M5FB00243, September (Dial):** description says 1/9/2026 - 23/9/2026 (23 days) and the return date is 23/09/2026, but the calculation uses 22 days (`55000/30*22` = 40,333.33). Under the pattern in 5.3 it would be 23 days (42,166.67).
2. **Kansai KS232765A, August (Ebony):** the formula note reads `=12000/30*13`, but the monthly rent in the register and invoice is 12,500, and the amount shown (5,416.67) equals `12500/30*13`. The `12000` looks like a typo.
3. **Tax invoice, September sample, page 1:** totals display 0 / 0 / 0 and the amount in words is empty. The correct totals appear only on page 2 (207,633.33 / 37,374.00 / 245,007.33). Page 2 also has no Purchaser fields differing from page 1; the header repeats.
4. **Amount in words, September tax sample:** reads "Two Hundred Forty Five Thousand Seven and Cents Thirty Three Only", which is awkward wording. The August one reads "One Hundred Ninety two Thousand Four Hundred Fifty Eight Only".
5. **Tax invoice, August sample:** Purchaser's TIN, address and Place of Supply are blank, while the September sample has them filled.
6. **Date format:** sample invoices show dates as mm/dd/yyyy (08/31/2026), while the descriptions and bulk sheets use dd/mm/yyyy.
7. **Bank account numbers differ** between the two entities (1420027865 vs 1420020365), which is expected as they are separate entities but worth confirming.
8. **Non-tax August sample, line 5:** the description is truncated ("Side Cutter Mac").
9. **Invoice number examples:** the sample numbers are 26AUG_NTCR_01463 and 26SEP_NTCR_01587 (tax); 057313 and 057360 (non-tax). The Important Points sheet gives next-number examples 26SEP_NTCR_01801 and 057368, so the numbering sequence is not strictly one-per-month. The numbering rule should be confirmed.
10. **Return-date machines not invoiced:** Unicare 24958 (returned 12/12/2025) is in the register but invoiced in neither month, as expected.
11. **Not-invoiced marker:** the tax register uses `-` and the non-tax register uses `0` for months not invoiced.
12. **Tax sheet total for the August bulk invoice** matches the August sample (163,100 / 29,358 / 192,458), and the September bulk matches the September sample. Both non-tax bulk totals also match their samples.
