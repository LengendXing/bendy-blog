import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const rootSchemaPath = resolve("schema.prisma")
const prismaSchemaPath = resolve("prisma/schema.prisma")

test("prisma schema lives only under prisma/", () => {
  assert.equal(existsSync(prismaSchemaPath), true, "prisma/schema.prisma must exist")
  assert.equal(existsSync(rootSchemaPath), false, "root schema.prisma is a legacy duplicate and must not exist")
})

test("prisma schema keeps the column name constraint comment", () => {
  const schema = readFileSync(prismaSchemaPath, "utf8")
  assert.match(schema, /name\s+String\s+@unique \/\/ max 6 chars enforced in API/)
})
