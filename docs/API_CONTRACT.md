# API contract policy

`services/api/openapi.yaml` is the checked-in public HTTP contract for iRespond.

`tools/verify_openapi_contract.py` derives the literal Go `ServeMux` method/path surface from `services/api/cmd/server` and fails CI when a registered route is absent from OpenAPI, when OpenAPI contains a stale route, when an operation lacks `responses`, or when `operationId` coverage is missing or duplicated.

The current contract covers all registered HTTP method/path operations. This route/operation coverage is a GA repository gate.

This gate does **not** by itself prove field-by-field runtime payload conformance. Request/response examples, core schemas and common errors are documented in OpenAPI, while automatic semantic schema conformance remains a separate hardening concern. That distinction is intentional so the GA ledger does not overstate what route coverage proves.
