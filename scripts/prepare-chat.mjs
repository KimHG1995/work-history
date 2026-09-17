import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const files=['experience.md','timeline.md'];
async function collect(dir){for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){const file=dir+'/'+entry.name;if(entry.isDirectory())await collect(file);else if(entry.name.endsWith('.md')&&entry.name!=='README.md')files.push(file);}}
await collect('projects');
const docs=[];
for(const file of files){
 const raw=await readFile(path.join(root,file),'utf8');
 const title=raw.match(/^# (.+)/m)?.[1]||file;
 const text=raw.replace(/```[\s\S]*?```/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[*#`|]/g,'').replace(/\n{3,}/g,'\n\n');
 const url='/work-history/'+(file==='experience.md'?'':file.replace(/\.md$/,''));
 for(const section of text.split(/\n\n/)){if(section.trim().length>25)docs.push({title,text:section.trim(),url});}
}
await mkdir(path.join(root,'worker/generated'),{recursive:true});
await mkdir(path.join(root,'site/content/public'),{recursive:true});
const json=JSON.stringify(docs);
await writeFile(path.join(root,'worker/generated/docs.json'),json);
await writeFile(path.join(root,'site/content/public/chat-docs.json'),json);
console.log(`Chat index: ${files.length} public documents, ${docs.length} sections.`);
