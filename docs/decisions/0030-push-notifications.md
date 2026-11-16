# ADR 0030 - Push Notifications

## Status

Proposed, 2026-11-14. Nothing is built. Needs the owner's decision and the Apple and Google
developer accounts.

## Context

The app already notifies from the phone itself: the end of a rest timer and weekly workout
reminders are local notifications and need no server (plan Step 10). What local notifications
cannot do is tell a user about something that happened on the server while the app is closed:
a new message in the inbox, or a request for feedback.

Sending such a notification means handing a device token and a short text to Apple (APNs) and
Google (FCM). Both become processors of a device identifier, and the API needs outbound
access to them.

## Proposed decision

1. **What is pushed.** Only inbox messages (admin campaigns) at first. No marketing, no
   streak nagging. The notification says that there is a new message; the content stays in
   the app.
2. **Opt-in.** The app asks for permission only when the user turns on "Message
   notifications" in Settings. Off by default. Turning it off deletes the device token on
   the server.
3. **Data model (additive).** Table `push_devices` (`id`, `user_id`, `platform` ios or android,
   `token`, `created_at`, `last_seen_at`, unique on `token`). Tokens are deleted on sign-out,
   account deletion, and when APNs or FCM reports them invalid.
4. **Sending.** The API sends directly to APNs (HTTP/2 with a signing key) and to FCM (HTTP
   v1 with a service account), from the existing campaign publishing code, in the background
   with retries. No third-party push service in between.
5. **Flag.** `ENABLE_PUSH` (default off) with the APNs key and FCM credentials as secrets.
   Without them the endpoints do not exist.

## Consequences

- Apple and Google appear in the processor inventory and the privacy notice for device tokens.
- The home server needs outbound HTTPS to `api.push.apple.com` and `fcm.googleapis.com`.
- The store privacy answers change ("Device ID", linked to the user, for app functionality).
- iOS needs the Push Notifications capability and an APNs key; Android needs a Firebase
  project and `google-services.json` in the Android project.

## Alternatives

- **Local notifications only.** Already built. Enough for timers and reminders, not for
  server events.
- **A push service (OneSignal, Firebase for both platforms).** Less code, but another
  processor and an SDK in the app.
- **Email only for messages.** Works today and stays as the fallback.
