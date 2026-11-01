/** iRespond FIELDWORK v2 — semantic tokens, not API authority.
 * Shared visual intent with apps/web/fieldwork.css; accessible text variants
 * use dark semantic colors rather than the decorative coral/lilac tones.
 */
export const Fieldwork = {
 brand: {
  name:'FIELDWORK',statement:'Better together.',doctrine:'See it. Own it. Solve it. Prove the impact.'
 },
 color: {
  canvas:'#F8F7F1',paper:'#FFFFFF',ink:'#18352A',inkStrong:'#102820',muted:'#53685C',
  border:'#E2E6DB',leaf:'#205C45',leafPressed:'#154533',leafSoft:'#E2F0E7',
  coral:'#EF7656',coralText:'#A3432B',coralSoft:'#FCE7DF',
  gold:'#F5CD6C',goldText:'#73571A',goldSoft:'#FCF1D1',
  iris:'#DCD7F7',irisText:'#51418B',
  verified:'#1C6545',verifiedSurface:'#DDF2E3',
  observed:'#775923',observedSurface:'#FCF1D1',
  disputed:'#973F35',disputedSurface:'#FCE5E2',
  focus:'#DA9E2A',
  textOnLeaf:'#FFFFFF',textOnPaper:'#18352A'
 },
 radius:{card:22,hero:27,button:13,pill:999,icon:15},
 space:{screen:20,card:20,section:24,button:14},
 type:{
  display:{fontSize:36,lineHeight:42,fontWeight:'900' as const,letterSpacing:-1.4},
  title:{fontSize:25,lineHeight:31,fontWeight:'800' as const,letterSpacing:-0.6},
  card:{fontSize:17,lineHeight:24,fontWeight:'800' as const,letterSpacing:-0.3},
  body:{fontSize:14,lineHeight:21,fontWeight:'400' as const},
  eyebrow:{fontSize:10,lineHeight:15,fontWeight:'900' as const,letterSpacing:1.2}
 },
 control:{minTarget:44,primaryHeight:50},
 states:{
  observed:{label:'Observed, not verified',tone:'observed'},
  verification_requested:{label:'Review requested',tone:'observed'},
  community_confirmed:{label:'Community-confirmed',tone:'verified'},
  institution_confirmed:{label:'Institution-confirmed',tone:'verified'},
  expert_confirmed:{label:'Expert-confirmed',tone:'verified'},
  independently_audited:{label:'Independently audited',tone:'verified'},
  government_confirmed:{label:'Government-confirmed',tone:'verified'},
  disputed:{label:'Disputed',tone:'disputed'},
  rejected:{label:'Rejected',tone:'disputed'}
 }
} as const;
