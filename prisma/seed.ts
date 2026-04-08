import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  await prisma.column.upsert({
    where: { name: "随笔" },
    update: {},
    create: { name: "随笔" },
  })
  console.log("Default column '随笔' created.")
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1) })
