# VPS Deploy

Lumina now runs as an Astro SSR Node app. `nginx` must proxy to a long-running Node process instead of serving the repo directory as static files.

## Required server shape

- App checkout in `/var/www/Scholar-s_Sanctuary`
- Node process running `node dist/server/entry.mjs`
- `systemd` service named `lumina`
- `nginx` vhost proxying `luminalibrary.duckdns.org` to `127.0.0.1:3000`

## Files in this repo

- `deploy/lumina.service`: example `systemd` unit
- `deploy/lumina.nginx.conf`: example `nginx` server block

## First-time setup

Run these on the VPS:

```bash
sudo mkdir -p /var/www/Scholar-s_Sanctuary
sudo chown -R "$USER":"$USER" /var/www/Scholar-s_Sanctuary
cd /var/www/Scholar-s_Sanctuary

git clone <YOUR_REPO_URL> .
npm install

cat > .env <<'EOF'
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SITE_URL=https://luminalibrary.duckdns.org
EOF

npm run build
```

Install `systemd`:

```bash
sudo cp deploy/lumina.service /etc/systemd/system/lumina.service
sudo systemctl daemon-reload
sudo systemctl enable --now lumina
sudo systemctl status lumina --no-pager
```

Install `nginx` site:

```bash
sudo cp deploy/lumina.nginx.conf /etc/nginx/sites-available/lumina
sudo ln -sf /etc/nginx/sites-available/lumina /etc/nginx/sites-enabled/lumina
sudo nginx -t
sudo systemctl reload nginx
```

If you use Certbot, re-issue or attach TLS after the HTTP site works.

## GitHub Actions secrets

The deploy workflow expects:

- `VPS_IP`
- `VPS_USER`
- `VPS_SSH_KEY` for the hardened final setup
- `VPS_PASSWORD` as a temporary compatibility fallback until the SSH key is provisioned
- `VPS_HOST_FINGERPRINT` once the real SSH host key has been verified against the same host used in `VPS_IP`

To get the host fingerprint on the VPS:

```bash
ssh-keygen -l -f /etc/ssh/ssh_host_ed25519_key.pub | awk '{print $2}'
```

Copy the full private key into `VPS_SSH_KEY` including the `BEGIN/END OPENSSH PRIVATE KEY` lines.
Until that key exists in GitHub, the workflow can still deploy with `VPS_PASSWORD`, but the issue remains open because the migration to dedicated key auth is not complete.

## Deploys after setup

The GitHub Action now prefers `VPS_SSH_KEY` and falls back to `VPS_PASSWORD` only while the migration is incomplete. Fingerprint verification is enforced only in the key-based mode, once the host key has been confirmed against the real deploy host. In both cases it pulls, installs, builds, and restarts `lumina`:

```bash
cd /var/www/Scholar-s_Sanctuary
git pull origin main
npm ci
npm run db:check
npm run build
sudo systemctl restart lumina
sudo systemctl status lumina --no-pager
```
