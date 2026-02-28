# Deployment Guide

## Preview Deployments

Every branch and PR automatically gets a preview URL:

### Workflow:
1. Developer pushes feature branch
2. Vercel auto-deploys preview
3. Test at: `https://agent-paige-git-{branch}-thindery.vercel.app`
4. Code review → Merge → Auto-deploy to production

### Branch Naming:
- `feature/*` - New features
- `fix/*` - Bug fixes
- `chore/*` - Maintenance

### Preview URLs:
- Branch `feature/new-button` → `agent-paige-git-feature-new-button.vercel.app`
- PR #5 → `agent-paige-git-5.vercel.app`

### Testing Checklist:
- [ ] Feature works on preview
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Plausible analytics working
- [ ] Links work
