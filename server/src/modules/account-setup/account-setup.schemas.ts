import { z } from 'zod'
import { passwordSchema } from '../auth/auth.password.js'

export const completeAccountSetupSchema = z
  .object({
    setupToken: z.string().min(32).max(256),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Password confirmation does not match.',
  })

export type CompleteAccountSetupInput = z.infer<
  typeof completeAccountSetupSchema
>
