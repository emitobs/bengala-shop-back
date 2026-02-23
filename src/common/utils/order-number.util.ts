export function generateOrderNumber(sequentialNumber: number): string {
  const year = new Date().getFullYear();
  const paddedNumber = String(sequentialNumber).padStart(4, '0');
  return `BM-${year}${paddedNumber}`;
}
