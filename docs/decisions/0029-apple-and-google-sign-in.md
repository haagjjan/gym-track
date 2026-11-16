# ADR 0029 - Sign in with Apple and Google

## Status

Accepted by the owner on 2026-11-14 with one change: Apple sign-in is not offered in the
Android app (item 1). Nothing is built. The store rules were checked against Apple's pages
the same day; see "Source check".

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

1. **Providers.** Email and password stays everywhere. In addition:
   - iPhone app: Apple and Google.
   - Android app: Google only. Apple sign-in belongs to Apple devices and is not offered
     there.
   - Website: Apple and Google, so someone who signed up with Apple on an iPhone can also
     use the website.

   Someone who signed up with Apple and later moves to an Android phone signs in there with
   a password, which they can set through the reset flow (item 8).
2. **The provider proves identity; GymTrack still owns the session.** The client gets an OpenID
   Connect ID token from the provider and sends it to the API. The API verifies the signature
   against the provider's published keys and checks issuer, audience (our client IDs only),
   expiry and a nonce the API issued for that attempt. It then creates the same opaque session
   as a password login (cookie on the web, bearer token in the app). No provider access or
   refresh token is stored, except what Apple requires for revocation (item 7).
3. **Clients.** In the app: the native system sheets through Capacitor plugins (Apple's
   AuthenticationServices on iOS for Apple, Credential Manager on Android for Google), not a
   web redirect. On the
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

## Build state (2026-11-14)

- Built behind `ENABLE_PROVIDER_SIGN_IN` (off): the API (token check, nonces, sign-in, signup
  with consent, linking), with unit and database tests.
- Not built: the native sign-in sheets (they need the Apple capability and the Google client
  IDs), the website redirect flow, and revoking the Apple token on account deletion (needs
  the owner's Apple key). The flag must stay off until these exist.

## Source check (2026-11-14)

- Guideline 4.8, https://developer.apple.com/app-store/review/guidelines/: an app that uses a
  third-party or social login must also offer an equivalent login that limits data to name
  and email, lets users keep their email private and does not collect interactions for
  advertising without consent. An app that only uses its own account system is exempt. The
  page was read through a summarising fetch, so the wording here is not a verbatim quote;
  read the paragraph once more before submitting to review.
- Account deletion, https://developer.apple.com/support/offering-account-deletion-in-your-app/
  (verbatim): "Apps that support Sign in with Apple should use the Sign in with Apple REST
  API to revoke user tokens."
- Not checked yet: Google's current sign-in APIs for Android and iOS.

## Verification gates

- Primary-source check of Google's current Android and iOS sign-in APIs before building.
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
