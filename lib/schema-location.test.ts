import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

test("the duplicated root schema file stays removed", () => {
  assert.equal(existsSync(join(process.cwd(), "schema.prisma")), false)
})

test("the Prisma CLI schema keeps the column name constraint note", () => {
  const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8")
  assert.match(schema, /max 6 chars enforced in API/)
})
