# ADR-009: preserve signed actor type at human review boundaries

Status: implemented for need verification and evidence review/access; other human
approval boundaries and production identity configuration still require validation.

Canonical Shared Services source `Atlasfsp/Nvuto-Platform_Services` at
47ec7174f905dbc9e04f9ede4f5775e978540949 defines `human`, `service`, and `ai_employee`
in `pkg/actor/actor.go`. Its OIDC verifier reads the signed `actor_type` claim and
uses `human` for legacy tokens without that claim.

Extend iRespond's existing RS256/OIDC verifier to preserve this claim after signature
verification. Reject unsupported actor types. Do not create another identity service
or trust actor headers, request bodies or role names as actor identity.

Need verification transitions and the existing evidence review/access policy require
a human subject. A service or AI employee cannot acquire that authority through a
reviewer/admin role or human delegation. This is a local deny boundary; it does not
replace tenant/resource authorization or external certification. AICO proposal APIs
and tool approval workflows are still separate implementation work.

Legacy token compatibility relies on the canonical issuer correctly marking workload
tokens. Production approval must verify issuer claim mappings; missing workload actor
claims cannot be inferred safely from a subject string. No live issuer or AICO registry
configuration is claimed by these tests.
