/**
 * Toast Component (Sonner)
 * 
 * Provides toast notifications using the Sonner library.
 * Based on shadcn/ui toast implementation.
 */

import { Toaster as Sonner, toast } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Toaster component - add to app root
 */
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          error: 'group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground',
          success: 'group-[.toaster]:bg-emerald-500/10 group-[.toaster]:text-emerald-500 group-[.toaster]:border-emerald-500/20',
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
