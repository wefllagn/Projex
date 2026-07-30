import 'dotenv/config'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { createPrismaClient } from '../infrastructure/database/prisma.js'
import { createPasswordService } from '../modules/auth/auth.password.js'
import { normalizedEmailSchema } from '../modules/auth/auth.schemas.js'

const adminEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1),
  INITIAL_ADMIN_NAME: z.string().trim().min(1).max(200),
  INITIAL_ADMIN_EMAIL: normalizedEmailSchema,
  INITIAL_ADMIN_PASSWORD: z.string(),
})

async function main(): Promise<void> {
  const parsed = adminEnvironmentSchema.safeParse(process.env)
  if (!parsed.success) {
    const keys = [
      ...new Set(parsed.error.issues.map((issue) => String(issue.path[0]))),
    ]
    throw new Error(`Invalid initial-admin configuration: ${keys.join(', ')}`)
  }

  const passwordService = createPasswordService()
  passwordService.assertPolicy(parsed.data.INITIAL_ADMIN_PASSWORD)
  const passwordHash = await passwordService.hash(
    parsed.data.INITIAL_ADMIN_PASSWORD,
  )
  const prisma = createPrismaClient(parsed.data.DATABASE_URL)
  try {
    await prisma.user.create({
      data: {
        fullName: parsed.data.INITIAL_ADMIN_NAME,
        email: parsed.data.INITIAL_ADMIN_EMAIL,
        passwordHash,
        passwordChangedAt: new Date(),
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    })
    process.stdout.write('Initial administrator created successfully.\n')
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new Error('An account with that email already exists.')
    }
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Initial administrator creation failed.'}\n`,
  )
  process.exitCode = 1
})
