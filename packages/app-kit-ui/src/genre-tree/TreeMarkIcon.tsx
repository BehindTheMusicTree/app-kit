import { TREE_MARK_PATH } from "./treeMarkPath";

export function TreeMarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 551 567" fill="currentColor" className={className} aria-hidden>
      <path transform="translate(0 567) scale(0.1 -0.1)" d={TREE_MARK_PATH} />
    </svg>
  );
}
