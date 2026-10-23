# Approximately 15-minute adviser demonstration

Open **http://localhost:5196/**. This describes the verified Mac demonstration. Read README.md before reusing the scripts; it does not authorize operating the current Mac environment. Read passwords privately from **private/accounts.json**; do not display that file on the projector. This cheat sheet contains no passwords or join/setup tokens.

Use one browser and complete Sign out before switching roles, or use genuinely separate browser profiles/private sessions. Ordinary tabs share cookies. Replace both email and password fields if the browser autofills an earlier identity. Wait for the requested role dashboard to appear before navigating onward.

| Time | Account and action | Evidence to explain |
|---|---|---|
| 0:00–2:00 | **instructor@origin.test** via Instructor login. Show the two Class cards. Open Computer Programming 1, its three Activities and Palindrome Activity settings. Show instructions and the three visible test examples. | CS101 / CS202 are consistent official codes; published executable contracts and a separate 20-point source-review component. Circle is a completed 100/100 example. |
| 2:00–3:00 | Sign out; **student@origin.test** via Student login. Show To-do, Computer Programming 1, Palindrome Checker. Open workspace. | Primary Alex Morgan has 0 of 3 attempts used. Four actions are independent: Run Code, Run Visible Tests, Save to Git, Submit. |
| 3:00–4:30 | Code the comparison or import `solutions/palindrome/Main.java` from the private presentation directory using **Import .java**. Click Run Code. Wait for **Running** and `Enter a word: `. Type **Level** in PROGRAM INPUT, then press Enter. | Java really waits for live stdin. The prompt has no trailing newline. Show `Result: Palindrome` and exit code 0. Optionally rerun with hello. |
| 4:30–6:00 | Click **Run Visible Tests** and wait for all three Passed results. Click **Save to Git**, wait for its real hash/success. Click **Submit**, then **Submit source** in the confirmation. Wait for assessment. | Tests use predefined stdin. Git save does not submit or consume an attempt. Submit creates immutable academic evidence. |
| 6:00–8:30 | Sign out; **instructor@origin.test**. To Review → Palindrome → Alex's actual attempt. Inspect Submitted code and Test results. Enter **20** Instructor points and concise source-review feedback. **Save review draft** → **Release final result** → **Confirm release**. | Automatic score 80/80 is kept separate from reviewed source requirements. Draft feedback is private until release. |
| 8:30–9:30 | Sign out; **student@origin.test**. Open Palindrome submission record. Show returned **100/100** and feedback. Show Computer Programming 2's two individual Activities. | Student Record remains submitted/unreleased for a pending-review example. Fraction Class remains the released OOP example. |
| 9:30–10:30 | Sign out; **leader@origin.test**. My Repositories → **CS202AlvarezBennettPrelimGroupProject**. Show two members, source package, three real commits and main/feature heads. Open editor; dismiss its help dialog. From **main**, create branch **demo/adviser-1500**. | Maintainer Sofia Alvarez, Developer Noah Bennett; exact alphabetical naming and required package. Group collaboration remains separate from Activity grading. |
| 10:30–12:00 | Sign out; **member@origin.test**. Open the same repository/editor, select **demo/adviser-1500**. Edit README.md by appending a real note such as `Verified addition example: 1/2 + 1/3 = 5/6.` Enter a meaningful commit message and select **Commit Changes**. Wait for its real hash. | The Developer's change is committed on the feature branch, not protected main. The browser editor currently commits one file at a time. |
| 12:00–13:45 | Sign out; **leader@origin.test**. Open that branch in the editor, inspect the edit, choose **Merge Branch**. Source = demo/adviser-1500, target = main. **Review merge**, then **Confirm merge**. | Use keyboard Tab/Enter on Review merge if pointer activation does not produce a preview; this path was tested. Preview should show one commit/changed file. After completion, main and demo branch share the new hash. Only the Maintainer authorizes the protected-main fast-forward. |
| 13:45–15:00 | Sign out; **admin@origin.test** via Instructor login. Show Overview, Classes, Academic Records and briefly Operations. | Exactly two Classes, five Activities, one Group Project/team and five fictional accounts. After live Palindrome submission, total official submissions increase from three to four. API/database are available; actual workers process jobs, while the existing UI correctly says worker heartbeats are not monitored. |

## Reference source and expected console

The private presentation directory is `the separate private operations directory`. Complete Java references are in `solutions/<activity>/Main.java`. Circle is an assigned-value exercise; do not add Scanner there. The Group uses its actual packaged repository files and is not executed or graded through the individual Activity console.

```text
Enter a word: Level
Result: Palindrome

Process finished with exit code 0
```

Automated expected stdout is **`Enter a word: Result: Palindrome\n`** because the test runner does not echo input. The interactive console additionally displays the line typed by the Student. These are intentionally different views of the same real program.

## If an action has already been performed

- **Run Code / visible tests:** rerun; they do not consume assessment attempts. Stop an active console before starting another.
- **Save to Git:** the prepared primary already has a real Palindrome checkpoint. Reloading the workspace starts from the Instructor starter; choose the Git tab → **Load latest from Git** to recover the saved solution, or import the reference. Review the source before submitting. An unchanged Git save need not create another commit.
- **Submission already accepted:** show its immutable record and existing review/release rather than trying to bypass the Student lock. For another fresh full demonstration, use the tested pristine **standby** recovery procedure in RECOVERY.md. Alternatively, leader@origin.test and member@origin.test are enrolled Students with no official Palindrome attempts in the prepared primary dataset; a fresh attempt under one of those accounts is legitimate, and the Instructor must review that actual Student's record.
- **Review already saved/released:** open the existing saved result. Released reviews are immutable; do not rewrite them to stage a second release.
- **Branch name already exists:** choose a new branch name, for example `demo/adviser-1500-2`, from current main. Do not delete, reset or force-update existing branches. Append a new concrete README note so the commit has an actual change.
- **Merge reports already up to date:** show matching heads; for another merge, make a new feature-branch commit from current main. If branches diverged, do not force the merge; use a fresh branch from current main for this bounded demonstration.
- **Role switch looks wrong:** finish Sign out, replace both credential fields, log in, and confirm the name/role on the dashboard before continuing.
- **An action appears pending:** let the worker finish or use its status/retry controls. Do not repeatedly click Submit or invent a result. Keep the same request when recovering an uncertain Git action.

The full Student submission/review/release and two-role Group Git sequence was rehearsed in the real Mac browser on a separate disposable restored database. Those completed rehearsal mutations are retained separately; the final primary presentation dataset remains in its requested starting states.
