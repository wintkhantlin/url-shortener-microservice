import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { revalidateLogic, useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import { type SettingsFlow, type UpdateSettingsFlowBody, type UiNodeInputAttributes, type UiNode } from '@ory/client'
import { kratos } from '@/lib/kratos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Route as SettingsRoute } from './settings'

export const Route = createLazyFileRoute('/auth/settings')({
  component: Settings,
})

const profileSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").or(z.literal('')),
  email: z.email("Please enter a valid email").or(z.literal('')),
})

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
})

function Settings() {
  const data = SettingsRoute.useLoaderData() as { flow?: SettingsFlow }
  const initialFlow = data?.flow
  const [flow, setFlow] = useState<SettingsFlow | null>(initialFlow || null)

  const profileForm = useForm({
    defaultValues: {
      name: '',
      email: '',
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: profileSchema,
    },
    onSubmit: async ({ value }) => {
      if (!flow) return

      try {
        const csrfNode = flow.ui.nodes.find((node: UiNode) => (node.attributes as UiNodeInputAttributes).name === 'csrf_token')
        const csrfToken = (csrfNode?.attributes as UiNodeInputAttributes)?.value as string

        const body: UpdateSettingsFlowBody = {
            method: 'profile',
            traits: {
                email: value.email,
                name: value.name,
            },
            csrf_token: csrfToken,
        }

        const { data } = await kratos.updateSettingsFlow({
            flow: flow.id,
            updateSettingsFlowBody: body,
        })
        
        setFlow(data)
      } catch (err: unknown) {
          if ((err as any).response?.status === 400) {
              setFlow((err as any).response.data)
          }
          console.error(err)
      }
    },
  })

  const passwordForm = useForm({
    defaultValues: {
      password: '',
    },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: passwordSchema,
    },
    onSubmit: async ({ value }) => {
      if (!flow) return

      try {
        const csrfNode = flow.ui.nodes.find((node: UiNode) => (node.attributes as UiNodeInputAttributes).name === 'csrf_token')
        const csrfToken = (csrfNode?.attributes as UiNodeInputAttributes)?.value as string

        const body: UpdateSettingsFlowBody = {
            method: 'password',
            password: value.password,
            csrf_token: csrfToken,
        }

        const { data } = await kratos.updateSettingsFlow({
            flow: flow.id,
            updateSettingsFlowBody: body,
        })
        
        setFlow(data)
      } catch (err: unknown) {
          if ((err as any).response?.status === 400) {
              setFlow((err as any).response.data)
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
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Update your profile and security settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {flow.ui.messages?.map((msg) => (
                <div key={msg.id} className={`mb-4 p-2 text-sm rounded ${msg.type === 'error' ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
                    {msg.text}
                </div>
            ))}

            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium mb-4">Profile</h3>
                    <form
                        onSubmit={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        profileForm.handleSubmit()
                        }}
                        className="space-y-4"
                    >
                        <profileForm.Field
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
                         <profileForm.Field
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
                        <Button type="submit" disabled={profileForm.state.isSubmitting}>
                            {profileForm.state.isSubmitting ? 'Saving...' : 'Save Profile'}
                        </Button>
                    </form>
                </div>

                <div className="border-t pt-6">
                     <h3 className="text-lg font-medium mb-4">Password</h3>
                     <form
                        onSubmit={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        passwordForm.handleSubmit()
                        }}
                        className="space-y-4"
                    >
                         <passwordForm.Field
                        name="password"
                        children={(field) => (
                            <Field>
                            <FieldLabel htmlFor={field.name}>New Password</FieldLabel>
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
                        <Button type="submit" disabled={passwordForm.state.isSubmitting}>
                            {passwordForm.state.isSubmitting ? 'Updating...' : 'Update Password'}
                        </Button>
                    </form>
                </div>
            </div>

        </CardContent>
        <CardFooter className="flex justify-center">
            <div className="text-sm text-muted-foreground">
                <Link to="/" className="underline">
                    Back to Dashboard
                </Link>
            </div>
        </CardFooter>
      </Card>
    </div>
  )
}
