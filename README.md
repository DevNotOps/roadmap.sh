# roadmap.sh projects

My practice projects from [roadmap.sh](https://roadmap.sh/) - hands-on exercises to sharpen my skills alongside my DevOps work.

## Projects

### 1. Pomodoro Timer

Project spec: https://roadmap.sh/projects/pomodoro-timer

A Pomodoro timer built with vanilla HTML, CSS and JavaScript.

- Focus sessions, short breaks, and a long break every 4 cycles (25/5/15 minute defaults)
- Circular progress indicator
- Saves state to localStorage, so a refresh does not lose progress

#### Run it

Open `pomodoro-timer/index.html` in a browser. No build step, no dependencies.

A GitHub Actions workflow (`.github/workflows/main.yml`) deploys the site to GitHub Pages on every push to `main`.
