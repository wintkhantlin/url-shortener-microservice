import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { kratos } from '@/lib/kratos'

type KratosSettingsError = {
  response?: {
    status?: number
  }
}

function isUnauthorizedError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return false
  }
  const response = (error as KratosSettingsError).response
  return response?.status === 401
}

const settingsSearchSchema = z.object({
    flow: z.string().optional(),
    return_to: z.string().optional(),
})

export const Route = createFileRoute('/auth/settings')({
    validateSearch: (search) => settingsSearchSchema.parse(search),
    loaderDeps: ({ search: { flow, return_to } }) => ({ flow, return_to }),
    loader: async ({ deps: { flow, return_to } }) => {
        try {
            if (flow) {
                const { data } = await kratos.getSettingsFlow({ id: flow })
                return { flow: data }
            }
            const { data } = await kratos.createBrowserSettingsFlow({
                returnTo: return_to,
            })
            return { flow: data }
        } catch (err: unknown) {
            if (isUnauthorizedError(err)) {
                throw redirect({ to: '/auth/login' })
            }
            const { data } = await kratos.createBrowserSettingsFlow({
                returnTo: return_to,
            })
            return { flow: data }
        }
    },
})
