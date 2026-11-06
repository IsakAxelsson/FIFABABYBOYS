// Pure, side-effect-free Breaking News event evaluator. No database writes here.
// Players follow the game state order: Isak, Jonatan, August.
'use strict';
const PLAYERS=['Isak','Jonatan','August'];
const HIST=require('./news-historical-stats');
const zero=()=>PLAYERS.map(()=>[0,0,0]);
function add(dst,match){for(let i=0;i<3;i++)for(let j=0;j<3;j++)dst[i][j]+=Math.max(0,Number(match?.s?.[i]?.[j])||0);}
function aggregate(matches){const out=zero();for(const m of matches)add(out,m);return out;}
function matchesFor(e){return (e?.tournaments||[]).flatMap(t=>t.matches||[]);}
function snapshot(state,eveningId,matchId){
 const e=(state?.evenings||[]).find(x=>x.id===eveningId);
 if(!e)return null;
 const matches=matchesFor(e);
 const index=matches.findIndex(m=>m.id===matchId);
 if(index<0)return null;
 const current=matches[index];
 // Include only previously finished matches, never an in-progress match.
 const before=aggregate(matches.slice(0,index).filter(m=>m.finished));
 const after=aggregate([...matches.slice(0,index).filter(m=>m.finished),current]);
 // Evenings are stored newest first; earlier evenings follow the current one.
 const eveningIndex=(state.evenings||[]).findIndex(ev=>ev.id===eveningId);
 const previousEvenings=(state.evenings||[]).slice(eveningIndex+1).flatMap(ev=>matchesFor(ev));
 const careerBefore=aggregate([...previousEvenings,...matches.slice(0,index)].filter(m=>m.finished));
 // Historic 2025-2026 nights are stored separately in HIST and may be corrected in histOverrides.
 HIST.forEach((h,i)=>{
  const override=state.histOverrides?.[i];
  const scores=override?.s||h[2];
  for(let player=0;player<3;player++)for(let stat=0;stat<2;stat++)careerBefore[player][stat]+=Math.max(0,Number(scores?.[player]?.[stat])||0);
 });
 const careerAfter=careerBefore.map((a,i)=>a.map((n,j)=>n+Math.max(0,Number(current?.s?.[i]?.[j])||0)));
 return {e,current,before,after,careerBefore,careerAfter};
}
function qualifies(n,ctx,phase){
 const type=n.trigger_type,idx=PLAYERS.indexOf(n.trigger_player),other=PLAYERS.indexOf(n.trigger_other_player),threshold=Number(n.trigger_threshold);
 const {current,before,after,careerBefore,careerAfter,e}=ctx;
 if(phase==='evening_end')return type==='evening_end'&&e.closed===true;
 if(phase!=='match_end'||!current.finished||type==='match_start'||type==='evening_end')return false;
 const count=(arr,i,j)=>arr[i]?.[j]||0;
 const points=(arr,i)=>count(arr,i,0)+count(arr,i,1);
 const crossed=(oldVal,newVal)=>Number.isInteger(threshold)&&threshold>0&&oldVal<threshold&&newVal>=threshold;
 if(type==='random')return true;
 if(idx<0)return false;
 switch(type){
 case 'evening_goals':return crossed(count(before,idx,0),count(after,idx,0));
 case 'evening_assists':return crossed(count(before,idx,1),count(after,idx,1));
 case 'evening_points':return crossed(points(before,idx),points(after,idx));
 case 'match_goals':return crossed(0,count(current.s,idx,0));
 case 'match_assists':return crossed(0,count(current.s,idx,1));
 case 'red_card':return count(current.s,idx,2)>0;
 case 'evening_reds':return crossed(count(before,idx,2),count(after,idx,2));
 case 'career_goals':return crossed(count(careerBefore,idx,0),count(careerAfter,idx,0));
 case 'career_assists':return crossed(count(careerBefore,idx,1),count(careerAfter,idx,1));
 case 'first_goal':return count(before,0,0)+count(before,1,0)+count(before,2,0)===0&&count(current.s,idx,0)>0;
 case 'leader':return points(after,idx)>0&&PLAYERS.every((_,i)=>i===idx||points(after,idx)>points(after,i))&&!PLAYERS.every((_,i)=>i===idx||points(before,idx)>points(before,i));
 case 'last':return PLAYERS.every((_,i)=>i===idx||points(after,idx)<points(after,i))&&!PLAYERS.every((_,i)=>i===idx||points(before,idx)<points(before,i));
 case 'overtake':return other>=0&&points(before,idx)<=points(before,other)&&points(after,idx)>points(after,other);
 case 'points_gap':return other>=0&&crossed(points(before,other)-points(before,idx),points(after,other)-points(after,idx));
 // Requires goal-by-goal event history, which aggregate match statistics cannot establish.
 case 'consecutive_goals':return false;
 default:return false;
 }
}
module.exports={PLAYERS,snapshot,qualifies};
