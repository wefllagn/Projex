#!/usr/bin/env python3
"""Stage a trusted locally built artifact into a NEW SHA directory; never overwrite."""
import hashlib,json,os,platform,re,subprocess,sys,tarfile
from pathlib import Path
if len(sys.argv)!=4: raise SystemExit('Usage: sudo stage-release.py ARTIFACT EXPECTED_SHA256 FULL_COMMIT')
artifact=Path(sys.argv[1]).resolve(); checksum=sys.argv[2]; commit=sys.argv[3]
if platform.system()!='Linux' or os.geteuid()!=0: raise SystemExit('Ubuntu root operator required; nothing changed')
if not re.fullmatch('[a-f0-9]{40}',commit) or not re.fullmatch('[a-f0-9]{64}',checksum): raise SystemExit('Exact commit and checksum required')
h=hashlib.sha256()
with artifact.open('rb') as f:
    for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
if h.hexdigest()!=checksum: raise SystemExit('Artifact checksum mismatch')
root=Path('/opt/origin/releases');target=root/commit
if not root.is_dir() or root.is_symlink() or target.exists(): raise SystemExit('Expected dedicated release root and a new, unused target')
with tarfile.open(artifact) as tar:
    for item in tar:
        if item.name.startswith('/') or '..' in Path(item.name).parts or item.isdev() or item.isfifo(): raise SystemExit('Unsafe archive path/type')
    # Python data filter rejects links escaping the destination. Internal node_modules links are retained.
    target.mkdir(mode=0o755);tar.extractall(target,filter='data')
m=json.loads((target/'release.json').read_text())
node_arch=subprocess.check_output(['/usr/local/bin/node','-p','process.arch'],text=True).strip()
node_major=subprocess.check_output(['/usr/local/bin/node','-p','process.versions.node.split(".")[0]'],text=True).strip()
if m['commit']!=commit or m['platform']!='linux' or m['arch']!=node_arch or m['nodeMajor']!=24 or node_major!='24': raise SystemExit('Artifact platform/identity mismatch; staged files retained, not activated')
subprocess.run(['/usr/bin/sha256sum','--check','--quiet','SHA256SUMS'],cwd=target,check=True)
# Root-owned code; service identities have no write access. Preserve executable and internal link modes.
for folder,dirs,files in os.walk(target):
    Path(folder).chmod(0o755)
    for name in files:
        p=Path(folder)/name
        if not p.is_symlink():p.chmod(0o755 if p.stat().st_mode&0o111 else 0o644)
print('Staged and checksum-verified, not activated:',target)
