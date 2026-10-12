<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Items stored per-user in Cloud table `items` with RLS; AI parsing runs server-side in src/lib/ai.functions.ts (keeps key off the client).
- Eval harness lives in src/eval (user-owned scoring/gold data, do not edit logic); /eval page stores runs in eval_runs and never touches items — keeps evaluation reproducible against fixed fixtures.
