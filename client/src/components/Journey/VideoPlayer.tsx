import React, { useEffect, useRef } from 'react'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
// The control icons, served from this origin. Plyr's default points at cdn.plyr.io,
// which connect-src refuses: the player worked but every button in it was blank.
// A file, not a data URL, because Plyr tells same-origin from cross-origin by the
// host and would fetch a data URL over XHR, which connect-src refuses as well.
import plyrSprite from 'plyr/dist/plyr.svg?no-inline'

/**
 * Video player for gallery/lightbox playback (#823), built on Plyr over a native
 * <video>. Local videos stream with HTTP Range (seeking works out of the box) and
 * the source carries the correct video MIME from the server. The Plyr instance is
 * created once per mounted source and destroyed on unmount, so navigating away in
 * the lightbox stops playback.
 */
export default function VideoPlayer({
  src,
  poster,
  autoPlay = true,
  style,
}: {
  src: string
  poster?: string
  autoPlay?: boolean
  style?: React.CSSProperties
}): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const player = new Plyr(el, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'fullscreen',
      ],
      autoplay: autoPlay,
      clickToPlay: true,
      hideControls: false,
      iconUrl: plyrSprite,
      // On teardown Plyr points the element at a blank clip to abort the stream,
      // by default one on cdn.plyr.io, which media-src refuses. An empty source
      // aborts the stream just the same, and the element is unmounted in the same
      // tick, so the error it would otherwise report has nowhere to show.
      blankVideo: '',
    })

    return () => {
      try {
        player.destroy()
      } catch {
        /* already torn down */
      }
    }
  }, [src, autoPlay])

  return (
    <div
      className="trek-video-player"
      style={{
        width: 'min(92vw, 1100px)',
        height: 'min(88vh, 900px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        borderRadius: 4,
        overflow: 'hidden',
        animation: 'fadeIn 0.15s ease',
        ...style,
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        controls
        preload="metadata"
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          background: '#000',
        }}
      >
        {/* Gallery uploads carry no caption file; the empty track keeps the element valid. */}
        <track kind="captions" />
      </video>
    </div>
  )
}