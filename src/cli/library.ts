import { Command } from 'commander';
import { getLikedTrackIds, likeTrack, getRecentTracks } from '../api/user.js';
import { getTrackDetails } from '../api/track.js';
import { output, outputError } from '../output/json.js';
import { ExitCode } from '../types/index.js';

export function createLibraryCommand(): Command {
  const library = new Command('library').description('User library');

  library
    .command('liked')
    .description('Liked tracks')
    .option('-l, --limit <number>', 'Limit', '50')
    .action(async (options) => {
      try {
        const ids = await getLikedTrackIds();
        const limit = parseInt(options.limit);
        const limitedIds = ids.slice(0, limit);

        if (limitedIds.length === 0) {
          output({ tracks: [], total: 0 });
          return;
        }

        const tracks = await getTrackDetails(limitedIds);
        output({
          tracks: tracks.map((t) => ({
            id: t.id,
            name: t.name,
            artist: t.artists.map((a) => a.name).join(', '),
            album: t.album.name,
            uri: t.uri,
          })),
          total: ids.length,
          showing: limitedIds.length,
        });
      } catch (error) {
        outputError('LIBRARY_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  library
    .command('like')
    .description('Like a track')
    .argument('<track_id>', 'Track ID')
    .action(async (trackId: string) => {
      try {
        await likeTrack(trackId, true);
        output({ message: 'Liked', trackId });
      } catch (error) {
        outputError('LIBRARY_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  library
    .command('unlike')
    .description('Unlike a track')
    .argument('<track_id>', 'Track ID')
    .action(async (trackId: string) => {
      try {
        await likeTrack(trackId, false);
        output({ message: 'Unliked', trackId });
      } catch (error) {
        outputError('LIBRARY_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  library
    .command('recent')
    .description('Recently played')
    .option('-l, --limit <number>', 'Limit', '50')
    .action(async (options) => {
      try {
        const limit = parseInt(options.limit);
        const tracks = await getRecentTracks(limit);
        output({
          tracks: tracks.map((t) => ({
            id: t.id,
            name: t.name,
            artist: t.artists.map((a) => a.name).join(', '),
            album: t.album.name,
            uri: t.uri,
          })),
          total: tracks.length,
        });
      } catch (error) {
        outputError('LIBRARY_ERROR', error instanceof Error ? error.message : 'Failed');
        process.exit(ExitCode.NETWORK_ERROR);
      }
    });

  return library;
}
