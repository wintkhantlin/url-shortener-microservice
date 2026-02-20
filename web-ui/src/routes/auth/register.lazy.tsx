import { createLazyFileRoute } from '@tanstack/react-router'
import { revalidateLogic, useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import { type RegistrationFlow, type UpdateRegistrationFlowBody, type UiNodeInputAttributes, type UiNode } from '@ory/client'
import { kratos } from '@/lib/kratos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Link } from '@tanstack/react-router'
import { Route as RegisterRoute } from './register'

export const Route = createLazyFileRoute('/auth/register')({
  component: Register,
})

type RegistrationFlowError = {
  response?: {
    status?: number
    data?: RegistrationFlow
  }
}

function isRegistrationFlowError(error: unknown): error is RegistrationFlowError {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return false
  }
  const response = (error as RegistrationFlowError).response
  return typeof response?.status === 'number'
}

const registerSchema = z.object({
  name: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

function Register() {
  const data = RegisterRoute.useLoaderData() as { flow?: RegistrationFlow }
  const initialFlow = data?.flow
  const [flow, setFlow] = useState<RegistrationFlow | null>(initialFlow || null)

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: registerSchema,
    },
    onSubmit: async ({ value }) => {
      if (!flow) return

      try {
        const csrfNode = flow.ui.nodes.find((node: UiNode) => (node.attributes as UiNodeInputAttributes).name === 'csrf_token')
        const csrfToken = (csrfNode?.attributes as UiNodeInputAttributes)?.value as string

        const body: UpdateRegistrationFlowBody = {
            method: 'password',
            traits: {
                email: value.email,
                name: value.name,
            },
            password: value.password,
            csrf_token: csrfToken,
        }

        await kratos.updateRegistrationFlow({
            flow: flow.id,
            updateRegistrationFlowBody: body,
        })
        
        window.location.href = '/'
      } catch (err: unknown) {
          if (isRegistrationFlowError(err) && err.response?.status === 400 && err.response.data) {
              setFlow(err.response.data)
          }
          console.error(err)
      }
    },
  })

  if (!flow) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>
            Create an account to start using URL2Short.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {flow.ui.messages?.map((msg) => (
                <div key={msg.id} className={`mb-4 p-2 text-sm rounded ${msg.type === 'error' ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
                    {msg.text}
                </div>
            ))}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
            className="space-y-4"
          >
            <form.Field
              name="name"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Full Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="John Doe"
                  />
                  {field.state.meta.errors ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )}
            />
            <form.Field
              name="email"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="email"
                    placeholder="m@example.com"
                  />
                  {field.state.meta.errors ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )}
            />
            <form.Field
              name="password"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="password"
                  />
                  {field.state.meta.errors ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.state.isSubmitting}>
                {form.state.isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
            <div className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/auth/login" className="underline">
                    Login
                </Link>
            </div>
        </CardFooter>
      </Card>
    </div>
  )
}
