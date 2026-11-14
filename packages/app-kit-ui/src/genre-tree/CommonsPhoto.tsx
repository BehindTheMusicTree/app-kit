import type { ReactNode } from "react";
import type { CommonsImage } from "@behindthemusictree/app-kit/genre-tree";

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
      {children}
    </a>
  );
}

export function CommonsPhotoCredit({ image, creditLabel = "Photo" }: { image: CommonsImage; creditLabel?: string }) {
  return (
    <p className="text-caption text-[var(--color-text-muted)]">
      {creditLabel}: <ExternalLink href={image.pageUrl}>{image.author ?? "Wikimedia Commons"}</ExternalLink>,{" "}
      {image.licenseUrl ? <ExternalLink href={image.licenseUrl}>{image.license}</ExternalLink> : image.license}
    </p>
  );
}

export function CommonsCover({ image, alt }: { image: CommonsImage; alt: string }) {
  return <img src={image.url} alt={alt} className="h-64 w-full object-cover bg-[var(--color-surface-muted)]" />;
}

export default function CommonsPhoto({
  image,
  alt,
  creditLabel = "Photo",
}: {
  image: CommonsImage;
  alt: string;
  creditLabel?: string;
}) {
  return (
    <figure className="flex flex-col gap-1.5">
      <img src={image.url} alt={alt} className="h-64 w-full object-contain bg-[var(--color-surface-muted)] rounded" />
      <figcaption className="text-caption text-[var(--color-text-muted)]">
        {creditLabel}: <ExternalLink href={image.pageUrl}>{image.author ?? "Wikimedia Commons"}</ExternalLink>,{" "}
        {image.licenseUrl ? <ExternalLink href={image.licenseUrl}>{image.license}</ExternalLink> : image.license}
      </figcaption>
    </figure>
  );
}
