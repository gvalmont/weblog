---
title: "GPT-5.5 is a biased evaluator: authorship and order effects"
description: "While comparing medium, high, and extra-high reasoning modes on the same task, I uncovered consistent authorship and presentation-order effects in GPT-5.5’s evaluations."
pubDate: 2026-04-25
tags: ["coding-agents", "ai", "gpt", "evaluation"]
---

## Key takeaways

- GPT-5.5 ranked its own plan last in 5/6 cases (authorship effect).
- GPT-5.5 followed presentation order in 25/45 rankings (~56%) (order effect).
- Increasing reasoning (`high`, `xhigh`) does not fix these biases.
- As a result, **LLM-based plan ranking is unreliable in this setup**.
- Human or external evaluation remains necessary.

## Introduction

GPT-5.5 has just been released.

According to its [introduction by OpenAI](https://openai.com/index/introducing-gpt-5-5/) "*Instead of carefully managing every step, you can give GPT‑5.5 a messy, multi-part task and trust it to plan, use tools, check its work, navigate through ambiguity, and keep going.*"

I tested whether GPT-5.5 can reliably evaluate and rank alternative plans. In this setup, it couldn’t.

Its judgments are strongly influenced by two irrelevant factors: whether it authored the plan, and the order in which plans are presented.

These effects are large enough to make ranking-based evaluation unreliable.

Across all runs:

- Models ranked their own plan last in 5/6 cases (authorship effect)
- Rankings matched presentation order in 25/46 cases (order effect)
- Agreement between models was low

## Context

I wanted to test this claim using a moderately ambiguous prompt:

``` text
on datadog, when i look at web app usage, i see [Image #1]
how to separate each auto and eval page instead of merging them in /?/?/auto ?
```

Here's the image : [image](/images/datadog-view-count.png)

Results:

- `medium` designed a simple, correct fix (disable grouping + use existing beforeSend hook)
- `high` added unnecessary complexity with Next.js instrumentation
- `xhigh` added unnecessary complexity by monkey-patching browser history

More reasoning led to more complex (and sometimes worse) solutions.

In order to verify if `medium` was actually better than `high` and `xhigh` I repeated the experiment using a more controlled protocol. This assumption proved wrong but led to even more interesting observations.

## Plan evaluation with authorship

### Protocol

- I ran the same prompt in three separate sessions using plan mode with `medium`, `high`, and `xhigh` reasoning.
- I asked each model to evaluate the strengths and weaknesses of the other plans relative to its own in the order: <span class="nowrap">`medium` -> `high` -> `xhigh` -> `medium`</span>
- I then asked each model to rank the three plans
- I repeated the same steps with the presentation order reversed: <span class="nowrap">`medium` <- `high` <- `xhigh` <- `medium`</span>

<details>
  <summary>Show direct order rankings</summary>

#### Direct order

##### Direct order `medium` ranking

``` text
  1. Third plan: “Separate Datadog RUM Views Per Exercise Page”
     Best as-is. It is Datadog-correct, explicit for all current pathnames,
     includes view context, strips query strings, and covers disabled
     initialization.
  2. Second plan: “Datadog RUM View Names”
     Also Datadog-correct and has stronger navigation test detail, but as-is it
     is less explicit about non-exercise pages than the third plan.
  3. My original plan
     Safest and smallest, but least correct for this Datadog issue because it
     relies on beforeSend renaming instead of manual startView lifecycle
     tracking.
```

##### Direct order `high` ranking

``` text
  1. Third plan: automatic tracking + beforeSend rename
     Best tradeoff. Minimal code, uses existing Datadog hook, preserves
     automatic SPA tracking, easy to test, and avoids React hooks.
  2. Second plan: manual tracking, broader and more complete
     Strong if you need full manual control over view lifecycle or per-view
     context on child events. But it is more machinery than needed for
     “show /5e/ch11/auto instead of /?/?/auto”.
  3. My original plan
     Mostly correct, but heavier than necessary and missing a couple practical
     notes the second plan had, especially historical data staying merged and
     the explicit non-initialized test.
```

##### Direct order `xhigh` ranking

``` text
  1. beforeSend rewrite plan: best pragmatic fit.
  2. Third/manual-tracking refined plan: best if you specifically need Datadog’s
     active SDK view state and view context to be set via startView, but more
     invasive.
  3. My original manual-tracking plan: same general idea as plan 3, but less
     complete around dedupe, tests, and no-effect constraints.
```

##### Direct order Interpretation

These results are consistent with my earlier, less controlled tests. In my first tests, all three ranked the `beforeSend` solution from `medium` thinking to be the best plan. Here, `high` and `xhigh` think that `medium`'s plan is the best one while `medium` thinks that the best one is `xhigh`'s plan.

Notably, **each model consistently ranks its own original plan last**. Also, both `medium` and `high` show the same ranking : third plan -> second plan -> own plan.

</details>

<details>
  <summary>Show reverse order rankings</summary>

#### Reverse order

##### Reverse order `medium` ranking

``` text
  1. beforeSend resolver plan
     Best as-is. Smallest change, preserves Datadog automatic tracking, avoids
     React lifecycle issues, strips query strings, and directly follows
     Datadog’s editable view.name guidance.
  2. History-patching manual tracking plan
     More decision-complete than my original and handles query strings/
     idempotency explicitly, but patching history.pushState / replaceState is
     invasive and riskier in a Next.js App Router app.
  3. My original usePathname + startView plan
     Directionally valid, but weakest as-is. It relies on an underspecified
     callback-ref workaround because effects are banned, lacks explicit
     idempotency, and does not call out query/cardinality or Datadog UI grouping
     details clearly enough.
```

##### Reverse order `high` ranking

``` text
  1. beforeSend plan
     Best as-is. It is the least invasive, uses the existing Datadog beforeSend
     path, avoids banned hooks and route side effects, preserves automatic RUM
     tracking, and explicitly handles query strings/trailing slashes. Main risk:
     it may not fix Datadog views that group by @view.url_path_group.
  2. usePathname + callback ref plan
     Solid, but less good as-is. It uses the official manual-view mechanism and
     Next’s route source of truth, but the callback-ref route tracking is a
     little unusual, and putting it in src/generic conflicts with the earlier
     helper-location decision.
  3. My original plan
     Most complete, but worst as-is. It is too heavy: manual tracking plus
     history patching creates more risk and maintenance cost than needed. The
     structured context and business-helper placement are good, but the
     implementation approach is overbuilt for this problem.
```

##### Reverse order `xhigh` ranking

``` text
  1. Second alternate plan: trackViewsManually + usePathname tracker
     Best overall. It uses Datadog’s official mechanism and a Next.js-native
     route source. It is more likely to fix Web App Usage cleanly than my
     beforeSend plan, without the browser-history patching risk of the first
     alternate.
  2. My original plan: mutate event.view.name in beforeSend
     Safest and smallest code change, but less robust as a Datadog fix. It may
     work for @view.name, but it is not the primary Datadog-recommended
     lifecycle path and may not affect views grouped by @view.url_path_group.
  3. First alternate plan: trackViewsManually + patched history/popstate
     It uses the official Datadog model, but the history patching makes it the
     riskiest as-is. It has more edge cases and more chance of conflicting with
     Next.js routing than the usePathname tracker.
```

##### Reverse order Interpretation

There was some differences between the runs: this time, `xhigh` produced the best `beforeSend` plan instead of `medium`. Nonetheless, regardless of reasoning mode, GPT-5.5 still favors presented alternatives over its own original plan. Notably, `xhigh` ranks its own plan second rather than last, making it the only mode that does not systematically place its own proposal last.

</details>

### Authorship effect

The initial goal was to make them collectively decide which reasoning mode was the best. In the end the best one was not a particular reasoning model: it was the one which ended with the better choice (use `beforeSend`) which was `medium` in the first two runs and `xhigh` in the last one. This suggests that reasoning mode alone is not a reliable indicator of plan quality.

Unexpectedly, these results suggest an even more interesting **authorship effect: when evaluating its own earlier plan against alternatives, the model consistently downgraded its original proposal** and ranked itself last 5/6 times.

This raises a follow-up question: what happens if plans are evaluated without any notion of authorship?

## Plan evaluation without authorship

### Protocol

I repeated the experiment five times per reasoning mode using the following prompt with `medium`|`high`|`xhigh` in different orders:

```text
Evaluate each of the following plans. List their strengths, their weaknesses and rank them.
# Plan 1
[Pasted `medium`|`high`|`xhigh` plan]
# Plan 2
[Pasted `medium`|`high`|`xhigh` plan]
# Plan 3
[Pasted `medium`|`high`|`xhigh` plan]
```

<details>
  <summary>Show experiment results</summary>

#### Order 1

I repeated the experiment five times per reasoning mode using the following prompt:

```text
Evaluate each of the following plans. List their strengths, their weaknesses and rank them.
# Plan 1
[Pasted `medium` plan]
# Plan 2
[Pasted `high` plan]
# Plan 3
[Pasted `xhigh` plan]
```

- `medium` ranked:
  - 1 > 2 > 3 so `medium` > `high` > `xhigh` (3x)
  - 2 > 3 > 1 so `high` > `xhigh` > `medium` (2x)
- `high` ranked:
  - 1 > 2 > 3 so `medium` > `high` > `xhigh` (3x)
  - 2 > 3 > 1 so `high` > `xhigh` > `medium` (1x)
  - 2 > 1 > 3 so `high` > `medium` > `xhigh` (1x)
  - (note, they took between 53s and 2 min, the 2 > 3 > 1 resulted from the shortest thinking and 2 > 1 > 3 from the longest thinking)
- `xhigh` ranked:
  - 1 > 2 > 3 so `medium` > `high` > `xhigh` (3x)
  - 2 > 1 > 3 so `high` > `medium` > `xhigh` (2x)

#### Order 2

I did the same by changing the order:

```text
Evaluate each of the following plans. List their strengths, their weaknesses and rank them.
# Plan 1
[Pasted `xhigh` plan]
# Plan 2
[Pasted `medium` plan]
# Plan 3
[Pasted `high` plan]
```

- `medium` ranked
  - 1 > 2 > 3 so `xhigh` > `medium` > `high` (3x)
  - 3 > 1 > 2 so `high` > `xhigh` > `medium` (1x)
  - 2 > 1 > 3 so `medium` > `xhigh` > `high` (1x)
- `high` ranked:
  - 3 > 1 > 2 so `high` > `xhigh` > `medium` (4x)
  - 2 > 1 > 3 so `medium` > `xhigh` > `high` (1x)
- `xhigh` ranked:
  - 1 > 2 > 3 so `xhigh` > `medium` > `high` (4x)
  - 3 > 1 > 2 so `high` > `xhigh` > `medium` (1x)

#### Order 3

I did the same by changing the order:

```text
Evaluate each of the following plans. List their strengths, their weaknesses and rank them.
# Plan 1
[Pasted `high` plan]
# Plan 2
[Pasted `xhigh` plan]
# Plan 3
[Pasted `medium` plan]
```

- `medium` ranked
  - 2 > 3 > 1 so `xhigh` > `medium` > `high` (4x)
  - 1 > 2 > 3 so `high` > `xhigh` > `medium` (1x)
- `high` ranked:
  - 1 > 2 > 3 so `high` > `xhigh` > `medium` (3x)
  - 2 > 1 > 3 so `xhigh` > `high` > `medium` (2x)
- `xhigh` ranked:
  - 1 > 2 > 3 so `high` > `xhigh` > `medium` (5x)

</details>

### Order effect

Across 45 rankings (3 orders × 3 modes × 5 runs), the 1 > 2 > 3 ranking appeared 25 times, so about 56% of occurrence. This is significantly higher than what would be expected under order-independent rankings and suggests an **order effect: when ranking plans, the model frequently ranked them in the same order as they were presented**.

## Implications

If you use LLMs to evaluate or rank plans (e.g., agent selection, self-reflection, or tool choice), your results may be biased by:

- authorship (who wrote the plan)
- presentation order

This makes naive ranking-based evaluation unreliable, even with higher reasoning modes.

## Limitations

This experiment is limited in scope. It examines one problem, a small number of runs, and one evaluation format. The reasoning modes are compared against each other, but I did not compare multiple independently generated plans from the same reasoning mode. Results may vary across tasks, prompts, or domains. Further testing would be needed to generalize these findings.

## Conclusion

This experiment highlights consistent patterns:

- GPT-5.5 favors alternative plans over its own (authorship effect).
- GPT-5.5 often follows presentation order when ranking (order effect).
- Increasing reasoning does not fix these biases.
- Plan rankings are inconsistent and should be treated with caution.

These effects interact: once authorship is removed, presentation order becomes the dominant signal.

**Recommendations:**

- Be cautious when proposing modifications to a plan (the model may accept them without sufficient scrutiny).
- Don’t trust a model to rank outputs (either its own or another model's outputs).
- Instead of list ranking, use pairwise comparison and judge externally.
- Don't treat "reasoning level" as a quality guarantee.
