#!/usr/bin/env python3
"""Control only the isolated Stage 2 presentation processes; never migrate, seed or reset."""
import json, os, signal, subprocess, sys, time, urllib.request
from pathlib import Path
QA = Path(__file__).resolve().parents[1]
REPO = QA.parent / 'projex-presentation'
CLUSTER = QA.parent / 'presentation-qa-20261023/pgdata'
PIDFILE = QA / 'private/pids.json'
NODE = '/opt/homebrew/bin/node'
SHA = '70d0304fa848386f30ef6c01081a50defed2c903'
ROLES = {
 'api': (REPO/'server', [NODE, 'dist/server.js']),
 'java-worker': (REPO/'server', [NODE, 'dist/worker.js']),
 'git-worker': (REPO/'server', [NODE, 'dist/git-worker.js']),
 'frontend': (REPO/'client', [NODE, 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5196', '--strictPort']),
}
def run(args, **kwargs): return subprocess.run(args, check=True, text=True, **kwargs)
def owned(role, pid):
 try:
  cwd = subprocess.check_output(['/usr/sbin/lsof','-a','-p',str(pid),'-d','cwd','-Fn'],text=True)
  command = subprocess.check_output(['ps','-p',str(pid),'-o','command='],text=True)
  return '\nn'+str(ROLES[role][0])+'\n' in '\n'+cwd and ROLES[role][1][1] in command
 except subprocess.CalledProcessError: return False

def identity():
 raw = subprocess.check_output(['psql','-h','127.0.0.1','-p','55490','-U','presentation_local','-d','projex_presentation','-Atc',
  "SELECT current_database(),current_user,inet_server_port(); SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;"],text=True).splitlines()
 assert raw == ['projex_presentation|presentation_local|55490','28'], 'Unexpected QA database identity/migration state'
 assert subprocess.check_output(['psql','-h','127.0.0.1','-p','55490','-U','stage1_qa','-d','postgres','-Atc','SHOW data_directory'],text=True).strip()==str(CLUSTER)
 return raw

def health():
 identity()
 with urllib.request.urlopen('http://localhost:3022/api/v1/health',timeout=5) as response:
  assert response.status == 200
  result = json.load(response)
 with urllib.request.urlopen('http://localhost:5196/',timeout=5) as response: assert response.status == 200
 pids=json.loads(PIDFILE.read_text())
 assert all(owned(role,pid) for role,pid in pids.items()) and len(pids)==4, 'A QA process is unavailable'
 return result

def start():
 assert subprocess.check_output(['git','-C',str(REPO),'rev-parse','HEAD'],text=True).strip()==SHA, 'Review a changed source SHA before starting'
 assert not subprocess.check_output(['git','-C',str(REPO),'status','--porcelain'],text=True).strip(), 'Tracked/untracked source changes require review'
 if PIDFILE.exists():
  existing=json.loads(PIDFILE.read_text())
  if any(owned(role,pid) for role,pid in existing.items()):
   print(json.dumps({'alreadyRunning':True,'health':health()})); return
 for port in [3022,5196]:
  result=subprocess.run(['/usr/sbin/lsof','-t',f'-iTCP:{port}','-sTCP:LISTEN'],capture_output=True,text=True)
  assert not result.stdout.strip(), f'Port {port} is occupied; no process was replaced'
 if subprocess.run(['pg_ctl','-D',str(CLUSTER),'status'],stdout=subprocess.DEVNULL).returncode:
  raise RuntimeError('Shared verified QA cluster is stopped; start it with the Stage 1 procedure, then retry')
 identity()
 for name in ['git-managed','java-jobs','mail-preview']:
  target=QA/name
  assert not target.is_symlink(), 'QA storage root must not be a symlink'
  target.mkdir(mode=0o700,exist_ok=True)
 env=os.environ.copy()
 for line in (QA/'private/server.env').read_text().splitlines():
  if line and not line.startswith('#'):
   key,value=line.split('=',1);env[key]=value
 env.pop('TEST_DATABASE_URL',None)
 env['NODE_ENV']='development'
 pids={}
 for role,(cwd,args) in ROLES.items():
  role_env=env
  if role=='frontend':
   role_env={key:value for key,value in os.environ.items() if key in ['PATH','HOME','TMPDIR','LANG','LC_ALL','SystemRoot']}
   role_env.update({'NODE_ENV':'development','VITE_API_BASE_URL':'http://localhost:3022/api/v1'})
  with (QA/f'logs/{role}.log').open('ab') as log:
   child=subprocess.Popen(args,cwd=cwd,env=role_env,stdin=subprocess.DEVNULL,stdout=log,stderr=subprocess.STDOUT,start_new_session=True)
  pids[role]=child.pid
 PIDFILE.write_text(json.dumps(pids,indent=2)+'\n');PIDFILE.chmod(0o600)
 for _ in range(60):
  try: result=health(); break
  except Exception: time.sleep(.25)
 else: raise RuntimeError('QA startup failed; inspect private role logs, then run stop')
 print(json.dumps({'started':True,'source':SHA,'health':result}))

def stop():
 pids=json.loads(PIDFILE.read_text()) if PIDFILE.exists() else {}
 for role in ['frontend','api','git-worker','java-worker']:
  pid=pids.get(role)
  if pid and owned(role,pid): os.kill(pid,signal.SIGTERM)
 for _ in range(100):
  if not any(owned(role,pid) for role,pid in pids.items()): break
  time.sleep(.2)
 else: raise RuntimeError('A QA process is still shutting down; database left running, no force kill')
 print('Only presentation services stopped; shared PostgreSQL and Stage 1 services retained.')

if __name__=='__main__':
 action=sys.argv[1] if len(sys.argv)>1 else 'status'
 if action=='start': start()
 elif action=='stop': stop()
 elif action=='status': print(json.dumps({'source':SHA,'health':health()}))
 else: raise SystemExit('Usage: manage.py start|stop|status')
