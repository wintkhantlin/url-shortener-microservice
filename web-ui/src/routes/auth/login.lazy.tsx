import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { revalidateLogic, useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import { type LoginFlow, type UpdateLoginFlowBody, type UiNodeInputAttributes, type UiNode, type UiText } from '@ory/client'
import { kratos } from '@/lib/kratos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Route as LoginRoute } from './login'

export const Route = createLazyFileRoute('/auth/login')({
    component: Login,
})

type LoginFlowError = {
    response?: {
        status?: number
        data?: LoginFlow
    }
}

function isLoginFlowError(error: unknown): error is LoginFlowError {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return false
    }
    const response = (error as LoginFlowError).response
    return typeof response?.status === 'number'
}

const loginFormSchema = z.object({
    identifier: z.email("Please enter a valid email"),
    password: z.string().min(1, "Password is required"),
})

function Login() {
    const data = LoginRoute.useLoaderData() as { flow?: LoginFlow }
    const initialFlow = data?.flow
    const [flow, setFlow] = useState<LoginFlow | null>(initialFlow || null)

    const form = useForm({
        defaultValues: {
            identifier: '',
            password: '',
        },
        validationLogic: revalidateLogic(),
        validators: {
            onDynamic: loginFormSchema,
        },
        onSubmit: async ({ value }) => {
            if (!flow) return

            try {
                const csrfNode = flow.ui.nodes.find((node: UiNode) => (node.attributes as UiNodeInputAttributes).name === 'csrf_token')
                const csrfToken = (csrfNode?.attributes as UiNodeInputAttributes)?.value as string

                const body: UpdateLoginFlowBody = {
                    method: 'password',
                    identifier: value.identifier,
                    password: value.password,
                    csrf_token: csrfToken,
                }

                await kratos.updateLoginFlow({
                    flow: flow.id,
                    updateLoginFlowBody: body,
                })

                window.location.href = '/'
            } catch (err: unknown) {
                if (isLoginFlowError(err) && err.response?.status === 400 && err.response.data) {
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
                    <CardTitle>Login</CardTitle>
                    <CardDescription>Enter your email below to login.</CardDescription>
                </CardHeader>
                <CardContent>
                    {flow.ui.messages?.map((msg: UiText) => (
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
                            name="identifier"
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
                                    />
                                    {field.state.meta.errors.length > 0 && (
                                        <FieldError errors={field.state.meta.errors} />
                                    )}
                                </Field>
                            )}
                        />
                        <form.Field
                            name="password"
                            children={(field) => (
                                <Field>
                                    <div className="flex items-center justify-between">
                                        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                                    </div>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        type="password"
                                    />
                                    {field.state.meta.errors.length > 0 && (
                                        <FieldError errors={field.state.meta.errors} />
                                    )}
                                </Field>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={form.state.isSubmitting}>
                            {form.state.isSubmitting ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <div className="text-sm text-muted-foreground">
                        Don't have an account? <Link to="/auth/register" className="underline">Sign up</Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
