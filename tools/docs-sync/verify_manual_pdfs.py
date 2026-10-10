#!/usr/bin/env python3
from __future__ import annotations
import argparse, re, subprocess, sys
from pathlib import Path

EXPECTED={
  'iRespond_Product_Documentation.pdf':100,
  'iRespond_Technical_Documentation.pdf':100,
  'iRespond_User_Manual_All_Roles.pdf':100,
  'iRespond_Training_Manual_All_Roles.pdf':100,
}

def pages(path: Path) -> int:
    out=subprocess.check_output(['pdfinfo',str(path)],text=True,stderr=subprocess.STDOUT)
    m=re.search(r'^Pages:\s+(\d+)',out,re.M)
    if not m: raise RuntimeError(f'Cannot read page count for {path}')
    return int(m.group(1))

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--dir',default='docs/manuals/generated'); a=ap.parse_args(); root=Path(a.dir)
    failed=False
    for name,minimum in EXPECTED.items():
        p=root/name
        if not p.exists(): print(f'MISSING {p}',file=sys.stderr); failed=True; continue
        n=pages(p); print(f'{name}: {n} pages (minimum {minimum})')
        if n<minimum: failed=True
    return 1 if failed else 0
if __name__=='__main__': raise SystemExit(main())
