import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndRole, AuthUser } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * Temporary diagnostic endpoint for invoice pricing investigation.
 * GET /api/v1/debug/invoice-pricing?numbers=INV-xxx,INV-yyy
 */
export const GET = withAuthAndRole(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  async (request: NextRequest, _auth: AuthUser) => {
    try {
      const raw =
        request.nextUrl.searchParams.get('numbers') ||
        'INV-1790755236845,INV-1790755174582,INV-1790053998771,INV-1789620914393';
      const numbers = raw.split(',').map((s) => s.trim()).filter(Boolean);

      const invoices = await prisma.invoice.findMany({
        where: { invoiceNumber: { in: numbers } },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          subtotal: true,
          vatAmount: true,
          grandTotal: true,
          lineItems: true,
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
                      dailyRate: true,
                      quantity: true,
                      machine: {
                        select: {
                          serialNumber: true,
                          unitPrice: true,
                          monthlyRentalFee: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { issueDate: 'desc' },
      });

      const payload = invoices.map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        subtotal: Number(inv.subtotal),
        vatAmount: Number(inv.vatAmount),
        grandTotal: Number(inv.grandTotal),
        lineItems: inv.lineItems,
        rentals: inv.invoiceRentals.map((ir) => ({
          agreementNumber: ir.rental.agreementNumber,
          startDate: ir.rental.startDate,
          expectedEndDate: ir.rental.expectedEndDate,
          requestedMachineLines: ir.rental.requestedMachineLines,
          machines: ir.rental.machines.map((m) => ({
            id: m.id,
            dailyRate: Number(m.dailyRate),
            monthlyImplied: Number(m.dailyRate) * 30,
            quantity: m.quantity,
            serialNumber: m.machine?.serialNumber,
            catalogUnitPrice: m.machine?.unitPrice != null ? Number(m.machine.unitPrice) : null,
            catalogMonthlyFee:
              m.machine?.monthlyRentalFee != null ? Number(m.machine.monthlyRentalFee) : null,
          })),
        })),
      }));

      return successResponse(payload, 'Invoice pricing diagnostic');
    } catch (error: any) {
      console.error('invoice-pricing debug failed', error);
      return errorResponse(error?.message || 'Diagnostic failed', 500);
    }
  }
);
