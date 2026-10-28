import type { ArtistMembership, RenderArtistLink } from "@behindthemusictree/app-kit/genre-tree";
import { PanelGroup, PanelSection } from "@behindthemusictree/ui";
import { formatYears } from "./formatYears";

interface MembershipListProps {
  title: string;
  memberships: ArtistMembership[];
  renderArtistLink: RenderArtistLink;
}

function MembershipList({ title, memberships, renderArtistLink }: MembershipListProps) {
  if (memberships.length === 0) return null;
  return (
    <PanelGroup title={title}>
      <ul>
        {memberships.map((membership, index) => {
          const details = [
            formatYears(membership.beginYear, membership.endYear, membership.ended),
            ...membership.roles,
          ];
          const detailsText = details.filter(Boolean).join(" · ");
          return (
            // A member can have several periods in the same group.
            <li key={`${membership.artist.uuid}-${index}`} className="truncate py-0.5" title={detailsText || undefined}>
              <span className="font-medium text-[var(--color-text)]">{renderArtistLink(membership.artist)}</span>
              {detailsText && <span className="text-[var(--color-text-muted)]"> — {detailsText}</span>}
            </li>
          );
        })}
      </ul>
    </PanelGroup>
  );
}

export default function ArtistMembers({ title, memberships, renderArtistLink }: MembershipListProps) {
  if (memberships.length === 0) return null;
  const isCurrent = (membership: ArtistMembership) => !membership.ended && membership.endYear === null;

  return (
    <PanelSection title={title}>
      <MembershipList title="Current" memberships={memberships.filter(isCurrent)} renderArtistLink={renderArtistLink} />
      <MembershipList
        title="Past"
        memberships={memberships.filter((membership) => !isCurrent(membership))}
        renderArtistLink={renderArtistLink}
      />
    </PanelSection>
  );
}
