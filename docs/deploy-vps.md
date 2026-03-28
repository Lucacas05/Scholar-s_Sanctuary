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

## Deploys after setup

The GitHub Action now pulls, installs, builds, and restarts `lumina`:

```bash
cd /var/www/Scholar-s_Sanctuary
git pull origin main
npm install
npm run build
sudo systemctl restart lumina
sudo systemctl status lumina --no-pager
```
