"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Post } from "@/types";
import { fetchAllAction, insertRowAction, deleteRowAction } from "@/actions/db";
import { generateId } from "@/lib/utils";

export function usePosts() {
  const { data: session } = useSession();
  const userId = session?.user?.email ?? "";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchAllAction<Post>("posts").then((data) => {
      setPosts(data);
      setLoaded(true);
    });
  }, [userId]);

  const add = useCallback(
    (content: string, visibility: "wings" | "public") => {
      const item: Post = { id: generateId(), userId, content, visibility, createdAt: new Date().toISOString() };
      setPosts((prev) => [item, ...prev]);
      insertRowAction("posts", item);
      return item;
    },
    [userId]
  );

  const remove = useCallback(
    (id: string) => {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      deleteRowAction("posts", id);
    },
    [userId]
  );

  return { posts, loaded, add, remove };
}
