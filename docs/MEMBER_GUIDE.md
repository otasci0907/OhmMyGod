# Ohm My God — Member Guide

A quick guide for using the electrical diagnostic tool during testing, garage work, or at the track.

**What it does:** Walks you through a decision tree of known failure paths. If the tree doesn't have your fix yet, you can log what happened so the team doesn't lose that knowledge.

---

## Opening the app

Your electrical lead will give you a link (usually a GitHub Pages URL). Open it in **Chrome** or **Edge**.

Bookmark it on your phone or laptop so you can pull it up quickly when something breaks.

---

## The main screen

At the top you'll see:

- **Diagnose** — start or continue a troubleshooting session (this is what you'll use most)
- **Browse Cases** — look up past problems and fixes
- A **storage badge** in the corner — tells you if your logs can be saved
  - **Green / writable** — you're good to log cases
  - **Read-only** — you can still walk the tree, but logs won't save. Tell the lead or connect the shared folder (see below)

You do **not** need lead mode for normal use. That's for the electrical lead only.

---

## How to run a diagnostic session

### 1. Start on Diagnose

Click **Diagnose** if you're not already there. Click **Restart session** anytime to start over from the top.

### 2. Answer the questions

The app shows one step at a time:

| Step type | What you see | What to do |
|-----------|--------------|--------------|
| **Question** | A question with button choices | Tap the answer that matches what you're seeing |
| **Action** | An instruction (amber box) | Do the physical step, then tap **Done** |
| **Solution** | A proposed fix (green box) | Try the fix, then choose one of the two buttons below |

Use **Go back** if you picked the wrong answer.

### 3. If the fix worked

Tap **✓ This fixed it**.

The session ends and the fix is logged automatically (if storage is set up). You're done.

### 4. If the fix didn't work

Tap **✗ Didn't fix it**.

The app moves you to the next step in the tree if one exists. Keep going until you hit a **dead end** — a grey screen saying no recorded fix exists for this path.

---

## Logging a problem (dead end)

When the tree runs out of steps:

1. Tap **Log this problem**
2. Fill in the form:
   - **Your name** — required (saved for next time)
   - **Problem description** — required. What was actually wrong? Be specific. ("APPS 2 reads 0V with ignition on" is better than "sensor broken")
   - **What fixed it** — optional. Fill this in if you figured it out after the tree ended. Leave blank if still broken.
   - **Tags** — optional. Comma-separated keywords (`apps, connector, 5v-rail`) help people search later
3. Tap **Submit case**

### Proposing a new tree step (optional)

On the log form you can check **Propose a new tree node after logging**. Use this when you know what question or fix should be added to the tree for next time.

You'll walk through three short steps:

1. Pick the type — question, solution, or action  
2. Write the content  
3. Confirm where it attaches (leave **Auto** selected unless the lead told you otherwise)

Your proposal goes to the electrical lead for review. It does **not** go live immediately.

---

## Looking up past fixes — Browse Cases

Click **Browse Cases** to search everything the team has logged.

You can:

- **Search** by symptom, fix text, or tags
- **Filter** by subsystem (Power, Sensors, CAN, etc.) or status

Click a row to expand it and see the full path through the tree, fixes tried, and tags.

This panel is read-only. You can't edit entries — if something is wrong, tell the electrical lead.

---

## If you see "Connect shared folder"

At the track we sometimes run from a shared drive folder instead of the website. If you see a yellow banner about connecting a folder:

1. Tap **Connect shared folder**
2. Select the team folder your lead pointed you to (the one containing `tree.json`)
3. The badge should turn green

You may need to do this once per browser session. Use **Chrome** — other browsers may not support this.

If you're using the normal website link and the badge is already green, ignore this.

---

## Tips for good logs

- **Describe symptoms, not guesses.** "CAN node 0x123 missing" beats "ECU bad."
- **Write the actual fix** if you found one, even if it was weird. That's the whole point.
- **Use tags** for parts and subsystems you might search later.
- **Propose a node** when you're confident the tree should have asked or suggested something it didn't. Don't overthink it — the lead reviews everything.

---

## What members don't need to do

- Don't enter **lead mode** or change **Settings** unless you're the electrical lead
- Don't edit `tree.json` or other files by hand
- Don't worry if a proposal isn't approved right away — the lead batches review

If logging fails or the app seems stuck, note where you were in the tree (the path shown at the top) and grab the electrical lead.

---

## Quick reference

```
Something broke
    → Diagnose
    → Follow questions / actions
    → Try suggested fix
        → Fixed?     → "This fixed it" → done
        → Not fixed? → "Didn't fix it" → keep going
    → Hit dead end?
        → Log this problem
        → (optional) Propose a new node
    → Need an old fix?
        → Browse Cases → search
```

---

*Questions about setup, storage, or the tree itself → electrical lead.*
