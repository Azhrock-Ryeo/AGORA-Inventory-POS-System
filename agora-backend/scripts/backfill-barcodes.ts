import prisma from '../src/utils/prisma'

const process = (globalThis as any).process

async function main() {
  const productsWithoutBarcode = await prisma.product.findMany({
    where: { barcode: null },
  })

  console.log(`Found ${productsWithoutBarcode.length} product(s) without a barcode.`)

  for (const product of productsWithoutBarcode) {
    const generatedBarcode = `AGORA-${product.sku}-${Date.now()}`
    await prisma.product.update({
      where: { id: product.id },
      data: { barcode: generatedBarcode },
    })
    console.log(`✔ ${product.name} (${product.sku}) → ${generatedBarcode}`)
  }

  console.log('Backfill complete.')
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())