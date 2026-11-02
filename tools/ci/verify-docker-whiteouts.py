#!/usr/bin/env python3
"""Exercise opaque-directory whiteouts before a large YugabyteDB image download."""
import hashlib
import io
import json
import pathlib
import subprocess
import tarfile
import tempfile


def layer(entries):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode="w") as archive:
        for name, data in entries.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            info.mode = 0o644
            archive.addfile(info, io.BytesIO(data))
    return stream.getvalue()


layers = [layer({"home/yugabyte/old": b"old"}), layer({"home/yugabyte/.wh..wh..opq": b"", "home/yugabyte/new": b"new"})]
config = json.dumps({"architecture": "arm64", "os": "linux", "rootfs": {"type": "layers", "diff_ids": ["sha256:" + hashlib.sha256(data).hexdigest() for data in layers]}, "history": [{"created_by": "whiteout probe"} for _ in layers]}).encode()
image = "irespond-whiteout-probe:local"
container = "irespond-whiteout-probe"
try:
    with tempfile.TemporaryDirectory(prefix="irespond-whiteout-") as temporary:
        path = pathlib.Path(temporary) / "image.tar"
        files = {"config.json": config, "manifest.json": json.dumps([{"Config": "config.json", "RepoTags": [image], "Layers": [f"{index}/layer.tar" for index in range(len(layers))]}]).encode()}
        files.update({f"{index}/layer.tar": data for index, data in enumerate(layers)})
        with tarfile.open(path, "w") as archive:
            for name, data in files.items():
                info = tarfile.TarInfo(name)
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
        subprocess.run(["docker", "load", "-i", str(path)], check=True)
        subprocess.run(["docker", "create", "--name", container, image, "/bin/true"], check=True, stdout=subprocess.DEVNULL)
        exported = subprocess.check_output(["docker", "export", container])
        with tarfile.open(fileobj=io.BytesIO(exported)) as archive:
            names = {member.name.lstrip("./") for member in archive}
        assert "home/yugabyte/new" in names and "home/yugabyte/old" not in names, names
        print("Docker opaque whiteout extraction: PASS")
finally:
    subprocess.run(["docker", "rm", "-f", container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(["docker", "image", "rm", image], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
