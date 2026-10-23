#!/usr/bin/env python3
"""Manual Ubuntu pilot operator. No cloud access, provisioning, deletes or schema rollback.
Fixed target paths and connected identity checks precede every database write.
"""
import argparse, datetime, hashlib, json, os, platform, re, stat, subprocess, sys, tarfile
from pathlib import Path
from urllib.parse import urlparse, unquote
BASE=Path('/opt/origin'); STATE=Path('/var/lib/origin'); JAVA=Path('/var/lib/origin-java/jobs')
ENV=Path('/etc/origin/pilot.env'); BACKUPS=Path('/var/backups/origin')
UNITS=['origin-api','origin-git','origin-java']
def need(value,message):
    if not value: raise RuntimeError(message)
def run(args,**kw): return subprocess.run([str(a) for a in args],check=True,text=True,**kw)
def output(args,**kw): return run(args,stdout=subprocess.PIPE,**kw).stdout.strip()
def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()
def read_config():
    need(ENV.is_file() and not ENV.is_symlink(),'Missing ordinary /etc/origin/pilot.env')
    s=ENV.stat(); need(s.st_uid==0 and stat.S_IMODE(s.st_mode)==0o600,'Environment must be root-owned 0600')
    root=(BASE/'current').resolve()
    code="process.stdout.write(JSON.stringify(require('dotenv').parse(require('fs').readFileSync(process.argv[1]))))"
    cfg=json.loads(output(['/usr/local/bin/node','-e',code,ENV],cwd=root/'server'))
    need(cfg.get('NODE_ENV')=='production' and cfg.get('HOST')=='127.0.0.1' and cfg.get('PORT')=='3000','Unexpected runtime target')
    need(cfg.get('GIT_STORAGE_ROOT')==str(STATE/'git') and cfg.get('JAVA_JOB_ROOT')==str(JAVA),'Unexpected storage target')
    need(cfg.get('JAVA_EXECUTION_MODE')=='container' and cfg.get('GIT_EXECUTION_MODE')=='service_isolated','Isolated execution required')
    need(not any('REPLACE_WITH' in v for v in cfg.values()),'Replace all environment placeholders first')
    return cfg
def pg_env(cfg,database=None):
    u=urlparse(cfg['DATABASE_URL']); db=unquote(u.path[1:])
    need(u.scheme in ['postgres','postgresql'] and u.hostname=='127.0.0.1' and (u.port or 5432)==5432 and unquote(u.username or '')=='origin_pilot','Unexpected database role/server')
    need(db=='origin_pilot' or re.fullmatch(r'origin_restore_[0-9]{14}',db),'Unrecognized active database name')
    env=os.environ.copy(); env.update(PGHOST='127.0.0.1',PGPORT='5432',PGUSER='origin_pilot',PGDATABASE=database or db,PGPASSWORD=unquote(u.password or ''))
    return env
def sql(env,q): return output(['/usr/bin/psql','-X','-v','ON_ERROR_STOP=1','-Atc',q],env=env)
def identity(env):
    need(sql(env,'SELECT current_database(),current_user,inet_server_addr(),inet_server_port()')==f"{env['PGDATABASE']}|origin_pilot|127.0.0.1|5432",'Connected database identity mismatch')
def active(unit): return subprocess.run(['systemctl','is-active','--quiet',unit]).returncode==0
def stop():
    was=[u for u in UNITS if active(u)]
    run(['systemctl','stop',*UNITS]); need(not any(active(u) for u in UNITS),'Origin services did not stop; no backup/migration attempted')
    return was
def start(units):
    if units: run(['systemctl','start',*units])
def release():
    p=(BASE/'current').resolve(); need(p.parent==BASE/'releases' and re.fullmatch('[a-f0-9]{40}',p.name),'Unexpected release path')
    manifest=json.loads((p/'release.json').read_text()); need(manifest['commit']==p.name,'Release identity mismatch'); return p,manifest
def inventory(env):
    tables=sql(env,"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").splitlines()
    return {t:int(sql(env,'SELECT count(*) FROM "'+t.replace('"','""')+'"')) for t in tables}
def fingerprints(env):
    # Pilot-size tables; hash every row in deterministic order without printing academic data.
    tables=sql(env,"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").splitlines()
    result={}
    for table in tables:
        quoted='"'+table.replace('"','""')+'"'
        query="SELECT md5(COALESCE(string_agg(row_to_json(t)::text, chr(10) ORDER BY row_to_json(t)::text),'')) FROM "+quoted+' t'
        result[table]=sql(env,query)
    return result
def quiet(env):
    for table,field in [('execution_jobs','status'),('repository_provisioning_jobs','status'),('repository_checkpoint_jobs','status'),('group_browser_ref_jobs','status'),('group_browser_commit_jobs','status')]:
        need(sql(env,f"SELECT count(*) FROM {table} WHERE {field}='RUNNING'")=='0','A job is still running; let it finish or use documented recovery, never edit its status manually')
    need(sql(env,"SELECT count(*) FROM repositories WHERE storage_status='PROVISIONING'")=='0','Repository provisioning not quiescent')
    for child in ['staging','transport/requests']:
        p=STATE/'git'/child; need(not p.exists() or not any(p.iterdir()),'Git transitional storage requires recovery before backup')
def tree_safe(root):
    need(root.is_dir() and not root.is_symlink(),'Storage root must be an ordinary directory')
    for folder,dirs,files in os.walk(root):
        for name in dirs+files:
            p=Path(folder)/name; need(not p.is_symlink() and (p.is_dir() or p.is_file()),'Storage links/special entries rejected')
def backup(cfg):
    env=pg_env(cfg); identity(env); current,manifest=release(); was=stop()
    target=BACKUPS/('backup-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S'))
    try:
        quiet(env); tree_safe(STATE/'git'); need(BACKUPS.is_dir() and not BACKUPS.is_symlink(),'Unexpected backup root'); target.mkdir(mode=0o700)
        run(['/usr/bin/pg_dump','--format=custom','--no-owner','--no-acl','--file',target/'database.dump'],env=env)
        run(['/usr/bin/tar','-cf',target/'git-storage.tar','--directory',STATE/'git','.'])
        # Configuration contains secrets and is kept root-only with the matching data pair.
        (target/'pilot.env').write_bytes(ENV.read_bytes()); (target/'pilot.env').chmod(0o600)
        data={'version':1,'commit':manifest['commit'],'database':env['PGDATABASE'],'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'counts':inventory(env),'fingerprints':fingerprints(env),'migrations':sql(env,"SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name").splitlines(),'files':{n:digest(target/n) for n in ['database.dump','git-storage.tar','pilot.env']}}
        (target/'manifest.json').write_text(json.dumps(data,indent=2)+'\n'); (target/'manifest.sha256').write_text(digest(target/'manifest.json')+'\n')
        print('Paired root-only backup completed:',target); return target
    finally: start(was)
def checked_backup(path):
    raw=Path(path); need(not raw.is_symlink(),'Backup links rejected'); p=raw.resolve(); need(p.parent==BACKUPS and p.is_dir(),'Backup must be an Origin backup directory')
    need(digest(p/'manifest.json')==(p/'manifest.sha256').read_text().strip(),'Backup manifest checksum mismatch')
    m=json.loads((p/'manifest.json').read_text()); need(m['version']==1,'Unknown backup version')
    for name in ['database.dump','git-storage.tar','pilot.env']:
        need((p/name).is_file() and not (p/name).is_symlink(),'Backup links/special files rejected')
        need(digest(p/name)==m['files'][name],'Backup artifact checksum mismatch')
    return p,m
def migrate(cfg,receipt):
    env=pg_env(cfg); identity(env); current,m=release()
    count=int(sql(env,"SELECT count(*) FROM pg_tables WHERE schemaname='public'"))
    if count:
        need(receipt,'Existing database requires a fresh matched backup; pass --backup DIRECTORY')
        _,saved=checked_backup(receipt); need(saved['database']==env['PGDATABASE'] and saved['counts']==inventory(env) and saved['fingerprints']==fingerprints(env),'Backup does not match current stopped database')
    run(['/usr/local/bin/node','node_modules/prisma/build/index.js','migrate','deploy'],cwd=current/'server',env={**os.environ,**cfg})
    run(['/usr/local/bin/node','node_modules/prisma/build/index.js','migrate','status'],cwd=current/'server',env={**os.environ,**cfg})
def restore(cfg,path):
    source,m=checked_backup(path); env=pg_env(cfg); identity(env)
    name='origin_restore_'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
    need(sql(env,f"SELECT count(*) FROM pg_database WHERE datname='{name}'")=='0','Fresh restore target already exists')
    parent=STATE/'restores'; need(not parent.is_symlink(),'Restore parent links rejected'); parent.mkdir(mode=0o700,exist_ok=True)
    root=parent/name; root.mkdir(mode=0o700,exist_ok=False)
    run(['/usr/sbin/runuser','-u','postgres','--','/usr/bin/createdb','--owner=origin_pilot',name])
    target=pg_env(cfg,name); identity(target)
    need(sql(target,"SELECT count(*) FROM pg_tables WHERE schemaname='public'")=='0','Restore target not empty')
    run(['/usr/bin/pg_restore','--exit-on-error','--single-transaction','--no-owner','--no-acl','--dbname',name,source/'database.dump'],env=target)
    with tarfile.open(source/'git-storage.tar') as archive:
        for member in archive:
            need(not member.name.startswith('/') and '..' not in Path(member.name).parts and (member.isfile() or member.isdir()),'Unsafe Git archive member')
        archive.extractall(root,filter='data')
    need(inventory(target)==m['counts'] and fingerprints(target)==m['fingerprints'],'Restored database counts or row fingerprints differ')
    for repo in root.rglob('*.git'):
        if (repo/'HEAD').is_file(): run(['/usr/bin/git','-c',f'safe.directory={repo}','--git-dir',repo,'fsck','--full'],stdout=subprocess.DEVNULL)
    run(['/usr/bin/chown','-R','origin:origin',root]); root.chmod(0o700)
    print('Restore drill verified in a NEW database and Git directory; active configuration unchanged:',name,root)
    print('Recovery cutover requires the paired configuration steps in the guide. Never mix a restored database with current Git storage.')
def activate(sha):
    need(re.fullmatch('[a-f0-9]{40}',sha),'Full release SHA required'); target=BASE/'releases'/sha
    need(target.is_dir() and not target.is_symlink(),'Stage the exact release first')
    m=json.loads((target/'release.json').read_text()); need(m['commit']==sha and m['platform']=='linux' and m['nodeMajor']==24,'Wrong artifact platform/identity')
    run(['/usr/bin/sha256sum','--check','--quiet','SHA256SUMS'],cwd=target)
    temp=BASE/'next'; need(not temp.exists() and not temp.is_symlink(),'Unexpected /opt/origin/next retained; inspect manually')
    temp.symlink_to(target); temp.replace(BASE/'current'); print('Activated source only:',sha,'Services remain stopped. Run migration/preflights before start.')
def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('action',choices=['status','backup','migrate','activate','restore']);p.add_argument('--commit');p.add_argument('--backup');p.add_argument('--confirm');a=p.parse_args()
    need(platform.system()=='Linux' and os.geteuid()==0,'Ubuntu root operator required; nothing changed')
    need(BASE.is_dir() and not BASE.is_symlink() and STATE.is_dir() and not STATE.is_symlink(),'Prepare dedicated Origin paths first')
    if a.action=='activate':
        need(a.confirm=='SWITCH_ORIGIN_RELEASE','Use --confirm SWITCH_ORIGIN_RELEASE after reviewing rollback/backup');need(not any(active(u) for u in UNITS),'Stop only Origin units before switching');activate(a.commit or '');return
    cfg=read_config()
    if a.action=='status':
        identity(pg_env(cfg)); print(json.dumps({'release':release()[1]['commit'],'units':{u:active(u) for u in UNITS}}));return
    if a.action=='backup':
        need(a.confirm=='CREATE_PAIRED_BACKUP','Use --confirm CREATE_PAIRED_BACKUP; briefly stops/restarts only Origin units');backup(cfg)
    if a.action=='migrate':
        need(a.confirm=='MIGRATE_ORIGIN_PILOT','Use --confirm MIGRATE_ORIGIN_PILOT after reviewing pending migrations');need(not any(active(u) for u in UNITS),'Stop only Origin units before migrations');migrate(cfg,a.backup)
    if a.action=='restore':
        need(a.confirm=='RESTORE_TO_FRESH_TARGET' and a.backup,'Use --backup DIRECTORY --confirm RESTORE_TO_FRESH_TARGET');restore(cfg,a.backup)
if __name__=='__main__':
    try: main()
    except (RuntimeError,subprocess.CalledProcessError,KeyError,ValueError,OSError) as e:
        # Child tools can show schema diagnostics; no URLs/passwords are included in arguments.
        print('BLOCKED:',str(e) if isinstance(e,RuntimeError) else type(e).__name__,file=sys.stderr);sys.exit(1)
