# User Onboarding
> Activation metrics, onboarding state machines, checklist components, progressive profiling, empty state design, guided tour systems, time-to-value optimization, and segmented onboarding flows. The first five minutes of a user's experience determine whether they become a customer or a churn statistic — engineer those minutes deliberately.

---

## Principles

### 1. Define the "Aha Moment" Before Building the Flow

The aha moment is the instant a user first experiences the core value of your product. For Dropbox, it was seeing a file sync across devices. For Slack, it was receiving a reply from a teammate. For Figma, it was moving a shape on a canvas that someone else was editing. The aha moment is not a feature — it is an experience that makes the user understand why the product exists. Every onboarding system exists to move users toward this moment as fast as possible.

You must define the aha moment empirically, not by assumption. Analyze your retained users: what actions did they take in their first session that correlated with long-term retention? This is your activation event. If 80% of users who create a project within 24 hours of signup are still active 30 days later, but only 15% of users who do not create a project retain, then "create first project" is your activation event. The activation metric is the percentage of signups who complete the activation event within a defined time window.

Time-to-value (TTV) is the elapsed time between signup and the activation event. Every second of TTV is friction that loses users. Measure TTV as a distribution, not an average — track p50, p75, and p90. Optimize the slow paths at p90 first because those users are most likely to abandon. Store `activated_at` as a nullable timestamp on the user record. When the activation event fires, write this timestamp. This makes activation queryable in SQL, joinable with revenue data, and independent of your analytics provider.

### 2. Model Onboarding as a State Machine

Onboarding is not a linear checklist — it is a state machine with defined states, valid transitions, and terminal conditions. A user can be in states like `signed_up`, `profile_completed`, `workspace_created`, `first_item_added`, `teammate_invited`, `activated`, or `skipped`. Transitions between states are triggered by user actions. Some transitions are reversible, some are terminal. Modeling this explicitly prevents tangled conditional logic scattered across components.

A state machine gives you three properties that ad-hoc approaches lack. **Visibility**: you can query the database to see exactly how many users are in each state and where they stall. **Determinism**: given a user's current state and an action, the next state is unambiguous — there is no question about whether the user "should" see the onboarding banner. **Testability**: you can write unit tests for every transition and edge case without rendering UI.

The state machine should be driven by the database, not by client-side state. When a user completes a step, the server updates the onboarding state and returns the new state to the client. Client-side onboarding state is a cache of server state, not the source of truth. Store transition history, not just the current state. An `onboarding_events` table that records every state transition with a timestamp gives you funnel analysis data, time-between-steps metrics, and debugging capability. The current state is a derived property — the most recent entry in the event log.

### 3. Build Checklists That Drive Completion

The onboarding checklist is the most effective UI pattern for driving activation because it leverages three psychological mechanisms: progress visualization (the user can see how far they have come), goal gradient (the closer to completion, the stronger the motivation), and the Zeigarnik effect (incomplete tasks create cognitive tension that motivates completion). A progress bar reading "3 of 5 steps complete" is more motivating than a blank screen with a "Get Started" button.

Four engineering concerns must be addressed. **Step ordering**: steps should be ordered by value density — the step most likely to deliver the aha moment comes first, not last. **Skip logic**: mark steps as required or optional, and allow users to skip optional steps without blocking progress. **Persistence**: checklist state must be server-authoritative, synced to the onboarding state machine. **Dismissibility**: after a reasonable number of sessions or after activation, the checklist should disappear permanently.

Completion incentives work. Showing "Complete your setup to unlock [feature]" or a confetti animation on completion measurably increases completion rates. But the incentive must be genuine — gating features behind meaningless onboarding steps creates resentment. Every step in the checklist should deliver value to the user, not just collect data for you.

### 4. Collect Profile Data Progressively

Progressive profiling collects user information gradually across multiple sessions rather than demanding everything upfront. A 10-field signup form has dramatically lower conversion than a 2-field form (email and password) followed by contextual data collection. Each additional form field at signup costs 5-10% of potential signups — this is consistently replicated across SaaS products.

The engineering pattern: collect the minimum at signup (email and password), then request additional information at contextually appropriate moments. Ask for the company name when the user creates a workspace. Ask for team size when the user invites teammates. Ask for the use case when the user creates their first project. Each request is a single question at a moment when the user understands why the information is relevant.

Store profiling state with nullable fields. A `profile_completeness` computed field drives the UI — show prompts when completeness is below a threshold. Never block the user from using the product because their profile is incomplete. Progressive profiling data is also critical for onboarding segmentation (Principle 8) — segmentation-critical questions must come early, while lower-priority questions can wait.

### 5. Turn Empty States Into Onboarding Surfaces

Every product has empty states — the dashboard before any data exists, the project list before any projects are created. These empty states are prime onboarding real estate because they appear at exactly the moment the user needs guidance. An empty project list that says "No projects yet" is a missed opportunity. An empty project list that says "Create your first project" with a prominent CTA and a 30-second explanation is an onboarding surface.

Empty states should answer three questions: what will appear here (context), why it matters (motivation), and how to create the first one (action). The action should be a single button that starts the creation flow — do not link to documentation. Engineering empty states correctly means treating them as first-class components. Every list component and data view needs an explicit empty state variant. Use a consistent `EmptyState` component that accepts a title, description, action label, and action handler.

Empty states have a lifecycle: they appear when data is empty, disappear when the user creates their first item, and should never reappear once the user has data. Track whether the user has *ever* created an item, not just whether items currently exist. A user who deletes all their projects should see a different empty state than a user who has never created one.

### 6. Implement Guided Tours Without Blocking Interaction

Guided tours — tooltip-based walkthroughs that highlight UI elements one at a time — are effective for teaching complex products where the aha moment requires multiple coordinated actions. But guided tours must not block interaction. Modal overlays that prevent the user from clicking anything except "Next" create a passive, frustrating experience. The user learns nothing because they are following instructions, not exploring.

Use a spotlight pattern: dim the page except for the highlighted element, show a tooltip explaining what the element does, and let the user interact with it. When the user completes the action (clicks the button, fills the field), the tour advances automatically. This teaches by doing, not by reading. React portals are the correct implementation pattern for tour tooltips because they need to render on top of all other content regardless of DOM hierarchy.

Tours must be dismissible, skippable, and resumable. A user who dismisses a tour should not see it again — persist dismissal in the database. A user who closes the browser mid-tour should resume from where they left off. Tours should only trigger once and only when target elements are visible on the page. Use a `MutationObserver` to detect when target elements appear in the DOM before starting the tour.

### 7. Optimize Time-to-Value Ruthlessly

Time-to-value is the single most important metric for onboarding success. Every form field, loading spinner, "please verify your email" step, and "choose a plan" interstitial adds seconds or minutes to TTV. The goal is not zero friction — some friction is necessary — but every friction point must justify its existence.

Map every step between signup and activation, time each one, and categorize them as essential (cannot be removed), deferrable (can happen later), or eliminable (should not exist). Email verification is deferrable — let the user start immediately and verify later. Plan selection is deferrable — default to the free plan. Avatar upload is eliminable — generate a default from initials.

Template systems, sample data, and smart defaults are the highest-leverage TTV optimizations. If your product requires the user to create content before they experience value, pre-populate a sample project that demonstrates the product's capabilities. Smart defaults (pre-filled form fields, auto-detected settings) eliminate decisions that slow users down. A project management tool that creates a default workspace with three columns ("To Do," "In Progress," "Done") delivers value faster than one that presents an empty configuration screen.

### 8. Segment Onboarding by User Type

Not all users need the same onboarding flow. A developer signing up for an API product needs a different first experience than a project manager signing up for the dashboard. A solo user and an enterprise admin have different goals and different definitions of value. Onboarding segmentation routes users into tailored flows based on their role, use case, team size, or experience level.

The segmentation decision point is typically a single screen shown immediately after signup — "What best describes your role?" — with 3-5 options. This is the one question to ask before the product because it determines the entire onboarding path. The question should be short (one screen, one choice), visual (cards with icons, not a dropdown), and consequential (the user sees an immediately different experience).

Each segment gets a tailored flow: different checklist steps, different empty states, different guided tours, different sample data, and different activation criteria. A developer segment might skip the UI tour and go straight to API key generation. A manager segment might skip API docs and go straight to team invitation. Store the segment on the user record and use it throughout the product, not just during onboarding — segmentation is a property of the user, not a property of onboarding.

---

## LLM Instructions

### 1. Setting Up the Onboarding State Machine and Database Schema

When asked to build an onboarding system, start with the state machine and database schema before building any UI.

1. Create a Prisma schema with an `OnboardingStep` enum on the User model and an `OnboardingEvent` model that records every state transition with `userId`, `fromStep`, `toStep`, `timestamp`, and optional `metadata` (JSON). The event log is essential for funnel analysis.
2. Define onboarding steps as a TypeScript union type in a shared file (`src/lib/onboarding/steps.ts`). Export a `STEP_CONFIG` record mapping each step to its metadata (label, description, required vs. optional, segment applicability) and a `getStepsForSegment()` function that returns the ordered step array for a given segment.
3. Create a transition function (`src/lib/onboarding/machine.ts`) that validates the transition is legal, enforces ordering, and prevents skipping required steps. Return the new state and whether the user has reached activation.
4. Create a server-side `completeOnboardingStep` function (Server Action or API route) that validates the transition, updates the user record, records the event, and sets `activatedAt` when the user reaches activation.
5. Create a `useOnboarding` client-side hook that exposes `currentStep`, `completedSteps`, `progress`, and `completeStep` / `skipStep` mutations with optimistic updates.

### 2. Building the Onboarding Checklist Component

When asked to build an onboarding checklist, create a server-driven component that reads from the state machine.

1. Create an `OnboardingChecklist` component that renders a vertical list of steps with completion indicators and a progress bar at the top.
2. Each step renders a title, one-line description, and CTA button. Completed steps show a checkmark. The current step is visually highlighted and expanded with its action.
3. Implement skip logic: optional steps render a "Skip" link alongside the CTA. Skipping calls the mutation with a `skipped` flag and advances to the next step.
4. Add dismissal: after completing all required steps or clicking "Dismiss," hide the checklist and record `onboardingDismissedAt` on the user record. Never show it again after dismissal.
5. Use a collapsible pattern so the user can minimize the checklist without permanently dismissing it.

### 3. Implementing Progressive Profiling

When asked to collect user information gradually, implement profiling that gathers data across multiple touchpoints.

1. Define a `ProfileField` configuration that specifies the field name, collection trigger (which step or context), UI component, and whether it is required for segmentation.
2. Create a `ProfilePrompt` component that renders a single-question modal or inline form and calls a server action to save the response.
3. Show the segmentation question (role/use case) as a full-screen card selector immediately after signup. This is the one mandatory profiling step.
4. For subsequent fields, use inline prompts during natural pauses: after completing a step, viewing an empty state, or accessing a feature for the first time. Never show more than one question at a time.
5. Track profile completeness as a computed value. A user at 100% completeness should never see a profiling prompt.

### 4. Building a Guided Tour System

When asked to implement a product tour, build a portal-based system that highlights elements and advances on interaction.

1. Create a `TourProvider` context that manages tour state (active tour, current step, paused/dismissed). Define tours as configuration arrays: each step has a `targetSelector`, `title`, `content`, `placement`, and optional `advanceOn` action.
2. Create a `TourSpotlight` using React portal to `document.body`. Use an SVG mask to dim the page with a cutout around the target element. Allow clicks on the target to pass through.
3. Create a `TourTooltip` positioned relative to the target using `getBoundingClientRect()`. Include step counter, content, "Next"/"Skip Tour" buttons. If `advanceOn === "click"`, hide "Next" and advance when the user clicks the target.
4. Persist tour completion and dismissal in the database. Resume in-progress tours from the last step on return visits.
5. Only start tours when target elements are visible. Use a `MutationObserver` to detect when target elements appear in the DOM.

### 5. Implementing Onboarding Segmentation

When asked to create different onboarding flows for different user types, implement segment-based routing.

1. Define segments as a TypeScript union type. Create a `SEGMENT_CONFIG` mapping each segment to its step sequence, sample data template, tour ID, and default settings.
2. After signup, show a segment selection screen with 3-5 visual cards. Save the segment to the user record and redirect to the segment-specific flow.
3. Create a `getStepsForSegment(segment)` function used by the state machine to determine valid transitions per segment.
4. Create segment-specific sample data: developers get API examples, managers get project templates, designers get asset libraries.
5. Include `segment` as a property on every onboarding analytics event for per-segment funnel analysis.

---

## Examples

### 1. Onboarding State Machine with Prisma Schema and Transition Logic

```typescript
// prisma/schema.prisma (relevant models)
// enum OnboardingStep {
//   SIGNED_UP | SEGMENT_SELECTED | WORKSPACE_CREATED
//   FIRST_ITEM_CREATED | TEAMMATE_INVITED | TOUR_COMPLETED
//   ACTIVATED | DISMISSED
// }
// model User { ... onboardingStep OnboardingStep @default(SIGNED_UP)
//   activatedAt DateTime?  onboardingDismissedAt DateTime?
//   onboardingEvents OnboardingEvent[] }
// model OnboardingEvent { ... userId, fromStep, toStep, metadata Json?, createdAt
//   @@index([userId, createdAt]) }

// src/lib/onboarding/steps.ts
export const OnboardingStep = {
  SIGNED_UP: "SIGNED_UP",
  SEGMENT_SELECTED: "SEGMENT_SELECTED",
  WORKSPACE_CREATED: "WORKSPACE_CREATED",
  FIRST_ITEM_CREATED: "FIRST_ITEM_CREATED",
  TEAMMATE_INVITED: "TEAMMATE_INVITED",
  TOUR_COMPLETED: "TOUR_COMPLETED",
  ACTIVATED: "ACTIVATED",
  DISMISSED: "DISMISSED",
} as const;

export type OnboardingStepType =
  (typeof OnboardingStep)[keyof typeof OnboardingStep];

export type StepConfig = {
  label: string;
  description: string;
  required: boolean;
  segments: string[] | "all";
  ctaLabel: string;
  ctaHref?: string;
};

export const STEP_CONFIG: Record<OnboardingStepType, StepConfig> = {
  SIGNED_UP: {
    label: "Create account",
    description: "You're in! Welcome aboard.",
    required: true, segments: "all", ctaLabel: "Done",
  },
  SEGMENT_SELECTED: {
    label: "Tell us about yourself",
    description: "Pick your role so we can tailor your experience.",
    required: true, segments: "all", ctaLabel: "Select role",
    ctaHref: "/onboarding/segment",
  },
  WORKSPACE_CREATED: {
    label: "Create your workspace",
    description: "Set up a space for your team or personal projects.",
    required: true, segments: "all", ctaLabel: "Create workspace",
    ctaHref: "/onboarding/workspace",
  },
  FIRST_ITEM_CREATED: {
    label: "Create your first item",
    description: "Add your first project, task, or document.",
    required: true, segments: "all", ctaLabel: "Create item",
    ctaHref: "/dashboard",
  },
  TEAMMATE_INVITED: {
    label: "Invite a teammate",
    description: "Collaboration is better with your team.",
    required: false, segments: ["manager", "designer"],
    ctaLabel: "Invite", ctaHref: "/settings/team",
  },
  TOUR_COMPLETED: {
    label: "Take the product tour",
    description: "A quick walkthrough of the key features.",
    required: false, segments: "all", ctaLabel: "Start tour",
  },
  ACTIVATED: {
    label: "All set!", description: "You've completed onboarding.",
    required: false, segments: "all", ctaLabel: "Go to dashboard",
    ctaHref: "/dashboard",
  },
  DISMISSED: {
    label: "Dismissed", description: "Onboarding dismissed.",
    required: false, segments: "all", ctaLabel: "",
  },
};

export function getStepsForSegment(segment: string | null): OnboardingStepType[] {
  const allSteps: OnboardingStepType[] = [
    "SIGNED_UP", "SEGMENT_SELECTED", "WORKSPACE_CREATED",
    "FIRST_ITEM_CREATED", "TEAMMATE_INVITED", "TOUR_COMPLETED", "ACTIVATED",
  ];
  if (!segment) return allSteps;
  return allSteps.filter((step) => {
    const config = STEP_CONFIG[step];
    return config.segments === "all" || config.segments.includes(segment);
  });
}

// src/lib/onboarding/machine.ts
import { db } from "@/lib/db";
import { OnboardingStep, STEP_CONFIG, getStepsForSegment } from "./steps";
import type { OnboardingStepType } from "./steps";

export async function transitionOnboardingStep(
  userId: string,
  targetStep: OnboardingStepType,
  metadata?: Record<string, unknown>
) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { onboardingStep: true, segment: true },
  });

  const currentStep = user.onboardingStep as OnboardingStepType;
  const steps = getStepsForSegment(user.segment);
  const currentIndex = steps.indexOf(currentStep);
  const targetIndex = steps.indexOf(targetStep);

  if (targetIndex <= currentIndex) {
    throw new Error(`Invalid transition: ${currentStep} → ${targetStep}`);
  }

  // Check no required steps are skipped
  for (let i = currentIndex + 1; i < targetIndex; i++) {
    if (STEP_CONFIG[steps[i]].required) {
      throw new Error(`Cannot skip required step: ${steps[i]}`);
    }
  }

  const isActivated = targetStep === OnboardingStep.ACTIVATED;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        onboardingStep: targetStep,
        ...(isActivated ? { activatedAt: new Date() } : {}),
      },
    }),
    db.onboardingEvent.create({
      data: { userId, fromStep: currentStep, toStep: targetStep, metadata },
    }),
  ]);

  return { success: true, newStep: targetStep, isActivated };
}

export function getNextStep(
  currentStep: OnboardingStepType,
  segment: string | null
): OnboardingStepType | null {
  const steps = getStepsForSegment(segment);
  const idx = steps.indexOf(currentStep);
  return idx === -1 || idx >= steps.length - 1 ? null : steps[idx + 1];
}
```

### 2. Onboarding Checklist Component (React + Next.js)

```typescript
// src/lib/onboarding/use-onboarding.ts
"use client";

import { useCallback, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingStepType } from "@/lib/onboarding/steps";
import { completeStepAction, skipStepAction, dismissOnboardingAction }
  from "@/app/actions/onboarding";

type OnboardingState = {
  currentStep: OnboardingStepType;
  completedSteps: OnboardingStepType[];
  segment: string | null;
  totalSteps: number;
  progress: number;
  isDismissed: boolean;
};

export function useOnboarding(initialState: OnboardingState) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(initialState);

  const completeStep = useCallback(
    (step: OnboardingStepType) => {
      startTransition(async () => {
        setOptimistic((prev) => ({
          ...prev,
          completedSteps: [...prev.completedSteps, step],
          progress: Math.round(
            ((prev.completedSteps.length + 1) / prev.totalSteps) * 100
          ),
        }));
        await completeStepAction(step);
        router.refresh();
      });
    },
    [router, startTransition, setOptimistic]
  );

  const skipStep = useCallback(
    (step: OnboardingStepType) => {
      startTransition(async () => {
        setOptimistic((prev) => ({
          ...prev,
          completedSteps: [...prev.completedSteps, step],
          progress: Math.round(
            ((prev.completedSteps.length + 1) / prev.totalSteps) * 100
          ),
        }));
        await skipStepAction(step);
        router.refresh();
      });
    },
    [router, startTransition, setOptimistic]
  );

  const dismiss = useCallback(() => {
    startTransition(async () => {
      setOptimistic((prev) => ({ ...prev, isDismissed: true }));
      await dismissOnboardingAction();
      router.refresh();
    });
  }, [router, startTransition, setOptimistic]);

  return { ...state, isPending, completeStep, skipStep, dismiss };
}

// src/components/onboarding/checklist.tsx
"use client";

import { useOnboarding } from "@/lib/onboarding/use-onboarding";
import { STEP_CONFIG, getStepsForSegment } from "@/lib/onboarding/steps";
import type { OnboardingStepType } from "@/lib/onboarding/steps";
import { CheckCircle2, Circle, SkipForward, X } from "lucide-react";
import Link from "next/link";

type ChecklistProps = {
  initialState: {
    currentStep: OnboardingStepType;
    completedSteps: OnboardingStepType[];
    segment: string | null;
    totalSteps: number;
    progress: number;
    isDismissed: boolean;
  };
};

export function OnboardingChecklist({ initialState }: ChecklistProps) {
  const {
    currentStep, completedSteps, segment, progress, isDismissed,
    isPending, completeStep, skipStep, dismiss,
  } = useOnboarding(initialState);

  if (isDismissed || currentStep === "ACTIVATED" || currentStep === "DISMISSED") {
    return null;
  }

  const steps = getStepsForSegment(segment).filter(
    (s) => s !== "ACTIVATED" && s !== "DISMISSED"
  );

  return (
    <div className="w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Getting Started</h3>
          <p className="text-xs text-gray-500">
            {completedSteps.length} of {steps.length} complete
          </p>
        </div>
        <button onClick={dismiss} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 pt-3">
        <div className="h-2 w-full rounded-full bg-gray-100">
          <div
            className="h-2 rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="p-4 space-y-1">
        {steps.map((step) => {
          const config = STEP_CONFIG[step];
          const isCompleted = completedSteps.includes(step);
          const isCurrent = step === currentStep;

          return (
            <div
              key={step}
              className={`rounded-md p-3 transition-colors
                ${isCurrent ? "bg-blue-50 ring-1 ring-blue-200" : ""}
                ${isCompleted ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className={`h-5 w-5 ${
                      isCurrent ? "text-blue-600" : "text-gray-300"
                    }`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    isCompleted ? "text-gray-500 line-through" : "text-gray-900"
                  }`}>
                    {config.label}
                  </p>
                  {isCurrent && (
                    <>
                      <p className="mt-1 text-xs text-gray-600">
                        {config.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {config.ctaHref ? (
                          <Link href={config.ctaHref}
                            className="rounded-md bg-blue-600 px-3 py-1.5
                              text-xs font-medium text-white hover:bg-blue-700">
                            {config.ctaLabel}
                          </Link>
                        ) : (
                          <button onClick={() => completeStep(step)}
                            disabled={isPending}
                            className="rounded-md bg-blue-600 px-3 py-1.5
                              text-xs font-medium text-white hover:bg-blue-700
                              disabled:opacity-50">
                            {config.ctaLabel}
                          </button>
                        )}
                        {!config.required && (
                          <button onClick={() => skipStep(step)}
                            disabled={isPending}
                            className="flex items-center gap-1 text-xs
                              text-gray-500 hover:text-gray-700">
                            <SkipForward className="h-3 w-3" /> Skip
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// src/app/actions/onboarding.ts
"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transitionOnboardingStep, getNextStep } from "@/lib/onboarding/machine";
import { trackServerEvent } from "@/lib/analytics/server";
import type { OnboardingStepType } from "@/lib/onboarding/steps";

export async function completeStepAction(step: OnboardingStepType) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const result = await transitionOnboardingStep(session.user.id, step, {
    completedVia: "checklist",
  });

  trackServerEvent(session.user.id, "onboarding_step_completed", {
    step, is_activated: result.isActivated,
  });

  return result;
}

export async function skipStepAction(step: OnboardingStepType) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { segment: true },
  });

  const nextStep = getNextStep(step, user.segment);
  if (!nextStep) throw new Error("No next step");

  const result = await transitionOnboardingStep(session.user.id, nextStep, {
    skippedStep: step,
  });

  trackServerEvent(session.user.id, "onboarding_step_skipped", {
    step, advanced_to: nextStep,
  });

  return result;
}

export async function dismissOnboardingAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: "DISMISSED", onboardingDismissedAt: new Date() },
  });

  trackServerEvent(session.user.id, "onboarding_dismissed", {});
}
```

### 3. Guided Tour System with React Portals

```typescript
// src/lib/tour/types.ts
export type TourStep = {
  id: string;
  targetSelector: string;
  title: string;
  content: string;
  placement: "top" | "bottom" | "left" | "right";
  advanceOn?: "click"; // advance when the target element is clicked
};

export type TourDefinition = {
  id: string;
  steps: TourStep[];
  segment?: string;
};

// src/components/tour/tour-provider.tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState }
  from "react";
import { createPortal } from "react-dom";
import type { TourDefinition, TourStep } from "@/lib/tour/types";

type TourContextType = {
  startTour: (tourId: string) => void;
  endTour: () => void;
  nextStep: () => void;
  activeTour: string | null;
};

const TourContext = createContext<TourContextType | null>(null);
export const useTour = () => useContext(TourContext)!;

type Props = {
  tours: Record<string, TourDefinition>;
  completedTours: string[];
  children: React.ReactNode;
};

export function TourProvider({ tours, completedTours, children }: Props) {
  const [activeTour, setActiveTour] = useState<TourDefinition | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = activeTour?.steps[stepIndex] ?? null;

  // Measure the target element position
  const measure = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (el) setTargetRect(el.getBoundingClientRect());
  }, [currentStep]);

  useEffect(() => {
    if (!activeTour) return;
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [activeTour, stepIndex, measure]);

  // Watch for target element to appear in DOM
  useEffect(() => {
    if (!currentStep) return;
    if (document.querySelector(currentStep.targetSelector)) { measure(); return; }

    const observer = new MutationObserver(() => {
      if (document.querySelector(currentStep.targetSelector)) {
        measure();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [currentStep, measure]);

  // Advance on target click when advanceOn === "click"
  useEffect(() => {
    if (!currentStep || currentStep.advanceOn !== "click") return;
    const el = document.querySelector(currentStep.targetSelector);
    if (!el) return;
    const handler = () => setTimeout(() => nextStep(), 100);
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [currentStep, stepIndex]);

  const startTour = useCallback((tourId: string) => {
    if (completedTours.includes(tourId)) return;
    const tour = tours[tourId];
    if (!tour) return;
    setActiveTour(tour);
    setStepIndex(0);
  }, [completedTours, tours]);

  const endTour = useCallback(async () => {
    if (!activeTour) return;
    await fetch("/api/onboarding/tour-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tourId: activeTour.id }),
    });
    setActiveTour(null);
    setStepIndex(0);
    setTargetRect(null);
  }, [activeTour]);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (stepIndex >= activeTour.steps.length - 1) { endTour(); return; }
    setStepIndex((i) => i + 1);
  }, [activeTour, stepIndex, endTour]);

  return (
    <TourContext.Provider value={{
      startTour, endTour, nextStep, activeTour: activeTour?.id ?? null,
    }}>
      {children}
      {activeTour && currentStep && targetRect && createPortal(
        <>
          {/* SVG overlay with spotlight cutout */}
          <svg className="fixed inset-0 z-[9998]" width="100%" height="100%"
            onClick={endTour} style={{ pointerEvents: "auto" }}>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect x={targetRect.left - 8} y={targetRect.top - 8}
                  width={targetRect.width + 16} height={targetRect.height + 16}
                  rx={8} fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)"
              mask="url(#tour-mask)" />
            <rect x={targetRect.left - 8} y={targetRect.top - 8}
              width={targetRect.width + 16} height={targetRect.height + 16}
              fill="transparent" onClick={(e) => e.stopPropagation()} />
          </svg>

          {/* Tooltip */}
          <div className="fixed z-[9999] w-72 rounded-lg bg-white p-4 shadow-xl
            border border-gray-200"
            style={getTooltipStyle(currentStep.placement, targetRect)}>
            <p className="text-xs text-gray-400 mb-1">
              Step {stepIndex + 1} of {activeTour.steps.length}
            </p>
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {currentStep.title}
            </h4>
            <p className="text-sm text-gray-600 mb-3">{currentStep.content}</p>
            <div className="flex items-center justify-between">
              <button onClick={endTour}
                className="text-xs text-gray-500 hover:text-gray-700">
                Skip tour
              </button>
              {currentStep.advanceOn === "click" ? (
                <span className="text-xs text-blue-600 italic">
                  Click the element to continue
                </span>
              ) : (
                <button onClick={nextStep}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs
                    font-medium text-white hover:bg-blue-700">
                  {stepIndex === activeTour.steps.length - 1 ? "Finish" : "Next"}
                </button>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </TourContext.Provider>
  );
}

function getTooltipStyle(
  placement: TourStep["placement"], rect: DOMRect
): React.CSSProperties {
  const OFFSET = 16;
  switch (placement) {
    case "top": return {
      bottom: window.innerHeight - rect.top + OFFSET,
      left: rect.left + rect.width / 2 - 144,
    };
    case "bottom": return {
      top: rect.bottom + OFFSET,
      left: rect.left + rect.width / 2 - 144,
    };
    case "left": return {
      top: rect.top + rect.height / 2 - 60,
      right: window.innerWidth - rect.left + OFFSET,
    };
    case "right": return {
      top: rect.top + rect.height / 2 - 60,
      left: rect.right + OFFSET,
    };
  }
}
```

### 4. Empty State Component and Onboarding-Aware Page

```typescript
// src/components/ui/empty-state.tsx
import Link from "next/link";

type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function EmptyState({
  icon, title, description, actionLabel, actionHref, onAction,
  secondaryLabel, secondaryHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 max-w-sm mb-6">{description}</p>
      <div className="flex items-center gap-3">
        {actionHref ? (
          <Link href={actionHref}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium
              text-white hover:bg-blue-700">
            {actionLabel}
          </Link>
        ) : (
          <button onClick={onAction}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium
              text-white hover:bg-blue-700">
            {actionLabel}
          </button>
        )}
        {secondaryLabel && secondaryHref && (
          <Link href={secondaryHref}
            className="text-sm text-gray-600 hover:text-gray-900 underline">
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

// src/app/dashboard/projects/page.tsx
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { FolderOpen } from "lucide-react";
import { ProjectList } from "@/components/projects/project-list";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  const hasEverCreated = await db.onboardingEvent.findFirst({
    where: { userId: session.user.id, toStep: "FIRST_ITEM_CREATED" },
  });

  if (projects.length === 0 && !hasEverCreated) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-8 w-8" />}
        title="Create your first project"
        description="Projects help you organize your work. Create one to get
          started and see how everything comes together."
        actionLabel="Create project"
        actionHref="/projects/new"
        secondaryLabel="Watch a 30-second demo"
        secondaryHref="/demo/projects"
      />
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-8 w-8" />}
        title="No projects"
        description="You don't have any active projects."
        actionLabel="New project"
        actionHref="/projects/new"
      />
    );
  }

  return <ProjectList projects={projects} />;
}
```

### 5. Onboarding Funnel and Time-to-Value SQL Queries

```sql
-- Onboarding funnel by segment (last 30 days)
WITH signups AS (
  SELECT id AS user_id, segment, created_at
  FROM users
  WHERE created_at >= NOW() - INTERVAL '30 days'
),
completions AS (
  SELECT s.user_id, s.segment, oe.to_step
  FROM signups s
  INNER JOIN onboarding_events oe ON s.user_id = oe.user_id
)
SELECT
  segment,
  COUNT(DISTINCT user_id) AS signups,
  COUNT(DISTINCT user_id) FILTER (WHERE to_step = 'WORKSPACE_CREATED') AS workspaces,
  COUNT(DISTINCT user_id) FILTER (WHERE to_step = 'FIRST_ITEM_CREATED') AS first_items,
  COUNT(DISTINCT user_id) FILTER (WHERE to_step = 'ACTIVATED') AS activated,
  ROUND(
    COUNT(DISTINCT user_id) FILTER (WHERE to_step = 'ACTIVATED')::numeric /
    NULLIF(COUNT(DISTINCT user_id), 0) * 100, 1
  ) AS activation_rate_pct
FROM (SELECT DISTINCT user_id, segment FROM signups) base
LEFT JOIN completions USING (user_id, segment)
GROUP BY segment ORDER BY segment;

-- Time-to-value distribution by segment (p50/p75/p90 in minutes)
SELECT
  segment,
  COUNT(*) AS activated_users,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (activated_at - created_at))
  )::numeric / 60, 1) AS p50_minutes,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (activated_at - created_at))
  )::numeric / 60, 1) AS p75_minutes,
  ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (activated_at - created_at))
  )::numeric / 60, 1) AS p90_minutes
FROM users
WHERE activated_at IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY segment ORDER BY segment;

-- Activation cohort: % activated within 1, 3, 7 days per weekly cohort
SELECT
  DATE_TRUNC('week', created_at) AS cohort_week,
  COUNT(*) AS signups,
  COUNT(*) FILTER (
    WHERE activated_at <= created_at + INTERVAL '1 day'
  ) AS activated_day_1,
  COUNT(*) FILTER (
    WHERE activated_at <= created_at + INTERVAL '7 days'
  ) AS activated_day_7,
  ROUND(
    COUNT(*) FILTER (WHERE activated_at <= created_at + INTERVAL '7 days')::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS activation_rate_7d_pct
FROM users
WHERE created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY cohort_week ORDER BY cohort_week;
```

---

## Common Mistakes

### 1. Storing Onboarding State Only on the Client

**Wrong:** Tracking progress in localStorage. The user completes three steps on their laptop, opens the app on their phone, and sees a fresh onboarding flow.

```typescript
const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
  return JSON.parse(localStorage.getItem("onboarding") ?? "[]");
});
```

**Fix:** Store onboarding state in the database. Client-side state is a cache for optimistic updates, not the source of truth.

```typescript
const user = await db.user.findUnique({
  where: { id: session.user.id },
  select: { onboardingStep: true, segment: true },
});
```

### 2. Blocking the Product Behind Onboarding

**Wrong:** Forcing users to complete every step before accessing the product. A redirect loop that always sends back to `/onboarding`.

```typescript
if (user.onboardingStep !== "ACTIVATED") {
  redirect("/onboarding"); // No escape
}
```

**Fix:** Make onboarding skippable and dismissible. The product should work without completing onboarding. Show the checklist alongside the product, not instead of it.

```typescript
if (user.onboardingStep !== "ACTIVATED" && !user.onboardingDismissedAt) {
  // Show checklist alongside the product — do not redirect
}
```

### 3. Asking for Too Much at Signup

**Wrong:** A signup form with 8 fields. Every optional field costs 5-10% of potential signups.

```typescript
<form>
  <input name="email" required />
  <input name="password" required />
  <input name="name" required />
  <input name="company" />       {/* ask later */}
  <select name="teamSize" />     {/* ask later */}
  <textarea name="useCase" />    {/* ask later */}
</form>
```

**Fix:** Collect email and password at signup. Collect everything else progressively at contextually appropriate moments.

### 4. Treating All Users the Same

**Wrong:** Showing the same flow to every user. A developer who wants the API is forced through a UI walkthrough. An admin who wants to configure the team creates a sample project first.

**Fix:** Segment users immediately after signup and route them to tailored flows.

```typescript
const steps = getStepsForSegment(user.segment);
// Developer: API key → Code example → First API call → Activated
// Manager: Workspace → Invite team → Create project → Activated
```

### 5. Empty States That Say Nothing

**Wrong:** An empty dashboard that shows "No data" or a blank white space.

```typescript
{projects.length === 0 && <p>No projects found.</p>}
```

**Fix:** Every empty state explains what goes here, why it matters, and provides a clear action.

```typescript
{projects.length === 0 && (
  <EmptyState
    icon={<FolderOpen className="h-8 w-8" />}
    title="Create your first project"
    description="Projects organize your work. Create one to see how it works."
    actionLabel="Create project"
    actionHref="/projects/new"
  />
)}
```

### 6. Tours That Block Interaction

**Wrong:** A modal-based tour that covers the screen and only lets the user click "Next." The user learns nothing.

```typescript
<Modal open={tourActive}>
  <p>Here you can see your projects.</p>
  <button onClick={nextStep}>Next</button>
</Modal>
```

**Fix:** Use the spotlight pattern. Dim the background, highlight the target, and let the user interact with it. Advance when the user performs the action.

### 7. No Activation Metric in the Database

**Wrong:** Defining activation only in the analytics tool. You can see rates in PostHog but cannot query them in SQL or join with revenue data.

```typescript
analytics.track("user_activated", { userId });
// Where is activated_at in the database? Nowhere.
```

**Fix:** Store `activatedAt` on the user record. Set it when the activation event fires.

```typescript
await db.user.update({
  where: { id: userId },
  data: { activatedAt: new Date() },
});
trackServerEvent(userId, "onboarding_completed", { duration_seconds: ttv });
```

### 8. Hardcoding Steps Instead of Configuration

**Wrong:** Scattering step logic across components with hardcoded names. Adding a step requires modifying five files.

```typescript
if (user.onboardingStep === "step_2") { /* ... */ }
// In another file:
const isOnboarding = !["step_5", "completed"].includes(user.onboardingStep);
```

**Fix:** Define all steps in a single configuration file. All components read from it. Adding or reordering steps means changing one file.

```typescript
import { STEP_CONFIG, getStepsForSegment } from "@/lib/onboarding/steps";
const steps = getStepsForSegment(user.segment);
const isOnboarding = steps.indexOf(user.onboardingStep) < steps.indexOf("ACTIVATED");
```

### 9. Never Measuring Time-to-Value

**Wrong:** Building an onboarding flow without measuring how long it takes to reach the aha moment. No idea if onboarding takes 2 minutes or 20 minutes.

**Fix:** Track timestamps at every transition. Compute TTV as time from signup to activation. Report p50, p75, p90. Segment by channel and user type.

```sql
SELECT
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (activated_at - created_at))
  )::numeric / 60, 1) AS p50_minutes,
  ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (activated_at - created_at))
  )::numeric / 60, 1) AS p90_minutes
FROM users
WHERE activated_at IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days';
```

### 10. Replaying Completed Tours

**Wrong:** The tour shows every time because completion is not persisted. The user dismisses it, refreshes, and it starts again.

```typescript
useEffect(() => {
  startTour("dashboard_intro"); // Fires every mount
}, []);
```

**Fix:** Persist completion in the database. Check before starting.

```typescript
useEffect(() => {
  if (!completedTours.includes("dashboard_intro")) {
    startTour("dashboard_intro");
  }
}, [completedTours]);
```

---

> **See also:** [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md) | [Retention-Engagement](../Retention-Engagement/retention-engagement.md) | [Conversion-Optimization](../Conversion-Optimization/conversion-optimization.md) | [Product-Led-Growth](../Product-Led-Growth/product-led-growth.md) | [Email-Notification-Systems](../Email-Notification-Systems/email-notification-systems.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind ([ryanlind.co.uk](https://ryanlind.co.uk)), Assisted by Claude Code and Google Gemini.*
