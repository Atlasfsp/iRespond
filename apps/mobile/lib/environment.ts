import {demoMode,DEMO_API_BASE_URL} from './demo-backend';
// A demo build must never send requests or its synthetic token to a live API.
export function apiBaseUrl(){return demoMode?DEMO_API_BASE_URL:(process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/,'')??'')}
