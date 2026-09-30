import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndRole, AuthUser } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';
import { round2, sumMonthFactors } from '@/lib/invoice-month-billing';

const BAD_DRAFT_INVOICES = ['INV-1790755236845', 'INV-1790755174582'];
const VAT_RATE = 0.18;

async function runRepair() {
  const drafts = await prisma.invoice.findMany({
    where: {
      invoiceNumber: { in: BAD_DRAFT_INVOICES },
      status: 'DRAFT',
    },
    include: {
      customer: { select: { id: true, type: true } },
      invoiceRentals: {
        include: {
          rental: {
            select: {
              id: true,
              agreementNumber: true,
              startDate: true,
              expectedEndDate: true,
              requestedMachineLines: true,
              machines: {
                select: {
                  id: true,
                  quantity: true,
                  dailyRate: true,
                  machine: {
                    select: {
                      serialNumber: true,
                      unitPrice: true,
                      monthlyRentalFee: true,
                      brand: { select: { name: true } },
                      model: { select: { name: true } },
                      type: { select: { name: true } },
                    },
                  },
                },
              },
              tools: {
                select: {
                  quantity: true,
                  unitPrice: true,
                  tool: { select: { toolName: true, toolType: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const rateFixes: Array<{
    rentalMachineId: string;
    serialNumber: string | null;
    agreementNumber: string;
    oldDaily: number;
    newDaily: number;
    catalogMonthly: number;
  }> = [];

  const rentalIdsPatched = new Set<string>();

  for (const inv of drafts) {
    for (const ir of inv.invoiceRentals) {
      const r = ir.rental;
      for (const rm of r.machines) {
        const catalogMonthly =
          rm.machine?.monthlyRentalFee != null ? Number(rm.machine.monthlyRentalFee) : NaN;
        if (!Number.isFinite(catalogMonthly) || catalogMonthly <= 0) continue;

        const oldDaily = Number(rm.dailyRate) || 0;
        const impliedMonthly = oldDaily * 30;
        if (impliedMonthly >= catalogMonthly * 0.5) continue;

        const newDaily = round2(catalogMonthly / 30);
        if (Math.abs(newDaily - oldDaily) < 0.0001) continue;

        await prisma.rentalMachine.update({
          where: { id: rm.id },
          data: { dailyRate: new Decimal(newDaily) },
        });

        // keep in-memory copy current for invoice rebuild below
        (rm as any).dailyRate = newDaily;

        rateFixes.push({
          rentalMachineId: rm.id,
          serialNumber: rm.machine?.serialNumber ?? null,
          agreementNumber: r.agreementNumber,
          oldDaily,
          newDaily,
          catalogMonthly,
        });
        rentalIdsPatched.add(r.id);
      }

      // Patch requestedMachineLines for this rental when rates were fixed
      if (rentalIdsPatched.has(r.id)) {
        const lines = Array.isArray(r.requestedMachineLines)
          ? (r.requestedMachineLines as any[])
          : [];
        if (lines.length > 0) {
          const rateByKey = new Map<string, number>();
          for (const rm of r.machines) {
            const brand = String(rm.machine?.brand?.name ?? '').trim().toUpperCase();
            const model = String(rm.machine?.model?.name ?? '').trim().toUpperCase();
            const type = String(rm.machine?.type?.name ?? '').trim().toUpperCase();
            rateByKey.set(`${brand}||${model}||${type}`, Number(rm.dailyRate) || 0);
          }
          let updated = 0;
          const nextLines = lines.map((line) => {
            const key = `${String(line.brand ?? '').trim().toUpperCase()}||${String(line.model ?? '')
              .trim()
              .toUpperCase()}||${String(line.type ?? '').trim().toUpperCase()}`;
            const nextDaily = rateByKey.get(key);
            if (nextDaily == null || !Number.isFinite(nextDaily)) return line;
            const prev = Number(line.dailyRate) || 0;
            if (Math.abs(prev - nextDaily) < 0.0001) return line;
            updated += 1;
            return { ...line, dailyRate: nextDaily };
          });
          if (updated > 0) {
            await prisma.rental.update({
              where: { id: r.id },
              data: { requestedMachineLines: nextLines as any },
            });
          }
        }
      }
    }
  }

  const invoiceRepairs: Array<{
    invoiceNumber: string;
    oldTotal: number;
    newTotal: number;
    lineItemCount: number;
  }> = [];

  for (const inv of drafts) {
    const shouldApplyVat = inv.customer?.type !== 'INDIVIDUAL';
    const categoryMap = new Map<
      string,
      {
        agreementNumber: string;
        brand: string;
        model: string;
        type: string;
        count: number;
        billedUnitPrice: number;
        serials: string[];
      }
    >();

    let toolIndex = 0;
    const toolLines: any[] = [];

    for (const ir of inv.invoiceRentals) {
      const r = ir.rental;
      const monthFactor = sumMonthFactors(r.startDate, r.expectedEndDate, {
        mode: 'FULL_FEE_ALL_MONTHS',
      });
      const factor = monthFactor > 0 ? monthFactor : 1;
      const agreementNo = r.agreementNumber ?? '';

      for (const rm of r.machines) {
        const brand = rm.machine?.brand?.name ?? 'Unknown';
        const model = rm.machine?.model?.name ?? 'Unknown';
        const mtype = rm.machine?.type?.name ?? '';
        const qty = typeof rm.quantity === 'number' ? rm.quantity : Number(rm.quantity) || 1;
        const daily = Number(rm.dailyRate) || 0;
        const monthlyPerMachine = daily * 30;
        const billedUnitPrice = round2(monthlyPerMachine * factor);
        const key = `${agreementNo}|${brand}|${model}|${mtype}|${billedUnitPrice}`;
        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            agreementNumber: agreementNo,
            brand,
            model,
            type: mtype,
            count: 0,
            billedUnitPrice,
            serials: [],
          });
        }
        const cat = categoryMap.get(key)!;
        cat.count += qty;
        if (rm.machine?.serialNumber) cat.serials.push(rm.machine.serialNumber);
      }

      for (const rt of r.tools || []) {
        const qty = typeof rt.quantity === 'number' ? rt.quantity : Number(rt.quantity) || 0;
        const monthlyUnit = Number(rt.unitPrice) || 0;
        if (qty <= 0 || monthlyUnit < 0) continue;
        const toolName = (rt.tool?.toolName ?? 'Tool').trim() || 'Tool';
        const toolType = (rt.tool?.toolType ?? '').trim();
        const baseDesc = [toolName, toolType].filter(Boolean).join(' - ').toUpperCase();
        const desc = agreementNo ? `${baseDesc} (AGREEMENT ${agreementNo})` : baseDesc;
        toolLines.push({
          description: desc,
          quantity: qty,
          unitPrice: round2(monthlyUnit * factor),
          machineId: null,
          brand: '',
          model: '',
          type: '',
          brandId: null,
          modelId: null,
          machineTypeId: null,
          itemCode: `212TL${String(++toolIndex).padStart(5, '0')}`,
          vatRate: shouldApplyVat ? VAT_RATE : 0,
          kind: 'TOOL',
        });
      }
    }

    let itemIndex = 0;
    const machineLines = Array.from(categoryMap.values()).map((cat) => {
      const baseDesc =
        [cat.brand, cat.model, cat.type].filter(Boolean).join(' ').toUpperCase() || 'MACHINE';
      const desc = cat.agreementNumber
        ? `${baseDesc} (AGREEMENT ${cat.agreementNumber})`
        : baseDesc;
      return {
        description: desc,
        quantity: cat.count,
        unitPrice: round2(cat.billedUnitPrice),
        machineId: null,
        brand: cat.brand,
        model: cat.model,
        type: cat.type,
        brandId: null,
        modelId: null,
        machineTypeId: null,
        itemCode: `212WG${String(++itemIndex).padStart(5, '0')}`,
        serialNumber: cat.serials.length > 0 ? cat.serials.join(', ') : undefined,
        vatRate: shouldApplyVat ? VAT_RATE : 0,
      };
    });

    const finalLineItems = [...machineLines, ...toolLines];
    const subtotal = round2(
      finalLineItems.reduce(
        (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0),
        0
      )
    );
    const vatAmount = shouldApplyVat ? round2(subtotal * VAT_RATE) : 0;
    const grandTotal = round2(subtotal + vatAmount);
    const oldTotal = Number(inv.grandTotal) || 0;

    await prisma.invoice.update({
      where: { id: inv.id },
      data: {
        lineItems: finalLineItems as any,
        subtotal: new Decimal(subtotal),
        vatAmount: new Decimal(vatAmount),
        grandTotal: new Decimal(grandTotal),
        balance: new Decimal(grandTotal),
        taxCategory: shouldApplyVat ? 'VAT' : 'NON_VAT',
      },
    });

    invoiceRepairs.push({
      invoiceNumber: inv.invoiceNumber,
      oldTotal,
      newTotal: grandTotal,
      lineItemCount: finalLineItems.length,
    });
  }

  return {
    rateFixesCount: rateFixes.length,
    rateFixes,
    invoiceRepairs,
  };
}

/**
 * One-shot repair for understated rental_machines.dailyRate and today's bad draft invoices.
 * POST /api/v1/debug/repair-invoice-pricing?token=<NEXT_PUBLIC_SUPABASE_SECRET_KEY>
 */
export const POST = async (request: NextRequest) => {
  const token = request.nextUrl.searchParams.get('token');
  const secret =
    process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  const tokenOk = Boolean(token && secret && token === secret);

  const execute = async () => {
    const result = await runRepair();
    return successResponse(result, 'Invoice pricing repair completed');
  };

  if (!tokenOk) {
    return withAuthAndRole(
      ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      async (_req: NextRequest, _auth: AuthUser) => {
        try {
          return await execute();
        } catch (error: any) {
          console.error('repair-invoice-pricing failed', error);
          return errorResponse(error?.message || 'Repair failed', 500);
        }
      }
    )(request);
  }

  try {
    return await execute();
  } catch (error: any) {
    console.error('repair-invoice-pricing failed', error);
    return errorResponse(error?.message || 'Repair failed', 500);
  }
};
