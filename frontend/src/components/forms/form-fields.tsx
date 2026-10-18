"use client"

import { useId, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface FieldShellProps {
  label: React.ReactNode
  error?: string
  description?: React.ReactNode
  optional?: boolean
  className?: string
}

function describedBy(id: string, error?: string, description?: React.ReactNode) {
  return [description ? `${id}-description` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined
}

function Shell({
  id,
  label,
  error,
  description,
  optional,
  className,
  children,
}: FieldShellProps & { id: string; children: React.ReactNode }) {
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {optional ? <span className="font-normal text-muted-foreground">(facultatif)</span> : null}
      </FieldLabel>
      {children}
      {description ? <FieldDescription id={`${id}-description`}>{description}</FieldDescription> : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  )
}

type TextFieldProps = FieldShellProps & Omit<React.ComponentProps<"input">, "className">

export function TextField({ label, error, description, optional, className, id, ...inputProps }: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <Shell id={fieldId} label={label} error={error} description={description} optional={optional} className={className}>
      <Input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, description)}
        {...inputProps}
      />
    </Shell>
  )
}

type TextareaFieldProps = FieldShellProps & Omit<React.ComponentProps<"textarea">, "className">

export function TextareaField({ label, error, description, optional, className, id, ...props }: TextareaFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <Shell id={fieldId} label={label} error={error} description={description} optional={optional} className={className}>
      <Textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, description)}
        {...props}
      />
    </Shell>
  )
}

export function PasswordField({ label, error, description, className, id, ...inputProps }: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const [visible, setVisible] = useState(false)
  return (
    <Shell id={fieldId} label={label} error={error} description={description} className={className}>
      <div className="relative">
        <Input
          id={fieldId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, description)}
          className="pr-11"
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className={cn(
            "absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          )}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </Shell>
  )
}
