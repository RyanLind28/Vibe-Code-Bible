# UX Patterns

> Common UI patterns for forms, navigation, modals, search, data display, and user flows. This guide provides repeatable, accessible patterns that keep interfaces consistent and users productive.

---

## Principles

### 1. Forms

**Progressive disclosure.** Show only the fields the user needs right now. Reveal additional fields based on prior input (e.g., show "Company name" only after selecting "Business account"). This reduces cognitive load and keeps completion rates high.

**Inline validation.** Validate on blur, not on every keystroke. Show errors next to the offending field with a clear description of what went wrong and how to fix it. Never use red alone to signal errors (pair with icons and text for accessibility). Validate format constraints client-side; validate business rules server-side.

**Smart defaults.** Pre-fill fields when you have context: locale-based country, detected timezone, previously used values. Default radio buttons and toggles to the most common choice. Smart defaults reduce effort and decision fatigue.

**Field grouping.** Group related fields visually with spacing, headings, or bordered sections. Name and address are separate groups. Payment and billing are separate groups. Logical grouping helps users build a mental model of the form's structure.

**Single-column layout.** Forms perform best in a single column. Multi-column layouts cause users to miss fields. The only exception is short, tightly related pairs like "First name / Last name" or "City / State / Zip."

**Clear primary action.** Every form needs exactly one primary submit button. It should be visually dominant. Secondary actions (Cancel, Reset) should be subdued. Never place destructive actions ("Delete account") next to the primary submit.

### 2. Navigation

**Top navigation** works best for apps with 3--7 top-level sections. It is immediately visible, familiar, and leaves the full viewport width for content. Reserve it for primary destinations.

**Sidebar navigation** suits apps with deep hierarchies, many sections, or tools the user switches between frequently (dashboards, admin panels, IDEs). Support collapsed/expanded states. Highlight the active item clearly.

**Breadcrumbs** show the user's position in a hierarchy and provide one-click access to parent levels. They are essential for e-commerce, documentation sites, and any app with more than two levels of nesting. Breadcrumbs supplement -- they never replace -- primary navigation.

**Tabs** group related content at the same level of hierarchy. Use tabs when the user needs to switch between views without leaving the page. Keep tab counts between 2 and 7. For more than 7, use a dropdown or scrollable tab bar.

**Command palette (Cmd+K / Ctrl+K)** provides keyboard-driven power-user navigation. It should search across pages, actions, and settings. Fuzzy matching, recent items, and categorized results make it effective. Every SaaS application should have one.

### 3. Modals and Dialogs

**When to use modals:**
- Confirmation of destructive or irreversible actions ("Delete this project?").
- Focused tasks that require 1--3 inputs and a decision (rename, share, invite).
- Interruptions that demand immediate attention (session expiry, unsaved changes).

**When NOT to use modals:**
- Displaying information the user may need to reference while continuing work. Use an inline expandable section or a side panel instead.
- Long forms with many fields. Use a dedicated page or a multi-step wizard.
- Stacking modals on top of modals. If you need a second modal, your UX is broken. Redesign the flow.

**Modal rules:**
- Always provide a clear close mechanism: X button, Escape key, clicking the backdrop.
- Trap focus inside the modal for accessibility.
- Return focus to the trigger element when the modal closes.
- Keep modal content concise. If it scrolls extensively, it should not be a modal.

Modern browsers provide the `<dialog>` element with `showModal()` which handles focus trapping, Escape-to-close, and backdrop automatically. Prefer native `<dialog>` over custom modal implementations. The Popover API (`popover` attribute) is appropriate for non-modal overlays like dropdowns and tooltips.

### 4. Search

**Instant search.** Show results as the user types with a debounce of 200--300ms. Display a loading indicator during the request. Highlight matching text in results.

**Filters.** Provide faceted filters alongside search results. Show active filters as removable chips. Allow combining filters with AND logic by default. Display result counts per filter value when possible.

**Autocomplete.** For search inputs, show up to 5--8 suggestions. Group suggestions by category (pages, users, actions). Support keyboard navigation (arrow keys + Enter). Highlight the matching portion of each suggestion.

**Search results patterns.** Show the total count. Highlight query terms in results. Provide sort options (relevance, date, alphabetical). Show empty state with suggestions when no results are found. Persist the query in the URL so users can share or bookmark searches.

### 5. Data Display

**Tables** are best for dense, structured, comparable data. Always include column headers. Support sorting on at least one column. Highlight rows on hover. For wide tables, pin the first column and allow horizontal scroll. Include a checkbox column for bulk actions.

**Cards** suit visual or heterogeneous content (products, profiles, projects). Use a consistent card size within a grid. Include a clear title, a supporting image or icon, and one primary action per card.

**Lists** work for sequential, scannable content (notifications, activity feeds, file listings). Each list item should have a clear primary label, optional metadata, and an action area on the right.

**Empty states** must never be blank. Show an illustration or icon, a headline explaining the state ("No projects yet"), a description of what the user can do, and a primary call-to-action button ("Create your first project").

**Loading states.** Use skeleton screens for initial page loads -- they feel faster than spinners. Use inline spinners for actions within an already-loaded page. Never block the entire UI for a partial data load.

**Error states.** Show a clear error message, the reason if known, and a recovery action (Retry button, link to support). For page-level errors, use a full-page error layout with navigation intact so the user is not stranded.

### 6. Feedback

**Toast notifications** are for transient, non-critical information: "Settings saved," "Item added to cart." Auto-dismiss after 4--6 seconds. Stack from the bottom-right (or top-right). Always include a manual dismiss button. Never use toasts for errors that require action.

**Inline messages** sit within the page content for contextual feedback: validation errors, warnings in forms, success confirmations on the same page. They persist until the condition changes.

**Progress indicators.** Use determinate progress bars when you can calculate completion (file upload, multi-step wizard). Use indeterminate indicators (spinners, pulsing bars) when duration is unknown. Always pair long operations (>3 seconds) with a textual status.

**Skeleton screens** mimic the page layout with gray placeholder shapes. They give the user an immediate sense of structure and feel faster than a blank page or spinner. Match the skeleton to the real layout closely.

### 7. Pagination vs Infinite Scroll vs "Load More"

| Pattern | Best for | Avoid when |
|---|---|---|
| **Pagination** | Tables, search results, any list the user may need to reference by page number or share a link to a specific page. | The user is casually browsing visual content. |
| **Infinite scroll** | Social feeds, image galleries, activity logs -- content the user consumes linearly. | The user needs to reach the footer, or needs to find a specific item by position. |
| **"Load More" button** | A middle ground: user-initiated loading without the disorientation of infinite scroll. Good for product listings and comment threads. | The dataset is small enough to show all at once. |

Always preserve scroll position on back-navigation. For infinite scroll, implement virtualization for performance (render only visible rows).

### 8. Progressive Disclosure

Reveal complexity gradually. Start with the simplest, most common options. Provide "Advanced" or "More options" toggles for power users. Use stepped wizards for complex creation flows. Collapse optional sections by default. Progressive disclosure reduces errors by limiting the number of decisions at each step.

### 9. Error Handling UX

**Prevent errors first.** Use input constraints (maxlength, type="email"), disable submit until the form is valid, confirm destructive actions, and auto-save work.

**Clear error messages.** Tell the user what went wrong in plain language. "Unable to save: file exceeds the 10 MB limit" is good. "Error 413" is not.

**Recovery paths.** Every error state should include at least one action the user can take: Retry, Go back, Contact support, or an alternative workflow. Never present a dead end.

**Optimistic UI.** For low-risk actions (starring an item, toggling a setting), update the UI immediately and reconcile with the server in the background. Roll back gracefully on failure with a brief toast.

### 10. Onboarding Flows

Onboarding is the user's first impression of your product. A good onboarding flow reduces time-to-value — the time between signup and the user's first "aha" moment.

**Patterns:**

- **Checklist onboarding:** A visible progress list of setup tasks (connect account, invite team, create first project). Users see what is done and what remains. Best for products with multiple setup steps.
- **Guided tour:** Tooltip-driven walkthrough that highlights key UI elements in sequence. Best for complex UIs where the user might not know where to look. Keep it to 3-5 steps maximum.
- **Empty state onboarding:** The empty state *is* the onboarding. Each empty page teaches the user what goes there and provides a CTA to create the first item. Best for simple products.
- **Progressive onboarding:** Do not front-load everything. Teach features contextually as the user encounters them for the first time (first time opening settings, first time inviting a teammate).

**Key principles:**
1. **Let users skip.** Never lock users in an onboarding flow. Provide a "Skip for now" or "I'll do this later" option on every step.
2. **Show progress.** A visible checklist or progress bar motivates completion.
3. **Celebrate completion.** A small celebration (confetti, checkmark animation, encouraging message) when the user finishes onboarding reinforces accomplishment.
4. **Persist state.** If the user leaves mid-onboarding, resume from where they left off.

### 11. Settings and Preferences Pages

Settings pages are where the user configures the product. They are deceptively complex — a poorly organized settings page makes users feel the product is complicated.

**Layout patterns:**

- **Grouped sections with a sidebar:** For apps with many settings (10+). A left sidebar lists categories (Profile, Notifications, Billing, Integrations), and the main area shows the selected group. Each group is a card or section with a clear heading.
- **Single scrolling page:** For apps with few settings (under 10). All settings on one page, grouped by category with section headings and adequate spacing.
- **Tabbed groups:** Settings organized into tabs (General, Advanced, Appearance). Good for moderate complexity.

**Key principles:**
1. **Group related settings.** Never present a flat list of 30 toggles. Categorize: Account, Notifications, Appearance, Privacy, Integrations.
2. **Use the right control for the data type.** Toggles for on/off. Radio groups for mutually exclusive options. Dropdowns for long lists. Text inputs for free-form values.
3. **Auto-save or explicit save?** Auto-save is better UX for most settings (with an inline "Saved" confirmation). Use explicit save (a button) only when changes are complex or dangerous (billing, security).
4. **Show current state clearly.** If notifications are off, the user should see that immediately — not have to open a sub-page.
5. **Dangerous settings need protection.** Account deletion, data export, and security changes should require confirmation and possibly re-authentication.

### 12. Drag-and-Drop Patterns

Drag-and-drop enables spatial rearrangement: reordering lists, organizing kanban boards, sorting items into categories. It is powerful but has significant accessibility concerns.

**Implementation guidelines:**

1. **Use a library.** Do not build drag-and-drop from scratch. Use `@dnd-kit/core` (React) or `SortableJS` for production-quality interactions including collision detection, drop animations, and accessibility.
2. **Always provide keyboard alternatives.** Every drag-and-drop interaction must be achievable via keyboard: select an item (Space/Enter), move it (Arrow keys), drop it (Space/Enter), cancel (Escape).
3. **Provide visible affordances.** A drag handle icon (six dots / grip icon) signals that an item is draggable. Do not rely on the user discovering that the entire row is draggable.
4. **Show drop targets.** During a drag, highlight valid drop zones with a visual indicator (colored border, background change, insertion line).
5. **Announce state changes.** Use `aria-live` regions to announce to screen readers: "Item picked up. Position 2 of 5." "Item moved. Now position 3 of 5." "Item dropped. Final position 3 of 5."
6. **Handle edge cases.** What happens when dragging to an empty list? When the list scrolls during drag? When the user drags outside the valid area?

### 13. Charts and Data Visualization

AI tools frequently generate inaccessible charts. Charts require special attention because they encode information visually.

**Key principles:**

1. **Use colorblind-safe palettes for categorical data.** Never rely on a default rainbow palette. Use palettes designed for color vision deficiency — IBM Design's categorical palette, Okabe-Ito, or a custom set tested with a CVD simulator. Limit categories to 6-8 per chart; beyond that, consider a different visualization.
2. **Never rely on color alone.** Pair colors with distinct patterns, shapes (different marker types), or direct labels. A bar chart with only color-coded bars is unreadable for colorblind users. Add value labels, a legend with shape indicators, or pattern fills.
3. **Provide text alternatives for all data.** Every chart must have a summary description (`aria-label` or `<figcaption>`). For critical data, provide an accessible data table as an alternative view (a toggle or expandable section below the chart). Screen readers cannot read SVG line charts.
4. **Label directly when possible.** Place labels on or near data points/bars instead of relying on a separate legend. Direct labeling reduces the cognitive load of cross-referencing between chart and legend.
5. **Use semantic elements.** Wrap charts in `<figure>` with a `<figcaption>`. If using SVG, include `role="img"` and `aria-label` on the SVG root.
6. **Interactive charts need keyboard support.** If users can hover data points for tooltips, those tooltips must also be accessible via keyboard focus (Tab to navigate points, visible tooltip on focus).

### 14. Preventing Duplicate Form Submissions

Users double-click submit buttons, especially on slow connections. Without protection, this creates duplicate records, double charges, or confusing errors.

**Pattern:**
1. **Disable the submit button immediately on click.** Replace the label with a loading state (spinner + "Saving...").
2. **Re-enable on completion or error.** If the request fails, restore the button so the user can retry.
3. **Use a request lock in the handler.** A boolean flag or AbortController prevents concurrent submissions even if the button disable is bypassed (e.g., Enter key).
4. **Server-side idempotency is the ultimate safeguard.** Client-side prevention is UX; server-side idempotency keys prevent actual duplicate operations.

```tsx
function SubmitButton({ label = "Save changes", form }: { label?: string; form?: string }) {
  const [pending, setPending] = useState(false);

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      // Submit logic here
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="submit"
      form={form}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={handleClick}
    >
      {pending ? (
        <>
          <Spinner size={16} aria-hidden="true" />
          Saving...
        </>
      ) : (
        label
      )}
    </button>
  );
}
```

### 15. Password Visibility Toggle

Password fields should include a toggle to show/hide the password. Users on mobile especially benefit — small keyboards cause frequent typos, and the ability to verify a password before submitting reduces errors.

**Requirements:**
1. **Default to hidden** (`type="password"`).
2. **Toggle button inside the input.** Use an eye/eye-off icon. The button must have `aria-label` that reflects the current state: "Show password" or "Hide password."
3. **Do not clear the input on toggle.** Switching between `type="password"` and `type="text"` must preserve the entered value.
4. **Announce state changes.** Use `aria-pressed` or update the `aria-label` so screen readers communicate the toggle state.
5. **Keep `autocomplete="current-password"` or `autocomplete="new-password"`** on the input regardless of visibility — password managers must still work.

### 16. Error Boundaries (Component Failure Isolation)

AI-generated code can fail at runtime in unexpected ways — a missing property, a null reference, a third-party API returning unexpected data. Without isolation, one failing component crashes the entire page.

**Pattern:** Wrap major UI sections in error boundary components that catch rendering errors, display a localized fallback, and keep the rest of the page functional.

**Key rules:**
1. **Wrap each major section independently.** The sidebar, main content, and each widget/card should have their own error boundary. A failing chart widget should not take down the navigation.
2. **Provide a useful fallback.** Show a "Something went wrong" message with a retry button — not a blank space or a full-page crash screen.
3. **Log the error.** Send the error to your monitoring service (Sentry, LogRocket, etc.) from the error boundary's `componentDidCatch` or equivalent.
4. **Include a retry mechanism.** A "Try again" button that resets the error boundary state and re-attempts rendering.

```tsx
// React Error Boundary with retry
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to monitoring service
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div role="alert" className="error-boundary-fallback">
            <p>Something went wrong in this section.</p>
            <button onClick={() => this.setState({ hasError: false })}>
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// Usage: wrap each major section
// <ErrorBoundary>
//   <DashboardChart />
// </ErrorBoundary>
// <ErrorBoundary>
//   <ActivityFeed />
// </ErrorBoundary>
```

---

## LLM Instructions

When an AI assistant is asked to design or implement UI/UX, follow these directives:

### Designing Form Flows

1. Inventory every field required for the task. Sort them into logical groups.
2. Determine which fields can be deferred (progressive disclosure) and which need smart defaults.
3. Build single-column layouts by default. Break multi-field forms into steps only when the form exceeds 8--10 fields.
4. Add inline validation rules for every field: required, format, min/max, and custom business rules.
5. Provide a clear progress indicator for multi-step forms (step count and current step label).
6. Always include keyboard navigation: Tab to advance, Shift+Tab to go back, Enter to submit.

### Implementing Navigation Patterns

1. Choose the navigation pattern based on information architecture: top nav for flat structures (3--7 items), sidebar for deep/wide structures, tabs for same-level content switching.
2. Always highlight the active route. For sidebars, expand the parent section of the active child item.
3. Implement breadcrumbs for any hierarchy deeper than two levels. Use structured data (`BreadcrumbList` schema) for SEO.
4. For power users, add a command palette (Cmd+K) that indexes all navigable routes and key actions.
5. Ensure all navigation is keyboard-accessible and announced properly by screen readers.

### Building Modal Systems

1. Use a centralized modal manager (context/provider pattern in React) so only one modal is open at a time.
2. Implement focus trapping: on open, move focus to the first interactive element; on close, return focus to the trigger.
3. Close on Escape key and backdrop click. For destructive confirmation modals, disable backdrop-click dismissal.
4. Add enter/exit animations (fade + scale) at 150--200ms with `ease-out` / `ease-in`.
5. Prevent body scroll when a modal is open (`overflow: hidden` on `<body>` or use a scroll-lock utility).

### Creating Search Interfaces

1. Place the search input prominently -- top of sidebar, center of top nav, or in the command palette.
2. Debounce input at 200--300ms. Show a loading spinner inside the input during requests.
3. Highlight matched text in results using `<mark>` elements.
4. Support keyboard navigation in the results dropdown: arrow keys to move, Enter to select, Escape to close.
5. Return structured results grouped by category (Pages, Users, Actions) for global search.
6. Persist the query as a URL parameter (`?q=term`) for shareability and back-button support.

### Handling Loading, Error, and Empty States

1. **Loading:** Use skeleton screens for page-level loads. Use inline spinners for component-level loads. Never leave the user staring at a blank page.
2. **Error:** Display a user-friendly message, the cause if determinable, and a recovery action. Log the technical error to the console or monitoring service.
3. **Empty:** Design dedicated empty states with an illustration, a headline, a description, and a CTA. Never show a blank table or list.
4. For asynchronous data, implement the state machine: `idle -> loading -> success | error`. Use discriminated unions or state enums, not boolean flags (`isLoading && !isError` is fragile).

### Designing Onboarding Flows

1. **Ask what the "aha" moment is.** Every onboarding flow should drive toward a specific first success: creating a project, sending a message, seeing data in a dashboard. Design the flow backward from that moment.
2. **Use the checklist pattern by default.** A visible, persistent checklist (sidebar or banner) with 3-5 setup tasks. Mark completed tasks with a checkmark. Show a progress percentage or fraction ("3 of 5 complete").
3. **Every step must be skippable.** Add "Skip" or "I'll do this later" to every onboarding step. Never trap the user.
4. **Empty states are onboarding.** When the user navigates to a section with no data, the empty state should teach what goes there and provide a CTA: "No projects yet. Create your first one."
5. **Persist onboarding state.** Store the checklist state (completed steps, dismissed state) in the database, not local state. If the user logs out and back in, they should see their progress.
6. **Celebrate completion.** Show a brief success animation or message when all onboarding tasks are complete. Then dismiss the checklist permanently.

### Implementing Accessible Drag-and-Drop

1. **Use `@dnd-kit/core` or `@dnd-kit/sortable` for React projects.** These libraries provide collision detection, keyboard sensor support, screen reader announcements, and drop animations out of the box.
2. **Always add a keyboard sensor.** Enable `KeyboardSensor` alongside `PointerSensor` and `TouchSensor`. Configure activation constraints to prevent accidental drags.
3. **Add `aria-roledescription="sortable"` to sortable items** and use `aria-describedby` to link usage instructions: "Press Space to pick up. Use Arrow keys to move. Press Space again to drop."
4. **Use `DragOverlay` for the dragged item's visual representation** — do not move the original DOM element, which disrupts screen reader context.
5. **Announce every state change.** Provide live region announcements: "Picked up [item name]. Current position: 2 of 5." "Moved to position 3 of 5." "Dropped at position 3 of 5." "Reorder cancelled."
6. **For non-sortable drag-and-drop** (e.g., kanban columns, file upload zones), provide a button-based alternative: a "Move to..." menu that lists valid destinations.

### Building Accessible Charts

1. **Use a colorblind-safe categorical palette.** Default palettes in most charting libraries are not CVD-safe. Use Okabe-Ito or a tested custom palette. Limit categories to 6-8 per chart.
2. **Never encode meaning with color alone.** Pair colors with distinct shapes (circle, square, triangle for scatter plots), patterns (hatched, dotted, solid for bar charts), or direct data labels.
3. **Wrap every chart in `<figure>` with `<figcaption>`.** Add `role="img"` and a descriptive `aria-label` to the SVG or canvas element summarizing the chart's key insight.
4. **Provide an accessible data table alternative.** Add a "View as table" toggle below the chart so screen reader users and users who prefer tabular data can access the same information.
5. **Make interactive charts keyboard-navigable.** If hovering data points shows tooltips, those must also appear on keyboard focus. Use `tabindex="0"` on focusable data points.

### Preventing Duplicate Submissions

1. **Disable the submit button immediately on click** and show a loading indicator (spinner + text like "Saving...").
2. **Set `aria-busy="true"` on the button** during submission so screen readers announce the busy state.
3. **Re-enable on completion or error.** On success, navigate or show confirmation. On error, restore the button and show the error.
4. **Use a request lock in the handler** (boolean flag or AbortController) to prevent Enter key or double-click bypassing the disabled state.

### Implementing Error Boundaries

1. **Wrap each major UI section in an error boundary** — sidebar, main content area, individual widgets or cards. Never use a single boundary for the entire app.
2. **Display a localized fallback** with a "Try again" button that resets the boundary state. The fallback should match the layout dimensions of the failed component to avoid layout shift.
3. **Log errors to a monitoring service** from the boundary's catch handler.
4. **For Next.js App Router projects**, use `error.tsx` files at the route segment level for the same isolation pattern.

### Designing Notification Systems

1. Use a notification provider at the app root. Expose an `addToast(message, type, options)` API via context or a global function.
2. Support four types: `success`, `error`, `warning`, `info`. Each has a distinct color and icon.
3. Auto-dismiss success and info toasts after 5 seconds. Do not auto-dismiss error toasts.
4. Stack toasts vertically with a gap. Limit to 3--5 visible toasts; queue the rest.
5. Animate entrance (slide-in from edge) and exit (fade-out) at 200--300ms.
6. Include a progress bar that counts down the auto-dismiss timer so the user knows how long the toast will stay.

---

## Examples

### 1. Multi-Step Form with Validation and Progress Indicator (React)

```tsx
import { useState } from "react";

type StepProps = {
  onNext: (data: Record<string, string>) => void;
  onBack?: () => void;
};

// --- Step 1: Account info ---
function StepAccount({ onNext }: StepProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address.";
    if (password.length < 8) errs.password = "Password must be at least 8 characters.";
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onNext({ email, password });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <fieldset>
        <legend>Account Information</legend>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => {
            const errs: Record<string, string> = {};
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address.";
            setErrors((prev) => ({ ...prev, ...errs }));
          }}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="field-error">
            {errors.email}
          </p>
        )}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => {
            const errs: Record<string, string> = {};
            if (password.length < 8) errs.password = "Password must be at least 8 characters.";
            setErrors((prev) => ({ ...prev, ...errs }));
          }}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password && (
          <p id="password-error" role="alert" className="field-error">
            {errors.password}
          </p>
        )}
      </fieldset>

      <button type="submit">Next</button>
    </form>
  );
}

// --- Step 2: Profile info ---
function StepProfile({ onNext, onBack }: StepProps) {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onNext({ name });
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset>
        <legend>Profile</legend>
        <label htmlFor="name">Full Name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </fieldset>
      <div className="button-group">
        <button type="button" onClick={onBack} className="btn-secondary">
          Back
        </button>
        <button type="submit">Next</button>
      </div>
    </form>
  );
}

// --- Step 3: Confirmation ---
function StepConfirm({
  data,
  onBack,
  onSubmit,
}: {
  data: Record<string, string>;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <h3>Confirm your details</h3>
      <dl>
        <dt>Email</dt>
        <dd>{data.email}</dd>
        <dt>Name</dt>
        <dd>{data.name}</dd>
      </dl>
      <div className="button-group">
        <button type="button" onClick={onBack} className="btn-secondary">
          Back
        </button>
        <button type="button" onClick={onSubmit}>
          Create Account
        </button>
      </div>
    </div>
  );
}

// --- Progress indicator ---
function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = ["Account", "Profile", "Confirm"];
  return (
    <nav aria-label="Form progress">
      <ol className="progress-steps">
        {steps.map((label, i) => (
          <li
            key={label}
            className={
              i < currentStep ? "completed" : i === currentStep ? "active" : ""
            }
            aria-current={i === currentStep ? "step" : undefined}
          >
            <span className="step-number">{i + 1}</span>
            <span className="step-label">{label}</span>
          </li>
        ))}
      </ol>
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
      >
        <div
          className="progress-fill"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>
    </nav>
  );
}

// --- Wizard container ---
export default function SignupWizard() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});

  function handleNext(data: Record<string, string>) {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  function handleSubmit() {
    // POST formData to API
    console.log("Submitting:", formData);
  }

  return (
    <div className="wizard" role="region" aria-label="Sign up">
      <ProgressBar currentStep={step} totalSteps={3} />
      {step === 0 && <StepAccount onNext={handleNext} />}
      {step === 1 && <StepProfile onNext={handleNext} onBack={handleBack} />}
      {step === 2 && (
        <StepConfirm data={formData} onBack={handleBack} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
```

**Why this works:**
- Each step has focused fields (progressive disclosure).
- Inline validation on blur with accessible `aria-invalid` and `aria-describedby`.
- A visible progress bar with `role="progressbar"` and step labels.
- Back/Next navigation so the user never feels trapped.
- Data accumulates in state across steps and is submitted once at the end.

---

### 2. Command Palette (Cmd+K) Component

```tsx
import { useState, useEffect, useRef, useMemo } from "react";

type CommandItem = {
  id: string;
  label: string;
  category: string;
  icon?: string;
  action: () => void;
  keywords?: string[];
};

type CommandPaletteProps = {
  commands: CommandItem[];
};

export function CommandPalette({ commands }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Substring filter
  const filtered = useMemo(() => {
    if (!query) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.category.toLowerCase().includes(lower) ||
        cmd.keywords?.some((k) => k.toLowerCase().includes(lower))
    );
  }, [query, commands]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [filtered]);

  // Flatten for index-based keyboard navigation
  const flatList = useMemo(() => filtered, [filtered]);

  function execute(item: CommandItem) {
    setOpen(false);
    item.action();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatList.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (flatList[activeIndex]) execute(flatList[activeIndex]);
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  let itemIndex = -1;

  return (
    <div className="command-backdrop" onClick={() => setOpen(false)}>
      <div
        className="command-palette"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          className="command-input"
          placeholder="Type a command..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded
          aria-controls="command-list"
          aria-activedescendant={
            flatList[activeIndex] ? `cmd-${flatList[activeIndex].id}` : undefined
          }
        />
        <ul id="command-list" ref={listRef} role="listbox" className="command-list">
          {[...grouped.entries()].map(([category, items]) => (
            <li key={category} role="presentation">
              <span className="command-category">{category}</span>
              <ul role="group" aria-label={category}>
                {items.map((item) => {
                  itemIndex++;
                  const isActive = itemIndex === activeIndex;
                  const idx = itemIndex; // capture for closure
                  return (
                    <li
                      key={item.id}
                      id={`cmd-${item.id}`}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      className={`command-item ${isActive ? "active" : ""}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => execute(item)}
                    >
                      {item.icon && <span className="command-icon">{item.icon}</span>}
                      <span className="command-label">{item.label}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
          {flatList.length === 0 && (
            <li className="command-empty" role="presentation">
              No results for "{query}"
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
```

**Why this works:**
- Global `Cmd+K` / `Ctrl+K` listener toggles the palette.
- Substring filtering across label, category, and keywords.
- Results grouped by category for quick scanning.
- Full keyboard navigation: Arrow keys, Enter to execute, Escape to close.
- Proper ARIA roles: `combobox`, `listbox`, `option`, `aria-activedescendant`.
- Click-outside closes the palette.

---

### 3. Data Table with Sorting, Filtering, and Empty/Loading/Error States

```tsx
import { useState, useMemo } from "react";

type User = { id: number; name: string; email: string; role: string; status: string };
type SortDir = "asc" | "desc";
type DataState = { status: "loading" } | { status: "error"; message: string } | { status: "success"; data: User[] };

function DataTable({ state }: { state: DataState }) {
  const [sortKey, setSortKey] = useState<keyof User>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filter, setFilter] = useState("");

  function toggleSort(key: keyof User) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const processed = useMemo(() => {
    if (state.status !== "success") return [];
    let rows = [...state.data];
    if (filter) {
      const lower = filter.toLowerCase();
      rows = rows.filter(
        (u) =>
          u.name.toLowerCase().includes(lower) ||
          u.email.toLowerCase().includes(lower) ||
          u.role.toLowerCase().includes(lower)
      );
    }
    rows.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [state, sortKey, sortDir, filter]);

  // --- Loading state ---
  if (state.status === "loading") {
    return (
      <div className="table-container">
        <table aria-label="Users">
          <thead>
            <tr>
              {["Name", "Email", "Role", "Status"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="skeleton-row">
                <td><div className="skeleton skeleton-text" /></td>
                <td><div className="skeleton skeleton-text" /></td>
                <td><div className="skeleton skeleton-text" /></td>
                <td><div className="skeleton skeleton-text" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // --- Error state ---
  if (state.status === "error") {
    return (
      <div className="table-error" role="alert">
        <svg aria-hidden="true" className="error-icon" viewBox="0 0 20 20" width="48" height="48">
          <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          <text x="10" y="14" textAnchor="middle" fontSize="14" fill="currentColor">!</text>
        </svg>
        <h3>Unable to load users</h3>
        <p>{state.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // --- Empty state ---
  if (processed.length === 0 && !filter) {
    return (
      <div className="table-empty">
        <svg aria-hidden="true" viewBox="0 0 64 64" width="64" height="64" className="empty-icon">
          <rect x="8" y="16" width="48" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="20" y1="28" x2="44" y2="28" stroke="currentColor" strokeWidth="2" />
          <line x1="20" y1="36" x2="36" y2="36" stroke="currentColor" strokeWidth="2" />
        </svg>
        <h3>No users yet</h3>
        <p>Invite your first team member to get started.</p>
        <button>Invite User</button>
      </div>
    );
  }

  // --- Data loaded ---
  const columns: { key: keyof User; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="table-container">
      <div className="table-toolbar">
        <input
          type="search"
          placeholder="Filter users..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter users"
        />
        <span className="result-count">{processed.length} users</span>
      </div>
      <table aria-label="Users">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                aria-sort={
                  sortKey === col.key
                    ? sortDir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <button
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  aria-label={`Sort by ${col.label.toLowerCase()}`}
                  style={{ cursor: "pointer" }}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span aria-hidden="true">{sortDir === "asc" ? " \u2191" : " \u2193"}</span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processed.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <span className={`status-badge status-${user.status.toLowerCase()}`}>
                  {user.status}
                </span>
              </td>
            </tr>
          ))}
          {processed.length === 0 && filter && (
            <tr>
              <td colSpan={4} className="no-results">
                No users match "{filter}".{" "}
                <button className="btn-link" onClick={() => setFilter("")}>
                  Clear filter
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

**Why this works:**
- Explicit state machine (`loading | error | success`) prevents impossible states.
- Skeleton rows during loading match the final table layout for a seamless transition.
- Error state includes a clear message and a Retry action.
- Empty state encourages the user to take the first step.
- Sorting uses `aria-sort` for accessibility.
- Filter with result count and a clear-filter link when no matches are found.

---

### 4. Toast Notification System

```tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

// --- Types ---
type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number; // ms, 0 = no auto-dismiss
  createdAt: number;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

// --- Provider ---
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration?: number) => {
      const id = crypto.randomUUID();
      // Errors do not auto-dismiss by default
      const dur = duration ?? (type === "error" ? 0 : 5000);
      setToasts((prev) => [...prev.slice(-4), { id, type, message, duration: dur, createdAt: Date.now() }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// --- Individual toast ---
const ICONS: Record<ToastType, string> = {
  success: "\u2713",
  error: "\u2717",
  warning: "\u26A0",
  info: "\u2139",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300); // match CSS exit animation duration
  }, [toast.id, onDismiss]);

  useEffect(() => {
    if (toast.duration > 0) {
      timerRef.current = setTimeout(dismiss, toast.duration);
    }
    return () => clearTimeout(timerRef.current);
  }, [toast.duration, dismiss]);

  return (
    <div
      className={`toast toast-${toast.type} ${exiting ? "toast-exit" : "toast-enter"}`}
      role="status"
    >
      <span className="toast-icon" aria-hidden="true">
        {ICONS[toast.type]}
      </span>
      <p className="toast-message">{toast.message}</p>
      {toast.duration > 0 && (
        <div className="toast-timer">
          <div
            className="toast-timer-bar"
            style={{ animationDuration: `${toast.duration}ms` }}
          />
        </div>
      )}
      <button
        className="toast-close"
        onClick={dismiss}
        aria-label="Dismiss notification"
      >
        &times;
      </button>
    </div>
  );
}

/* --- Supporting CSS ---
.toast-container {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 9999;
  max-width: 24rem;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
  overflow: hidden;
}

.toast-success { background: #16a34a; }
.toast-error   { background: #dc2626; }
.toast-warning { background: #d97706; }
.toast-info    { background: #2563eb; }

.toast-enter {
  animation: toast-slide-in 300ms ease-out;
}

.toast-exit {
  animation: toast-fade-out 300ms ease-in forwards;
}

@keyframes toast-slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}

@keyframes toast-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; transform: translateY(-0.5rem); }
}

.toast-timer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
}

.toast-timer-bar {
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  animation: timer-shrink linear forwards;
}

@keyframes timer-shrink {
  from { width: 100%; }
  to   { width: 0%; }
}
*/
```

**Why this works:**
- Context-based provider makes `addToast` available anywhere in the component tree.
- Four distinct types with semantic colors and icons.
- Error toasts persist until manually dismissed; other types auto-dismiss.
- Enter animation (slide-in) and exit animation (fade-out) at 300ms.
- Progress bar visually counts down the auto-dismiss timer.
- `aria-live="polite"` announces toasts to screen readers.
- Limits visible toasts to 5 to avoid overwhelming the screen.

---

### 5. Onboarding Checklist Component (React)

```tsx
import { useState } from "react";
import { CheckCircle2, Circle, ChevronRight, X } from "lucide-react";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: () => void;
  actionLabel: string;
};

type OnboardingChecklistProps = {
  steps: OnboardingStep[];
  onDismiss: () => void;
};

export function OnboardingChecklist({ steps, onDismiss }: OnboardingChecklistProps) {
  const [expanded, setExpanded] = useState(true);
  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allComplete = completedCount === steps.length;

  if (allComplete) {
    return (
      <div className="onboarding-complete" role="status">
        <CheckCircle2 className="onboarding-complete-icon" aria-hidden="true" />
        <p className="onboarding-complete-title">You're all set!</p>
        <p className="onboarding-complete-desc">
          You've completed setup. You can always revisit settings later.
        </p>
        <button className="onboarding-dismiss-btn" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="onboarding-checklist" role="region" aria-label="Setup checklist">
      {/* Header */}
      <div className="onboarding-header">
        <div>
          <h3 className="onboarding-title">Get started</h3>
          <p className="onboarding-progress-text">
            {completedCount} of {steps.length} complete
          </p>
        </div>
        <button
          className="onboarding-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse checklist" : "Expand checklist"}
        >
          {expanded ? <X size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="onboarding-progress-track"
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={steps.length}
      >
        <div
          className="onboarding-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      {expanded && (
        <ul className="onboarding-steps">
          {steps.map((step) => (
            <li key={step.id} className="onboarding-step">
              <span className="onboarding-step-icon" aria-hidden="true">
                {step.completed ? (
                  <CheckCircle2 size={20} className="step-done" />
                ) : (
                  <Circle size={20} className="step-pending" />
                )}
              </span>
              <div className="onboarding-step-content">
                <p className={`onboarding-step-title ${step.completed ? "completed" : ""}`}>
                  {step.title}
                </p>
                {!step.completed && (
                  <>
                    <p className="onboarding-step-desc">{step.description}</p>
                    <button
                      className="onboarding-step-action"
                      onClick={step.action}
                    >
                      {step.actionLabel}
                      <ChevronRight size={14} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Usage:
// <OnboardingChecklist
//   steps={[
//     {
//       id: "profile",
//       title: "Complete your profile",
//       description: "Add your name and avatar so your team can recognize you.",
//       completed: true,
//       action: () => navigate("/settings/profile"),
//       actionLabel: "Edit profile",
//     },
//     {
//       id: "invite",
//       title: "Invite your team",
//       description: "Collaboration works best with others. Invite at least one teammate.",
//       completed: false,
//       action: () => navigate("/settings/team"),
//       actionLabel: "Invite teammates",
//     },
//     {
//       id: "project",
//       title: "Create your first project",
//       description: "Start organizing your work with a new project.",
//       completed: false,
//       action: () => openNewProjectModal(),
//       actionLabel: "New project",
//     },
//   ]}
//   onDismiss={() => markOnboardingDismissed()}
// />
```

**Why this works:**
- Visible progress bar and count motivate completion.
- Completed steps collapse to just a title with a checkmark, keeping the list scannable.
- Incomplete steps show a description and a clear CTA button.
- The checklist is collapsible (users can minimize it) and dismissable (after completion or manually).
- `role="progressbar"` and `aria-expanded` provide accessibility.
- When all steps are complete, a success state replaces the checklist.

---

### 6. Settings Page Layout (React + CSS)

```tsx
import { useState } from "react";
import { User, Bell, Palette, Shield, Plug } from "lucide-react";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
  { id: "integrations", label: "Integrations", icon: Plug },
] as const;

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string>("profile");

  return (
    <div className="settings-layout">
      {/* Sidebar — visible on desktop, tabs on mobile */}
      <nav className="settings-nav" aria-label="Settings sections">
        <ul className="settings-nav-list">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                className={`settings-nav-item ${activeSection === id ? "active" : ""}`}
                onClick={() => setActiveSection(id)}
                aria-current={activeSection === id ? "page" : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Content */}
      <main className="settings-content">
        {activeSection === "profile" && <ProfileSection />}
        {activeSection === "notifications" && <NotificationSection />}
        {/* ...other sections */}
      </main>
    </div>
  );
}

function ProfileSection() {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    // API call here
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section aria-labelledby="profile-heading">
      <h2 id="profile-heading" className="settings-heading">Profile</h2>
      <p className="settings-description">
        Your profile information is visible to your team members.
      </p>

      <div className="settings-card">
        <div className="settings-field">
          <label htmlFor="display-name" className="settings-label">
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            className="settings-input"
            defaultValue="Jane Smith"
          />
        </div>

        <div className="settings-field">
          <label htmlFor="email" className="settings-label">Email</label>
          <input
            id="email"
            type="email"
            className="settings-input"
            defaultValue="jane@example.com"
          />
        </div>

        <div className="settings-actions">
          <button className="btn-primary" onClick={handleSave}>
            {saved ? "Saved!" : "Save changes"}
          </button>
        </div>
      </div>
    </section>
  );
}
```

```css
/* Settings page layout */
.settings-layout {
  display: flex;
  flex-direction: column;
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
  gap: 2rem;
}

/* Mobile: horizontal scrollable tabs */
.settings-nav-list {
  display: flex;
  gap: 0.25rem;
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  min-height: 44px;
}

.settings-nav-item:hover {
  background: var(--color-bg-muted);
}

.settings-nav-item.active {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

/* Desktop: vertical sidebar */
@media (min-width: 768px) {
  .settings-layout {
    flex-direction: row;
    gap: 3rem;
  }

  .settings-nav {
    flex-shrink: 0;
    width: 200px;
    position: sticky;
    top: 2rem;
    align-self: flex-start;
  }

  .settings-nav-list {
    flex-direction: column;
    overflow-x: visible;
  }
}

.settings-content {
  flex: 1;
  min-width: 0;
}

.settings-heading {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.settings-description {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
}

.settings-card {
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 12px);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.settings-label {
  font-size: 0.875rem;
  font-weight: 500;
}

.settings-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 12px);
  font-size: 1rem;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.5rem;
}
```

**Why this works:**
- Mobile: horizontal scrollable tabs keep all sections accessible in the thumb zone.
- Desktop: vertical sidebar with sticky positioning.
- Section headings with descriptions give context for each settings group.
- Grouped into cards for visual separation.
- Inline "Saved!" feedback replaces the button text temporarily — no toast needed for simple saves.

---

## Common Mistakes

| Mistake | Why it is a problem | Fix |
|---|---|---|
| Validating every keystroke | Shows errors before the user has finished typing, causing frustration and distraction. | Validate on blur. Only show errors after the field loses focus. |
| Using modals for long forms | Modals are for quick decisions, not 10-field forms. Users cannot reference other page content while the modal is open. | Use a dedicated page or a multi-step wizard for complex forms. |
| No empty state | A blank table or list confuses users. They cannot tell if the page is broken or if there is simply no data. | Design a dedicated empty state with a headline, description, and CTA. |
| Spinners for initial page loads | A spinner on a blank page feels slow and provides no spatial context. | Use skeleton screens that match the final layout. |
| Auto-dismissing error toasts | The user may not read the error in time. Errors require acknowledgment. | Only auto-dismiss success and info toasts. Keep error toasts until the user manually dismisses them. |
| Stacking modals | Opening a modal from within a modal creates a confusing, inaccessible z-index and focus nightmare. | Redesign the flow to avoid nested modals. Use inline content or step-based approaches inside a single modal. |
| No keyboard support in search/command palette | Power users and users relying on assistive technology cannot use the feature. | Implement arrow key navigation, Enter to select, Escape to close, and proper ARIA roles. |
| Infinite scroll without virtualization | Rendering thousands of DOM nodes causes the page to slow to a crawl as the user scrolls. | Use windowing libraries (react-window, @tanstack/virtual) to render only visible rows. |
| Using `isLoading` + `isError` booleans | `isLoading && !isError` is fragile. You can accidentally end up in `isLoading === true && isError === true`. | Model state as a discriminated union: `"idle" \| "loading" \| "success" \| "error"`. |
| Navigation with no active state indicator | Users cannot tell where they are in the app. | Always highlight the active nav item with a distinct background, border, or text color. |
| Destructive actions without confirmation | One accidental click deletes data permanently. | Always require a confirmation dialog for irreversible actions. Use "type the name to confirm" for high-impact deletions. |
| Toast notifications for critical errors | Toasts are transient and can be missed. Critical errors need persistent, prominent placement. | Use inline error messages or full-page error states for critical issues. Reserve toasts for transient feedback. |

---

> **See also:** [Accessibility](../Accessibility/accessibility.md) | [Design-Systems](../Design-Systems/design-systems.md) | [Mobile-First](../Mobile-First/mobile-first.md) | [Animation-Motion](../Animation-Motion/animation-motion.md) | [Typography-Color](../Typography-Color/typography-color.md)
>
> **Last reviewed:** 2026-02
