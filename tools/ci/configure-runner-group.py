#!/usr/bin/env python3
"""Configure only the dedicated iRespond runner group; never change other groups."""
import json
import pathlib
import subprocess
import tempfile


def api(path, *args):
    output = subprocess.check_output(["gh", "api", path, *args], text=True)
    return json.loads(output) if output.strip() else None


name = "irespond-mac-isolated-20261102"
repository = api("repos/Atlasfsp/iRespond")
groups = api("orgs/Atlasfsp/actions/runner-groups")["runner_groups"]
existing = [group for group in groups if group["name"] == name]
assert len(existing) <= 1, "ambiguous dedicated runner group"
refs = ["refs/heads/main", "refs/heads/feat/impact-experience-evolution-20261101"]
workflows = sorted(p.name for p in pathlib.Path(".github/workflows").glob("*.yml") if p.name != "mac-runner-smoke.yml")
payload = {
    "name": name,
    "visibility": "selected",
    "selected_repository_ids": [repository["id"]],
    "allows_public_repositories": True,
    "restricted_to_workflows": True,
    "selected_workflows": [f"Atlasfsp/iRespond/.github/workflows/{workflow}@{ref}" for workflow in workflows for ref in refs],
}
endpoint = "orgs/Atlasfsp/actions/runner-groups"
method = "POST"
if existing:
    group_id = existing[0]["id"]
    selected = api(f"{endpoint}/{group_id}/repositories")["repositories"]
    assert all(repo["id"] == repository["id"] for repo in selected), "group has unrelated repositories; refuse mutation"
    endpoint += f"/{group_id}"
    method = "PATCH"
    # Repository access is assigned explicitly after creation or update below.
    payload.pop("selected_repository_ids")
with tempfile.NamedTemporaryFile(mode="w", suffix=".json") as stream:
    json.dump(payload, stream)
    stream.flush()
    result = api(endpoint, "--method", method, "--input", stream.name)
assert result["restricted_to_workflows"] and result["visibility"] == "selected"
assert result["allows_public_repositories"]
repository_endpoint = f"orgs/Atlasfsp/actions/runner-groups/{result['id']}/repositories"
with tempfile.NamedTemporaryFile(mode="w", suffix=".json") as stream:
    json.dump({"selected_repository_ids": [repository["id"]]}, stream)
    stream.flush()
    api(repository_endpoint, "--method", "PUT", "--input", stream.name)
selected = api(repository_endpoint)["repositories"]
assert [repo["id"] for repo in selected] == [repository["id"]], "effective repository selection was not restored"
print(json.dumps({key: result[key] for key in ("id", "name", "visibility", "restricted_to_workflows")}, indent=2))
