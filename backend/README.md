# MongoDB account API

This Node 24 service stores Contribly account workspaces in MongoDB. The Sites frontend uses its existing Sign in with ChatGPT identity and forwards authenticated requests over HTTPS. MongoDB is never contacted from the browser.

## Deploy from this GitHub repository

This repository includes a `render.yaml` Blueprint. In Render, choose **New → Blueprint**, select the GitHub repository, and Render will create the Node service with its health check and generated service secret. Create the MongoDB Atlas database separately, then paste its connection string into the Render service’s `MONGODB_URI` secret. Do not paste that value into GitHub or chat.

Use a Node service with the repository root as the working directory:

- Build: `npm ci --ignore-scripts && npm ci --prefix backend --ignore-scripts`
- Start: `node backend/server.mjs`
- Runtime: Node 24
- Health endpoint: `/health`

Configure backend secrets in the hosting provider's secret settings:

- `MONGODB_URI`: MongoDB Atlas connection string, using a dedicated database user.
- `MONGODB_DATABASE`: `contribly` (optional; this is the default).
- `ACCOUNT_SERVICE_SECRET`: a randomly generated secret of at least 32 characters.
- `PORT`: supplied by your host, or defaults to 3001.

In Sites runtime settings configure:

- `ACCOUNT_API_URL`: the backend's HTTPS origin.
- `ACCOUNT_SERVICE_SECRET`: the same backend secret.

Keep the MongoDB connection string only on the Node backend. Restrict Atlas network access to the backend's outbound addresses where the provider supports stable addresses. Never commit secrets or put them in `NEXT_PUBLIC_*` variables.

The service authorizes the proxy before accepting its user ID. Workspace documents use the authenticated site's user ID as MongoDB `_id`, whose built-in unique index provides account isolation. Writes use revision compare-and-swap to reject conflicting edits from another tab/device. No app-supplied user ID from the request body is accepted. Rotating the service secret requires updating both hosts.

## Rollout

Do not publish the account-gated frontend until the backend is deployed, Atlas connectivity succeeds, and both Sites variables are configured. The existing published app remains available until that point. The local implementation is a prepared integration, not a working database connection until configured.

## Existing demo progress

Account data starts empty. In the account screen, an explicit import action can merge this browser's old demo bookmarks/contributions. Existing account contributions take precedence; the local copy is retained. This avoids silently assigning shared-browser data to the wrong account.
