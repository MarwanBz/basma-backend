# Production Deployment Setup

This document explains how to set up automated production deployment for the basma-backend.

## 1. Deployment Script

A local deployment script has been created at `deploy.sh`. You can run it manually:

```bash
./deploy.sh
```

This script will:

- Pull latest changes from main branch
- Install production dependencies
- Build the project
- Restart PM2 processes

## 2. GitHub Actions CI/CD

A GitHub Actions workflow has been created at `.github/workflows/deploy-production.yml`.

### Required GitHub Secrets

You need to add these secrets to your GitHub repository settings:

1. `PROD_HOST` - Your server IP address or hostname
2. `PROD_USER` - SSH username (e.g., `root`)
3. `PROD_SSH_KEY` - Private SSH key for server access
4. `PROD_SSH_PORT` - SSH port (optional, defaults to 22)
5. `PROD_PATH` - Project path on server (optional, defaults to `/root/basma-backend`)

### SSH Key Setup

1. Generate SSH key pair on your local machine:

   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github-actions-key
   ```

2. Add the public key to your server:

   ```bash
   cat ~/.ssh/github-actions-key.pub | ssh root@your-server "cat >> ~/.ssh/authorized_keys"
   ```

3. Add the private key (`~/.ssh/github-actions-key`) as `PROD_SSH_KEY` secret in GitHub

### Manual Deployment

You can also trigger the deployment manually:

- Go to Actions tab in GitHub
- Select "Deploy to Production" workflow
- Click "Run workflow"

## 3. Production Environment Variables

Ensure your production environment has these variables set for PM2:

```bash
NODE_ENV=production
# Add other required environment variables
```

## Security Notes

- Use read-only deploy keys or limited SSH users
- Store secrets securely in GitHub
- Monitor deployment logs
- Consider using GitHub Environments for additional protection

## Testing

To test the deployment script locally:

```bash
./deploy.sh
```

To test GitHub Actions, push to main branch or manually trigger the workflow.
