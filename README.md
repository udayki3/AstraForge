# AstraForge 🚀

Welcome to **AstraForge** (formerly DevOps Battleboard), a unified tracking and team leaderboard system designed to keep you and your team accountable throughout the comprehensive DevOps Roadmap.

## Features

- 🦸 **"It's Morphin' Time"**: Track. Compare. Compete.
- 🔐 **Private GitHub Sync**: Your progress data is securely synced to your own private GitHub repository using Fine-Grained Personal Access Tokens.
- 👥 **Team Leaderboard**: Track the progress of up to 5 teammates on a live, beautifully designed dark-mode dashboard.
- 🎨 **Custom Teammate Colors**: Pick vibrant, neon theme colors for each teammate during setup, which automatically reflects across the dashboard.
- ✅ **Live GitHub Verification**: Instantly check if your teammates' sync files exist before adding them.
- 🎯 **Phase-Level Tracking**: Over 13 phases, spanning 6 months, tracking 245+ daily tasks. Now with "Mark All Done" auto-cascading date logic!
- 🤖 **Automated Workflows**: Set up GitHub Actions to bust caches and snapshot your progress daily.
- 🌌 **Gorgeous UI**: Deep space visual aesthetics featuring a node network background, matrix rain, dynamic status updates, snarky weekly commentary, auto-calculating percentages, and CSS-animated circular progress rings.

## Getting Started

Deploying and using this application is incredibly simple. All you need is a free GitHub account.

You only need to interact with three files:
1. `index.html`: The main configuration portal and sign-in page, where you configure the main repository connection and customize teammate colors.
2. `dashboard.html`: The team leaderboard and weekly intel snapshot.
3. `devops_roadmap.html`: The actual day-by-day checklist where you mark tasks complete.

Please refer to the enclosed **`DevPath_Setup_Instructions.pdf`** document for step-by-step guidance on how to:
1. Upload these files to GitHub Pages.
2. Generate secure, repository-scoped GitHub tokens.
3. Hook up teammate tracking JSON files so everyone's progress rolls up to the main dashboard.

## File Structure

```
/github-deploy
├── index.html            <- Gateway Configuration UI
├── dashboard.html        <- Multiplayer Analytics Leaderboard
└── devops_roadmap.html   <- Interactive Learning Checklist
```

## Security Overview

The entire application runs entirely in your browser using local HTML/JS/CSS. There is no middle-man server database. When you mark a task complete, your browser talks directly to the GitHub API, utilizing a **Fine-Grained Personal Access Token** that you provide to edit a single JSON file (`uday_progress.json`, etc.) acting as your database. 

This token is restricted to **only** Read/Write access on your specific tracking repository. Your actual code repositories and account details remain 100% impenetrable.

## Happy Building!

Now get to work. That Kubernetes cluster isn't going to build itself.
