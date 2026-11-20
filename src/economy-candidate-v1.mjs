// Economy Balance 0.1 candidate policy shared by analysis and the isolated DEV sandbox.
// These values are not owner-approved production balance.
export const VERSION = 'economy-balance-0.1-CANDIDATE';
export const HERO_LEVEL_CAP = 16;
export const STAGES = 50;
export const XP_REPLAY_RATIO = .40;
export const GOLD_REPLAY_RATIO = .50;

const stageInRange = stage => {
  if (!Number.isInteger(stage) || stage < 1 || stage > STAGES) throw new RangeError('stage must be 1..50');
};
const levelInRange = level => {
  if (!Number.isInteger(level) || level < 1) throw new RangeError('companion level must be >=1');
};
export function xpToNextLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level >= HERO_LEVEL_CAP)
    throw new RangeError('XP next level is defined only for level 1..15');
  const k=level-1;return 40+6*k+Math.ceil(13*k*k/4);
}
export const XP_TO_NEXT=Object.freeze(Array.from({length:15},(_,i)=>xpToNextLevel(i+1)));
export const XP_THRESHOLDS=Object.freeze(XP_TO_NEXT.reduce((rows,value)=>[...rows,rows.at(-1)+value],[0]));
export function heroLevelForXp(xp){if(!Number.isSafeInteger(xp)||xp<0)throw new RangeError('hero XP must be a nonnegative safe integer');let level=1;while(level<HERO_LEVEL_CAP&&xp>=XP_THRESHOLDS[level])level++;return level}
export function stageFirstClearReward(stage){stageInRange(stage);const boss=stage%10===0?stage/10:0,baseXp=12+3*stage,baseGold=32+8*stage;return Object.freeze({stage,isBoss:boss>0,baseXp,baseGold,bossBonusXp:boss?25*boss:0,bossBonusGold:boss?80*boss:0,xp:baseXp+(boss?25*boss:0),gold:baseGold+(boss?80*boss:0)})}
export function stageReplayReward(stage){stageInRange(stage);const first=stageFirstClearReward(stage);return Object.freeze({stage,xp:Math.max(1,Math.round(first.baseXp*XP_REPLAY_RATIO)),gold:Math.max(1,Math.round(first.baseGold*GOLD_REPLAY_RATIO)),firstClearMilestone:false})}
export function battleReward(stage,outcome,firstClear=false){stageInRange(stage);if(['defeat','abandoned','invalid'].includes(outcome))return Object.freeze({stage,outcome,xp:0,gold:0,firstClearMilestone:false});if(outcome!=='victory')throw new RangeError('Invalid battle outcome');if(typeof firstClear!=='boolean')throw new TypeError('firstClear must be boolean');const reward=firstClear?stageFirstClearReward(stage):stageReplayReward(stage);return Object.freeze({stage,outcome,xp:reward.xp,gold:reward.gold,firstClearMilestone:firstClear})}
export function companionUpgradeCost(fromLevel){levelInRange(fromLevel);return 45+12*fromLevel+3*fromLevel*fromLevel}
export function companionCostToLevel(targetLevel){levelInRange(targetLevel);let sum=0;for(let level=1;level<targetLevel;level++)sum+=companionUpgradeCost(level);return sum}
