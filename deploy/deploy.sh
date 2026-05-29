#!/bin/bash
set -e

REPO_ROOT="/root/wa-flashlogin"
REACT_DIR="$REPO_ROOT/examples/react-vite"
WWW_DIR="/var/www/wa-flashlogin"
PM2_CONFIG="$REPO_ROOT/deploy/ecosystem.config.cjs"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  wa-flashlogin Demo Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Install dependencies
echo ""
echo "[1/5] Installing dependencies..."
cd "$REPO_ROOT"
pnpm install

# 2. Build React app
echo ""
echo "[2/5] Building React app..."
cd "$REACT_DIR"
pnpm run build

if [ ! -f "$REACT_DIR/dist/index.html" ]; then
  echo "❌ Build failed — dist/index.html not found"
  exit 1
fi

# 3. Copy to /var/www
echo ""
echo "[3/5] Copying built files to $WWW_DIR..."
sudo mkdir -p "$WWW_DIR"
sudo rm -rf "$WWW_DIR/dist"
sudo cp -r "$REACT_DIR/dist" "$WWW_DIR/"
echo "✓ Copied $(ls -1 $WWW_DIR/dist | wc -l) files to $WWW_DIR/dist"

# 4. Start/reload PM2 process
echo ""
echo "[4/5] Starting/reloading PM2 process..."
pm2 delete wa-flashlogin-demo-server 2>/dev/null || true
pm2 start "$PM2_CONFIG"
pm2 save

# 5. Verify backend is responding
echo ""
echo "[5/5] Verifying backend..."
sleep 2
HEALTH_CHECK=$(curl -sf http://127.0.0.1:3060/ || echo "FAIL")
if [[ "$HEALTH_CHECK" == "FAIL" ]]; then
  echo "❌ Backend health check failed"
  pm2 logs wa-flashlogin-demo-server --lines 20 --nostream
  exit 1
fi
echo "✓ Backend responding on :3060"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deployment Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Copy deploy/nginx.conf.example to /etc/nginx/sites-available/flashlogin.whatshubb.co.za"
echo "  2. Create symlink: sudo ln -s /etc/nginx/sites-available/flashlogin.whatshubb.co.za /etc/nginx/sites-enabled/"
echo "  3. Test nginx config: sudo nginx -t"
echo "  4. Obtain SSL cert: sudo certbot certonly --nginx -d flashlogin.whatshubb.co.za"
echo "  5. Reload nginx: sudo systemctl reload nginx"
echo ""
echo "Check status:"
echo "  pm2 list"
echo "  pm2 logs wa-flashlogin-demo-server"
echo "  curl http://127.0.0.1:3060/"
echo ""
