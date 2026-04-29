# Production Cloudflare Tunnel

Production uses an externally managed `cloudflared` systemd service on the EC2 host.
It is not started by `docker-compose.yml`.

## Source of Truth

- Server config path: `/etc/cloudflared/config.yml`
- Server systemd unit: `/etc/systemd/system/cloudflared.service`
- Expected production tunnel ID: `e1295a7d-5335-4189-b0fc-df2c52570858`

## Required Routing

Cloudflare DNS for the production zone must point these hostnames to the exact tunnel ID above:

- `alemhub.sbs`
- `www.alemhub.sbs`

If DNS points to a different tunnel, Cloudflare returns `502` even when the EC2 origin is healthy.

## Expected Origin

`/etc/cloudflared/config.yml` on the server should route traffic to local Traefik:

```yaml
tunnel: e1295a7d-5335-4189-b0fc-df2c52570858
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: alemhub.sbs
    service: http://127.0.0.1:80
  - hostname: www.alemhub.sbs
    service: http://127.0.0.1:80
  - service: http_status:404
```

`127.0.0.1` here is the EC2 host loopback, not a developer machine.

## Validation

Run these on the production server after deploy or DNS changes:

```bash
sudo cat /etc/cloudflared/config.yml
sudo systemctl status cloudflared --no-pager
sudo /usr/bin/cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
sudo /usr/bin/cloudflared --config /etc/cloudflared/config.yml tunnel ingress rule https://alemhub.sbs/signin
curl -I -H 'Host: alemhub.sbs' http://127.0.0.1:80
curl -k -I -H 'Host: alemhub.sbs' https://127.0.0.1:443/signin
curl -I https://alemhub.sbs/signin
```

Expected results:

- ingress validation returns `OK`
- ingress rule matches `alemhub.sbs`
- local Traefik checks return `200`
- public HTTPS returns `200`

## Failure Pattern

If these are true:

- `docker compose ps` shows `traefik`, `web`, and `api` are up
- `curl http://127.0.0.1:80` or `curl https://127.0.0.1:443` returns `200`
- public `https://alemhub.sbs/...` still returns `502`

then the most likely root cause is Cloudflare DNS pointing to the wrong tunnel.
