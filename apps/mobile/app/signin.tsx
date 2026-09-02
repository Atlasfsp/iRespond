import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StitchTopBar } from '../components/StitchChrome';
import { demoMode } from '../lib/demo-backend';
import { activateDemoSession, saveAccessToken } from '../lib/session';
import { Stitch } from '../lib/stitch-theme';

WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
  const issuer = process.env.EXPO_PUBLIC_OIDC_ISSUER?.replace(/\/$/, '');
  const clientId = process.env.EXPO_PUBLIC_OIDC_CLIENT_ID ?? '';
  const discovery = AuthSession.useAutoDiscovery(issuer ?? 'https://invalid.local');
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'irespond', path: 'signin' });
  const [status, setStatus] = useState('Choose a trusted identity provider or the local demo account.');
  const [exchanging, setExchanging] = useState(false);
  const [demoSigningIn, setDemoSigningIn] = useState(false);
  const [request, response, promptAsync] = AuthSession.useAuthRequest({ clientId, redirectUri, responseType: AuthSession.ResponseType.Code, scopes: ['openid', 'profile'], usePKCE: true }, discovery);

  useEffect(() => {
    if (response?.type !== 'success' || !discovery || !request?.codeVerifier) return;
    const code = response.params.code;
    if (!code) return;
    setExchanging(true);
    AuthSession.exchangeCodeAsync({ clientId, code, redirectUri, extraParams: { code_verifier: request.codeVerifier } }, discovery)
      .then(async token => {
        await saveAccessToken(token.accessToken, token.expiresIn);
        setStatus('Signed in. Returning to iRespond.');
        router.back();
      })
      .catch(() => setStatus('Sign-in completed but the token exchange failed. Please try again.'))
      .finally(() => setExchanging(false));
  }, [response, discovery, request?.codeVerifier, clientId, redirectUri]);

  async function continueWithDemo() {
    if (!demoMode || demoSigningIn) return;
    setDemoSigningIn(true);
    try {
      await activateDemoSession();
      setStatus('Demo account active. Opening the role-aware workspace.');
      router.replace('/workspace');
    } catch {
      setStatus('The local demo account could not be started. Please try again.');
    } finally {
      setDemoSigningIn(false);
    }
  }

  const configured = Boolean(issuer && clientId);
  return <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}><View style={s.screen}><StitchTopBar title="Trusted Identity" showBack showNotifications={false}/><ScrollView contentContainerStyle={s.content}>
    <View style={s.identityHero}><View style={s.lock}><Ionicons name="shield-checkmark" size={46} color={Stitch.color.primaryFixed}/></View><Text style={s.eyebrow}>OIDC + PKCE</Text><Text style={s.title}>Sign in without weakening the trust boundary.</Text><Text style={s.body}>Use your identity provider for a connected account, or enter the isolated demo workspace when it is enabled for this build.</Text></View>
    <View style={s.points}>{[['key-outline', 'No password is entered into iRespond.'], ['person-circle-outline', 'Global role claims drive verification and safety tools.'], ['people-outline', 'Project-specific roles are resolved for each Project Room.'], ['lock-closed-outline', 'Front-end visibility never replaces API authorization.']].map(([icon, text]) => <View key={text} style={s.point}><View style={s.pointIcon}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={21} color={Stitch.color.primary}/></View><Text style={s.pointText}>{text}</Text></View>)}</View>
    {!configured && <View style={s.notice}><Ionicons name={demoMode ? 'information-circle-outline' : 'warning-outline'} size={23} color={Stitch.color.tertiary}/><View style={{ flex: 1 }}><Text style={s.noticeTitle}>Identity provider not configured</Text><Text style={s.noticeText}>{demoMode ? 'You can still use the local demo account. It uses bundled sample data and makes no external identity or API connection.' : 'Set EXPO_PUBLIC_OIDC_ISSUER and EXPO_PUBLIC_OIDC_CLIENT_ID for this build. StratoID can provide the production issuer once deployed.'}</Text></View></View>}
    <View style={s.status}><View style={[s.statusDot, (configured || demoMode) && s.statusDotOn]}/><Text style={s.statusText}>{status}</Text></View>
    {(exchanging || !discovery) && configured && <ActivityIndicator color={Stitch.color.primary}/>}
    <Pressable style={[s.primary, (!configured || !request || exchanging || demoSigningIn) && s.disabled]} disabled={!configured || !request || exchanging || demoSigningIn} onPress={() => void promptAsync()}><Ionicons name="log-in-outline" size={22} color={Stitch.color.onPrimary}/><Text style={s.primaryText}>{exchanging ? 'Completing sign-in…' : 'Continue with identity provider'}</Text></Pressable>
    {demoMode && <Pressable style={[s.demo, demoSigningIn && s.disabled]} disabled={demoSigningIn || exchanging} onPress={() => void continueWithDemo()}><Ionicons name="flask-outline" size={22} color={Stitch.color.primary}/><Text style={s.demoText}>{demoSigningIn ? 'Starting demo…' : 'Continue with demo account'}</Text></Pressable>}
    <Text style={s.foot}>Connected sign-in uses Authorization Code + PKCE. The demo account is isolated to the offline demo build and stores no OIDC access token.</Text>
  </ScrollView></View></SafeAreaView>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Stitch.color.background }, screen: { flex: 1 }, content: { padding: Stitch.space.screen, gap: Stitch.space.base }, identityHero: { padding: Stitch.space.xl, borderRadius: Stitch.radius.hero, backgroundColor: Stitch.color.primaryContainer, gap: Stitch.space.md }, lock: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(207,229,255,.12)', alignItems: 'center', justifyContent: 'center' }, eyebrow: { ...Stitch.type.eyebrow, color: Stitch.color.onPrimaryContainer }, title: { ...Stitch.type.hero, color: Stitch.color.onPrimary }, body: { ...Stitch.type.body, color: Stitch.color.primaryFixed }, points: { padding: Stitch.space.card, borderRadius: Stitch.radius.lg, borderWidth: 1, borderColor: Stitch.color.outlineVariant, backgroundColor: Stitch.color.surfaceLowest, gap: Stitch.space.md }, point: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Stitch.space.md }, pointIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Stitch.color.primaryFixed, alignItems: 'center', justifyContent: 'center' }, pointText: { flex: 1, ...Stitch.type.body, color: Stitch.color.onSurface }, notice: { padding: Stitch.space.base, borderRadius: Stitch.radius.lg, backgroundColor: Stitch.color.tertiaryFixed, flexDirection: 'row', gap: Stitch.space.md }, noticeTitle: { ...Stitch.type.bodyBold, color: Stitch.color.tertiary }, noticeText: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant, marginTop: 2 }, status: { minHeight: 52, padding: Stitch.space.md, borderRadius: Stitch.radius.md, backgroundColor: Stitch.color.surfaceLow, flexDirection: 'row', alignItems: 'center', gap: Stitch.space.sm }, statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Stitch.color.outline }, statusDotOn: { backgroundColor: Stitch.color.secondary }, statusText: { flex: 1, ...Stitch.type.body, color: Stitch.color.onSurfaceVariant }, primary: { minHeight: 56, borderRadius: Stitch.radius.md, backgroundColor: Stitch.color.primaryContainer, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Stitch.space.sm }, primaryText: { ...Stitch.type.card, color: Stitch.color.onPrimary }, demo: { minHeight: 56, borderRadius: Stitch.radius.md, borderWidth: 1, borderColor: Stitch.color.primary, backgroundColor: Stitch.color.primaryFixed, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Stitch.space.sm }, demoText: { ...Stitch.type.card, color: Stitch.color.primary }, disabled: { opacity: .5 }, foot: { ...Stitch.type.footnote, color: Stitch.color.onSurfaceVariant, textAlign: 'center' },
});
