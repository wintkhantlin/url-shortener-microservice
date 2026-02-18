import { createLazyFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createLazyFileRoute('/auth/verification')({
  component: Verification,
})

function Verification() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Account verification is not yet implemented.</p>
        </CardContent>
      </Card>
    </div>
  )
}
