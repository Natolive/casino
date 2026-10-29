import { z } from 'zod'

// Comptes joueurs : un email (identifiant de connexion), un prénom, un nom et un mot de passe. Le premier compte créé est admin.
export const ROLES = ['player', 'admin'] as const
export type Role = (typeof ROLES)[number]

const name = (label: string) => z.string().trim().min(1, `${label} requis.`).max(50, `${label} : 50 caractères maximum.`)

export const loginSchema = z.object({
  // Minuscules : une seule adresse, quelle que soit la casse tapée.
  email: z.string().trim().toLowerCase().pipe(z.email('Adresse email invalide.').max(254, 'Adresse email trop longue.')),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum.').max(200, 'Mot de passe trop long.'),
})
export type LoginDto = z.infer<typeof loginSchema>

export const registerSchema = loginSchema.extend({ firstName: name('Prénom'), lastName: name('Nom') })
export type RegisterDto = z.infer<typeof registerSchema>

export type UserDto = { id: string; email: string; firstName: string; lastName: string; role: Role }

// Page admin : la liste des joueurs, et ce que l'admin peut changer sur l'un d'eux.
export type AdminUserDto = UserDto & { balance: number; createdAt: string }
export const updateUserSchema = z
  .object({ role: z.enum(ROLES), balance: z.number().int().min(0).max(1_000_000_000) })
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, 'Rien à changer.')
export type UpdateUserDto = z.infer<typeof updateUserSchema>
