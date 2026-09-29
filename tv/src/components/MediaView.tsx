import { useEffect, useRef, useState } from 'react';
import { createVideoPlayer, VideoView } from 'expo-video';
import { Image, StyleSheet, View } from 'react-native';

type MediaContent = {
  kind: 'media'; id: string; mediaKind: 'image' | 'video'; title: string | null;
  url: string; filePath: string; updatedAt: string; urlExpiresAt: number;
};

function LoopingVideo({ url }: { url: string }) {
  // The native VideoView can detach one frame after React unmounts it. Releasing
  // useVideoPlayer's shared object immediately makes that detach race with release.
  const [player] = useState(() => {
    const instance = createVideoPlayer(url);
    instance.loop = true;
    return instance;
  });
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    player.play();
    return () => {
      player.pause();
      releaseTimer.current = setTimeout(() => {
        player.release();
        releaseTimer.current = null;
      }, 300);
    };
  }, [player]);
  return <VideoView player={player} style={styles.media} contentFit="contain" nativeControls={false} />;
}

export function MediaView({ media }: { media: MediaContent }) {
  return (
    <View style={styles.wrap}>
      {media.mediaKind === 'video'
        ? <LoopingVideo key={media.url} url={media.url} />
        : <Image source={{ uri: media.url }} style={styles.media} resizeMode="contain" />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#132820' },
  media: { width: '100%', height: '100%' },
});
