"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type FollowButtonProps = { entityId: string; isFollowing: boolean };

export function FollowButton({ entityId, isFollowing }: FollowButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleFollow() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/follows", {
        method: isFollowing ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Could not update your follows.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the service. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        className={`button entity-action ${isFollowing ? "button-quiet" : "button-dark"}`}
        type="button"
        onClick={toggleFollow}
        disabled={pending}
      >
        {pending ? "Saving…" : isFollowing ? "Following ✓" : "+ Follow"}
      </button>
      {error && (
        <p className="form-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
