# UX Writing

> Microcopy, error messages, empty states, tooltips, onboarding flows, and accessible copy — the interface writing that shapes how users experience your product. Every label, message, and instruction is a design decision.

---

## Principles

### 1. UX Writing Is Interface Design

UX writing is not decoration on top of a finished interface. It is a structural element of the interface itself. Every label, button, error message, tooltip, and instruction shapes how the user understands and navigates the product. Change one word on a button and you change what the user expects to happen when they click. Change one phrase in an error message and you change whether the user can recover or gives up.

Developers often treat interface copy as placeholder text — "lorem ipsum" that gets replaced at the last minute by someone in marketing. This creates two problems: the interface is designed around placeholder assumptions that the final copy may not fit, and the copy is written without understanding the design constraints it must operate within.

UX writing should be part of the design process, not an afterthought. In practice, this means:

- **Button labels should be written when the component is designed**, not after the layout is finalized. The label determines the button's width, which affects layout.
- **Error messages should be written when the validation logic is coded**, not when QA discovers there are no messages. The developer who writes the validation knows exactly what went wrong — they are the best person to draft the error copy.
- **Empty states should be designed as intentional experiences**, not blank pages with a "No items found" string.
- **Navigation labels should be tested for clarity** before the information architecture is finalized. Unclear labels mean users cannot find features, no matter how good the design is.

The most effective product teams treat UX writing as a design material, equivalent to color, typography, or spacing. It is not optional. It is not decorative. It is functional.

### 2. Clarity Over Cleverness

The cardinal rule of UX writing: when in doubt, be clear. Not clever, not cute, not creative. Clear.

A clever tooltip that makes a designer smile but confuses a user is a failure. A witty error message that entertains the team but does not help the user recover is a failure. Clarity is the only metric that matters in interface copy.

**What clarity looks like:**
- "Save changes" not "Commit your modifications"
- "Delete this project? This cannot be undone." not "Whoa, are you sure? This is kinda permanent."
- "Your file is uploading" not "Hang tight! Magic is happening!"
- "Payment failed. Check your card details and try again." not "Oops! Something went sideways with your moolah!"

**When cleverness is appropriate:**
Cleverness has a narrow home in UX writing: low-stakes, non-critical moments where the user is not in the middle of a task. Empty states, 404 pages, loading screens, and success confirmations can tolerate personality — as long as the helpful content comes first and the clever content is secondary.

**When cleverness is never appropriate:**
- Error messages (the user is frustrated)
- Security notifications (the user is anxious)
- Destructive actions (the user needs to understand consequences)
- Billing and payment (the user needs to trust the information)
- Accessibility contexts (screen readers read your "fun" copy literally)

The test: if you removed the clever part, would the message still be complete and useful? If yes, the cleverness is a bonus. If no, the cleverness is replacing information.

### 3. Microcopy Patterns: Buttons, Labels, Tooltips

Microcopy is the small text in interfaces — button labels, form labels, tooltips, placeholder text, toggle descriptions, and navigation items. These are the most constrained and most frequently read pieces of copy in your entire product.

**Button labels:**
- Start with a verb: "Save," "Delete," "Create," "Upload," "Send."
- Be specific: "Save draft" not just "Save." "Export as CSV" not just "Export."
- Match the user's mental model: "Add to cart" (user's action) not "Process item" (system's action).
- Keep to 1–3 words for primary actions, up to 5 for secondary actions.
- Pair destructive buttons with confirmation: "Delete project" → confirmation dialog → "Yes, delete permanently."

**Form labels:**
- Label every input. No exceptions. "Email," "Password," "Company name."
- Use the shortest accurate description: "Email" not "Email address" not "Your email address" not "Please enter your email address."
- Place labels above or to the left of inputs. Never inside inputs only (placeholders are not labels).
- Group related fields with a fieldset and legend when applicable.

**Tooltips:**
- Tooltips explain, they do not instruct. "Unique identifier for API calls" not "Enter your API key here."
- Keep to one sentence, under 15 words.
- Only add a tooltip when the label alone is insufficient. If the label is clear, no tooltip is needed.
- Never put critical information in tooltips — they are invisible on touch devices without hover.

**Toggle and checkbox descriptions:**
- Describe the "on" state: "Send email notifications when a build fails."
- Use positive framing: "Show line numbers" not "Don't hide line numbers."
- Keep descriptions under one line (40–60 characters) to avoid wrapping.

### 4. Error Messages That Help, Not Blame

Error messages are written at the user's lowest moment in the product experience. Something went wrong. They might have lost work. They might be confused. The error message is the product's only chance to help them recover. Most error messages fail this test catastrophically.

**The three components of a useful error message:**

1. **What happened** — Describe the problem in plain language. "Your password must be at least 8 characters" not "Error: validation_failed" not "Invalid input."
2. **Why it happened** (when helpful) — "The file is larger than the 10MB limit" or "This email is already associated with an account."
3. **What to do about it** — The recovery action. "Try a shorter file name" or "Sign in instead?" or "Check your card details and try again."

**Error message guidelines:**

- **Never blame the user.** "The email you entered is not valid" → "That doesn't look like an email address. Check for typos." The first blames ("you entered"); the second helps ("check for typos").
- **Never use technical jargon.** "Error 422: Unprocessable Entity" means nothing to a user. "We could not save your changes. Try again in a few seconds." means everything.
- **Never use "invalid" alone.** "Invalid email" does not tell the user what is wrong. "Email must include an @ symbol" does.
- **Be specific about what went wrong.** "Something went wrong" is the most useless error message in existence. If you cannot be specific, at least be honest: "We're having trouble connecting to our servers. Try again in a minute."
- **Offer a recovery path.** The best error messages include a link or action: "Sign in instead?" "Contact support." "Try again." The user should never read an error and wonder "What do I do now?"

**Error message tone:**
The brand voice can be present in error messages, but dialed down. A "direct, technical" brand can be direct and technical in errors. A "playful" brand should suppress playfulness in errors. Empathy is always appropriate. Humor almost never is.

### 5. Empty States as Onboarding Opportunities

An empty state is what the user sees when a section of your product has no content yet — an empty dashboard, an empty project list, an empty inbox. Most products handle this with "No items found" or a blank page. This is a wasted opportunity.

Empty states are one of the first things new users encounter. The product is empty because the user just signed up and has not created anything yet. This is not a dead end — it is an onboarding moment.

**Effective empty state components:**

1. **Acknowledge the emptiness without being negative.** "No projects yet" is factual and neutral. "Nothing here!" is dismissive.
2. **Explain the value of what will live here.** "Projects help you organize your team's work into focused workspaces."
3. **Provide a clear action to fill the space.** A prominent button: "Create your first project" or "Import from Jira."
4. **Optional: show a preview of what it will look like.** A subtle illustration or mockup of a populated state helps the user visualize the outcome.

**Empty state patterns by context:**

| Context | Copy approach |
|---|---|
| First-use (new account) | Onboarding: explain and guide. "Create your first [thing]." |
| Search with no results | Helpful: suggest alternatives. "No results for 'X.' Try a different search or browse categories." |
| Filtered list, empty | Informative: explain why. "No tasks match your filters. Clear filters to see all tasks." |
| Deleted/cleared content | Confirm: reassure. "All notifications cleared. New ones will appear here." |
| Error-caused empty | Recover: explain and offer action. "Could not load your projects. Try refreshing the page." |

**Empty states and SEO:**
Empty states in public-facing pages (e.g., category pages with no products, search results pages) can have SEO implications. A crawled page with no content signals thin content to Google. If empty states are possible on public pages, include useful copy and links to related content rather than just "No items found."

### 6. Onboarding Flows and Progressive Disclosure Copy

Onboarding is the user's first experience inside your product. The copy during onboarding determines whether the user reaches the "aha moment" — the point where they understand the product's value — or abandons before they ever experience it.

**Progressive disclosure** is the principle of showing information only when it is relevant, rather than overwhelming the user with everything at once. In copy terms:

- **Step 1:** Ask only what you need to get started. "What should we call your workspace?" — one field, one question.
- **Step 2:** Show the next decision only after the first is made. "Great. Now invite your team or skip this for later."
- **Step 3:** Introduce features as the user encounters them. Tooltips or coach marks that say "This is where your notifications live" — not a 10-slide feature tour upfront.

**Onboarding copy principles:**

- **Keep each step focused.** One question or one action per screen. "Choose your plan" and "Invite your team" should not be on the same screen.
- **Show progress.** "Step 2 of 4" or a progress bar. The user needs to know how much is left.
- **Make skipping safe.** "Skip for now" should always be an option for non-essential steps. The copy should reassure: "You can always do this later from Settings."
- **Celebrate completion.** "You're all set!" or "Your workspace is ready." The first moment of use should feel like an arrival, not another hurdle.
- **Use the user's own data.** After they name their workspace, reference it: "Welcome to Acme's workspace." After they set a goal, reference it: "You're set up to track daily active users." Personalization signals that the product is listening.

**Onboarding and activation metrics:**
Onboarding copy directly impacts activation rate — the percentage of signups that complete the key setup steps. Copy that is unclear, overwhelming, or too long increases drop-off at each step. Measure completion rate per onboarding step, identify the highest-drop-off step, and improve the copy there first.

### 7. Accessible Copy: Writing for Screen Readers and Cognitive Accessibility

Accessible copy is not a niche concern — it is a quality standard. At minimum, it affects the 15% of the global population with some form of disability. In practice, accessible copy benefits everyone: it is clearer, more structured, and easier to understand regardless of ability.

**Writing for screen readers:**

Screen readers read your interface copy literally, sequentially, and without visual context. What works visually may fail completely for screen reader users:

- **Button labels must make sense without visual context.** A trash can icon with no label is invisible to screen readers. Every interactive element needs text — either visible or as an `aria-label`.
- **Link text must describe the destination.** "Click here" and "Read more" are meaningless out of context. "Read the accessibility guide" and "View your billing history" are self-describing.
- **Avoid "above" and "below."** Screen readers do not present content spatially. "See the table below" means nothing. "See the comparison table" or use an in-page link.
- **Alt text for images should describe function, not appearance.** For a chart: "Bar chart showing monthly traffic growth from 1,000 to 5,000 visits" not "colorful chart." For a decorative image: `alt=""` (empty alt, not missing alt).

**Writing for cognitive accessibility:**

Cognitive accessibility means writing that people with dyslexia, ADHD, anxiety, cognitive fatigue, or limited literacy can understand:

- **Simple sentence structure.** One idea per sentence. Subject-verb-object. Avoid nested clauses.
- **Common vocabulary.** "Use" not "utilize." "Start" not "initialize." "Show" not "render." Write for a 6th–8th grade reading level in interface copy.
- **Avoid double negatives.** "Allow notifications" not "Don't disable notifications."
- **Chunk information.** Break long text into short paragraphs, bulleted lists, and clear headings.
- **Be consistent.** If you call it "workspace" in one place, do not call it "project space" or "team area" in another. Same concept, same word, every time.
- **Avoid "simply" and "just."** These words imply the task is easy. For a user struggling, they create frustration and shame. Delete them from all interface copy.

**WCAG copy requirements:**

- **1.1.1 Non-text Content** — All non-text content has a text alternative.
- **2.4.4 Link Purpose** — Link text describes the destination (even out of context).
- **2.4.6 Headings and Labels** — Headings describe the topic or purpose.
- **3.1.1 Language of Page** — The language is programmatically set.
- **3.3.1 Error Identification** — Errors are described in text, not just color.
- **3.3.2 Labels or Instructions** — Form fields have labels.

### 8. SEO Impact of UX Writing

UX writing is not typically considered an SEO discipline, but the engagement signals influenced by UX copy directly affect search performance. Google measures how users interact with your site after clicking a search result. If they bounce quickly because a confusing label, unhelpful error, or empty page drove them away, your ranking suffers.

**How UX writing affects SEO signals:**

- **Bounce rate reduction** — Clear navigation labels help users find what they came for. Confusing labels cause "pogo-sticking" (returning to search results to try a different result), which is a negative ranking signal.
- **Dwell time increase** — Well-structured, scannable in-app content keeps users engaged longer. Good microcopy reduces frustration-driven exits.
- **Engagement metrics** — Users who understand the interface interact more: clicking, scrolling, navigating to additional pages. Higher engagement signals content quality.
- **App store optimization (ASO)** — For mobile apps, the copy in app store listings (title, subtitle, description) follows the same principles as web SEO. Keyword placement, benefit-focused copy, and clear value propositions drive download rates.
- **Crawlable copy** — Error messages, empty states, and navigation labels that contain relevant keywords help Google understand page context. A 404 page that says "Page not found" and links to related content is better for SEO than a blank 404 page.
- **Core Web Vitals** — CLS (Cumulative Layout Shift) can be affected by copy that causes unexpected layout changes when it loads or updates. UX copy should have predictable lengths and not cause content reflow.

The connection is indirect but real: better UX writing → better user engagement → better engagement signals → better rankings. Every improvement to interface clarity is also an improvement to search performance.

---

## LLM Instructions

### 1. Writing Microcopy for UI Components

When asked to write interface copy (buttons, labels, tooltips, navigation):

- Ask for the component type and its function before writing.
- Write 2–3 options for each element, ranked by clarity.
- Keep button labels to 1–3 words for primary actions, up to 5 for secondary.
- Start buttons with verbs: "Save," "Create," "Delete," "Upload."
- Write tooltip text as one sentence under 15 words that adds information the label alone does not convey.
- Use sentence case for all interface elements (not Title Case, not ALL CAPS).
- Flag any "Submit," "Click here," or "N/A" in existing copy as needing replacement.
- Ensure every label and message would make sense to a screen reader user without visual context.

### 2. Creating Error and Validation Messages

When asked to write error messages:

For each error, write a message with three components:
1. **What happened** — in plain, non-technical language.
2. **Why** — if the reason helps the user (not if it is internal/technical).
3. **How to fix it** — a specific recovery action.

Never blame the user. Never use "invalid" alone. Never use technical error codes as the primary message. Always suggest a next step.

Format errors for inline display (near the field that caused the error) and for toast/banner display (for page-level errors). Provide both variants.

If the brand voice is defined, apply it — but suppress humor and cleverness in all error contexts.

### 3. Writing Onboarding and Empty State Copy

When asked to design onboarding flows or empty states:

For onboarding:
- Write one heading and one instruction per step.
- Include a "Skip for now" option with reassurance copy for non-essential steps.
- Show progress indicators ("Step 2 of 4").
- Write the completion screen with a celebratory but not over-the-top message.
- Keep each step to under 30 words of instruction.

For empty states:
- Write a neutral acknowledgment of the empty state.
- Explain what will live here and its value (one sentence).
- Provide a primary CTA to fill the space.
- Suggest alternative actions if the primary action is complex.
- Differentiate between first-use empty states and no-results empty states.

### 4. Auditing Interface Copy

When asked to review or audit UI copy:

1. Check every button label: does it start with a verb? Is it specific?
2. Check every form label: is it concise? Is it present (not just a placeholder)?
3. Check error messages: do they explain what happened and what to do?
4. Check empty states: do they guide the user, or just say "Nothing here"?
5. Check terminology consistency: is the same feature called the same thing everywhere?
6. Check accessibility: would every element make sense to a screen reader user?
7. Flag "Submit," "Click here," "N/A," "Error," "Invalid," "Something went wrong," and "Oops" as copy that needs replacement.
8. Provide specific replacements for every flagged item.

### 5. Integrating UX Copy with Brand Voice

When writing interface copy for a brand with a defined voice:

- Apply voice attributes at low intensity. Interface copy is functional first.
- Personality is appropriate in: success messages, empty states, 404 pages, and onboarding.
- Personality is inappropriate in: errors, billing, security, destructive actions.
- Test by asking: "If I removed the personality, would the message still be complete?" If no, the personality is replacing information.
- Match terminology to the brand's style guide (if one exists). Same feature, same name, every time.

---

## Examples

### 1. Complete UI Copy System

A consistent set of interface copy for a project management tool.

```tsx
// UI copy constants — centralized for consistency
const COPY = {
  // Navigation
  nav: {
    projects: "Projects",
    inbox: "Inbox",
    settings: "Settings",
    help: "Help & support",
  },

  // Primary actions
  actions: {
    createProject: "Create project",
    createTask: "Add task",
    invite: "Invite teammate",
    save: "Save changes",
    cancel: "Cancel",
    delete: "Delete",
    archive: "Archive",
    duplicate: "Duplicate",
    exportCsv: "Export as CSV",
  },

  // Destructive action confirmations
  confirm: {
    deleteProject: {
      title: "Delete this project?",
      body: "All tasks, comments, and files in this project will be permanently deleted. This cannot be undone.",
      confirm: "Yes, delete project",
      cancel: "Keep project",
    },
    removeTeammate: {
      title: "Remove this teammate?",
      body: "They will lose access to all projects in this workspace. Their existing tasks will remain assigned.",
      confirm: "Remove from workspace",
      cancel: "Keep teammate",
    },
    archiveProject: {
      title: "Archive this project?",
      body: "Archived projects are hidden from the sidebar but can be restored anytime from Settings.",
      confirm: "Archive project",
      cancel: "Keep active",
    },
  },

  // Success messages (toast notifications)
  success: {
    saved: "Changes saved",
    deleted: "Project deleted",
    invited: "Invitation sent to {email}",
    exported: "CSV downloaded",
    archived: "Project archived. Undo?",
  },

  // Empty states
  empty: {
    projects: {
      heading: "No projects yet",
      body: "Projects help you organize work into focused spaces for your team.",
      cta: "Create your first project",
    },
    tasks: {
      heading: "No tasks in this project",
      body: "Break your work into tasks to track progress and assign ownership.",
      cta: "Add a task",
    },
    inbox: {
      heading: "You're all caught up",
      body: "New mentions, assignments, and comments will appear here.",
      cta: null, // No action needed
    },
    search: {
      heading: "No results for \"{query}\"",
      body: "Try a different search term or check the spelling.",
      cta: "Clear search",
    },
    filtered: {
      heading: "No tasks match these filters",
      body: "Adjust your filters to see more results.",
      cta: "Clear all filters",
    },
  },

  // Tooltips
  tooltips: {
    dueDate: "Tasks without a due date won't appear in the calendar view",
    priority: "High-priority tasks are shown first in all views",
    assignee: "Only workspace members can be assigned tasks",
    archive: "Archived projects can be restored from Settings",
  },

  // Form helpers
  form: {
    projectName: {
      label: "Project name",
      placeholder: "e.g., Q1 Marketing Launch",
      helper: null,
    },
    projectDescription: {
      label: "Description",
      placeholder: "What is this project about?",
      helper: "Optional — helps teammates understand the project's purpose",
    },
    email: {
      label: "Email",
      placeholder: "teammate@company.com",
      helper: "They'll receive an invitation to join your workspace",
    },
  },
} as const;
```

### 2. Error Message Patterns

A comprehensive set of error messages demonstrating the what-happened / why / what-to-do structure.

```tsx
// Error messages for common scenarios
const ERRORS = {
  // Form validation errors (inline, near the field)
  validation: {
    emailRequired: "Enter your email address",
    emailInvalid: "That doesn't look like an email address. Check for typos.",
    emailTaken: "This email is already associated with an account. Sign in instead?",
    passwordTooShort: "Password must be at least 8 characters",
    passwordNoNumber: "Include at least one number",
    nameRequired: "Enter your name so teammates know who you are",
    urlInvalid: "Enter a full URL including https://",
    fileTooLarge: "File must be under 10 MB. Try compressing it first.",
    fileTypeNotSupported: "We support PNG, JPG, GIF, and SVG files",
    fieldRequired: "This field is required",
  },

  // API / network errors (toast or banner)
  network: {
    offline: "You're offline. Changes will sync when you reconnect.",
    timeout: "The request took too long. Check your connection and try again.",
    serverError: "Something went wrong on our end. Try again in a few seconds. If this persists, contact support.",
    rateLimited: "You've made too many requests. Wait a moment and try again.",
    unauthorized: "Your session has expired. Sign in again to continue.",
    forbidden: "You don't have permission to do this. Contact your workspace admin.",
  },

  // Action-specific errors (toast or inline)
  actions: {
    saveFailed: "Could not save changes. Try again.",
    deleteFailed: "Could not delete this item. Try again or contact support.",
    uploadFailed: "Upload failed. Check your connection and try again.",
    inviteFailed: "Could not send the invitation. Verify the email address and try again.",
    exportFailed: "Export failed. Try again with a smaller date range.",
    paymentFailed: "Payment failed. Check your card details and try again.",
    paymentDeclined: "Your card was declined. Try a different payment method.",
  },

  // 404 / not found
  notFound: {
    page: {
      heading: "Page not found",
      body: "The page you're looking for doesn't exist or has been moved.",
      cta: "Go to dashboard",
    },
    project: {
      heading: "Project not found",
      body: "This project may have been deleted or you may not have access.",
      cta: "View your projects",
    },
  },
};

// Example: rendering an inline validation error
function FieldError({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-600 mt-1" role="alert">
      {message}
    </p>
  );
}

// Example: rendering a toast notification for a network error
function ErrorToast({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
      <AlertIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
      <p className="text-sm text-red-800">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="ml-auto text-sm font-medium text-red-700 underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
```

**Key decisions:** Every validation error explains the requirement, not just "Invalid." Network errors distinguish between user-fixable issues (offline, timeout) and server-side issues. Action errors include a recovery action. The 404 pattern includes a helpful redirect. Error text uses `role="alert"` for screen reader accessibility.

### 3. Empty State Variations

Empty states for different contexts demonstrating appropriate copy tone.

```tsx
// First-use empty state — onboarding moment
function ProjectsEmptyState() {
  return (
    <div className="text-center py-16 max-w-sm mx-auto">
      <FolderIcon className="w-12 h-12 text-gray-300 mx-auto" />
      <h2 className="mt-4 text-lg font-semibold">No projects yet</h2>
      <p className="mt-2 text-gray-600">
        Projects help you organize work into focused spaces. Create one
        to get started, or import from another tool.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <button className="btn-primary">Create your first project</button>
        <button className="btn-secondary">Import from Jira or Asana</button>
      </div>
    </div>
  );
}

// Search empty state — help the user recover
function SearchEmptyState({ query }: { query: string }) {
  return (
    <div className="text-center py-12">
      <SearchIcon className="w-10 h-10 text-gray-300 mx-auto" />
      <h2 className="mt-4 text-lg font-semibold">
        No results for "{query}"
      </h2>
      <p className="mt-2 text-gray-600">
        Try a different search term or check the spelling.
      </p>
      <button
        onClick={clearSearch}
        className="mt-4 text-blue-600 font-medium"
      >
        Clear search
      </button>
    </div>
  );
}

// Caught-up empty state — positive completion
function InboxEmptyState() {
  return (
    <div className="text-center py-16">
      <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto" />
      <h2 className="mt-4 text-lg font-semibold">You're all caught up</h2>
      <p className="mt-2 text-gray-600">
        New notifications will appear here when teammates mention you,
        assign you tasks, or comment on your work.
      </p>
    </div>
  );
}

// Error-caused empty state — explain and recover
function ErrorEmptyState({ retry }: { retry: () => void }) {
  return (
    <div className="text-center py-12">
      <AlertTriangleIcon className="w-10 h-10 text-amber-400 mx-auto" />
      <h2 className="mt-4 text-lg font-semibold">Could not load projects</h2>
      <p className="mt-2 text-gray-600">
        Check your internet connection and try again. If this persists,
        our status page has the latest updates.
      </p>
      <div className="mt-4 flex justify-center gap-3">
        <button onClick={retry} className="btn-primary">
          Try again
        </button>
        <a href="/status" className="btn-secondary">
          Check status
        </a>
      </div>
    </div>
  );
}
```

**Key decisions:** Each empty state has a distinct purpose — onboarding, search recovery, positive completion, or error recovery. The tone adapts: encouraging for first-use, helpful for search, positive for caught-up, empathetic for errors. Every state with a recovery path includes an explicit action (button or link). Copy is concise (2 sentences maximum for the body).

### 4. Onboarding Flow Copy

A multi-step onboarding flow with progressive disclosure.

```tsx
// Step 1: Identity (minimal friction)
function OnboardingStep1() {
  return (
    <div className="max-w-md mx-auto text-center">
      <p className="text-sm text-gray-500">Step 1 of 3</p>
      <h1 className="mt-2 text-2xl font-bold">
        What should we call your workspace?
      </h1>
      <p className="mt-2 text-gray-600">
        This is usually your company or team name. You can change it later.
      </p>
      <input
        type="text"
        placeholder="e.g., Acme Engineering"
        className="mt-6 w-full rounded border p-3 text-center"
        autoFocus
      />
      <button className="mt-4 btn-primary w-full">
        Continue
      </button>
    </div>
  );
}

// Step 2: Team (skippable)
function OnboardingStep2({ workspaceName }: { workspaceName: string }) {
  return (
    <div className="max-w-md mx-auto text-center">
      <p className="text-sm text-gray-500">Step 2 of 3</p>
      <h1 className="mt-2 text-2xl font-bold">
        Invite your team to {workspaceName}
      </h1>
      <p className="mt-2 text-gray-600">
        Teammates can start collaborating immediately. You can always
        invite more people later from Settings.
      </p>
      <div className="mt-6 space-y-2">
        <input
          type="email"
          placeholder="teammate@company.com"
          className="w-full rounded border p-3"
        />
        <button className="text-sm text-blue-600 font-medium">
          + Add another
        </button>
      </div>
      <button className="mt-4 btn-primary w-full">
        Send invitations
      </button>
      <button className="mt-2 text-sm text-gray-500">
        Skip for now — invite later from Settings
      </button>
    </div>
  );
}

// Step 3: First action (activation)
function OnboardingStep3({ workspaceName }: { workspaceName: string }) {
  return (
    <div className="max-w-md mx-auto text-center">
      <p className="text-sm text-gray-500">Step 3 of 3</p>
      <h1 className="mt-2 text-2xl font-bold">
        Create your first project
      </h1>
      <p className="mt-2 text-gray-600">
        Projects help you organize work. Start with one — you can create
        more anytime.
      </p>
      <input
        type="text"
        placeholder="e.g., Website Redesign"
        className="mt-6 w-full rounded border p-3 text-center"
        autoFocus
      />
      <button className="mt-4 btn-primary w-full">
        Create project
      </button>
    </div>
  );
}

// Completion screen
function OnboardingComplete({ workspaceName, projectName }: Props) {
  return (
    <div className="max-w-md mx-auto text-center py-12">
      <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
      <h1 className="mt-4 text-2xl font-bold">
        {workspaceName} is ready
      </h1>
      <p className="mt-2 text-gray-600">
        Your workspace is set up and your first project is waiting.
        Start adding tasks to {projectName} or explore the dashboard.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <button className="btn-primary">
          Go to {projectName}
        </button>
        <button className="btn-secondary">
          Explore the dashboard
        </button>
      </div>
    </div>
  );
}
```

**Key decisions:** Each step has a single focus (name, team, project). Step 2 is explicitly skippable with reassurance about where to do it later. The workspace name is used in Steps 2 and 3 for personalization. Placeholder text gives concrete examples. Progress is shown ("Step 2 of 3"). The completion screen references the user's data (workspace name, project name) to make it feel personal. Two options on completion give the user agency.

---

## Common Mistakes

### 1. Technical Jargon in User-Facing Copy

**Wrong:** "Error 422: Unprocessable Entity. The request payload failed schema validation." This is a developer error, not a user error. The user sees a string of incomprehensible technical terms and has no idea what to do.

**Fix:** "We couldn't save your changes. Check that all required fields are filled in and try again." Translate every technical error into plain language. If the user cannot fix it themselves, say "Something went wrong. Try again, or contact support if this continues."

### 2. Blaming the User in Error Messages

**Wrong:** "You entered an invalid email address." "Your password is wrong." "You do not have permission." The word "you" in error messages feels accusatory. The user is already frustrated — blaming them makes it worse.

**Fix:** "That doesn't look like an email address." "The password doesn't match our records." "This action requires admin access." Remove "you" from error messages. Describe the state of things, not what the user did wrong.

### 3. Generic Empty States

**Wrong:** "No data available." "Nothing here." A blank page with no explanation, no guidance, and no action. The user has no idea whether this is expected, whether they did something wrong, or what to do next.

**Fix:** Every empty state should explain what belongs here, and provide a primary action to fill it. "No projects yet. Projects help you organize work. Create your first project." Even the "nothing here" state should be a designed experience.

### 4. Inconsistent Button Labels

**Wrong:** The same action is labeled "Save" on one page, "Apply" on another, "Update" on a third, and "Submit" on a fourth. The user cannot build a mental model of how the product works because the labels change unpredictably.

**Fix:** Define a copy system where each action has one label used everywhere. Save is always "Save." Delete is always "Delete." Create is always "Create." Document these in a UI copy constants file and enforce them across the product.

### 5. Tooltips That Restate the Label

**Wrong:** A field labeled "Project name" with a tooltip that says "Enter the name of your project." This tooltip adds zero information. It wastes the user's time and attention.

**Fix:** Only add tooltips when they provide information the label cannot. "Project name" with a tooltip that says "This appears in the sidebar and in all notifications" adds useful context. If the label is self-explanatory, no tooltip is needed.

### 6. Missing Destructive Action Confirmations

**Wrong:** Clicking "Delete" immediately and permanently deletes the item with no confirmation. The user accidentally clicks, loses their work, and has no recourse.

**Fix:** Every destructive action (delete, remove, reset, clear) must have a confirmation step. The confirmation should name the specific item ("Delete 'Q1 Marketing Launch'?"), explain the consequence ("All tasks and files will be permanently deleted"), and offer an escape ("Keep project" as the default button, "Yes, delete" as the destructive action styled in red).

### 7. Placeholder Text as the Only Label

**Wrong:** A form input with no visible label — only placeholder text ("Enter your email") that disappears when the user starts typing. Once they are typing, they cannot see what field they are filling in. This is an accessibility violation (WCAG 1.3.1, 3.3.2).

**Fix:** Always use a visible, persistent label above or beside the input. Placeholder text is supplementary (format hints like "name@company.com"), never primary. Labels must remain visible while the user is typing.

### 8. Ignoring Accessibility in Interface Copy

**Wrong:** Links that say "Click here." Images with no alt text. Error messages conveyed only by color (a red border with no text). Icon-only buttons with no labels or aria attributes. These are all accessibility failures that exclude users who rely on assistive technology.

**Fix:** Write link text that describes the destination. Write alt text for every meaningful image. Pair every color-based indicator with a text label. Give every icon-only button an `aria-label`. Write copy as if the user cannot see the interface — because some of them cannot.

---

> **See also:** [SEO Copywriting](../SEO-Copywriting/seo-copywriting.md) | [Brand Voice & Tone](../Brand-Voice-Tone/brand-voice-tone.md) | [CTAs & Conversion](../CTAs-Conversion/ctas-conversion.md) | [Headlines & Hooks](../Headlines-Hooks/headlines-hooks.md) | [Landing Pages](../Landing-Pages/landing-pages.md) | [Search Intent](../../SEO/On-Page-SEO/Search-Intent/search-intent.md) | [Core Web Vitals](../../SEO/Technical-SEO/Core-Web-Vitals/core-web-vitals.md) | [Brand Identity](../../UIUX/Brand-Identity/brand-identity.md) | [Accessibility](../../UIUX/Accessibility/accessibility.md) | [UX Patterns](../../UIUX/UX-Patterns/ux-patterns.md)
>
> **Last reviewed:** 2026-02
