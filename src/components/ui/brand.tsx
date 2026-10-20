import Image from 'next/image';

/** Original Rendezvous artwork, copied as an asset; never redraw the mark. */
export function Brand() {
  return (
    <span className="inline-flex items-center gap-3">
      <Image src="/brand/app-icon.png" alt="" width={40} height={40} className="size-10 shrink-0" />
      <span className="flex flex-col items-start gap-1">
        <span className="text-wordmark text-ink">Rendezvous</span>
        <span className="text-caption text-muted">Admin console</span>
      </span>
    </span>
  );
}
