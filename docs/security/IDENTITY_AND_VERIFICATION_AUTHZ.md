# Identity and verification authorization

iRespond consumes identity through OpenID Connect rather than embedding an identity provider into the application. The intended reusable provider in the Atlasfsp platform is StratoID, while the contract remains compatible with any issuer that provides RS256 JWT access tokens and a JWKS endpoint.

## API configuration

Protected verification endpoints fail closed unless all of the following are configured:

- `OIDC_ISSUER` — exact token issuer.
- `OIDC_AUDIENCE` — required iRespond API audience.
- `OIDC_JWKS_URL` — HTTPS JWKS endpoint used to resolve signing keys.

The verifier validates RS256 signatures, `kid`, issuer, audience, expiry and not-before time. Signing keys are cached briefly and refreshed from JWKS. The API never trusts a mobile-supplied actor ID for protected verification state changes.

## Mobile configuration

The mobile application uses authorization code + PKCE and stores the resulting access token in platform SecureStore:

- `EXPO_PUBLIC_OIDC_ISSUER`
- `EXPO_PUBLIC_OIDC_CLIENT_ID`
- `EXPO_PUBLIC_API_BASE_URL`

The native redirect scheme is `irespond://signin`. The corresponding redirect URI must be registered on the identity-provider client.

## Verification policy

| Transition | Required identity capability |
| --- | --- |
| Request verification | Any authenticated principal |
| Community confirmed | `community_verifier` or `trust_safety_admin` |
| Institution confirmed | `institution_verifier` or `trust_safety_admin` |
| Expert confirmed | `expert_verifier` or `trust_safety_admin` |
| Independently audited | `impact_auditor` or `trust_safety_admin` |
| Government confirmed | `government_verifier` or `trust_safety_admin` |
| Disputed | Any verifier/auditor/government verifier or `trust_safety_admin` |
| Rejected | `trust_safety_admin` only |

State-machine rules remain separate from authorization. A role may be authorized to attempt a transition while the lifecycle still rejects it because the current state does not permit that transition.

## Deliberate boundary

Need discovery remains public. Initial observation reporting may remain available without a full identity session so community reporting is not blocked by account creation or poor connectivity. High-trust actions are authenticated and authorized. Reporter identity/privacy policy will be tightened in the dedicated privacy and safeguarding slice.
