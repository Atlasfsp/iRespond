# Field review execution ledger — 3 November 2026

GA remains false. This is repository engineering evidence, not independent certification or real pilot evidence. Human capacity, institution, owner, participants and dates remain UNKNOWN.

## Exact source and merges

- API source b24e12c0bc823b663e50fb06039db22db1747101; PR #89 merged normally into the existing feature at 483f5c62e777c39ab674e42a3794ab31fbaec151.
- App source 89fdd6e4bee5dc10986e28eaf8b05338e9aed9ac; PR #90 merged normally into the feature at 4361184e303b0144a0b413b11eb30b862cb1286f. Tested source and resulting feature tree both 792b5100e63c2ca86fbfecd63afc513b38e9766d.
- Compatible security dependency update source e82bb65f15bd694b80032ae741c56ce3c41c13b9; evidence bookend 3185e2d91c2686ccc69712488c62f068c05cc9df. PR #91 merged normally at 847bcccdc6de7397e407280b6eaab70cc1744c61; source/feature tree 3357700053ddad40d7c535e7ffc319c4208c38e6. No frontend changes in this dependency increment.
- Protected main was c12a4b5b8736700c2fdf2739fcd6f9a41c233521. Historical candidate 6484873c8a0c3306a5972247bcc9981da4051bc6 and its retained evidence are unchanged.

## Actual verification

Local evidence is retained under build/handoff/product-review-20261103/, with verification-manifest.json containing SHA-256 hashes. These local results are not GitHub CI results.

- Full Go unit/integration suite and race suite passed against isolated YugabyteDB 2025.2.7.0-b107 and RustFS beta12, then the complete race suite passed again after dependency updates. Go vet and go mod verify passed. Tests used Go 1.26.10, bounded package concurrency, and real synthetic fixture storage. Owned fixture containers were removed afterward.
- Fixture image digests: YugabyteDB sha256:c5b064da97c22faa426af468c9c7d9155a71032f9ebfe04cc024115bbe29dba6; RustFS sha256:41fe89380f4120a337790c02af192c3fe7bb55c3edc2e6e9357b487b47c6ab21.
- Repository verification, mobile TypeScript, Expo web export and native autolinking registration passed. Browser assertions passed for directions, custom category, authenticated/guest permissions, media limits/removal, local submission history and corrupted-draft recovery.
- Browser accessibility covered 33 route/viewport combinations with no automated violations, overflow or missing labels. Thirty-three incomplete checks require human review. This is not WCAG or native assistive-technology certification.
- Darwin/ARM64 and Linux/ARM64 govulncheck reported no vulnerable call paths; one unused OpenPGP module advisory remains. Production npm audit reported zero critical/high, three moderate and one low. See DEPENDENCY_REVIEW_20261103.md for limits.
- Negative tests reproduced missing coordinates becoming zero, lost custom context, upload-intent duplication, guest role leakage and lost-upload-response recovery before fixes. Failed fixture, overlapping-migration, wrong-working-directory and resource attempts remain separately recorded; they are not relabeled as passes.

## Native and release boundary

Original untracked apps/mobile/android/ and previously delivered APKs remain untouched. Expo Video requires a genuine new native build. Fresh prebuild and registration succeeded from app source 89fdd6e; the first Gradle download timed out, and a later build was paused for disk pressure. The resumed canonical-default attempt is tracked in android-build-resumed.txt. It reached a missing-NDK download; a subsequent local-demo attempt uses installed NDK 28.2.13676358 and in-process Kotlin in the isolated generated snapshot, recorded in android-toolchain-adjustment.json and android-build-installed-ndk.txt. The canonical repository release configuration is unchanged. No completed APK or physical-device acceptance is claimed by this ledger. The user reports a USB test phone, but ADB currently reports no device; USB debugging setup is pending.

PR #71 still requires exact-head protected checks. Documentation jobs on PR #89/#90 did not start because GitHub reported an account billing lock; neither is a passing CI result. Earlier artifact quota failures remain historical blockers, not evidence about a newer queued check. No branch-protection bypass, paid runner or external certification was used.

See ../product/FIELD_REVIEW_20261103.md for the full review, implemented functionality and estimated remaining backlog. This increment does not complete all 82 handoff acceptance tests or the entire 90-day programme.

Normal protected merge of PR #71 at feature 847bcccdc6de7397e407280b6eaab70cc1744c61 was attempted and refused by base-branch policy. Required checks were queued; the optional documentation job failed before starting due the billing lock. No auto-merge/admin override was enabled. PR #91 has the same independently verified billing-lock annotation on its documentation job.

## Completed Android build

The fresh standalone demo APK completed successfully: app source 89fdd6e4bee5dc10986e28eaf8b05338e9aed9ac, local Java 17 / Gradle 8.13 / SDK 35 / NDK 28.2.13676358 / ARM64. Successful log: android-build-resolution-retry.txt, 357 actionable tasks (314 executed, 43 up-to-date), 10m6s. This is a genuine Gradle native build, not a JavaScript replacement in the old APK. Original APKs and original untracked Android project remain unchanged.

The isolated snapshot needed bounded real dependency directories and explicit mobile/root nodeModulesPaths for Metro to resolve shared dependencies. Both earlier entry-resolution failures and the failed/interrupted standalone probe attempts remain separately recorded. The corrected package metadata probe passed; the full Android bundle then passed with 1,104 modules. These are build-harness adjustments, recorded in android-toolchain-adjustment.json; canonical application/release configuration is unchanged.

Artifact: build/evidence/completion/irespond-fieldwork-demo-89fdd6e.apk, also copied unchanged to Downloads/iRespond-FIELDWORK-demo-89fdd6e.apk. SHA-256 ad2a08f14c9af622d80837275062aef5e25674c7aab10e47ed7991452c7b43eb; 32,269,746 bytes. Package global.irespond.app.demo, version 0.1.0/code1, min SDK24, target35, ARM64 only. Development certificate SHA-256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c; v2 signature verified. ZIP alignment passed and all 16 ELF libraries have load alignment at least 16KB. Actual DEX class definitions include Video, FileSystem, ImagePicker, Location, Crypto, SecureStore and WebBrowser. Hermes bytecode is bundled; demo mode is compiled/configured explicitly. Receipts: android-apk-signature.txt, android-apk-alignment.txt, android-apk-badging.txt and android-apk-inspection.json.

Physical camera/video/GPS/offline/TalkBack and upgrade acceptance remain NOT RUN: the user reports a USB test phone, but ADB has not detected it. USB debugging guidance was provided. No phone data was cleared, no APK was installed, and no native runtime certification is claimed. The build uses a development key and synthetic demo backend; it is not a production-signed/live-service release. ga=false.
