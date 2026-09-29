import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle, Path } from 'react-native-svg';
import { MediaView } from './src/components/MediaView';
import { TvButton } from './src/components/TvButton';
import { useTvContent } from './src/hooks/useTvContent';
import { useTvIdentity } from './src/hooks/useTvIdentity';
import { formatNoticePublishedAt, scheduleForService, shortenForTv, tvTextLimits } from './src/lib/format';
import type { DisplayContent, ServiceHour } from './src/lib/types';

const emblem = require('./assets/xcaret-emblem.png');
const wordmark = require('./assets/xcaret-wordmark.png');

function NatureBackdrop() {
  return <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <Path d="M-80 625 C 220 510 390 670 650 590 S 1110 470 1680 625 L 1680 950 L -80 950 Z" fill="#E5EDE4" />
    <Path d="M-80 745 C 250 625 450 770 730 680 S 1190 600 1680 745" fill="none" stroke="#CCDCCA" strokeWidth="3" />
    <Path d="M-80 790 C 240 670 470 815 760 725 S 1210 645 1680 790" fill="none" stroke="#D7E1D3" strokeWidth="3" />
    <Circle cx="1430" cy="145" r="190" fill="#EFE5D7" opacity="0.58" />
    <Circle cx="1490" cy="185" r="113" fill="#E8D7C4" opacity="0.32" />
  </Svg>;
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <View style={styles.sectionHeading}><View style={styles.headingAccent} /><View><Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text></View></View>;
}

function FocusCard({ children }: { children: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return <Pressable focusable onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[styles.card, focused && styles.cardFocused]}>{children}</Pressable>;
}

function Services({ content }: { content: Extract<DisplayContent, { kind: 'services_hours' }> }) {
  if (!content.services.length) return <Empty title="Servicios en preparación" detail="La información aparecerá cuando el hotel agregue sus servicios." />;
  return <View style={styles.fill}><SectionTitle eyebrow="DESCUBRE EL HOTEL" title="Servicios y horarios" />
    <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
      {content.services.map((service) => <FocusCard key={service.id}>
        <View style={styles.cardTop}>
          {service.icon_url ? <Image source={{ uri: service.icon_url }} style={styles.icon} resizeMode="contain" /> : <View style={styles.iconFallback}><Text style={styles.iconLetter}>{service.name[0]}</Text></View>}
          <Text style={styles.cardTitle} numberOfLines={2}>{shortenForTv(service.name, tvTextLimits.serviceName)}</Text>
        </View>
        {service.location ? <Text style={styles.cardMeta} numberOfLines={1}>{shortenForTv(service.location, tvTextLimits.serviceLocation)}</Text> : null}
        <Text style={styles.cardHoursTitle}>HORARIOS</Text>
        {scheduleForService(content.hours as ServiceHour[], service.id).map((line, index) => <Text style={styles.cardHours} numberOfLines={1} key={`${service.id}-${index}`}>{line}</Text>)}
      </FocusCard>)}
    </ScrollView>
  </View>;
}

function Notices({ content }: { content: Extract<DisplayContent, { kind: 'notices' }> }) {
  if (!content.notices.length) return <Empty title="Sin avisos por ahora" detail="Consulta esta pantalla cuando el hotel publique novedades." />;
  return <View style={styles.fill}><SectionTitle eyebrow="INFORMACIÓN IMPORTANTE" title="Avisos del hotel" />
    <View style={styles.noticeTable}>
      <View style={styles.noticeHeader}>
        <Text style={[styles.noticeHeaderText, styles.noticeNumber]}>#</Text>
        <Text style={[styles.noticeHeaderText, styles.noticeTitleCell]}>AVISO</Text>
        <Text style={[styles.noticeHeaderText, styles.noticeBodyCell]}>MENSAJE</Text>
        <Text style={[styles.noticeHeaderText, styles.noticeDateCell]}>PUBLICADO</Text>
      </View>
      {content.notices.slice(0, 5).map((notice, index) => <View style={styles.noticeRow} key={notice.id}>
        <Text style={[styles.noticeIndex, styles.noticeNumber]}>{String(index + 1).padStart(2, '0')}</Text>
        <Text style={[styles.noticeTitle, styles.noticeTitleCell]} numberOfLines={2}>{shortenForTv(notice.title, tvTextLimits.noticeTitle)}</Text>
        <Text style={[styles.noticeBody, styles.noticeBodyCell]} numberOfLines={2}>{shortenForTv(notice.body, tvTextLimits.noticeBody)}</Text>
        <Text style={[styles.noticeDate, styles.noticeDateCell]} numberOfLines={2}>{formatNoticePublishedAt(notice.created_at)}</Text>
      </View>)}
    </View>
  </View>;
}

function Empty({ title, detail }: { title: string; detail: string }) {
  return <View style={styles.center}><Text style={styles.eyebrow}>RIVIERA MAYA · MÉXICO</Text><Text style={styles.hero}>{title}</Text><Text style={styles.subtext}>{detail}</Text></View>;
}

function LoadError({ detail, retry }: { detail: string; retry: () => void }) {
  return <View style={styles.center}><Text style={styles.eyebrow}>CONEXIÓN INTERRUMPIDA</Text>
    <Text style={styles.hero}>No pudimos cargar la pantalla</Text><Text style={styles.subtext}>{detail}</Text>
    <TvButton title="Reintentar" onPress={retry} /></View>;
}

function Cashier({ content }: { content: Extract<DisplayContent, { kind: 'cashier' }> }) {
  return <View style={styles.center}>
    <Text style={styles.eyebrow}>ATENCIÓN EN CAJA</Text>
    {content.status === 'active'
      ? <><Text style={styles.miniLabel}>PERSONAL EN TURNO</Text><Text style={styles.hero}>{content.employeeName || 'Empleado en turno'}</Text><View style={styles.line} /><Text style={styles.shift}>{content.scheduleLabel || 'Horario no especificado'}</Text></>
      : <><Text style={styles.hero}>Pendiente</Text><Text style={styles.subtext}>Esperando al siguiente encargado de caja</Text></>}
  </View>;
}

function ScreenContent({ content }: { content: DisplayContent | null }) {
  if (!content) return <Empty title="Contenido no disponible" detail="El administrador puede elegir otro contenido desde el celular." />;
  if (content.kind === 'welcome') return <View style={styles.center}><Text style={styles.eyebrow}>BIENVENIDOS A LA RIVIERA MAYA</Text>
    <Text style={styles.hero} numberOfLines={4} adjustsFontSizeToFit>{content.body || 'Bienvenidos'}</Text><View style={styles.line} /><Text style={styles.subtext}>México se vive aquí</Text></View>;
  if (content.kind === 'services_hours') return <Services content={content} />;
  if (content.kind === 'notices') return <Notices content={content} />;
  if (content.kind === 'cashier') return <Cashier content={content} />;
  return <MediaView media={content} />;
}

function Pairing({ qr, busy, error, renew }: {
  qr: { value: string; expiresAt: number } | null; busy: boolean; error: string | null; renew: () => void;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = qr ? Math.max(0, Math.ceil((qr.expiresAt - now) / 1000)) : 0;
  const valid = Boolean(qr && seconds > 0);
  return <View style={styles.pairLayout}>
    <View style={styles.pairInstructions}>
      <Text style={styles.eyebrow}>CONFIGURACIÓN DE PANTALLA</Text>
      <Text style={styles.pairTitle}>Vincula esta pantalla</Text>
      <Text style={styles.pairBody}>Desde la aplicación móvil, entra en <Text style={styles.highlight}>Pantallas vinculadas</Text>, escanea este código y confirma la vinculación.</Text>
      <View style={styles.steps}><Text style={styles.step}>01  Abre la app móvil</Text><Text style={styles.step}>02  Escanea el QR</Text><Text style={styles.step}>03  Asigna contenido</Text></View>
      {busy ? <Text style={styles.info}>Generando un código seguro…</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!valid && !busy ? <TvButton title={qr ? 'Generar nuevo QR' : 'Reintentar conexión'} onPress={renew} /> : null}
    </View>
    <View style={styles.qrPanel}>
      {valid && qr ? <><View style={styles.qrBox}><QRCode value={qr.value} size={212} backgroundColor="#ffffff" color="#172a37" /></View>
        <Text style={styles.countdown}>Expira en {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</Text>
        <Text style={styles.manualLabel}>CÓDIGO MANUAL PARA EL EMULADOR</Text>
        <Text selectable style={styles.manualCode}>{qr.value.replace('hotel-display://pair/', '')}</Text></>
        : <Text style={styles.expired}>{busy ? 'Preparando QR…' : 'El código expiró o no está disponible'}</Text>}
    </View>
  </View>;
}

export default function App() {
  useKeepAwake();
  const identity = useTvIdentity();
  const display = useTvContent(identity.tv);
  useEffect(() => { const listener = BackHandler.addEventListener('hardwareBackPress', () => true); return () => listener.remove(); }, []);
  const title = identity.tv?.name || 'Pantalla de bienvenida';
  const offline = identity.offline || Boolean(display.error);

  if (display.screen?.section === 'media' && display.content?.kind === 'media') {
    return <View style={styles.mediaRoot}><StatusBar hidden /><MediaView media={display.content} /></View>;
  }

  return <View style={styles.root}><StatusBar hidden />
    <View style={styles.header}><View style={styles.brandGroup}><Image source={emblem} style={styles.headerEmblem} resizeMode="contain" /><View style={styles.brandSeparator} /><Image source={wordmark} style={styles.headerWordmark} resizeMode="contain" /></View>
      <View style={styles.headerMeta}><Text style={styles.deviceName}>{title}{identity.tv?.location ? ` · ${identity.tv.location}` : ''}</Text>
        <View style={styles.status}><View style={[styles.statusDot, offline && styles.statusDotOffline]} /><Text style={styles.statusText}>{offline ? 'Conexión interrumpida' : identity.tv ? 'Pantalla vinculada' : 'Lista para vincular'}</Text></View></View>
    </View>
    <View style={styles.main}><NatureBackdrop /><View style={styles.mainContent}>
      {!identity.checked ? <View style={styles.center}><Text style={styles.hero}>Iniciando pantalla…</Text>
          {identity.bootError ? <><Text style={styles.errorText}>{identity.bootError}</Text><TvButton title="Reintentar" onPress={() => void identity.initialize()} /></> : null}</View>
        : !identity.tv ? <Pairing qr={identity.qr} busy={identity.pairBusy} error={identity.pairError} renew={() => void identity.renewQr()} />
        : display.screenLoading ? <Empty title="Cargando contenido…" detail="Estamos preparando esta pantalla." />
        : display.error && !display.screen ? <LoadError detail={display.error} retry={display.retry} />
        : !display.screen?.section ? <Empty title="Pantalla lista" detail="Desde la app móvil, elige qué sección mostrar aquí." />
        : display.contentLoading && !display.content ? <Empty title="Cargando contenido…" detail="Un momento, por favor." />
        : display.error && !display.content ? <LoadError detail={display.error} retry={display.retry} />
        : <ScreenContent content={display.content} />}
    </View></View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F2E9' },
  mediaRoot: { flex: 1, backgroundColor: '#132820' },
  header: { height: 104, paddingHorizontal: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF' },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  headerEmblem: { width: 78, height: 78 },
  brandSeparator: { width: 2, height: 58, backgroundColor: '#C8D3C5' },
  headerWordmark: { width: 235, height: 68 },
  headerMeta: { alignItems: 'flex-end', gap: 7 },
  deviceName: { color: '#284B3C', fontSize: 18, fontWeight: '700' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  statusDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#509A72' },
  statusDotOffline: { backgroundColor: '#B66B4F' },
  statusText: { color: '#687A6D', fontSize: 14 },
  main: { flex: 1, position: 'relative' },
  mainContent: { flex: 1, paddingHorizontal: 56, paddingVertical: 27 },
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 },
  eyebrow: { color: '#A66042', fontSize: 16, fontWeight: '800', letterSpacing: 3, textAlign: 'center' },
  hero: { color: '#173E30', fontSize: 57, fontFamily: 'serif', fontWeight: '700', textAlign: 'center', marginTop: 17, lineHeight: 67 },
  subtext: { color: '#597060', fontSize: 23, textAlign: 'center', marginTop: 20 },
  miniLabel: { color: '#8B6D55', fontSize: 18, letterSpacing: 2, marginTop: 28 },
  shift: { color: '#42654F', fontSize: 29, marginTop: 12 },
  line: { width: 108, height: 4, borderRadius: 3, backgroundColor: '#B66B4F', marginTop: 26 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 17, marginBottom: 21 },
  headingAccent: { width: 5, height: 60, borderRadius: 3, backgroundColor: '#B66B4F' },
  sectionTitle: { color: '#173E30', fontSize: 39, fontFamily: 'serif', fontWeight: '700', marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 20 },
  card: { width: '31%', backgroundColor: '#FFFDF8', borderWidth: 2, borderColor: '#DDE5DB', borderRadius: 16, padding: 12, marginBottom: 1, elevation: 2 },
  cardFocused: { borderColor: '#B66B4F', backgroundColor: '#FFFFFF' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  cardTitle: { color: '#1C4535', fontSize: 20, lineHeight: 23, fontWeight: '800', flex: 1 },
  cardMeta: { color: '#617768', fontSize: 14, lineHeight: 18, marginTop: 5 },
  cardHoursTitle: { color: '#A66042', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: 7, marginBottom: 2 },
  cardHours: { color: '#274B3B', fontSize: 14, lineHeight: 17, marginTop: 1 },
  icon: { width: 34, height: 34 },
  iconFallback: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#DCE9DC', alignItems: 'center', justifyContent: 'center' },
  iconLetter: { color: '#275440', fontSize: 20, fontWeight: '800' },
  noticeTable: { flex: 1, borderWidth: 1, borderColor: '#D7E2D6', borderRadius: 17, overflow: 'hidden', backgroundColor: '#FFFEFA', elevation: 2 },
  noticeHeader: { height: 49, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 16, backgroundColor: '#214A38' },
  noticeHeaderText: { color: '#F5F0E5', fontSize: 14, fontWeight: '800', letterSpacing: 1.3 },
  noticeRow: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 16, borderTopWidth: 1, borderTopColor: '#E2E9DF' },
  noticeNumber: { width: 36 },
  noticeTitleCell: { width: '23%' },
  noticeBodyCell: { flex: 1 },
  noticeDateCell: { width: 174 },
  noticeIndex: { color: '#A66042', fontSize: 21, fontWeight: '800' },
  noticeTitle: { color: '#1B4432', fontSize: 18, lineHeight: 20, fontWeight: '800' },
  noticeBody: { color: '#455B4C', fontSize: 16, lineHeight: 20 },
  noticeDate: { color: '#536B59', fontSize: 14, lineHeight: 18, fontWeight: '600' },
  pairLayout: { flex: 1, flexDirection: 'row', gap: 34, alignItems: 'stretch' },
  pairInstructions: { flex: 1, justifyContent: 'center', paddingLeft: 15 },
  pairTitle: { color: '#173E30', fontSize: 44, fontFamily: 'serif', fontWeight: '700', marginTop: 14, marginBottom: 17 },
  pairBody: { color: '#4C6454', fontSize: 20, lineHeight: 29, maxWidth: 530 },
  highlight: { color: '#9D5A3D', fontWeight: '800' },
  steps: { marginTop: 24, gap: 8 },
  step: { color: '#385C48', fontSize: 18 },
  info: { color: '#946344', marginTop: 18, fontSize: 18 },
  errorText: { color: '#AE443E', fontSize: 16, marginTop: 14, textAlign: 'center' },
  qrPanel: { width: 354, borderRadius: 22, borderWidth: 2, borderColor: '#D7E2D6', backgroundColor: '#FFFDF8', alignItems: 'center', justifyContent: 'center', padding: 20, elevation: 3 },
  qrBox: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 13 },
  countdown: { color: '#9B5D3D', fontSize: 18, fontWeight: '700', marginTop: 15 },
  manualLabel: { color: '#6A806D', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 18 },
  manualCode: { color: '#254B3A', fontSize: 13, textAlign: 'center', marginTop: 7 },
  expired: { color: '#586E5D', fontSize: 21, textAlign: 'center' },
});
