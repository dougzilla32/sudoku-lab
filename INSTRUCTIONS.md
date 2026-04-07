# My Project — Student Guide

Everything you need to build and deploy your Sudoku app.

---

## Quick reference

| What | How |
|---|---|
| Install software (first time) | `zsh bin/mac/install.sh` |
| Set up a project (first time) | `zsh bin/setup.sh` from project folder |
| Start your session | `zsh bin/mac/start.sh` from project folder |
| Share a live preview | Copy `netlify.live` URL from left window |
| Deploy permanently | `/deploy` in Claude Code |
| End your session | `/quit` in Claude Code, close both windows |
| Start a new project | Duplicate folder, rewrite `SPEC.md`, run `zsh bin/setup.sh` |
| Keep software current | Run `zsh bin/mac/install.sh` every week or two |

---

## Overview

There are three scripts in this project. You run them in order, and most you only run once:

| Script | When to run |
|---|---|
| `bin/mac/install.sh` | Once ever on this Mac (or to check for updates) |
| `bin/setup.sh` | Once per project |
| `bin/mac/start.sh` | Every session |

---

## Before your first session

These are one-time steps. Do them before class starts.

### Step 1 — Create your accounts

You need three accounts before running anything:

1. **Claude** — [claude.ai](https://claude.ai) — sign up for a Pro plan ($20/mo)
2. **Netlify** — [netlify.com](https://netlify.com) — free, no credit card needed
3. **Supabase** — [supabase.com](https://supabase.com) — free, no credit card needed

### Step 2 — Move the project folder

Move the `my-project` folder to your Documents folder. You should end up with:

```
~/Documents/my-project/
```

You can do this in Finder — just drag the folder there.

### Step 3 — Run the install script

Open **Terminal** (press `Cmd+Space`, type "Terminal", press Enter).

Navigate to your project folder:

```
cd ~/Documents/my-project
```

Run the install script:

```
zsh bin/mac/install.sh
```

The script checks what's installed and what needs updating, shows you a summary, and asks for your confirmation before doing anything. If your Mac asks for your password during installation, that's normal — type it and press Enter (nothing appears as you type, that's fine).

### Step 4 — Set MacDown 3000 as your Markdown viewer

MacDown 3000 was just installed and lets you read `.md` files like this one. To make it open automatically whenever you double-click a `.md` file:

1. Right-click any `.md` file in Finder (for example, this `INSTRUCTIONS.md`)
2. Choose **Get Info**
3. Find the **Open With** section and click the arrow to expand it
4. Click the dropdown and choose **MacDown 3000**
5. Click **Change All...**
6. Click **Continue** when asked to confirm

From now on, double-clicking any `.md` file opens it in MacDown 3000.

### Step 5 — Log in to your accounts

The install script will check whether you're logged in to Claude, Netlify, and Supabase, and walk you through each login if needed. Each one opens your browser — just follow the prompts and come back to the terminal when done.

### Step 6 — Run the setup script

The install script will offer to run setup automatically at the end. If you skipped it, run it yourself:

```
zsh bin/setup.sh
```

This creates your Netlify site and Supabase project, scaffolds the starter React app, and wires everything together. The whole process takes about two minutes.

---

## Starting your dev environment

Do this at the beginning of every session.

Open **iTerm2** and navigate to your project folder:

```
cd ~/Documents/my-project
```

Run the start script:

```
zsh bin/mac/start.sh
```

This opens two **iTerm2** windows side by side:

- **Left window** — your Netlify dev server, showing app logs and your live shareable URL
- **Right window** — Claude Code, ready for your instructions

Your browser will also open automatically showing a local preview of your app.

**Wait about 15 seconds** for everything to start. When you see a `netlify.live` URL appear in the left window, your live preview link is ready to share with classmates.

---

## Building your app

Everything happens in the **right window** (Claude Code).

Describe what you want in plain English:

> "Build the home screen"

> "Add a button that does X when clicked"

> "Make the list update in real time"

> "Change the colours to something darker"

Claude Code will edit the files, and your browser preview will update automatically. What you see in the browser is your live work in progress.

Occasionally Claude Code will ask you to run a command in the **left window** to install a new package. It will tell you exactly what to type.

### Tips

- Be specific about what you want
- If you don't like something: "I don't like the colours, make it darker"
- If something breaks: "Something broke, can you fix it?"
- Ask Claude Code to explain: "What did you just build?"

---

## Sharing your live preview

Look in the **left window** for a line that says:

```
◈ Server now ready on https://abc-xyz-123.netlify.live
```

Copy that URL and share it with anyone. They can open it in any browser and see your app live, including any changes you make in real time.

This link works as long as your iTerm2 windows are open. If you close them the link stops — but your deployed site keeps working forever.

---

## Deploying your app

When you want a permanent URL, type this in the **right window** (Claude Code):

```
/deploy
```

Claude Code will build your app, deploy it to Netlify, and open a browser tab showing the live result. When it's done it will tell you your permanent URL:

```
https://my-project.netlify.app
```

If something goes wrong during the build, Claude Code will fix it and try again automatically.

Every time you `/deploy`, the same URL updates to your latest version.

---

## Ending your session

1. In the right window, type `/quit` to exit Claude Code
2. Close both iTerm2 windows
3. Your deployed site stays live — nothing is lost

---

## Keeping your software current

Run `bin/mac/install.sh` at the start of each new class module (every week or two) to check for updates. It will show you what's changed and ask before updating anything:

```
cd ~/Documents/my-project
zsh bin/mac/install.sh
```

You don't need to run it before every session — just occasionally, or whenever your instructor mentions there are updates.

---

## Troubleshooting

If something goes wrong, tell Claude Code what you see.

---

## Starting a brand new project

> When you want to build something completely different — do this at the end of a module, not mid-session.

1. Duplicate the `my-project` folder in Finder and rename it (e.g. `chess-game`)
2. Open `SPEC.md` in the new folder and rewrite it to describe your new app — use the current version as a guide for what to include
3. Open Terminal: `cd ~/Documents/chess-game`
4. Run `zsh bin/setup.sh` — sets up a new Netlify site, Supabase project, and scaffolds the app
5. Run `zsh bin/mac/start.sh` to start building
6. Tell Claude Code: "Update the README for my new project"

You do **not** need to run `bin/mac/install.sh` again — your software is already installed.
