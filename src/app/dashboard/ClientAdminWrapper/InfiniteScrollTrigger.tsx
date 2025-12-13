"use client";

import { useEffect } from "react";

export default function InfiniteScrollTrigger({ loadMoreRef, hasMore }) {
  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreRef.current?.();
        }
      },
      { threshold: 1 }
    );

    const el = document.getElementById("load-more-trigger");
    if (el) observer.observe(el);

    return () => observer.disconnect();
  }, [hasMore]);

  return (
    <div id="load-more-trigger" className="py-10 text-center text-gray-500">
      Carregando mais...
    </div>
  );
}
