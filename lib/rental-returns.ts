import type { PrismaClient } from '@prisma/client';

/**
 * Get the set of machine IDs that have been returned for a single rental.
 * Used to derive "active" machines (RentalMachine rows not in this set).
 * No DB schema change: we use Return + ReturnMachine as source of truth.
 */
export async function getReturnedMachineIdsForRental(
  prisma: PrismaClient,
  rentalId: string
): Promise<Set<string>> {
  const map = await getReturnedMachineIdsForRentals(prisma, [rentalId]);
  return map.get(rentalId) ?? new Set();
}

/**
 * Batch: get returned machine IDs per rental. Keys are rental IDs.
 */
export async function getReturnedMachineIdsForRentals(
  prisma: PrismaClient,
  rentalIds: string[]
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  for (const id of rentalIds) result.set(id, new Set());

  if (rentalIds.length === 0) return result;

  const rows = await prisma.returnMachine.findMany({
    where: { return: { rentalId: { in: rentalIds } } },
    select: {
      machineId: true,
      return: { select: { rentalId: true } },
    },
  });

  for (const r of rows) {
    const rentalId = r.return.rentalId;
    const set = result.get(rentalId);
    if (set) set.add(r.machineId);
  }
  return result;
}
