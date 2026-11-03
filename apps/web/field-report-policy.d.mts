export function directionsLinks(latitude:unknown,longitude:unknown):{google:string;apple:string}|null;
export function resolveCategory(category:string,detail?:string):{category:string;categoryDetail:string};
export function validateMediaSelection(items:Array<{kind?:'photo'|'video';sizeBytes?:number;durationSeconds?:number}>):string;
export function publicProjectView<T extends Record<string,unknown>>(detail:T):Omit<T,'permissions'|'viewerRoles'>;
