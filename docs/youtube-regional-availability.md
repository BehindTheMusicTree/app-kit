# Contextual YouTube playback

`PlaybackContextProvider` belongs inside transport/session providers and outside player and genre-tree providers. Supply a stable `loadContext` callback returning `{country: string|null}` from the application's trusted same-origin backend. The provider refreshes on focus, online, explicit retry and before contextual requests after 60 seconds. A failed initial load keeps contextual queries disabled and exposes `error` for a retry control. It never invents a default country.

Song detail, search and playlist-track query keys include the verified country and context revision. Old-context responses are discarded and accumulated track pages and cursors are rebuilt when context changes. Country-neutral tree data stays shared. Older API responses without `youtubeVideo.availability` remain valid and mean unknown eligibility.

The player creates a new YouTube instance per selected video and guards callbacks by load generation. Terminal events are processed once. Errors 100, 101 and 150 exclude a video in the current context for ten minutes, shared across songs using that video; the in-memory map is bounded to 200 entries. Explicit retry clears failures and refreshes context before loading again. Error 153 stops with a configuration message instead of advancing through the catalog. Other errors remain retryable. Audio tracks keep their existing contract.

`app-kit-ui` displays the contextual regional reason and a retry control. Applications should display the provider error and a context retry control when initial context loading fails. Country is a playback hint, not an authorization claim or a playback guarantee.

Consumers need the matching app-kit and app-kit-ui package versions after a separately authorized release. Before publication, build this worktree and link its package directories into the consumer's ignored node_modules for validation; do not change published version pins to an unreleased version.

On a country change, the active playlist or artist list restarts pagination at the selected track when it remains eligible. A filtered-out anchor returns 404 and restarts the list at its head. Single-track lists refresh their selected song without issuing a second playback request; audio tracks remain listed without a country-dependent fetch.

## Binding reads to the playback country

`useFetchWrapper` is country-agnostic (`acceptRefreshedContext` is removed). A GET whose response depends on the viewer's playback country goes through `usePlaybackFetch` (`fetchBound` for queries, `fetchLatest` for explicit play intents) or `usePlaybackQuery`. Both append `playback.key` to the query key, wait for `ready`, and abort with `AbortError` when the context changed mid-flight or the `X-Playback-Country` response header disagrees with the request's country; queries retry that once. Without a `PlaybackContextProvider` the header check is skipped. In development, `useFetchWrapper` logs a `console.error` for a GET answered with `X-Playback-Country`.
