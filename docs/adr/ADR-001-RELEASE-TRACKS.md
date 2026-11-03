# ADR-001: immutable certification and additive engineering tracks

Status: accepted for repository engineering; external certification remains pending.
Date: 2026-11-02.

Track A is source `6484873c8a0c3306a5972247bcc9981da4051bc6`, run
32952095093, artifact 9600540959. Its historical references and externally owned
approval records must not be overwritten, relabeled or inferred from later tests.
Track B begins at PR #71 head `e90b95b3ed371b5b9774e83a04aa0982fe619f86`.
Main remains `c12a4b5b8736700c2fdf2739fcd6f9a41c233521` at this decision.

Every additive engineering PR records its base and source, migrations, tests and
rollback boundary. Stacked PRs may target the preceding reviewed feature branch
while #71 is blocked; they confer no main acceptance or launch authorization.
Only real required checks and normal protected merges promote source. A later
successful main run creates a new candidate; it cannot inherit external approval.
Missing artifacts, unavailable signing, independent assessment or human approvals
remain blockers. Local results are local evidence, never substitute statuses.

The uploaded handoff and roadmap are requirements, not evidence of completion.
The 82 acceptance rows and 48 stories begin unverified; checked prose does not
satisfy them. No dates, staff capacity, pilot participants or certified outcomes
are invented. Pilot and public GA decisions remain separate, initially NO-GO.
