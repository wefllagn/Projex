# Private Home-LAN Browser Testing

## Boundary and topology

This guide prepares a controlled `LOCAL_FULL` instance for browser-only acceptance on one trusted private home Wi-Fi. It is not Internet, VPS, TRIL, or production deployment. Do not add port forwarding, a public tunnel, public DNS, or public TLS.

Windows laptop A remains the only Projex host. It runs the Vite frontend, Express API, PostgreSQL, Java worker, Git provisioning worker, and managed Git storage. Windows laptop B and the Mac require only a supported browser and network access for ordinary Projex workflows.

The LAN uses two direct browser-visible endpoints on one consistent host identity:

- frontend: `http://<PROJEX_HOST_LAN_IP>:5173`
- API: `http://<PROJEX_HOST_LAN_IP>:3000/api/v1`

This design keeps exact-origin CORS visible and preserves the backend's remote-socket protection for Git Smart HTTP. A development proxy is deliberately not used because a broad `/api` proxy could make LAN transport requests appear loopback-originated to Express. Native Git remains unavailable over the LAN.

## Preconditions

- All three devices are on the same trusted private Wi-Fi.
- The access point does not use client/AP isolation.
- Windows laptop A uses a private LAN address reachable from the other devices.
- Windows Firewall rules, if needed, are restricted to the Private profile and the two TCP ports below.
- The LAN address or hostname is used consistently. Do not mix it with `localhost`, `127.0.0.1`, or another hostname in one browser session.
- Windows laptop A already has its private backend environment, PostgreSQL, JDK, Git executable, Java worker, Git worker, and storage configured for controlled `LOCAL_FULL` development.

To identify a candidate IPv4 address on Windows A, run:

```powershell
Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null } | Select-Object -ExpandProperty IPv4Address
```

Select the private address for the active home Wi-Fi adapter. Do not commit it to the repository or an example environment file.

## Start Windows A for LAN access

Open separate PowerShell terminals. Replace `<PROJEX_HOST_LAN_IP>` in both terminals with the same selected address.

### 1. Express API

```powershell
cd C:\path\to\Projex\server
$env:HOST = '0.0.0.0'
$env:PORT = '3000'
$env:FRONTEND_ORIGIN = 'http://<PROJEX_HOST_LAN_IP>:5173'
$env:AUTH_COOKIE_SECURE = 'false'
$env:TRUST_PROXY_HOPS = '0'
$env:GIT_SMART_HTTP_ENABLED = 'false'
npm run dev
```

These overrides apply only to that PowerShell process. The API deliberately binds all local interfaces for this test, accepts only the exact configured frontend Origin, uses development HTTP cookies, trusts no proxy, and keeps native Git transport disabled. Production still requires secure cookies and exactly one trusted proxy hop.

### 2. Java and Git provisioning workers

Start the existing workers from their own terminals using the normal private local environment:

```powershell
cd C:\path\to\Projex\server
npm run dev:worker
```

```powershell
cd C:\path\to\Projex\server
npm run dev:git-worker
```

Workers do not listen for client connections. Java and browser repository operations remain server-side on Windows A. Do not increase worker concurrency for the home test.

### 3. Vite frontend

```powershell
cd C:\path\to\Projex\client
$env:VITE_API_BASE_URL = 'http://<PROJEX_HOST_LAN_IP>:3000/api/v1'
npm run dev:lan
```

`npm run dev` remains the loopback-only default. `npm run dev:lan` is the deliberate opt-in that binds Vite to local network interfaces and fails instead of silently choosing another port when `5173` is unavailable. The API base is operator-supplied and must use the same host identity as the frontend.

## Connect Windows B and the Mac

Open this exact URL in each browser profile:

```text
http://<PROJEX_HOST_LAN_IP>:5173
```

Before testing authenticated workflows, confirm from each client:

1. the frontend loads;
2. browser developer tools show API requests going to `http://<PROJEX_HOST_LAN_IP>:3000/api/v1`;
3. `GET /api/v1/health` succeeds through the configured API address;
4. login establishes the access, refresh, and CSRF cookies for the selected host identity; and
5. mutations carry `X-CSRF-Token` and do not report CORS errors.

Keep the API, Java-worker, Git-worker, and browser developer-console/network views visible. Retain only redacted request IDs, timestamps, lifecycle states, and stable error codes. Do not capture passwords, cookies, tokens, join codes, source, hidden tests, Git credentials, feedback drafts, environment values, or host storage paths.

## Windows Firewall boundary

The direct topology may require inbound TCP access to:

- `5173` for the Vite frontend;
- `3000` for the Express API.

If Windows prompts, allow access only on Private networks. Do not allow Public-network access. Do not create rules automatically, enable router port forwarding, or expose these ports to the Internet. Persistent firewall changes require a separate approval; the operator should remove any temporary rules after testing.

If a later approval authorizes explicit rules, an elevated PowerShell operator can use narrowly named Private-profile, local-subnet-only rules:

```powershell
New-NetFirewallRule -DisplayName 'Projex Home LAN Frontend' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -Profile Private -RemoteAddress LocalSubnet
New-NetFirewallRule -DisplayName 'Projex Home LAN API' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 -Profile Private -RemoteAddress LocalSubnet
```

After the test, remove only those exact rules:

```powershell
Remove-NetFirewallRule -DisplayName 'Projex Home LAN Frontend'
Remove-NetFirewallRule -DisplayName 'Projex Home LAN API'
```

These commands are instructions only and are not executed by this readiness task.

## Stop and return to localhost-only development

1. Stop Vite, the API, and both workers with `Ctrl+C` in their terminals.
2. Close those PowerShell terminals so the temporary environment overrides disappear.
3. Remove any separately approved temporary Private-profile firewall rules.
4. Start the backend with its normal private local environment and run `npm run dev` from `client/`.
5. Use the ordinary localhost URL and do not reuse a browser tab or cookie session created under the LAN host identity.

## Manual acceptance checklist

- Confirm Windows B and the Mac can reach Windows A without router changes.
- Use separate browser profiles for every Student, Instructor, and Admin session.
- Verify authentication, refresh, logout, CSRF-protected mutations, and role navigation.
- Verify class, activity, visible-test, submission, assessment/release, project, collaboration, provisioning, and browser repository-inspection workflows.
- Start two or three visible-test runs or submissions close together and observe truthful queued/assessing/completed states; this is not a load test.
- Confirm hidden tests, unreleased scores/feedback, source, credentials, storage paths, and cross-class records remain protected.
- Confirm repository `READY` comes from the server and browser clients require neither Git nor a JDK.
- Treat stale state, cross-user leakage, CORS/CSRF errors, stuck polling, misleading lifecycle messages, or inconsistent Windows/macOS behavior as defects.

Do not test native `git clone`, `fetch`, `pull`, or `push`; Smart HTTP remains loopback-only. Do not test Internet access, public URLs, hostile-code isolation, worker scaling, production cookies, reverse-proxy behavior, backup/restore, or deployment under this procedure.
