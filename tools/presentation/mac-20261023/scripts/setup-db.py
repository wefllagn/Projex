#!/usr/bin/env python3
import subprocess,json,os,sys
from pathlib import Path
assert '--execute' in sys.argv, 'Explicit --execute is required'
root=Path(__file__).resolve().parents[1]; repo=root.parent/'projex-presentation'; cluster=root.parent/'presentation-qa-20261023/pgdata'
def sql(db,query,role='stage1_qa'):
 return subprocess.check_output(['psql','-h','127.0.0.1','-p','55490','-U',role,'-d',db,'-v','ON_ERROR_STOP=1','-Atc',query],text=True).strip()
assert sql('postgres','SHOW data_directory')==str(cluster)
assert subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()=='70d0304fa848386f30ef6c01081a50defed2c903'
assert not subprocess.check_output(['git','-C',str(repo),'status','--porcelain'],text=True).strip()
marker=root/'private/database-identity.json'
exists=sql('postgres',"SELECT count(*) FROM pg_database WHERE datname='projex_presentation'")=='1'
if exists: assert marker.exists(), 'Refusing unregistered existing presentation database'
else:
 assert sql('postgres',"SELECT count(*) FROM pg_roles WHERE rolname='presentation_local'")=='0', 'Refusing existing unregistered role'
 sql('postgres','CREATE ROLE presentation_local LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE')
 subprocess.run(['createdb','-h','127.0.0.1','-p','55490','-U','stage1_qa','-O','presentation_local','projex_presentation'],check=True)
 assert sql('projex_presentation',"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'",'presentation_local')=='0'
 marker.write_text(json.dumps({'database':'projex_presentation','role':'presentation_local','port':55490,'cluster':str(cluster)},indent=2)+'\n');marker.chmod(0o600)
assert sql('projex_presentation','SELECT current_database(),current_user,inet_server_port()','presentation_local')=='projex_presentation|presentation_local|55490'
assert sql('postgres',"SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname='projex_presentation'")=='presentation_local'
env=os.environ.copy()
for line in (root/'private/server.env').read_text().splitlines():
 if line and not line.startswith('#'):k,v=line.split('=',1);env[k]=v
with (root/'logs/migrations.log').open('w') as log:
 subprocess.run(['/opt/homebrew/bin/node','node_modules/prisma/build/index.js','migrate','deploy'],cwd=repo/'server',env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
assert sql('projex_presentation','SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL','presentation_local')=='28'
print('Verified new presentation database, dedicated role and complete 28-migration chain. Stage 1 preserved.')
