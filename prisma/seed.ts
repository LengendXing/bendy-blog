import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  await prisma.column.upsert({
    where: { name: "reflections" },
    update: {},
    create: { name: "reflections" },
  })
  console.log("Default column 'reflections' created.")
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); process.exit(1) })
