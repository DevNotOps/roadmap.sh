# roadmap.sh Projects

My practice projects from [roadmap.sh](https://roadmap.sh/), built alongside my DevOps learning.

## 1. The project and the problem it solves

roadmap.sh publishes project ideas to practice real skills. This repo collects my solutions. The first one is a Pomodoro timer that helps you work in focused sessions with breaks, and it also practices automatic deployment to GitHub Pages.

## 2. Technologies and versions

- HTML, CSS and vanilla JavaScript (no framework, no build step)
- GitHub Actions and GitHub Pages for deployment

## 3. Requirements and dependencies

A web browser. There are no dependencies to install.

## 4. Install and run

```bash
git clone https://github.com/DevNotOps/roadmap.sh.git
cd roadmap.sh/pomodoro-timer
# open index.html in your browser
```

## 5. Environment variables and secrets

None.

## 6. How to use it

Pomodoro Timer (spec: https://roadmap.sh/projects/pomodoro-timer):

- Focus sessions, short breaks, and a long break after every 4 cycles (25 / 5 / 15 minutes by default)
- Circular progress indicator
- State is saved in `localStorage`, so a page refresh does not lose progress

On every push to `main`, `.github/workflows/main.yml` deploys the site to GitHub Pages.

## 7. Screenshots / demo

No screenshots yet. If GitHub Pages is enabled for this repo, the site is served from its Pages URL (Settings, Pages).

## 8. Tests

No automated tests. Test by hand in the browser.
