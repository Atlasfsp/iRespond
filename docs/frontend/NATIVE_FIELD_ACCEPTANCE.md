# Native field reporting acceptance

Status: physical-device acceptance PENDING. Browser assertions, TypeScript and autolinking are separate evidence and do not satisfy this checklist. Use a designated test phone and clearly identified demo observations. This is not institutional field validation or certification.

## Build and installation boundary

The field-report source is 89fdd6e4bee5dc10986e28eaf8b05338e9aed9ac. Expo Video 2.2.2 and FileSystem 18.1.11 require a fresh native build; do not place new JavaScript into an APK lacking these modules. Preserve the existing application data and original APK. An incompatible signing certificate requires an explicit installation decision; do not automatically uninstall or clear data.

The current local demo build uses Java 17, Gradle 8.13, Android build tools/compile/target SDK 35, minimum SDK 24 and ARM64. Its isolated generated snapshot overrides NDK to installed r28c (28.2.13676358), instead of downloading the canonical Expo default 27.1.12297006. This local toolchain adjustment does not alter the repository release configuration and needs actual build/runtime verification. It uses a development signing key and EXPO_PUBLIC_DEMO_MODE=1; it is not a production-signed release.

For USB testing, enable Developer options by tapping Build number seven times, then enable USB debugging and approve this Mac on the unlocked phone. ADB must report the device as authorized before installation. Device serials, exact GPS values and captured media belong in private local evidence, not public PR descriptions.

## Required checks and expected behavior

| Check | Expected result / evidence |
| --- | --- |
| Launch with Metro stopped | Standalone app loads; demo banner remains visible, no missing Video/FileSystem native module or fatal exception |
| Upgrade from previous demo | Existing draft/account settings remain available; no forced data reset |
| Need details and verification | Correct need ID and location; Google and Apple destination-only links open on explicit tap; unknown coordinates disable directions, real zero remains valid |
| Other category | Bounded custom text survives navigation, app restart, submission queue and need detail; fixed categories do not retain stale Other text |
| Camera photo | Permission grant opens camera; preview has origin/stage/time and explicit GPS status/accuracy; app-private copy survives force-stop/reopen |
| Permission denial | Denied camera/library/location/microphone causes recoverable guidance, not a crash or fabricated metadata |
| Four-photo budget | Four photos accepted; fifth blocked; remove one and replace it; removal does not erase another draft or picker original |
| Video | Record/select one bounded video, play/pause in app, remove/reselect; second video and oversized files rejected; requested capture limit 30 seconds |
| Offline recovery | Save draft with media, disconnect network, force-stop/reopen, verify draft and pending reason, reconnect and retry without duplicate report/upload intent |
| Submission history | Device outbox clearly distinguishes pending, failed and acknowledged submissions; successful receipt links to the correct need |
| Roles and sign-out | Account identity and project assignments stay distinct from local position; sign-out/focus refresh removes privileged controls |
| Accessibility | TalkBack labels/order, large text, keyboard/focus where relevant, reachable removal/retry controls and no clipped essential actions |
| Lifecycle and privacy | Background/foreground and permission changes refresh correctly; no unexpected production requests or public exposure of private capture context |

Record phone model, Android version, APK SHA-256, source SHA, toolchain, install result and each observed result. Mark unperformed checks NOT RUN. Screenshots/logcat should cover only the test app; retain failed attempts and redact private data before publication. A demo pass cannot certify connected production identity, policy, upload scanning or offline synchronization against live services. Apple Maps/native iOS and VoiceOver require separate iOS device evidence.
