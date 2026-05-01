#!/bin/bash
set -e
cd /home/assargp/ruflo_project

# Delete orphaned client components (their pages were removed)
rm -f apps/web/src/app/admin-api-connections-client.tsx
rm -f apps/web/src/app/admin-payments-client.tsx

# Delete temp script/text files from root that shouldn't be committed
rm -f admincheck.txt adminfiles.txt catfiles.txt catfiles2.txt
rm -f ec2ip.txt envcheck.txt gitdiff.txt gitfiles.txt gitlog.txt gitlog2.txt gitlog3.txt
rm -f gitstatus.txt gitstatus2.txt knownhosts.txt nginxcheck.txt nginxcheck2.txt
rm -f push2_out.txt push3_out.txt push4_out.txt push5_out.txt push6_out.txt push7_out.txt push8_out.txt push9_out.txt
rm -f rootls.txt run-cleanup.sh run-git.sh run-grep.sh run-tsc.sh sshkeys.txt
rm -f tsc-check.txt tsc_out.txt web-admin-files.txt wfcheck.txt
rm -f 'tsc-check.txt"'

# Stage all changes
git add -A

echo "=== Git status ==="
git status --short

echo ""
echo "=== Committing ==="
git commit -m "fix(web): route all /admin/* links to the dedicated admin app

- Delete apps/web/src/app/admin/ (9 pages) — web app no longer serves admin routes
- Delete orphaned admin-api-connections-client.tsx and admin-payments-client.tsx
- route-shell.tsx: use absolute adminUrl for all admin nav/account links
- role-cabinet.tsx: use absolute adminUrl for all admin card/button hrefs
- dashboard-overview-client.tsx: use absolute adminUrl for payment ops links
- onboarding/page.tsx: use absolute adminUrl for control plane step hrefs
- docker-compose.yml: add NEXT_PUBLIC_ADMIN_URL env var to web service

All /admin/* paths now route exclusively through Traefik to the dedicated
admin Next.js app (port 3002), preventing client-side routing from serving
web app pages for admin routes."

echo ""
echo "=== Pushing ==="
git push origin main

echo "EXIT:$?"
