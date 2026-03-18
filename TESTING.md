# Testing Guide

## Automated

Run the full unit suite:

```bash
npm test
```

Covered areas:

- plate extraction from webhook payloads
- webhook reception and enqueueing
- webhook processing orchestration
- reservation date fallback on conflict
- HTTP retry and no-retry behavior for 4xx
- Kypcar login, token refresh and refresh deduplication
- webhook registration reuse vs creation
- JSON body parsing and malformed payload handling

## Local Functional

Start the application:

```bash
npm start
```

Health check:

```bash
curl http://localhost:3000/health
```

Simulate webhook:

```bash
curl -X POST http://localhost:3000/api/webhooks/kypcar \
  -H 'Content-Type: application/json' \
  -d '{"plate":"BRA2E19"}'
```

Inspect event result:

```bash
curl http://localhost:3000/api/events/SEU_EVENT_ID
```

Expected result:

- the webhook request returns `202`
- the event status becomes `completed`
- the response contains `vehicle`, `reservation` and `reservationAttempts`

## End-to-End With Public URL

1. Expose the app with `ngrok` or Cloudflare Tunnel.
2. Update `APP_BASE_URL` in `.env`.
3. Restart the app.
4. Register the webhook:

```bash
curl -X POST http://localhost:3000/api/setup/webhook/register
```

5. Wait for the Kypcar test event.
6. Confirm receipt in logs and inspect the stored event status.
