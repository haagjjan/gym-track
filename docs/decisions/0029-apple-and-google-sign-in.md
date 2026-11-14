# ADR 0029 - Sign in with Apple and Google

## Status

Proposed, 2026-11-14. Requested by the owner for the mobile release. Nothing is built. The
store-rule statements below are from memory and must be checked against the primary sources
before this ADR is accepted (see Verification gates).

## Context

Accounts today are email and password with email verification and password reset
([ADR 0022](0022-open-public-registration.md)). The mobile app signs in with the same
credentials and gets a bearer session ([ADR 0023](0023-mobile-token-auth.md)).

The owner wants one-tap sign-in with an Apple or Google account, on the phones and on the web.
This is usually called social login or federated authentication: another party (Apple, Google)
confirms who the user is, and GymTrack trusts that confirmation.
The reasons: less typing on a phone, no new password to keep, and the provider's own two-factor
and recovery protect the account.

Store rule to respect: App Store Review Guideline 4.8 requires an app that offers a third-party
login (such as Google) to also offer an equivalent privacy-preserving option. Sign in with Apple
meets it. So on iOS, Google sign-in cannot ship without Apple sign-in. Email and password alone
would not trigger the rule.

## Proposed decision

1. **Providers.** Apple and Google, both on iOS, Android and the web. Email and password stays.
2. **The provider proves identity; GymTrack still owns the session.** The client gets an OpenID
   Connect ID token from the provider and sends it to the API. The API verifies the signature
   against the provider's published keys and checks issuer, audience (our client IDs only),
   expiry and a nonce the API issued for that attempt. It then creates the same opaque session
   as a password login (cookie on the web, bearer token in the app). No provider access or
   refresh token is stored, except what Apple requires for revocation (item 7).
3. **Clients.** In the app: the native system sheets through Capacitor plugins (Apple's
   AuthenticationServices on iOS, Credential Manager on Android), not a web redirect. On the
   web: the providers' redirect flow, handled by the BFF so the session cookie rules do not
   change.
4. **Data model (additive).** A new table `user_identities` (`user_id`, `provider`,
   `provider_subject`, `email_at_link`, `created_at`, unique on `provider` + `provider_subject`).
   `users.password_hash` becomes nullable for accounts that never set a password. The provider's
   subject ID is the key, never the email.
5. **Linking to an existing account.** A provider sign-in attaches to an existing account
   automatically only when the provider reports the email as verified and the existing account
   has verified the same email. In every other case the user signs in with the password first
   and links the provider in Settings. This prevents taking over an account by registering its
   email at a provider, or by pre-registering someone's email here.
6. **Signup rules still apply.** A first provider sign-in creates no account until the user has
   confirmed age and Swiss residence and accepted the policies (ADR 0022), on a short completion
   screen. `REGISTRATION_MODE` applies to provider signups too. The email counts as verified
   only when the provider says so.
7. **Apple specifics.** Users may hide their email; mail then goes through Apple's relay, so the
   sending domain must be registered with Apple. Account deletion must also revoke the Apple
   token, so the deletion job calls Apple's revoke endpoint for linked Apple identities.
8. **Accounts without a password.** They can add one through the existing reset flow. Sensitive
   actions that ask for the password today (deletion, email change) accept a fresh provider
   sign-in instead.
9. **Feature flag.** `ENABLE_PROVIDER_SIGN_IN` (default off), per provider client IDs in env.
   With the flag off the routes do not exist and the buttons are hidden.

## Consequences

- Apple and Google become identity providers: the privacy policy, processor inventory, store
  privacy labels and the DPIA need an update before release.
- Needs owner-created accounts and keys: Apple Developer Program (App ID capability, Services
  ID and key for the web flow), Google Cloud OAuth clients for iOS, Android and web.
- The API fetches provider signing keys over the network; it caches them and fails closed.
- Two new native plugins in `apps/mobile`, and one more auth surface to test and rate-limit.
- Passkeys would give similar ease without a third party. They are not excluded, but they do
  not answer the wish for Apple and Google accounts, so they are a later option.

## Verification gates

- Primary-source check of Guideline 4.8, the Apple token-revocation requirement on account
  deletion, and Google's current Android and iOS sign-in APIs, before acceptance.
- API tests: wrong audience, wrong issuer, expired token, replayed nonce, unverified email,
  linking rules in item 5, flag off.
- Sol and Argon security review of the implementation.
- On devices: sign up, sign in, link, unlink and delete an account with each provider.

## Alternatives

- **Google only.** Not allowed on iOS without an equivalent option (Guideline 4.8).
- **A hosted identity service (Auth0, Clerk, Firebase Auth).** Faster to start, but moves the
  user table or the login to a third party and adds a processor. Rejected for a self-hosted
  product of this size.
- **Web redirect inside the app.** Works, but feels foreign and Google blocks sign-in in
  embedded WebViews.
