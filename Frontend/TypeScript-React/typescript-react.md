# TypeScript-React
> Type-safe React components — props, generics, discriminated unions, Zod schemas, and utility types for AI-assisted development.

---

## Principles

### 1. Why TypeScript Matters for AI-Assisted Development

TypeScript makes AI-generated code significantly more reliable. When the AI generates a component with typed props, the compiler catches misuse immediately. Without types, bugs from wrong prop types, missing fields, or incorrect API response shapes go unnoticed until runtime.

TypeScript also makes AI prompts more effective — when you describe types in your prompt, the AI generates code that matches your data model precisely. Types are documentation that never drifts from the code.

**Non-negotiable settings in `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 2. Props Typing: interface vs type

Both work for props. Convention: use `interface` for props because they're extendable and produce clearer error messages:

```tsx
interface ButtonProps {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = "primary", size = "md", children, ...props }: ButtonProps) {
  return <button {...props}>{children}</button>;
}
```

**Extending HTML element props:**
```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
}
```

This gives your component all native button attributes (`type`, `disabled`, `aria-label`, etc.) without listing them manually.

**Children typing:**
- `children: React.ReactNode` — accepts anything renderable (most common)
- `children: string` — only accepts text
- `children: (data: T) => React.ReactNode` — render prop pattern

### 3. Generic Components

Generics let you build type-safe reusable components where the data type flows through:

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

export function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map(item => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// Usage — T is inferred as User
<List
  items={users}
  renderItem={user => <span>{user.name}</span>}  // user is typed as User
  keyExtractor={user => user.id}                   // user is typed as User
/>
```

**Constraining generics:**
```tsx
interface HasId {
  id: string;
}

function DataTable<T extends HasId>({ data }: { data: T[] }) {
  // T must have an id property — guaranteed
  return data.map(row => <tr key={row.id}>...</tr>);
}
```

### 4. Discriminated Unions for Variants

Discriminated unions make impossible states unrepresentable. Use a shared `type` or `status` field as the discriminator:

```tsx
type Notification =
  | { type: "success"; message: string }
  | { type: "error"; message: string; retryAction?: () => void }
  | { type: "loading"; progress: number };

function NotificationBanner({ notification }: { notification: Notification }) {
  switch (notification.type) {
    case "success":
      return <div className="bg-green-50 text-green-800">{notification.message}</div>;
    case "error":
      return (
        <div className="bg-red-50 text-red-800">
          {notification.message}
          {notification.retryAction && (
            <button onClick={notification.retryAction}>Retry</button>
          )}
        </div>
      );
    case "loading":
      return <div className="bg-blue-50"><ProgressBar value={notification.progress} /></div>;
  }
}
```

TypeScript narrows the type in each case branch — `retryAction` is only accessible in the `"error"` branch.

### 5. Type-Safe Event Handlers

React provides typed event objects. Use them instead of `any`:

```tsx
// Form events
function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
}

// Change events — typed to the element
function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
  console.log(e.target.value); // string
}

function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
  console.log(e.target.value); // string
}

// Mouse events
function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
  console.log(e.clientX, e.clientY);
}

// Keyboard events
function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") submit();
}
```

**For callback props**, define the handler type explicitly:
```tsx
interface Props {
  onChange: (value: string) => void;  // Not (e: ChangeEvent) => void
  onSelect: (item: Item) => void;    // Domain-specific, not event-specific
}
```

### 6. React Utility Types

React exports useful types you should know:

```tsx
// Get the props of any component
type ButtonProps = React.ComponentProps<typeof Button>;
type InputProps = React.ComponentProps<"input">;

// Get the ref type of a component
type InputRef = React.ComponentRef<typeof Input>;

// Add children to any props type
type WithChildren<T> = T & { children: React.ReactNode };

// ElementType — a component or HTML element string
type Props = {
  as?: React.ElementType;  // "div" | "span" | typeof CustomComponent
};

// Extract props from a component with ref
type FullButtonProps = React.ComponentPropsWithRef<"button">;
type ButtonPropsNoRef = React.ComponentPropsWithoutRef<"button">;
```

### 7. Strict Mode and Strict Null Checks

`strict: true` in `tsconfig.json` enables all strict checks. The most impactful:

**strictNullChecks** — `null` and `undefined` are distinct types, not assignable to everything:
```tsx
function getUser(id: string): User | null { ... }
const user = getUser("123");
user.name; // Error: user might be null
user?.name; // OK
```

**noUncheckedIndexedAccess** — array/object indexing returns `T | undefined`:
```tsx
const items = ["a", "b", "c"];
const item = items[5]; // Type: string | undefined (not string)
if (item) {
  console.log(item.toUpperCase()); // OK — narrowed to string
}
```

### 8. as const and Literal Types

`as const` creates narrow literal types from values:

```tsx
// Without as const — type is string[]
const colors = ["red", "green", "blue"];

// With as const — type is readonly ["red", "green", "blue"]
const colors = ["red", "green", "blue"] as const;
type Color = (typeof colors)[number]; // "red" | "green" | "blue"
```

**Template literal types** for string patterns:
```tsx
type Spacing = "sm" | "md" | "lg";
type Direction = "top" | "right" | "bottom" | "left";
type PaddingClass = `p${Direction}-${Spacing}`;
// "ptop-sm" | "ptop-md" | ... | "pleft-lg"
```

### 9. Zod + TypeScript: Schema-First

Zod lets you define a schema once and derive both the runtime validator and the TypeScript type:

```tsx
import { z } from "zod";

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["user", "admin", "moderator"]),
  createdAt: z.coerce.date(),
});

// Derive the TypeScript type from the schema
type User = z.infer<typeof userSchema>;
// { id: string; name: string; email: string; role: "user" | "admin" | "moderator"; createdAt: Date }

// Runtime validation
function validateUser(data: unknown): User {
  return userSchema.parse(data); // Throws on invalid
}

// Safe validation
function safeValidateUser(data: unknown) {
  return userSchema.safeParse(data);
  // { success: true, data: User } | { success: false, error: ZodError }
}
```

**The rule:** Define Zod schemas as the single source of truth. Derive TypeScript types with `z.infer`. Never maintain separate type definitions and validation logic.

### 10. Type-Safe API Routes and Server Actions

Type safety across the client-server boundary:

```tsx
// lib/validations/product.ts
import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  category: z.enum(["electronics", "clothing", "books"]),
  description: z.string().max(1000).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
```

```tsx
// actions/products.ts
"use server";

import { createProductSchema } from "@/lib/validations/product";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; errors: Record<string, string[]> };

export async function createProduct(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const result = createProductSchema.safeParse({
    name: formData.get("name"),
    price: Number(formData.get("price")),
    category: formData.get("category"),
    description: formData.get("description"),
  });

  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }

  const product = await db.product.create({ data: result.data });
  return { success: true, data: { id: product.id } };
}
```

### 11. Avoiding `any`

`any` disables type checking. Every `any` is a bug waiting to happen.

**Use `unknown` instead of `any`:**
```tsx
// BAD — any bypasses all type checking
function processData(data: any) {
  return data.name.toUpperCase(); // No error, even if data has no name
}

// GOOD — unknown requires narrowing before use
function processData(data: unknown) {
  if (typeof data === "object" && data !== null && "name" in data) {
    return (data as { name: string }).name.toUpperCase();
  }
  throw new Error("Invalid data");
}
```

**Type guards** for safe narrowing:
```tsx
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value
  );
}

if (isUser(data)) {
  console.log(data.email); // TypeScript knows data is User
}
```

**Zod for runtime validation** — the cleanest way to go from `unknown` to typed:
```tsx
const data = userSchema.parse(unknownData); // Throws if invalid, returns User if valid
```

---

## LLM Instructions

### Typing Components

When generating typed React components:
- Define `interface Props` (or `interface [Component]Props`) above the component
- Extend HTML element props when wrapping native elements: `extends React.ButtonHTMLAttributes<HTMLButtonElement>`
- Use `React.ReactNode` for `children` unless you need a more specific type
- Destructure props in the function signature with defaults where appropriate
- Use `forwardRef` with explicit generic types: `forwardRef<HTMLInputElement, Props>`

### Generic Components

When building reusable data components:
- Make the data type generic: `function Table<T>(props: TableProps<T>)`
- Constrain generics when you need specific properties: `T extends { id: string }`
- Let TypeScript infer the generic from usage — don't require explicit type arguments
- Use `keyof T` for column/field selectors to ensure type safety

### Zod for Runtime Validation

When working with external data (API responses, form data, URL params):
- Define a Zod schema as the single source of truth
- Derive the TypeScript type with `z.infer<typeof schema>`
- Use `schema.safeParse()` for error handling, `schema.parse()` for throwing
- Validate at system boundaries: API handlers, Server Actions, form submission
- Don't validate internal data passed between your own functions

### Typing Events and Callbacks

When defining event handlers in components:
- For callback props, use domain types: `onSelect: (item: Item) => void`
- For DOM event handlers, use React's typed events: `React.ChangeEvent<HTMLInputElement>`
- Avoid `any` in event handlers — always type the event parameter
- Use `React.FormEvent<HTMLFormElement>` for form submission

### Type Safety Across Boundaries

When data crosses client-server boundaries:
- Share Zod schemas between client and server
- Validate on the server even if the client validates too
- Type Server Action return values as discriminated unions: `ActionResult<T>`
- Use `z.infer` to keep client-side types in sync with server validation

---

## Examples

### 1. Generic Data Table

A fully typed data table where column definitions are constrained to the data type:

```tsx
interface Column<T> {
  key: keyof T & string;
  header: string;
  width?: string;
  render?: (value: T[keyof T & string], row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <table className={cn("w-full", className)}>
      <thead>
        <tr className="border-b text-left text-sm text-gray-500">
          {columns.map(col => (
            <th key={col.key} className="px-4 py-3" style={{ width: col.width }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr
            key={row.id}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "border-b",
              onRowClick && "cursor-pointer hover:bg-gray-50",
            )}
          >
            {columns.map(col => (
              <td key={col.key} className="px-4 py-3">
                {col.render
                  ? col.render(row[col.key], row)
                  : String(row[col.key] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Usage — columns are type-checked against User
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  createdAt: string;
}

const columns: Column<User>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "email", header: "Email" },
  {
    key: "role",
    header: "Role",
    render: (value) => (
      <span className={value === "admin" ? "text-purple-600 font-medium" : ""}>
        {String(value)}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Joined",
    render: (value) => new Date(String(value)).toLocaleDateString(),
  },
];

<DataTable data={users} columns={columns} onRowClick={user => router.push(`/users/${user.id}`)} />
```

### 2. Discriminated Union Notification Component

A notification system where each type has its own shape:

```tsx
type NotificationType =
  | {
      type: "success";
      title: string;
      message: string;
      autoDismiss?: number;
    }
  | {
      type: "error";
      title: string;
      message: string;
      retryAction?: () => void;
      errorCode?: string;
    }
  | {
      type: "warning";
      title: string;
      message: string;
      action?: { label: string; onClick: () => void };
    }
  | {
      type: "info";
      title: string;
      message: string;
      link?: { label: string; href: string };
    };

const icons: Record<NotificationType["type"], React.ReactNode> = {
  success: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
  error: <XCircleIcon className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangleIcon className="h-5 w-5 text-amber-500" />,
  info: <InfoIcon className="h-5 w-5 text-blue-500" />,
};

const styles: Record<NotificationType["type"], string> = {
  success: "border-green-200 bg-green-50",
  error: "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  info: "border-blue-200 bg-blue-50",
};

export function Notification({ notification }: { notification: NotificationType }) {
  return (
    <div className={cn("flex gap-3 rounded-lg border p-4", styles[notification.type])}>
      {icons[notification.type]}
      <div className="flex-1">
        <p className="font-medium">{notification.title}</p>
        <p className="mt-1 text-sm text-gray-600">{notification.message}</p>

        {/* Type-specific actions — TypeScript narrows automatically */}
        {notification.type === "error" && notification.retryAction && (
          <button onClick={notification.retryAction} className="mt-2 text-sm text-red-600 underline">
            Retry
          </button>
        )}
        {notification.type === "warning" && notification.action && (
          <button onClick={notification.action.onClick} className="mt-2 text-sm font-medium text-amber-700">
            {notification.action.label}
          </button>
        )}
        {notification.type === "info" && notification.link && (
          <a href={notification.link.href} className="mt-2 inline-block text-sm text-blue-600 underline">
            {notification.link.label}
          </a>
        )}
      </div>
    </div>
  );
}
```

### 3. Zod + React Hook Form + Server Action

End-to-end type safety from form schema to server validation:

```tsx
// lib/validations/contact.ts
import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  subject: z.enum(["general", "support", "billing", "partnership"], {
    required_error: "Please select a subject",
  }),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export type ContactInput = z.infer<typeof contactSchema>;
```

```tsx
// actions/contact.ts
"use server";

import { contactSchema, type ContactInput } from "@/lib/validations/contact";

type ContactResult =
  | { success: true; message: string }
  | { success: false; errors: Record<string, string[]> };

export async function submitContact(data: ContactInput): Promise<ContactResult> {
  // Server-side validation (never trust client)
  const result = contactSchema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }

  await sendEmail({
    to: "support@example.com",
    subject: `[${result.data.subject}] from ${result.data.name}`,
    body: result.data.message,
    replyTo: result.data.email,
  });

  return { success: true, message: "Message sent successfully" };
}
```

```tsx
// components/contact-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/lib/validations/contact";
import { submitContact } from "@/actions/contact";
import { useState } from "react";

export function ContactForm() {
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(data: ContactInput) {
    const result = await submitContact(data);
    if (result.success) {
      setServerMessage(result.message);
      reset();
    } else {
      setServerMessage("Failed to send. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="block text-sm font-medium">Name</label>
        <input id="name" {...register("name")} className="mt-1 w-full rounded border px-3 py-2" />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" type="email" {...register("email")} className="mt-1 w-full rounded border px-3 py-2" />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium">Subject</label>
        <select id="subject" {...register("subject")} className="mt-1 w-full rounded border px-3 py-2">
          <option value="">Select a subject</option>
          <option value="general">General Inquiry</option>
          <option value="support">Support</option>
          <option value="billing">Billing</option>
          <option value="partnership">Partnership</option>
        </select>
        {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject.message}</p>}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium">Message</label>
        <textarea id="message" rows={5} {...register("message")} className="mt-1 w-full rounded border px-3 py-2" />
        {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>}
      </div>

      {serverMessage && <p className="text-sm text-green-600">{serverMessage}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-blue-600 px-6 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
```

### 4. Typed Route Params and Search Params

Type-safe params in Next.js App Router:

```tsx
// app/products/[category]/page.tsx
import { z } from "zod";
import { notFound } from "next/navigation";

const categorySchema = z.enum(["electronics", "clothing", "books"]);

const searchParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  sort: z.enum(["name", "price", "newest"]).default("name"),
  q: z.string().optional(),
});

interface Props {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category: rawCategory } = await params;
  const rawSearch = await searchParams;

  // Validate category
  const categoryResult = categorySchema.safeParse(rawCategory);
  if (!categoryResult.success) notFound();

  // Validate search params
  const search = searchParamsSchema.parse(rawSearch);

  const products = await getProducts({
    category: categoryResult.data,
    page: search.page,
    sort: search.sort,
    query: search.q,
  });

  return <ProductGrid products={products} />;
}
```

### 5. Template Literal Design Tokens

Type-safe design token utilities:

```tsx
// lib/tokens.ts
const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
type Size = (typeof sizes)[number];

const colors = ["brand", "gray", "red", "green", "blue"] as const;
type Color = (typeof colors)[number];

const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
type Shade = (typeof shades)[number];

// Template literal type for color tokens
type ColorToken = `${Color}-${Shade}`;

// Type-safe token getter
function getColorVar(token: ColorToken): string {
  return `var(--color-${token})`;
}

// Usage
getColorVar("brand-500");     // OK
getColorVar("brand-550");     // Error: not a valid shade
getColorVar("purple-500");    // Error: not a valid color

// Size-aware spacing
type SpacingKey = `space-${Size}`;

const spacing: Record<SpacingKey, string> = {
  "space-xs": "0.25rem",
  "space-sm": "0.5rem",
  "space-md": "1rem",
  "space-lg": "1.5rem",
  "space-xl": "2rem",
};

// Polymorphic component with typed `as` prop
type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
} & Omit<React.ComponentPropsWithoutRef<E>, "as">;

function Box<E extends React.ElementType = "div">({
  as,
  ...props
}: PolymorphicProps<E>) {
  const Component = as || "div";
  return <Component {...props} />;
}

// Usage — type-safe prop passthrough
<Box as="a" href="/about">Link styled as Box</Box>
<Box as="button" onClick={() => {}}>Button styled as Box</Box>
<Box as="section" className="p-4">Section</Box>
```

---

## Common Mistakes

### 1. Using `any` for Props

**Wrong:**
```tsx
function UserCard({ user }: { user: any }) {
  return <h2>{user.name}</h2>; // No type checking — user.namee wouldn't error
}
```

**Fix:**
```tsx
interface User {
  id: string;
  name: string;
  email: string;
}

function UserCard({ user }: { user: User }) {
  return <h2>{user.name}</h2>; // Type-checked
}
```

### 2. Unexported Shared Types

**Wrong:** Types defined inline, duplicated across files.

**Fix:** Export shared types from a central location:
```tsx
// types/user.ts
export interface User { id: string; name: string; email: string; role: Role; }
export type Role = "admin" | "user" | "moderator";

// Or derive from Zod schema
export type User = z.infer<typeof userSchema>;
```

### 3. `any` in Event Handlers

**Wrong:**
```tsx
function handleChange(e: any) {
  setName(e.target.value);
}
```

**Fix:**
```tsx
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  setName(e.target.value);
}
```

### 4. Type Assertions Over Type Guards

**Wrong:**
```tsx
const user = data as User; // No runtime check — crashes if data isn't a User
```

**Fix:**
```tsx
// Type guard — runtime check + type narrowing
function isUser(data: unknown): data is User {
  return typeof data === "object" && data !== null && "id" in data && "email" in data;
}

if (isUser(data)) {
  console.log(data.email); // Safe
}

// Or use Zod
const user = userSchema.parse(data); // Runtime validated
```

### 5. Not Using `strict: true`

**Wrong:**
```json
{
  "compilerOptions": {
    "strict": false
  }
}
```

**Fix:** Always enable strict mode. It catches entire categories of bugs:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 6. Duplicate Types and Schemas

**Wrong:**
```tsx
// types/user.ts
interface User { name: string; email: string; }

// validations/user.ts
const userSchema = z.object({ name: z.string(), email: z.string().email() });
// These can drift apart
```

**Fix:** Single source of truth with Zod:
```tsx
const userSchema = z.object({ name: z.string(), email: z.string().email() });
type User = z.infer<typeof userSchema>;
```

### 7. Using React.FC

**Wrong:**
```tsx
const Button: React.FC<ButtonProps> = ({ children }) => {
  return <button>{children}</button>;
};
```

`React.FC` was removed from Create React App templates. It adds implicit `children` (old behavior), doesn't support generics well, and provides no real benefit.

**Fix:**
```tsx
function Button({ children }: ButtonProps) {
  return <button>{children}</button>;
}
```

### 8. Not Using `satisfies`

**Wrong:**
```tsx
const config: Config = { ... }; // Widens the type — loses literal types
```

**Fix:**
```tsx
const config = { ... } satisfies Config; // Validates AND preserves literal types
```

`satisfies` checks that the value matches the type without widening it. You keep autocomplete for literal values.

### 9. No `noUncheckedIndexedAccess`

**Wrong:**
```tsx
const item = items[0]; // Type: Item (but could be undefined!)
item.name; // Runtime crash if items is empty
```

**Fix:** Enable `noUncheckedIndexedAccess` in tsconfig:
```tsx
const item = items[0]; // Type: Item | undefined
if (item) {
  item.name; // Safe — narrowed
}
```

### 10. Unnecessary Generics

**Wrong:**
```tsx
function getLength<T extends { length: number }>(arr: T): number {
  return arr.length;
}
```

**Fix:** Don't use generics when you don't need the type parameter elsewhere:
```tsx
function getLength(arr: { length: number }): number {
  return arr.length;
}
```

Use generics when the type parameter appears in multiple positions (input → output, or multiple inputs that must match).

---

> **See also:** [React Fundamentals](../React-Fundamentals/react-fundamentals.md) | [Component Patterns](../Component-Patterns/component-patterns.md) | [Forms & Validation](../Forms-Validation/forms-validation.md) | [Data Fetching](../Data-Fetching/data-fetching.md) | [Next.js Patterns](../Nextjs-Patterns/nextjs-patterns.md)
>
> **Last reviewed:** 2026-02
