import { z } from "zod";

export const SongHistoryEntrySchema = z.object({
  uuid: z.string().uuid(),
  action: z.string(),
  actorPseudo: z.string().nullable(),
  oldValue: z.string().nullable(),
  newValue: z.string().nullable(),
  createdOn: z.string(),
});

export const SongHistorySchema = z.array(SongHistoryEntrySchema);

export type SongHistoryEntry = z.infer<typeof SongHistoryEntrySchema>;
