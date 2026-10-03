import {neon} from '@neondatabase/serverless';
import {put} from '@vercel/blob';
import {createHash,randomUUID} from 'node:crypto';
import {equal,token,valid,artwork} from '../lib/security.js';
import {seed} from '../lib/seed.js';
const cookie=(value,age=28800)=>`artist_session=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const send=(code,data)=>res.status(code).json(data);
 const action=req.query.action;
 const env=process.env;
 const ready=env.DATABASE_URL&&env.ADMIN_PASSWORD?.length>=16&&env.SESSION_SECRET?.length>=32&&env.SITE_URL;
 if(!ready)return send(503,{error:'The artist dashboard needs its private Vercel settings connected.',setup:true});
 const signed=valid((req.headers.cookie||'').split('; ').find(c=>c.startsWith('artist_session='))?.slice(15)||'',env.SESSION_SECRET,env.ADMIN_PASSWORD);
 if(!['GET','POST'].includes(req.method))return send(405,{error:'Method not allowed'});
 if(req.method==='POST'&&req.headers.origin!==env.SITE_URL.replace(/\/$/,''))return send(403,{error:'Open the dashboard on the configured website address.'});
 try{
 const sql=neon(env.DATABASE_URL);
 if(action==='session'&&req.method==='GET')return send(200,{authenticated:signed,uploadsReady:!!env.BLOB_READ_WRITE_TOKEN});
 if(action==='logout'&&req.method==='POST'){res.setHeader('Set-Cookie',cookie('',0));return send(200,{ok:true})}
 if(action==='login'&&req.method==='POST'){
 const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
 if(typeof b?.password!=='string'||b.password.length>512)return send(400,{error:'Enter your password.'});
 // A global rolling window also covers distributed attempts against the single artist account.
 await sql`CREATE TABLE IF NOT EXISTS artist_login_limits (bucket text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL)`;
 const bucket='artist-'+Math.floor(Date.now()/900000);
 const [limit]=await sql`INSERT INTO artist_login_limits VALUES (${bucket},1,now()+interval '30 minutes') ON CONFLICT (bucket) DO UPDATE SET attempts=artist_login_limits.attempts+1 RETURNING attempts`;
 await sql`DELETE FROM artist_login_limits WHERE expires_at < now()`;
 if(limit.attempts>20)return send(429,{error:'Too many login attempts. Please wait 15 minutes.'});
 if(!equal(b.password,env.ADMIN_PASSWORD))return send(401,{error:'Incorrect password.'});
 res.setHeader('Set-Cookie',cookie(token(env.SESSION_SECRET,env.ADMIN_PASSWORD)));return send(200,{ok:true});
 }
 if(action==='works'&&req.method==='GET'){
 const rows= signed&&req.query.admin==='1'?await sql`SELECT data, revision FROM artworks ORDER BY created_at DESC`:await sql`SELECT data, revision FROM artworks WHERE (data->>'published')::boolean = true ORDER BY created_at DESC`;
 let exclusiveSlug=null;
 try{const [setting]=await sql`SELECT value FROM gallery_settings WHERE key='exclusive'`;exclusiveSlug=setting?.value||null}catch(e){if(e.code!=='42P01')throw e}
 const works=rows.map(r=>({...r.data,revision:r.revision,exclusive:r.data.slug===exclusiveSlug}));
 works.sort((a,b)=>Number(b.exclusive)-Number(a.exclusive));
 return send(200,{works});
 }
 if(!signed)return send(401,{error:'Please sign in to the artist dashboard.'});
 if(req.method!=='POST')return send(405,{error:'Method not allowed'});
 let b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
 if(action==='initialize'){
 await sql`CREATE TABLE IF NOT EXISTS artworks (slug text PRIMARY KEY,data jsonb NOT NULL,revision integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now())`;
 for(const w of seed)await sql`INSERT INTO artworks (slug,data) VALUES (${w.slug},${JSON.stringify(w)}::jsonb) ON CONFLICT (slug) DO NOTHING`;
 return send(200,{ok:true});
 }
 if(action==='exclusive'){
 if(b.slug!==null&&(typeof b.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug)||b.slug.length>80))return send(400,{error:'Choose a valid painting.'});
 await sql`CREATE TABLE IF NOT EXISTS gallery_settings (key text PRIMARY KEY,value text)`;
 if(b.slug===null){await sql`INSERT INTO gallery_settings (key,value) VALUES ('exclusive',NULL) ON CONFLICT (key) DO UPDATE SET value=NULL`;return send(200,{ok:true})}
 const result=await sql`INSERT INTO gallery_settings (key,value) SELECT 'exclusive',slug FROM artworks WHERE slug=${b.slug} AND (data->>'published')::boolean=true ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value RETURNING value`;
 if(!result.length)return send(400,{error:'Publish this painting before making it exclusive.'});
 return send(200,{ok:true});
 }
 if(action==='upload'){
 if(!env.BLOB_READ_WRITE_TOKEN)return send(503,{error:'Connect a public Vercel Blob store before uploading.'});
 const match=/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(b.image||'');if(!match||match[1].length>4000000)return send(400,{error:'Choose a JPEG photo smaller than 3 MB after resizing.'});
 const bytes=Buffer.from(match[1],'base64');if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)return send(400,{error:'Invalid image.'});
 const blob=await put(`paintings/${randomUUID()}.jpg`,bytes,{access:'public',contentType:'image/jpeg',addRandomSuffix:true});return send(200,{url:blob.url});
 }
 if(action==='save'){
 let w;try{w=artwork(b.work)}catch(e){return send(400,{error:e.message})}
 if(b.create===true){try{await sql`INSERT INTO artworks (slug,data) VALUES (${w.slug},${JSON.stringify(w)}::jsonb)`}catch(e){if(e.code==='23505')return send(409,{error:'This painting ID already exists. Choose another.'});throw e}}
 else{const r=await sql`UPDATE artworks SET data=${JSON.stringify(w)}::jsonb,revision=revision+1 WHERE slug=${w.slug} AND revision=${Number(b.revision)||0} RETURNING slug`;if(!r.length)return send(409,{error:'This painting changed in another tab. Reload the dashboard before editing.'})}
 return send(200,{ok:true});
 }
 return send(404,{error:'Not found'});
 }catch(e){console.error('Artist API error',e.code||e.name);if(e.code==='42P01')return send(503,{error:'Sign in and select “Import my original collection” to initialize the gallery.',initialize:true});return send(500,{error:'Could not complete this request. Check your connection and Vercel storage settings.'})}
}
