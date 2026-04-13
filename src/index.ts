import { createIdentity, loadIdentity, saveIdentity } from './identity.js';
import { initWorkshop, recordSession } from './workshop.js';
async function main() {
  const cmd = process.argv[2]; const wd = process.cwd();
  if (cmd === '--onboard') {
    const args = process.argv.slice(3); let ku='',id='',nm='',md='',tp='warm' as any;
    for(let i=0;i<args.length;i++){switch(args[i]){case'--keeper-url':ku=args[++i];break;case'--id':id=args[++i];break;case'--name':nm=args[++i];break;case'--model':md=args[++i];break;case'--temp':tp=args[++i];break;}}
    if(!ku||!id||!nm){console.log('Usage: fleet-code-agent --onboard --keeper-url <url> --id <id> --name <name>');return;}
    const identity=createIdentity({id,name:nm,keeperUrl:ku,model:md,temperature:tp});
    await initWorkshop(wd);await saveIdentity(wd,identity);
    await recordSession(wd,{action:'ONBOARDED',details:'Code agent ready.',temperature:tp});
    console.log('Code agent "'+nm+'" onboarded ('+tp+' mode).');
  } else if(cmd==='--work'){
    const task=process.argv.slice(3).find(a=>!a.startsWith('--'));
    console.log('Working on: '+(task||'(none)')+' (framework ready for LLM integration)');
  } else { console.log('fleet-code-agent: --onboard | --work <task>'); }
}
main().catch(console.error);
