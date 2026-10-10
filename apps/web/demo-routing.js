export function webRequestTarget({demoSession,demoMode,apiBaseUrl,auth}){
 if(demoSession)return'demo';
 if(demoMode&&!apiBaseUrl&&!auth)return'demo';
 return'api';
}
