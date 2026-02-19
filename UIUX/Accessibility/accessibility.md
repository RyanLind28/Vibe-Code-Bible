# Web Accessibility (a11y)

> Accessibility is not a feature you add at the end. It is a quality of software that determines whether your product works for everyone or only for people who hold the mouse with their right hand, have 20/20 vision, and never use a keyboard. One billion people worldwide live with a disability. Building accessible interfaces is not charity — it is engineering competence.

---

## Principles

### 1. WCAG 2.2 Overview

The Web Content Accessibility Guidelines (WCAG) are the international standard for web accessibility. WCAG defines three conformance levels:

| Level | Description | Target? |
|-------|-------------|---------|
| **A** | Bare minimum. Removes the most severe barriers. | Mandatory baseline |
| **AA** | Addresses the most common barriers for the widest range of users. | **Yes — this is the standard target.** Most laws reference AA. |
| **AAA** | Highest level. Not always achievable for all content, but ideal for critical flows. | Aspirational for key pages |

WCAG 2.2 (published October 2023) added criteria focused on authentication, dragging alternatives, and target size minimums. Always reference the latest version.

### 2. The Four POUR Principles

Every WCAG criterion maps to one of four principles:

**Perceivable** — Users must be able to perceive the content.
- Provide text alternatives for non-text content (alt text, captions, transcripts).
- Ensure sufficient color contrast.
- Do not rely on color alone to convey information.
- Support text resizing up to 200% without loss of content or functionality.

**Operable** — Users must be able to operate the interface.
- All functionality must be available via keyboard.
- Provide enough time to read and interact with content.
- Do not design content that causes seizures (no flashing more than 3 times per second).
- Provide clear navigation mechanisms and skip links.

**Understandable** — Users must be able to understand the content and interface behavior.
- Use clear, plain language.
- Make form behavior predictable (no unexpected context changes on input).
- Provide input assistance: labels, instructions, error identification, and suggestions.

**Robust** — Content must be robust enough to work with current and future technologies.
- Use valid, semantic HTML.
- Ensure compatibility with assistive technologies (screen readers, switch devices, voice control).
- Name, role, and value of all UI components must be programmatically determinable.

### 3. Semantic HTML as the Foundation

The single most impactful accessibility practice is using the correct HTML elements. Native HTML elements carry built-in semantics, keyboard behavior, and ARIA roles that custom `<div>`-based widgets must manually replicate.

| Instead of... | Use... | Why |
|---------------|--------|-----|
| `<div onclick>` | `<button>` | Keyboard focusable, Enter/Space activation, implicit `role="button"` |
| `<div class="link">` | `<a href>` | Keyboard focusable, screen reader announces as link, right-click/open-in-new-tab works |
| `<div class="input">` | `<input>` | Native form participation, validation, autocomplete, screen reader label association |
| `<div class="header">` | `<header>`, `<h1>`-`<h6>` | Screen reader navigation by landmarks and heading levels |
| `<div class="list">` | `<ul>`, `<ol>`, `<li>` | Screen reader announces "list, 5 items" and allows item-by-item navigation |
| `<div class="table">` | `<table>`, `<thead>`, `<th>` | Screen reader announces row/column headers when navigating cells |
| `<div class="nav">` | `<nav>` | Screen reader landmark navigation; announced as "navigation" |

**Rule:** If a native HTML element does what you need, use it. Never recreate browser functionality with JavaScript when HTML provides it for free.

### 4. ARIA: When and How to Use It

ARIA (Accessible Rich Internet Applications) extends HTML semantics for complex widgets that have no native HTML equivalent: tabs, accordions, tree views, comboboxes, live regions.

**The five rules of ARIA:**

1. **Do not use ARIA if native HTML works.** A `<button>` is always better than `<div role="button" tabindex="0">`.
2. **Do not change native semantics.** Do not put `role="button"` on a `<h2>`. If it must be clickable, nest a `<button>` inside the heading.
3. **All interactive ARIA controls must be keyboard operable.** Adding `role="tab"` without arrow key navigation is a lie to assistive technology.
4. **Do not use `role="presentation"` or `aria-hidden="true"` on focusable elements.** Hiding something from the accessibility tree while it remains focusable creates a trap.
5. **All interactive elements must have an accessible name.** Use visible labels, `aria-label`, or `aria-labelledby`.

**Common ARIA patterns:**

| Widget | Key ARIA attributes |
|--------|---------------------|
| Dialog/Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| Tabs | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls` |
| Accordion | `aria-expanded`, `aria-controls`, heading + button pattern |
| Combobox | `role="combobox"`, `aria-expanded`, `aria-activedescendant`, `role="listbox"` |
| Live region | `aria-live="polite"` or `aria-live="assertive"`, `role="status"`, `role="alert"` |
| Progress | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |

### 5. Keyboard Navigation

Every interactive element must be reachable and operable via keyboard alone. Many users cannot use a mouse — including people with motor disabilities, power users, and anyone with a broken trackpad.

**Core keyboard patterns:**

- **Tab / Shift+Tab** moves focus between interactive elements in DOM order.
- **Enter / Space** activates buttons and links.
- **Arrow keys** navigate within composite widgets (tabs, menus, radio groups, listboxes).
- **Escape** closes modals, popups, and dropdowns.
- **Home / End** jumps to first/last item in a list or menu.

**Focus management rules:**

1. **Tab order must follow visual order.** If CSS reorders elements visually, update the DOM order or use `tabindex` carefully.
2. **Never use `tabindex` greater than 0.** It breaks natural tab order. Use `tabindex="0"` to make non-interactive elements focusable, and `tabindex="-1"` for programmatic focus only.
3. **Focus must be visible.** Never remove the focus outline (`outline: none`) without providing an equally visible replacement. The `:focus-visible` pseudo-class allows you to show focus rings only for keyboard users.
4. **Focus trapping in modals.** When a modal is open, Tab must cycle only within the modal. Focus must move to the modal on open and return to the trigger element on close.
5. **Manage focus on route changes in SPAs.** When the page content changes without a full reload, move focus to the new content or announce the change via a live region.

### 6. Color Contrast Requirements

WCAG defines minimum contrast ratios between text and its background:

| Element | Minimum contrast ratio (AA) | Enhanced (AAA) |
|---------|----------------------------|----------------|
| Normal text (< 18pt or < 14pt bold) | **4.5:1** | 7:1 |
| Large text (>= 18pt or >= 14pt bold) | **3:1** | 4.5:1 |
| UI components and graphical objects | **3:1** | N/A |
| Focus indicators | **3:1** against adjacent colors | N/A |

**Practical guidance:**

- Test every text/background combination with a contrast checker (browser DevTools, WebAIM Contrast Checker, or Figma plugins).
- Do not rely on color alone to convey information. A red error input must also have an icon, a text message, or a border change.
- Placeholder text in inputs is notoriously low contrast. If it carries important information, use a visible label instead.
- Disabled elements are exempt from contrast requirements, but consider keeping them readable anyway.

### 7. Screen Reader Testing and Common Patterns

Building for screen readers means building with semantic HTML and proper ARIA. Testing confirms that your intentions match reality.

**How to test:**

| Platform | Screen reader | How to activate |
|----------|--------------|-----------------|
| macOS / iOS | VoiceOver | Cmd+F5 (Mac), triple-click home/side button (iOS) |
| Windows | NVDA (free) | Download from nvaccess.org |
| Windows | JAWS (paid) | Industry standard in enterprise environments |
| Android | TalkBack | Settings > Accessibility > TalkBack |
| Chrome | Built-in accessibility inspector | DevTools > Elements > Accessibility tab |

**What to test:**

1. Can you navigate the entire page using only the Tab key?
2. Are all interactive elements announced with their name, role, and state?
3. Do headings form a logical hierarchy (h1 > h2 > h3)?
4. Are images announced with meaningful alt text (or hidden from the tree if decorative)?
5. Are form fields associated with their labels?
6. Are error messages announced when they appear?
7. Can you open, use, and close modal dialogs?
8. Are dynamic content updates announced via live regions?

### 8. Forms Accessibility

Forms are where accessibility failures cause the most real-world harm. An inaccessible form prevents users from signing up, checking out, or getting help.

**Requirements:**

- **Every input must have a visible `<label>` associated via `for`/`id` or by wrapping the input.** Placeholder text is not a label — it disappears on input and is often low contrast.
- **Required fields must be indicated** both visually and programmatically (`required` attribute or `aria-required="true"`).
- **Error messages must be associated with their input** via `aria-describedby` and announced to screen readers using `aria-live="polite"` or `role="alert"`.
- **Group related fields** with `<fieldset>` and `<legend>` (e.g., radio button groups, address sections).
- **Provide autocomplete attributes** (`autocomplete="email"`, `autocomplete="given-name"`) to help users fill forms faster and to support password managers.
- **Do not clear the form on error.** Preserve user input and focus the first field with an error.

### 9. Images and Alt Text Best Practices

Every `<img>` element must have an `alt` attribute. The content of that attribute depends on the image's purpose:

| Image type | Alt text approach | Example |
|------------|-------------------|---------|
| **Informative** | Describe the content and function | `alt="Bar chart showing Q4 revenue growth of 23%"` |
| **Decorative** | Empty alt attribute | `alt=""` (with `role="presentation"` optional) |
| **Functional** (inside a link/button) | Describe the action, not the image | `alt="Go to homepage"` (for a logo link) |
| **Complex** (charts, diagrams) | Brief alt + longer description nearby or via `aria-describedby` | `alt="Q4 revenue chart"` with a data table below |
| **Text in image** | Reproduce the text in alt | `alt="50% off all items this weekend"` |

**Rules:**

- Never write `alt="image"`, `alt="photo"`, or `alt="icon"`. These are meaningless.
- Do not start with "Image of..." or "Picture of..." — screen readers already announce it as an image.
- If an image is purely decorative (background pattern, visual flourish), use `alt=""` so screen readers skip it entirely.
- For CSS background images that carry meaning, provide a text alternative in the HTML or use `role="img"` with `aria-label`.

### 10. Legal Requirements

Accessibility is increasingly a legal obligation, not just a best practice.

| Regulation | Jurisdiction | Scope |
|------------|-------------|-------|
| **ADA** (Americans with Disabilities Act) | United States | Applies to "places of public accommodation" — courts have consistently ruled this includes websites. No explicit technical standard, but WCAG 2.1 AA is the de facto benchmark. |
| **Section 508** | United States | Applies to federal agencies and federally funded organizations. Requires WCAG 2.0 AA conformance. |
| **EAA** (European Accessibility Act) | European Union | Takes effect June 28, 2025. Requires digital products and services sold in the EU to meet accessibility standards (EN 301 549, which references WCAG 2.1 AA). |
| **AODA** | Ontario, Canada | Requires WCAG 2.0 AA for public sector and large organizations. |
| **EN 301 549** | European Union | The harmonized European standard for ICT accessibility. References WCAG 2.1 AA for web content. |

**Key takeaway:** If you target WCAG 2.2 AA, you meet the requirements of virtually every current accessibility law globally. The cost of retrofitting accessibility after a lawsuit or complaint is orders of magnitude higher than building it in from the start.

---

## LLM Instructions

```
You are a web accessibility specialist. When auditing, building, or reviewing UI code:

1. AUDIT PAGES FOR ACCESSIBILITY:
   - Check all images for meaningful alt text (or alt="" for decorative images).
   - Verify every form input has an associated <label> element (via for/id or wrapping).
   - Check color contrast ratios: 4.5:1 for normal text, 3:1 for large text and UI components.
   - Verify heading hierarchy is logical (h1 → h2 → h3, no skipped levels).
   - Confirm all interactive elements are reachable via keyboard (Tab) and activatable (Enter/Space).
   - Check for focus visibility — every focused element must have a visible indicator.
   - Verify that ARIA attributes are used correctly (valid roles, required properties present,
     states updating dynamically).
   - Check that dynamic content changes are announced via aria-live regions.
   - Test that modals trap focus and return focus to the trigger on close.
   - Verify skip navigation links exist and work.
   Output: A checklist with pass/fail status, severity (critical/major/minor), element reference,
   and specific fix instructions for each failure.

2. WRITE SEMANTIC HTML:
   - Use the most specific native HTML element for every purpose: <button> for actions,
     <a> for navigation, <nav> for navigation landmarks, <main> for primary content,
     <header>/<footer> for page/section headers and footers, <aside> for complementary content.
   - Structure headings hierarchically. Each page should have exactly one <h1>.
   - Use <ul>/<ol> for lists. Use <table> with <thead>, <th>, and scope attributes for data tables.
   - Use <fieldset> and <legend> to group related form controls.
   - Never use <div> or <span> for interactive elements.

3. IMPLEMENT ARIA CORRECTLY:
   - Follow the first rule of ARIA: do not use ARIA if a native HTML element provides the
     semantics and behavior you need.
   - For custom widgets (tabs, accordions, comboboxes, dialogs), implement the full ARIA
     Authoring Practices pattern including all required roles, properties, states, and
     keyboard interactions.
   - Always provide an accessible name for interactive elements: visible label, aria-label,
     or aria-labelledby.
   - Use aria-describedby to associate help text, error messages, and additional descriptions.
   - Use aria-live="polite" for non-urgent dynamic updates and aria-live="assertive" or
     role="alert" for errors and critical notifications.
   - Update aria-expanded, aria-selected, aria-checked, and aria-pressed dynamically as state changes.

4. HANDLE FOCUS MANAGEMENT:
   - When opening a modal/dialog, move focus to the first focusable element inside (or the
     dialog itself if it has a label).
   - Trap focus within the modal: Tab from the last focusable element cycles to the first,
     Shift+Tab from the first cycles to the last.
   - On closing a modal, return focus to the element that triggered it.
   - On SPA route changes, move focus to the new page's main heading or main content area.
   - Never use tabindex > 0. Use tabindex="0" for custom focusable elements and tabindex="-1"
     for elements that receive programmatic focus only.
   - Ensure focus order matches visual reading order.

5. CREATE ACCESSIBLE FORM PATTERNS:
   - Every input must have a visible, persistent <label> (not just a placeholder).
   - Mark required fields with the required attribute and indicate them visually
     (asterisk or "required" text).
   - Display inline error messages below the relevant field. Associate errors with their input
     using aria-describedby.
   - Use an aria-live="polite" region or role="alert" to announce error summaries to
     screen readers.
   - On form submission failure, move focus to the first field with an error or to an
     error summary at the top of the form.
   - Use autocomplete attributes for common fields (name, email, tel, address, cc-number).
   - Group related inputs (radio buttons, checkboxes, address fields) in a <fieldset>
     with a descriptive <legend>.

Output: Clean, semantic, accessible code with inline comments explaining accessibility
decisions. Include ARIA attributes, keyboard handling, and focus management. Flag any
areas where manual testing with a screen reader is recommended.
```

---

## Examples

### Example 1: Accessible Modal/Dialog Component

```tsx
// components/ui/dialog.tsx
"use client";

import React, { useId, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface DialogProps {
  /** Whether the dialog is currently open */
  open: boolean;
  /** Called when the dialog should close (Escape key, backdrop click, close button) */
  onClose: () => void;
  /** Accessible title for the dialog — required */
  title: string;
  /** Optional description displayed below the title */
  description?: string;
  /** Dialog content */
  children: React.ReactNode;
}

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  /* --------------------------------------------------
     FOCUS TRAP: Tab cycles within the dialog only.
     Shift+Tab from first element goes to last.
     Tab from last element goes to first.
     -------------------------------------------------- */
  const getFocusableElements = useCallback(() => {
    if (!dialogRef.current) return [];
    const selector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(", ");
    return Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(selector)
    );
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      /* Close on Escape */
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      /* Trap focus on Tab */
      if (e.key === "Tab") {
        const focusable = getFocusableElements();
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, getFocusableElements]
  );

  /* --------------------------------------------------
     On open: store previously focused element,
     move focus into the dialog.
     On close: restore focus to the trigger element.
     -------------------------------------------------- */
  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      document.addEventListener("keydown", handleKeyDown);

      // Focus the dialog container (or the first focusable element)
      requestAnimationFrame(() => {
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current?.focus();
        }
      });

      // Prevent background scrolling
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";

      // Restore focus to the element that opened the dialog
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [open, handleKeyDown, getFocusableElements]);

  const id = useId();
  if (!open) return null;

  const titleId = `${id}-title`;
  const descriptionId = description ? `${id}-description` : undefined;

  return createPortal(
    <>
      {/* Backdrop — clicking it closes the dialog */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl"
      >
        {/* Title — required for screen readers */}
        <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
          {title}
        </h2>

        {/* Description — optional */}
        {description && (
          <p id={descriptionId} className="mt-1 text-sm text-neutral-600">
            {description}
          </p>
        )}

        {/* Content */}
        <div className="mt-4">{children}</div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm p-1 text-neutral-400 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Close dialog"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </>,
    document.body
  );
}
```

**Usage:**

```tsx
function DeleteConfirmation() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Delete account</button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete account?"
        description="This action is permanent and cannot be undone."
      >
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setOpen(false)}>Cancel</button>
          <button onClick={handleDelete} className="bg-red-600 text-white rounded px-4 py-2">
            Yes, delete
          </button>
        </div>
      </Dialog>
    </>
  );
}
```

### Example 2: Accessible Form with Labels, Errors, and ARIA Live Regions

```tsx
// components/contact-form.tsx
"use client";

import React, { useState, useRef } from "react";

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export function ContactForm() {
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  function validate(formData: FormData): FormErrors {
    const errs: FormErrors = {};
    if (!formData.get("name")) errs.name = "Name is required.";
    const email = formData.get("email") as string;
    if (!email) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address.";
    }
    if (!formData.get("message")) errs.message = "Message is required.";
    return errs;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const validationErrors = validate(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitted(false);

      // Focus the error summary so screen readers announce it
      requestAnimationFrame(() => errorSummaryRef.current?.focus());

      return;
    }

    setErrors({});
    setSubmitted(true);
    // Submit to your API here
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Contact form">
      {/* -----------------------------------------------
          Error summary — announced to screen readers.
          Placed at the top of the form so keyboard users
          encounter it before the fields.
          ----------------------------------------------- */}
      {hasErrors && (
        <div
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          className="mb-6 rounded-md border border-red-300 bg-red-50 p-4"
        >
          <h2 className="text-sm font-semibold text-red-800">
            Please fix the following errors:
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-red-700">
            {errors.name && (
              <li>
                <a href="#name" className="underline">
                  {errors.name}
                </a>
              </li>
            )}
            {errors.email && (
              <li>
                <a href="#email" className="underline">
                  {errors.email}
                </a>
              </li>
            )}
            {errors.message && (
              <li>
                <a href="#message" className="underline">
                  {errors.message}
                </a>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* ---- Name field ---- */}
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-neutral-900">
          Name <span aria-hidden="true">*</span>
        </label>
        <input
          ref={nameRef}
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          aria-required="true"
          aria-invalid={errors.name ? "true" : undefined}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
            errors.name
              ? "border-red-500 focus:ring-red-500"
              : "border-neutral-300 focus:ring-blue-500"
          } focus:outline-none focus:ring-2`}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      {/* ---- Email field ---- */}
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-neutral-900">
          Email <span aria-hidden="true">*</span>
        </label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-required="true"
          aria-invalid={errors.email ? "true" : undefined}
          aria-describedby={errors.email ? "email-error email-hint" : "email-hint"}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
            errors.email
              ? "border-red-500 focus:ring-red-500"
              : "border-neutral-300 focus:ring-blue-500"
          } focus:outline-none focus:ring-2`}
        />
        <p id="email-hint" className="mt-1 text-xs text-neutral-500">
          We will never share your email.
        </p>
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600">
            {errors.email}
          </p>
        )}
      </div>

      {/* ---- Message field ---- */}
      <div className="mb-6">
        <label htmlFor="message" className="block text-sm font-medium text-neutral-900">
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          ref={messageRef}
          id="message"
          name="message"
          rows={4}
          required
          aria-required="true"
          aria-invalid={errors.message ? "true" : undefined}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
            errors.message
              ? "border-red-500 focus:ring-red-500"
              : "border-neutral-300 focus:ring-blue-500"
          } focus:outline-none focus:ring-2`}
        />
        {errors.message && (
          <p id="message-error" className="mt-1 text-sm text-red-600">
            {errors.message}
          </p>
        )}
      </div>

      {/* ---- Submit ---- */}
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Send message
      </button>

      {/* ---- Success announcement ---- */}
      {submitted && (
        <p className="mt-4 text-sm text-green-700" role="status" aria-live="polite">
          Your message has been sent successfully. We will respond within 24 hours.
        </p>
      )}
    </form>
  );
}
```

### Example 3: Skip Navigation Link Implementation

```html
<!--
  Skip navigation allows keyboard and screen reader users to bypass
  repetitive navigation and jump directly to the main content.

  It should be the FIRST focusable element in the DOM.
  It is visually hidden until focused, then slides into view.
-->

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Accessible Page</title>
  <style>
    /* Skip link: visually hidden by default, visible on focus */
    .skip-link {
      position: absolute;
      top: -100%;
      left: 16px;
      z-index: 9999;
      padding: 8px 16px;
      background-color: #1e40af;
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      border-radius: 0 0 6px 6px;
      transition: top 0.2s ease;
    }

    .skip-link:focus {
      top: 0;
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
  </style>
</head>
<body>
  <!-- Skip link — first element in the DOM -->
  <a href="#main-content" class="skip-link">
    Skip to main content
  </a>

  <!-- Navigation -->
  <header>
    <nav aria-label="Primary navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/products">Products</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <!-- Main content — the skip link target -->
  <main id="main-content" tabindex="-1">
    <!--
      tabindex="-1" allows the element to receive focus programmatically
      (via the skip link) without being part of the natural tab order.
    -->
    <h1>Welcome to our accessible website</h1>
    <p>This content is immediately accessible via the skip link.</p>
  </main>

  <footer>
    <nav aria-label="Footer navigation">
      <ul>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/terms">Terms of Service</a></li>
      </ul>
    </nav>
  </footer>
</body>
</html>
```

**Notes:**
- The skip link is the very first focusable element so pressing Tab once reveals it.
- `aria-label` on both `<nav>` elements distinguishes them for screen reader users ("Primary navigation" vs. "Footer navigation").
- `tabindex="-1"` on `<main>` allows it to receive focus from the skip link anchor without appearing in the natural tab order.
- The skip link only becomes visible when it receives keyboard focus (`:focus`), keeping the visual design clean for mouse users.

### Example 4: Accessibility Audit Checklist

Use this checklist to audit any web page. Each item maps to WCAG 2.2 AA success criteria.

```markdown
## Accessibility Audit Checklist

### Perceivable
- [ ] All images have appropriate alt text (informative images described, decorative images have alt="")
- [ ] Video content has captions; audio content has transcripts
- [ ] Color contrast meets 4.5:1 for normal text and 3:1 for large text (WCAG 1.4.3)
- [ ] Information is not conveyed by color alone (WCAG 1.4.1)
- [ ] Text can be resized to 200% without loss of content or functionality (WCAG 1.4.4)
- [ ] Content reflows at 320px width without horizontal scrolling (WCAG 1.4.10)
- [ ] Non-text contrast: UI components and graphical objects meet 3:1 (WCAG 1.4.11)

### Operable
- [ ] All functionality is available via keyboard (WCAG 2.1.1)
- [ ] No keyboard traps — users can Tab into and out of every component (WCAG 2.1.2)
- [ ] Skip navigation link is present and functional (WCAG 2.4.1)
- [ ] Page has a descriptive <title> (WCAG 2.4.2)
- [ ] Focus order is logical and follows visual layout (WCAG 2.4.3)
- [ ] Link purpose is clear from the link text (no "click here") (WCAG 2.4.4)
- [ ] Focus indicator is visible on all interactive elements (WCAG 2.4.7)
- [ ] Touch targets are at least 24x24 CSS pixels (WCAG 2.5.8)
- [ ] Hover/focus content (tooltips, dropdowns) is dismissible, hoverable, and persistent (WCAG 1.4.13)

### Understandable
- [ ] Page language is set via <html lang="en"> (WCAG 3.1.1)
- [ ] Form inputs have visible, associated labels (WCAG 3.3.2)
- [ ] Error messages identify the field and describe the error (WCAG 3.3.1)
- [ ] Error suggestions are provided when possible (WCAG 3.3.3)
- [ ] No unexpected context changes on focus or input (WCAG 3.2.1, 3.2.2)
- [ ] Consistent navigation and identification across pages (WCAG 3.2.3, 3.2.4)

### Robust
- [ ] HTML validates without major errors (WCAG 4.1.1)
- [ ] All interactive elements have accessible names (WCAG 4.1.2)
- [ ] ARIA roles, states, and properties are valid and complete (WCAG 4.1.2)
- [ ] Status messages are announced without receiving focus (WCAG 4.1.3)
- [ ] Custom widgets follow ARIA Authoring Practices patterns

### Screen Reader Testing
- [ ] Tested with VoiceOver (macOS/iOS) or NVDA/JAWS (Windows)
- [ ] Headings form a logical, sequential hierarchy
- [ ] Landmarks (main, nav, header, footer) are present and labeled
- [ ] Form fields announce their label, required state, and any errors
- [ ] Dynamic content updates are announced via live regions
- [ ] Modal dialogs announce their title and trap focus correctly

### Automated Testing
- [ ] axe-core or Lighthouse accessibility audit passes with 0 critical/serious issues
- [ ] ESLint eslint-plugin-jsx-a11y passes with 0 errors
- [ ] Pa11y or similar CI tool integrated into the build pipeline
```

---

## Common Mistakes

- **Using `<div>` and `<span>` for interactive elements.** A `<div onclick>` is not a button. It has no keyboard support, no implicit role, and no focus management. Use `<button>`.
- **Removing focus outlines without a replacement.** `*:focus { outline: none }` in your reset stylesheet makes your site unusable for keyboard users. Use `:focus-visible` to show outlines only for keyboard navigation.
- **Using ARIA to fix what semantic HTML would solve.** `<div role="button" tabindex="0" onkeydown={handleEnter}>` is four lines of code to badly replicate `<button>`. Use the native element.
- **Placeholder text as the only label.** Placeholders disappear when users start typing, are often low contrast, and are not reliably read by all screen readers. Use a visible `<label>`.
- **Missing alt text on images.** Every `<img>` must have an `alt` attribute. Informative images need descriptive text. Decorative images need `alt=""`. No image should have a missing `alt` attribute.
- **Relying on color alone to communicate state.** A red border on an error field is invisible to colorblind users. Add an icon, text message, or other non-color indicator.
- **Not testing with a keyboard.** Unplug your mouse and try to complete your most critical user flow. If you get stuck, your keyboard users are stuck too.
- **Setting `tabindex` to a positive number.** `tabindex="5"` forces the element to the front of the tab order and breaks the natural flow for every user. Use `tabindex="0"` or `tabindex="-1"` only.
- **Hiding content from screen readers that sighted users can see.** Using `aria-hidden="true"` on visible, meaningful content removes it from the accessibility tree. Only hide truly decorative or redundant elements.
- **Ignoring focus management in single-page applications.** When a route change replaces the page content without a full reload, screen readers do not know the page changed. Move focus to the new content or announce the change via a live region.
- **Treating accessibility as a separate task at the end of a project.** Accessibility is not a line item on a QA checklist. It is a constraint that informs design, component architecture, and HTML structure from day one. Retrofitting is always harder and more expensive.
- **Only running automated tests.** Automated tools (axe, Lighthouse) catch approximately 30-40% of accessibility issues. The rest require manual testing with keyboards, screen readers, and real users with disabilities.

---

> **See also:** [Design-Systems](../Design-Systems/design-systems.md) | [UX-Patterns](../UX-Patterns/ux-patterns.md) | [Typography-Color](../Typography-Color/typography-color.md) | [Animation-Motion](../Animation-Motion/animation-motion.md)
>
> **Last reviewed:** 2026-02
