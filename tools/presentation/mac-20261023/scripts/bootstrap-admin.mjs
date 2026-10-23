import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createPrismaClient} from '../../projex-presentation/server/dist/infrastructure/database/prisma.js';
import {createPasswordService} from '../../projex-presentation/server/dist/modules/auth/auth.password.js';
assert(process.argv.includes('--execute'),'Explicit --execute is required');
const db=createPrismaClient('postgresql://presentation_local@127.0.0.1:55490/projex_presentation');
const [i]=await db.$queryRaw`SELECT current_database() AS name,current_user AS actor,inet_server_port() AS port`;
assert.equal(i.name,'projex_presentation');assert.equal(i.actor,'presentation_local');assert.equal(i.port,55490);
const file=new URL('../private/accounts.json',import.meta.url);const users=JSON.parse(await readFile(file,'utf8'));
const current=await db.user.findUnique({where:{email:users.admin.email}});
if(!current){assert.equal(await db.user.count(),0);const service=createPasswordService();service.assertPolicy(users.admin.password);const u=await db.user.create({data:{fullName:users.admin.fullName,email:users.admin.email,passwordHash:await service.hash(users.admin.password),passwordChangedAt:new Date(),role:'ADMIN',status:'ACTIVE'}});users.admin.id=u.id;}
else{assert.equal(current.role,'ADMIN');assert.equal(current.fullName,users.admin.fullName);users.admin.id=current.id;}
await writeFile(file,JSON.stringify(users,null,2)+'\n',{mode:0o600});await db.$disconnect();console.log('Presentation Admin bootstrap verified. Other identities will use Admin provisioning and account setup.');
