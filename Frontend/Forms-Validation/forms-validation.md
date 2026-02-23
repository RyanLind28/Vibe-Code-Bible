# Forms & Validation
> React Hook Form, Zod schemas, Server Actions, multi-step forms, file uploads, and accessible form patterns — structured for AI-assisted development.

---

## Principles

### 1. The Form Stack: React Hook Form + Zod

The standard form stack for React:

- **React Hook Form (RHF)** — manages form state, validation, submission, and error tracking with minimal re-renders
- **Zod** — defines validation schemas that serve as both runtime validator and TypeScript type
- **@hookform/resolvers** — connects Zod schemas to RHF

Together, they provide: one schema as the single source of truth for types and validation, uncontrolled inputs for performance, and type-safe form data at submission.

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}
      {/* ... */}
    </form>
  );
}
```

### 2. Server Actions for Form Submission

Server Actions handle form submissions on the server with progressive enhancement — forms work even without JavaScript:

```tsx
// Using the action attribute (progressive enhancement)
<form action={serverAction}>
  <input name="email" type="email" />
  <button type="submit">Submit</button>
</form>
```

For enhanced UX with RHF, call the Server Action from the `onSubmit` handler:

```tsx
const onSubmit = handleSubmit(async (data) => {
  const result = await createUser(data);
  if (!result.success) {
    // Set server errors on the form
    Object.entries(result.errors).forEach(([field, messages]) => {
      setError(field as keyof FormData, { message: messages[0] });
    });
  }
});
```

### 3. useActionState for Server Action Form State

`useActionState` manages the back-and-forth between form and Server Action:

```tsx
"use client";

import { useActionState } from "react";
import { submitForm, type FormState } from "@/actions/form";

const initialState: FormState = { errors: {} };

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitForm, initialState);

  return (
    <form action={formAction}>
      <input name="name" />
      {state.errors?.name && <p className="text-red-600">{state.errors.name[0]}</p>}

      <button type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send"}
      </button>

      {state.message && <p className="text-green-600">{state.message}</p>}
    </form>
  );
}
```

### 4. useOptimistic for Optimistic Form UI

Show the expected result immediately while the server processes:

```tsx
const [optimisticMessages, addOptimistic] = useOptimistic(
  messages,
  (state, newMessage: string) => [
    ...state,
    { id: `temp-${Date.now()}`, text: newMessage, pending: true },
  ],
);

async function handleSubmit(formData: FormData) {
  const text = formData.get("message") as string;
  addOptimistic(text);
  await sendMessage(text);
}
```

### 5. Multi-Step Forms (Wizard Pattern)

Multi-step forms need per-step validation, state persistence across steps, and a clear progress indicator:

**Key principles:**
- Validate each step independently before allowing progression
- Persist form data across steps (in state, not the DOM)
- Allow going back without losing data
- Show a progress indicator
- Submit all data only on the final step

### 6. File Upload Patterns

File uploads in React need: preview before upload, progress indication, size/type validation, and a server-side upload strategy.

**Never upload files as base64 in form data** — this bloats the payload and blocks the server. Use presigned URLs for direct-to-storage uploads:

1. Client requests a presigned URL from your API
2. Client uploads directly to S3/R2/GCS using the URL
3. Client sends the file reference (key/URL) with the form data

### 7. Accessible Form Patterns

Every form field needs:
- A visible `<label>` linked to the input via `htmlFor`/`id`
- Error messages linked via `aria-describedby`
- `aria-invalid` when the field has an error
- Error announcements for screen readers

```tsx
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-describedby={error ? "email-error" : undefined}
    aria-invalid={!!error}
  />
  {error && (
    <p id="email-error" role="alert" className="text-red-600">
      {error}
    </p>
  )}
</div>
```

### 8. Form Field Components (Headless Pattern)

Create reusable form field components that handle the label, input, error message, and description pattern:

```tsx
interface FormFieldProps {
  label: string;
  error?: string;
  description?: string;
  children: React.ReactNode;
}

function FormField({ label, error, description, children }: FormFieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {description && (
        <p id={`${id}-desc`} className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      )}
      <div className="mt-1">{children}</div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

### 9. Dynamic Forms

`useFieldArray` from RHF handles dynamic form fields — add/remove items, reorder, and validate:

```tsx
const { fields, append, remove, move } = useFieldArray({
  control,
  name: "lineItems",
});
```

**Conditional fields** — show/hide fields based on other field values:
```tsx
const watchType = watch("type");
// Show additional fields based on selection
{watchType === "business" && <BusinessFields control={control} />}
```

### 10. Form State Persistence

For long forms, persist state to prevent data loss:

- **localStorage drafts** — auto-save form data to localStorage, restore on page load
- **beforeunload warning** — warn users before navigating away from a dirty form
- **URL state** — for filter forms, persist to URL params (shareable, bookmarkable)

---

## LLM Instructions

### React Hook Form + Zod Setup

When generating forms:
- Define a Zod schema as the single source of truth
- Derive the TypeScript type with `z.infer<typeof schema>`
- Use `zodResolver` to connect Zod to RHF
- Use `register` for simple inputs, `Controller` for controlled components (Select, DatePicker)
- Show errors inline below each field with `aria-describedby`
- Use `formState.isSubmitting` to disable the submit button
- Always add `noValidate` to the form element (you're handling validation, not the browser)

### Server Action Forms

When generating Server Action form submissions:
- Define the Zod schema in a shared `lib/validations/` file
- Create the Server Action in an `actions/` file with `"use server"`
- Always validate on the server — never trust client-side validation alone
- Return structured errors: `{ success: false, errors: Record<string, string[]> }`
- Use `useActionState` for basic forms, `handleSubmit` + async `onSubmit` for RHF integration
- Call `revalidatePath` or `revalidateTag` after successful mutations

### Accessible Forms

When generating forms:
- Every input MUST have a visible `<label>` with `htmlFor` matching the input's `id`
- Error messages MUST be linked via `aria-describedby`
- Set `aria-invalid={true}` on inputs with errors
- Use `role="alert"` on error messages for screen reader announcements
- Group related fields with `<fieldset>` and `<legend>`
- Show errors on blur (not on every keystroke) for better UX

### File Uploads

When implementing file uploads:
- Validate file type and size on the client before uploading
- Show a preview for images (use `URL.createObjectURL`)
- Use presigned URLs for direct-to-storage uploads (S3, R2, GCS)
- Show upload progress with `XMLHttpRequest` or `fetch` + ReadableStream
- Never upload files as base64 — use multipart/form-data or presigned URLs

### Complex Form State

When handling multi-step forms:
- Validate each step with a step-specific Zod schema
- Store all step data in a parent component or Zustand store
- Show a step indicator with completed/current/upcoming states
- Allow navigation to previous steps without losing data
- Submit the complete data only on the final step

---

## Examples

### 1. Complete Contact Form (RHF + Zod + Server Action)

A full contact form with client-side validation, server-side validation, and error handling:

```tsx
// lib/validations/contact.ts
import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Please enter a valid email"),
  subject: z.enum(["general", "support", "billing"], {
    required_error: "Please select a subject",
  }),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message too long"),
});

export type ContactInput = z.infer<typeof contactSchema>;
```

```tsx
// actions/contact.ts
"use server";

import { contactSchema, type ContactInput } from "@/lib/validations/contact";

export type ContactState = {
  success?: boolean;
  message?: string;
  errors?: Partial<Record<keyof ContactInput, string[]>>;
};

export async function submitContact(data: ContactInput): Promise<ContactState> {
  const result = contactSchema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }

  // Rate limiting, spam check, etc.
  await sendEmail({
    to: "support@example.com",
    subject: `[${result.data.subject}] Contact from ${result.data.name}`,
    body: result.data.message,
    replyTo: result.data.email,
  });

  return { success: true, message: "Message sent! We'll get back to you within 24 hours." };
}
```

```tsx
// components/contact-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import { submitContact, type ContactState } from "@/actions/contact";
import { useState, useId } from "react";
import { cn } from "@/lib/utils";

export function ContactForm() {
  const [serverState, setServerState] = useState<ContactState>({});
  const formId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(data: ContactInput) {
    const result = await submitContact(data);

    if (result.success) {
      setServerState(result);
      reset();
    } else if (result.errors) {
      // Map server errors to form fields
      Object.entries(result.errors).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof ContactInput, { message: messages[0] });
        }
      });
    }
  }

  if (serverState.success) {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center">
        <p className="text-green-800">{serverState.message}</p>
        <button
          onClick={() => setServerState({})}
          className="mt-4 text-sm text-green-600 underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div>
        <label htmlFor={`${formId}-name`} className="block text-sm font-medium">
          Name
        </label>
        <input
          id={`${formId}-name`}
          {...register("name")}
          className={cn(
            "mt-1 w-full rounded border px-3 py-2",
            errors.name && "border-red-500",
          )}
          aria-describedby={errors.name ? `${formId}-name-error` : undefined}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p id={`${formId}-name-error`} role="alert" className="mt-1 text-sm text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${formId}-email`} className="block text-sm font-medium">
          Email
        </label>
        <input
          id={`${formId}-email`}
          type="email"
          {...register("email")}
          className={cn(
            "mt-1 w-full rounded border px-3 py-2",
            errors.email && "border-red-500",
          )}
          aria-describedby={errors.email ? `${formId}-email-error` : undefined}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p id={`${formId}-email-error`} role="alert" className="mt-1 text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${formId}-subject`} className="block text-sm font-medium">
          Subject
        </label>
        <select
          id={`${formId}-subject`}
          {...register("subject")}
          className={cn(
            "mt-1 w-full rounded border px-3 py-2",
            errors.subject && "border-red-500",
          )}
          aria-describedby={errors.subject ? `${formId}-subject-error` : undefined}
          aria-invalid={!!errors.subject}
        >
          <option value="">Select a subject...</option>
          <option value="general">General Inquiry</option>
          <option value="support">Support</option>
          <option value="billing">Billing</option>
        </select>
        {errors.subject && (
          <p id={`${formId}-subject-error`} role="alert" className="mt-1 text-sm text-red-600">
            {errors.subject.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${formId}-message`} className="block text-sm font-medium">
          Message
        </label>
        <textarea
          id={`${formId}-message`}
          rows={5}
          {...register("message")}
          className={cn(
            "mt-1 w-full rounded border px-3 py-2",
            errors.message && "border-red-500",
          )}
          aria-describedby={errors.message ? `${formId}-message-error` : undefined}
          aria-invalid={!!errors.message}
        />
        {errors.message && (
          <p id={`${formId}-message-error`} role="alert" className="mt-1 text-sm text-red-600">
            {errors.message.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded bg-blue-600 py-2.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
```

### 2. Multi-Step Wizard Form

A three-step registration wizard with per-step validation:

```tsx
// lib/validations/registration.ts
import { z } from "zod";

export const step1Schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
});

export const step2Schema = z.object({
  company: z.string().min(1, "Company name is required"),
  role: z.enum(["developer", "designer", "manager", "other"]),
  teamSize: z.enum(["1-5", "6-20", "21-50", "50+"]),
});

export const step3Schema = z.object({
  plan: z.enum(["free", "pro", "enterprise"]),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the terms" }),
  }),
});

export const fullSchema = step1Schema.merge(step2Schema).merge(step3Schema);
export type RegistrationData = z.infer<typeof fullSchema>;
```

```tsx
// components/registration-wizard.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  step1Schema,
  step2Schema,
  step3Schema,
  type RegistrationData,
} from "@/lib/validations/registration";
import { register as registerUser } from "@/actions/auth";
import { z } from "zod";

const steps = [
  { label: "Personal Info", schema: step1Schema },
  { label: "Company", schema: step2Schema },
  { label: "Plan", schema: step3Schema },
];

export function RegistrationWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<RegistrationData>>({});

  const currentSchema = steps[currentStep].schema;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: formData,
  });

  async function onSubmit(data: z.infer<typeof currentSchema>) {
    const updatedData = { ...formData, ...data };
    setFormData(updatedData);

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step — submit everything
      await registerUser(updatedData as RegistrationData);
    }
  }

  function goBack() {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }

  return (
    <div className="mx-auto max-w-md">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                index < currentStep
                  ? "bg-green-500 text-white"
                  : index === currentStep
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {index < currentStep ? "✓" : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-12 ${
                  index < currentStep ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <h2 className="mb-6 text-xl font-semibold">{steps[currentStep].label}</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {currentStep === 0 && (
          <>
            <Field label="First Name" error={errors.firstName?.message}>
              <input {...register("firstName")} className="w-full rounded border px-3 py-2" />
            </Field>
            <Field label="Last Name" error={errors.lastName?.message}>
              <input {...register("lastName")} className="w-full rounded border px-3 py-2" />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input type="email" {...register("email")} className="w-full rounded border px-3 py-2" />
            </Field>
          </>
        )}

        {currentStep === 1 && (
          <>
            <Field label="Company" error={errors.company?.message}>
              <input {...register("company")} className="w-full rounded border px-3 py-2" />
            </Field>
            <Field label="Role" error={errors.role?.message}>
              <select {...register("role")} className="w-full rounded border px-3 py-2">
                <option value="">Select...</option>
                <option value="developer">Developer</option>
                <option value="designer">Designer</option>
                <option value="manager">Manager</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Team Size" error={errors.teamSize?.message}>
              <select {...register("teamSize")} className="w-full rounded border px-3 py-2">
                <option value="">Select...</option>
                <option value="1-5">1-5</option>
                <option value="6-20">6-20</option>
                <option value="21-50">21-50</option>
                <option value="50+">50+</option>
              </select>
            </Field>
          </>
        )}

        {currentStep === 2 && (
          <>
            <fieldset>
              <legend className="text-sm font-medium">Choose a plan</legend>
              <div className="mt-2 space-y-2">
                {["free", "pro", "enterprise"].map(plan => (
                  <label key={plan} className="flex items-center gap-3 rounded border p-3">
                    <input type="radio" value={plan} {...register("plan")} />
                    <span className="capitalize">{plan}</span>
                  </label>
                ))}
              </div>
              {errors.plan && <p className="mt-1 text-sm text-red-600">{errors.plan.message}</p>}
            </fieldset>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("agreeToTerms")} />
              <span className="text-sm">I agree to the Terms of Service</span>
            </label>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-600">{errors.agreeToTerms.message}</p>
            )}
          </>
        )}

        <div className="flex gap-3 pt-4">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="rounded border px-4 py-2 text-gray-600 hover:bg-gray-50"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded bg-blue-600 py-2 text-white disabled:opacity-50"
          >
            {currentStep === steps.length - 1
              ? isSubmitting ? "Creating account..." : "Create Account"
              : "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
      {error && <p role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

### 3. File Upload with Presigned URL

Uploading files directly to S3 with a preview and progress:

```tsx
// actions/upload.ts
"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuid } from "uuid";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function getUploadUrl(filename: string, contentType: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const key = `uploads/${session.user.id}/${uuid()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  return { url, key };
}
```

```tsx
// components/file-upload.tsx
"use client";

import { useState, useRef } from "react";
import { getUploadUrl } from "@/actions/upload";
import Image from "next/image";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface FileUploadProps {
  onUploadComplete: (key: string) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Client-side validation
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File must be under 5MB.");
      return;
    }

    // Show preview
    setPreview(URL.createObjectURL(file));

    // Upload
    setUploading(true);
    try {
      const { url, key } = await getUploadUrl(file.name, file.type);

      // Upload directly to S3 with progress
      await uploadWithProgress(url, file, setProgress);

      onUploadComplete(key);
    } catch {
      setError("Upload failed. Please try again.");
      setPreview(null);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <Image
            src={preview}
            alt="Preview"
            width={200}
            height={200}
            className="rounded-lg object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
              <div className="text-center text-white">
                <p className="text-sm">{Math.round(progress)}%</p>
                <div className="mt-1 h-1.5 w-24 rounded-full bg-white/30">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          {!uploading && (
            <button
              onClick={() => {
                setPreview(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400"
        >
          <div className="text-center">
            <UploadIcon className="mx-auto h-6 w-6 text-gray-400" />
            <p className="mt-1 text-sm text-gray-500">Click to upload</p>
          </div>
        </button>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", e => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    });
    xhr.addEventListener("error", reject);
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
}
```

### 4. Dynamic Invoice Line Items

A dynamic form with useFieldArray for adding/removing line items:

```tsx
// lib/validations/invoice.ts
import { z } from "zod";

export const lineItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.number().int().min(1, "Min quantity is 1"),
  unitPrice: z.number().min(0, "Price must be positive"),
});

export const invoiceSchema = z.object({
  clientName: z.string().min(1, "Client name required"),
  dueDate: z.string().min(1, "Due date required"),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
  notes: z.string().optional(),
});

export type InvoiceData = z.infer<typeof invoiceSchema>;
```

```tsx
// components/invoice-form.tsx
"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { invoiceSchema, type InvoiceData } from "@/lib/validations/invoice";

export function InvoiceForm() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Client</label>
          <input {...register("clientName")} className="mt-1 w-full rounded border px-3 py-2" />
          {errors.clientName && (
            <p className="mt-1 text-sm text-red-600">{errors.clientName.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Due Date</label>
          <input type="date" {...register("dueDate")} className="mt-1 w-full rounded border px-3 py-2" />
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-medium">Line Items</h3>
          <button
            type="button"
            onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add item
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  {...register(`lineItems.${index}.description`)}
                  placeholder="Description"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
                {errors.lineItems?.[index]?.description && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.lineItems[index].description?.message}
                  </p>
                )}
              </div>
              <div className="w-20">
                <input
                  type="number"
                  {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                  placeholder="Qty"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <div className="w-28">
                <input
                  type="number"
                  step="0.01"
                  {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                  placeholder="Price"
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>
              <LineTotal control={control} index={index} />
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="mt-2 text-red-500 disabled:text-gray-300"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <InvoiceTotal control={control} />

      <div>
        <label className="block text-sm font-medium">Notes</label>
        <textarea {...register("notes")} rows={3} className="mt-1 w-full rounded border px-3 py-2" />
      </div>

      <button type="submit" className="rounded bg-blue-600 px-6 py-2 text-white">
        Create Invoice
      </button>
    </form>
  );
}

function LineTotal({ control, index }: { control: any; index: number }) {
  const quantity = useWatch({ control, name: `lineItems.${index}.quantity` }) || 0;
  const unitPrice = useWatch({ control, name: `lineItems.${index}.unitPrice` }) || 0;
  const total = quantity * unitPrice;

  return (
    <div className="w-24 py-2 text-right text-sm font-medium">
      ${total.toFixed(2)}
    </div>
  );
}

function InvoiceTotal({ control }: { control: any }) {
  const lineItems = useWatch({ control, name: "lineItems" }) || [];
  const total = lineItems.reduce(
    (sum: number, item: any) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0,
  );

  return (
    <div className="flex justify-end border-t pt-4">
      <div className="text-right">
        <p className="text-sm text-gray-500">Total</p>
        <p className="text-2xl font-bold">${total.toFixed(2)}</p>
      </div>
    </div>
  );
}
```

### 5. Accessible Form Field Components

Reusable form field components for consistent form patterns:

```tsx
// components/ui/form-field.tsx
"use client";

import { useId, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => React.ReactNode;
}

export function FormField({
  label,
  error,
  description,
  required,
  className,
  children,
}: FormFieldProps) {
  const id = useId();
  const descriptionId = description ? `${id}-desc` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {description && (
        <p id={descriptionId} className="mt-1 text-sm text-gray-500">
          {description}
        </p>
      )}

      <div className="mt-1">
        {children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": !!error,
        })}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// Pre-built input field
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  description?: string;
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, error, description, className, ...props }, ref) => (
    <FormField label={label} error={error} description={description} required={props.required}>
      {(fieldProps) => (
        <input
          ref={ref}
          {...fieldProps}
          {...props}
          className={cn(
            "w-full rounded border px-3 py-2",
            error ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-blue-500",
            "focus:outline-none focus:ring-2 focus:ring-offset-1",
            className,
          )}
        />
      )}
    </FormField>
  ),
);

InputField.displayName = "InputField";

// Pre-built select field
interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => (
    <FormField label={label} error={error} required={props.required}>
      {(fieldProps) => (
        <select
          ref={ref}
          {...fieldProps}
          {...props}
          className={cn(
            "w-full rounded border px-3 py-2",
            error ? "border-red-500" : "border-gray-300",
            className,
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  ),
);

SelectField.displayName = "SelectField";

// Usage with React Hook Form
function ExampleForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <InputField
        label="Full Name"
        error={errors.name?.message}
        required
        {...register("name")}
      />
      <InputField
        label="Email"
        type="email"
        error={errors.email?.message}
        description="We'll never share your email."
        required
        {...register("email")}
      />
      <SelectField
        label="Country"
        error={errors.country?.message}
        placeholder="Select a country..."
        options={[
          { label: "United States", value: "US" },
          { label: "Canada", value: "CA" },
          { label: "United Kingdom", value: "UK" },
        ]}
        required
        {...register("country")}
      />
      <button type="submit" className="rounded bg-blue-600 px-6 py-2 text-white">
        Submit
      </button>
    </form>
  );
}
```

---

## Common Mistakes

### 1. No Server-Side Validation

**Wrong:**
```tsx
"use server";
export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  await db.user.create({ data: { name, email } }); // No validation!
}
```

**Fix:** Always validate on the server:
```tsx
"use server";
export async function createUser(formData: FormData) {
  const result = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  await db.user.create({ data: result.data });
}
```

### 2. Controlled Inputs Everywhere

**Wrong:**
```tsx
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState("");
// 10 more useState calls for each field
```

**Fix:** Use React Hook Form's uncontrolled inputs:
```tsx
const { register, handleSubmit } = useForm();
<input {...register("name")} />
<input {...register("email")} />
```

### 3. Missing Labels

**Wrong:**
```tsx
<input placeholder="Email" />
// Placeholder is not a label — invisible to screen readers when focused
```

**Fix:**
```tsx
<label htmlFor="email">Email</label>
<input id="email" placeholder="user@example.com" />
```

### 4. Error Messages Not Linked to Inputs

**Wrong:**
```tsx
<input />
{error && <span className="text-red-600">{error}</span>}
// Screen reader doesn't know this error belongs to the input
```

**Fix:**
```tsx
<input
  aria-describedby={error ? "email-error" : undefined}
  aria-invalid={!!error}
/>
{error && <span id="email-error" role="alert">{error}</span>}
```

### 5. No Pending/Loading State

**Wrong:**
```tsx
<button type="submit">Submit</button>
// User clicks multiple times, submits multiple forms
```

**Fix:**
```tsx
<button type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Submitting..." : "Submit"}
</button>
```

### 6. Losing Form State on Navigation

**Wrong:** User fills out a long form, accidentally navigates away, and loses all data.

**Fix:** Auto-save to localStorage:
```tsx
const STORAGE_KEY = "draft-form";

useEffect(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) reset(JSON.parse(saved));
}, [reset]);

useEffect(() => {
  const sub = watch(data => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  });
  return () => sub.unsubscribe();
}, [watch]);
```

### 7. Validating All Fields on First Blur

**Wrong:**
```tsx
useForm({ mode: "all" }); // Shows errors on all fields immediately
```

**Fix:**
```tsx
useForm({ mode: "onBlur" }); // Errors show after user leaves a field
// Or "onSubmit" for errors only on submit
```

### 8. Uploading Files as Base64

**Wrong:**
```tsx
const reader = new FileReader();
reader.onload = () => {
  // Sends 33% larger payload, blocks server
  submitForm({ avatar: reader.result as string });
};
reader.readAsDataURL(file);
```

**Fix:** Use presigned URLs for direct upload to storage (see Example 3).

### 9. Duplicate Form Submissions

**Wrong:** No submit button disabling, no debouncing, user double-clicks.

**Fix:**
```tsx
const { formState: { isSubmitting } } = useForm();

<button type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Saving..." : "Save"}
</button>
```

### 10. Hardcoded Error Messages

**Wrong:**
```tsx
if (!name) errors.name = "This field is required";
if (!email) errors.email = "This field is required";
if (email && !email.includes("@")) errors.email = "Invalid email";
```

**Fix:** Let Zod handle messages:
```tsx
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
});
```

---

See also: [React Fundamentals](../React-Fundamentals/react-fundamentals.md) | [TypeScript-React](../TypeScript-React/typescript-react.md) | [Next.js Patterns](../Nextjs-Patterns/nextjs-patterns.md) | [Data Fetching](../Data-Fetching/data-fetching.md) | [Component Patterns](../Component-Patterns/component-patterns.md) | [Accessibility](../../UIUX/Accessibility/accessibility.md) | [Backend Security](../../Security/Backend-Security/backend-security.md)

Last reviewed: 2026-02
