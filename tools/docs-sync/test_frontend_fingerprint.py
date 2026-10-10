#!/usr/bin/env python3
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from frontend_fingerprint import build_plan, file_sha256, git_blob_sha


class FrontendFingerprintTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.root = Path(self.tempdir.name)
        (self.root / "apps/mobile/app").mkdir(parents=True)
        (self.root / "apps/mobile/lib").mkdir(parents=True)
        (self.root / "docs/manuals/assets/ui").mkdir(parents=True)
        (self.root / "apps/mobile/app/index.tsx").write_text("export default null;\n")
        (self.root / "apps/mobile/lib/sync.ts").write_text("export const sync = true;\n")
        (self.root / "docs/manuals/assets/ui/home.png").write_bytes(b"valid-reference-image")
        self.routes = {
            "frontend_roots": ["apps/mobile/app", "apps/mobile/lib"],
            "shared_paths": ["apps/mobile/lib/sync.ts"],
            "screens": [{
                "id": "home",
                "source_paths": ["apps/mobile/app/index.tsx"],
                "screenshot_file": "home.png",
                "manuals": ["product", "user"],
            }],
        }
        self.manifest = {
            "shared_fingerprints": {
                "apps/mobile/lib/sync.ts": git_blob_sha(self.root / "apps/mobile/lib/sync.ts"),
            },
            "screens": {"home": {
                "screenshot_file": "home.png",
                "screenshot_sha256": file_sha256(self.root / "docs/manuals/assets/ui/home.png"),
                "source_fingerprints": {
                    "apps/mobile/app/index.tsx": git_blob_sha(self.root / "apps/mobile/app/index.tsx"),
                },
                "manuals": ["product", "user"],
            }},
        }

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_complete_baseline_is_fresh(self) -> None:
        self.assertTrue(build_plan(self.root, self.routes, self.manifest)["is_fresh"])

    def test_imported_module_change_is_stale(self) -> None:
        (self.root / "apps/mobile/lib/sync.ts").write_text("export const sync = false;\n")
        plan = build_plan(self.root, self.routes, self.manifest)
        self.assertFalse(plan["is_fresh"])
        self.assertEqual(plan["changed_shared_paths"], ["apps/mobile/lib/sync.ts"])

    def test_missing_or_changed_screenshot_is_stale(self) -> None:
        screenshot = self.root / "docs/manuals/assets/ui/home.png"
        screenshot.unlink()
        plan = build_plan(self.root, self.routes, self.manifest)
        self.assertFalse(plan["is_fresh"])
        self.assertEqual(plan["invalid_screenshots"][0]["reason"], "asset_missing")

        screenshot.write_bytes(b"different-image")
        plan = build_plan(self.root, self.routes, self.manifest)
        self.assertEqual(plan["invalid_screenshots"][0]["reason"], "asset_digest_mismatch")

    def test_route_metadata_change_is_stale(self) -> None:
        self.routes["screens"][0]["manuals"] = ["product", "training"]
        plan = build_plan(self.root, self.routes, self.manifest)

        self.assertFalse(plan["is_fresh"])
        self.assertIn(
            "manual_mapping_changed",
            plan["stale_screens"][0]["reasons"],
        )

    def test_removed_source_mapping_is_stale(self) -> None:
        self.routes["screens"][0]["source_paths"] = []
        plan = build_plan(self.root, self.routes, self.manifest)

        self.assertFalse(plan["is_fresh"])
        self.assertIn(
            "source_mapping_changed",
            plan["stale_screens"][0]["reasons"],
        )


if __name__ == "__main__":
    unittest.main()
