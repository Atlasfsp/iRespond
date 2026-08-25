import { useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { saveAccessToken } from '../lib/session';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const issuer = process.env.EXPO_PUBLIC_OIDC_ISSUER?.replace(/\/$/, '');
  const clientId = process.env.EXPO_PUBLIC_OIDC_CLIENT_ID ?? '';
  const discovery = AuthSession.useAutoDiscovery(issuer ?? 'https://invalid.local');
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'irespond', path: 'signin' });
  const [status, setStatus] = useState('Sign in to request or perform trusted verification actions.');
  const [exchanging, setExchanging] = useState(false);
  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: ['openid', 'profile'],
    usePKCE: true
  }, discovery);

  useEffect(() => {
    if (response?.type !== 'success' || !discovery || !request?.codeVerifier) return;
    const code = response.params.code;
    if (!code) return;
    setExchanging(true);
    AuthSession.exchangeCodeAsync({
      clientId,
      code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier }
    }, discovery).then(async (token) => {
      await saveAccessToken(token.accessToken, token.expiresIn);
      setStatus('Signed in. Returning to the community need.');
      router.back();
    }).catch(() => {
      setStatus('Sign-in completed but the token exchange failed. Please try again.');
    }).finally(() => setExchanging(false));
  }, [response, discovery, request?.codeVerifier, clientId, redirectUri]);

  const configured = Boolean(issuer && clientId);
  return <SafeAreaView style={styles.safe}><View style={styles.content}>
    <Pressable onPress={() => router.back()}><Text style={styles.back}>← Back</Text></Pressable>
    <Text style={styles.eyebrow}>TRUSTED IDENTITY</Text>
    <Text style={styles.title}>Sign in before a verification action.</Text>
    <Text style={styles.body}>iRespond uses standards-based OpenID Connect with PKCE. The identity provider authenticates you; iRespond receives only the access token and claims needed to enforce its own authorization policy.</Text>
    {!configured && <View style={styles.notice}><Text style={styles.noticeTitle}>Identity provider not configured</Text><Text style={styles.noticeText}>Set EXPO_PUBLIC_OIDC_ISSUER and EXPO_PUBLIC_OIDC_CLIENT_ID for this build. StratoID can provide this boundary when its OIDC issuer is deployed.</Text></View>}
    <Text style={styles.status}>{status}</Text>
    {(exchanging || !discovery) && configured && <ActivityIndicator />}
    <Pressable style={[styles.primary, (!configured || !request || exchanging) && styles.disabled]} disabled={!configured || !request || exchanging} onPress={() => void promptAsync()}>
      <Text style={styles.primaryText}>{exchanging ? 'Completing sign-in…' : 'Continue with identity provider'}</Text>
    </Pressable>
  </View></SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#F6F8FB'},content:{padding:22,gap:16},back:{color:'#2D6E9F',fontWeight:'800'},eyebrow:{color:'#2D7A56',fontWeight:'900',letterSpacing:1.5,marginTop:16},title:{color:'#17324D',fontSize:30,lineHeight:36,fontWeight:'900'},body:{color:'#455E70',fontSize:16,lineHeight:24},notice:{backgroundColor:'#FFF7E7',padding:15,borderRadius:15,gap:5},noticeTitle:{color:'#6D4A14',fontWeight:'900'},noticeText:{color:'#7D6848',lineHeight:20},status:{color:'#667788',lineHeight:20},primary:{backgroundColor:'#153B5B',padding:16,borderRadius:14},primaryText:{color:'white',fontWeight:'900',textAlign:'center'},disabled:{opacity:.5}});
