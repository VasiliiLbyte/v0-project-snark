#!/usr/bin/env bash
set -euo pipefail

git add -A

git -c user.name="Vasilii" -c user.email="ig9573407@gmail.com" commit -m "$(cat <<'EOF'
feat: migrate portal navigation to App Router structure

Replace state-driven single-page routing with App Router route files, Link-based sidebar navigation, and a repository-backed data contract so mock data can be swapped to API without UI rewrites.
EOF
)"
