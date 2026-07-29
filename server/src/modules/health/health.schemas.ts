import { z } from 'zod'

export const healthDataSchema = z.object({
  status: z.literal('ok'),
  database: z.literal('connected'),
  timestamp: z.iso.datetime(),
})

export type HealthData = z.infer<typeof healthDataSchema>
