# Product

## Register

product

## Users

CatMusicFree is for Android listeners who want a flexible, plugin-driven music player that can search, play, download, and manage music across multiple sources. Users often interact with it repeatedly in short sessions: searching, switching tabs, checking local playlists, and controlling playback from the bottom area.

## Product Purpose

CatMusicFree extends MusicFree with anime-inspired visual polish, theme customization, local music management, playlist workflows, lyrics, downloads, and WebDAV backup. Success means the app feels reliable as a daily music tool while giving the UI enough personality to distinguish it from the upstream project.

## Brand Personality

Playful, immersive, and practical. The interface should feel music-first and touch-friendly, with soft anime-inspired detail and motion that supports quick listening workflows rather than slowing them down.

## Anti-references

Avoid web-only UI patterns that depend on DOM hover states, Tailwind, shadcn, or desktop pointer behavior. Avoid generic pasted Spotify clones, heavy decorative glass effects that hurt Android performance, and overly busy visual treatments that compete with music content or album art.

## Design Principles

1. Keep playback and navigation reachable with one thumb.
2. Let music content carry most of the visual color; use theme color for clear active and primary states.
3. Preserve the React Native Android stack and existing icon, theme, and animation systems.
4. Use motion as tactile feedback, not decoration.
5. Favor compact clarity over marketing-style empty space.

## Accessibility & Inclusion

No explicit WCAG target is documented in the repository. UI changes should preserve strong text contrast, large enough touch targets, clear selected states beyond color alone, internationalized labels, and reduced visual noise for users who keep the app open while listening.
