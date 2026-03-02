---
title: "Retention & Engagement"
description: Cohort retention analysis, engagement loop architecture, churn prediction scoring, feature adoption tracking, re-engagement workflows, digest email systems, gamification patterns, and habit-forming product design. Acquisition fills the top of the funnel — retention determines whether anything stays in it.
---
# Retention & Engagement
> Cohort retention analysis, engagement loop architecture, churn prediction scoring, feature adoption tracking, re-engagement workflows, digest email systems, gamification patterns, and habit-forming product design. Acquisition fills the top of the funnel — retention determines whether anything stays in it.

---

## Principles

### 1. Retention Is the Only Metric That Matters Long-Term

Acquisition without retention is a leaking bucket. You can spend aggressively on marketing, optimize every conversion surface, and drive thousands of signups per week — but if users leave faster than they arrive, the product is dying. Retention is the compounding force behind sustainable growth: a 5% improvement in monthly retention compounds into dramatically different user bases over 12 months. If you retain 40% of users month-over-month, a cohort of 1,000 shrinks to 17 users after 12 months. If you retain 50%, that same cohort is 49 users. At 60%, it is 129. Small retention improvements create exponential divergence over time.

Retention measures whether your product delivers ongoing value — not just a good first impression, but a reason to come back. It is the most honest metric because it cannot be gamed with marketing spend or viral tricks. A product with strong retention and weak acquisition will eventually win against a product with strong acquisition and weak retention, because each retained user is a future referrer, a future upsell candidate, and a future advocate.

Measuring retention requires precision about what "retained" means. For a daily-use communication tool, a retained user sends at least one message per day. For a weekly project management tool, it is someone who logs in at least once per week. For a monthly invoicing tool, someone who creates at least one invoice per month. The retention definition must match the product's natural usage frequency — measuring daily retention for a tool people use monthly produces misleading numbers.

### 2. Cohort Analysis Reveals What Aggregate Metrics Hide

Aggregate retention rates are dangerously misleading. If your overall 30-day retention is 45%, that number blends together dozens of cohorts with different characteristics and different product versions. January's cohort might retain at 35% while March's cohort retains at 55%, but the blended number hides both the problem and the improvement. Without cohort analysis, you cannot tell whether product changes are working.

A retention cohort groups users by signup date (weekly or monthly) and tracks their behavior over subsequent time periods. The output is a retention curve: the percentage of each cohort active in week 1, week 2, week 3, and so on. Healthy products show retention curves that flatten — they drop steeply in the first few weeks as uncommitted users leave, then stabilize as remaining users find lasting value. If your curves never flatten and keep declining toward zero, your product has a fundamental value problem that no growth hacking will fix.

Cohort analysis also enables causal reasoning about product changes. If you shipped a new onboarding flow in Week 10 and every subsequent cohort shows improved Week-1 retention, the change is likely responsible. Behavioral cohorts — grouping by what users did, not when they signed up — reveal which actions predict long-term retention, telling you exactly which behaviors to encourage during onboarding.

### 3. Engagement Loops Are the Engine of Retention

Retention does not happen by accident. Users return because the product creates self-reinforcing engagement loops — recurring cycles of trigger, action, reward, and investment that pull users back. An external or internal trigger prompts the user to take an action, the action delivers a variable reward, and the user makes an investment that improves the product for their next visit. The investment creates the next trigger, closing the loop.

External triggers are notifications, emails, and alerts — "Sarah commented on your document." Internal triggers are emotions and habits — boredom leads to opening Twitter, anxiety about missing updates leads to opening Slack. Products that rely solely on external triggers are fragile: if users unsubscribe from emails, the loop breaks. Products that cultivate internal triggers create habits that persist without external prompting.

The reward must be variable to sustain engagement. Fixed rewards lose motivational power quickly (habituation). Variable rewards maintain curiosity: a different feed, different notifications, different progress every return visit. Investment is the piece most products miss. When a user adds data, customizes settings, invites teammates, or creates content, they increase switching costs and improve the product for their next visit. A CRM with 500 contacts is vastly harder to leave than one with 5, regardless of feature quality.

### 4. Churn Prediction Catches At-Risk Users Before They Leave

By the time a user has churned, it is usually too late. The window of opportunity is the period between disengagement and departure. Churn prediction identifies users in this window by analyzing behavioral signals that historically precede churn: declining login frequency, decreasing feature depth, dropping off key actions, and shrinking session duration. Each signal contributes to a composite churn risk score.

A simple but effective churn scoring model does not require machine learning. Calculate a weighted score based on observable behaviors: days since last login (high weight), change in weekly active days (medium weight), number of core actions in the last 7 days vs. the previous 7 (medium weight), and whether the user has completed retention-correlated actions like inviting a teammate (binary flags with high weight). Normalize to 0-100, define thresholds (0-30 healthy, 30-60 at risk, 60-100 critical), and run daily.

The most important insight from churn analysis is usually systemic, not individual. If 80% of users who never invite a teammate churn within 60 days, the solution is not more reminder emails — it is making team invitation a core part of onboarding so fewer users reach the at-risk state in the first place.

### 5. Feature Adoption Is Retention Insurance

Users who adopt multiple features retain at dramatically higher rates than single-feature users. Each additional feature creates another reason to return, another switching cost, and another engagement loop. A user who uses your tool only for task lists might churn when a simpler alternative appears. A user who uses task lists, time tracking, team chat, and reporting has built their workflow around your product.

Feature adoption tracking measures three stages. "Discovered" means the user has accessed the feature at least once. "Tried" means they performed the core action. "Adopted" means they have used it on multiple occasions across multiple sessions. Low discovery means a visibility problem. Low trial-after-discovery means a usability or relevance problem. Low adoption-after-trial means a value problem. Each stage requires a different intervention.

Tracking requires deliberate instrumentation. For each feature, define the "core action" event — not just viewing the feature page, but performing the action it enables. Track with a `feature` property and build an adoption matrix: for each user, which features have they discovered, tried, and adopted. This matrix reveals which features need promotion and which users are under-engaged.

### 6. Re-engagement Must Be Timely, Relevant, and Finite

When a user disengages, the re-engagement window is narrow. The probability of re-engagement drops exponentially with time — a user inactive for 3 days is far easier to bring back than one inactive for 30 days. Re-engagement workflows must trigger quickly (within 24-48 hours for daily-use products), deliver relevant content (not generic "we miss you" messages), and have a defined endpoint.

Effective re-engagement is contextual. A user who stopped after creating a project but never adding tasks needs activation help. A user who was highly active for 3 months and suddenly went silent might be on vacation or evaluating a competitor. The content should match the journey stage: early users get guidance, established users get updates on activity they are missing, and long-dormant users get product update announcements.

Re-engagement workflows must have exit conditions. A three-email sequence over 10 days is a reasonable default: day 2 (value reminder), day 5 (social proof + what they are missing), day 10 (last chance + feedback request). If the user does not re-engage, stop. Move long-dormant users to a quarterly product-update cadence. Continuing to email damages sender reputation and provides negligible return.

### 7. Gamification Works When It Reinforces Real Value

Gamification — streaks, progress bars, milestones, achievements — is powerful and easily abused. When done well, it makes valuable behaviors visible and habit-forming. When done poorly, it manipulates users into hollow actions that generate vanity metrics. The test: does the rewarded behavior create genuine value for the user independent of the reward?

Progress bars are the safest and most universally effective pattern because they make existing progress visible rather than creating artificial incentives. An onboarding progress bar ("60% set up") provides orientation and leverages completion bias. Milestones work best when they celebrate outcomes rather than inputs: "completed 100 tasks" celebrates output, "logged in 30 days in a row" celebrates attendance.

Before adding any gamification element, ask whether you are rewarding value or rewarding presence. Streaks work for Duolingo because daily practice genuinely helps the user learn. A streak on a SaaS dashboard that rewards daily logins regardless of activity is hollow — it incentivizes opening the app and closing it. Achievement systems should mark genuinely meaningful moments: first project completed, first team member invited, first client report generated.

### 8. Habit Formation Requires Consistent Timing and Low Friction

A habit is a behavior performed automatically in response to a cue, with minimal deliberation. Products that become habits achieve retention rates that no re-engagement emailing can match. Habit formation requires a consistent cue (the trigger happens at the same time or context), low friction (the behavior requires minimal effort), and immediate reward (a satisfying result right away).

Consistent timing is critical. Products that embed into existing routines — checking a dashboard every morning, reviewing a weekly summary on Monday, logging time at end of day — have natural timing cues. Send the morning summary at 8 AM, surface the weekly review on Monday, deliver end-of-day digests at 5 PM. The product should meet the user at the moment their routine creates an opening.

Low friction means the core action is achievable in under 30 seconds from trigger. A push notification saying "Review your team's progress" should land the user directly on the progress view — not on a login screen, not on a home page. Deep links, persistent sessions, pre-loaded data, and optimistic UI protect the habit loop. Immediate reward means the user experiences value within seconds: new data, progress updates, or actionable insights — not an empty state or stale data.

---

## LLM Instructions

### 1. Building Cohort Retention Analysis

When asked to build retention analysis, implement SQL-based cohort retention with a visualization-ready output format.

1. Create the events table schema if it does not exist: `id` (UUID), `user_id` (UUID, indexed), `event_name` (varchar, indexed), `properties` (JSONB), `timestamp` (timestamptz). Add composite indexes on `(user_id, event_name, timestamp)` and `(event_name, timestamp)`.
2. Define the "activation event" that creates cohort assignment (e.g., `signup_completed`). Use `DATE_TRUNC('week', ...)` for weekly cohorts or `DATE_TRUNC('month', ...)` for monthly.
3. Define the "retention event" — a meaningful product action, not passive page views. Use a list of core actions like `task_completed`, `message_sent`, `report_generated`.
4. Write the retention query using CTEs: first CTE groups users by cohort period, second identifies distinct activity periods per user, final query joins to calculate retention percentage per cohort per period.
5. Create a Next.js Route Handler that accepts `granularity`, `periods`, and `date_range` as query params. Return JSON structured for heatmap rendering: rows are cohorts, columns are periods, values are retention percentages.
6. Render as a triangular heatmap table with green color intensity representing retention. Dark green for high retention, light green for low.

### 2. Implementing Engagement Loops and Notification Triggers

When asked to build engagement loops, implement trigger-action-reward-investment with automated notification triggers.

1. Define the core loop: identify the primary repeatable action, the reward, and the investment that creates the next trigger.
2. Create a `notification_triggers` table: `id`, `user_id`, `trigger_type` (enum: inactivity, social, progress, digest), `channel` (enum: email, push, in_app), `payload` (JSONB), `scheduled_for` (timestamptz), `sent_at` (nullable), `status` (enum: pending, sent, cancelled, failed). Index on `(status, scheduled_for)`.
3. Implement trigger detection as a daily cron job. For each type: inactivity triggers find users inactive for N days, social triggers find users with unread mentions, progress triggers find users approaching milestones, digest triggers compile activity summaries.
4. For each trigger, insert into the notification table with personalized payload: user name, specific activity, and a deep link URL to the relevant product context.
5. Implement the sender as a separate cron that processes pending notifications, sends via the appropriate channel, and updates status. Rate limit to 1 email per user per day (except direct mentions).

### 3. Building a Churn Prediction Scoring System

When asked to build churn prediction, implement a rule-based scoring model on a daily schedule feeding re-engagement workflows.

1. Create `user_engagement_scores` table: `user_id` (UUID, PK), `score` (int 0-100), `risk_level` (enum: healthy, at_risk, critical), `factors` (JSONB), `last_active_at` (timestamptz), `score_updated_at` (timestamptz). Index on `(risk_level, score)`.
2. Define scoring signals: `days_since_last_login` (weight 30), `weekly_active_days_trend` (weight 20), `core_actions_last_7d` (weight 20), `feature_breadth` (weight 15), `has_team_members` (weight 15). Each signal computes a 0.0-1.0 sub-score multiplied by weight.
3. For each signal, implement a SQL-backed compute function. `days_since_last_login` maps 0 days to 0.0 risk, 14+ days to 1.0 risk, linear between. `weekly_active_days_trend` compares this week to a 4-week average. `core_actions_last_7d` scales from 0 (10+ actions) to 1.0 (zero actions).
4. Run scoring daily for all users active in the last 90 days. Upsert into `user_engagement_scores` with factor breakdown in JSONB.
5. On risk level transitions (healthy to at_risk, at_risk to critical), enqueue re-engagement notifications. On improvement (back to healthy), cancel pending notifications.

### 4. Implementing Feature Adoption Tracking

When asked to track feature adoption, instrument each feature's core action and build an adoption matrix.

1. Define a feature registry listing every trackable feature with `feature_key`, `display_name`, `core_action_event`, and `adoption_threshold` (distinct weeks qualifying as adopted, typically 3).
2. Instrument each feature's core action with a `feature` property: `analytics.track("time_entry_created", { feature: "time_tracking", ... })`.
3. Create `user_feature_adoption` table: `user_id`, `feature_key`, `first_used_at`, `last_used_at`, `usage_count`, `distinct_weeks_used`, `status` (enum: discovered, tried, adopted). PK on `(user_id, feature_key)`.
4. Run a daily aggregation job computing adoption status from events. Feature-level metrics: discovery rate, trial-to-adoption rate, overall adoption rate.
5. Surface in an admin dashboard (feature metrics) and as in-product contextual prompts for undiscovered features.

### 5. Building Digest Email and Gamification Systems

When asked to build digests or gamification, implement activity aggregation and database-backed progress tracking.

1. Create a daily/weekly aggregation job that, for each user, queries team activity: completed tasks, new comments, milestones, and new items. Group by type and sort by importance.
2. Build the digest email template (React Email) with sections: Activity Summary, Highlights (top 2-3 items with deep links), Your Progress (gamification stats), and a primary CTA. Skip the digest entirely if there is no meaningful activity.
3. For gamification, create `user_streaks` (user_id PK, current_streak, longest_streak, last_activity_date) and `user_achievements` (user_id, achievement_key, unlocked_at, metadata). Create an `achievements` definition table with keys, thresholds, and the metric being counted.
4. Implement streak logic: if `last_activity_date` is yesterday, increment. If today, no change. If earlier, reset to 1. Add configurable grace periods (weekends for B2B products). Update `longest_streak` when current exceeds it.
5. Check achievements after key events: compare the user's current metric value against each unclaimed achievement threshold. On unlock, insert into `user_achievements` and trigger an in-app toast notification.

---

## Examples

### 1. Cohort Retention SQL and API Endpoint

```sql
-- Weekly cohort retention: % of each signup cohort active N weeks later
WITH cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC('week', MIN(timestamp)) AS cohort_week
  FROM events
  WHERE event_name = 'signup_completed'
    AND timestamp >= NOW() - INTERVAL '12 weeks'
  GROUP BY user_id
),
activity AS (
  SELECT DISTINCT
    user_id,
    DATE_TRUNC('week', timestamp) AS activity_week
  FROM events
  WHERE event_name IN (
    'project_created', 'task_completed', 'message_sent',
    'report_generated', 'file_uploaded', 'comment_added'
  )
  AND timestamp >= NOW() - INTERVAL '12 weeks'
),
retention AS (
  SELECT
    c.cohort_week,
    FLOOR(EXTRACT(EPOCH FROM (a.activity_week - c.cohort_week)) / (7 * 86400))::int AS week_number,
    COUNT(DISTINCT a.user_id) AS active_users,
    (SELECT COUNT(DISTINCT c2.user_id) FROM cohorts c2
     WHERE c2.cohort_week = c.cohort_week) AS cohort_size
  FROM cohorts c
  LEFT JOIN activity a ON c.user_id = a.user_id AND a.activity_week >= c.cohort_week
  GROUP BY c.cohort_week, week_number
)
SELECT
  cohort_week,
  week_number,
  cohort_size,
  active_users,
  ROUND(active_users::numeric / NULLIF(cohort_size, 0) * 100, 1) AS retention_pct
FROM retention
WHERE week_number BETWEEN 0 AND 8
ORDER BY cohort_week, week_number;
```

```typescript
// src/app/api/retention/route.ts
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const granularity = params.get("granularity") ?? "week";
  const periods = Math.min(parseInt(params.get("periods") ?? "8"), 12);
  const trunc = granularity === "week" ? "'week'" : "'month'";
  const lookback = granularity === "week" ? `${periods + 4} weeks` : `${periods + 2} months`;
  const periodCalc = granularity === "week"
    ? "FLOOR(EXTRACT(EPOCH FROM (a.ap - c.cp)) / 604800)::int"
    : "EXTRACT(MONTH FROM AGE(a.ap, c.cp))::int";

  const rows = await db.query(`
    WITH cohorts AS (
      SELECT user_id, DATE_TRUNC(${trunc}, MIN(timestamp)) AS cp
      FROM events WHERE event_name = 'signup_completed'
        AND timestamp >= NOW() - INTERVAL '${lookback}'
      GROUP BY user_id
    ),
    activity AS (
      SELECT DISTINCT user_id, DATE_TRUNC(${trunc}, timestamp) AS ap
      FROM events
      WHERE event_name IN ('task_completed','message_sent','report_generated','file_uploaded')
        AND timestamp >= NOW() - INTERVAL '${lookback}'
    ),
    ret AS (
      SELECT c.cp, ${periodCalc} AS pn,
        COUNT(DISTINCT a.user_id) AS active,
        (SELECT COUNT(DISTINCT c2.user_id) FROM cohorts c2 WHERE c2.cp = c.cp) AS size
      FROM cohorts c LEFT JOIN activity a ON c.user_id = a.user_id AND a.ap >= c.cp
      GROUP BY c.cp, pn
    )
    SELECT cp AS cohort_period, pn AS period_number, size AS cohort_size,
      active AS active_users,
      ROUND(active::numeric / NULLIF(size, 0) * 100, 1) AS retention_pct
    FROM ret WHERE pn BETWEEN 0 AND $1 ORDER BY cp, pn
  `, [periods]);

  // Group into heatmap-friendly structure
  const cohorts = new Map<string, { cohort_period: string; cohort_size: number; periods: Record<number, number> }>();
  for (const row of rows) {
    if (!cohorts.has(row.cohort_period)) {
      cohorts.set(row.cohort_period, { cohort_period: row.cohort_period, cohort_size: row.cohort_size, periods: {} });
    }
    cohorts.get(row.cohort_period)!.periods[row.period_number] = row.retention_pct;
  }

  return NextResponse.json({ granularity, total_periods: periods, cohorts: Array.from(cohorts.values()) });
}
```

### 2. Churn Prediction Scoring System

```typescript
// src/lib/retention/churn-score.ts
import { db } from "@/lib/db";

interface ChurnSignal {
  name: string;
  weight: number;
  compute: (userId: string) => Promise<number>; // 0.0 (healthy) to 1.0 (at risk)
}

const signals: ChurnSignal[] = [
  {
    name: "days_since_last_login",
    weight: 30,
    async compute(userId) {
      const r = await db.query<{ days: number }>(`
        SELECT EXTRACT(DAY FROM NOW() - MAX(timestamp))::int AS days
        FROM events WHERE user_id = $1
          AND event_name IN ('page_viewed', 'feature_used', 'session_started')
      `, [userId]);
      return Math.min((r[0]?.days ?? 999) / 14, 1.0);
    },
  },
  {
    name: "weekly_active_days_decline",
    weight: 20,
    async compute(userId) {
      const r = await db.query<{ this_week: number; avg_4w: number }>(`
        WITH weekly AS (
          SELECT DATE_TRUNC('week', timestamp) AS w, COUNT(DISTINCT DATE_TRUNC('day', timestamp)) AS d
          FROM events WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '5 weeks'
            AND event_name IN ('page_viewed', 'feature_used') GROUP BY w ORDER BY w DESC
        )
        SELECT COALESCE((SELECT d FROM weekly LIMIT 1), 0) AS this_week,
               COALESCE((SELECT AVG(d) FROM weekly OFFSET 1), 0) AS avg_4w
      `, [userId]);
      if (r[0].avg_4w === 0) return r[0].this_week === 0 ? 1.0 : 0.0;
      return Math.max(0, Math.min(1 - r[0].this_week / r[0].avg_4w, 1.0));
    },
  },
  {
    name: "core_actions_last_7d",
    weight: 20,
    async compute(userId) {
      const r = await db.query<{ count: number }>(`
        SELECT COUNT(*) AS count FROM events WHERE user_id = $1
          AND event_name IN ('project_created','task_completed','message_sent','report_generated')
          AND timestamp >= NOW() - INTERVAL '7 days'
      `, [userId]);
      return Math.max(0, 1.0 - (r[0]?.count ?? 0) / 10);
    },
  },
  {
    name: "feature_breadth",
    weight: 15,
    async compute(userId) {
      const r = await db.query<{ recent: number; peak: number }>(`
        SELECT
          (SELECT COUNT(DISTINCT properties->>'feature') FROM events
           WHERE user_id = $1 AND event_name = 'feature_used'
             AND timestamp >= NOW() - INTERVAL '30 days') AS recent,
          (SELECT COUNT(DISTINCT properties->>'feature') FROM events
           WHERE user_id = $1 AND event_name = 'feature_used') AS peak
      `, [userId]);
      return r[0].peak === 0 ? 1.0 : Math.max(0, 1.0 - r[0].recent / r[0].peak);
    },
  },
  {
    name: "has_team_members",
    weight: 15,
    async compute(userId) {
      const r = await db.query<{ ct: number }>(`
        SELECT COUNT(*) AS ct FROM team_memberships
        WHERE team_id IN (SELECT team_id FROM team_memberships WHERE user_id = $1)
          AND user_id != $1
      `, [userId]);
      return r[0].ct > 0 ? 0.0 : 1.0;
    },
  },
];

export async function computeChurnScore(userId: string) {
  const factors: Record<string, { raw: number; weighted: number }> = {};
  let total = 0;
  for (const s of signals) {
    const raw = await s.compute(userId);
    const weighted = Math.round(raw * s.weight);
    factors[s.name] = { raw: Math.round(raw * 100) / 100, weighted };
    total += weighted;
  }
  const score = Math.min(100, total);
  const riskLevel = score >= 60 ? "critical" : score >= 30 ? "at_risk" : "healthy";
  return { userId, score, riskLevel, factors };
}

// src/app/api/cron/churn-scores/route.ts — daily scoring cron
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeChurnScore } from "@/lib/retention/churn-score";

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await db.query<{ user_id: string }>(`
    SELECT DISTINCT user_id FROM events
    WHERE timestamp >= NOW() - INTERVAL '90 days'
  `);

  let scored = 0, riskChanges = 0;
  for (const { user_id } of users) {
    const prev = await db.query<{ risk_level: string }>(
      `SELECT risk_level FROM user_engagement_scores WHERE user_id = $1`, [user_id]
    );
    const result = await computeChurnScore(user_id);

    await db.query(`
      INSERT INTO user_engagement_scores (user_id, score, risk_level, factors, score_updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        score = $2, risk_level = $3, factors = $4, score_updated_at = NOW()
    `, [user_id, result.score, result.riskLevel, JSON.stringify(result.factors)]);

    if (prev[0] && prev[0].risk_level !== result.riskLevel) {
      riskChanges++;
      if (result.riskLevel !== "healthy") {
        await db.query(`
          INSERT INTO notification_triggers (user_id, trigger_type, channel, payload, scheduled_for, status)
          VALUES ($1, 'inactivity', 'email', $2, NOW() + INTERVAL '1 hour', 'pending')
        `, [user_id, JSON.stringify({ risk_level: result.riskLevel, template: result.riskLevel === "critical" ? "urgent" : "gentle" })]);
      }
    }
    scored++;
  }
  return NextResponse.json({ scored, riskChanges });
}
```

### 3. Gamification: Streaks, Achievements, and Progress

```sql
-- Gamification schema
CREATE TABLE user_streaks (
  user_id           UUID PRIMARY KEY REFERENCES users(id),
  current_streak    INT NOT NULL DEFAULT 0,
  longest_streak    INT NOT NULL DEFAULT 0,
  last_activity_date DATE,
  streak_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE achievements (
  key               VARCHAR(100) PRIMARY KEY,
  display_name      VARCHAR(255) NOT NULL,
  description       TEXT NOT NULL,
  icon              VARCHAR(100) NOT NULL,
  category          VARCHAR(50) NOT NULL,   -- milestone, streak, social, exploration
  threshold         INT NOT NULL,
  threshold_metric  VARCHAR(100) NOT NULL
);

CREATE TABLE user_achievements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  achievement_key   VARCHAR(100) NOT NULL REFERENCES achievements(key),
  unlocked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata          JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_key)
);

INSERT INTO achievements (key, display_name, description, icon, category, threshold, threshold_metric) VALUES
  ('first_project',   'Getting Started',  'Created your first project',       'rocket', 'milestone', 1,    'projects_created'),
  ('task_master_100', 'Task Champion',     'Completed 100 tasks',              'trophy', 'milestone', 100,  'tasks_completed'),
  ('team_player',     'Team Player',       'Invited your first team member',   'users',  'social',    1,    'invites_sent'),
  ('streak_7',        'On a Roll',         '7-day activity streak',            'flame',  'streak',    7,    'current_streak'),
  ('streak_30',       'Unstoppable',       '30-day activity streak',           'fire',   'streak',    30,   'current_streak'),
  ('explorer',        'Explorer',          'Used 5 different features',        'compass','exploration',5,   'features_used')
ON CONFLICT (key) DO NOTHING;
```

```typescript
// src/lib/retention/streaks.ts
import { db } from "@/lib/db";

const GRACE_DAYS = [0, 6]; // Sunday, Saturday don't break B2B streaks

function getEffectiveGap(lastDate: Date, today: Date): number {
  let gap = 0;
  const d = new Date(lastDate);
  d.setDate(d.getDate() + 1);
  while (d < today) {
    if (!GRACE_DAYS.includes(d.getDay())) gap++;
    d.setDate(d.getDate() + 1);
  }
  return gap;
}

export async function updateStreak(userId: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const existing = await db.query<{ current_streak: number; longest_streak: number; last_activity_date: string | null }>(
    `SELECT current_streak, longest_streak, last_activity_date FROM user_streaks WHERE user_id = $1`, [userId]
  );

  if (!existing.length) {
    await db.query(`INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date) VALUES ($1, 1, 1, $2)`, [userId, todayStr]);
    return { currentStreak: 1, longestStreak: 1, broken: false };
  }

  const { current_streak, longest_streak, last_activity_date } = existing[0];
  if (last_activity_date === todayStr) return { currentStreak: current_streak, longestStreak: longest_streak, broken: false };

  const gap = getEffectiveGap(new Date(last_activity_date + "T00:00:00"), today);
  const newStreak = gap <= 1 ? current_streak + 1 : 1;
  const newLongest = Math.max(longest_streak, newStreak);

  await db.query(`UPDATE user_streaks SET current_streak = $2, longest_streak = $3, last_activity_date = $4, streak_updated_at = NOW() WHERE user_id = $1`,
    [userId, newStreak, newLongest, todayStr]);

  return { currentStreak: newStreak, longestStreak: newLongest, broken: gap > 1 && current_streak > 1 };
}

// src/lib/retention/achievements.ts
import { db } from "@/lib/db";

const metricResolvers: Record<string, (uid: string) => Promise<number>> = {
  projects_created: async (uid) => (await db.query<{ c: number }>(`SELECT COUNT(*) AS c FROM events WHERE user_id=$1 AND event_name='project_created'`, [uid]))[0]?.c ?? 0,
  tasks_completed: async (uid) => (await db.query<{ c: number }>(`SELECT COUNT(*) AS c FROM events WHERE user_id=$1 AND event_name='task_completed'`, [uid]))[0]?.c ?? 0,
  invites_sent: async (uid) => (await db.query<{ c: number }>(`SELECT COUNT(*) AS c FROM events WHERE user_id=$1 AND event_name='invite_sent'`, [uid]))[0]?.c ?? 0,
  features_used: async (uid) => (await db.query<{ c: number }>(`SELECT COUNT(DISTINCT properties->>'feature') AS c FROM events WHERE user_id=$1 AND event_name='feature_used'`, [uid]))[0]?.c ?? 0,
  current_streak: async (uid) => (await db.query<{ s: number }>(`SELECT current_streak AS s FROM user_streaks WHERE user_id=$1`, [uid]))[0]?.s ?? 0,
};

export async function checkAchievements(userId: string) {
  const unclaimed = await db.query<{ key: string; display_name: string; description: string; icon: string; threshold: number; threshold_metric: string }>(`
    SELECT a.* FROM achievements a
    WHERE NOT EXISTS (SELECT 1 FROM user_achievements ua WHERE ua.user_id = $1 AND ua.achievement_key = a.key)
  `, [userId]);

  const unlocked: Array<{ key: string; displayName: string; description: string }> = [];
  for (const a of unclaimed) {
    const resolver = metricResolvers[a.threshold_metric];
    if (!resolver) continue;
    if (await resolver(userId) >= a.threshold) {
      await db.query(`INSERT INTO user_achievements (user_id, achievement_key, metadata) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [userId, a.key, JSON.stringify({})]);
      unlocked.push({ key: a.key, displayName: a.display_name, description: a.description });
    }
  }
  return unlocked;
}
```

### 4. Re-engagement Workflow and Digest Email System

```typescript
// src/lib/retention/re-engagement.ts
import { db } from "@/lib/db";

const SEQUENCE = [
  { delayDays: 2, template: "re_engagement_day2", subject: (n: string) => `${n}, here's what you can do next` },
  { delayDays: 5, template: "re_engagement_day5", subject: (n: string) => `${n}, your team has been active` },
  { delayDays: 10, template: "re_engagement_day10", subject: () => `We'd love your feedback` },
];

export async function processReEngagementTriggers() {
  // Find newly at-risk users who haven't been contacted recently
  const atRisk = await db.query<{ user_id: string; email: string; name: string; risk_level: string }>(`
    SELECT ues.user_id, u.email, u.name, ues.risk_level
    FROM user_engagement_scores ues
    JOIN users u ON ues.user_id = u.id
    WHERE ues.risk_level IN ('at_risk', 'critical')
      AND ues.score_updated_at >= NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM notification_triggers nt
        WHERE nt.user_id = ues.user_id AND nt.trigger_type = 'inactivity'
          AND nt.status IN ('pending', 'sent') AND nt.created_at >= NOW() - INTERVAL '14 days'
      )
  `);

  let enqueued = 0;
  for (const user of atRisk) {
    for (const step of SEQUENCE) {
      await db.query(`
        INSERT INTO notification_triggers (user_id, trigger_type, channel, payload, scheduled_for, status)
        VALUES ($1, 'inactivity', 'email', $2, $3, 'pending')
      `, [user.user_id,
          JSON.stringify({ template: step.template, subject: step.subject(user.name), email: user.email }),
          new Date(Date.now() + step.delayDays * 86400000).toISOString()]);
      enqueued++;
    }
  }

  // Cancel pending emails for returned users
  const cancelled = await db.query(`
    UPDATE notification_triggers nt SET status = 'cancelled'
    FROM user_engagement_scores ues
    WHERE nt.user_id = ues.user_id AND ues.risk_level = 'healthy'
      AND nt.trigger_type = 'inactivity' AND nt.status = 'pending'
  `);

  return { enqueued, cancelled: cancelled.length };
}

// src/lib/retention/digest.ts
import { db } from "@/lib/db";
import { render } from "@react-email/render";
import { sendEmail } from "@/lib/email";

export async function generateAndSendDigests() {
  const users = await db.query<{ user_id: string; email: string; name: string }>(`
    SELECT u.id AS user_id, u.email, u.name FROM users u
    JOIN user_preferences up ON u.id = up.user_id
    WHERE up.digest_enabled = true
      AND EXISTS (SELECT 1 FROM events WHERE user_id = u.id AND timestamp >= NOW() - INTERVAL '30 days')
  `);

  let sent = 0;
  for (const user of users) {
    const activities = await db.query<{ event_name: string; count: number }>(`
      SELECT event_name, COUNT(*) AS count FROM events
      WHERE user_id IN (
        SELECT user_id FROM team_memberships
        WHERE team_id IN (SELECT team_id FROM team_memberships WHERE user_id = $1)
      )
      AND event_name IN ('task_completed','comment_added','project_created','milestone_reached')
      AND timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY event_name ORDER BY count DESC
    `, [user.user_id]);

    // Skip if no meaningful activity
    if (activities.reduce((sum, a) => sum + a.count, 0) < 3) continue;

    const streak = await db.query<{ current_streak: number }>(
      `SELECT current_streak FROM user_streaks WHERE user_id = $1`, [user.user_id]
    );

    await sendEmail({
      to: user.email,
      subject: `Your weekly summary — ${activities.reduce((s, a) => s + a.count, 0)} activities`,
      // In production, render a React Email component here
      html: buildDigestHtml(user.name, activities, streak[0]?.current_streak ?? 0),
    });

    await db.query(`
      INSERT INTO notification_triggers (user_id, trigger_type, channel, scheduled_for, sent_at, status)
      VALUES ($1, 'digest', 'email', NOW(), NOW(), 'sent')
    `, [user.user_id]);
    sent++;
  }
  return { sent };
}

function buildDigestHtml(name: string, activities: Array<{ event_name: string; count: number }>, streak: number): string {
  const rows = activities.map(a => `<tr><td>${a.event_name.replace(/_/g, " ")}</td><td>${a.count}</td></tr>`).join("");
  return `
    <h2>Hi ${name}, here's your week</h2>
    <table>${rows}</table>
    ${streak > 0 ? `<p>Current streak: ${streak} days</p>` : ""}
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Open Dashboard</a>
  `;
}
```

### 5. Feature Adoption Tracking and Discovery Prompts

```typescript
// src/lib/retention/feature-adoption.ts
import { db } from "@/lib/db";

export const FEATURE_REGISTRY = [
  { featureKey: "task_management", displayName: "Task Management", coreEvent: "task_completed", adoptionThreshold: 3, learnUrl: "/features/tasks" },
  { featureKey: "time_tracking", displayName: "Time Tracking", coreEvent: "time_entry_created", adoptionThreshold: 3, learnUrl: "/features/time-tracking" },
  { featureKey: "reporting", displayName: "Reports", coreEvent: "report_generated", adoptionThreshold: 2, learnUrl: "/features/reports" },
  { featureKey: "team_chat", displayName: "Team Chat", coreEvent: "message_sent", adoptionThreshold: 3, learnUrl: "/features/chat" },
  { featureKey: "integrations", displayName: "Integrations", coreEvent: "integration_connected", adoptionThreshold: 1, learnUrl: "/features/integrations" },
  { featureKey: "automations", displayName: "Automations", coreEvent: "automation_created", adoptionThreshold: 2, learnUrl: "/features/automations" },
] as const;

export async function getUserAdoption(userId: string) {
  const rows = await db.query<{ feature_key: string; status: string; usage_count: number; distinct_weeks: number }>(`
    SELECT feature_key, status, usage_count, distinct_weeks_used AS distinct_weeks
    FROM user_feature_adoption WHERE user_id = $1
  `, [userId]);
  const map = new Map(rows.map(r => [r.feature_key, r]));

  return FEATURE_REGISTRY.map(f => ({
    ...f,
    status: (map.get(f.featureKey)?.status as "undiscovered" | "tried" | "adopted") ?? "undiscovered",
    usageCount: map.get(f.featureKey)?.usage_count ?? 0,
  }));
}

// Daily aggregation job
export async function aggregateFeatureAdoption() {
  for (const f of FEATURE_REGISTRY) {
    await db.query(`
      INSERT INTO user_feature_adoption (user_id, feature_key, first_used_at, last_used_at, usage_count, distinct_weeks_used, status)
      SELECT e.user_id, $1, MIN(e.timestamp), MAX(e.timestamp), COUNT(*),
        COUNT(DISTINCT DATE_TRUNC('week', e.timestamp)),
        CASE WHEN COUNT(DISTINCT DATE_TRUNC('week', e.timestamp)) >= $3 THEN 'adopted'
             WHEN COUNT(*) >= 1 THEN 'tried' ELSE 'discovered' END
      FROM events e WHERE e.event_name = $2 GROUP BY e.user_id
      ON CONFLICT (user_id, feature_key) DO UPDATE SET
        last_used_at = EXCLUDED.last_used_at, usage_count = EXCLUDED.usage_count,
        distinct_weeks_used = EXCLUDED.distinct_weeks_used, status = EXCLUDED.status
    `, [f.featureKey, f.coreEvent, f.adoptionThreshold]);
  }
}

// src/components/feature-discovery-prompt.tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { analytics } from "@/lib/analytics";

export function FeatureDiscoveryPrompt({ feature, context }: {
  feature: { featureKey: string; displayName: string; learnUrl: string };
  context: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <div className="flex-1">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          Have you tried {feature.displayName}?
        </p>
        <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">{context}</p>
        <div className="mt-3 flex gap-2">
          <Link href={feature.learnUrl}
            onClick={() => analytics.track("feature_prompt_clicked", { feature: feature.featureKey, source: "discovery_prompt" })}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            Try it out
          </Link>
          <button onClick={() => { setDismissed(true); analytics.track("feature_prompt_dismissed", { feature: feature.featureKey, source: "discovery_prompt" }); }}
            className="rounded-md px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 dark:text-blue-400">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Common Mistakes

### 1. Measuring Retention at the Wrong Frequency

**Wrong:** Measuring daily retention for a product people naturally use weekly. A project management tool showing "15% daily retention" causes panic when the product's natural cadence is 2-3 times per week.

```sql
-- Misleading: daily retention for a weekly-use product
SELECT COUNT(DISTINCT CASE WHEN active_next_day THEN user_id END)::numeric
  / COUNT(DISTINCT user_id) * 100 AS d1_retention
FROM user_activity GROUP BY DATE_TRUNC('day', first_seen);
```

**Fix:** Match measurement to natural usage frequency. Use weekly retention for weekly products, monthly for monthly products. Define "active" as a core product action, not just a login.

### 2. Using Blended Retention Instead of Cohort Retention

**Wrong:** Reporting a single overall retention rate ("our 30-day retention is 42%") without segmenting by cohort. This hides whether retention is improving or declining and makes it impossible to attribute changes to product improvements.

**Fix:** Always report by cohort. Build a retention heatmap where rows are signup cohorts and columns are subsequent periods. This reveals trends invisible in aggregate numbers.

### 3. Sending Generic "We Miss You" Re-engagement Emails

**Wrong:** Sending identical re-engagement emails to every inactive user regardless of journey stage or usage history.

```typescript
// Generic and unhelpful
await sendEmail({ to: user.email, subject: "We miss you!", body: "Come back!" });
```

**Fix:** Personalize based on user history. Reference specific activity, features they set up, or teammate progress. Include deep links.

```typescript
await sendEmail({
  to: user.email,
  subject: `${user.name}, your team completed 12 tasks this week`,
  body: `${teammate.name} left 2 comments on your items. [Review](${deepLink})`,
});
```

### 4. Building Gamification That Rewards Vanity Actions

**Wrong:** Awarding achievements for logging in, viewing pages, or clicking buttons — actions that generate metrics but deliver no real value.

```sql
-- Bad: rewards passive behavior
INSERT INTO achievements (key, threshold_metric, threshold) VALUES
  ('login_streak_7', 'consecutive_logins', 7),
  ('page_views_100', 'pages_viewed', 100);
```

**Fix:** Reward outcomes that reflect genuine product value.

```sql
-- Good: rewards valuable outcomes
INSERT INTO achievements (key, threshold_metric, threshold) VALUES
  ('task_master_100', 'tasks_completed', 100),
  ('collaborator', 'unique_commenters', 5);
```

### 5. Breaking Streaks Without Grace Periods

**Wrong:** No grace period. A user misses one Saturday and loses a 45-day streak, feels punished, and disengages entirely.

```typescript
if (lastActivityDate < yesterday) {
  currentStreak = 1; // lost 45-day streak because of a weekend
}
```

**Fix:** Add grace periods appropriate to context. For B2B, weekends and holidays should not break streaks. Warn before breaking.

```typescript
const gap = getEffectiveGap(lastDate, today); // skips grace days
if (gap <= 1) { currentStreak += 1; }
else { currentStreak = 1; }
```

### 6. Running Churn Scoring Without Calibrating Thresholds

**Wrong:** Setting thresholds arbitrarily ("above 60 is critical") without validating against historical data. The system flags 80% of users or misses 90% of churners.

**Fix:** Retroactively compute scores for historical churners. Find thresholds that capture 70%+ of eventual churners while flagging no more than 20% of total users. Recalibrate quarterly.

### 7. Sending Digest Emails With No Activity to Report

**Wrong:** Sending weekly digests with "0 tasks completed, nothing to see." This trains users to ignore all future digests.

```typescript
const digest = await generateDigest(userId);
await sendEmail({ to: user.email, subject: "Weekly summary", html: digest }); // even if empty
```

**Fix:** Skip the digest when there is no meaningful activity. Set a minimum threshold (e.g., 3+ reportable events) before sending.

```typescript
const digest = await generateDigest(userId);
if (!digest || digest.totalActivities < 3) return; // skip this week
await sendEmail({ to: user.email, subject: digest.subject, html: digest.html });
```

### 8. Not Defining Exit Conditions for Re-engagement Sequences

**Wrong:** Emailing inactive users indefinitely. A user who left 6 months ago gets weekly emails, marks you as spam, and damages sender reputation for all users.

```typescript
const inactiveUsers = await getInactiveUsers(); // no time limit
for (const user of inactiveUsers) await sendReEngagementEmail(user); // forever
```

**Fix:** Define explicit exit conditions. A 3-step sequence over 10-14 days, then quarterly dormant cadence only, then permanent stop after 12 months.

```typescript
if (daysSinceLastActivity > 365) { await unsubscribe(user.id); return; }
if (sentCount >= 3) return; // sequence complete, move to quarterly
```

### 9. Computing Retention From Login Events Instead of Value Events

**Wrong:** Defining "retained" as "logged in." Users who log in, stare at the dashboard, and leave count as retained. This inflates metrics and hides the real problem.

```sql
WHERE event_name = 'user_logged_in'  -- counts drive-by logins
```

**Fix:** Define "retained" as performing a core value action — the action representing genuine product usage.

```sql
WHERE event_name IN ('task_completed', 'message_sent', 'report_generated')
```

### 10. Treating All Features as Equally Important for Adoption

**Wrong:** Pushing users to "discover all 15 features" when only 3-4 drive meaningful retention. This overwhelms users and dilutes focus from the features that matter.

**Fix:** Run correlation analysis between feature adoption and 90-day retention. Prioritize promoting the 3-5 features with the strongest retention correlation. Team/social features and integration features typically have disproportionate impact because they increase switching costs.

---

> **See also:** [Analytics-Instrumentation](../Analytics-Instrumentation/analytics-instrumentation.md) | [User-Onboarding](../User-Onboarding/user-onboarding.md) | [Email-Notification-Systems](../Email-Notification-Systems/email-notification-systems.md) | [Product-Led-Growth](../Product-Led-Growth/product-led-growth.md) | [Experimentation](../Experimentation/experimentation.md)
>
> **Last reviewed:** 2026-03

---

*By Ryan Lind, Assisted by Claude Code and Google Gemini.*
