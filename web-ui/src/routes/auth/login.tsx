import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { kratos } from '@/lib/kratos'

type KratosSessionError = {
  response?: {
    status?: number
    data?: {
      error?: {
        id?: string
      }
    }
  }
}

function isSessionAlreadyAvailableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return false
  }
  const response = (error as KratosSessionError).response
  return (
    response?.status === 400 &&
    response.data?.error?.id === 'session_already_available'
  )
}

const loginSearchSchema = z.object({
    flow: z.string().optional(),
    return_to: z.string().optional(),
})

export const Route = createFileRoute('/auth/login')({
    validateSearch: (search) => loginSearchSchema.parse(search),
    loaderDeps: ({ search: { flow, return_to } }) => ({ flow, return_to }),
    loader: async ({ deps: { flow, return_to } }) => {
        try {
            if (flow) {
                const { data } = await kratos.getLoginFlow({ id: flow })
                return { flow: data }
            }
            const { data } = await kratos.createBrowserLoginFlow({
                returnTo: return_to,
            })
            return { flow: data }
        } catch (err: unknown) {
            if (isSessionAlreadyAvailableError(err)) {
                throw redirect({ to: '/' })
            }
            const { data } = await kratos.createBrowserLoginFlow({
                returnTo: return_to,
            })
            return { flow: data }
        }
    },
})
