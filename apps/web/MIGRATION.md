# shadcn/ui + Tailwind v4 Migration

Living guide for the multi-phase migration from handrolled CSS to
shadcn/ui primitives. Read this before touching JSX in `apps/web`.

## Status

| Phase | What lands                                                            | State    |
| ----- | --------------------------------------------------------------------- | -------- |
| 0     | Install Tailwind v4 + shadcn foundation, no visual change             | Done     |
| 1     | Install shadcn primitives, mount `<Toaster />`, write this guide      | Done     |
| 2     | Migrate authenticated app shell (header, sidebar, workspace selector) | Pending  |
| 3     | Server actions return results; forms use toasts + inline errors       | Pending  |
| 4     | Confirmation dialogs on destructive actions                           | Pending  |
| 5     | Tab the prospect detail page                                          | Pending  |
| 6     | Per-page content migration (one PR per page)                          | Done     |
| 7     | Cleanup, dark mode, polish                                            | Done     |

## Token model

shadcn's expected token names (`--muted`, `--accent`, etc.) collide with
the legacy CSS variables in [`app/globals.css`](app/globals.css) where
`--muted` is a text color and `--accent` is the brand blue. Renaming
those would break every legacy page, so the migration uses an internal
`--ui-*` namespace mapped via `@theme inline`:

| Tailwind utility            | CSS var fed into it            | Phase 0 value                |
| --------------------------- | ------------------------------ | ---------------------------- |
| `bg-background`             | `--ui-background`              | `var(--background)`          |
| `text-foreground`           | `--ui-foreground`              | `var(--foreground)`          |
| `bg-card`                   | `--ui-card`                    | `#ffffff`                    |
| `bg-primary`                | `--ui-primary`                 | `var(--accent)` (brand blue) |
| `text-primary-foreground`   | `--ui-primary-foreground`      | `#ffffff`                    |
| `bg-muted`                  | `--ui-muted`                   | `rgba(17, 24, 39, 0.04)`     |
| `text-muted-foreground`     | `--ui-muted-foreground`        | `var(--muted)` (legacy gray) |
| `bg-accent`                 | `--ui-accent`                  | `rgba(55, 92, 255, 0.08)`    |
| `text-destructive`          | `--ui-destructive`             | `#ef4444`                    |
| `border-border` / `border`  | `--ui-border`                  | `var(--border)`              |
| `ring-ring`                 | `--ui-ring`                    | `var(--accent)`              |
| `rounded-lg`                | `--ui-radius`                  | `1.5rem`                     |

Use the Tailwind utilities, not the raw CSS vars. Don't reach for
`var(--accent)` inside JSX — use `bg-primary` / `text-primary` so the
abstraction holds when Phase 7 swaps tokens for dark mode.

## Legacy class -> shadcn replacement

When migrating a page (Phase 6) replace these patterns:

| Legacy                                   | shadcn replacement                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<button className="buttonPrimary">`     | `<Button>`                                                                                                                                                     |
| `<button className="buttonSecondary">`   | `<Button variant="secondary">`                                                                                                                                 |
| `<button className="buttonGhost">`       | `<Button variant="ghost">`                                                                                                                                     |
| `<a className="buttonPrimary">`          | `<Button asChild><Link>...</Link></Button>` (use `asChild` for non-button elements)                                                                            |
| `<div className="panel">...</div>`       | `<Card><CardContent>...</CardContent></Card>` or `<Card>` with `CardHeader` / `CardTitle` / `CardDescription` / `CardContent` / `CardFooter` for richer layout |
| `<div className="dashboardCard">`        | `<Card>` (smaller padding via `className="p-5"`)                                                                                                               |
| `<div className="profileCard">`          | `<Card>` rendered inside a list                                                                                                                                |
| `<span className="pill">label</span>`    | `<Badge variant="secondary">label</Badge>`                                                                                                                     |
| `<label className="field">`              | `<div className="grid gap-2"><Label>...</Label><Input /></div>`                                                                                                |
| `<input>` inside `.field`                | `<Input>`                                                                                                                                                      |
| `<textarea>` inside `.field`             | `<Textarea>`                                                                                                                                                   |
| `<select>` inside `.field`               | `<Select>` with `SelectTrigger` / `SelectContent` / `SelectItem`                                                                                               |
| `.statusMessage` (success/info banner)   | `toast.success(...)` / `toast.info(...)` from `sonner`                                                                                                         |
| `.statusMessage` (error banner)          | `toast.error(...)`                                                                                                                                             |
| `<FeedbackBanner>` (retired in Phase 3e) | `toast` calls inside the form's submit handler; `UrlFeedbackToaster` for redirect-driven `?error=` / `?success=` / `?notice=` query params                     |
| Destructive button (mark sent, remove member, delete) | `<ConfirmActionButton>` — wraps the action in `<AlertDialog>` (Phase 4)                                                                                |
| Inline regenerate / edit forms           | `<Sheet>` side panel; the form lives inside `SheetContent` and the trigger button keeps its label (Phase 4)                                                    |

Components live in [`components/ui/`](components/ui/). Import paths use
the `@/` alias, e.g. `import { Button } from "@/components/ui/button"`.

## Rules during migration

- One page per PR in Phase 6. Don't mix shell, primitives, and content
  changes in one commit.
- Don't delete legacy CSS rules from `app/globals.css` until Phase 7.
  Other unmigrated pages still depend on them.
- Don't introduce `var(--accent)`, `var(--muted)`, etc. in new JSX. Use
  Tailwind utilities tied to `--ui-*`.
- `<form>` actions stay server actions until Phase 3, which switches
  them to client forms with `useActionState` + `react-hook-form`.
- Keep Tailwind class lists ordered: layout -> spacing -> typography ->
  color -> state. Use `cn()` for conditional classes.

## Toaster

A single `<Toaster />` is mounted in
[`app/layout.tsx`](app/layout.tsx). Trigger toasts from anywhere with:

```ts
import { toast } from "sonner";

toast.success("Campaign saved");
toast.error("Could not save campaign", { description: error.message });
```

Do not mount additional Toasters per page.

## Dark mode

Tokens are scaffolded but not toggled. Phase 7 adds the `next-themes`
provider, the toggle, and the `.dark` block in `globals.css`. Components
that need to look right in dark mode should use Tailwind utilities, not
hardcoded colors.
