#!/usr/bin/env python3
"""Strictly local paired backup/restore; never overwrites a database or Git root."""
import json,os,sys,subprocess,hashlib,datetime,re,secrets
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parent/'projex-presentation'
CLUSTER=ROOT.parent/'presentation-qa-20261023/pgdata'
GIT=ROOT/'git-managed'
SHA='70d0304fa848386f30ef6c01081a50defed2c903'
def run(args,**kw):return subprocess.run(args,check=True,text=True,**kw)
def sql(db,q,role='stage1_qa'):
 return subprocess.check_output(['psql','-h','127.0.0.1','-p','55490','-U',role,'-d',db,'-v','ON_ERROR_STOP=1','-Atc',q],text=True).strip()
def attest():
 assert sql('postgres','SHOW data_directory')==str(CLUSTER)
 assert sql('projex_presentation','SELECT current_database(),current_user,inet_server_port()','presentation_local')=='projex_presentation|presentation_local|55490'
 assert subprocess.check_output(['git','-C',str(REPO),'rev-parse','HEAD'],text=True).strip()==SHA
 assert not GIT.is_symlink() and GIT.is_dir()
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def inventory(db):
 tables=['users','classes','programming_activities','project_tasks','activity_submissions','repositories']
 return {t:int(sql(db,'SELECT count(*) FROM '+t)) for t in tables}
def idle():
 for table in ['execution_jobs','repository_provisioning_jobs','repository_checkpoint_jobs','group_browser_ref_jobs','group_browser_commit_jobs']:
  assert sql('projex_presentation',"SELECT count(*) FROM "+table+" WHERE status::text IN ('QUEUED','PENDING','RUNNING')")=='0',table+' is not idle'
 for d in ['staging','transport/requests']:
  p=GIT/d
  assert not p.exists() or not any(p.iterdir()),'Nonempty transient Git storage'
def backup():
 attest();idle()
 run(['python3',str(ROOT/'scripts/manage.py'),'stop'])
 idle()
 target=ROOT/'backups'/('ready-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
 target.mkdir(mode=0o700)
 # No application writer/worker remains; PostgreSQL stays online for unrelated Stage 1 resources.
 run(['pg_dump','-h','127.0.0.1','-p','55490','-U','presentation_local','-d','projex_presentation','-Fc','--no-owner','--no-acl','-f',str(target/'database.dump')])
 run(['/usr/bin/tar','-cf',str(target/'git-storage.tar'),'-C',str(GIT),'.'])
 manifest={'version':1,'source':SHA,'database':'projex_presentation','databaseOwner':'presentation_local','port':55490,'cluster':str(CLUSTER),'gitRoot':str(GIT),'counts':inventory('projex_presentation'),'migrations':sql('projex_presentation','SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name').splitlines(),'files':{name:digest(target/name) for name in ['database.dump','git-storage.tar']},'quiescent':True}
 (target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 (target/'manifest.sha256').write_text(digest(target/'manifest.json')+'  manifest.json\n')
 (ROOT/'private/latest-backup.txt').write_text(str(target)+'\n')
 for p in target.iterdir():p.chmod(0o600)
 print('Paired quiescent backup completed: '+str(target))
 run(['python3',str(ROOT/'scripts/manage.py'),'start'])
def restore(label,backup_name=None):
 attest();assert re.fullmatch(r'[a-z][a-z0-9_]{2,24}',label),'Use a short lowercase restore label'
 if backup_name: assert re.fullmatch(r'ready-[0-9]{8}T[0-9]{6}Z',backup_name),'Invalid backup name'
 source=(ROOT/'backups'/backup_name if backup_name else Path((ROOT/'private/latest-backup.txt').read_text().strip())).resolve();assert source.parent==ROOT/'backups' and not source.is_symlink()
 manifest=json.loads((source/'manifest.json').read_text());assert digest(source/'manifest.json')==(source/'manifest.sha256').read_text().split()[0]
 assert manifest['source']==SHA and manifest['database']=='projex_presentation' and manifest['quiescent']
 for name,h in manifest['files'].items():assert name in ['database.dump','git-storage.tar'] and digest(source/name)==h
 db='projex_restore_verify_'+label
 assert sql('postgres',"SELECT count(*) FROM pg_database WHERE datname='"+db+"'")=='0','Restore destination exists; choose a NEW label. Nothing was overwritten.'
 target=ROOT/'restore-tests'/label;assert not target.exists(),'Restore files already exist'
 target.mkdir(mode=0o700);(target/'git-managed').mkdir(mode=0o700)
 run(['createdb','-h','127.0.0.1','-p','55490','-U','stage1_qa','-O','presentation_local',db])
 assert sql(db,'SELECT current_database(),current_user,inet_server_port()','presentation_local')==db+'|presentation_local|55490'
 assert sql(db,"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'",'presentation_local')=='0'
 run(['pg_restore','-h','127.0.0.1','-p','55490','-U','presentation_local','-d',db,'--no-owner','--no-acl','--exit-on-error',str(source/'database.dump')],stdout=subprocess.DEVNULL)
 members=subprocess.check_output(['/usr/bin/tar','-tf',str(source/'git-storage.tar')],text=True).splitlines()
 assert all(not Path(n).is_absolute() and '..' not in Path(n).parts for n in members)
 run(['/usr/bin/tar','-xf',str(source/'git-storage.tar'),'-C',str(target/'git-managed')])
 assert inventory(db)==manifest['counts']
 assert sql(db,'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name').splitlines()==manifest['migrations']
 assert len(manifest['migrations'])==28
 refs={}
 for p in (target/'git-managed/repositories').rglob('*.git'):
  assert not p.is_symlink();run(['/opt/homebrew/bin/git','-C',str(p),'fsck','--full'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  rel=p.relative_to(target/'git-managed')
  assert (p/'projex-repository.json').read_bytes()==(GIT/rel/'projex-repository.json').read_bytes()
  actual=subprocess.check_output(['/opt/homebrew/bin/git','-C',str(p),'show-ref'],text=True)
  refs[str(rel)]=actual
 result={'passed':True,'database':db,'directory':str(target),'backup':str(source),'counts':inventory(db),'migrations':28,'gitRefs':refs}
 (target/'restore-evidence.json').write_text(json.dumps(result,indent=2)+'\n')
 # Each restore gets its own guarded controller and private environment. Nothing auto-starts.
 for name in ['scripts','private','logs','java-jobs','mail-preview']:(target/name).mkdir(mode=0o700,exist_ok=True)
 controller=(ROOT/'scripts/manage.py').read_text().replace("REPO = QA.parent / 'projex-presentation'", "REPO = Path("+repr(str(REPO))+")").replace("CLUSTER = QA.parent / 'presentation-qa-20261023/pgdata'", "CLUSTER = Path("+repr(str(CLUSTER))+")").replace('projex_presentation',db)
 (target/'scripts/manage.py').write_text(controller)
 env={}
 for line in (ROOT/'private/server.env').read_text().splitlines():
  if line and not line.startswith('#'):key,value=line.split('=',1);env[key]=value
 env.update({'DATABASE_URL':'postgresql://presentation_local@127.0.0.1:55490/'+db+'?schema=public','GIT_STORAGE_ROOT':str(target/'git-managed'),'JAVA_JOB_ROOT':str(target/'java-jobs'),'MAIL_PREVIEW_DIR':str(target/'mail-preview'),'ACCESS_TOKEN_SECRET':secrets.token_urlsafe(48)})
 private=target/'private/server.env';private.write_text('\n'.join(k+'='+v for k,v in env.items())+'\n');private.chmod(0o600)

 print('Restored and verified separate database and Git files: '+db+' / '+str(target))
if __name__=='__main__':
 assert '--execute' in sys.argv,'Explicit --execute required'
 if sys.argv[1]=='backup':backup()
 elif sys.argv[1]=='restore':restore(sys.argv[2],sys.argv[sys.argv.index('--backup')+1] if '--backup' in sys.argv else None)
 else:raise SystemExit('Usage: presentation-ops.py backup --execute | restore NEW_LABEL --execute')
