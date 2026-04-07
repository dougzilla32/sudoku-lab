# Sudoku Lab — Windows Student Guide

This guide is for Windows users. Mac users should follow `README.md` instead.

Windows support uses **WSL2** (Windows Subsystem for Linux), which gives you a
Linux environment inside Windows. This is how most professional developers use
Windows for web development.

---

## Quick reference

| What | How |
|---|---|
| Install software — Windows part (first time) | `bin\windows\install-wsl.ps1` in PowerShell (Admin) |
| Install software — Linux part (first time) | `bash bin/windows/install-wsl.sh` in Ubuntu |
| Set up a project (first time) | `bash bin/setup.sh` in Ubuntu |
| Start your session | `bash bin/windows/start-wsl.sh` in Ubuntu |
| Share a live preview | Copy `netlify.live` URL from left pane |
| Deploy permanently | `/deploy` in Claude Code |
| End your session | `/quit` in Claude Code, close Windows Terminal |
| Start a new project | Duplicate folder, rewrite `SPEC.md`, run `bash bin/setup.sh` |
| Keep software current | Run `bash bin/windows/install-wsl.sh` every week or two |

---

## Overview

| Script | Where to run | When |
|---|---|---|
| `bin\windows\install-wsl.ps1` | PowerShell (Admin) | Once ever |
| `bin/windows/install-wsl.sh` | Ubuntu terminal | Once ever |
| `bin/setup.sh` | Ubuntu terminal | Once per project |
| `bin/windows/start-wsl.sh` | Ubuntu terminal | Every session |

---

## Before your first session

### Step 1 — Create your accounts

You need three accounts before running anything:

1. **Claude** — [claude.ai](https://claude.ai) — sign up for a Pro plan ($20/mo)
2. **Netlify** — [netlify.com](https://netlify.com) — free, no credit card needed
3. **Supabase** — [supabase.com](https://supabase.com) — free, no credit card needed

### Step 2 — Move the project folder

Move the `sudoku-lab` folder to your Documents folder:

```
C:\Users\YourName\Documents\sudoku-lab\
```

### Step 3 — Run the Windows setup script

Open **PowerShell as Administrator**:
- Press `Win+X` and choose "Windows PowerShell (Admin)" or "Terminal (Admin)"

Navigate to your project and run the setup script:

```powershell
cd $HOME\Documents\sudoku-lab
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
bin\windows\install-wsl.ps1
```

This installs WSL2, Ubuntu, and Windows Terminal. Your computer may need to
restart — if so, run the script again after restarting.

### Step 4 — Open Ubuntu and navigate to your project

After the PowerShell script finishes, open **Ubuntu** from the Start menu.

In the Ubuntu terminal, navigate to your project:

```bash
cd /mnt/c/Users/YourName/Documents/sudoku-lab
```

(Replace `YourName` with your actual Windows username.)

### Step 5 — Run the Linux installer

```bash
bash bin/windows/install-wsl.sh
```

This installs Homebrew, Node.js, Claude Code, Netlify CLI, and Supabase CLI
inside your Ubuntu environment. It will also walk you through logging in to
each service.

### Step 6 — Run the setup script

After all logins are complete, the installer will offer to run setup
automatically. If you skipped it, run it yourself:

```bash
bash bin/setup.sh
```

---

## Starting your dev environment

Do this at the beginning of every session.

Open **Ubuntu** from the Start menu and navigate to your project:

```bash
cd /mnt/c/Users/YourName/Documents/sudoku-lab
```

Run the start script:

```bash
bash bin/windows/start-wsl.sh
```

This opens two panes in Windows Terminal side by side:

- **Left pane** — your Netlify dev server and live shareable URL
- **Right pane** — Claude Code, ready for your instructions

Your browser will also open automatically.

**Wait about 15 seconds** for everything to start.

---

## Building your app

Everything happens in the **right pane** (Claude Code). Same as the Mac guide —
describe what you want in plain English and Claude Code will build it.

---

## Sharing your live preview

Look in the **left pane** for a line that says:

```
◈ Server now ready on https://abc-xyz-123.netlify.live
```

Copy that URL and share it with anyone.

---

## Deploying your app

In the **right pane** (Claude Code), type:

```
/deploy
```

---

## Ending your session

1. In the right pane, type `/quit` to exit Claude Code
2. Press `Ctrl+C` in the left pane to stop the dev server
3. Close Windows Terminal

---

## Troubleshooting

If something goes wrong, tell Claude Code what you see.

---

## Starting a brand new project

> When you want to build something completely different — do this at the end of a module, not mid-session.

1. Copy the `sudoku-lab` folder in File Explorer and rename it (e.g. `chess-game`)
2. Open `SPEC.md` in the new folder and rewrite it to describe your new app
3. Open Ubuntu and navigate: `cd /mnt/c/Users/YourName/Documents/chess-game`
4. Run `bash bin/setup.sh` — sets up a new Netlify site, Supabase project, and scaffolds the app
5. Run `bash bin/windows/start-wsl.sh` to start building
6. Tell Claude Code: "Update the README for my new project"

You do **not** need to run `bin/windows/install-wsl.sh` again — your software is already installed.
